// Aurora API - Dashboard domain hooks
import { useQuery } from "@tanstack/react-query";
import { callAuroraApi, hasAuroraSession } from "./core";

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

export function useDashboardStats() {
  return useQuery({
    queryKey: ["aurora", "dashboard", "stats"],
    queryFn: () => callAuroraApi<DashboardStats>("/api/dashboard/stats"),
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 1,
  });
}

export function useDashboardTimeseries(hours: number = 24) {
  return useQuery({
    queryKey: ["aurora", "dashboard", "timeseries", hours],
    queryFn: () => callAuroraApi<DashboardTimeseries>(`/api/dashboard/timeseries?hours=${hours}`),
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 1,
  });
}

export function useDashboardSystemStats() {
  return useQuery({
    queryKey: ["aurora", "dashboard", "system"],
    queryFn: () => callAuroraApi<DashboardSystemStats>("/api/dashboard/system"),
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 1,
  });
}

export function useDashboardSensorStats() {
  return useQuery({
    queryKey: ["aurora", "dashboard", "sensor-stats"],
    queryFn: () => callAuroraApi<DashboardSensorStats>("/api/dashboard/sensor-stats"),
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 1,
  });
}

export function useDashboardSensorTimeseries(hours: number = 24) {
  return useQuery({
    queryKey: ["aurora", "dashboard", "sensor-timeseries", hours],
    queryFn: () => callAuroraApi<DashboardSensorTimeseries>(`/api/dashboard/sensor-timeseries?hours=${hours}`),
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 1,
  });
}
