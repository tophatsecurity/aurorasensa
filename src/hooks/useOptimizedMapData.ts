/**
 * Optimized Map Data Hook
 * Uses new unified location API endpoints for better performance
 * Reduces API calls by consolidating location sources
 */

import { useMemo, useState, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { MapStats, SensorMarker, ClientMarker, AdsbMarker, StarlinkMetrics, WirelessDetectionMarker, LocationSourceType } from "@/types/map";
import {
  // Core data hooks
  useClients,
  useLatestReadings,
  // Unified location hooks
  useLocationSummary,
  useClientLatestLocation,
  // Starlink hooks
  useStarlinkDevicesFromReadings,
  useStarlinkSignalStrength,
  useStarlinkPerformance,
  useStarlinkPower,
  useStarlinkConnectivity,
  // ADS-B hooks
  useAdsbAircraftWithHistory,
  useAdsbHistorical,
  // Maritime hooks
  useAisVessels,
  useAprsStations,
  useEpirbBeacons,
  // Wireless detection hooks
  useWifiScannerTimeseries,
  useBluetoothScannerTimeseries,
  // GPS hooks
  useGpsdStatus,
  useGpsReadings,
  // Geo locations
  useGeoLocations,
  // Types
  type AdsbAircraft,
  type AisVessel,
  type AprsStation,
  type EpirbBeacon,
  type StarlinkDeviceWithMetrics,
  type GeoLocation,
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
  const { adsbHistoryMinutes = 60, refetchInterval, clientId } = options;
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const queryClient = useQueryClient();

  // ===== CORE DATA SOURCES =====
  const { data: clients, isLoading: clientsLoading } = useClients();
  const { data: latestReadings, isLoading: readingsLoading } = useLatestReadings();
  
  // ===== UNIFIED LOCATION API =====
  const { data: locationSummary, isLoading: locationSummaryLoading } = useLocationSummary(48);
  const { data: geoLocations, isLoading: geoLoading } = useGeoLocations();

  // ===== STARLINK DATA =====
  const { data: starlinkDevices, isLoading: starlinkLoading } = useStarlinkDevicesFromReadings();
  const { data: starlinkSignal } = useStarlinkSignalStrength();
  const { data: starlinkPerformance } = useStarlinkPerformance();
  const { data: starlinkPower } = useStarlinkPower();
  const { data: starlinkConnectivity } = useStarlinkConnectivity();

  // ===== GPS DATA =====
  const { data: gpsdStatus } = useGpsdStatus();
  const { data: gpsReadings } = useGpsReadings(24);

  // ===== ADS-B DATA =====
  const { 
    aircraft: adsbAircraft, 
    isLoading: adsbLoading,
    isHistorical: adsbIsHistorical,
    source: adsbSource 
  } = useAdsbAircraftWithHistory(adsbHistoryMinutes);
  const { data: adsbHistoricalData } = useAdsbHistorical(adsbHistoryMinutes);

  // ===== MARITIME DATA =====
  const { data: aisVessels, isLoading: aisLoading } = useAisVessels();
  const { data: aprsStations, isLoading: aprsLoading } = useAprsStations();
  const { data: epirbBeacons, isLoading: epirbLoading } = useEpirbBeacons();

  // ===== WIRELESS DETECTION DATA =====
  const { data: wifiData, isLoading: wifiLoading } = useWifiScannerTimeseries(1);
  const { data: bluetoothData, isLoading: bluetoothLoading } = useBluetoothScannerTimeseries(1);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["aurora"] });
    setLastUpdate(new Date());
  }, [queryClient]);

  // ===== BUILD STARLINK MARKERS =====
  const starlinkMarkers = useMemo<SensorMarker[]>(() => {
    if (!starlinkDevices?.length) return [];

    const starlinkMetrics: StarlinkMetrics = {
      connected: starlinkConnectivity?.connected,
      signalStrength: starlinkSignal?.signal_strength_dbm,
      snr: starlinkSignal?.snr,
      obstructionPercent: starlinkConnectivity?.obstruction_percent,
      uptimeSeconds: starlinkConnectivity?.uptime_seconds,
      downlinkThroughputBps: starlinkPerformance?.downlink_throughput_bps,
      uplinkThroughputBps: starlinkPerformance?.uplink_throughput_bps,
      latencyMs: starlinkPerformance?.pop_ping_latency_ms,
      powerWatts: starlinkPower?.device_summaries?.[0]?.overall?.avg_watts,
    };

    return starlinkDevices
      .filter((device: StarlinkDeviceWithMetrics) => 
        isValidCoordinate(device.latitude, device.longitude)
      )
      .map((device: StarlinkDeviceWithMetrics) => {
        // Format display name
        let displayName = 'Starlink Dish';
        if (device.device_id && device.device_id !== 'starlink_dish_1') {
          if (device.device_id.toLowerCase().startsWith('ut')) {
            const parts = device.device_id.split('-');
            displayName = `Starlink ${parts[0].substring(0, 8)}...${parts[parts.length - 1]?.slice(-6) || ''}`;
          } else {
            displayName = `Starlink ${device.device_id.replace(/_/g, ' ').replace(/starlink/i, '').trim() || 'Dish'}`;
          }
        }
        if (device.client_id) {
          displayName += ` (${device.client_id.substring(0, 6)}...)`;
        }

        return {
          id: device.composite_key || `${device.client_id}:${device.device_id}`,
          name: displayName,
          type: 'starlink',
          value: device.altitude || 0,
          unit: 'm',
          status: starlinkMetrics.connected ? 'active' : 'warning',
          lastUpdate: device.last_seen || new Date().toISOString(),
          location: { lat: device.latitude!, lng: device.longitude! },
          starlinkData: {
            ...starlinkMetrics,
            altitude: device.altitude,
            deviceId: device.device_id,
          },
        };
      });
  }, [starlinkDevices, starlinkSignal, starlinkPerformance, starlinkPower, starlinkConnectivity]);

  // ===== BUILD CLIENT MARKERS WITH RESOLVED LOCATIONS =====
  const clientMarkers = useMemo<ClientMarker[]>(() => {
    if (!clients?.length) return [];

    const markers: ClientMarker[] = [];
    const processedIds = new Set<string>();

    // Build lookup for Starlink device locations by client_id
    const starlinkByClient = new Map<string, StarlinkDeviceWithMetrics>();
    starlinkDevices?.forEach((device: StarlinkDeviceWithMetrics) => {
      if (device.client_id && isValidCoordinate(device.latitude, device.longitude)) {
        starlinkByClient.set(device.client_id, device);
      }
    });

    // Build lookup for GPS readings by client_id
    const gpsReadingsByClient = new Map<string, { lat: number; lng: number }>();
    gpsReadings?.readings?.forEach((reading: { client_id?: string; latitude?: number; longitude?: number }) => {
      if (reading.client_id && isValidCoordinate(reading.latitude, reading.longitude)) {
        gpsReadingsByClient.set(reading.client_id, { 
          lat: reading.latitude!, 
          lng: reading.longitude! 
        });
      }
    });

    // Build lookup for geo locations
    const geoLocationsByDevice = new Map<string, GeoLocation>();
    if (Array.isArray(geoLocations)) {
      geoLocations.forEach((geo: GeoLocation) => {
        if (geo.device_id && isValidCoordinate(geo.lat, geo.lng)) {
          geoLocationsByDevice.set(geo.device_id, geo);
        }
      });
    }

    clients.forEach(client => {
      if (processedIds.has(client.client_id)) return;

      let location: { lat: number; lng: number } | null = null;
      let locationSource: LocationSourceType = 'unknown';
      let city: string | undefined;
      let country: string | undefined;

      // Priority 1: Starlink dish GPS (highest accuracy)
      const starlinkDevice = starlinkByClient.get(client.client_id);
      if (starlinkDevice) {
        location = { lat: starlinkDevice.latitude!, lng: starlinkDevice.longitude! };
        locationSource = 'starlink';
      }

      // Priority 2: Hardware GPS readings
      if (!location) {
        const gpsReading = gpsReadingsByClient.get(client.client_id);
        if (gpsReading) {
          location = gpsReading;
          locationSource = 'gps';
        }
      }

      // Priority 3: Geo locations from sensors
      if (!location) {
        const geoLoc = geoLocationsByDevice.get(client.client_id);
        if (geoLoc) {
          location = { lat: geoLoc.lat, lng: geoLoc.lng };
          locationSource = 'sensor';
        }
      }

      // Priority 4: IP Geolocation fallback
      if (!location && client.location) {
        const lat = client.location.latitude;
        const lng = client.location.longitude;
        if (isValidCoordinate(lat, lng)) {
          location = { lat: lat!, lng: lng! };
          locationSource = 'ip-geo';
          city = client.location.city;
          country = client.location.country;
        }
      }

      if (location) {
        markers.push({
          client_id: client.client_id,
          hostname: client.hostname || client.client_id,
          location,
          locationSource,
          city,
          country,
        });
        processedIds.add(client.client_id);
      }
    });

    return markers;
  }, [clients, starlinkDevices, gpsReadings, geoLocations]);

  // ===== BUILD SENSOR MARKERS (GPS, LoRa, etc.) =====
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
      const latestByDevice = new Map<string, typeof gpsReadings.readings[0]>();
      gpsReadings.readings.forEach((reading: typeof gpsReadings.readings[0]) => {
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

    // Add geo location markers
    if (Array.isArray(geoLocations)) {
      geoLocations.forEach((geo: GeoLocation & { device_name?: string; device_type?: string; status?: string }) => {
        if (!isValidCoordinate(geo.lat, geo.lng)) return;
        
        // Skip if it's a Starlink device (already added)
        if (geo.device_id?.toLowerCase().includes('starlink')) return;
        
        const id = `geo-${geo.device_id}`;
        if (!addedIds.has(id)) {
          markers.push({
            id,
            name: geo.device_name || geo.device_id,
            type: geo.device_type || 'gps',
            value: geo.altitude || 0,
            unit: 'm',
            status: geo.status || 'active',
            lastUpdate: geo.timestamp || new Date().toISOString(),
            location: { lat: geo.lat, lng: geo.lng },
          });
          addedIds.add(id);
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
  }, [starlinkMarkers, gpsdStatus, gpsReadings, geoLocations, aisVessels, aprsStations, epirbBeacons]);

  // ===== BUILD ADS-B MARKERS =====
  const adsbMarkers = useMemo<AdsbMarker[]>(() => {
    if (!adsbAircraft?.length) return [];

    return adsbAircraft
      .filter((aircraft: AdsbAircraft) => isValidCoordinate(aircraft.lat, aircraft.lon))
      .map((aircraft: AdsbAircraft) => {
        let status = 'active';
        if (adsbIsHistorical) {
          status = 'historical';
        } else if (aircraft.seen !== undefined && aircraft.seen >= 60) {
          status = 'stale';
        }

        return {
          id: aircraft.hex,
          hex: aircraft.hex,
          name: aircraft.flight?.trim() || `Aircraft ${aircraft.hex}`,
          type: 'adsb',
          value: aircraft.alt_baro || aircraft.alt_geom || 0,
          unit: 'ft',
          status,
          lastUpdate: new Date().toISOString(),
          location: { lat: aircraft.lat!, lng: aircraft.lon! },
          speed: aircraft.gs,
          track: aircraft.track,
          squawk: aircraft.squawk,
          rssi: aircraft.rssi,
          category: aircraft.category,
          registration: aircraft.registration,
          operator: aircraft.operator,
          aircraftType: aircraft.description, // Use description as aircraft type
          country: aircraft.country,
          military: aircraft.military,
          altGeom: aircraft.alt_geom,
          baroRate: aircraft.baro_rate,
          ias: aircraft.ias,
          tas: aircraft.tas,
          emergency: aircraft.emergency,
          messages: aircraft.messages,
        } as AdsbMarker;
      });
  }, [adsbAircraft, adsbIsHistorical]);

  // ===== BUILD WIRELESS DETECTION MARKERS =====
  const wifiDetectionMarkers = useMemo<WirelessDetectionMarker[]>(() => {
    if (!wifiData?.readings?.length || !clientMarkers.length) return [];
    
    const markers: WirelessDetectionMarker[] = [];
    const seenNetworks = new Set<string>();

    wifiData.readings.forEach((reading, index) => {
      const clientId = reading.client_id;
      const client = clientMarkers.find(c => c.client_id === clientId);
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
        client_id: clientId || '',
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
      const clientId = reading.client_id;
      const client = clientMarkers.find(c => c.client_id === clientId);
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
        client_id: clientId || '',
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
    // Apply client filter if specified
    const filterByClient = (markers: SensorMarker[]) => {
      if (!clientId || clientId === 'all') return markers;
      return markers.filter(m => 
        m.id.includes(clientId) || 
        (m as unknown as { client_id?: string }).client_id === clientId
      );
    };

    const filteredSensors = filterByClient(sensorMarkers);
    const filteredClients = clientId && clientId !== 'all' 
      ? clientMarkers.filter(c => c.client_id === clientId)
      : clientMarkers;

    return {
      total: filteredSensors.length + filteredClients.length + adsbMarkers.length,
      gps: filteredSensors.filter(s => s.type === 'gps').length,
      starlink: filteredSensors.filter(s => s.type === 'starlink').length,
      clients: filteredClients.length,
      lora: filteredSensors.filter(s => s.type === 'lora').length,
      adsb: adsbMarkers.length,
      wifi: filteredSensors.filter(s => s.type === 'wifi').length,
      bluetooth: filteredSensors.filter(s => s.type === 'bluetooth').length,
      aprs: filteredSensors.filter(s => s.type === 'aprs').length,
      ais: filteredSensors.filter(s => s.type === 'ais').length,
      epirb: filteredSensors.filter(s => s.type === 'epirb').length,
      wifiDetections: wifiDetectionMarkers.length,
      bluetoothDetections: bluetoothDetectionMarkers.length,
    };
  }, [sensorMarkers, clientMarkers, adsbMarkers, wifiDetectionMarkers, bluetoothDetectionMarkers, clientId]);

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

  // Loading state
  const isLoading = clientsLoading || readingsLoading || starlinkLoading || adsbLoading || geoLoading;

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
    locationSummary,
    // Positions
    allPositions,
    // State
    isLoading,
    lastUpdate,
    // Actions
    handleRefresh,
    // ADS-B metadata
    adsbSource,
    adsbIsHistorical,
  };
}
