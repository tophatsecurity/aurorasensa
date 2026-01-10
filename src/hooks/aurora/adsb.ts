// Aurora API - ADS-B Hooks
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { callAuroraApi, hasAuroraSession, fastQueryOptions, defaultQueryOptions } from "./core";
import type { 
  AdsbAircraft, 
  AdsbStats, 
  AdsbEmergency, 
  AdsbCoverage, 
  AdsbDevice,
  AdsbHistoricalResponse,
} from "./types";

// =============================================
// QUERY HOOKS
// =============================================

export function useAdsbAircraft() {
  return useQuery({
    queryKey: ["aurora", "adsb", "aircraft"],
    queryFn: () => callAuroraApi<AdsbAircraft[]>("/api/adsb/aircraft"),
    enabled: hasAuroraSession(),
    ...fastQueryOptions,
  });
}

export function useAdsbAircraftByIcao(icao: string) {
  return useQuery({
    queryKey: ["aurora", "adsb", "aircraft", icao],
    queryFn: () => callAuroraApi<AdsbAircraft>(`/api/adsb/aircraft/${icao}`),
    enabled: hasAuroraSession() && !!icao,
    retry: 2,
  });
}

export function useAdsbStats() {
  return useQuery({
    queryKey: ["aurora", "adsb", "stats"],
    queryFn: () => callAuroraApi<AdsbStats>("/api/adsb/stats"),
    enabled: hasAuroraSession(),
    ...defaultQueryOptions,
  });
}

export function useAdsbEmergencies() {
  return useQuery({
    queryKey: ["aurora", "adsb", "emergencies"],
    queryFn: () => callAuroraApi<AdsbEmergency[]>("/api/adsb/emergencies"),
    enabled: hasAuroraSession(),
    ...fastQueryOptions,
  });
}

export function useAdsbNearby(lat?: number, lon?: number, radiusKm: number = 50) {
  return useQuery({
    queryKey: ["aurora", "adsb", "nearby", lat, lon, radiusKm],
    queryFn: () => callAuroraApi<AdsbAircraft[]>(`/api/adsb/nearby?lat=${lat}&lon=${lon}&radius_km=${radiusKm}`),
    enabled: hasAuroraSession() && lat !== undefined && lon !== undefined,
    ...fastQueryOptions,
  });
}

export function useAdsbLowAltitude() {
  return useQuery({
    queryKey: ["aurora", "adsb", "low-altitude"],
    queryFn: () => callAuroraApi<AdsbAircraft[]>("/api/adsb/low-altitude"),
    enabled: hasAuroraSession(),
    ...fastQueryOptions,
  });
}

export function useAdsbCoverage(deviceId?: string) {
  const { data: devices } = useAdsbDevices();
  const effectiveDeviceId = deviceId || devices?.[0]?.device_id;
  
  return useQuery({
    queryKey: ["aurora", "adsb", "coverage", effectiveDeviceId],
    queryFn: () => callAuroraApi<AdsbCoverage>(`/api/adsb/coverage?device_id=${effectiveDeviceId}`),
    enabled: hasAuroraSession() && !!effectiveDeviceId,
    ...defaultQueryOptions,
  });
}

export function useAdsbAircraftHistory(icao: string) {
  return useQuery({
    queryKey: ["aurora", "adsb", "history", icao],
    queryFn: () => callAuroraApi<Array<{ lat: number; lon: number; alt: number; timestamp: string }>>(`/api/adsb/history/${icao}`),
    enabled: hasAuroraSession() && !!icao,
    retry: 2,
  });
}

export function useAdsbDevices() {
  return useQuery({
    queryKey: ["aurora", "adsb", "devices"],
    queryFn: () => callAuroraApi<AdsbDevice[]>("/api/adsb/devices"),
    enabled: hasAuroraSession(),
    ...defaultQueryOptions,
  });
}

// Historical ADSB readings from sensor data (fallback when live is empty)
export function useAdsbHistorical(minutes: number = 60) {
  return useQuery({
    queryKey: ["aurora", "adsb", "historical", minutes],
    queryFn: async () => {
      const response = await callAuroraApi<AdsbHistoricalResponse>(
        `/api/readings/sensor/adsb?hours=${Math.ceil(minutes / 60)}`
      );
      return response;
    },
    enabled: hasAuroraSession(),
    ...fastQueryOptions,
  });
}

// Combined hook that uses live data or falls back to historical
export function useAdsbAircraftWithHistory(historyMinutes: number = 60) {
  const liveQuery = useAdsbAircraft();
  const historicalQuery = useAdsbHistorical(historyMinutes);
  
  const combinedData = useMemo(() => {
    // If we have live aircraft data, use it
    if (liveQuery.data && liveQuery.data.length > 0) {
      return {
        aircraft: liveQuery.data,
        isHistorical: false,
        source: 'live' as const,
      };
    }
    
    // Otherwise, try to use historical data
    if (historicalQuery.data?.readings && historicalQuery.data.readings.length > 0) {
      const aircraftMap = new Map<string, AdsbAircraft>();
      
      historicalQuery.data.readings.forEach(reading => {
        const data = reading.data;
        const aircraftList = (data as { aircraft_list?: Array<Record<string, unknown>> }).aircraft_list;
        
        if (aircraftList && Array.isArray(aircraftList)) {
          aircraftList.forEach(ac => {
            const hex = String(ac.icao || ac.hex || '');
            if (!hex) return;
            
            const existing = aircraftMap.get(hex);
            if (!existing) {
              aircraftMap.set(hex, {
                hex,
                flight: ac.callsign as string || ac.flight as string,
                alt_baro: ac.altitude_ft as number || ac.alt_baro as number,
                alt_geom: ac.alt_geom as number,
                gs: ac.groundspeed_knots as number || ac.gs as number,
                track: ac.track as number,
                lat: ac.latitude as number || ac.lat as number,
                lon: ac.longitude as number || ac.lon as number,
                squawk: ac.squawk as string,
                category: ac.category as string,
                rssi: ac.rssi as number,
                seen: ac.last_seen ? Math.floor((Date.now() - new Date(ac.last_seen as string).getTime()) / 1000) : 0,
              });
            }
          });
        } else {
          const key = data.hex || data.flight || reading.device_id;
          
          if (key && data.lat !== undefined && data.lon !== undefined) {
            const existing = aircraftMap.get(key);
            const readingTime = new Date(reading.timestamp).getTime();
            const existingTime = existing ? new Date(existing.seen ? Date.now() - existing.seen * 1000 : 0).getTime() : 0;
            
            if (!existing || readingTime > existingTime) {
              aircraftMap.set(key, {
                hex: data.hex || key,
                flight: data.flight,
                alt_baro: data.alt_baro,
                alt_geom: data.alt_geom,
                gs: data.gs,
                track: data.track,
                lat: data.lat,
                lon: data.lon,
                squawk: data.squawk,
                category: data.category,
                rssi: data.rssi,
                seen: Math.floor((Date.now() - new Date(reading.timestamp).getTime()) / 1000),
              });
            }
          }
        }
      });
      
      return {
        aircraft: Array.from(aircraftMap.values()),
        isHistorical: true,
        source: 'historical' as const,
      };
    }
    
    return {
      aircraft: [],
      isHistorical: false,
      source: 'none' as const,
    };
  }, [liveQuery.data, historicalQuery.data]);
  
  return {
    ...combinedData,
    isLoading: liveQuery.isLoading || historicalQuery.isLoading,
    isError: liveQuery.isError && historicalQuery.isError,
    dataUpdatedAt: liveQuery.dataUpdatedAt || historicalQuery.dataUpdatedAt,
    refetch: () => {
      liveQuery.refetch();
      historicalQuery.refetch();
    },
  };
}
