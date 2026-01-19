// Aurora API - Dashboard domain hooks
import { useQuery } from "@tanstack/react-query";
import { callAuroraApi, hasAuroraSession, type AuroraApiOptions } from "./core";
import { STATS, DASHBOARD, SYSTEM } from "./endpoints";

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

// New types matching actual API response from /api/dashboard/sensor-stats
export interface DashboardSensorStatsItem {
  sensor_type: string;
  reading_count: number;
  client_count: number;
  device_count: number;
  avg_data_size?: number;
  first_reading?: string;
  last_reading?: string;
}

export interface DashboardSensorStatsResponse {
  data: DashboardSensorStatsItem[];
  status: string;
  summary: {
    total_readings: number;
    total_sensor_types: number;
  };
  time_window_hours: number;
  timestamp: string;
}

// New types matching actual API response from /api/stats/by-client
export interface ClientStatsItem {
  client_id: string;
  device_count: number;
  sensor_type_count: number;
  sensor_types: string[];
  reading_count: number;
  first_reading?: string;
  last_reading?: string;
}

export interface ClientStatsResponse {
  data: ClientStatsItem[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    returned: number;
  };
  status: string;
  time_window_hours: number;
  timestamp: string;
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
      
      // Try stats/by-client first (now returns rich data)
      try {
        const byClientResult = await callAuroraApi<ClientStatsResponse | ClientStatsItem[]>(
          STATS.BY_CLIENT, "GET", undefined, options
        );
        
        // Handle both wrapped and unwrapped responses
        const clients = Array.isArray(byClientResult) 
          ? byClientResult 
          : byClientResult?.data || [];
        
        if (clients.length > 0) {
          // Aggregate stats from all clients
          const totalReadings = clients.reduce((sum, c) => sum + (c.reading_count || 0), 0);
          const totalDevices = clients.reduce((sum, c) => sum + (c.device_count || 0), 0);
          const allSensorTypes = new Set(clients.flatMap(c => c.sensor_types || []));
          
          return {
            avg_humidity: null,
            avg_power_w: null,
            avg_signal_dbm: null,
            avg_temp_aht: null,
            avg_temp_bmt: null,
            avg_temp_c: null,
            avg_temp_f: null,
            total_clients: clients.length,
            total_sensors: allSensorTypes.size,
            total_readings: totalReadings,
            total_devices: totalDevices,
          };
        }
      } catch {
        // Fall through to other endpoints
      }
      
      // Fallback to other endpoints
      const endpoints = [
        STATS.OVERVIEW,
        STATS.GLOBAL, 
        STATS.SUMMARY,
        DASHBOARD.SENSOR_STATS,
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
        return await callAuroraApi<DashboardTimeseries>(
          DASHBOARD.SENSOR_TIMESERIES, 
          "GET", 
          undefined, 
          { clientId, params: { hours } }
        );
      } catch {
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
      
      // Try dashboard endpoint first
      try {
        const result = await callAuroraApi<DashboardSystemStats>(DASHBOARD.SYSTEM_STATS, "GET", undefined, options);
        if (result && Object.keys(result).length > 0) {
          return result;
        }
      } catch {
        // Fall through to aggregation
      }
      
      // Try individual system endpoints
      const [cpu, memory, disk, load, uptime] = await Promise.all([
        callAuroraApi<{ data?: { cpu_usage_percent?: number; cpu_temp_celsius?: number } }>(
          SYSTEM.ALL, "GET", undefined, options
        ).catch(() => null),
        callAuroraApi<{ total: number; used: number; percent: number }>(
          SYSTEM.MEMORY, "GET", undefined, options
        ).catch(() => null),
        callAuroraApi<{ total: number; used: number; percent: number }>(
          SYSTEM.DISK, "GET", undefined, options
        ).catch(() => null),
        callAuroraApi<{ load: number[] }>(
          SYSTEM.LOAD, "GET", undefined, options
        ).catch(() => null),
        callAuroraApi<{ uptime_seconds: number }>(
          SYSTEM.UPTIME, "GET", undefined, options
        ).catch(() => null),
      ]);
      
      return {
        cpu_percent: cpu?.data?.cpu_usage_percent,
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

// NEW: Fetch sensor stats from /api/dashboard/sensor-stats (now returns rich data)
export function useDashboardSensorStats(clientId?: string | null) {
  return useQuery({
    queryKey: ["aurora", "dashboard", "sensor-stats", clientId],
    queryFn: async () => {
      const options: AuroraApiOptions = { clientId };
      
      // Try the dashboard/sensor-stats endpoint first (now returns rich data)
      try {
        const result = await callAuroraApi<DashboardSensorStatsResponse | DashboardSensorStatsItem[]>(
          DASHBOARD.SENSOR_STATS, "GET", undefined, options
        );
        
        // Handle both wrapped and unwrapped responses
        if (result) {
          const items = Array.isArray(result) ? result : result.data || [];
          const summary = !Array.isArray(result) ? result.summary : null;
          
          if (items.length > 0 || summary) {
            const totalReadings = summary?.total_readings || items.reduce((sum, s) => sum + (s.reading_count || 0), 0);
            const totalSensorTypes = summary?.total_sensor_types || items.length;
            const totalClients = Math.max(...items.map(s => s.client_count || 0), 0);
            const totalDevices = items.reduce((sum, s) => sum + (s.device_count || 0), 0);
            
            return {
              total_sensors: totalSensorTypes,
              total_clients: totalClients,
              total_devices: totalDevices,
              readings_last_24h: totalReadings,
              sensorItems: items, // Include raw items for detailed display
            };
          }
        }
      } catch {
        // Fall through to other endpoints
      }
      
      // Fallback endpoints
      const endpoints = [
        STATS.OVERVIEW,
        STATS.GLOBAL,
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

// NEW: Fetch client stats from /api/stats/by-client (now returns rich data)
export function useDashboardClientStats(clientId?: string | null, hours: number = 24) {
  return useQuery({
    queryKey: ["aurora", "dashboard", "client-stats", clientId, hours],
    queryFn: async () => {
      const options: AuroraApiOptions = { clientId, params: { hours } };
      
      try {
        const result = await callAuroraApi<ClientStatsResponse | ClientStatsItem[]>(
          STATS.BY_CLIENT, "GET", undefined, options
        );
        
        // Handle both wrapped and unwrapped responses
        const clients = Array.isArray(result) ? result : result?.data || [];
        const pagination = !Array.isArray(result) ? result?.pagination : null;
        
        return {
          clients,
          total: pagination?.total || clients.length,
          timeWindowHours: !Array.isArray(result) ? result?.time_window_hours : hours,
        };
      } catch {
        return { clients: [], total: 0, timeWindowHours: hours };
      }
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
        return await callAuroraApi<DashboardSensorTimeseries>(
          DASHBOARD.SENSOR_TIMESERIES, 
          "GET", 
          undefined, 
          { clientId, params: { hours } }
        );
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
