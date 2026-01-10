import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import type { SensorMarker, AdsbMarker } from "@/types/map";

interface GpsSSEMessage {
  device_id?: string;
  client_id?: string;
  data?: {
    latitude?: number;
    longitude?: number;
    lat?: number;
    lng?: number;
    lon?: number;
    altitude?: number;
    speed?: number;
    heading?: number;
    fix_quality?: number;
  };
  timestamp?: string;
}

interface AdsbSSEMessage {
  hex?: string;
  flight?: string;
  lat?: number;
  lon?: number;
  altitude?: number;
  track?: number;
  speed?: number;
  squawk?: string;
  timestamp?: string;
  rssi?: number;
  category?: string;
}

interface SSEState {
  lastMessage: unknown | null;
  isConnected: boolean;
}

interface UseSSEMapUpdatesOptions {
  gpsSSE: SSEState;
  adsbSSE: SSEState;
  baseSensorMarkers: SensorMarker[];
  baseAdsbMarkers: AdsbMarker[];
  enabled?: boolean;
}

interface SSEUpdate {
  id: string;
  type: 'gps' | 'adsb';
  timestamp: number;
}

export function useSSEMapUpdates({
  gpsSSE,
  adsbSSE,
  baseSensorMarkers,
  baseAdsbMarkers,
  enabled = true,
}: UseSSEMapUpdatesOptions) {
  // Track real-time GPS position updates
  const [gpsUpdates, setGpsUpdates] = useState<Map<string, { lat: number; lng: number; altitude?: number; timestamp: string }>>(new Map());
  
  // Track real-time ADS-B position updates  
  const [adsbUpdates, setAdsbUpdates] = useState<Map<string, { lat: number; lng: number; altitude?: number; track?: number; speed?: number; timestamp: string }>>(new Map());
  
  // Track recent updates for visual feedback
  const [recentUpdates, setRecentUpdates] = useState<SSEUpdate[]>([]);
  
  // Last processed message refs to avoid duplicate processing
  const lastGpsMessageRef = useRef<unknown>(null);
  const lastAdsbMessageRef = useRef<unknown>(null);

  // Process GPS SSE messages
  useEffect(() => {
    if (!enabled || !gpsSSE.isConnected || !gpsSSE.lastMessage) return;
    if (gpsSSE.lastMessage === lastGpsMessageRef.current) return;
    
    lastGpsMessageRef.current = gpsSSE.lastMessage;
    
    const message = gpsSSE.lastMessage as GpsSSEMessage;
    const deviceId = message.device_id;
    const data = message.data;
    
    if (!deviceId || !data) return;
    
    // Extract coordinates from various possible formats
    let lat: number | undefined;
    let lng: number | undefined;
    
    if (typeof data.latitude === 'number' && typeof data.longitude === 'number') {
      lat = data.latitude;
      lng = data.longitude;
    } else if (typeof data.lat === 'number') {
      lat = data.lat;
      lng = data.lng ?? data.lon;
    }
    
    if (lat === undefined || lng === undefined) return;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return;
    if (lat === 0 && lng === 0) return; // Invalid default value
    
    const timestamp = message.timestamp || new Date().toISOString();
    
    setGpsUpdates(prev => {
      const next = new Map(prev);
      next.set(deviceId, {
        lat,
        lng,
        altitude: data.altitude,
        timestamp,
      });
      return next;
    });
    
    // Track for visual feedback
    setRecentUpdates(prev => {
      const update: SSEUpdate = { id: deviceId, type: 'gps', timestamp: Date.now() };
      return [...prev.filter(u => Date.now() - u.timestamp < 3000), update];
    });
    
    console.debug(`[SSE GPS] Updated ${deviceId}: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
  }, [enabled, gpsSSE.isConnected, gpsSSE.lastMessage]);

  // Process ADS-B SSE messages
  useEffect(() => {
    if (!enabled || !adsbSSE.isConnected || !adsbSSE.lastMessage) return;
    if (adsbSSE.lastMessage === lastAdsbMessageRef.current) return;
    
    lastAdsbMessageRef.current = adsbSSE.lastMessage;
    
    const message = adsbSSE.lastMessage as AdsbSSEMessage;
    const hex = message.hex;
    const lat = message.lat;
    const lon = message.lon;
    
    if (!hex || lat === undefined || lon === undefined) return;
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return;
    
    const timestamp = message.timestamp || new Date().toISOString();
    
    setAdsbUpdates(prev => {
      const next = new Map(prev);
      next.set(hex, {
        lat,
        lng: lon,
        altitude: message.altitude,
        track: message.track,
        speed: message.speed,
        timestamp,
      });
      return next;
    });
    
    // Track for visual feedback
    setRecentUpdates(prev => {
      const update: SSEUpdate = { id: hex, type: 'adsb', timestamp: Date.now() };
      return [...prev.filter(u => Date.now() - u.timestamp < 3000), update];
    });
    
    console.debug(`[SSE ADS-B] Updated ${hex}: ${lat.toFixed(5)}, ${lon.toFixed(5)}`);
  }, [enabled, adsbSSE.isConnected, adsbSSE.lastMessage]);

  // Clean up old recent updates
  useEffect(() => {
    const interval = setInterval(() => {
      setRecentUpdates(prev => prev.filter(u => Date.now() - u.timestamp < 3000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Merge SSE updates with base sensor markers
  const mergedSensorMarkers = useMemo<SensorMarker[]>(() => {
    if (!enabled || gpsUpdates.size === 0) return baseSensorMarkers;
    
    return baseSensorMarkers.map(marker => {
      // Check if we have a GPS update for this marker
      const update = gpsUpdates.get(marker.id);
      if (!update) return marker;
      
      // Return marker with updated location
      return {
        ...marker,
        location: {
          lat: update.lat,
          lng: update.lng,
        },
        lastUpdate: update.timestamp,
      };
    });
  }, [baseSensorMarkers, gpsUpdates, enabled]);

  // Merge SSE updates with base ADS-B markers
  const mergedAdsbMarkers = useMemo<AdsbMarker[]>(() => {
    if (!enabled || adsbUpdates.size === 0) return baseAdsbMarkers;
    
    const updatedMarkers = baseAdsbMarkers.map(marker => {
      // Check if we have an ADS-B update for this marker
      const update = adsbUpdates.get(marker.hex);
      if (!update) return marker;
      
      // Return marker with updated position
      // AdsbMarker extends SensorMarker, so 'value' is the altitude field
      return {
        ...marker,
        location: {
          lat: update.lat,
          lng: update.lng,
        },
        value: update.altitude ?? marker.value,
        track: update.track ?? marker.track,
        speed: update.speed ?? marker.speed,
        lastUpdate: update.timestamp,
        status: 'active' as const,
      };
    });
    
    // Also add new aircraft that weren't in the base markers
    const existingHexes = new Set(baseAdsbMarkers.map(m => m.hex));
    adsbUpdates.forEach((update, hex) => {
      if (!existingHexes.has(hex)) {
        updatedMarkers.push({
          id: `adsb-sse-${hex}`,
          name: hex, // Use hex as name for SSE-only aircraft
          type: 'adsb',
          value: update.altitude ?? 0,
          unit: 'ft',
          status: 'active',
          lastUpdate: update.timestamp,
          hex,
          location: { lat: update.lat, lng: update.lng },
          track: update.track,
          speed: update.speed,
        });
      }
    });
    
    return updatedMarkers;
  }, [baseAdsbMarkers, adsbUpdates, enabled]);

  // Get IDs of recently updated markers for visual feedback
  const recentlyUpdatedIds = useMemo(() => {
    return new Set(recentUpdates.map(u => u.id));
  }, [recentUpdates]);

  // Clear all SSE updates (useful when switching clients)
  const clearUpdates = useCallback(() => {
    setGpsUpdates(new Map());
    setAdsbUpdates(new Map());
    setRecentUpdates([]);
    lastGpsMessageRef.current = null;
    lastAdsbMessageRef.current = null;
  }, []);

  return {
    sensorMarkers: mergedSensorMarkers,
    adsbMarkers: mergedAdsbMarkers,
    recentlyUpdatedIds,
    gpsUpdateCount: gpsUpdates.size,
    adsbUpdateCount: adsbUpdates.size,
    clearUpdates,
  };
}
