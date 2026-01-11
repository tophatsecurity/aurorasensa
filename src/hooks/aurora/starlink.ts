// Aurora API - Starlink Hooks
// NOTE: Many Starlink-specific endpoints (power, connectivity, performance, devices)
// are NOT implemented on the Aurora server. Only /api/readings/sensor/starlink exists.
// Disabled hooks will return empty/null data gracefully.

import { useQuery } from "@tanstack/react-query";
import { callAuroraApi, hasAuroraSession, fastQueryOptions, defaultQueryOptions } from "./core";
import type { 
  StarlinkDevice,
  StarlinkDeviceStats,
  StarlinkStats,
  StarlinkSignalStrength,
  StarlinkPerformance,
  StarlinkPower,
  StarlinkConnectivity,
  StarlinkTimeseriesResponse,
  StarlinkTimeseriesPoint,
  StarlinkReadingsResponse,
  LatestReading,
} from "./types";

// Flag to enable/disable Starlink-specific endpoints that don't exist on Aurora
// Only /api/readings/sensor/starlink and /api/stats/sensors/starlink work
const STARLINK_EXTENDED_API_ENABLED = false;

// =============================================
// QUERY HOOKS
// =============================================

export function useStarlinkDevices() {
  return useQuery({
    queryKey: ["aurora", "starlink", "devices"],
    queryFn: async () => {
      // These endpoints don't exist on Aurora - return empty array
      return [];
    },
    enabled: STARLINK_EXTENDED_API_ENABLED && hasAuroraSession(),
    ...fastQueryOptions,
  });
}

export function useStarlinkDevice(deviceId: string) {
  return useQuery({
    queryKey: ["aurora", "starlink", "devices", deviceId],
    queryFn: () => callAuroraApi<{ device_id: string; status?: string; last_seen?: string }>(`/api/starlink/devices/${deviceId}`),
    enabled: STARLINK_EXTENDED_API_ENABLED && hasAuroraSession() && !!deviceId,
    retry: 2,
  });
}

export function useStarlinkStats() {
  return useQuery({
    queryKey: ["aurora", "starlink", "stats"],
    queryFn: () => callAuroraApi<StarlinkStats>("/api/starlink/stats"),
    enabled: STARLINK_EXTENDED_API_ENABLED && hasAuroraSession(),
    staleTime: 15000,
    refetchInterval: 30000,
    retry: 2,
  });
}

export function useStarlinkGlobalStats() {
  return useQuery({
    queryKey: ["aurora", "starlink", "stats", "global"],
    queryFn: () => callAuroraApi<StarlinkStats>("/api/starlink/stats/global"),
    enabled: STARLINK_EXTENDED_API_ENABLED && hasAuroraSession(),
    ...defaultQueryOptions,
  });
}

export function useStarlinkDeviceStatsById(deviceId: string) {
  return useQuery({
    queryKey: ["aurora", "starlink", "stats", "device", deviceId],
    queryFn: () => callAuroraApi<Record<string, unknown>>(`/api/starlink/stats/device/${deviceId}`),
    enabled: STARLINK_EXTENDED_API_ENABLED && hasAuroraSession() && !!deviceId,
    retry: 2,
  });
}

export function useStarlinkSignalStrength() {
  return useQuery({
    queryKey: ["aurora", "starlink", "signal-strength"],
    queryFn: () => callAuroraApi<StarlinkSignalStrength>("/api/starlink/signal-strength"),
    enabled: STARLINK_EXTENDED_API_ENABLED && hasAuroraSession(),
    staleTime: 15000,
    refetchInterval: 30000,
    retry: 2,
  });
}

export function useStarlinkPerformance() {
  return useQuery({
    queryKey: ["aurora", "starlink", "performance"],
    queryFn: () => callAuroraApi<StarlinkPerformance>("/api/starlink/performance"),
    enabled: STARLINK_EXTENDED_API_ENABLED && hasAuroraSession(),
    staleTime: 15000,
    refetchInterval: 30000,
    retry: 2,
  });
}

export function useStarlinkPower() {
  return useQuery({
    queryKey: ["aurora", "starlink", "power"],
    queryFn: () => callAuroraApi<StarlinkPower>("/api/starlink/power"),
    enabled: STARLINK_EXTENDED_API_ENABLED && hasAuroraSession(),
    staleTime: 15000,
    refetchInterval: 30000,
    retry: 2,
  });
}

export function useStarlinkConnectivity() {
  return useQuery({
    queryKey: ["aurora", "starlink", "connectivity"],
    queryFn: () => callAuroraApi<StarlinkConnectivity>("/api/starlink/connectivity"),
    enabled: STARLINK_EXTENDED_API_ENABLED && hasAuroraSession(),
    staleTime: 15000,
    refetchInterval: 30000,
    retry: 2,
  });
}

export function useStarlinkDeviceStats(deviceId: string | null) {
  return useQuery({
    queryKey: ["aurora", "starlink", "device", deviceId, "stats"],
    queryFn: async () => {
      if (!deviceId) return null;
      try {
        const response = await callAuroraApi<StarlinkDeviceStats>(`/api/stats/devices/${deviceId}`);
        return response;
      } catch (error) {
        console.warn(`Failed to fetch stats for device ${deviceId}:`, error);
        return null;
      }
    },
    enabled: hasAuroraSession() && !!deviceId,
    staleTime: 15000,
    refetchInterval: 30000,
    retry: 2,
  });
}

export function useStarlinkDeviceTimeseries(deviceId: string | null, hours: number = 24) {
  return useQuery({
    queryKey: ["aurora", "starlink", "device", deviceId, "timeseries", hours],
    queryFn: async () => {
      if (!deviceId) return { count: 0, readings: [] };
      try {
        const response = await callAuroraApi<StarlinkTimeseriesResponse>(`/api/readings/sensor/starlink?device_id=${deviceId}&hours=${hours}`);
        return response;
      } catch {
        try {
          const latest = await callAuroraApi<LatestReading>(`/api/devices/${deviceId}/latest`);
          if (latest?.data) {
            return {
              count: 1,
              readings: [{
                timestamp: latest.timestamp,
                ...latest.data as Record<string, unknown>
              }] as StarlinkTimeseriesPoint[]
            };
          }
          return { count: 0, readings: [] };
        } catch (error) {
          console.warn(`Failed to fetch timeseries for device ${deviceId}:`, error);
          return { count: 0, readings: [] };
        }
      }
    },
    enabled: hasAuroraSession() && !!deviceId,
    ...fastQueryOptions,
    retry: 1,
  });
}

export function useStarlinkReadings(hours: number = 24) {
  return useQuery({
    queryKey: ["aurora", "starlink", "readings", hours],
    queryFn: async () => {
      try {
        const response = await callAuroraApi<StarlinkReadingsResponse>(`/api/stats/sensors/starlink`);
        return response;
      } catch (error) {
        console.warn("Failed to fetch starlink readings:", error);
        return null;
      }
    },
    enabled: hasAuroraSession(),
    staleTime: 15000,
    refetchInterval: 30000,
    retry: 1,
  });
}

export function useStarlinkTimeseries(hours: number = 24, clientId?: string, deviceId?: string) {
  return useQuery({
    queryKey: ["aurora", "starlink", "timeseries", hours, clientId, deviceId],
    queryFn: async () => {
      try {
        interface RawReading {
          timestamp: string;
          device_id?: string;
          device_type?: string;
          client_id?: string;
          data?: {
            starlink?: {
              downlink_throughput_bps?: number;
              uplink_throughput_bps?: number;
              obstruction_percent?: number;
              pop_ping_latency_ms?: number;
              snr?: number;
              signal_strength?: number;
              uptime_seconds?: number;
              power_watts?: number;
              ping_latency?: {
                'Mean RTT, drop == 0'?: number;
                'Mean RTT, drop < 1'?: number;
              };
            };
            power_w?: number;
            power_watts?: number;
            signal_dbm?: number;
            snr?: number;
            downlink_throughput_bps?: number;
            uplink_throughput_bps?: number;
            pop_ping_latency_ms?: number;
            obstruction_percent_time?: number;
            obstruction_percent?: number;
          };
          power_w?: number;
          signal_dbm?: number;
          snr?: number;
          downlink_throughput_bps?: number;
          uplink_throughput_bps?: number;
          pop_ping_latency_ms?: number;
        }
        
        interface RawResponse {
          count?: number;
          readings?: RawReading[];
          sensor_type?: string;
        }
        
        const params = new URLSearchParams();
        params.append('hours', hours.toString());
        if (clientId && clientId !== 'all') {
          params.append('client_id', clientId);
        }
        if (deviceId) {
          params.append('device_id', deviceId);
        }
        
        const response = await callAuroraApi<RawResponse>(`/api/readings/sensor/starlink?${params.toString()}`);
        
        const transformedReadings: StarlinkTimeseriesPoint[] = (response.readings || []).map(r => {
          const starlinkData = r.data?.starlink;
          const pingLatency = starlinkData?.ping_latency;
          
          return {
            timestamp: r.timestamp,
            client_id: r.client_id,
            device_id: r.device_id,
            power_w: starlinkData?.power_watts ?? r.data?.power_watts ?? r.data?.power_w ?? r.power_w,
            signal_dbm: r.data?.signal_dbm ?? r.signal_dbm,
            snr: starlinkData?.snr ?? r.data?.snr ?? r.snr,
            downlink_throughput_bps: starlinkData?.downlink_throughput_bps ?? r.data?.downlink_throughput_bps ?? r.downlink_throughput_bps,
            uplink_throughput_bps: starlinkData?.uplink_throughput_bps ?? r.data?.uplink_throughput_bps ?? r.uplink_throughput_bps,
            pop_ping_latency_ms: starlinkData?.pop_ping_latency_ms ?? 
                                  pingLatency?.['Mean RTT, drop == 0'] ?? 
                                  pingLatency?.['Mean RTT, drop < 1'] ?? 
                                  r.data?.pop_ping_latency_ms ?? 
                                  r.pop_ping_latency_ms,
            obstruction_percent: starlinkData?.obstruction_percent ?? r.data?.obstruction_percent,
          };
        });
        
        return { 
          count: transformedReadings.length, 
          readings: transformedReadings 
        };
      } catch {
        try {
          const fallback = await callAuroraApi<StarlinkTimeseriesResponse>(`/api/stats/sensors/starlink`);
          return fallback;
        } catch (error) {
          console.warn("Failed to fetch starlink timeseries:", error);
          return { count: 0, readings: [] };
        }
      }
    },
    enabled: hasAuroraSession(),
    ...fastQueryOptions,
    retry: 1,
  });
}

// Hook to fetch Starlink sensor readings with GPS data
export interface StarlinkSensorReading {
  device_id: string;
  timestamp: string;
  client_id?: string;
  data: {
    latitude?: number;
    longitude?: number;
    altitude?: number;
    gps_latitude?: number;
    gps_longitude?: number;
    gps_altitude?: number;
    [key: string]: unknown;
  };
}

export function useStarlinkSensorReadings() {
  return useQuery({
    queryKey: ["aurora", "readings", "sensor", "starlink"],
    queryFn: async () => {
      try {
        return await callAuroraApi<StarlinkSensorReading[]>("/api/readings/sensor/starlink");
      } catch (error) {
        console.warn("Failed to fetch Starlink sensor readings:", error);
        return [];
      }
    },
    enabled: hasAuroraSession(),
    ...fastQueryOptions,
    retry: 1,
  });
}
