import { useMemo, useState, useEffect, useCallback } from "react";
import { LatLngExpression } from "leaflet";
import { useAdsbAircraft, useSensors, useClients } from "@/hooks/useAuroraApi";
import { useQueryClient } from "@tanstack/react-query";
import type { MapStats, AircraftMarker, SensorMarker, ClientMarker } from "@/types/map";

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

  // Update last refresh time
  useEffect(() => {
    setLastUpdate(new Date());
  }, [aircraftUpdated, sensorsUpdated]);

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["aurora"] });
  }, [queryClient]);

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
        
        const hash = client.client_id.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
        const baseStatus = client.status || 'active';
        
        // Check for GPS-enabled client and create marker
        const gps = config.gps;
        if (gps?.enabled) {
          const gpsLat = typeof (gps as Record<string, unknown>).lat === 'number' ? (gps as Record<string, unknown>).lat as number : null;
          const gpsLng = typeof (gps as Record<string, unknown>).lng === 'number' ? (gps as Record<string, unknown>).lng as number : null;
          const lat = gpsLat ?? (40.7128 + (hash % 100) * 0.001);
          const lng = gpsLng ?? (-74.006 + ((hash * 7) % 100) * 0.001);
          
          markers.push({
            id: `${client.client_id}-gps`,
            name: `${client.hostname} GPS`,
            type: 'gps',
            value: 0,
            unit: '',
            status: baseStatus,
            lastUpdate: client.last_seen,
            location: { lat, lng }
          });
        }
        
        // Add LoRa sensors
        const lora = config.lora;
        if (lora?.enabled) {
          markers.push({
            id: `${client.client_id}-lora`,
            name: `${client.hostname} LoRa`,
            type: 'lora',
            value: 0,
            unit: 'dBm',
            status: baseStatus,
            lastUpdate: client.last_seen,
            location: { 
              lat: 40.7128 + (hash % 100) * 0.0015,
              lng: -74.006 + ((hash * 3) % 100) * 0.0015
            }
          });
        }
        
        // Add Starlink sensors
        const starlink = config.starlink;
        if (starlink?.enabled) {
          markers.push({
            id: `${client.client_id}-starlink`,
            name: `${client.hostname} Starlink`,
            type: 'starlink',
            value: 0,
            unit: 'Mbps',
            status: baseStatus,
            lastUpdate: client.last_seen,
            location: { 
              lat: 40.7128 + (hash % 100) * 0.002,
              lng: -74.006 + ((hash * 5) % 100) * 0.002
            }
          });
        }
        
        // Add ADS-B receivers as sensor markers
        const adsbDevices = config.adsb_devices;
        if (adsbDevices && Array.isArray(adsbDevices)) {
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
                location: { 
                  lat: 40.7128 + (hash % 100) * 0.0018,
                  lng: -74.006 + ((hash * 4) % 100) * 0.0018
                }
              });
            }
          });
        }
        
        // Add WiFi sensors
        const wifi = config.wifi;
        if (wifi?.enabled) {
          markers.push({
            id: `${client.client_id}-wifi`,
            name: `${client.hostname} WiFi`,
            type: 'client',
            value: 0,
            unit: 'devices',
            status: baseStatus,
            lastUpdate: client.last_seen,
            location: { 
              lat: 40.7128 + (hash % 100) * 0.0012,
              lng: -74.006 + ((hash * 6) % 100) * 0.0012
            }
          });
        }
        
        // Add Bluetooth sensors
        const bluetooth = config.bluetooth;
        if (bluetooth?.enabled) {
          markers.push({
            id: `${client.client_id}-bluetooth`,
            name: `${client.hostname} Bluetooth`,
            type: 'client',
            value: 0,
            unit: 'devices',
            status: baseStatus,
            lastUpdate: client.last_seen,
            location: { 
              lat: 40.7128 + (hash % 100) * 0.0014,
              lng: -74.006 + ((hash * 8) % 100) * 0.0014
            }
          });
        }
        
        // Add Thermal Probe sensors
        const thermal = config.thermal_probe;
        if (thermal?.enabled) {
          markers.push({
            id: `${client.client_id}-thermal`,
            name: `${client.hostname} Thermal`,
            type: 'gps',
            value: 0,
            unit: '°C',
            status: baseStatus,
            lastUpdate: client.last_seen,
            location: { 
              lat: 40.7128 + (hash % 100) * 0.0016,
              lng: -74.006 + ((hash * 9) % 100) * 0.0016
            }
          });
        }
      });
    }
    
    return markers;
  }, [sensors, clients]);

  // Get client markers for the clients filter
  const clientMarkers = useMemo<ClientMarker[]>(() => {
    if (!clients) return [];
    return clients.map(c => {
      const hash = c.client_id.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
      return {
        client_id: c.client_id,
        hostname: c.hostname,
        location: { 
          lat: 40.7128 + (hash % 100) * 0.001, 
          lng: -74.006 + ((hash * 7) % 100) * 0.001 
        }
      };
    });
  }, [clients]);

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

  const isLoading = aircraftLoading || sensorsLoading || clientsLoading;

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
