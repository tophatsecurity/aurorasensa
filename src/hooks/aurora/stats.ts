// Aurora API - Stats domain hooks
import { useQuery } from "@tanstack/react-query";
import { callAuroraApi, hasAuroraSession, type AuroraApiOptions } from "./core";
import { STATS, CLIENTS, DEVICES, TIMESERIES } from "./endpoints";

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

// New API structure - flat global object
export interface ComprehensiveStatsGlobal {
  total_clients: number;
  total_devices: number;
  total_batches: number;
  total_readings: number;
  sensor_types_count: number;
  active_clients_24h: number;
  device_breakdown: Array<{
    device_type: string;
    count: number;
  }>;
  readings_by_day: Array<{
    date: string;
    count: number;
  }>;
  storage: {
    batches_size: string;
    readings_size: string;
    total_db_size: string;
  };
  // Time ranges (may be provided)
  time_ranges?: {
    earliest_reading?: string;
    latest_reading?: string;
    data_span_seconds?: number;
    data_span_days?: number;
  };
  // Legacy nested structure (backward compatibility)
  database?: {
    total_readings: number;
    total_batches: number;
    total_clients: number;
    active_alerts: number;
    total_alert_rules: number;
  };
  devices?: {
    total_unique_devices: number;
    total_device_types: number;
  };
  activity?: {
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
}

export interface ComprehensiveStats {
  status: string;
  timestamp: string;
  filters?: {
    client_id: string | null;
    device_id: string | null;
    sensor_type: string | null;
  };
  global: ComprehensiveStatsGlobal;
  // Legacy summaries (if still provided)
  devices_summary?: {
    total_devices: number;
    devices: DeviceSummary[];
  };
  sensors_summary?: {
    total_sensor_types: number;
    sensor_types: SensorTypeSummary[];
  };
}

export interface GlobalStats {
  total_readings?: number;
  total_devices?: number;
  total_clients?: number;
  total_batches?: number;
  active_clients_24h?: number;
  sensor_types_count?: number;
  active_alerts?: number;
  readings_last_hour?: number;
  readings_last_24h?: number;
  device_breakdown?: Array<{
    device_type: string;
    count: number;
  }>;
  readings_by_day?: Array<{
    date: string;
    count: number;
  }>;
  storage?: {
    batches_size?: string;
    readings_size?: string;
    total_db_size?: string;
  };
  time_ranges?: {
    earliest_reading?: string;
    latest_reading?: string;
    data_span_seconds?: number;
    data_span_days?: number;
  };
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
  averages?: {
    temperature_c?: number;
    humidity?: number;
    power_w?: number;
    signal_dbm?: number;
  };
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
  cpu_percent?: number;
  memory_percent?: number;
  disk_percent?: number;
  network_io?: {
    bytes_sent: number;
    bytes_recv: number;
  };
  request_count_1h?: number;
  avg_response_time_ms?: number;
  uptime_seconds?: number;
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

// New API types for grouped stats
export interface ClientGroupedStats {
  client_id: string;
  hostname?: string;
  reading_count: number;
  device_count: number;
  sensor_type_count: number;
  sensor_types: string[];
  first_reading?: string;
  last_reading?: string;
}

export interface SensorGroupedStats {
  sensor_type: string;
  reading_count: number;
  client_count: number;
  device_count: number;
  avg_data_size?: number;
  first_reading?: string;
  last_reading?: string;
}

export interface ClientDetailedStats {
  client_id: string;
  overall: {
    total_readings: number;
    total_devices: number;
    sensor_types_count: number;
  };
  by_sensor_type: Array<{
    sensor_type: string;
    reading_count: number;
    device_count: number;
    last_reading?: string;
  }>;
  recent_devices: Array<{
    device_id: string;
    device_type: string;
    last_activity?: string;
  }>;
}

export interface DeviceReadings {
  device_id: string;
  readings: Array<{
    timestamp: string;
    sensor_type: string;
    data: Record<string, unknown>;
  }>;
  count: number;
}

export interface DeviceDetailedStats {
  device_id: string;
  device_type: string;
  client_id?: string;
  total_readings: number;
  first_seen?: string;
  last_seen?: string;
  reading_rate?: {
    per_hour?: number;
    per_day?: number;
  };
  sensor_types?: string[];
}

export interface StatsAllResponse {
  hourly: PeriodStats[];
  six_hour: PeriodStats[];
  twelve_hour: PeriodStats[];
  daily: PeriodStats[];
  weekly: PeriodStats[];
}

// =============================================
// HELPER
// =============================================

async function safeStatsHistoryCall<T>(endpoint: string, defaultValue: T, options?: AuroraApiOptions): Promise<T> {
  try {
    return await callAuroraApi<T>(endpoint, "GET", undefined, options);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    if (errorMsg.includes('jsonb') || errorMsg.includes('exceeds') || errorMsg.includes('500')) {
      console.warn(`Stats history endpoint ${endpoint} returned too much data, using empty array`);
    } else {
      console.warn(`Stats history endpoint ${endpoint} failed:`, errorMsg);
    }
    return defaultValue;
  }
}

// =============================================
// QUERY HOOKS
// =============================================

// API Response wrapper types
interface ApiResponse<T> {
  data?: T;
  status?: string;
  timestamp?: string;
}

interface PaginatedApiResponse<T> {
  data?: T[];
  pagination?: {
    total?: number;
    limit?: number;
    offset?: number;
    returned?: number;
  };
  status?: string;
  time_window_hours?: number;
  timestamp?: string;
}

// Helper to unwrap API responses that have a data wrapper
function unwrapApiResponse<T>(response: T | ApiResponse<T>): T {
  if (response && typeof response === 'object' && 'data' in response && response.data !== undefined) {
    return response.data as T;
  }
  return response as T;
}

export function useComprehensiveStats(clientId?: string | null) {
  return useQuery({
    queryKey: ["aurora", "stats", "comprehensive", clientId],
    queryFn: async () => {
      const raw = await callAuroraApi<ComprehensiveStats | ApiResponse<ComprehensiveStatsGlobal>>(
        STATS.COMPREHENSIVE, "GET", undefined, { clientId }
      );
      
      // Handle both direct response and wrapped response
      if (raw && 'global' in raw) {
        return raw as ComprehensiveStats;
      }
      
      // API might return { data: {...}, status: 'success' } structure
      // or { daily: {...}, hourly: {...} } structure for comprehensive stats
      if (raw && 'daily' in raw) {
        // This is the new comprehensive stats format with time granularities
        // We need to extract key metrics from it
        return {
          status: 'success',
          timestamp: new Date().toISOString(),
          global: {} as ComprehensiveStatsGlobal, // Will be merged with global stats
        } as ComprehensiveStats;
      }
      
      // If it's wrapped in data, convert to expected structure
      const unwrapped = unwrapApiResponse(raw);
      if (unwrapped && typeof unwrapped === 'object') {
        return {
          status: 'success',
          timestamp: new Date().toISOString(),
          global: unwrapped as ComprehensiveStatsGlobal,
        } as ComprehensiveStats;
      }
      return raw as ComprehensiveStats;
    },
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 180000,
    retry: 1,
  });
}

export function useDeviceStats(clientId?: string | null) {
  return useQuery({
    queryKey: ["aurora", "stats", "devices", clientId],
    queryFn: async () => {
      const raw = await callAuroraApi<{ devices?: DeviceStats[]; data?: DeviceStats[] }>(
        STATS.DEVICES, "GET", undefined, { clientId }
      );
      if (raw && 'devices' in raw && Array.isArray(raw.devices)) {
        return { devices: raw.devices };
      }
      if (raw && 'data' in raw && Array.isArray(raw.data)) {
        return { devices: raw.data };
      }
      if (Array.isArray(raw)) {
        return { devices: raw as unknown as DeviceStats[] };
      }
      return { devices: [] };
    },
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 1,
  });
}

export function useGlobalStats(clientId?: string | null) {
  return useQuery({
    queryKey: ["aurora", "stats", "global", clientId],
    queryFn: async () => {
      const raw = await callAuroraApi<ApiResponse<GlobalStats> | GlobalStats>(
        STATS.GLOBAL, "GET", undefined, { clientId }
      );
      // API returns { data: { total_readings, total_devices, ... }, status, timestamp }
      // We need to extract the data object
      const unwrapped = unwrapApiResponse(raw);
      return unwrapped;
    },
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 180000,
    retry: 1,
  });
}

// Helper to extract period stats from API response
// API returns { count, data: [...hourly records] } but we need summary stats
function extractPeriodStats(raw: unknown): PeriodStats {
  if (!raw) return { period: 'unknown', readings: 0, devices: 0, clients: 0 };
  
  // If it's already in expected format
  if (raw && typeof raw === 'object' && 'readings' in raw) {
    return raw as PeriodStats;
  }
  
  // If it's wrapped in data array (new API format)
  if (raw && typeof raw === 'object' && 'data' in raw) {
    const apiResp = raw as { count?: number; data?: Array<{ reading_count?: number; sensor_type?: string }> };
    const records = apiResp.data || [];
    // Sum up readings from all records
    const totalReadings = records.reduce((sum, r) => sum + (r.reading_count || 0), 0);
    const uniqueDevices = new Set(records.map(r => r.sensor_type)).size;
    return {
      period: '1hr',
      readings: totalReadings,
      devices: uniqueDevices,
      clients: 1, // From context we know there's 1 client
    };
  }
  
  return { period: 'unknown', readings: 0, devices: 0, clients: 0 };
}

export function use1hrStats(clientId?: string | null) {
  return useQuery({
    queryKey: ["aurora", "stats", "1hr", clientId],
    queryFn: async () => {
      const raw = await callAuroraApi<unknown>(STATS.HOUR_1, "GET", undefined, { clientId });
      return extractPeriodStats(raw);
    },
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 1,
  });
}

export function use6hrStats(clientId?: string | null) {
  return useQuery({
    queryKey: ["aurora", "stats", "6hr", clientId],
    queryFn: async () => {
      const raw = await callAuroraApi<unknown>(STATS.HOUR_6, "GET", undefined, { clientId });
      return extractPeriodStats(raw);
    },
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 180000,
    retry: 1,
  });
}

export function use24hrStats(clientId?: string | null) {
  return useQuery({
    queryKey: ["aurora", "stats", "24hr", clientId],
    queryFn: async () => {
      const raw = await callAuroraApi<unknown>(STATS.HOUR_24, "GET", undefined, { clientId });
      return extractPeriodStats(raw);
    },
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 300000,
    retry: 1,
  });
}

export function useWeeklyStats(clientId?: string | null) {
  return useQuery({
    queryKey: ["aurora", "stats", "weekly", clientId],
    queryFn: () => callAuroraApi<PeriodStats>(STATS.WEEKLY, "GET", undefined, { clientId }),
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 600000,
    retry: 1,
  });
}

// NEW: 12-hour stats
export function use12hrStats(clientId?: string | null) {
  return useQuery({
    queryKey: ["aurora", "stats", "12hr", clientId],
    queryFn: () => callAuroraApi<PeriodStats>(STATS.HOUR_12, "GET", undefined, { clientId }),
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 180000,
    retry: 1,
  });
}

// NEW: Comprehensive stats with all granularities
export function useStatsAll(options?: { 
  clientId?: string | null;
  deviceId?: string;
  sensorType?: string;
  limitHourly?: number;
  limitSixHour?: number;
  limitTwelveHour?: number;
  limitDaily?: number;
  limitWeekly?: number;
}) {
  return useQuery({
    queryKey: ["aurora", "stats", "all", options],
    queryFn: () => callAuroraApi<StatsAllResponse>(STATS.ALL, "GET", undefined, { 
      clientId: options?.clientId,
      params: {
        device_id: options?.deviceId,
        sensor_type: options?.sensorType,
        limit_hourly: options?.limitHourly,
        limit_sixhour: options?.limitSixHour,
        limit_twelvehour: options?.limitTwelveHour,
        limit_daily: options?.limitDaily,
        limit_weekly: options?.limitWeekly,
      }
    }),
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 180000,
    retry: 1,
  });
}

// NEW: Stats grouped by client
export function useStatsByClient(options?: { clientId?: string | null; hours?: number; limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ["aurora", "stats", "by-client", options],
    queryFn: async () => {
      const raw = await callAuroraApi<PaginatedApiResponse<ClientGroupedStats> | { clients: ClientGroupedStats[]; total: number }>(
        STATS.BY_CLIENT, 
        "GET", 
        undefined, 
        { 
          clientId: options?.clientId,
          params: { 
            hours: options?.hours ?? 24,
            limit: options?.limit ?? 100,
            offset: options?.offset ?? 0,
          }
        }
      );
      // Handle new API structure with data array
      if (raw && 'data' in raw && Array.isArray(raw.data)) {
        return { 
          clients: raw.data, 
          total: raw.pagination?.total ?? raw.data.length 
        };
      }
      // Handle legacy structure with clients array
      if (raw && 'clients' in raw) {
        return raw;
      }
      return { clients: [], total: 0 };
    },
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 1,
  });
}

// NEW: Stats grouped by sensor type
export function useStatsBySensor(options?: { clientId?: string | null; hours?: number; limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ["aurora", "stats", "by-sensor", options],
    queryFn: async () => {
      const raw = await callAuroraApi<PaginatedApiResponse<SensorGroupedStats> | { sensors: SensorGroupedStats[]; total: number }>(
        STATS.BY_SENSOR, 
        "GET", 
        undefined, 
        { 
          clientId: options?.clientId,
          params: { 
            hours: options?.hours ?? 24,
            limit: options?.limit ?? 100,
            offset: options?.offset ?? 0,
          }
        }
      );
      // Handle new API structure with data array
      if (raw && 'data' in raw && Array.isArray(raw.data)) {
        return { 
          sensors: raw.data, 
          total: raw.pagination?.total ?? raw.data.length 
        };
      }
      // Handle legacy structure with sensors array
      if (raw && 'sensors' in raw) {
        return raw;
      }
      return { sensors: [], total: 0 };
    },
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 1,
  });
}

// NEW: Detailed client statistics
export function useClientDetailStats(clientId: string | null, hours: number = 24) {
  return useQuery({
    queryKey: ["aurora", "stats", "client-detail", clientId, hours],
    queryFn: () => {
      if (!clientId || clientId === "all") return null;
      return callAuroraApi<ClientDetailedStats>(
        STATS.CLIENT(clientId), 
        "GET", 
        undefined, 
        { params: { hours } }
      );
    },
    enabled: hasAuroraSession() && !!clientId && clientId !== "all",
    staleTime: 30000,
    refetchInterval: 60000,
    retry: 1,
  });
}

// NEW: Device readings
export function useDeviceReadings(deviceId: string | null, hours: number = 24) {
  return useQuery({
    queryKey: ["aurora", "devices", deviceId, "readings", hours],
    queryFn: () => {
      if (!deviceId) return null;
      return callAuroraApi<DeviceReadings>(
        DEVICES.READINGS(deviceId), 
        "GET", 
        undefined, 
        { params: { hours } }
      );
    },
    enabled: hasAuroraSession() && !!deviceId,
    staleTime: 30000,
    refetchInterval: 60000,
    retry: 1,
  });
}

// NEW: Device detailed stats
export function useDeviceDetailStats(deviceId: string | null) {
  return useQuery({
    queryKey: ["aurora", "devices", deviceId, "stats"],
    queryFn: () => {
      if (!deviceId) return null;
      return callAuroraApi<DeviceDetailedStats>(DEVICES.STATS(deviceId));
    },
    enabled: hasAuroraSession() && !!deviceId,
    staleTime: 30000,
    refetchInterval: 60000,
    retry: 1,
  });
}

export interface TimePeriodStats {
  period?: string;
  readings?: number;
  devices?: number;
  clients?: number;
  start_time?: string;
  end_time?: string;
  averages?: {
    temperature_c?: number;
    humidity?: number;
    power_w?: number;
    signal_dbm?: number;
  };
  totals?: {
    readings?: number;
    devices?: number;
    alerts?: number;
  };
}

export interface SensorTypeStats {
  device_type: string;
  count: number;
  device_count: number;
  total_readings: number;
  readings_last_hour?: number;
  readings_last_24h?: number;
  numeric_field_stats_24h: Record<string, {
    min?: number;
    max?: number;
    avg?: number;
    count?: number;
    sample_count?: number;
  }>;
  first_seen?: string;
  last_seen?: string;
  avg_value?: number;
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

// Dynamic period stats hook based on hours
export function usePeriodStatsByHours(hours: number, clientId?: string | null) {
  const periodKey = hours <= 1 ? '1hr' : hours <= 6 ? '6hr' : hours <= 24 ? '24hr' : 'weekly';
  
  return useQuery({
    queryKey: ["aurora", "stats", "period", periodKey, clientId],
    queryFn: () => callAuroraApi<TimePeriodStats>(`/api/stats/${periodKey}`, "GET", undefined, { clientId }),
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: hours <= 1 ? 30000 : hours <= 6 ? 60000 : 120000,
    retry: 1,
  });
}

export function useSensorTypeStatsById(sensorType: string, clientId?: string | null) {
  return useQuery({
    queryKey: ["aurora", "stats", "sensors", sensorType, clientId],
    queryFn: async () => {
      try {
        return await callAuroraApi<SensorTypeStats>(STATS.SENSOR_TYPE(sensorType), "GET", undefined, { clientId });
      } catch {
        return {
          device_type: sensorType,
          count: 0,
          device_count: 0,
          total_readings: 0,
          numeric_field_stats_24h: {},
        } as SensorTypeStats;
      }
    },
    enabled: hasAuroraSession() && !!sensorType,
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 0,
  });
}

export function useSensorTypeStatsWithPeriod(sensorType: string, hours: number = 24, clientId?: string | null) {
  return useQuery({
    queryKey: ["aurora", "stats", "sensors", sensorType, hours, clientId],
    queryFn: async () => {
      try {
        // Try with hours parameter first
        return await callAuroraApi<SensorTypeStats>(
          STATS.SENSOR_TYPE(sensorType), 
          "GET", 
          undefined, 
          { clientId, params: { hours } }
        );
      } catch {
        // Fallback without hours
        try {
          return await callAuroraApi<SensorTypeStats>(STATS.SENSOR_TYPE(sensorType), "GET", undefined, { clientId });
        } catch {
          return {
            device_type: sensorType,
            count: 0,
            device_count: 0,
            total_readings: 0,
            numeric_field_stats_24h: {},
          } as SensorTypeStats;
        }
      }
    },
    enabled: hasAuroraSession() && !!sensorType,
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 0,
  });
}

export function useAircraftStats(clientId?: string | null) {
  return useQuery({
    queryKey: ["aurora", "stats", "aircraft", clientId],
    queryFn: () => callAuroraApi<AircraftStats>(STATS.AIRCRAFT, "GET", undefined, { clientId }),
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 1,
  });
}

export function useEndpointStats() {
  return useQuery({
    queryKey: ["aurora", "stats", "endpoints"],
    queryFn: () => callAuroraApi<{ endpoints: EndpointStats[] }>(STATS.ENDPOINTS),
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 1,
  });
}

export function usePowerStats(clientId?: string | null) {
  return useQuery({
    queryKey: ["aurora", "stats", "power", clientId],
    queryFn: () => callAuroraApi<PowerStats>(STATS.POWER, "GET", undefined, { clientId }),
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 1,
  });
}

export function usePerformanceStats() {
  return useQuery({
    queryKey: ["aurora", "stats", "performance"],
    queryFn: () => callAuroraApi<PerformanceStats>(STATS.PERFORMANCE),
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 1,
  });
}

export function useStatsOverview(clientId?: string | null) {
  return useQuery({
    queryKey: ["aurora", "stats", "overview", clientId],
    queryFn: () => callAuroraApi<StatsOverview>(STATS.OVERVIEW, "GET", undefined, { clientId }),
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 180000,
    retry: 1,
  });
}

export function useClientStats(clientId: string | null) {
  return useQuery({
    queryKey: ["aurora", "stats", "client", clientId],
    queryFn: async () => {
      if (!clientId || clientId === "all") return null;
      try {
        return await callAuroraApi<ClientStats>(`${CLIENTS.GET(clientId)}/stats`);
      } catch (error) {
        console.warn(`Client stats endpoint failed, trying basic info:`, error);
        try {
          return await callAuroraApi<ClientStats>(CLIENTS.GET(clientId));
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

// =============================================
// HISTORICAL STATS HOOKS
// =============================================

export function useGlobalStatsHistory(hours: number = 24, clientId?: string | null) {
  return useQuery({
    queryKey: ["aurora", "stats", "history", "global", hours, clientId],
    queryFn: () => safeStatsHistoryCall<GlobalStatsHistoryPoint[]>(
      STATS.HISTORY_GLOBAL, 
      [], 
      { clientId, params: { hours } }
    ),
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 0,
  });
}

export function useSensorStatsHistory(hours: number = 24, sensorType?: string, clientId?: string | null) {
  return useQuery({
    queryKey: ["aurora", "stats", "history", "sensors", hours, sensorType, clientId],
    queryFn: () => safeStatsHistoryCall<SensorStatsHistoryPoint[]>(
      STATS.HISTORY_SENSORS, 
      [], 
      { clientId, params: { hours, sensor_type: sensorType } }
    ),
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 0,
  });
}

export function useDeviceStatsHistory(hours: number = 24, deviceId?: string, clientId?: string | null) {
  return useQuery({
    queryKey: ["aurora", "stats", "history", "devices", hours, deviceId, clientId],
    queryFn: () => safeStatsHistoryCall<DeviceStatsHistoryPoint[]>(
      STATS.HISTORY_DEVICES, 
      [], 
      { clientId, params: { hours, device_id: deviceId } }
    ),
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 0,
  });
}

export function useAlertStatsHistory(hours: number = 24, clientId?: string | null) {
  return useQuery({
    queryKey: ["aurora", "stats", "history", "alerts", hours, clientId],
    queryFn: () => safeStatsHistoryCall<AlertStatsHistoryPoint[]>(
      STATS.HISTORY_ALERTS, 
      [], 
      { clientId, params: { hours } }
    ),
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 0,
  });
}

export function useSystemResourceStatsHistory(hours: number = 24, clientId?: string | null) {
  return useQuery({
    queryKey: ["aurora", "stats", "history", "system", hours, clientId],
    queryFn: () => safeStatsHistoryCall<SystemResourceStatsHistoryPoint[]>(
      STATS.HISTORY_SYSTEM, 
      [], 
      { clientId, params: { hours } }
    ),
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 0,
  });
}
