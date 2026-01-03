import { useMemo, useState, useEffect, useCallback } from "react";
import { LatLngExpression } from "leaflet";
import { 
  useAdsbAircraft, 
  useSensors, 
  useClients, 
  useLatestReadings,
  useGeoLocations,
  useDeviceLatest,
  useSensorTypeStats,
  GeoLocation
} from "@/hooks/useAuroraApi";
import { useQueryClient } from "@tanstack/react-query";
import type { MapStats, AircraftMarker, SensorMarker, ClientMarker } from "@/types/map";

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
  
  if (geoLocations) {
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

export function useMapData() {
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const queryClient = useQueryClient();

  const { 
    data: aircraft, 
    isLoading: aircraftLoading, 
    dataUpdatedAt: aircraftUpdated 
  } = useAdsbAircraft();
  
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

  // Update last refresh time
  useEffect(() => {
    setLastUpdate(new Date());
  }, [aircraftUpdated, sensorsUpdated, geoUpdated]);

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["aurora"] });
  }, [queryClient]);

  // Extract GPS coordinates from latest readings
  const readingsGps = useMemo(() => {
    if (!latestReadings) return {};
    return extractGpsFromReadings(latestReadings);
  }, [latestReadings]);

  // Extract GPS from Starlink stats (avg lat/lng from 24h data)
  const starlinkGps = useMemo<{ lat: number; lng: number; altitude?: number } | null>(() => {
    if (starlinkStats?.numeric_field_stats_24h) {
      const stats = starlinkStats.numeric_field_stats_24h as Record<string, { avg?: number }>;
      const lat = stats.latitude?.avg;
      const lng = stats.longitude?.avg;
      const alt = stats.altitude?.avg;
      
      if (lat !== undefined && lng !== undefined && 
          lat >= -90 && lat <= 90 && 
          lng >= -180 && lng <= 180 &&
          !(lat === 0 && lng === 0)) {
        return { lat, lng, altitude: alt };
      }
    }
    
    // Try to get from latest reading
    if (starlinkLatest?.data) {
      const data = starlinkLatest.data as Record<string, unknown>;
      const lat = data.latitude as number;
      const lng = data.longitude as number;
      const alt = data.altitude as number;
      
      if (lat !== undefined && lng !== undefined && 
          lat >= -90 && lat <= 90 && 
          lng >= -180 && lng <= 180 &&
          !(lat === 0 && lng === 0)) {
        return { lat, lng, altitude: alt };
      }
    }
    
    return null;
  }, [starlinkStats, starlinkLatest]);

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
    
    return merged;
  }, [geoLocations, readingsGps, starlinkGps]);

  // Filter and prepare aircraft markers
  const aircraftMarkers = useMemo<AircraftMarker[]>(() => {
    const validAircraft = (aircraft || []).filter(a => 
      a.lat !== undefined && 
      a.lon !== undefined && 
      a.lat >= -90 && a.lat <= 90 &&
      a.lon >= -180 && a.lon <= 180 &&
      !(a.lat === 0 && a.lon === 0)
    );
    return validAircraft as AircraftMarker[];
  }, [aircraft]);
  
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
    if (geoLocations) {
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
        
        // Add ADS-B receivers as sensor markers
        const adsbDevices = config.adsb_devices;
        if (adsbDevices && Array.isArray(adsbDevices)) {
          adsbDevices.forEach((adsb, idx) => {
            if (adsb.enabled) {
              const id = `${client.client_id}-adsb-receiver-${idx}`;
              if (!addedIds.has(id)) {
                markers.push({
                  id,
                  name: `${client.hostname} ADS-B Receiver`,
                  type: 'adsb',
                  value: 0,
                  unit: 'aircraft',
                  status: baseStatus,
                  lastUpdate: client.last_seen,
                  location: clientGps!
                });
                addedIds.add(id);
              }
            }
          });
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

  // All marker positions for bounds fitting
  const allPositions = useMemo<LatLngExpression[]>(() => {
    const positions: LatLngExpression[] = [];
    aircraftMarkers.forEach(a => positions.push([a.lat, a.lon]));
    sensorMarkers.forEach(s => positions.push([s.location.lat, s.location.lng]));
    clientMarkers.forEach(c => positions.push([c.location.lat, c.location.lng]));
    return positions;
  }, [aircraftMarkers, sensorMarkers, clientMarkers]);

  // Calculate statistics
  const stats = useMemo<MapStats>(() => ({
    total: aircraftMarkers.length + sensorMarkers.length + clientMarkers.length,
    gps: sensorMarkers.filter(s => s.type === 'gps').length,
    adsb: aircraftMarkers.length,
    starlink: sensorMarkers.filter(s => s.type === 'starlink').length,
    clients: clientMarkers.length,
    lora: sensorMarkers.filter(s => s.type === 'lora').length,
  }), [aircraftMarkers, sensorMarkers, clientMarkers]);

  const isLoading = aircraftLoading || sensorsLoading || clientsLoading || readingsLoading || geoLoading;

  // Format time ago
  const timeAgo = useMemo(() => {
    const seconds = Math.floor((new Date().getTime() - lastUpdate.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    return `${Math.floor(seconds / 60)}m ago`;
  }, [lastUpdate]);

  return {
    aircraftMarkers,
    sensorMarkers,
    clientMarkers,
    allPositions,
    stats,
    isLoading,
    timeAgo,
    handleRefresh,
    lastUpdate,
    geoLocations, // Expose raw geo locations for debugging
  };
}
