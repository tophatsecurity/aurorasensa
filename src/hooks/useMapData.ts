import { useMemo, useState, useEffect, useCallback } from "react";
import { LatLngExpression } from "leaflet";
import { 
  useSensors, 
  useClients, 
  useLatestReadings,
  useGeoLocations,
  useDeviceLatest,
  useSensorTypeStats,
  useAdsbAircraftWithHistory,
  useAdsbHistorical,
  GeoLocation,
  AdsbAircraft
} from "@/hooks/useAuroraApi";
import { useQueryClient } from "@tanstack/react-query";
import type { MapStats, SensorMarker, ClientMarker, AdsbMarker } from "@/types/map";

export interface UseMapDataOptions {
  adsbHistoryMinutes?: number;
}

// Trail type for aircraft history
export interface AircraftTrailData {
  icao: string;
  flight?: string;
  coordinates: [number, number][];
  altitudes: (number | undefined)[];
  timestamps: string[];
}

// Helper to extract GPS coordinates from various data sources
function extractGpsFromReadings(readings: Array<{ device_id: string; device_type: string; data: Record<string, unknown> }>) {
  const gpsData: Record<string, { lat: number; lng: number; altitude?: number; timestamp?: string }> = {};
  
  readings.forEach(reading => {
    const data = reading.data;
    
    // Check for GPS coordinates in the data
    let lat: number | null = null;
    let lng: number | null = null;
    let altitude: number | undefined;
    let timestamp: string | undefined;
    
    // Try various GPS coordinate field names
    if (typeof data.latitude === 'number' && typeof data.longitude === 'number') {
      lat = data.latitude;
      lng = data.longitude;
      altitude = typeof data.altitude === 'number' ? data.altitude : undefined;
    } else if (typeof data.lat === 'number' && typeof data.lon === 'number') {
      lat = data.lat;
      lng = data.lon;
      altitude = typeof data.alt === 'number' ? data.alt : undefined;
    } else if (typeof data.lat === 'number' && typeof data.lng === 'number') {
      lat = data.lat;
      lng = data.lng;
      altitude = typeof data.altitude === 'number' ? data.altitude : undefined;
    } else if (typeof data.gps_lat === 'number' && typeof data.gps_lon === 'number') {
      lat = data.gps_lat;
      lng = data.gps_lon;
      altitude = typeof data.gps_alt === 'number' ? data.gps_alt : undefined;
    } else if (typeof data.gps_latitude === 'number' && typeof data.gps_longitude === 'number') {
      lat = data.gps_latitude;
      lng = data.gps_longitude;
      altitude = typeof data.gps_altitude === 'number' ? data.gps_altitude : undefined;
    } else if (data.location && typeof data.location === 'object') {
      const loc = data.location as Record<string, unknown>;
      if (typeof loc.lat === 'number' && typeof loc.lng === 'number') {
        lat = loc.lat;
        lng = loc.lng;
        altitude = typeof loc.altitude === 'number' ? loc.altitude : undefined;
      } else if (typeof loc.latitude === 'number' && typeof loc.longitude === 'number') {
        lat = loc.latitude;
        lng = loc.longitude;
        altitude = typeof loc.altitude === 'number' ? loc.altitude : undefined;
      }
    } else if (data.position && typeof data.position === 'object') {
      const pos = data.position as Record<string, unknown>;
      if (typeof pos.lat === 'number' && typeof pos.lng === 'number') {
        lat = pos.lat;
        lng = pos.lng;
        altitude = typeof pos.altitude === 'number' ? pos.altitude : undefined;
      } else if (typeof pos.latitude === 'number' && typeof pos.longitude === 'number') {
        lat = pos.latitude;
        lng = pos.longitude;
        altitude = typeof pos.altitude === 'number' ? pos.altitude : undefined;
      }
    }

    // Get timestamp if available
    if (typeof data.timestamp === 'string') {
      timestamp = data.timestamp;
    } else if (typeof data.time === 'string') {
      timestamp = data.time;
    }
    
    // Validate coordinates are within valid ranges
    if (lat !== null && lng !== null && 
        lat >= -90 && lat <= 90 && 
        lng >= -180 && lng <= 180 &&
        !(lat === 0 && lng === 0)) { // Exclude 0,0 as it's often a default/invalid value
      gpsData[reading.device_id] = { lat, lng, altitude, timestamp };
    }
  });
  
  return gpsData;
}

// Merge geo locations with readings data, prioritizing geo locations (more accurate)
function mergeGpsData(
  geoLocations: GeoLocation[] | undefined,
  readingsGps: Record<string, { lat: number; lng: number; altitude?: number; timestamp?: string }>
): Record<string, { lat: number; lng: number; altitude?: number; timestamp?: string }> {
  const merged = { ...readingsGps };
  
  if (geoLocations && Array.isArray(geoLocations)) {
    geoLocations.forEach(geo => {
      // Validate coordinates
      if (geo.lat >= -90 && geo.lat <= 90 && 
          geo.lng >= -180 && geo.lng <= 180 &&
          !(geo.lat === 0 && geo.lng === 0)) {
        merged[geo.device_id] = {
          lat: geo.lat,
          lng: geo.lng,
          altitude: geo.altitude,
          timestamp: geo.timestamp,
        };
      }
    });
  }
  
  return merged;
}

export function useMapData(options: UseMapDataOptions = {}) {
  const { adsbHistoryMinutes = 60 } = options;
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const queryClient = useQueryClient();
  
  const { 
    data: sensors, 
    isLoading: sensorsLoading, 
    dataUpdatedAt: sensorsUpdated 
  } = useSensors();
  
  const { 
    data: clients, 
    isLoading: clientsLoading 
  } = useClients();

  const {
    data: latestReadings,
    isLoading: readingsLoading
  } = useLatestReadings();

  const {
    data: geoLocations,
    isLoading: geoLoading,
    dataUpdatedAt: geoUpdated
  } = useGeoLocations();

  // Get Starlink sensor stats which contains GPS coordinates
  const { data: starlinkStats } = useSensorTypeStats('starlink');

  // Get the Starlink device latest reading for real-time GPS
  const { data: starlinkLatest } = useDeviceLatest('starlink_dish_1');

  // Get ADS-B aircraft data with historical fallback based on timeframe
  const { 
    aircraft: adsbAircraft, 
    isLoading: adsbLoading,
    isHistorical: adsbIsHistorical,
    source: adsbSource
  } = useAdsbAircraftWithHistory(adsbHistoryMinutes);

  // Get raw historical readings for trail extraction
  const { data: adsbHistoricalData } = useAdsbHistorical(adsbHistoryMinutes);

  // Update last refresh time
  useEffect(() => {
    setLastUpdate(new Date());
  }, [sensorsUpdated, geoUpdated]);

  // Debug logging for map data sources
  useEffect(() => {
    console.log('[MapData] Data sources:', {
      sensors: sensors?.length || 0,
      clients: clients?.length || 0,
      latestReadings: latestReadings?.length || 0,
      geoLocations: geoLocations?.length || 0,
      adsbAircraft: adsbAircraft?.length || 0,
      starlinkStats: !!starlinkStats,
      starlinkLatest: !!starlinkLatest?.data,
    });
  }, [sensors, clients, latestReadings, geoLocations, adsbAircraft, starlinkStats, starlinkLatest]);

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["aurora"] });
  }, [queryClient]);

  // Extract GPS coordinates from latest readings
  const readingsGps = useMemo(() => {
    if (!latestReadings) return {};
    const gps = extractGpsFromReadings(latestReadings);
    if (Object.keys(gps).length > 0) {
      console.log('[MapData] Extracted GPS from readings:', Object.keys(gps));
    }
    return gps;
  }, [latestReadings]);

  // Extract GPS from Starlink stats (avg lat/lng from 24h data)
  const starlinkGps = useMemo<{ lat: number; lng: number; altitude?: number } | null>(() => {
    // Helper to extract lat/lng from various field formats
    const extractCoords = (data: Record<string, unknown>): { lat: number; lng: number; altitude?: number } | null => {
      let lat: number | undefined;
      let lng: number | undefined;
      let alt: number | undefined;

      // Try various field names
      if (typeof data.latitude === 'number' && data.latitude !== null && 
          typeof data.longitude === 'number' && data.longitude !== null) {
        lat = data.latitude;
        lng = data.longitude;
        alt = typeof data.altitude === 'number' ? data.altitude : undefined;
      } else if (typeof data.lat === 'number' && typeof data.lon === 'number') {
        lat = data.lat;
        lng = data.lon;
        alt = typeof data.alt === 'number' ? data.alt : undefined;
      } else if (typeof data.lat === 'number' && typeof data.lng === 'number') {
        lat = data.lat;
        lng = data.lng;
        alt = typeof data.altitude === 'number' ? data.altitude : undefined;
      } else if (typeof data.gps_latitude === 'number' && typeof data.gps_longitude === 'number') {
        lat = data.gps_latitude;
        lng = data.gps_longitude;
        alt = typeof data.gps_altitude === 'number' ? data.gps_altitude : undefined;
      } else if (data.location && typeof data.location === 'object') {
        const loc = data.location as Record<string, unknown>;
        if (typeof loc.lat === 'number' && (typeof loc.lng === 'number' || typeof loc.lon === 'number')) {
          lat = loc.lat;
          lng = (loc.lng ?? loc.lon) as number;
          alt = typeof loc.altitude === 'number' ? loc.altitude : undefined;
        } else if (typeof loc.latitude === 'number' && loc.latitude !== null && 
                   typeof loc.longitude === 'number' && loc.longitude !== null) {
          lat = loc.latitude;
          lng = loc.longitude;
          alt = typeof loc.altitude === 'number' ? loc.altitude : undefined;
        }
      } else if (data.gps && typeof data.gps === 'object') {
        const gps = data.gps as Record<string, unknown>;
        if (typeof gps.latitude === 'number' && gps.latitude !== null && 
            typeof gps.longitude === 'number' && gps.longitude !== null) {
          lat = gps.latitude;
          lng = gps.longitude;
          alt = typeof gps.altitude === 'number' ? gps.altitude : undefined;
        }
      } else if (data.position && typeof data.position === 'object') {
        const pos = data.position as Record<string, unknown>;
        if (typeof pos.lat === 'number' && (typeof pos.lng === 'number' || typeof pos.lon === 'number')) {
          lat = pos.lat;
          lng = (pos.lng ?? pos.lon) as number;
          alt = typeof pos.altitude === 'number' ? pos.altitude : undefined;
        }
      } else if (data.location_detail && typeof data.location_detail === 'object') {
        // Starlink location_detail format
        const loc = data.location_detail as Record<string, unknown>;
        if (typeof loc.latitude === 'number' && loc.latitude !== null && 
            typeof loc.longitude === 'number' && loc.longitude !== null) {
          lat = loc.latitude;
          lng = loc.longitude;
          alt = typeof loc.altitude === 'number' ? loc.altitude : undefined;
        }
      } else if (data.starlink && typeof data.starlink === 'object') {
        // Nested starlink object
        const starlink = data.starlink as Record<string, unknown>;
        if (typeof starlink.latitude === 'number' && starlink.latitude !== null && 
            typeof starlink.longitude === 'number' && starlink.longitude !== null) {
          lat = starlink.latitude;
          lng = starlink.longitude;
          alt = typeof starlink.altitude === 'number' ? starlink.altitude : undefined;
        } else if (starlink.location_detail && typeof starlink.location_detail === 'object') {
          const loc = starlink.location_detail as Record<string, unknown>;
          if (typeof loc.latitude === 'number' && loc.latitude !== null && 
              typeof loc.longitude === 'number' && loc.longitude !== null) {
            lat = loc.latitude;
            lng = loc.longitude;
            alt = typeof loc.altitude === 'number' ? loc.altitude : undefined;
          }
        }
      }

      if (lat !== undefined && lng !== undefined && 
          lat >= -90 && lat <= 90 && 
          lng >= -180 && lng <= 180 &&
          !(lat === 0 && lng === 0)) {
        return { lat, lng, altitude: alt };
      }
      return null;
    };

    // Try Starlink stats numeric fields
    if (starlinkStats?.numeric_field_stats_24h) {
      const stats = starlinkStats.numeric_field_stats_24h as Record<string, { avg?: number }>;
      const lat = stats.latitude?.avg;
      const lng = stats.longitude?.avg;
      const alt = stats.altitude?.avg;
      
      if (lat !== undefined && lng !== undefined && 
          lat >= -90 && lat <= 90 && 
          lng >= -180 && lng <= 180 &&
          !(lat === 0 && lng === 0)) {
        console.log('[MapData] Found Starlink GPS from stats:', { lat, lng, alt });
        return { lat, lng, altitude: alt };
      }
    }
    
    // Try Starlink latest reading with flexible field detection
    if (starlinkLatest?.data) {
      const data = starlinkLatest.data as Record<string, unknown>;
      const coords = extractCoords(data);
      if (coords) {
        console.log('[MapData] Found Starlink GPS from latest:', coords);
        return coords;
      }
    }

    // Try latest readings for starlink devices
    if (latestReadings) {
      for (const reading of latestReadings) {
        if (reading.device_type?.toLowerCase().includes('starlink') || 
            reading.device_id?.toLowerCase().includes('starlink')) {
          const coords = extractCoords(reading.data);
          if (coords) {
            console.log('[MapData] Found Starlink GPS from readings:', coords);
            return coords;
          }
        }
      }
    }
    
    return null;
  }, [starlinkStats, starlinkLatest, latestReadings]);

  // Debug starlinkGps
  useEffect(() => {
    if (starlinkGps) {
      console.log('[MapData] Starlink GPS found:', starlinkGps);
    }
  }, [starlinkGps]);

  // Merge geo locations API with readings GPS and Starlink GPS
  const gpsCoordinates = useMemo(() => {
    const merged = mergeGpsData(geoLocations, readingsGps);
    
    // Add Starlink GPS if available
    if (starlinkGps) {
      merged['starlink_dish_1'] = {
        lat: starlinkGps.lat,
        lng: starlinkGps.lng,
        altitude: starlinkGps.altitude,
      };
    }
    
    if (Object.keys(merged).length > 0) {
      console.log('[MapData] GPS coordinates merged:', Object.keys(merged));
    }
    
    return merged;
  }, [geoLocations, readingsGps, starlinkGps]);

  // Build sensor markers from sensors API, geo locations, and clients with GPS
  const sensorMarkers = useMemo<SensorMarker[]>(() => {
    const markers: SensorMarker[] = [];
    const addedIds = new Set<string>();
    
    // Add sensors that have location data directly
    if (sensors) {
      sensors.forEach(s => {
        if (s.location?.lat && s.location?.lng) {
          // Validate coordinates
          if (s.location.lat >= -90 && s.location.lat <= 90 &&
              s.location.lng >= -180 && s.location.lng <= 180 &&
              !(s.location.lat === 0 && s.location.lng === 0)) {
            markers.push(s as SensorMarker);
            addedIds.add(s.id);
          }
        }
      });
    }

    // Add geo locations as GPS markers
    if (geoLocations && Array.isArray(geoLocations)) {
      geoLocations.forEach(geo => {
        const id = `geo-${geo.device_id}`;
        if (addedIds.has(id)) return;
        
        // Validate coordinates
        if (geo.lat >= -90 && geo.lat <= 90 &&
            geo.lng >= -180 && geo.lng <= 180 &&
            !(geo.lat === 0 && geo.lng === 0)) {
          markers.push({
            id,
            name: geo.device_id,
            type: 'gps',
            value: geo.altitude || 0,
            unit: 'm',
            status: 'active',
            lastUpdate: geo.timestamp || new Date().toISOString(),
            location: { lat: geo.lat, lng: geo.lng }
          });
          addedIds.add(id);
        }
      });
    }

    // Add Starlink marker from stats GPS if we have it
    if (starlinkGps && !addedIds.has('starlink_dish_1')) {
      markers.push({
        id: 'starlink_dish_1',
        name: 'Starlink Dish',
        type: 'starlink',
        value: starlinkGps.altitude || 0,
        unit: 'm',
        status: 'active',
        lastUpdate: new Date().toISOString(),
        location: { lat: starlinkGps.lat, lng: starlinkGps.lng }
      });
      addedIds.add('starlink_dish_1');
    }
    
    // Add clients as sensors based on their enabled sensor types
    if (clients) {
      clients.forEach(client => {
        const config = client.metadata?.config?.sensors;
        const baseStatus = client.status || 'active';
        
        // Try to find GPS coordinates for this client
        let clientGps: { lat: number; lng: number } | null = null;
        
        // 1. Check if there's a geo location for this client directly
        if (gpsCoordinates[client.client_id]) {
          clientGps = gpsCoordinates[client.client_id];
        }
        
        // 2. Look for GPS coordinates in any of the client's sensor readings
        if (!clientGps) {
          const clientSensors = client.sensors || [];
          for (const sensorId of clientSensors) {
            if (gpsCoordinates[sensorId]) {
              clientGps = gpsCoordinates[sensorId];
              break;
            }
          }
        }
        
        // 3. Check for GPS device ID patterns
        if (!clientGps) {
          const gpsDeviceId = `${client.hostname}_gps` || `gps_${client.client_id}`;
          if (gpsCoordinates[gpsDeviceId]) {
            clientGps = gpsCoordinates[gpsDeviceId];
          }
        }

        // 4. Check for starlink GPS data which often includes location
        if (!clientGps) {
          const starlinkId = client.sensors?.find(s => s.toLowerCase().includes('starlink'));
          if (starlinkId && gpsCoordinates[starlinkId]) {
            clientGps = gpsCoordinates[starlinkId];
          }
        }
        
        // If no GPS found, skip this client for map markers
        if (!clientGps) return;
        
        // Only add if we have config sensors defined
        if (!config) {
          // Add generic client marker if no config
          const id = `${client.client_id}-device`;
          if (!addedIds.has(id)) {
            markers.push({
              id,
              name: `${client.hostname}`,
              type: 'client',
              value: 0,
              unit: '',
              status: baseStatus,
              lastUpdate: client.last_seen,
              location: clientGps
            });
            addedIds.add(id);
          }
          return;
        }
        
        // Check for GPS-enabled client and create marker
        const gps = config.gps;
        if (gps?.enabled) {
          const id = `${client.client_id}-gps`;
          if (!addedIds.has(id)) {
            markers.push({
              id,
              name: `${client.hostname} GPS`,
              type: 'gps',
              value: gpsCoordinates[client.client_id]?.altitude || 0,
              unit: 'm',
              status: baseStatus,
              lastUpdate: client.last_seen,
              location: clientGps
            });
            addedIds.add(id);
          }
        }
        
        // Add LoRa sensors
        const lora = config.lora;
        if (lora?.enabled) {
          const id = `${client.client_id}-lora`;
          if (!addedIds.has(id)) {
            markers.push({
              id,
              name: `${client.hostname} LoRa`,
              type: 'lora',
              value: 0,
              unit: 'dBm',
              status: baseStatus,
              lastUpdate: client.last_seen,
              location: clientGps
            });
            addedIds.add(id);
          }
        }
        
        // Add Starlink sensors
        const starlink = config.starlink;
        if (starlink?.enabled) {
          const id = `${client.client_id}-starlink`;
          if (!addedIds.has(id)) {
            markers.push({
              id,
              name: `${client.hostname} Starlink`,
              type: 'starlink',
              value: 0,
              unit: 'Mbps',
              status: baseStatus,
              lastUpdate: client.last_seen,
              location: clientGps
            });
            addedIds.add(id);
          }
        }
        
        // Add WiFi sensors
        const wifi = config.wifi;
        if (wifi?.enabled) {
          const id = `${client.client_id}-wifi`;
          if (!addedIds.has(id)) {
            markers.push({
              id,
              name: `${client.hostname} WiFi`,
              type: 'client',
              value: 0,
              unit: 'devices',
              status: baseStatus,
              lastUpdate: client.last_seen,
              location: clientGps
            });
            addedIds.add(id);
          }
        }
        
        // Add Bluetooth sensors
        const bluetooth = config.bluetooth;
        if (bluetooth?.enabled) {
          const id = `${client.client_id}-bluetooth`;
          if (!addedIds.has(id)) {
            markers.push({
              id,
              name: `${client.hostname} Bluetooth`,
              type: 'client',
              value: 0,
              unit: 'devices',
              status: baseStatus,
              lastUpdate: client.last_seen,
              location: clientGps
            });
            addedIds.add(id);
          }
        }
        
        // Add Thermal Probe sensors
        const thermal = config.thermal_probe;
        if (thermal?.enabled) {
          const id = `${client.client_id}-thermal`;
          if (!addedIds.has(id)) {
            markers.push({
              id,
              name: `${client.hostname} Thermal`,
              type: 'gps',
              value: 0,
              unit: '°C',
              status: baseStatus,
              lastUpdate: client.last_seen,
              location: clientGps
            });
            addedIds.add(id);
          }
        }

        // Add Arduino devices
        const arduinoDevices = config.arduino_devices;
        if (arduinoDevices && Array.isArray(arduinoDevices)) {
          arduinoDevices.forEach((arduino, idx) => {
            if (arduino.enabled) {
              const id = `${client.client_id}-arduino-${idx}`;
              if (!addedIds.has(id)) {
                markers.push({
                  id,
                  name: `${client.hostname} Arduino ${arduino.device_id || idx + 1}`,
                  type: 'client',
                  value: 0,
                  unit: '',
                  status: baseStatus,
                  lastUpdate: client.last_seen,
                  location: clientGps!
                });
                addedIds.add(id);
              }
            }
          });
        }
      });
    }
    
    return markers;
  }, [sensors, clients, gpsCoordinates, geoLocations, starlinkGps]);

  // Get client markers for the clients filter
  const clientMarkers = useMemo<ClientMarker[]>(() => {
    if (!clients) return [];
    
    return clients
      .map(c => {
        // Try to find GPS coordinates for this client
        let clientGps: { lat: number; lng: number } | null = null;
        
        // Check geo locations API first
        if (gpsCoordinates[c.client_id]) {
          clientGps = gpsCoordinates[c.client_id];
        }
        
        // Look for GPS coordinates in any of the client's sensor readings
        if (!clientGps) {
          const clientSensors = c.sensors || [];
          for (const sensorId of clientSensors) {
            if (gpsCoordinates[sensorId]) {
              clientGps = gpsCoordinates[sensorId];
              break;
            }
          }
        }
        
        // Only include clients with actual GPS coordinates
        if (!clientGps) return null;
        
        return {
          client_id: c.client_id,
          hostname: c.hostname,
          location: clientGps
        };
      })
      .filter((c): c is ClientMarker => c !== null);
  }, [clients, gpsCoordinates]);

  // Build ADS-B aircraft markers
  const adsbMarkers = useMemo<AdsbMarker[]>(() => {
    if (!adsbAircraft || !Array.isArray(adsbAircraft)) return [];
    
    return adsbAircraft
      .filter((aircraft: AdsbAircraft) => 
        aircraft.lat !== undefined && 
        aircraft.lon !== undefined &&
        aircraft.lat >= -90 && aircraft.lat <= 90 &&
        aircraft.lon >= -180 && aircraft.lon <= 180
      )
      .map((aircraft: AdsbAircraft) => {
        // For historical data, mark as 'historical' status; for live, use seen time
        let status = 'active';
        if (adsbIsHistorical) {
          status = 'historical';
        } else if (aircraft.seen !== undefined && aircraft.seen >= 60) {
          status = 'stale';
        }
        
        return {
          id: `adsb-${aircraft.hex}`,
          hex: aircraft.hex,
          name: aircraft.flight?.trim() || aircraft.hex,
          type: 'adsb',
          value: aircraft.alt_baro || aircraft.alt_geom || 0,
          unit: 'ft',
          status,
          lastUpdate: new Date().toISOString(),
          location: {
            lat: aircraft.lat!,
            lng: aircraft.lon!
          },
          speed: aircraft.gs,
          track: aircraft.track,
          squawk: aircraft.squawk,
          rssi: aircraft.rssi,
          category: aircraft.category,
          // Extended fields
          registration: aircraft.registration,
          operator: aircraft.operator || aircraft.operator_callsign,
          aircraftType: aircraft.type,
          country: aircraft.country,
          military: aircraft.military,
          altGeom: aircraft.alt_geom,
          baroRate: aircraft.baro_rate,
          ias: aircraft.ias,
          tas: aircraft.tas,
          emergency: aircraft.emergency,
          messages: aircraft.messages,
        };
      });
  }, [adsbAircraft, adsbIsHistorical]);

  // Extract aircraft trails from historical data
  const adsbTrails = useMemo<AircraftTrailData[]>(() => {
    if (!adsbHistoricalData?.readings || adsbHistoricalData.readings.length === 0) {
      return [];
    }

    // Map of icao -> trail data with all positions
    const trailMap = new Map<string, { 
      flight?: string; 
      positions: { lat: number; lng: number; alt?: number; timestamp: string }[] 
    }>();

    adsbHistoricalData.readings.forEach(reading => {
      const data = reading.data;
      const timestamp = reading.timestamp;
      
      // Check if aircraft_list exists (new format)
      const aircraftList = (data as { aircraft_list?: Array<Record<string, unknown>> }).aircraft_list;
      
      if (aircraftList && Array.isArray(aircraftList)) {
        aircraftList.forEach(ac => {
          const hex = String(ac.icao || ac.hex || '');
          if (!hex) return;
          
          const lat = ac.latitude as number || ac.lat as number;
          const lon = ac.longitude as number || ac.lon as number;
          const alt = ac.altitude_ft as number || ac.alt_baro as number;
          const flight = ac.callsign as string || ac.flight as string;
          
          if (lat !== undefined && lon !== undefined && 
              lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
            const existing = trailMap.get(hex) || { flight, positions: [] };
            existing.positions.push({ lat, lng: lon, alt, timestamp });
            if (flight && !existing.flight) existing.flight = flight;
            trailMap.set(hex, existing);
          }
        });
      } else {
        // Old format: aircraft data directly in data object
        const hex = String(data.hex || data.flight || '');
        if (!hex) return;
        
        const lat = data.lat as number;
        const lon = data.lon as number;
        const alt = data.alt_baro as number;
        const flight = data.flight as string;
        
        if (lat !== undefined && lon !== undefined && 
            lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
          const existing = trailMap.get(hex) || { flight, positions: [] };
          existing.positions.push({ lat, lng: lon, alt, timestamp });
          if (flight && !existing.flight) existing.flight = flight;
          trailMap.set(hex, existing);
        }
      }
    });

    // Convert to trail format, sorted by timestamp
    return Array.from(trailMap.entries())
      .filter(([, trail]) => trail.positions.length >= 2) // Only include if we have at least 2 points
      .map(([icao, trail]) => {
        // Sort positions by timestamp
        const sortedPositions = [...trail.positions].sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        
        return {
          icao,
          flight: trail.flight,
          coordinates: sortedPositions.map(p => [p.lat, p.lng] as [number, number]),
          altitudes: sortedPositions.map(p => p.alt),
          timestamps: sortedPositions.map(p => p.timestamp),
        };
      });
  }, [adsbHistoricalData]);

  // All marker positions for bounds fitting
  const allPositions = useMemo<LatLngExpression[]>(() => {
    const positions: LatLngExpression[] = [];
    sensorMarkers.forEach(s => positions.push([s.location.lat, s.location.lng]));
    clientMarkers.forEach(c => positions.push([c.location.lat, c.location.lng]));
    adsbMarkers.forEach(a => positions.push([a.location.lat, a.location.lng]));
    return positions;
  }, [sensorMarkers, clientMarkers, adsbMarkers]);

  // Calculate statistics
  const stats = useMemo<MapStats>(() => {
    const result = {
      total: sensorMarkers.length + clientMarkers.length + adsbMarkers.length,
      gps: sensorMarkers.filter(s => s.type === 'gps').length,
      starlink: sensorMarkers.filter(s => s.type === 'starlink').length,
      clients: clientMarkers.length,
      lora: sensorMarkers.filter(s => s.type === 'lora').length,
      adsb: adsbMarkers.length,
    };
    console.log('[MapData] Final stats:', result);
    return result;
  }, [sensorMarkers, clientMarkers, adsbMarkers]);

  const isLoading = sensorsLoading || clientsLoading || readingsLoading || geoLoading || adsbLoading;

  // Format time ago
  const timeAgo = useMemo(() => {
    const seconds = Math.floor((new Date().getTime() - lastUpdate.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    return `${Math.floor(seconds / 60)}m ago`;
  }, [lastUpdate]);

  return {
    sensorMarkers,
    clientMarkers,
    adsbMarkers,
    adsbTrails,
    allPositions,
    stats,
    isLoading,
    timeAgo,
    handleRefresh,
    lastUpdate,
    geoLocations,
    adsbIsHistorical,
    adsbSource,
  };
}
