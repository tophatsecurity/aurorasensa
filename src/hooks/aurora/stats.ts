// Aurora API - Stats domain hooks
import { useQuery } from "@tanstack/react-query";
import { callAuroraApi, hasAuroraSession, AuroraApiOptions } from "./core";

// =============================================
// TYPES
// =============================================

export interface DeviceSummary {
  device_id: string;
  device_type: string;
  status: string;
  total_readings: number;
  first_seen: string;
  last_seen: string;
  active_last_hour: boolean;
  active_last_24h: boolean;
  minutes_since_last_seen: number;
}

export interface SensorTypeSummary {
  device_type: string;
  device_count: number;
  total_readings: number;
  first_seen: string;
  last_seen: string;
  active_last_hour: boolean;
}

export interface ComprehensiveStats {
  timestamp: string;
  global: {
    timestamp: string;
    database: {
      total_readings: number;
      total_batches: number;
      total_clients: number;
      active_alerts: number;
      total_alert_rules: number;
    };
    devices: {
      total_unique_devices: number;
      total_device_types: number;
    };
    activity: {
      avg_readings_per_hour: number;
      last_1_hour: {
        readings_1h: number;
        batches_1h: number;
        active_devices_1h: number;
      };
      last_24_hours: {
        readings_24h: number;
        batches_24h: number;
        active_devices_24h: number;
      };
    };
    time_ranges: {
      earliest_reading: string;
      latest_reading: string;
      data_span_seconds: number;
      data_span_days: number;
    };
    sensors: {
      by_type: Array<{
        device_type: string;
        device_count: number;
        reading_count: number;
        first_seen: string;
        last_seen: string;
      }>;
    };
  };
  devices_summary: {
    total_devices: number;
    devices: DeviceSummary[];
  };
  sensors_summary: {
    total_sensor_types: number;
    sensor_types: SensorTypeSummary[];
  };
}

export interface GlobalStats {
  total_readings?: number;
  total_devices?: number;
  total_clients?: number;
  total_batches?: number;
  active_alerts?: number;
  readings_last_hour?: number;
  readings_last_24h?: number;
}

export interface DeviceStats {
  device_id?: string;
  device_type?: string;
  total_readings?: number;
  first_seen?: string;
  last_seen?: string;
  status?: string;
}

export interface PeriodStats {
  period: string;
  readings: number;
  devices: number;
  clients: number;
  start_time?: string;
  end_time?: string;
}

export interface AircraftStats {
  total_tracked?: number;
  active?: number;
  positions_received?: number;
  messages_decoded?: number;
  max_range_nm?: number;
  coverage_area_km2?: number;
}

export interface PowerStats {
  avg_power_w?: number;
  max_power_w?: number;
  min_power_w?: number;
  total_energy_wh?: number;
  readings_count?: number;
}

export interface PerformanceStats {
  avg_response_time_ms?: number;
  requests_per_second?: number;
  error_rate?: number;
  uptime_percent?: number;
  active_connections?: number;
}

export interface GlobalStatsHistoryPoint {
  timestamp: string;
  total_readings: number;
  total_devices: number;
  total_sensors: number;
  total_clients: number;
  active_devices?: number;
  active_sensors?: number;
}

export interface SensorStatsHistoryPoint {
  timestamp: string;
  sensor_type: string;
  reading_count: number;
  device_count: number;
  avg_value?: number;
  min_value?: number;
  max_value?: number;
}

export interface DeviceStatsHistoryPoint {
  timestamp: string;
  device_id: string;
  device_type: string;
  reading_count: number;
  status?: string;
  avg_value?: number;
}

export interface AlertStatsHistoryPoint {
  timestamp: string;
  total_alerts: number;
  critical_count: number;
  warning_count: number;
  info_count: number;
  acknowledged_count: number;
  resolved_count: number;
}

export interface SystemResourceStatsHistoryPoint {
  timestamp: string;
  cpu_usage?: number;
  memory_usage?: number;
  disk_usage?: number;
  network_in?: number;
  network_out?: number;
}

export interface EndpointStats {
  endpoint: string;
  method: string;
  total_calls: number;
  avg_response_time_ms: number;
  error_count: number;
  success_rate: number;
}

export interface StatsOverview {
  total_readings?: number;
  total_batches?: number;
  total_clients?: number;
  total_devices?: number;
  active_alerts?: number;
  readings_last_hour?: number;
  readings_last_24h?: number;
  uptime_seconds?: number;
}

// =============================================
// QUERY HOOKS
// =============================================

export function useComprehensiveStats(clientId?: string | null) {
  return useQuery({
    queryKey: ["aurora", "stats", "comprehensive", clientId],
    queryFn: () => callAuroraApi<ComprehensiveStats>("/api/stats/comprehensive", "GET", undefined, { clientId }),
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 180000,
    retry: 1,
  });
}

export function useDeviceStats(clientId?: string | null) {
  return useQuery({
    queryKey: ["aurora", "stats", "devices", clientId],
    queryFn: () => callAuroraApi<{ devices: DeviceStats[] }>("/api/stats/devices", "GET", undefined, { clientId }),
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 1,
  });
}

export function useGlobalStats(clientId?: string | null) {
  return useQuery({
    queryKey: ["aurora", "stats", "global", clientId],
    queryFn: () => callAuroraApi<GlobalStats>("/api/stats/global", "GET", undefined, { clientId }),
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 180000,
    retry: 1,
  });
}

export function use1hrStats(clientId?: string | null) {
  return useQuery({
    queryKey: ["aurora", "stats", "1hr", clientId],
    queryFn: () => callAuroraApi<PeriodStats>("/api/stats/1hr", "GET", undefined, { clientId }),
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 1,
  });
}

export function use6hrStats(clientId?: string | null) {
  return useQuery({
    queryKey: ["aurora", "stats", "6hr", clientId],
    queryFn: () => callAuroraApi<PeriodStats>("/api/stats/6hr", "GET", undefined, { clientId }),
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 180000,
    retry: 1,
  });
}

export function use24hrStats(clientId?: string | null) {
  return useQuery({
    queryKey: ["aurora", "stats", "24hr", clientId],
    queryFn: () => callAuroraApi<PeriodStats>("/api/stats/24hr", "GET", undefined, { clientId }),
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 300000,
    retry: 1,
  });
}

export function useWeeklyStats(clientId?: string | null) {
  return useQuery({
    queryKey: ["aurora", "stats", "weekly", clientId],
    queryFn: () => callAuroraApi<PeriodStats>("/api/stats/weekly", "GET", undefined, { clientId }),
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 600000,
    retry: 1,
  });
}

export function usePeriodStats(period: string, clientId?: string | null) {
  return useQuery({
    queryKey: ["aurora", "stats", "period", period, clientId],
    queryFn: () => callAuroraApi<PeriodStats>(`/api/stats/period/${period}`, "GET", undefined, { clientId }),
    enabled: !!period && hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 1,
  });
}

export function useAircraftStats(clientId?: string | null) {
  return useQuery({
    queryKey: ["aurora", "stats", "aircraft", clientId],
    queryFn: () => callAuroraApi<AircraftStats>("/api/stats/aircraft", "GET", undefined, { clientId }),
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 1,
  });
}

export function useEndpointStats() {
  return useQuery({
    queryKey: ["aurora", "stats", "endpoints"],
    queryFn: () => callAuroraApi<{ endpoints: EndpointStats[] }>("/api/stats/endpoints"),
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 1,
  });
}

export function usePowerStats(clientId?: string | null) {
  return useQuery({
    queryKey: ["aurora", "stats", "power", clientId],
    queryFn: () => callAuroraApi<PowerStats>("/api/power/stats", "GET", undefined, { clientId }),
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 1,
  });
}

export function usePerformanceStats() {
  return useQuery({
    queryKey: ["aurora", "stats", "performance"],
    queryFn: () => callAuroraApi<PerformanceStats>("/api/performance/stats"),
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 1,
  });
}

export function useStatsOverview(clientId?: string | null) {
  return useQuery({
    queryKey: ["aurora", "stats", "overview", clientId],
    queryFn: () => callAuroraApi<StatsOverview>("/api/stats/overview", "GET", undefined, { clientId }),
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 180000,
    retry: 1,
  });
}

// Client-specific stats hooks

export interface ClientStats {
  client_id: string;
  hostname?: string;
  ip_address?: string;
  status?: string;
  state?: string;
  first_seen?: string;
  last_seen?: string;
  batches_received?: number;
  total_readings?: number;
  total_devices?: number;
  active_devices?: number;
  device_types?: string[];
  sensors?: string[];
  readings_last_hour?: number;
  readings_last_24h?: number;
  avg_readings_per_hour?: number;
  location?: {
    latitude?: number;
    longitude?: number;
    city?: string;
    country?: string;
  };
  system?: {
    cpu_percent?: number;
    memory_percent?: number;
    disk_percent?: number;
    uptime_seconds?: number;
  };
}

export function useClientStats(clientId: string | null) {
  return useQuery({
    queryKey: ["aurora", "stats", "client", clientId],
    queryFn: async () => {
      if (!clientId || clientId === "all") return null;
      try {
        return await callAuroraApi<ClientStats>(`/api/clients/${clientId}/stats`);
      } catch (error) {
        // Fallback to basic client info if stats endpoint doesn't exist
        console.warn(`Client stats endpoint failed, trying basic info:`, error);
        try {
          const client = await callAuroraApi<ClientStats>(`/api/clients/${clientId}`);
          return client;
        } catch {
          return null;
        }
      }
    },
    enabled: hasAuroraSession() && !!clientId && clientId !== "all",
    staleTime: 30000,
    refetchInterval: 60000,
    retry: 1,
  });
}

// Historical Stats Hooks with error handling for large data responses

async function safeStatsHistoryCall<T>(endpoint: string, defaultValue: T, options?: AuroraApiOptions): Promise<T> {
  try {
    return await callAuroraApi<T>(endpoint, "GET", undefined, options);
  } catch (error) {
    // Handle JSONB size limit errors or other API failures gracefully
    const errorMsg = error instanceof Error ? error.message : String(error);
    if (errorMsg.includes('jsonb') || errorMsg.includes('exceeds') || errorMsg.includes('500')) {
      console.warn(`Stats history endpoint ${endpoint} returned too much data, using empty array`);
    } else {
      console.warn(`Stats history endpoint ${endpoint} failed:`, errorMsg);
    }
    return defaultValue;
  }
}

export function useGlobalStatsHistory(hours: number = 24, clientId?: string | null) {
  return useQuery({
    queryKey: ["aurora", "stats", "history", "global", hours, clientId],
    queryFn: () => safeStatsHistoryCall<GlobalStatsHistoryPoint[]>(`/api/stats/history/global?hours=${hours}`, [], { clientId }),
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 0,
  });
}

export function useSensorStatsHistory(hours: number = 24, sensorType?: string, clientId?: string | null) {
  const params = new URLSearchParams({ hours: hours.toString() });
  if (sensorType) params.append("sensor_type", sensorType);
  
  return useQuery({
    queryKey: ["aurora", "stats", "history", "sensors", hours, sensorType, clientId],
    queryFn: () => safeStatsHistoryCall<SensorStatsHistoryPoint[]>(`/api/stats/history/sensors?${params}`, [], { clientId }),
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 0,
  });
}

export function useDeviceStatsHistory(hours: number = 24, deviceId?: string, clientId?: string | null) {
  const params = new URLSearchParams({ hours: hours.toString() });
  if (deviceId) params.append("device_id", deviceId);
  
  return useQuery({
    queryKey: ["aurora", "stats", "history", "devices", hours, deviceId, clientId],
    queryFn: () => safeStatsHistoryCall<DeviceStatsHistoryPoint[]>(`/api/stats/history/devices?${params}`, [], { clientId }),
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 0,
  });
}

export function useAlertStatsHistory(hours: number = 24, clientId?: string | null) {
  return useQuery({
    queryKey: ["aurora", "stats", "history", "alerts", hours, clientId],
    queryFn: () => safeStatsHistoryCall<AlertStatsHistoryPoint[]>(`/api/stats/history/alerts?hours=${hours}`, [], { clientId }),
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 0,
  });
}

export function useSystemResourceStatsHistory(hours: number = 24, clientId?: string | null) {
  return useQuery({
    queryKey: ["aurora", "stats", "history", "system", hours, clientId],
    queryFn: () => safeStatsHistoryCall<SystemResourceStatsHistoryPoint[]>(`/api/stats/history/system?hours=${hours}`, [], { clientId }),
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 0,
  });
}
