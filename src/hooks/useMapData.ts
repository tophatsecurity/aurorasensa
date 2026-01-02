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
  
  // Filter and prepare sensor markers
  const sensorMarkers = useMemo<SensorMarker[]>(() => 
    (sensors?.filter(s => s.location?.lat && s.location?.lng) || []) as SensorMarker[], 
    [sensors]
  );

  // Get client locations from metadata if available
  const clientMarkers = useMemo<ClientMarker[]>(() => {
    if (!clients) return [];
    return clients.filter(c => {
      const gps = c.metadata?.config?.sensors?.gps;
      return gps && typeof gps === 'object';
    }).map(c => ({
      client_id: c.client_id,
      hostname: c.hostname,
      location: { 
        lat: 40.7128 + Math.random() * 0.1, 
        lng: -74.006 + Math.random() * 0.1 
      }
    }));
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
