// Aurora API - Starlink Hooks
// NOTE: Many Starlink-specific endpoints (power, connectivity, performance, devices)
// are NOT implemented on the Aurora server. Only /api/readings/sensor/starlink exists.
// Disabled hooks will return empty/null data gracefully.

import { useQuery } from "@tanstack/react-query";
import { callAuroraApi, hasAuroraSession, fastQueryOptions, defaultQueryOptions } from "./core";
import { STARLINK, READINGS, STATS, DEVICES, withQuery } from "./endpoints";
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

// Flag to enable/disable Starlink-specific endpoints
// According to API docs at http://aurora.tophatsecurity.com:9151/docs these endpoints exist:
// GET /api/starlink/devices - Get Starlink Devices
// GET /api/starlink/devices/{device_id} - Get Starlink Device
// GET /api/starlink/stats - Get Starlink Stats
// GET /api/starlink/stats/global - Get Global Starlink Stats  
// GET /api/starlink/stats/device/{device_id} - Get Device Starlink Stats
// GET /api/starlink/signal-strength - Get Starlink Signal Strength
// GET /api/starlink/performance - Get Starlink Performance
// GET /api/starlink/power - Get Starlink Power
// GET /api/starlink/connectivity - Get Starlink Connectivity
const STARLINK_EXTENDED_API_ENABLED = true;

// =============================================
// DEVICE EXTRACTION FROM LATEST READINGS
// =============================================

export interface StarlinkDeviceWithMetrics {
  device_id: string;
  client_id: string;
  composite_key: string; // client_id + device_id for unique identification
  hostname?: string;
  last_seen?: string;
  latitude?: number;
  longitude?: number;
  altitude?: number;
  metrics: {
    uptime_seconds?: number;
    downlink_throughput_bps?: number;
    uplink_throughput_bps?: number;
    pop_ping_latency_ms?: number;
    snr?: number;
    signal_strength_dbm?: number;
    obstruction_percent?: number;
    power_watts?: number;
    connected?: boolean;
  };
}

// Hook to extract Starlink devices with metrics from latest readings
export function useStarlinkDevicesFromReadings() {
  return useQuery({
    queryKey: ["aurora", "starlink", "devices-from-readings"],
    queryFn: async () => {
      try {
        const response = await callAuroraApi<{ count: number; readings: LatestReading[] }>(READINGS.LATEST);
        const readings = response?.readings || [];
        
        // Filter for starlink readings and extract device info
        const starlinkReadings = readings.filter(r => 
          r.device_type === 'starlink' || 
          r.device_id?.toLowerCase().includes('starlink')
        );
        
        // Create a map using composite key (client_id + device_id)
        const devicesMap = new Map<string, StarlinkDeviceWithMetrics>();
        
        starlinkReadings.forEach(reading => {
          const clientId = reading.client_id || 'unknown';
          const deviceId = reading.device_id || 'unknown';
          const compositeKey = `${clientId}:${deviceId}`;
          
          // Extract metrics from the reading data with null safety
          const data = (reading.data || {}) as Record<string, unknown>;
          const starlinkData = ((data?.starlink as Record<string, unknown>) || data || {}) as Record<string, unknown>;
          const pingLatency = ((starlinkData?.ping_latency as Record<string, number>) || {}) as Record<string, number>;
          
          // Extract coordinates with null safety
          let lat: number | undefined;
          let lng: number | undefined;
          let alt: number | undefined;
          
          if (starlinkData && typeof starlinkData.latitude === 'number') {
            lat = starlinkData.latitude as number;
            lng = typeof starlinkData.longitude === 'number' ? starlinkData.longitude as number : undefined;
            alt = typeof starlinkData.altitude === 'number' ? starlinkData.altitude as number : undefined;
          } else if (starlinkData?.location_detail && typeof starlinkData.location_detail === 'object') {
            const loc = starlinkData.location_detail as Record<string, number>;
            lat = typeof loc?.latitude === 'number' ? loc.latitude : undefined;
            lng = typeof loc?.longitude === 'number' ? loc.longitude : undefined;
            alt = typeof loc?.altitude === 'number' ? loc.altitude : undefined;
          }
          
          const device: StarlinkDeviceWithMetrics = {
            device_id: deviceId,
            client_id: clientId,
            composite_key: compositeKey,
            last_seen: reading.timestamp,
            latitude: lat,
            longitude: lng,
            altitude: alt,
            metrics: {
              uptime_seconds: starlinkData.uptime_seconds as number | undefined,
              downlink_throughput_bps: starlinkData.downlink_throughput_bps as number | undefined,
              uplink_throughput_bps: starlinkData.uplink_throughput_bps as number | undefined,
              pop_ping_latency_ms: (starlinkData.pop_ping_latency_ms as number) || 
                pingLatency['Mean RTT, drop == 0'] || 
                pingLatency['Mean RTT, drop < 1'],
              snr: starlinkData.snr as number | undefined,
              signal_strength_dbm: starlinkData.signal_strength_dbm as number | undefined,
              obstruction_percent: starlinkData.obstruction_percent as number | undefined,
              power_watts: starlinkData.power_watts as number | undefined,
              connected: starlinkData.state === 'CONNECTED' || starlinkData.connected === true,
            },
          };
          
          devicesMap.set(compositeKey, device);
        });
        
        return Array.from(devicesMap.values());
      } catch (error) {
        console.warn("Failed to extract Starlink devices from readings:", error);
        return [];
      }
    },
    enabled: hasAuroraSession(),
    ...fastQueryOptions,
    retry: 1,
  });
}

// Hook to fetch timeseries data for a specific Starlink device (by client_id and device_id)
export function useStarlinkDeviceMetrics(clientId: string | null, deviceId: string | null, hours: number = 24) {
  return useQuery({
    queryKey: ["aurora", "starlink", "device-metrics", clientId, deviceId, hours],
    queryFn: async () => {
      if (!clientId || !deviceId) return { count: 0, readings: [] };
      
      try {
        interface RawReading {
          timestamp: string;
          device_id?: string;
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
          };
        }
        
        interface RawResponse {
          count?: number;
          readings?: RawReading[];
        }
        
        const response = await callAuroraApi<RawResponse>(
          withQuery(READINGS.BY_SENSOR_TYPE('starlink'), { hours, client_id: clientId, device_id: deviceId })
        );
        
        const transformedReadings: StarlinkTimeseriesPoint[] = (response.readings || []).map(r => {
          const starlinkData = r.data?.starlink;
          const pingLatency = starlinkData?.ping_latency;
          
          return {
            timestamp: r.timestamp,
            client_id: r.client_id,
            device_id: r.device_id,
            power_w: starlinkData?.power_watts,
            snr: starlinkData?.snr,
            downlink_throughput_bps: starlinkData?.downlink_throughput_bps,
            uplink_throughput_bps: starlinkData?.uplink_throughput_bps,
            pop_ping_latency_ms: starlinkData?.pop_ping_latency_ms ?? 
                                  pingLatency?.['Mean RTT, drop == 0'] ?? 
                                  pingLatency?.['Mean RTT, drop < 1'],
            obstruction_percent: starlinkData?.obstruction_percent,
          };
        });
        
        return { 
          count: transformedReadings.length, 
          readings: transformedReadings 
        };
      } catch (error) {
        console.warn(`Failed to fetch metrics for device ${clientId}:${deviceId}:`, error);
        return { count: 0, readings: [] };
      }
    },
    enabled: hasAuroraSession() && !!clientId && !!deviceId,
    ...fastQueryOptions,
    retry: 1,
  });
}

// =============================================
// QUERY HOOKS
// =============================================

export function useStarlinkDevices() {
  return useQuery({
    queryKey: ["aurora", "starlink", "devices"],
    queryFn: async () => {
      try {
        // Core now auto-unwraps { data: [...], status: 'success' } responses
        const result = await callAuroraApi<StarlinkDevice[] | { devices: StarlinkDevice[] }>(STARLINK.DEVICES);
        if (Array.isArray(result)) {
          return result;
        }
        return result?.devices || [];
      } catch (error) {
        console.warn("Failed to fetch Starlink devices:", error);
        return [];
      }
    },
    enabled: STARLINK_EXTENDED_API_ENABLED && hasAuroraSession(),
    ...fastQueryOptions,
  });
}

export function useStarlinkDevice(deviceId: string) {
  return useQuery({
    queryKey: ["aurora", "starlink", "devices", deviceId],
    queryFn: () => callAuroraApi<{ device_id: string; status?: string; last_seen?: string }>(
      STARLINK.DEVICE(deviceId)
    ),
    enabled: STARLINK_EXTENDED_API_ENABLED && hasAuroraSession() && !!deviceId,
    retry: 2,
  });
}

export function useStarlinkStats() {
  return useQuery({
    queryKey: ["aurora", "starlink", "stats"],
    queryFn: () => callAuroraApi<StarlinkStats>(STARLINK.STATS),
    enabled: STARLINK_EXTENDED_API_ENABLED && hasAuroraSession(),
    staleTime: 15000,
    refetchInterval: 30000,
    retry: 2,
  });
}

export function useStarlinkGlobalStats() {
  return useQuery({
    queryKey: ["aurora", "starlink", "stats", "global"],
    queryFn: () => callAuroraApi<StarlinkStats>(STARLINK.STATS_GLOBAL),
    enabled: STARLINK_EXTENDED_API_ENABLED && hasAuroraSession(),
    ...defaultQueryOptions,
  });
}

export function useStarlinkDeviceStatsById(deviceId: string) {
  return useQuery({
    queryKey: ["aurora", "starlink", "stats", "device", deviceId],
    queryFn: () => callAuroraApi<Record<string, unknown>>(STARLINK.STATS_DEVICE(deviceId)),
    enabled: STARLINK_EXTENDED_API_ENABLED && hasAuroraSession() && !!deviceId,
    retry: 2,
  });
}

export function useStarlinkSignalStrength() {
  return useQuery({
    queryKey: ["aurora", "starlink", "signal-strength"],
    queryFn: () => callAuroraApi<StarlinkSignalStrength>(STARLINK.SIGNAL_STRENGTH),
    enabled: STARLINK_EXTENDED_API_ENABLED && hasAuroraSession(),
    staleTime: 15000,
    refetchInterval: 30000,
    retry: 2,
  });
}

export function useStarlinkPerformance() {
  return useQuery({
    queryKey: ["aurora", "starlink", "performance"],
    queryFn: () => callAuroraApi<StarlinkPerformance>(STARLINK.PERFORMANCE),
    enabled: STARLINK_EXTENDED_API_ENABLED && hasAuroraSession(),
    staleTime: 15000,
    refetchInterval: 30000,
    retry: 2,
  });
}

export function useStarlinkPower() {
  return useQuery({
    queryKey: ["aurora", "starlink", "power"],
    queryFn: () => callAuroraApi<StarlinkPower>(STARLINK.POWER),
    enabled: STARLINK_EXTENDED_API_ENABLED && hasAuroraSession(),
    staleTime: 15000,
    refetchInterval: 30000,
    retry: 2,
  });
}

export function useStarlinkConnectivity() {
  return useQuery({
    queryKey: ["aurora", "starlink", "connectivity"],
    queryFn: () => callAuroraApi<StarlinkConnectivity>(STARLINK.CONNECTIVITY),
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
        const response = await callAuroraApi<StarlinkDeviceStats>(STATS.DEVICE(deviceId));
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
        const response = await callAuroraApi<StarlinkTimeseriesResponse>(
          withQuery(READINGS.BY_SENSOR_TYPE('starlink'), { device_id: deviceId, hours })
        );
        return response;
      } catch {
        try {
          const latest = await callAuroraApi<LatestReading>(DEVICES.LATEST(deviceId));
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
        const response = await callAuroraApi<StarlinkReadingsResponse>(STATS.SENSOR_TYPE('starlink'));
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
        
        const params: Record<string, string | number | undefined> = { hours };
        if (clientId && clientId !== 'all') {
          params.client_id = clientId;
        }
        if (deviceId) {
          params.device_id = deviceId;
        }
        
        const response = await callAuroraApi<RawResponse>(
          withQuery(READINGS.BY_SENSOR_TYPE('starlink'), params)
        );
        
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
      } catch (error) {
        console.warn("Failed to fetch Starlink timeseries:", error);
        return { count: 0, readings: [] };
      }
    },
    enabled: hasAuroraSession(),
    ...fastQueryOptions,
    retry: 1,
  });
}

// Combined hook for dashboard usage
export function useStarlinkDashboard() {
  const devicesFromReadings = useStarlinkDevicesFromReadings();
  const timeseries = useStarlinkTimeseries(24);
  const stats = useStarlinkStats();
  
  return {
    devices: devicesFromReadings.data || [],
    timeseries: timeseries.data?.readings || [],
    stats: stats.data,
    isLoading: devicesFromReadings.isLoading || timeseries.isLoading || stats.isLoading,
    isError: devicesFromReadings.isError && timeseries.isError && stats.isError,
    refetch: () => {
      devicesFromReadings.refetch();
      timeseries.refetch();
      stats.refetch();
    },
  };
}
