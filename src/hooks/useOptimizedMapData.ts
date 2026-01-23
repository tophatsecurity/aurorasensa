/**
 * Optimized Map Data Hook
 * Uses unified /api/map/markers endpoint for primary data
 * Dramatically reduces API calls by getting clients, Starlink, and ADS-B in one request
 */

import { useMemo, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { MapStats, SensorMarker, ClientMarker, AdsbMarker, WirelessDetectionMarker, LocationSourceType } from "@/types/map";
import {
  // NEW: Unified map markers API
  useMapMarkers,
  type MapClientMarker,
  type MapStarlinkMarker,
  type MapAdsbMarker,
  // Supplementary hooks (for data not in unified API)
  useAdsbHistorical,
  useWifiScannerTimeseries,
  useBluetoothScannerTimeseries,
  // Maritime hooks
  useAisVessels,
  useAprsStations,
  useEpirbBeacons,
  // GPS fallback
  useGpsdStatus,
  useGpsReadings,
  // Types
  type AisVessel,
  type AprsStation,
  type EpirbBeacon,
} from "@/hooks/aurora";

export interface UseOptimizedMapDataOptions {
  adsbHistoryMinutes?: number;
  refetchInterval?: number | false;
  clientId?: string;
}

export interface AircraftTrailData {
  icao: string;
  flight?: string;
  coordinates: [number, number][];
  altitudes: (number | undefined)[];
  timestamps: string[];
}

// Validate coordinates helper
const isValidCoordinate = (lat: number | undefined, lng: number | undefined): boolean => {
  if (lat === undefined || lng === undefined) return false;
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  if (isNaN(lat) || isNaN(lng)) return false;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false;
  if (lat === 0 && lng === 0) return false;
  return true;
};

// Map location source from API to internal type
const mapLocationSource = (source?: string): LocationSourceType => {
  switch (source?.toLowerCase()) {
    case 'starlink':
    case 'starlink_dish':
      return 'starlink';
    case 'gps':
    case 'gpsd':
    case 'hardware_gps':
      return 'gps';
    case 'sensor':
    case 'lora':
    case 'arduino':
      return 'sensor';
    case 'ip':
    case 'ip_geolocation':
    case 'geoip':
      return 'ip-geo';
    default:
      return 'unknown';
  }
};

export function useOptimizedMapData(options: UseOptimizedMapDataOptions = {}) {
  const { adsbHistoryMinutes = 60, clientId } = options;
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const queryClient = useQueryClient();

  // ===== PRIMARY DATA SOURCE: UNIFIED MAP MARKERS API =====
  // This single call replaces 10+ individual API calls
  const { 
    data: mapMarkersData, 
    isLoading: mapMarkersLoading,
  } = useMapMarkers({
    includeClients: true,
    includeStarlink: true,
    includeAircraft: true,
    clientId: clientId === 'all' ? undefined : clientId,
    hours: Math.ceil(adsbHistoryMinutes / 60),
  });

  // ===== SUPPLEMENTARY DATA SOURCES =====
  // GPS daemon status (local device)
  const { data: gpsdStatus } = useGpsdStatus();
  const { data: gpsReadings } = useGpsReadings(24);
  
  // Historical ADS-B for trails
  const { data: adsbHistoricalData } = useAdsbHistorical(adsbHistoryMinutes);
  
  // Maritime data (not in unified API yet)
  const { data: aisVessels, isLoading: aisLoading } = useAisVessels();
  const { data: aprsStations, isLoading: aprsLoading } = useAprsStations();
  const { data: epirbBeacons, isLoading: epirbLoading } = useEpirbBeacons();

  // Wireless detection data
  const { data: wifiData } = useWifiScannerTimeseries(1);
  const { data: bluetoothData } = useBluetoothScannerTimeseries(1);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["aurora"] });
    setLastUpdate(new Date());
  }, [queryClient]);

  // ===== BUILD STARLINK MARKERS FROM UNIFIED API =====
  const starlinkMarkers = useMemo<SensorMarker[]>(() => {
    const dishes = mapMarkersData?.starlink_dishes || [];
    if (!dishes.length) return [];

    return dishes
      .filter((dish: MapStarlinkMarker) => isValidCoordinate(dish.latitude, dish.longitude))
      .map((dish: MapStarlinkMarker) => {
        // Format display name
        let displayName = 'Starlink Dish';
        if (dish.device_id && dish.device_id !== 'starlink_dish_1') {
          if (dish.device_id.toLowerCase().startsWith('ut')) {
            const parts = dish.device_id.split('-');
            displayName = `Starlink ${parts[0].substring(0, 8)}…${parts[parts.length - 1]?.slice(-6) || ''}`;
          } else {
            displayName = `Starlink ${dish.device_id.replace(/_/g, ' ').replace(/starlink/i, '').trim() || 'Dish'}`;
          }
        }
        if (dish.client_id) {
          displayName += ` (${dish.client_id.substring(0, 6)}…)`;
        }

        return {
          id: `${dish.client_id}:${dish.device_id}`,
          name: displayName,
          type: 'starlink',
          value: 0,
          unit: 'm',
          status: dish.connected ? 'active' : 'warning',
          lastUpdate: dish.last_seen || new Date().toISOString(),
          location: { lat: dish.latitude, lng: dish.longitude },
          starlinkData: {
            connected: dish.connected,
            signalStrength: dish.signal_strength ?? undefined,
            snr: dish.snr ?? undefined,
            obstructionPercent: dish.obstruction_percent,
            downlinkThroughputBps: dish.downlink_mbps ? dish.downlink_mbps * 1_000_000 : undefined,
            uplinkThroughputBps: dish.uplink_mbps ? dish.uplink_mbps * 1_000_000 : undefined,
            latencyMs: dish.ping_ms,
            deviceId: dish.device_id,
          },
        };
      });
  }, [mapMarkersData?.starlink_dishes]);

  // ===== BUILD CLIENT MARKERS FROM UNIFIED API =====
  const clientMarkers = useMemo<ClientMarker[]>(() => {
    const clients = mapMarkersData?.clients || [];
    if (!clients.length) {
      console.log('[useOptimizedMapData] No clients from API');
      return [];
    }

    console.log('[useOptimizedMapData] Processing', clients.length, 'clients from API');
    
    const markers = clients
      .filter((client: MapClientMarker) => isValidCoordinate(client.latitude, client.longitude))
      .map((client: MapClientMarker) => ({
        client_id: client.client_id,
        hostname: client.hostname || client.client_id,
        location: { lat: client.latitude, lng: client.longitude },
        locationSource: mapLocationSource(client.source),
        city: client.metadata?.city,
        country: client.metadata?.country,
      }));
    
    console.log('[useOptimizedMapData] Processed client markers:', markers.length);
    return markers;
  }, [mapMarkersData?.clients]);

  // ===== BUILD ADS-B MARKERS FROM UNIFIED API =====
  const adsbMarkers = useMemo<AdsbMarker[]>(() => {
    const aircraft = mapMarkersData?.adsb_aircraft || [];
    if (!aircraft.length) return [];

    return aircraft
      .filter((ac: MapAdsbMarker) => isValidCoordinate(ac.latitude, ac.longitude))
      .map((ac: MapAdsbMarker) => ({
        id: ac.hex,
        hex: ac.hex,
        name: ac.flight?.trim() || `Aircraft ${ac.hex}`,
        type: 'adsb',
        value: ac.altitude || 0,
        unit: 'ft',
        status: 'active',
        lastUpdate: ac.last_seen || new Date().toISOString(),
        location: { lat: ac.latitude, lng: ac.longitude },
        speed: ac.speed,
        track: ac.track,
        squawk: ac.squawk,
        category: ac.category,
      } as AdsbMarker));
  }, [mapMarkersData?.adsb_aircraft]);

  // ===== BUILD SENSOR MARKERS (GPS, Maritime, etc.) =====
  const sensorMarkers = useMemo<SensorMarker[]>(() => {
    const markers: SensorMarker[] = [];
    const addedIds = new Set<string>();

    // Add all Starlink markers
    starlinkMarkers.forEach(m => {
      if (!addedIds.has(m.id)) {
        markers.push(m);
        addedIds.add(m.id);
      }
    });

    // Add GPS daemon marker
    if (gpsdStatus && gpsdStatus.mode >= 2) {
      const lat = gpsdStatus.latitude;
      const lng = gpsdStatus.longitude;
      if (isValidCoordinate(lat, lng)) {
        const id = 'gpsd_device';
        if (!addedIds.has(id)) {
          markers.push({
            id,
            name: 'GPS Device',
            type: 'gps',
            value: gpsdStatus.altitude || 0,
            unit: 'm',
            status: gpsdStatus.mode === 3 ? 'active' : 'warning',
            lastUpdate: gpsdStatus.timestamp || new Date().toISOString(),
            location: { lat: lat!, lng: lng! },
          });
          addedIds.add(id);
        }
      }
    }

    // Add GPS reading markers
    if (gpsReadings?.readings) {
      const latestByDevice = new Map<string, (typeof gpsReadings.readings)[0]>();
      gpsReadings.readings.forEach((reading: (typeof gpsReadings.readings)[0]) => {
        const deviceId = reading.device_id || 'gps_device';
        const existing = latestByDevice.get(deviceId);
        if (!existing || (reading.timestamp && existing.timestamp && 
            new Date(reading.timestamp) > new Date(existing.timestamp))) {
          latestByDevice.set(deviceId, reading);
        }
      });

      latestByDevice.forEach((reading, deviceId) => {
        if (isValidCoordinate(reading.latitude, reading.longitude)) {
          const id = `gps-${deviceId}`;
          if (!addedIds.has(id)) {
            markers.push({
              id,
              name: `GPS ${deviceId}`,
              type: 'gps',
              value: reading.altitude || 0,
              unit: 'm',
              status: 'active',
              lastUpdate: reading.timestamp || new Date().toISOString(),
              location: { lat: reading.latitude!, lng: reading.longitude! },
            });
            addedIds.add(id);
          }
        }
      });
    }

    // Add AIS vessel markers
    if (aisVessels?.length) {
      aisVessels.forEach((vessel: AisVessel) => {
        if (!isValidCoordinate(vessel.lat, vessel.lon)) return;
        const id = `ais-${vessel.mmsi}`;
        if (!addedIds.has(id)) {
          markers.push({
            id,
            name: vessel.name || `Vessel ${vessel.mmsi}`,
            type: 'ais',
            value: vessel.speed || 0,
            unit: 'kts',
            status: 'active',
            lastUpdate: vessel.last_seen || vessel.timestamp || new Date().toISOString(),
            location: { lat: vessel.lat!, lng: vessel.lon! },
          });
          addedIds.add(id);
        }
      });
    }

    // Add APRS station markers
    if (aprsStations?.length) {
      aprsStations.forEach((station: AprsStation) => {
        if (!isValidCoordinate(station.lat, station.lon)) return;
        const id = `aprs-${station.callsign}${station.ssid ? `-${station.ssid}` : ''}`;
        if (!addedIds.has(id)) {
          markers.push({
            id,
            name: station.callsign + (station.ssid ? `-${station.ssid}` : ''),
            type: 'aprs',
            value: station.altitude || 0,
            unit: 'm',
            status: 'active',
            lastUpdate: station.last_seen || station.timestamp || new Date().toISOString(),
            location: { lat: station.lat!, lng: station.lon! },
          });
          addedIds.add(id);
        }
      });
    }

    // Add EPIRB beacon markers
    if (epirbBeacons?.length) {
      epirbBeacons.forEach((beacon: EpirbBeacon) => {
        if (!isValidCoordinate(beacon.lat, beacon.lon)) return;
        const id = `epirb-${beacon.beacon_id}`;
        if (!addedIds.has(id)) {
          markers.push({
            id,
            name: beacon.owner_info?.vessel_name || `Beacon ${beacon.beacon_id}`,
            type: 'epirb',
            value: beacon.signal_strength || 0,
            unit: 'dBm',
            status: beacon.status,
            lastUpdate: beacon.last_seen || beacon.activation_time || new Date().toISOString(),
            location: { lat: beacon.lat!, lng: beacon.lon! },
          });
          addedIds.add(id);
        }
      });
    }

    return markers;
  }, [starlinkMarkers, gpsdStatus, gpsReadings, aisVessels, aprsStations, epirbBeacons]);

  // ===== BUILD WIRELESS DETECTION MARKERS =====
  const wifiDetectionMarkers = useMemo<WirelessDetectionMarker[]>(() => {
    if (!wifiData?.readings?.length || !clientMarkers.length) return [];
    
    const markers: WirelessDetectionMarker[] = [];
    const seenNetworks = new Set<string>();

    wifiData.readings.forEach((reading, index) => {
      const readingClientId = reading.client_id;
      const client = clientMarkers.find(c => c.client_id === readingClientId);
      if (!client) return;

      const networkId = reading.bssid || reading.ssid || `wifi-${index}`;
      if (seenNetworks.has(networkId)) return;
      seenNetworks.add(networkId);

      const offsetLat = (Math.random() - 0.5) * 0.002;
      const offsetLng = (Math.random() - 0.5) * 0.002;

      markers.push({
        id: `wifi-det-${networkId}`,
        type: 'wifi',
        name: reading.ssid || 'Unknown Network',
        client_id: readingClientId || '',
        location: {
          lat: client.location.lat + offsetLat,
          lng: client.location.lng + offsetLng,
        },
        rssi: reading.rssi || reading.signal_strength,
        lastSeen: reading.timestamp,
        bssid: reading.bssid,
        channel: reading.channel,
        security: reading.security,
      });
    });

    return markers.slice(0, 100);
  }, [wifiData, clientMarkers]);

  const bluetoothDetectionMarkers = useMemo<WirelessDetectionMarker[]>(() => {
    if (!bluetoothData?.readings?.length || !clientMarkers.length) return [];
    
    const markers: WirelessDetectionMarker[] = [];
    const seenDevices = new Set<string>();

    bluetoothData.readings.forEach((reading, index) => {
      const readingClientId = reading.client_id;
      const client = clientMarkers.find(c => c.client_id === readingClientId);
      if (!client) return;

      const deviceId = reading.mac_address || `bt-${index}`;
      if (seenDevices.has(deviceId)) return;
      seenDevices.add(deviceId);

      const offsetLat = (Math.random() - 0.5) * 0.002;
      const offsetLng = (Math.random() - 0.5) * 0.002;

      markers.push({
        id: `bt-det-${deviceId}`,
        type: 'bluetooth',
        name: reading.name || 'Unknown Device',
        client_id: readingClientId || '',
        location: {
          lat: client.location.lat + offsetLat,
          lng: client.location.lng + offsetLng,
        },
        rssi: reading.rssi || reading.signal_strength,
        lastSeen: reading.timestamp,
        mac_address: reading.mac_address,
        device_class: reading.device_class,
        manufacturer: reading.manufacturer,
      });
    });

    return markers.slice(0, 100);
  }, [bluetoothData, clientMarkers]);

  // ===== BUILD ADS-B TRAILS =====
  const adsbTrails = useMemo<AircraftTrailData[]>(() => {
    if (!adsbHistoricalData?.readings?.length) return [];

    const trailsMap = new Map<string, AircraftTrailData>();

    adsbHistoricalData.readings.forEach((reading) => {
      const data = reading.data;
      const timestamp = reading.timestamp;
      if (!data) return;

      const aircraftList = (data as { aircraft_list?: Array<Record<string, unknown>> }).aircraft_list;

      if (aircraftList && Array.isArray(aircraftList)) {
        aircraftList.forEach((ac) => {
          if (!ac) return;
          const hex = String(ac.icao || ac.hex || '');
          if (!hex) return;

          const lat = (ac.latitude as number) || (ac.lat as number);
          const lon = (ac.longitude as number) || (ac.lon as number);
          const alt = (ac.altitude_ft as number) || (ac.alt_baro as number);
          const flight = (ac.callsign as string) || (ac.flight as string);

          if (isValidCoordinate(lat, lon)) {
            let trail = trailsMap.get(hex);
            if (!trail) {
              trail = { icao: hex, flight, coordinates: [], altitudes: [], timestamps: [] };
              trailsMap.set(hex, trail);
            }
            trail.coordinates.push([lat, lon]);
            trail.altitudes.push(alt);
            trail.timestamps.push(timestamp);
          }
        });
      }
    });

    return Array.from(trailsMap.values()).filter(t => t.coordinates.length > 1);
  }, [adsbHistoricalData]);

  // ===== COMPUTE STATS =====
  const stats = useMemo<MapStats>(() => {
    // Use counts from unified API if available
    const counts = mapMarkersData?.counts;
    
    return {
      total: (counts?.total_markers || 0) + sensorMarkers.length - starlinkMarkers.length,
      gps: sensorMarkers.filter(s => s.type === 'gps').length,
      starlink: counts?.starlink_dishes || starlinkMarkers.length,
      clients: counts?.clients || clientMarkers.length,
      lora: sensorMarkers.filter(s => s.type === 'lora').length,
      adsb: counts?.adsb_aircraft || adsbMarkers.length,
      wifi: sensorMarkers.filter(s => s.type === 'wifi').length,
      bluetooth: sensorMarkers.filter(s => s.type === 'bluetooth').length,
      aprs: sensorMarkers.filter(s => s.type === 'aprs').length,
      ais: sensorMarkers.filter(s => s.type === 'ais').length,
      epirb: sensorMarkers.filter(s => s.type === 'epirb').length,
      wifiDetections: wifiDetectionMarkers.length,
      bluetoothDetections: bluetoothDetectionMarkers.length,
    };
  }, [mapMarkersData?.counts, sensorMarkers, starlinkMarkers, clientMarkers, adsbMarkers, wifiDetectionMarkers, bluetoothDetectionMarkers]);

  // ===== ALL POSITIONS FOR MAP BOUNDS =====
  const allPositions = useMemo(() => {
    const positions: [number, number][] = [];

    sensorMarkers.forEach(m => {
      if (isValidCoordinate(m.location.lat, m.location.lng)) {
        positions.push([m.location.lat, m.location.lng]);
      }
    });

    clientMarkers.forEach(c => {
      if (isValidCoordinate(c.location.lat, c.location.lng)) {
        positions.push([c.location.lat, c.location.lng]);
      }
    });

    adsbMarkers.forEach(a => {
      if (isValidCoordinate(a.location.lat, a.location.lng)) {
        positions.push([a.location.lat, a.location.lng]);
      }
    });

    return positions;
  }, [sensorMarkers, clientMarkers, adsbMarkers]);

  // Loading state - primarily depends on unified API
  const isLoading = mapMarkersLoading || aisLoading || aprsLoading || epirbLoading;

  return {
    // Markers
    sensorMarkers,
    clientMarkers,
    adsbMarkers,
    starlinkMarkers,
    wifiDetectionMarkers,
    bluetoothDetectionMarkers,
    // Trails
    adsbTrails,
    trails: [], // Legacy - GPS trails (implement if needed)
    // Stats
    stats,
    locationSummary: null, // Deprecated - use stats from unified API
    // Positions
    allPositions,
    // State
    isLoading,
    lastUpdate,
    // Actions
    handleRefresh,
    // ADS-B metadata
    adsbSource: 'live' as const,
    adsbIsHistorical: false,
  };
}
