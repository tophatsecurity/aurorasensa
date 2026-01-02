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
    throw new Error(`Aurora API error: ${error.message}`);
  }

  if ((data as AuroraProxyResponse)?.error) {
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
      const response = await callAuroraApi<LatestReadingsResponse>("/api/readings/latest");
      return response.readings || [];
    },
    refetchInterval: 10000,
    retry: 2,
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
