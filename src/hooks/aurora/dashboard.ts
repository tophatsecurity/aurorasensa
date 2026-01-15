// Aurora API - Dashboard domain hooks
// Updated to use available endpoints with fallbacks
import { useQuery } from "@tanstack/react-query";
import { callAuroraApi, hasAuroraSession, AuroraApiOptions } from "./core";

// =============================================
// TYPES
// =============================================

export interface DashboardStats {
  avg_humidity: number | null;
  avg_power_w: number | null;
  avg_signal_dbm: number | null;
  avg_temp_aht: number | null;
  avg_temp_bmt: number | null;
  avg_temp_c: number | null;
  avg_temp_f: number | null;
  total_clients: number;
  total_sensors: number;
  total_readings?: number;
  total_devices?: number;
  active_alerts?: number;
}

export interface DashboardSystemStats {
  cpu_percent?: number;
  memory_percent?: number;
  disk_percent?: number;
  uptime_seconds?: number;
  load_average?: number[];
  network_rx_bytes?: number;
  network_tx_bytes?: number;
}

export interface TimeseriesPoint {
  timestamp: string;
  value: number;
}

export interface DashboardTimeseries {
  humidity: TimeseriesPoint[];
  power: TimeseriesPoint[];
  signal: TimeseriesPoint[];
  temperature: TimeseriesPoint[];
}

export interface DashboardSensorStats {
  avg_humidity?: number | null;
  avg_power_w?: number | null;
  avg_signal_dbm?: number | null;
  avg_temp_aht?: number | null;
  avg_temp_bmt?: number | null;
  avg_temp_c?: number | null;
  avg_temp_f?: number | null;
  total_clients?: number;
  total_sensors?: number;
  total_devices?: number;
  active_devices?: number;
  readings_last_hour?: number;
  readings_last_24h?: number;
}

export interface DashboardSensorTimeseries {
  humidity?: TimeseriesPoint[];
  power?: TimeseriesPoint[];
  signal?: TimeseriesPoint[];
  temperature?: TimeseriesPoint[];
  [key: string]: TimeseriesPoint[] | undefined;
}

// =============================================
// QUERY HOOKS
// =============================================

export function useDashboardStats(clientId?: string | null) {
  return useQuery({
    queryKey: ["aurora", "dashboard", "stats", clientId],
    queryFn: async () => {
      const options: AuroraApiOptions = { clientId };
      // Try multiple endpoints in order of preference
      const endpoints = [
        "/api/stats/overview",
        "/api/stats/global", 
        "/api/stats/summary",
        "/api/dashboard/sensor-stats",
      ];
      
      for (const endpoint of endpoints) {
        try {
          const result = await callAuroraApi<DashboardStats>(endpoint, "GET", undefined, options);
          if (result && Object.keys(result).length > 0) {
            return result;
          }
        } catch {
          // Try next endpoint
        }
      }
      
      // Return empty stats if all fail
      return {
        avg_humidity: null,
        avg_power_w: null,
        avg_signal_dbm: null,
        avg_temp_aht: null,
        avg_temp_bmt: null,
        avg_temp_c: null,
        avg_temp_f: null,
        total_clients: 0,
        total_sensors: 0,
      };
    },
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 1,
  });
}

export function useDashboardTimeseries(hours: number = 24, clientId?: string | null) {
  return useQuery({
    queryKey: ["aurora", "dashboard", "timeseries", hours, clientId],
    queryFn: async () => {
      try {
        return await callAuroraApi<DashboardTimeseries>(`/api/dashboard/sensor-timeseries?hours=${hours}`, "GET", undefined, { clientId });
      } catch {
        // Return empty timeseries
        return {
          humidity: [],
          power: [],
          signal: [],
          temperature: [],
        };
      }
    },
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 1,
  });
}

export function useDashboardSystemStats(clientId?: string | null) {
  return useQuery({
    queryKey: ["aurora", "dashboard", "system", clientId],
    queryFn: async () => {
      const options: AuroraApiOptions = { clientId };
      // Try dashboard endpoint first, then aggregate from system endpoints
      try {
        const result = await callAuroraApi<DashboardSystemStats>("/api/dashboard/system-stats", "GET", undefined, options);
        if (result && Object.keys(result).length > 0) {
          return result;
        }
      } catch {
        // Fall through to aggregation
      }
      
      // Aggregate from individual system endpoints
      const [memory, disk, load, uptime] = await Promise.all([
        callAuroraApi<{ total: number; used: number; percent: number }>("/api/system/memory", "GET", undefined, options).catch(() => null),
        callAuroraApi<{ total: number; used: number; percent: number }>("/api/system/disk", "GET", undefined, options).catch(() => null),
        callAuroraApi<{ load: number[] }>("/api/system/load", "GET", undefined, options).catch(() => null),
        callAuroraApi<{ uptime_seconds: number }>("/api/system/uptime", "GET", undefined, options).catch(() => null),
      ]);
      
      return {
        memory_percent: memory?.percent,
        disk_percent: disk?.percent,
        load_average: load?.load,
        uptime_seconds: uptime?.uptime_seconds,
      };
    },
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 1,
  });
}

export function useDashboardSensorStats(clientId?: string | null) {
  return useQuery({
    queryKey: ["aurora", "dashboard", "sensor-stats", clientId],
    queryFn: async () => {
      const options: AuroraApiOptions = { clientId };
      // Try multiple endpoints
      const endpoints = [
        "/api/stats/overview",
        "/api/stats/global",
        "/api/dashboard/sensor-stats",
      ];
      
      for (const endpoint of endpoints) {
        try {
          const result = await callAuroraApi<DashboardSensorStats>(endpoint, "GET", undefined, options);
          if (result && Object.keys(result).length > 0) {
            return result;
          }
        } catch {
          // Try next endpoint
        }
      }
      
      return {};
    },
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 1,
  });
}

export function useDashboardSensorTimeseries(hours: number = 24, clientId?: string | null) {
  return useQuery({
    queryKey: ["aurora", "dashboard", "sensor-timeseries", hours, clientId],
    queryFn: async () => {
      try {
        return await callAuroraApi<DashboardSensorTimeseries>(`/api/dashboard/sensor-timeseries?hours=${hours}`, "GET", undefined, { clientId });
      } catch {
        return {};
      }
    },
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 1,
  });
}
