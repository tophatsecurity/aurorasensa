import { useState, useEffect, useCallback, useRef } from "react";
import type { SensorMarker, ClientMarker } from "@/types/map";

interface GpsPoint {
  lat: number;
  lng: number;
  timestamp: number;
}

interface EntityHistory {
  id: string;
  type: 'sensor' | 'client';
  name: string;
  points: GpsPoint[];
}

interface GpsHistoryConfig {
  sensorRetentionMinutes: number;
  clientRetentionMinutes: number;
  maxPointsPerEntity: number;
}

const DEFAULT_CONFIG: GpsHistoryConfig = {
  sensorRetentionMinutes: 60,
  clientRetentionMinutes: 60,
  maxPointsPerEntity: 500,
};

export function useGpsHistory(
  sensors: SensorMarker[],
  clients: ClientMarker[],
  config: Partial<GpsHistoryConfig> = {}
) {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const [history, setHistory] = useState<Map<string, EntityHistory>>(new Map());
  const lastUpdateRef = useRef<number>(0);
  
  // Clean old points based on retention time per type
  const cleanOldPoints = useCallback((historyMap: Map<string, EntityHistory>) => {
    const sensorCutoff = Date.now() - (mergedConfig.sensorRetentionMinutes * 60 * 1000);
    const clientCutoff = Date.now() - (mergedConfig.clientRetentionMinutes * 60 * 1000);
    const newMap = new Map<string, EntityHistory>();
    
    historyMap.forEach((entity, id) => {
      const cutoffTime = entity.type === 'sensor' ? sensorCutoff : clientCutoff;
      const filteredPoints = entity.points.filter(p => p.timestamp >= cutoffTime);
      if (filteredPoints.length > 0) {
        newMap.set(id, { ...entity, points: filteredPoints });
      }
    });
    
    return newMap;
  }, [mergedConfig.sensorRetentionMinutes, mergedConfig.clientRetentionMinutes]);

  // Add new GPS points to history
  const updateHistory = useCallback(() => {
    const now = Date.now();
    
    // Throttle updates to max once per second
    if (now - lastUpdateRef.current < 1000) return;
    lastUpdateRef.current = now;
    
    setHistory(prev => {
      const newHistory = cleanOldPoints(new Map(prev));
      
      // Add sensor points
      sensors.forEach(sensor => {
        const id = `sensor-${sensor.id}`;
        const existing = newHistory.get(id);
        const newPoint: GpsPoint = { lat: sensor.location.lat, lng: sensor.location.lng, timestamp: now };
        
        if (existing && existing.points.length > 0) {
          const lastPoint = existing.points[existing.points.length - 1];
          if (lastPoint.lat === newPoint.lat && lastPoint.lng === newPoint.lng) {
            // Position unchanged, skip adding duplicate point
          } else {
            const points = [...existing.points, newPoint].slice(-mergedConfig.maxPointsPerEntity);
            newHistory.set(id, { ...existing, points });
          }
        } else if (existing) {
          const points = [...existing.points, newPoint].slice(-mergedConfig.maxPointsPerEntity);
          newHistory.set(id, { ...existing, points });
        } else {
          newHistory.set(id, {
            id,
            type: 'sensor',
            name: sensor.name,
            points: [newPoint],
          });
        }
      });
      
      // Add client points
      clients.forEach(client => {
        const id = `client-${client.client_id}`;
        const existing = newHistory.get(id);
        const newPoint: GpsPoint = { lat: client.location.lat, lng: client.location.lng, timestamp: now };
        
        if (existing && existing.points.length > 0) {
          const lastPoint = existing.points[existing.points.length - 1];
          if (lastPoint.lat === newPoint.lat && lastPoint.lng === newPoint.lng) {
            // Position unchanged, skip adding duplicate point
          } else {
            const points = [...existing.points, newPoint].slice(-mergedConfig.maxPointsPerEntity);
            newHistory.set(id, { ...existing, points });
          }
        } else if (existing) {
          const points = [...existing.points, newPoint].slice(-mergedConfig.maxPointsPerEntity);
          newHistory.set(id, { ...existing, points });
        } else {
          newHistory.set(id, {
            id,
            type: 'client',
            name: client.hostname,
            points: [newPoint],
          });
        }
      });
      
      return newHistory;
    });
  }, [sensors, clients, cleanOldPoints, mergedConfig.maxPointsPerEntity]);

  // Update history when data changes
  useEffect(() => {
    updateHistory();
  }, [updateHistory]);

  // Periodic cleanup
  useEffect(() => {
    const interval = setInterval(() => {
      setHistory(prev => cleanOldPoints(prev));
    }, 60000); // Clean every minute
    
    return () => clearInterval(interval);
  }, [cleanOldPoints]);

  // Get all trails as arrays suitable for Leaflet polylines
  const getTrails = useCallback(() => {
    const trails: Array<{
      id: string;
      type: 'sensor' | 'client';
      name: string;
      coordinates: Array<[number, number]>;
    }> = [];
    
    history.forEach(entity => {
      if (entity.points.length >= 2) {
        trails.push({
          id: entity.id,
          type: entity.type,
          name: entity.name,
          coordinates: entity.points.map(p => [p.lat, p.lng] as [number, number]),
        });
      }
    });
    
    return trails;
  }, [history]);

  const clearHistory = useCallback(() => {
    setHistory(new Map());
  }, []);

  return {
    history,
    trails: getTrails(),
    clearHistory,
    config: mergedConfig,
  };
}

export type { GpsPoint, EntityHistory, GpsHistoryConfig };
