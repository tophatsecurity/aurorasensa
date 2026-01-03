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

// =============================================
// SENSOR DATA TYPES
// =============================================

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
  acknowledged?: boolean;
  resolved?: boolean;
  device_id?: string;
  rule_id?: number;
}

// =============================================
// ADS-B TYPES
// =============================================

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

export interface AdsbEmergency {
  hex: string;
  flight?: string;
  squawk?: string;
  emergency_type?: string;
  lat?: number;
  lon?: number;
  alt_baro?: number;
  timestamp?: string;
}

export interface AdsbCoverage {
  total_positions?: number;
  unique_aircraft?: number;
  max_range_km?: number;
  avg_altitude_ft?: number;
  coverage_area_km2?: number;
}

export interface AdsbDevice {
  device_id: string;
  device_type: string;
  enabled: boolean;
  frequency?: number;
  gain?: number;
  sdr_type?: string;
}

// =============================================
// DASHBOARD TYPES
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

// =============================================
// COMPREHENSIVE STATS
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

// =============================================
// CLIENT TYPES
// =============================================

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

// =============================================
// DEVICE & BATCH TYPES
// =============================================

export interface DeviceTreeNode {
  device_id: string;
  device_type: string;
  client_id?: string;
  status?: string;
  last_seen?: string;
  children?: DeviceTreeNode[];
}

export interface DeviceStatus {
  device_id: string;
  device_type: string;
  status: string;
  last_seen: string;
  readings_count?: number;
}

export interface BatchInfo {
  batch_id: string;
  client_id: string;
  timestamp: string;
  reading_count: number;
  device_types?: string[];
}

// =============================================
// GEO DATA TYPES
// =============================================

export interface GeoLocation {
  device_id: string;
  lat: number;
  lng: number;
  altitude?: number;
  timestamp?: string;
  accuracy?: number;
}

// =============================================
// BASELINE TYPES
// =============================================

export interface BaselineProfile {
  id: number;
  name: string;
  description?: string;
  sensor_type?: string;
  created_at: string;
  entry_count?: number;
}

export interface BaselineEntry {
  id: number;
  profile_id: number;
  identifier: string;
  identifier_type: string;
  first_seen: string;
  last_seen: string;
  notes?: string;
}

export interface BaselineViolation {
  id: number;
  profile_id: number;
  identifier: string;
  identifier_type: string;
  violation_type: string;
  detected_at: string;
  acknowledged: boolean;
  whitelisted: boolean;
  details?: Record<string, unknown>;
}

// =============================================
// ALERT TYPES
// =============================================

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

export interface AlertStats {
  total_alerts: number;
  active_alerts: number;
  acknowledged_alerts: number;
  resolved_alerts: number;
  alerts_by_severity: Record<string, number>;
  alerts_last_24h: number;
}

export interface AlertSettings {
  email_enabled: boolean;
  email_recipients?: string[];
  webhook_enabled: boolean;
  webhook_url?: string;
  cooldown_seconds?: number;
}

interface AlertRulesResponse {
  count: number;
  rules: AlertRule[];
}

interface SensorsListResponse {
  count: number;
  sensors: SensorData[];
}

interface AlertsResponse {
  count: number;
  alerts: Alert[];
}

// =============================================
// POWER & PERFORMANCE TYPES
// =============================================

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
}

// =============================================
// SYSTEM INFO TYPES
// =============================================

export interface SystemInfo {
  hostname?: string;
  ip_address?: string;
  uptime?: string;
  uptime_seconds?: number;
  cpu_load?: number[];
  memory?: {
    total: number;
    used: number;
    percent: number;
  };
  disk?: {
    total: number;
    used: number;
    percent: number;
  };
  network_interfaces?: Array<{
    name: string;
    ip: string;
    mac?: string;
  }>;
  usb_devices?: Array<{
    device: string;
    vendor?: string;
    product?: string;
  }>;
}

// =============================================
// EXPORT TYPES
// =============================================

export interface ExportFormat {
  format: string;
  description: string;
  mime_type: string;
}

// =============================================
// STARLINK TYPES
// =============================================

export interface StarlinkStats {
  uptime_seconds?: number;
  downlink_throughput_bps?: number;
  uplink_throughput_bps?: number;
  pop_ping_latency_ms?: number;
  snr?: number;
  obstruction_percent_time?: number;
}

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

export interface StarlinkTimeseriesPoint {
  timestamp: string;
  signal_dbm?: number;
  power_w?: number;
  snr?: number;
  downlink_throughput_bps?: number;
  uplink_throughput_bps?: number;
  pop_ping_latency_ms?: number;
}

export interface StarlinkTimeseriesResponse {
  count: number;
  readings: StarlinkTimeseriesPoint[];
}

// =============================================
// THERMAL PROBE TYPES
// =============================================

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

export interface ThermalProbeTimeseriesPoint {
  timestamp: string;
  temp_c?: number;
  temp_f?: number;
  ambient_c?: number;
  probe_c?: number;
  device_id?: string;
}

export interface ThermalProbeTimeseriesResponse {
  count: number;
  readings: ThermalProbeTimeseriesPoint[];
}

// =============================================
// LATEST READINGS TYPES
// =============================================

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

// =============================================
// SENSOR TYPE STATS
// =============================================

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
  total_readings?: number;
  numeric_field_stats_24h?: Record<string, {
    min: number;
    max: number;
    avg: number;
    sample_count: number;
  }>;
}

// =============================================
// HOOKS - SENSORS
// =============================================

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

export function useRecentSensors() {
  return useQuery({
    queryKey: ["aurora", "sensors", "recent"],
    queryFn: async () => {
      const response = await callAuroraApi<SensorsListResponse>("/api/sensors/recent");
      return response.sensors || [];
    },
    refetchInterval: 10000,
    retry: 2,
  });
}

// =============================================
// HOOKS - CLIENTS
// =============================================

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

export function useClientSystemInfo(clientId: string) {
  return useQuery({
    queryKey: ["aurora", "clients", clientId, "system-info"],
    queryFn: () => callAuroraApi<SystemInfo>(`/api/clients/${clientId}/system-info`),
    refetchInterval: 30000,
    retry: 2,
    enabled: !!clientId,
  });
}

export function useAllClientsSystemInfo() {
  return useQuery({
    queryKey: ["aurora", "clients", "system-info", "all"],
    queryFn: () => callAuroraApi<{ clients: Record<string, SystemInfo> }>("/api/clients/system-info/all"),
    refetchInterval: 30000,
    retry: 2,
  });
}

// =============================================
// HOOKS - ALERTS
// =============================================

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

export function useAlertsList() {
  return useQuery({
    queryKey: ["aurora", "alerts", "list"],
    queryFn: async () => {
      const response = await callAuroraApi<AlertsResponse>("/api/alerts/list");
      return response.alerts || [];
    },
    refetchInterval: 30000,
    retry: 2,
  });
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

export function useAlertStats() {
  return useQuery({
    queryKey: ["aurora", "alerts", "stats"],
    queryFn: () => callAuroraApi<AlertStats>("/api/alerts/stats"),
    refetchInterval: 30000,
    retry: 2,
  });
}

export function useAlertSettings() {
  return useQuery({
    queryKey: ["aurora", "alerts", "settings"],
    queryFn: () => callAuroraApi<AlertSettings>("/api/alerts/settings"),
    refetchInterval: 60000,
    retry: 2,
  });
}

export function useDeviceAlerts() {
  return useQuery({
    queryKey: ["aurora", "device-alerts"],
    queryFn: () => callAuroraApi<AlertsResponse>("/api/device-alerts"),
    refetchInterval: 30000,
    retry: 2,
  });
}

// =============================================
// HOOKS - ADS-B
// =============================================

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

export function useAdsbEmergencies() {
  return useQuery({
    queryKey: ["aurora", "adsb", "emergencies"],
    queryFn: () => callAuroraApi<AdsbEmergency[]>("/api/adsb/emergencies"),
    refetchInterval: 10000,
    retry: 2,
  });
}

export function useAdsbLowAltitude() {
  return useQuery({
    queryKey: ["aurora", "adsb", "low-altitude"],
    queryFn: () => callAuroraApi<AdsbAircraft[]>("/api/adsb/low-altitude"),
    refetchInterval: 10000,
    retry: 2,
  });
}

export function useAdsbCoverage() {
  return useQuery({
    queryKey: ["aurora", "adsb", "coverage"],
    queryFn: () => callAuroraApi<AdsbCoverage>("/api/adsb/coverage"),
    refetchInterval: 60000,
    retry: 2,
  });
}

export function useAdsbDevices() {
  return useQuery({
    queryKey: ["aurora", "adsb", "devices"],
    queryFn: () => callAuroraApi<AdsbDevice[]>("/api/adsb/devices"),
    refetchInterval: 60000,
    retry: 2,
  });
}

export function useAdsbNearby(lat?: number, lon?: number, radiusKm: number = 50) {
  return useQuery({
    queryKey: ["aurora", "adsb", "nearby", lat, lon, radiusKm],
    queryFn: () => callAuroraApi<AdsbAircraft[]>(`/api/adsb/nearby?lat=${lat}&lon=${lon}&radius_km=${radiusKm}`),
    refetchInterval: 10000,
    retry: 2,
    enabled: lat !== undefined && lon !== undefined,
  });
}

export function useAdsbAircraftHistory(icao: string) {
  return useQuery({
    queryKey: ["aurora", "adsb", "history", icao],
    queryFn: () => callAuroraApi<Array<{ lat: number; lon: number; alt: number; timestamp: string }>>(`/api/adsb/history/${icao}`),
    retry: 2,
    enabled: !!icao,
  });
}

// =============================================
// HOOKS - DASHBOARD
// =============================================

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

export function useDashboardSystemStats() {
  return useQuery({
    queryKey: ["aurora", "dashboard", "system-stats"],
    queryFn: () => callAuroraApi<DashboardSystemStats>("/api/dashboard/system-stats"),
    refetchInterval: 15000,
    retry: 2,
  });
}

// =============================================
// HOOKS - STATISTICS
// =============================================

export function useComprehensiveStats() {
  return useQuery({
    queryKey: ["aurora", "stats", "comprehensive"],
    queryFn: () => callAuroraApi<ComprehensiveStats>("/api/stats/comprehensive"),
    refetchInterval: 10000,
    retry: 2,
  });
}

export function useDeviceStats() {
  return useQuery({
    queryKey: ["aurora", "stats", "devices"],
    queryFn: () => callAuroraApi<{ total_devices: number; devices: DeviceSummary[] }>("/api/stats/devices"),
    refetchInterval: 10000,
    retry: 2,
  });
}

export function useGlobalStats() {
  return useQuery({
    queryKey: ["aurora", "stats", "global"],
    queryFn: () => callAuroraApi<Record<string, unknown>>("/api/stats/global"),
    refetchInterval: 15000,
    retry: 2,
  });
}

export function useAllSensorStats() {
  return useQuery({
    queryKey: ["aurora", "stats", "sensors"],
    queryFn: () => callAuroraApi<{ sensor_types: SensorTypeStats[] }>("/api/stats/sensors"),
    refetchInterval: 15000,
    retry: 2,
  });
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

export function useAircraftStats() {
  return useQuery({
    queryKey: ["aurora", "stats", "aircraft"],
    queryFn: () => callAuroraApi<Record<string, unknown>>("/api/stats/aircraft"),
    refetchInterval: 15000,
    retry: 2,
  });
}

export function useEndpointStats() {
  return useQuery({
    queryKey: ["aurora", "stats", "endpoints"],
    queryFn: () => callAuroraApi<Record<string, unknown>>("/api/stats/endpoints"),
    refetchInterval: 60000,
    retry: 2,
  });
}

// =============================================
// HOOKS - POWER & PERFORMANCE
// =============================================

export function usePowerStats() {
  return useQuery({
    queryKey: ["aurora", "power", "stats"],
    queryFn: () => callAuroraApi<PowerStats>("/api/power/stats"),
    refetchInterval: 10000,
    retry: 2,
  });
}

export function usePerformanceStats() {
  return useQuery({
    queryKey: ["aurora", "performance", "stats"],
    queryFn: () => callAuroraApi<PerformanceStats>("/api/performance/stats"),
    refetchInterval: 15000,
    retry: 2,
  });
}

// =============================================
// HOOKS - DEVICES & BATCHES
// =============================================

export function useDeviceTree() {
  return useQuery({
    queryKey: ["aurora", "devices", "tree"],
    queryFn: () => callAuroraApi<DeviceTreeNode[]>("/api/devices/tree"),
    refetchInterval: 30000,
    retry: 2,
  });
}

export function useDeviceStatus() {
  return useQuery({
    queryKey: ["aurora", "devices", "status"],
    queryFn: () => callAuroraApi<DeviceStatus[]>("/api/devices/status"),
    refetchInterval: 15000,
    retry: 2,
  });
}

export function useDeviceLatest(deviceId: string) {
  return useQuery({
    queryKey: ["aurora", "devices", deviceId, "latest"],
    queryFn: () => callAuroraApi<LatestReading>(`/api/devices/${deviceId}/latest`),
    refetchInterval: 10000,
    retry: 2,
    enabled: !!deviceId,
  });
}

export function useBatchesList(limit: number = 50) {
  return useQuery({
    queryKey: ["aurora", "batches", "list", limit],
    queryFn: () => callAuroraApi<{ count: number; batches: BatchInfo[] }>(`/api/batches/list?limit=${limit}`),
    refetchInterval: 30000,
    retry: 2,
  });
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

// =============================================
// HOOKS - GEO DATA
// =============================================

export function useGeoLocations() {
  return useQuery({
    queryKey: ["aurora", "geo", "locations"],
    queryFn: () => callAuroraApi<GeoLocation[]>("/api/geo/locations"),
    refetchInterval: 30000,
    retry: 2,
  });
}

// =============================================
// HOOKS - SYSTEM INFO
// =============================================

export function useSystemInfo() {
  return useQuery({
    queryKey: ["aurora", "system", "all"],
    queryFn: () => callAuroraApi<SystemInfo>("/api/system/all"),
    refetchInterval: 30000,
    retry: 2,
  });
}

export function useSystemArp() {
  return useQuery({
    queryKey: ["aurora", "system", "arp"],
    queryFn: () => callAuroraApi<Array<{ ip: string; mac: string; interface: string }>>("/api/system/arp"),
    refetchInterval: 60000,
    retry: 2,
  });
}

export function useSystemRouting() {
  return useQuery({
    queryKey: ["aurora", "system", "routing"],
    queryFn: () => callAuroraApi<Array<{ destination: string; gateway: string; interface: string }>>("/api/system/routing"),
    refetchInterval: 60000,
    retry: 2,
  });
}

export function useSystemInterfaces() {
  return useQuery({
    queryKey: ["aurora", "system", "interfaces"],
    queryFn: () => callAuroraApi<Array<{ name: string; ip: string; mac?: string; status?: string }>>("/api/system/interfaces"),
    refetchInterval: 60000,
    retry: 2,
  });
}

export function useSystemUsb() {
  return useQuery({
    queryKey: ["aurora", "system", "usb"],
    queryFn: () => callAuroraApi<Array<{ device: string; vendor?: string; product?: string }>>("/api/system/usb"),
    refetchInterval: 60000,
    retry: 2,
  });
}

export function useExternalIp() {
  return useQuery({
    queryKey: ["aurora", "system", "external-ip"],
    queryFn: () => callAuroraApi<{ ip: string }>("/api/system/external-ip"),
    refetchInterval: 300000, // 5 minutes
    retry: 2,
  });
}

// =============================================
// HOOKS - BASELINES
// =============================================

export function useBaselineProfiles() {
  return useQuery({
    queryKey: ["aurora", "baselines", "profiles"],
    queryFn: () => callAuroraApi<BaselineProfile[]>("/api/baselines/profiles"),
    refetchInterval: 60000,
    retry: 2,
  });
}

export function useBaselineEntries(profileId: number) {
  return useQuery({
    queryKey: ["aurora", "baselines", "profiles", profileId, "entries"],
    queryFn: () => callAuroraApi<BaselineEntry[]>(`/api/baselines/profiles/${profileId}/entries`),
    refetchInterval: 60000,
    retry: 2,
    enabled: !!profileId,
  });
}

export function useBaselineViolations() {
  return useQuery({
    queryKey: ["aurora", "baselines", "violations"],
    queryFn: () => callAuroraApi<BaselineViolation[]>("/api/baselines/violations"),
    refetchInterval: 30000,
    retry: 2,
  });
}

// =============================================
// HOOKS - EXPORT
// =============================================

export function useExportFormats() {
  return useQuery({
    queryKey: ["aurora", "export", "formats"],
    queryFn: () => callAuroraApi<ExportFormat[]>("/api/export/formats"),
    staleTime: 300000, // 5 minutes
    retry: 2,
  });
}

// =============================================
// HOOKS - STARLINK
// =============================================

export function useStarlinkStats() {
  return useQuery({
    queryKey: ["aurora", "starlink", "stats"],
    queryFn: () => callAuroraApi<StarlinkStats>("/api/starlink/stats"),
    refetchInterval: 15000,
    retry: 2,
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
    refetchInterval: 15000,
    retry: 1,
  });
}

export function useStarlinkTimeseries(hours: number = 24) {
  return useQuery({
    queryKey: ["aurora", "starlink", "timeseries", hours],
    queryFn: async () => {
      try {
        const response = await callAuroraApi<StarlinkTimeseriesResponse>(`/api/readings/sensor/starlink?hours=${hours}`);
        return response;
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
    refetchInterval: 30000,
    retry: 1,
  });
}

// =============================================
// HOOKS - THERMAL PROBE
// =============================================

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

export function useThermalProbeTimeseries(hours: number = 24) {
  return useQuery({
    queryKey: ["aurora", "thermal_probe", "timeseries", hours],
    queryFn: async () => {
      try {
        const response = await callAuroraApi<ThermalProbeTimeseriesResponse>(`/api/readings/sensor/thermal_probe?hours=${hours}`);
        return response;
      } catch {
        try {
          const fallback = await callAuroraApi<ThermalProbeTimeseriesResponse>(`/api/stats/sensors/thermal_probe`);
          return fallback;
        } catch (error) {
          console.warn("Failed to fetch thermal probe timeseries:", error);
          return { count: 0, readings: [] };
        }
      }
    },
    refetchInterval: 30000,
    retry: 1,
  });
}

// =============================================
// HOOKS - LOGS
// =============================================

export function useLogs(limit: number = 100) {
  return useQuery({
    queryKey: ["aurora", "logs", limit],
    queryFn: () => callAuroraApi<Array<{ timestamp: string; level: string; message: string }>>(`/api/logs?limit=${limit}`),
    refetchInterval: 30000,
    retry: 2,
  });
}

export function useDatacollectorLogs() {
  return useQuery({
    queryKey: ["aurora", "logs", "datacollector"],
    queryFn: () => callAuroraApi<string>("/api/logs/datacollector"),
    refetchInterval: 30000,
    retry: 2,
  });
}

export function useDataserverLogs() {
  return useQuery({
    queryKey: ["aurora", "logs", "dataserver"],
    queryFn: () => callAuroraApi<string>("/api/logs/dataserver"),
    refetchInterval: 30000,
    retry: 2,
  });
}

// =============================================
// HOOKS - HEALTH
// =============================================

export function useHealth() {
  return useQuery({
    queryKey: ["aurora", "health"],
    queryFn: () => callAuroraApi<{ status: string; timestamp: string }>("/api/health"),
    refetchInterval: 30000,
    retry: 2,
  });
}

// =============================================
// MUTATIONS - CLIENT
// =============================================

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

export function useDeleteClient() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (clientId: string) => {
      return callAuroraApi<{ success: boolean; message: string }>(`/api/clients/${clientId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aurora", "clients"] });
    },
  });
}

// =============================================
// MUTATIONS - ALERTS
// =============================================

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

export function useCreateAlertRule() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (rule: Omit<AlertRule, 'id'>) => {
      return callAuroraApi<{ success: boolean; message: string; id?: number }>("/api/alerts/rules", "POST", rule);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aurora", "alerts", "rules"] });
    },
  });
}

export function useAcknowledgeAlert() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (alertId: string) => {
      return callAuroraApi<{ success: boolean; message: string }>(`/api/alerts/${alertId}/acknowledge`, "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aurora", "alerts"] });
    },
  });
}

export function useResolveAlert() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (alertId: string) => {
      return callAuroraApi<{ success: boolean; message: string }>(`/api/alerts/${alertId}/resolve`, "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aurora", "alerts"] });
    },
  });
}

export function useUpdateAlertSettings() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (settings: AlertSettings) => {
      return callAuroraApi<{ success: boolean; message: string }>("/api/alerts/settings", "PUT", settings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aurora", "alerts", "settings"] });
    },
  });
}

// =============================================
// MUTATIONS - BASELINES
// =============================================

export function useCreateBaselineProfile() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (profile: { name: string; description?: string; sensor_type?: string }) => {
      return callAuroraApi<{ success: boolean; id?: number }>("/api/baselines/profiles", "POST", profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aurora", "baselines", "profiles"] });
    },
  });
}

export function useAcknowledgeViolation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (violationId: number) => {
      return callAuroraApi<{ success: boolean }>(`/api/baselines/violations/${violationId}/acknowledge`, "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aurora", "baselines", "violations"] });
    },
  });
}

export function useWhitelistViolation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (violationId: number) => {
      return callAuroraApi<{ success: boolean }>(`/api/baselines/violations/${violationId}/whitelist`, "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aurora", "baselines", "violations"] });
    },
  });
}

// =============================================
// MUTATIONS - GEO
// =============================================

export function useUpdateGeoLocation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (location: GeoLocation) => {
      return callAuroraApi<{ success: boolean }>("/api/geo/update", "POST", location);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aurora", "geo", "locations"] });
    },
  });
}

// =============================================
// MUTATIONS - SENSORS
// =============================================

export function useAddSensor() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (sensor: Partial<SensorData>) => {
      return callAuroraApi<{ success: boolean; id?: string }>("/api/sensors/add", "POST", sensor);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aurora", "sensors"] });
    },
  });
}

export function useUpdateSensor() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ sensorId, updates }: { sensorId: string; updates: Partial<SensorData> }) => {
      return callAuroraApi<{ success: boolean }>(`/api/sensors/${sensorId}`, "PUT", updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aurora", "sensors"] });
    },
  });
}

export function useDeleteSensor() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (sensorId: string) => {
      return callAuroraApi<{ success: boolean }>(`/api/sensors/${sensorId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aurora", "sensors"] });
    },
  });
}
