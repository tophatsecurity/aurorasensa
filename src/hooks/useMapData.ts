import { useMemo, useState, useEffect, useCallback } from "react";
import { LatLngExpression } from "leaflet";
import { useAdsbAircraft, useSensors, useClients, useLatestReadings } from "@/hooks/useAuroraApi";
import { useQueryClient } from "@tanstack/react-query";
import type { MapStats, AircraftMarker, SensorMarker, ClientMarker } from "@/types/map";

// Helper to extract GPS coordinates from various data sources
function extractGpsFromReadings(readings: Array<{ device_id: string; device_type: string; data: Record<string, unknown> }>) {
  const gpsData: Record<string, { lat: number; lng: number }> = {};
  
  readings.forEach(reading => {
    const data = reading.data;
    
    // Check for GPS coordinates in the data
    let lat: number | null = null;
    let lng: number | null = null;
    
    // Try various GPS coordinate field names
    if (typeof data.latitude === 'number' && typeof data.longitude === 'number') {
      lat = data.latitude;
      lng = data.longitude;
    } else if (typeof data.lat === 'number' && typeof data.lon === 'number') {
      lat = data.lat;
      lng = data.lon;
    } else if (typeof data.lat === 'number' && typeof data.lng === 'number') {
      lat = data.lat;
      lng = data.lng;
    } else if (typeof data.gps_lat === 'number' && typeof data.gps_lon === 'number') {
      lat = data.gps_lat;
      lng = data.gps_lon;
    } else if (typeof data.gps_latitude === 'number' && typeof data.gps_longitude === 'number') {
      lat = data.gps_latitude;
      lng = data.gps_longitude;
    } else if (data.location && typeof data.location === 'object') {
      const loc = data.location as Record<string, unknown>;
      if (typeof loc.lat === 'number' && typeof loc.lng === 'number') {
        lat = loc.lat;
        lng = loc.lng;
      } else if (typeof loc.latitude === 'number' && typeof loc.longitude === 'number') {
        lat = loc.latitude;
        lng = loc.longitude;
      }
    } else if (data.position && typeof data.position === 'object') {
      const pos = data.position as Record<string, unknown>;
      if (typeof pos.lat === 'number' && typeof pos.lng === 'number') {
        lat = pos.lat;
        lng = pos.lng;
      } else if (typeof pos.latitude === 'number' && typeof pos.longitude === 'number') {
        lat = pos.latitude;
        lng = pos.longitude;
      }
    }
    
    // Validate coordinates are within valid ranges
    if (lat !== null && lng !== null && 
        lat >= -90 && lat <= 90 && 
        lng >= -180 && lng <= 180 &&
        !(lat === 0 && lng === 0)) { // Exclude 0,0 as it's often a default/invalid value
      gpsData[reading.device_id] = { lat, lng };
    }
  });
  
  return gpsData;
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

  // Update last refresh time
  useEffect(() => {
    setLastUpdate(new Date());
  }, [aircraftUpdated, sensorsUpdated]);

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["aurora"] });
  }, [queryClient]);

  // Extract GPS coordinates from latest readings
  const gpsCoordinates = useMemo(() => {
    if (!latestReadings) return {};
    return extractGpsFromReadings(latestReadings);
  }, [latestReadings]);

  // Filter and prepare aircraft markers
  const aircraftMarkers = useMemo<AircraftMarker[]>(() => 
    (aircraft?.filter(a => a.lat && a.lon) || []) as AircraftMarker[], 
    [aircraft]
  );
  
  // Build sensor markers from sensors API and clients with GPS
  const sensorMarkers = useMemo<SensorMarker[]>(() => {
    const markers: SensorMarker[] = [];
    
    // Add sensors that have location data
    if (sensors) {
      sensors.forEach(s => {
        if (s.location?.lat && s.location?.lng) {
          markers.push(s as SensorMarker);
        }
      });
    }
    
    // Add clients as sensors based on their enabled sensor types
    if (clients) {
      clients.forEach(client => {
        const config = client.metadata?.config?.sensors;
        if (!config) return;
        
        const baseStatus = client.status || 'active';
        
        // Try to get GPS coordinates from readings for this client's sensors
        const clientSensors = client.sensors || [];
        let clientGps: { lat: number; lng: number } | null = null;
        
        // Look for GPS coordinates in any of the client's sensor readings
        for (const sensorId of clientSensors) {
          if (gpsCoordinates[sensorId]) {
            clientGps = gpsCoordinates[sensorId];
            break;
          }
        }
        
        // Also check for starlink GPS data which often includes location
        const starlinkId = clientSensors.find(s => s.includes('starlink'));
        if (!clientGps && starlinkId && gpsCoordinates[starlinkId]) {
          clientGps = gpsCoordinates[starlinkId];
        }
        
        // If no GPS found from readings, skip adding map markers for this client
        // (we don't want to show fake coordinates)
        if (!clientGps) {
          console.log(`No GPS coordinates found for client ${client.hostname}`);
          return;
        }
        
        // Check for GPS-enabled client and create marker
        const gps = config.gps;
        if (gps?.enabled && clientGps) {
          markers.push({
            id: `${client.client_id}-gps`,
            name: `${client.hostname} GPS`,
            type: 'gps',
            value: 0,
            unit: '',
            status: baseStatus,
            lastUpdate: client.last_seen,
            location: clientGps
          });
        }
        
        // Add LoRa sensors with actual GPS
        const lora = config.lora;
        if (lora?.enabled && clientGps) {
          markers.push({
            id: `${client.client_id}-lora`,
            name: `${client.hostname} LoRa`,
            type: 'lora',
            value: 0,
            unit: 'dBm',
            status: baseStatus,
            lastUpdate: client.last_seen,
            location: clientGps
          });
        }
        
        // Add Starlink sensors with actual GPS
        const starlink = config.starlink;
        if (starlink?.enabled && clientGps) {
          markers.push({
            id: `${client.client_id}-starlink`,
            name: `${client.hostname} Starlink`,
            type: 'starlink',
            value: 0,
            unit: 'Mbps',
            status: baseStatus,
            lastUpdate: client.last_seen,
            location: clientGps
          });
        }
        
        // Add ADS-B receivers as sensor markers
        const adsbDevices = config.adsb_devices;
        if (adsbDevices && Array.isArray(adsbDevices) && clientGps) {
          adsbDevices.forEach((adsb, idx) => {
            if (adsb.enabled) {
              markers.push({
                id: `${client.client_id}-adsb-receiver-${idx}`,
                name: `${client.hostname} ADS-B Receiver`,
                type: 'adsb',
                value: 0,
                unit: 'aircraft',
                status: baseStatus,
                lastUpdate: client.last_seen,
                location: clientGps!
              });
            }
          });
        }
        
        // Add WiFi sensors
        const wifi = config.wifi;
        if (wifi?.enabled && clientGps) {
          markers.push({
            id: `${client.client_id}-wifi`,
            name: `${client.hostname} WiFi`,
            type: 'client',
            value: 0,
            unit: 'devices',
            status: baseStatus,
            lastUpdate: client.last_seen,
            location: clientGps
          });
        }
        
        // Add Bluetooth sensors
        const bluetooth = config.bluetooth;
        if (bluetooth?.enabled && clientGps) {
          markers.push({
            id: `${client.client_id}-bluetooth`,
            name: `${client.hostname} Bluetooth`,
            type: 'client',
            value: 0,
            unit: 'devices',
            status: baseStatus,
            lastUpdate: client.last_seen,
            location: clientGps
          });
        }
        
        // Add Thermal Probe sensors
        const thermal = config.thermal_probe;
        if (thermal?.enabled && clientGps) {
          markers.push({
            id: `${client.client_id}-thermal`,
            name: `${client.hostname} Thermal`,
            type: 'gps',
            value: 0,
            unit: '°C',
            status: baseStatus,
            lastUpdate: client.last_seen,
            location: clientGps
          });
        }
      });
    }
    
    return markers;
  }, [sensors, clients, gpsCoordinates]);

  // Get client markers for the clients filter
  const clientMarkers = useMemo<ClientMarker[]>(() => {
    if (!clients) return [];
    
    return clients
      .map(c => {
        // Try to find GPS coordinates for this client from readings
        const clientSensors = c.sensors || [];
        let clientGps: { lat: number; lng: number } | null = null;
        
        for (const sensorId of clientSensors) {
          if (gpsCoordinates[sensorId]) {
            clientGps = gpsCoordinates[sensorId];
            break;
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
    return positions;
  }, [aircraftMarkers, sensorMarkers]);

  // Calculate statistics
  const stats = useMemo<MapStats>(() => ({
    total: aircraftMarkers.length + sensorMarkers.length + clientMarkers.length,
    gps: sensorMarkers.filter(s => s.type === 'gps').length,
    adsb: aircraftMarkers.length,
    starlink: sensorMarkers.filter(s => s.type === 'starlink').length,
    clients: clientMarkers.length,
    lora: sensorMarkers.filter(s => s.type === 'lora').length,
  }), [aircraftMarkers, sensorMarkers, clientMarkers]);

  const isLoading = aircraftLoading || sensorsLoading || clientsLoading || readingsLoading;

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
  };
}
