import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface AuroraProxyResponse {
  error?: string;
}

async function callAuroraApi<T>(path: string, method: string = "GET", body?: unknown): Promise<T> {
  const { data, error } = await supabase.functions.invoke("aurora-proxy", {
    body: { path, method, body },
  });

  if (error) {
    console.error(`Aurora API error for ${path}:`, error.message);
    throw new Error(`Aurora API error: ${error.message}`);
  }

  // Handle backend errors returned in the response body
  if (data && typeof data === 'object' && 'detail' in data) {
    console.error(`Aurora backend error for ${path}:`, data.detail);
    throw new Error(String(data.detail));
  }

  if ((data as AuroraProxyResponse)?.error) {
    console.error(`Aurora API response error for ${path}:`, (data as AuroraProxyResponse).error);
    throw new Error((data as AuroraProxyResponse).error);
  }

  return data as T;
}

// Sensor data types
export interface SensorData {
  id: string;
  name: string;
  type: string;
  value: number;
  unit: string;
  status: string;
  lastUpdate: string;
  location?: {
    lat: number;
    lng: number;
  };
}

export interface SensorStats {
  avgTemperature: number;
  avgSignal: number;
  avgPower: number;
  totalSensors: number;
}

export interface Alert {
  id: string;
  type: string;
  message: string;
  severity: string;
  timestamp: string;
}

export interface AdsbAircraft {
  hex: string;
  flight?: string;
  alt_baro?: number;
  alt_geom?: number;
  gs?: number;
  track?: number;
  lat?: number;
  lon?: number;
  squawk?: string;
  category?: string;
  seen?: number;
  rssi?: number;
}

export interface AdsbStats {
  device_id?: string;
  sdr_type?: string;
  messages_decoded?: number;
  aircraft_tracked_total?: number;
  aircraft_active?: number;
  positions_received?: number;
  uptime_seconds?: number;
}

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

// Comprehensive stats from /api/stats/comprehensive
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

// Client/Device data types
export interface ClientSensorConfig {
  device_id: string;
  enabled: boolean;
  [key: string]: unknown;
}

export interface Client {
  client_id: string;
  hostname: string;
  ip_address: string;
  mac_address: string;
  last_seen: string;
  adopted_at: string;
  batches_received: number;
  auto_registered: boolean;
  status?: string;
  sensors?: string[];
  metadata?: {
    config?: {
      project?: { name: string; version: string };
      sensors?: {
        arduino_devices?: ClientSensorConfig[];
        adsb_devices?: ClientSensorConfig[];
        lora?: ClientSensorConfig;
        starlink?: ClientSensorConfig;
        wifi?: ClientSensorConfig;
        bluetooth?: ClientSensorConfig;
        gps?: ClientSensorConfig;
        thermal_probe?: ClientSensorConfig;
        system_monitor?: ClientSensorConfig;
      };
    };
    system?: {
      cpu_percent?: number;
      memory_percent?: number;
      disk_percent?: number;
      uptime_seconds?: number;
    };
  };
}

interface ClientsListResponse {
  count: number;
  clients: Client[];
}

// Sensors list response from Aurora API
interface SensorsListResponse {
  count: number;
  sensors: SensorData[];
}

// Alerts list response
interface AlertsResponse {
  count: number;
  alerts: Alert[];
}

// Hooks
export function useSensors() {
  return useQuery({
    queryKey: ["aurora", "sensors"],
    queryFn: async () => {
      const response = await callAuroraApi<SensorsListResponse>("/api/sensors/list");
      return response.sensors || [];
    },
    refetchInterval: 10000,
    retry: 2,
  });
}

export function useClients() {
  return useQuery({
    queryKey: ["aurora", "clients"],
    queryFn: async () => {
      const response = await callAuroraApi<ClientsListResponse>("/api/clients/list");
      return response.clients || [];
    },
    refetchInterval: 15000,
    retry: 2,
  });
}

export function useAlerts() {
  return useQuery({
    queryKey: ["aurora", "alerts"],
    queryFn: async () => {
      const response = await callAuroraApi<AlertsResponse>("/api/alerts");
      return response.alerts || [];
    },
    refetchInterval: 30000,
    retry: 2,
  });
}

export function useAdsbAircraft() {
  return useQuery({
    queryKey: ["aurora", "adsb", "aircraft"],
    queryFn: () => callAuroraApi<AdsbAircraft[]>("/api/adsb/aircraft"),
    refetchInterval: 5000,
    retry: 2,
  });
}

export function useAdsbStats() {
  return useQuery({
    queryKey: ["aurora", "adsb", "stats"],
    queryFn: () => callAuroraApi<AdsbStats>("/api/adsb/stats"),
    refetchInterval: 10000,
    retry: 2,
  });
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ["aurora", "dashboard", "stats"],
    queryFn: () => callAuroraApi<DashboardStats>("/api/dashboard/sensor-stats"),
    refetchInterval: 10000,
    retry: 2,
  });
}

export function useDashboardTimeseries(hours: number = 24) {
  return useQuery({
    queryKey: ["aurora", "dashboard", "timeseries", hours],
    queryFn: () => callAuroraApi<DashboardTimeseries>(`/api/dashboard/sensor-timeseries?hours=${hours}`),
    refetchInterval: 30000,
    retry: 2,
  });
}

// New comprehensive stats hook - provides all stats in one call
export function useComprehensiveStats() {
  return useQuery({
    queryKey: ["aurora", "stats", "comprehensive"],
    queryFn: () => callAuroraApi<ComprehensiveStats>("/api/stats/comprehensive"),
    refetchInterval: 10000,
    retry: 2,
  });
}

// Device stats hook
export function useDeviceStats() {
  return useQuery({
    queryKey: ["aurora", "stats", "devices"],
    queryFn: () => callAuroraApi<{ total_devices: number; devices: DeviceSummary[] }>("/api/stats/devices"),
    refetchInterval: 10000,
    retry: 2,
  });
}

// Alert Rules types and hook
export interface AlertRule {
  id: number;
  name: string;
  description: string;
  rule_type: string;
  sensor_type_filter: string;
  severity: string;
  enabled: boolean;
  conditions: {
    field: string;
    operator?: string | null;
    threshold: string;
  };
}

interface AlertRulesResponse {
  count: number;
  rules: AlertRule[];
}

export function useAlertRules() {
  return useQuery({
    queryKey: ["aurora", "alerts", "rules"],
    queryFn: async () => {
      const response = await callAuroraApi<AlertRulesResponse>("/api/alerts/rules");
      return response;
    },
    refetchInterval: 60000,
    retry: 2,
  });
}

// Power stats hook
export interface PowerStats {
  count: number;
  readings: Array<{
    timestamp: string;
    power_w?: number;
    voltage?: number;
    current?: number;
  }>;
  timestamp: string;
}

export function usePowerStats() {
  return useQuery({
    queryKey: ["aurora", "power", "stats"],
    queryFn: () => callAuroraApi<PowerStats>("/api/power/stats"),
    refetchInterval: 10000,
    retry: 2,
  });
}

// Latest sensor readings hook
export interface LatestReading {
  device_id: string;
  device_type: string;
  timestamp: string;
  data: Record<string, unknown>;
}

interface LatestReadingsResponse {
  count: number;
  readings: LatestReading[];
}

export function useLatestReadings() {
  return useQuery({
    queryKey: ["aurora", "readings", "latest"],
    queryFn: async () => {
      try {
        const response = await callAuroraApi<LatestReadingsResponse>("/api/readings/latest");
        return response.readings || [];
      } catch (error) {
        console.warn("Failed to fetch latest readings, returning empty array:", error);
        return [];
      }
    },
    refetchInterval: 10000,
    retry: 1,
  });
}

// Starlink stats hook
export interface StarlinkStats {
  uptime_seconds?: number;
  downlink_throughput_bps?: number;
  uplink_throughput_bps?: number;
  pop_ping_latency_ms?: number;
  snr?: number;
  obstruction_percent_time?: number;
}

export function useStarlinkStats() {
  return useQuery({
    queryKey: ["aurora", "starlink", "stats"],
    queryFn: () => callAuroraApi<StarlinkStats>("/api/starlink/stats"),
    refetchInterval: 15000,
    retry: 2,
  });
}

// Sensor type specific stats hook
export interface SensorTypeStats {
  device_type: string;
  count: number;
  device_count: number;
  avg_value?: number;
  min_value?: number;
  max_value?: number;
  latest_reading?: Record<string, unknown>;
  first_seen?: string;
  last_seen?: string;
  readings_last_hour?: number;
  readings_last_24h?: number;
}

export function useSensorTypeStats(sensorType: string) {
  return useQuery({
    queryKey: ["aurora", "stats", "sensors", sensorType],
    queryFn: async () => {
      try {
        const response = await callAuroraApi<SensorTypeStats>(`/api/stats/sensors/${sensorType}`);
        return response;
      } catch (error) {
        console.warn(`Failed to fetch sensor type stats for ${sensorType}:`, error);
        return null;
      }
    },
    refetchInterval: 15000,
    retry: 1,
    enabled: !!sensorType,
  });
}

// Starlink readings for signal/power data
export interface StarlinkReading {
  timestamp: string;
  signal_dbm?: number;
  power_w?: number;
  snr?: number;
  downlink_throughput_bps?: number;
  uplink_throughput_bps?: number;
  pop_ping_latency_ms?: number;
}

export interface StarlinkReadingsResponse {
  count: number;
  readings: StarlinkReading[];
  avg_signal_dbm?: number;
  avg_power_w?: number;
  avg_snr?: number;
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
    refetchInterval: 15000,
    retry: 1,
  });
}

// Thermal probe readings
export interface ThermalProbeReading {
  timestamp: string;
  temp_c?: number;
  temp_f?: number;
  ambient_c?: number;
  probe_c?: number;
}

export interface ThermalProbeStats {
  count: number;
  readings?: ThermalProbeReading[];
  avg_temp_c?: number;
  min_temp_c?: number;
  max_temp_c?: number;
  latest_reading?: Record<string, unknown>;
}

export function useThermalProbeStats() {
  return useQuery({
    queryKey: ["aurora", "stats", "sensors", "thermal_probe"],
    queryFn: async () => {
      try {
        const response = await callAuroraApi<ThermalProbeStats>(`/api/stats/sensors/thermal_probe`);
        return response;
      } catch (error) {
        console.warn("Failed to fetch thermal probe stats:", error);
        return null;
      }
    },
    refetchInterval: 15000,
    retry: 1,
  });
}

// Adopt client mutation
export function useAdoptClient() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (clientId: string) => {
      return callAuroraApi<{ success: boolean; message: string }>(`/api/clients/${clientId}/adopt`, "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aurora", "clients"] });
    },
  });
}

// Update alert rule mutation (enable/disable or edit)
export interface UpdateAlertRulePayload {
  name?: string;
  description?: string;
  enabled?: boolean;
  severity?: string;
  sensor_type_filter?: string;
  conditions?: {
    field: string;
    operator?: string | null;
    threshold: string;
  };
}

export function useUpdateAlertRule() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ ruleId, updates }: { ruleId: number; updates: UpdateAlertRulePayload }) => {
      return callAuroraApi<{ success: boolean; message: string }>(`/api/alerts/rules/${ruleId}`, "PUT", updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aurora", "alerts", "rules"] });
    },
  });
}

// Delete alert rule mutation
export function useDeleteAlertRule() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (ruleId: number) => {
      return callAuroraApi<{ success: boolean; message: string }>(`/api/alerts/rules/${ruleId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aurora", "alerts", "rules"] });
    },
  });
}
