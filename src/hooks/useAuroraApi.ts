import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const AURORA_DIRECT_URL = "http://aurora.tophatsecurity.com:9151";
const USE_DIRECT_API = true; // Try direct API calls first, fallback to proxy

interface AuroraProxyResponse {
  error?: string;
}

async function callAuroraApiDirect<T>(path: string, method: string = "GET", body?: unknown): Promise<T> {
  const url = `${AURORA_DIRECT_URL}${path}`;
  
  const options: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };

  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  
  if (!response.ok) {
    throw new Error(`Aurora API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function callAuroraApiProxy<T>(path: string, method: string = "GET", body?: unknown): Promise<T> {
  const { data, error } = await supabase.functions.invoke("aurora-proxy", {
    body: { path, method, body },
  });

  if (error) {
    console.error(`Aurora API error for ${path}:`, error.message);
    throw new Error(`Aurora API error: ${error.message}`);
  }

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

async function callAuroraApi<T>(path: string, method: string = "GET", body?: unknown): Promise<T> {
  if (USE_DIRECT_API) {
    try {
      return await callAuroraApiDirect<T>(path, method, body);
    } catch (error) {
      // If direct call fails (likely CORS), fall back to proxy
      console.warn(`Direct API call failed for ${path}, falling back to proxy:`, error);
      return callAuroraApiProxy<T>(path, method, body);
    }
  }
  return callAuroraApiProxy<T>(path, method, body);
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
  gs?: number;              // Ground speed in knots
  track?: number;           // Track angle in degrees
  lat?: number;
  lon?: number;
  squawk?: string;
  category?: string;        // Aircraft category (A0-D7)
  seen?: number;            // Seconds since last message
  rssi?: number;            // Signal strength in dBFS
  // Extended fields from API
  baro_rate?: number;       // Barometric altitude rate (ft/min)
  geom_rate?: number;       // Geometric altitude rate (ft/min)
  ias?: number;             // Indicated airspeed (knots)
  tas?: number;             // True airspeed (knots)
  mach?: number;            // Mach number
  mag_heading?: number;     // Magnetic heading (degrees)
  true_heading?: number;    // True heading (degrees)
  nav_altitude_mcp?: number; // Selected altitude (MCP/FCU)
  nav_altitude_fms?: number; // Selected altitude (FMS)
  nav_qnh?: number;         // Altimeter setting (hPa)
  nav_heading?: number;     // Selected heading (degrees)
  nic?: number;             // Navigation Integrity Category
  rc?: number;              // Radius of containment (meters)
  version?: number;         // ADS-B version
  nic_baro?: number;        // NIC Baro supplement
  nac_p?: number;           // Navigation Accuracy Category - Position
  nac_v?: number;           // Navigation Accuracy Category - Velocity
  sil?: number;             // Source Integrity Level
  sil_type?: string;        // SIL supplement
  gva?: number;             // Geometric Vertical Accuracy
  sda?: number;             // System Design Assurance
  emergency?: string;       // Emergency status
  messages?: number;        // Message count
  seen_pos?: number;        // Seconds since last position
  mlat?: string[];          // MLAT data sources
  tisb?: string[];          // TIS-B data sources
  type?: string;            // Aircraft type code
  registration?: string;    // Aircraft registration
  operator?: string;        // Aircraft operator/airline
  operator_icao?: string;   // ICAO operator code
  operator_callsign?: string; // Operator callsign
  owner?: string;           // Aircraft owner
  year_built?: number;      // Year aircraft was built
  description?: string;     // Aircraft description
  dbFlags?: number;         // Database flags
  country?: string;         // Registration country
  military?: boolean;       // Is military aircraft
}

export interface AdsbStats {
  device_id?: string;
  sdr_type?: string;
  messages_decoded?: number;
  aircraft_tracked_total?: number;
  aircraft_active?: number;
  positions_received?: number;
  uptime_seconds?: number;
  // Extended stats from API
  messages_per_second?: number;
  max_range_nm?: number;
  local_receiver?: boolean;
  sample_rate?: number;
  gain?: number;
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
  // Extended fields
  description?: string;
  severity?: string;
}

export interface AdsbCoverage {
  total_positions?: number;
  unique_aircraft?: number;
  max_range_km?: number;
  avg_altitude_ft?: number;
  coverage_area_km2?: number;
  // Extended coverage stats
  min_range_km?: number;
  avg_range_km?: number;
  positions_per_hour?: number;
  distinct_squawks?: number;
}

export interface AdsbDevice {
  device_id: string;
  device_type: string;
  enabled: boolean;
  frequency?: number;
  gain?: number;
  sdr_type?: string;
  // Extended device info
  sample_rate?: number;
  ppm_error?: number;
  bias_tee?: boolean;
  agc?: boolean;
  last_seen?: string;
  status?: string;
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

export type ClientState = "pending" | "registered" | "adopted" | "disabled" | "suspended" | "deleted";

export interface ClientSensorConfig {
  device_id: string;
  enabled: boolean;
  [key: string]: unknown;
}

export interface ClientStateHistoryEntry {
  from_state: ClientState | null;
  to_state: ClientState;
  timestamp: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface Client {
  client_id: string;
  hostname: string;
  ip_address: string;
  mac_address: string;
  last_seen: string;
  first_seen?: string;
  adopted_at: string | null;
  registered_at?: string;
  batches_received: number;
  batch_count?: number;
  auto_registered: boolean;
  status?: string;
  state?: ClientState;
  state_history?: ClientStateHistoryEntry[];
  last_state_change?: string;
  disabled_at?: string;
  disabled_reason?: string;
  suspended_at?: string;
  suspended_reason?: string;
  deleted_at?: string;
  deleted_reason?: string;
  batch_directory?: string;
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
    registered_at?: string;
    last_seen?: string;
    last_config_update?: string;
  };
}

interface ClientsListResponse {
  count: number;
  clients: Client[];
}

interface ClientsByStateResponse {
  clients_by_state: {
    pending: Client[];
    registered: Client[];
    adopted: Client[];
    disabled: Client[];
    suspended: Client[];
    deleted: Client[];
  };
  statistics: {
    total: number;
    by_state: Record<ClientState, number>;
    summary: {
      active: number;
      needs_attention: number;
      inactive: number;
    };
  };
}

interface ClientStatisticsResponse {
  total: number;
  by_state: Record<ClientState, number>;
  summary: {
    active: number;
    needs_attention: number;
    inactive: number;
  };
}

interface ClientStateResponse {
  state: ClientState;
  clients: Client[];
  count: number;
  description: string;
}

interface StateTransitionRequest {
  reason?: string;
  metadata?: Record<string, unknown>;
}

interface StateTransitionResponse {
  success: boolean;
  message: string;
  client_id: string;
  new_state: ClientState;
  previous_state: ClientState;
}

interface ClientStateHistoryResponse {
  client_id: string;
  current_state: ClientState;
  state_history: ClientStateHistoryEntry[];
  last_state_change: string;
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
// USER MANAGEMENT TYPES
// =============================================

export interface User {
  username: string;
  role: string;
  created_at?: string;
  last_login?: string;
}

// =============================================
// AUDIT TYPES
// =============================================

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  resource: string;
  details?: Record<string, unknown>;
  ip_address?: string;
}

export interface AuditStats {
  total_logs: number;
  actions_by_type: Record<string, number>;
  actions_last_24h: number;
  unique_users: number;
}

// =============================================
// CONFIGURATION TYPES
// =============================================

export interface ServerConfig {
  [key: string]: unknown;
}

// =============================================
// WIFI MANAGEMENT TYPES
// =============================================

export interface WifiMode {
  mode: string;
  description?: string;
}

export interface WifiConfig {
  ssid?: string;
  password?: string;
  channel?: number;
  mode?: string;
  [key: string]: unknown;
}

export interface WifiStatus {
  connected: boolean;
  ssid?: string;
  signal_strength?: number;
  ip_address?: string;
  mac_address?: string;
}

export interface WifiNetwork {
  ssid: string;
  bssid?: string;
  signal_strength?: number;
  channel?: number;
  security?: string;
}

export interface WifiClient {
  mac: string;
  ip?: string;
  hostname?: string;
  connected_at?: string;
}

// =============================================
// NETSTAT TYPES
// =============================================

export interface NetstatEntry {
  protocol: string;
  local_address: string;
  foreign_address: string;
  state?: string;
  pid?: number;
  program?: string;
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
  client_id?: string;
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

export function useClientsByState() {
  return useQuery({
    queryKey: ["aurora", "clients", "all-states"],
    queryFn: async () => {
      return callAuroraApi<ClientsByStateResponse>("/api/clients/all-states");
    },
    refetchInterval: 15000,
    retry: 2,
  });
}

export function useClientStatistics() {
  return useQuery({
    queryKey: ["aurora", "clients", "statistics"],
    queryFn: async () => {
      return callAuroraApi<ClientStatisticsResponse>("/api/clients/statistics");
    },
    refetchInterval: 15000,
    retry: 2,
  });
}

export function usePendingClients() {
  return useQuery({
    queryKey: ["aurora", "clients", "pending"],
    queryFn: async () => {
      const response = await callAuroraApi<ClientStateResponse>("/api/clients/pending");
      return response.clients || [];
    },
    refetchInterval: 15000,
    retry: 2,
  });
}

export function useAdoptedClients() {
  return useQuery({
    queryKey: ["aurora", "clients", "adopted"],
    queryFn: async () => {
      const response = await callAuroraApi<ClientStateResponse>("/api/clients/adopted");
      return response.clients || [];
    },
    refetchInterval: 15000,
    retry: 2,
  });
}

export function useRegisteredClients() {
  return useQuery({
    queryKey: ["aurora", "clients", "registered"],
    queryFn: async () => {
      const response = await callAuroraApi<ClientStateResponse>("/api/clients/registered");
      return response.clients || [];
    },
    refetchInterval: 15000,
    retry: 2,
  });
}

export function useDisabledClients() {
  return useQuery({
    queryKey: ["aurora", "clients", "disabled"],
    queryFn: async () => {
      const response = await callAuroraApi<ClientStateResponse>("/api/clients/disabled");
      return response.clients || [];
    },
    refetchInterval: 15000,
    retry: 2,
  });
}

export function useSuspendedClients() {
  return useQuery({
    queryKey: ["aurora", "clients", "suspended"],
    queryFn: async () => {
      const response = await callAuroraApi<ClientStateResponse>("/api/clients/suspended");
      return response.clients || [];
    },
    refetchInterval: 15000,
    retry: 2,
  });
}

export function useDeletedClients() {
  return useQuery({
    queryKey: ["aurora", "clients", "deleted"],
    queryFn: async () => {
      const response = await callAuroraApi<ClientStateResponse>("/api/clients/deleted");
      return response.clients || [];
    },
    refetchInterval: 15000,
    retry: 2,
  });
}

export function useClientStateHistory(clientId: string) {
  return useQuery({
    queryKey: ["aurora", "clients", clientId, "state-history"],
    queryFn: async () => {
      return callAuroraApi<ClientStateHistoryResponse>(`/api/clients/${clientId}/state-history`);
    },
    enabled: !!clientId,
    retry: 2,
  });
}

export function useClientSystemInfo(clientId: string) {
  return useQuery({
    queryKey: ["aurora", "clients", clientId, "system-info"],
    queryFn: async () => {
      try {
        return await callAuroraApi<SystemInfo>(`/api/clients/${clientId}/system-info`);
      } catch (error) {
        // Return null for 404 errors (client has no system info)
        if (error instanceof Error && (error.message.includes('No system info found') || error.message.includes('404'))) {
          return null;
        }
        throw error;
      }
    },
    refetchInterval: 30000,
    retry: (failureCount, error) => {
      // Don't retry on 404 (no system info)
      if (error instanceof Error && (error.message.includes('No system info found') || error.message.includes('404'))) {
        return false;
      }
      return failureCount < 2;
    },
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

// Historical ADSB readings from sensor data (fallback when live is empty)
export interface AdsbHistoricalReading {
  device_id: string;
  device_type: string;
  timestamp: string;
  data: {
    hex?: string;
    flight?: string;
    alt_baro?: number;
    alt_geom?: number;
    gs?: number;
    track?: number;
    lat?: number;
    lon?: number;
    squawk?: string;
    category?: string;
    rssi?: number;
    seen?: number;
    [key: string]: unknown;
  };
}

interface AdsbHistoricalResponse {
  count: number;
  readings: AdsbHistoricalReading[];
}

export function useAdsbHistorical(minutes: number = 60) {
  return useQuery({
    queryKey: ["aurora", "adsb", "historical", minutes],
    queryFn: async () => {
      const response = await callAuroraApi<AdsbHistoricalResponse>(
        `/api/readings/sensor/adsb?hours=${Math.ceil(minutes / 60)}`
      );
      return response;
    },
    refetchInterval: 30000,
    retry: 2,
  });
}

// Combined hook that uses live data or falls back to historical
export function useAdsbAircraftWithHistory(historyMinutes: number = 60) {
  const liveQuery = useAdsbAircraft();
  const historicalQuery = useAdsbHistorical(historyMinutes);
  
  const combinedData = useMemo(() => {
    // If we have live aircraft data, use it
    if (liveQuery.data && liveQuery.data.length > 0) {
      return {
        aircraft: liveQuery.data,
        isHistorical: false,
        source: 'live' as const,
      };
    }
    
    // Otherwise, try to use historical data
    if (historicalQuery.data?.readings && historicalQuery.data.readings.length > 0) {
      // Convert historical readings to AdsbAircraft format
      // The ADSB data can be in data.aircraft_list or directly in data
      const aircraftMap = new Map<string, AdsbAircraft>();
      
      historicalQuery.data.readings.forEach(reading => {
        const data = reading.data;
        
        // Check if aircraft_list exists (new format)
        const aircraftList = (data as { aircraft_list?: Array<Record<string, unknown>> }).aircraft_list;
        
        if (aircraftList && Array.isArray(aircraftList)) {
          // Process aircraft from aircraft_list
          aircraftList.forEach(ac => {
            const hex = String(ac.icao || ac.hex || '');
            if (!hex) return;
            
            const existing = aircraftMap.get(hex);
            if (!existing) {
              aircraftMap.set(hex, {
                hex,
                flight: ac.callsign as string || ac.flight as string,
                alt_baro: ac.altitude_ft as number || ac.alt_baro as number,
                alt_geom: ac.alt_geom as number,
                gs: ac.groundspeed_knots as number || ac.gs as number,
                track: ac.track as number,
                lat: ac.latitude as number || ac.lat as number,
                lon: ac.longitude as number || ac.lon as number,
                squawk: ac.squawk as string,
                category: ac.category as string,
                rssi: ac.rssi as number,
                seen: ac.last_seen ? Math.floor((Date.now() - new Date(ac.last_seen as string).getTime()) / 1000) : 0,
              });
            }
          });
        } else {
          // Old format: aircraft data directly in data object
          const key = data.hex || data.flight || reading.device_id;
          
          if (key && data.lat !== undefined && data.lon !== undefined) {
            const existing = aircraftMap.get(key);
            const readingTime = new Date(reading.timestamp).getTime();
            const existingTime = existing ? new Date(existing.seen ? Date.now() - existing.seen * 1000 : 0).getTime() : 0;
            
            if (!existing || readingTime > existingTime) {
              aircraftMap.set(key, {
                hex: data.hex || key,
                flight: data.flight,
                alt_baro: data.alt_baro,
                alt_geom: data.alt_geom,
                gs: data.gs,
                track: data.track,
                lat: data.lat,
                lon: data.lon,
                squawk: data.squawk,
                category: data.category,
                rssi: data.rssi,
                seen: Math.floor((Date.now() - new Date(reading.timestamp).getTime()) / 1000),
              });
            }
          }
        }
      });
      
      return {
        aircraft: Array.from(aircraftMap.values()),
        isHistorical: true,
        source: 'historical' as const,
      };
    }
    
    return {
      aircraft: [],
      isHistorical: false,
      source: 'none' as const,
    };
  }, [liveQuery.data, historicalQuery.data]);
  
  return {
    ...combinedData,
    isLoading: liveQuery.isLoading || historicalQuery.isLoading,
    isError: liveQuery.isError && historicalQuery.isError,
    dataUpdatedAt: liveQuery.dataUpdatedAt || historicalQuery.dataUpdatedAt,
    refetch: () => {
      liveQuery.refetch();
      historicalQuery.refetch();
    },
  };
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

export function useAdsbCoverage(deviceId?: string) {
  // First get the list of ADS-B devices to use as default
  const { data: devices } = useAdsbDevices();
  const effectiveDeviceId = deviceId || devices?.[0]?.device_id;
  
  return useQuery({
    queryKey: ["aurora", "adsb", "coverage", effectiveDeviceId],
    queryFn: () => callAuroraApi<AdsbCoverage>(`/api/adsb/coverage?device_id=${effectiveDeviceId}`),
    refetchInterval: 60000,
    retry: 2,
    enabled: !!effectiveDeviceId,
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
// STARLINK DEVICE TYPES
// =============================================

export interface StarlinkDevice {
  device_id: string;
  device_type: string;
  client_id?: string;
  status?: string;
  last_seen?: string;
}

export interface StarlinkDeviceStats {
  device_id: string;
  uptime_seconds?: number;
  downlink_throughput_bps?: number;
  uplink_throughput_bps?: number;
  pop_ping_latency_ms?: number;
  snr?: number;
  obstruction_percent_time?: number;
  signal_dbm?: number;
  power_w?: number;
}

// Starlink additional types from API
export interface StarlinkSignalStrength {
  device_id?: string;
  signal_strength_dbm?: number;
  snr?: number;
  timestamp?: string;
}

export interface StarlinkPerformance {
  device_id?: string;
  downlink_throughput_bps?: number;
  uplink_throughput_bps?: number;
  pop_ping_latency_ms?: number;
  timestamp?: string;
}

export interface StarlinkPowerDeviceSummary {
  device_id: string;
  overall: {
    avg_watts: number;
    min_watts: number;
    max_watts: number;
    samples: number;
  };
  when_connected?: {
    avg_watts: number;
    samples: number;
  };
}

export interface StarlinkPowerDataPoint {
  device_id: string;
  timestamp: string;
  power_watts: number;
  state?: string;
}

export interface StarlinkPower {
  time_period_hours: number;
  device_filter?: string | null;
  device_summaries: StarlinkPowerDeviceSummary[];
  power_data: StarlinkPowerDataPoint[];
  // Legacy fields for backwards compatibility
  device_id?: string;
  power_w?: number;
  voltage?: number;
  current?: number;
  timestamp?: string;
}

export interface StarlinkConnectivity {
  device_id?: string;
  connected?: boolean;
  obstruction_percent?: number;
  uptime_seconds?: number;
  timestamp?: string;
}

// =============================================
// HOOKS - STARLINK
// =============================================

export function useStarlinkDevices() {
  return useQuery({
    queryKey: ["aurora", "starlink", "devices"],
    queryFn: async () => {
      try {
        // Try dedicated starlink devices endpoint first
        const response = await callAuroraApi<StarlinkDevice[]>("/api/starlink/devices");
        return response || [];
      } catch {
        try {
          // Fallback to filtering from all devices
          const response = await callAuroraApi<{ devices: StarlinkDevice[] }>("/api/v1/devices");
          const devices = response.devices || [];
          return devices.filter(d => 
            d.device_type?.toLowerCase().includes('starlink') || 
            d.device_id?.toLowerCase().includes('starlink')
          );
        } catch (error) {
          console.warn("Failed to fetch starlink devices:", error);
          return [];
        }
      }
    },
    refetchInterval: 30000,
    retry: 2,
  });
}

export function useStarlinkStats() {
  return useQuery({
    queryKey: ["aurora", "starlink", "stats"],
    queryFn: () => callAuroraApi<StarlinkStats>("/api/starlink/stats"),
    refetchInterval: 15000,
    retry: 2,
  });
}

export function useStarlinkSignalStrength() {
  return useQuery({
    queryKey: ["aurora", "starlink", "signal-strength"],
    queryFn: () => callAuroraApi<StarlinkSignalStrength>("/api/starlink/signal-strength"),
    refetchInterval: 15000,
    retry: 2,
  });
}

export function useStarlinkPerformance() {
  return useQuery({
    queryKey: ["aurora", "starlink", "performance"],
    queryFn: () => callAuroraApi<StarlinkPerformance>("/api/starlink/performance"),
    refetchInterval: 15000,
    retry: 2,
  });
}

export function useStarlinkPower() {
  return useQuery({
    queryKey: ["aurora", "starlink", "power"],
    queryFn: () => callAuroraApi<StarlinkPower>("/api/starlink/power"),
    refetchInterval: 15000,
    retry: 2,
  });
}

export function useStarlinkConnectivity() {
  return useQuery({
    queryKey: ["aurora", "starlink", "connectivity"],
    queryFn: () => callAuroraApi<StarlinkConnectivity>("/api/starlink/connectivity"),
    refetchInterval: 15000,
    retry: 2,
  });
}

export function useStarlinkGlobalStats() {
  return useQuery({
    queryKey: ["aurora", "starlink", "stats", "global"],
    queryFn: () => callAuroraApi<StarlinkStats>("/api/starlink/stats/global"),
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
    refetchInterval: 15000,
    retry: 2,
    enabled: !!deviceId,
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
          // Fallback to device latest and construct timeseries
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
    refetchInterval: 30000,
    retry: 1,
    enabled: !!deviceId,
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
        // The API may return data in a nested structure: readings[].data.power_w
        // We need to transform it to our flat structure
        interface RawReading {
          timestamp: string;
          device_id?: string;
          device_type?: string;
          client_id?: string;
          data?: {
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
        
        const response = await callAuroraApi<RawResponse>(`/api/readings/sensor/starlink?hours=${hours}`);
        
        // Transform nested data structure to flat structure
        const transformedReadings: StarlinkTimeseriesPoint[] = (response.readings || []).map(r => ({
          timestamp: r.timestamp,
          // Try nested data first, then fall back to direct properties
          power_w: r.data?.power_w ?? r.data?.power_watts ?? r.power_w,
          signal_dbm: r.data?.signal_dbm ?? r.signal_dbm,
          snr: r.data?.snr ?? r.snr,
          downlink_throughput_bps: r.data?.downlink_throughput_bps ?? r.downlink_throughput_bps,
          uplink_throughput_bps: r.data?.uplink_throughput_bps ?? r.uplink_throughput_bps,
          pop_ping_latency_ms: r.data?.pop_ping_latency_ms ?? r.pop_ping_latency_ms,
        }));
        
        return { 
          count: response.count ?? transformedReadings.length, 
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
        // The API returns data in a nested structure: readings[].data.temperature_c
        // We need to transform it to our flat structure
        interface RawReading {
          timestamp: string;
          device_id?: string;
          device_type?: string;
          client_id?: string;
          data?: {
            temperature_c?: number;
            temperature_f?: number;
            temp_c?: number;
            temp_f?: number;
            ambient_c?: number;
            probe_c?: number;
          };
          temp_c?: number;
          temp_f?: number;
          ambient_c?: number;
          probe_c?: number;
        }
        
        interface RawResponse {
          count?: number;
          readings?: RawReading[];
          sensor_type?: string;
        }
        
        const response = await callAuroraApi<RawResponse>(`/api/readings/sensor/thermal_probe?hours=${hours}`);
        
        // Transform nested data structure to flat structure
        const transformedReadings: ThermalProbeTimeseriesPoint[] = (response.readings || []).map(r => ({
          timestamp: r.timestamp,
          device_id: r.device_id,
          client_id: r.client_id,
          // Try nested data first, then fall back to direct properties
          temp_c: r.data?.temperature_c ?? r.data?.temp_c ?? r.temp_c,
          temp_f: r.data?.temperature_f ?? r.data?.temp_f ?? r.temp_f,
          ambient_c: r.data?.ambient_c ?? r.ambient_c,
          probe_c: r.data?.probe_c ?? r.probe_c,
        }));
        
        return { 
          count: response.count ?? transformedReadings.length, 
          readings: transformedReadings 
        };
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
// HOOKS - ARDUINO SENSOR KIT TIMESERIES
// =============================================

export interface ArduinoSensorReading {
  timestamp: string;
  device_id?: string;
  client_id?: string;
  // DHT/AHT temperature and humidity
  th_temp_c?: number;
  th_humidity?: number;
  // BMP temperature and pressure
  bmp_temp_c?: number;
  bmp_pressure_hpa?: number;
  // Analog sensors
  light_raw?: number;
  sound_raw?: number;
  pot_raw?: number;
  // Accelerometer
  accel_x?: number;
  accel_y?: number;
  accel_z?: number;
}

export interface ArduinoSensorTimeseriesResponse {
  count: number;
  readings: ArduinoSensorReading[];
}

export function useArduinoSensorTimeseries(hours: number = 24) {
  return useQuery({
    queryKey: ["aurora", "arduino_sensor_kit", "timeseries", hours],
    queryFn: async () => {
      try {
        interface RawReading {
          timestamp: string;
          device_id?: string;
          device_type?: string;
          client_id?: string;
          data?: {
            th?: { temp_c?: number; hum_pct?: number };
            bmp?: { temp_c?: number; press_hpa?: number };
            analog?: { light_raw?: number; sound_raw?: number; pot_raw?: number };
            accel?: { x_ms2?: number; y_ms2?: number; z_ms2?: number };
            // Legacy flat fields
            aht_temp_c?: number;
            aht_humidity?: number;
            bme280_temp_c?: number;
            bme280_humidity?: number;
            bme280_pressure_hpa?: number;
            temp_c?: number;
            humidity?: number;
          };
        }
        
        interface RawResponse {
          count?: number;
          readings?: RawReading[];
          sensor_type?: string;
        }
        
        // Try arduino_sensor_kit endpoint first, fall back to aht_sensor
        let response: RawResponse;
        try {
          response = await callAuroraApi<RawResponse>(`/api/readings/sensor/arduino_sensor_kit?hours=${hours}`);
        } catch {
          response = await callAuroraApi<RawResponse>(`/api/readings/sensor/aht_sensor?hours=${hours}`);
        }
        
        const transformedReadings: ArduinoSensorReading[] = (response.readings || []).map(r => {
          const data = r.data;
          return {
            timestamp: r.timestamp,
            device_id: r.device_id,
            client_id: r.client_id,
            // DHT/AHT temperature from nested or legacy format
            th_temp_c: data?.th?.temp_c ?? data?.aht_temp_c ?? data?.temp_c,
            th_humidity: data?.th?.hum_pct ?? data?.aht_humidity ?? data?.humidity,
            // BMP temperature from nested or legacy format
            bmp_temp_c: data?.bmp?.temp_c ?? data?.bme280_temp_c,
            bmp_pressure_hpa: data?.bmp?.press_hpa ?? data?.bme280_pressure_hpa,
            // Analog sensors
            light_raw: data?.analog?.light_raw,
            sound_raw: data?.analog?.sound_raw,
            pot_raw: data?.analog?.pot_raw,
            // Accelerometer
            accel_x: data?.accel?.x_ms2,
            accel_y: data?.accel?.y_ms2,
            accel_z: data?.accel?.z_ms2,
          };
        });
        
        return { 
          count: response.count ?? transformedReadings.length, 
          readings: transformedReadings 
        };
      } catch (error) {
        console.warn("Failed to fetch Arduino sensor timeseries:", error);
        return { count: 0, readings: [] };
      }
    },
    refetchInterval: 30000,
    retry: 1,
  });
}

// =============================================
// HOOKS - AHT SENSOR TIMESERIES (Legacy - wraps Arduino)
// =============================================

export interface AhtSensorReading {
  timestamp: string;
  device_id?: string;
  client_id?: string;
  aht_temp_c?: number;
  aht_humidity?: number;
  temp_c?: number;
  humidity?: number;
}

export interface AhtSensorTimeseriesResponse {
  count: number;
  readings: AhtSensorReading[];
}

export function useAhtSensorTimeseries(hours: number = 24) {
  return useQuery({
    queryKey: ["aurora", "aht_sensor", "timeseries", hours],
    queryFn: async () => {
      try {
        interface RawReading {
          timestamp: string;
          device_id?: string;
          device_type?: string;
          client_id?: string;
          data?: {
            th?: { temp_c?: number; hum_pct?: number };
            aht_temp_c?: number;
            aht_humidity?: number;
            temp_c?: number;
            humidity?: number;
          };
          aht_temp_c?: number;
          aht_humidity?: number;
          temp_c?: number;
          humidity?: number;
        }
        
        interface RawResponse {
          count?: number;
          readings?: RawReading[];
          sensor_type?: string;
        }
        
        const response = await callAuroraApi<RawResponse>(`/api/readings/sensor/aht_sensor?hours=${hours}`);
        
        const transformedReadings: AhtSensorReading[] = (response.readings || []).map(r => {
          // Handle nested Arduino sensor kit format
          const thTemp = r.data?.th?.temp_c;
          const thHum = r.data?.th?.hum_pct;
          
          return {
            timestamp: r.timestamp,
            device_id: r.device_id,
            client_id: r.client_id,
            aht_temp_c: thTemp ?? r.data?.aht_temp_c ?? r.aht_temp_c ?? r.data?.temp_c ?? r.temp_c,
            aht_humidity: thHum ?? r.data?.aht_humidity ?? r.aht_humidity ?? r.data?.humidity ?? r.humidity,
            temp_c: thTemp ?? r.data?.temp_c ?? r.temp_c ?? r.data?.aht_temp_c ?? r.aht_temp_c,
            humidity: thHum ?? r.data?.humidity ?? r.humidity ?? r.data?.aht_humidity ?? r.aht_humidity,
          };
        });
        
        return { 
          count: response.count ?? transformedReadings.length, 
          readings: transformedReadings 
        };
      } catch (error) {
        console.warn("Failed to fetch AHT sensor timeseries:", error);
        return { count: 0, readings: [] };
      }
    },
    refetchInterval: 30000,
    retry: 1,
  });
}

// =============================================
// HOOKS - WIFI SCANNER TIMESERIES
// =============================================

export interface WifiScannerReading {
  timestamp: string;
  device_id?: string;
  client_id?: string;
  ssid?: string;
  bssid?: string;
  channel?: number;
  rssi?: number;
  signal_strength?: number;
  security?: string;
  frequency?: number;
  band?: string;
  networks_count?: number;
}

export interface WifiScannerTimeseriesResponse {
  count: number;
  readings: WifiScannerReading[];
}

export function useWifiScannerTimeseries(hours: number = 24) {
  return useQuery({
    queryKey: ["aurora", "wifi_scanner", "timeseries", hours],
    queryFn: async () => {
      try {
        interface RawReading {
          timestamp: string;
          device_id?: string;
          device_type?: string;
          client_id?: string;
          data?: {
            ssid?: string;
            bssid?: string;
            channel?: number;
            rssi?: number;
            signal_strength?: number;
            security?: string;
            frequency?: number;
            band?: string;
            networks_count?: number;
          };
          ssid?: string;
          bssid?: string;
          channel?: number;
          rssi?: number;
          signal_strength?: number;
          security?: string;
          frequency?: number;
          band?: string;
          networks_count?: number;
        }
        
        interface RawResponse {
          count?: number;
          readings?: RawReading[];
          sensor_type?: string;
        }
        
        const response = await callAuroraApi<RawResponse>(`/api/readings/sensor/wifi_scanner?hours=${hours}`);
        
        const transformedReadings: WifiScannerReading[] = (response.readings || []).map(r => ({
          timestamp: r.timestamp,
          device_id: r.device_id,
          client_id: r.client_id,
          ssid: r.data?.ssid ?? r.ssid,
          bssid: r.data?.bssid ?? r.bssid,
          channel: r.data?.channel ?? r.channel,
          rssi: r.data?.rssi ?? r.rssi ?? r.data?.signal_strength ?? r.signal_strength,
          signal_strength: r.data?.signal_strength ?? r.signal_strength ?? r.data?.rssi ?? r.rssi,
          security: r.data?.security ?? r.security,
          frequency: r.data?.frequency ?? r.frequency,
          band: r.data?.band ?? r.band,
          networks_count: r.data?.networks_count ?? r.networks_count,
        }));
        
        return { 
          count: response.count ?? transformedReadings.length, 
          readings: transformedReadings 
        };
      } catch (error) {
        console.warn("Failed to fetch WiFi scanner timeseries:", error);
        return { count: 0, readings: [] };
      }
    },
    refetchInterval: 30000,
    retry: 1,
  });
}

// =============================================
// HOOKS - BLUETOOTH SCANNER TIMESERIES
// =============================================

export interface BluetoothScannerReading {
  timestamp: string;
  device_id?: string;
  client_id?: string;
  mac_address?: string;
  name?: string;
  rssi?: number;
  signal_strength?: number;
  device_class?: string;
  manufacturer?: string;
  device_type?: string;
  devices_count?: number;
  is_connectable?: boolean;
}

export interface BluetoothScannerTimeseriesResponse {
  count: number;
  readings: BluetoothScannerReading[];
}

export function useBluetoothScannerTimeseries(hours: number = 24) {
  return useQuery({
    queryKey: ["aurora", "bluetooth_scanner", "timeseries", hours],
    queryFn: async () => {
      try {
        interface RawReading {
          timestamp: string;
          device_id?: string;
          device_type?: string;
          client_id?: string;
          data?: {
            mac_address?: string;
            name?: string;
            rssi?: number;
            signal_strength?: number;
            device_class?: string;
            manufacturer?: string;
            device_type?: string;
            devices_count?: number;
            is_connectable?: boolean;
          };
          mac_address?: string;
          name?: string;
          rssi?: number;
          signal_strength?: number;
          device_class?: string;
          manufacturer?: string;
          devices_count?: number;
          is_connectable?: boolean;
        }
        
        interface RawResponse {
          count?: number;
          readings?: RawReading[];
          sensor_type?: string;
        }
        
        const response = await callAuroraApi<RawResponse>(`/api/readings/sensor/bluetooth_scanner?hours=${hours}`);
        
        const transformedReadings: BluetoothScannerReading[] = (response.readings || []).map(r => ({
          timestamp: r.timestamp,
          device_id: r.device_id,
          client_id: r.client_id,
          mac_address: r.data?.mac_address ?? r.mac_address,
          name: r.data?.name ?? r.name,
          rssi: r.data?.rssi ?? r.rssi ?? r.data?.signal_strength ?? r.signal_strength,
          signal_strength: r.data?.signal_strength ?? r.signal_strength ?? r.data?.rssi ?? r.rssi,
          device_class: r.data?.device_class ?? r.device_class,
          manufacturer: r.data?.manufacturer ?? r.manufacturer,
          device_type: r.data?.device_type ?? r.device_type,
          devices_count: r.data?.devices_count ?? r.devices_count,
          is_connectable: r.data?.is_connectable ?? r.is_connectable,
        }));
        
        return { 
          count: response.count ?? transformedReadings.length, 
          readings: transformedReadings 
        };
      } catch (error) {
        console.warn("Failed to fetch Bluetooth scanner timeseries:", error);
        return { count: 0, readings: [] };
      }
    },
    refetchInterval: 30000,
    retry: 1,
  });
}

// =============================================
// HOOKS - LORA DETECTOR TIMESERIES
// =============================================

export interface LoraDetectorReading {
  timestamp: string;
  device_id?: string;
  client_id?: string;
  frequency?: number;
  rssi?: number;
  snr?: number;
  bandwidth?: number;
  spreading_factor?: number;
  payload?: string;
  packet_count?: number;
  packets_detected?: number;
}

export interface LoraDetectorTimeseriesResponse {
  count: number;
  readings: LoraDetectorReading[];
}

export function useLoraDetectorTimeseries(hours: number = 24) {
  return useQuery({
    queryKey: ["aurora", "lora_detector", "timeseries", hours],
    queryFn: async () => {
      try {
        interface RawReading {
          timestamp: string;
          device_id?: string;
          device_type?: string;
          client_id?: string;
          data?: {
            frequency?: number;
            rssi?: number;
            snr?: number;
            bandwidth?: number;
            spreading_factor?: number;
            payload?: string;
            packet_count?: number;
            packets_detected?: number;
          };
          frequency?: number;
          rssi?: number;
          snr?: number;
          bandwidth?: number;
          spreading_factor?: number;
          payload?: string;
          packet_count?: number;
          packets_detected?: number;
        }
        
        interface RawResponse {
          count?: number;
          readings?: RawReading[];
          sensor_type?: string;
        }
        
        const response = await callAuroraApi<RawResponse>(`/api/readings/sensor/lora_detector?hours=${hours}`);
        
        const transformedReadings: LoraDetectorReading[] = (response.readings || []).map(r => ({
          timestamp: r.timestamp,
          device_id: r.device_id,
          client_id: r.client_id,
          frequency: r.data?.frequency ?? r.frequency,
          rssi: r.data?.rssi ?? r.rssi,
          snr: r.data?.snr ?? r.snr,
          bandwidth: r.data?.bandwidth ?? r.bandwidth,
          spreading_factor: r.data?.spreading_factor ?? r.spreading_factor,
          payload: r.data?.payload ?? r.payload,
          packet_count: r.data?.packet_count ?? r.packet_count,
          packets_detected: r.data?.packets_detected ?? r.packets_detected,
        }));
        
        return { 
          count: response.count ?? transformedReadings.length, 
          readings: transformedReadings 
        };
      } catch (error) {
        console.warn("Failed to fetch LoRa detector timeseries:", error);
        return { count: 0, readings: [] };
      }
    },
    refetchInterval: 30000,
    retry: 1,
  });
}

// =============================================
// HOOKS - LORA DEVICES & STATS (NEW API ENDPOINTS)
// =============================================

export interface LoraDevice {
  device_id: string;
  device_type?: string;
  status?: string;
  last_seen?: string;
  frequency?: number;
  rssi?: number;
}

export interface LoraDetection {
  id?: string;
  device_id: string;
  timestamp: string;
  frequency?: number;
  rssi?: number;
  snr?: number;
  payload?: string;
  spreading_factor?: number;
  bandwidth?: number;
}

export interface LoraGlobalStats {
  total_devices?: number;
  total_detections?: number;
  detections_last_hour?: number;
  detections_last_24h?: number;
  avg_rssi?: number;
  avg_snr?: number;
}

export interface LoraChannelStats {
  channel: number;
  frequency?: number;
  detection_count?: number;
  avg_rssi?: number;
}

export interface LoraSpectrum {
  frequency_start?: number;
  frequency_end?: number;
  power_levels?: number[];
  timestamp?: string;
}

export function useLoraDevices() {
  return useQuery({
    queryKey: ["aurora", "lora", "devices"],
    queryFn: () => callAuroraApi<LoraDevice[]>("/api/lora/devices"),
    refetchInterval: 30000,
    retry: 2,
  });
}

export function useLoraDevice(deviceId: string) {
  return useQuery({
    queryKey: ["aurora", "lora", "devices", deviceId],
    queryFn: () => callAuroraApi<LoraDevice>(`/api/lora/devices/${deviceId}`),
    refetchInterval: 30000,
    retry: 2,
    enabled: !!deviceId,
  });
}

export function useLoraDetections() {
  return useQuery({
    queryKey: ["aurora", "lora", "detections"],
    queryFn: () => callAuroraApi<LoraDetection[]>("/api/lora/detections"),
    refetchInterval: 15000,
    retry: 2,
  });
}

export function useRecentLoraDetections() {
  return useQuery({
    queryKey: ["aurora", "lora", "detections", "recent"],
    queryFn: () => callAuroraApi<LoraDetection[]>("/api/lora/detections/recent"),
    refetchInterval: 10000,
    retry: 2,
  });
}

export function useLoraGlobalStats() {
  return useQuery({
    queryKey: ["aurora", "lora", "stats", "global"],
    queryFn: () => callAuroraApi<LoraGlobalStats>("/api/lora/stats/global"),
    refetchInterval: 30000,
    retry: 2,
  });
}

export function useLoraDeviceStats(deviceId: string) {
  return useQuery({
    queryKey: ["aurora", "lora", "stats", "device", deviceId],
    queryFn: () => callAuroraApi<LoraGlobalStats>(`/api/lora/stats/device/${deviceId}`),
    refetchInterval: 30000,
    retry: 2,
    enabled: !!deviceId,
  });
}

export function useLoraChannelStats() {
  return useQuery({
    queryKey: ["aurora", "lora", "channels"],
    queryFn: () => callAuroraApi<LoraChannelStats[]>("/api/lora/channels"),
    refetchInterval: 30000,
    retry: 2,
  });
}

export function useLoraSpectrum() {
  return useQuery({
    queryKey: ["aurora", "lora", "spectrum"],
    queryFn: () => callAuroraApi<LoraSpectrum>("/api/lora/spectrum"),
    refetchInterval: 15000,
    retry: 2,
  });
}

// =============================================

export interface BmtSensorReading {
  timestamp: string;
  device_id?: string;
  client_id?: string;
  bme280_temp_c?: number;
  bme280_humidity?: number;
  bme280_pressure_hpa?: number;
  temp_c?: number;
  humidity?: number;
  pressure_hpa?: number;
}

export interface BmtSensorTimeseriesResponse {
  count: number;
  readings: BmtSensorReading[];
}

export function useBmtSensorTimeseries(hours: number = 24) {
  return useQuery({
    queryKey: ["aurora", "bmt_sensor", "timeseries", hours],
    queryFn: async () => {
      try {
        interface RawReading {
          timestamp: string;
          device_id?: string;
          device_type?: string;
          client_id?: string;
          data?: {
            bmp?: { temp_c?: number; press_hpa?: number };
            bme280_temp_c?: number;
            bme280_humidity?: number;
            bme280_pressure_hpa?: number;
            temp_c?: number;
            humidity?: number;
            pressure_hpa?: number;
          };
          bme280_temp_c?: number;
          bme280_humidity?: number;
          bme280_pressure_hpa?: number;
          temp_c?: number;
          humidity?: number;
          pressure_hpa?: number;
        }
        
        interface RawResponse {
          count?: number;
          readings?: RawReading[];
          sensor_type?: string;
        }
        
        const response = await callAuroraApi<RawResponse>(`/api/readings/sensor/bmt_sensor?hours=${hours}`);
        
        const transformedReadings: BmtSensorReading[] = (response.readings || []).map(r => {
          // Handle nested Arduino sensor kit format (bmp.temp_c)
          const bmpTemp = r.data?.bmp?.temp_c;
          const bmpPressure = r.data?.bmp?.press_hpa;
          
          return {
            timestamp: r.timestamp,
            device_id: r.device_id,
            client_id: r.client_id,
            bme280_temp_c: bmpTemp ?? r.data?.bme280_temp_c ?? r.bme280_temp_c ?? r.data?.temp_c ?? r.temp_c,
            bme280_humidity: r.data?.bme280_humidity ?? r.bme280_humidity ?? r.data?.humidity ?? r.humidity,
            bme280_pressure_hpa: bmpPressure ?? r.data?.bme280_pressure_hpa ?? r.bme280_pressure_hpa ?? r.data?.pressure_hpa ?? r.pressure_hpa,
            temp_c: bmpTemp ?? r.data?.temp_c ?? r.temp_c ?? r.data?.bme280_temp_c ?? r.bme280_temp_c,
            humidity: r.data?.humidity ?? r.humidity ?? r.data?.bme280_humidity ?? r.bme280_humidity,
            pressure_hpa: bmpPressure ?? r.data?.pressure_hpa ?? r.pressure_hpa ?? r.data?.bme280_pressure_hpa ?? r.bme280_pressure_hpa,
          };
        });
        
        return { 
          count: response.count ?? transformedReadings.length, 
          readings: transformedReadings 
        };
      } catch (error) {
        console.warn("Failed to fetch BMT sensor timeseries:", error);
        return { count: 0, readings: [] };
      }
    },
    refetchInterval: 30000,
    retry: 1,
  });
}

// =============================================
// HOOKS - SYSTEM MONITOR
// =============================================

export interface SystemMonitorReading {
  timestamp: string;
  device_id?: string;
  cpu_percent?: number;
  memory_percent?: number;
  disk_percent?: number;
  cpu_temp_c?: number;
  voltage?: number;
  network_bytes_recv?: number;
  network_bytes_sent?: number;
}

export interface SystemMonitorTimeseriesResponse {
  count: number;
  readings: SystemMonitorReading[];
}

export function useSystemMonitorTimeseries(hours: number = 24) {
  return useQuery({
    queryKey: ["aurora", "system_monitor", "timeseries", hours],
    queryFn: async () => {
      try {
        const response = await callAuroraApi<SystemMonitorTimeseriesResponse>(`/api/readings/sensor/system_monitor?hours=${hours}`);
        return response;
      } catch {
        try {
          const fallback = await callAuroraApi<SystemMonitorTimeseriesResponse>(`/api/stats/sensors/system_monitor`);
          return fallback;
        } catch (error) {
          console.warn("Failed to fetch system monitor timeseries:", error);
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
// HOOKS - USER MANAGEMENT
// =============================================

export function useUsers() {
  return useQuery({
    queryKey: ["aurora", "users"],
    queryFn: () => callAuroraApi<{ users: User[] }>("/api/users"),
    refetchInterval: 60000,
    retry: 2,
  });
}

export function useCurrentUser() {
  return useQuery({
    queryKey: ["aurora", "auth", "me"],
    queryFn: () => callAuroraApi<User>("/api/auth/me"),
    retry: 2,
  });
}

// =============================================
// HOOKS - AUDIT
// =============================================

export function useAuditLogs(limit: number = 100) {
  return useQuery({
    queryKey: ["aurora", "audit", "logs", limit],
    queryFn: () => callAuroraApi<{ logs: AuditLog[] }>(`/api/audit/logs?limit=${limit}`),
    refetchInterval: 30000,
    retry: 2,
  });
}

export function useAuditStats() {
  return useQuery({
    queryKey: ["aurora", "audit", "stats"],
    queryFn: () => callAuroraApi<AuditStats>("/api/audit/stats"),
    refetchInterval: 60000,
    retry: 2,
  });
}

// =============================================
// HOOKS - CONFIGURATION
// =============================================

export function useConfig() {
  return useQuery({
    queryKey: ["aurora", "config"],
    queryFn: () => callAuroraApi<ServerConfig>("/api/config"),
    refetchInterval: 60000,
    retry: 2,
  });
}

export function useClientConfig(clientId: string) {
  return useQuery({
    queryKey: ["aurora", "clients", clientId, "config"],
    queryFn: () => callAuroraApi<ServerConfig>(`/api/clients/${clientId}/config`),
    refetchInterval: 60000,
    retry: 2,
    enabled: !!clientId,
  });
}

export function useAllClientConfigs() {
  return useQuery({
    queryKey: ["aurora", "clients", "configs", "all"],
    queryFn: () => callAuroraApi<{ configs: Record<string, ServerConfig> }>("/api/clients/configs/all"),
    refetchInterval: 60000,
    retry: 2,
  });
}

// =============================================
// HOOKS - WIFI MANAGEMENT
// =============================================

export function useWifiMode(clientId: string) {
  return useQuery({
    queryKey: ["aurora", "clients", clientId, "wifi", "mode"],
    queryFn: () => callAuroraApi<WifiMode>(`/api/clients/${clientId}/wifi/mode`),
    refetchInterval: 30000,
    retry: 2,
    enabled: !!clientId,
  });
}

export function useWifiConfig(clientId: string) {
  return useQuery({
    queryKey: ["aurora", "clients", clientId, "wifi", "config"],
    queryFn: () => callAuroraApi<WifiConfig>(`/api/clients/${clientId}/wifi/config`),
    refetchInterval: 60000,
    retry: 2,
    enabled: !!clientId,
  });
}

export function useWifiStatus(clientId: string) {
  return useQuery({
    queryKey: ["aurora", "clients", clientId, "wifi", "status"],
    queryFn: () => callAuroraApi<WifiStatus>(`/api/clients/${clientId}/wifi/status`),
    refetchInterval: 15000,
    retry: 2,
    enabled: !!clientId,
  });
}

export function useWifiScan(clientId: string) {
  return useQuery({
    queryKey: ["aurora", "clients", clientId, "wifi", "scan"],
    queryFn: () => callAuroraApi<{ networks: WifiNetwork[] }>(`/api/clients/${clientId}/wifi/scan`),
    retry: 2,
    enabled: !!clientId,
    refetchOnWindowFocus: false,
  });
}

export function useWifiClients(clientId: string) {
  return useQuery({
    queryKey: ["aurora", "clients", clientId, "wifi", "clients"],
    queryFn: () => callAuroraApi<{ clients: WifiClient[] }>(`/api/clients/${clientId}/wifi/clients`),
    refetchInterval: 30000,
    retry: 2,
    enabled: !!clientId,
  });
}

// =============================================
// HOOKS - ADDITIONAL SYSTEM INFO
// =============================================

export function useSystemNetstat() {
  return useQuery({
    queryKey: ["aurora", "system", "netstat"],
    queryFn: () => callAuroraApi<{ connections: NetstatEntry[] }>("/api/system/netstat"),
    refetchInterval: 30000,
    retry: 2,
  });
}

export function useSystemHostname() {
  return useQuery({
    queryKey: ["aurora", "system", "hostname"],
    queryFn: () => callAuroraApi<{ hostname: string }>("/api/system/hostname"),
    refetchInterval: 300000,
    retry: 2,
  });
}

export function useSystemIp() {
  return useQuery({
    queryKey: ["aurora", "system", "ip"],
    queryFn: () => callAuroraApi<{ ip: string }>("/api/system/ip"),
    refetchInterval: 60000,
    retry: 2,
  });
}

export function useSystemUptime() {
  return useQuery({
    queryKey: ["aurora", "system", "uptime"],
    queryFn: () => callAuroraApi<{ uptime: string; uptime_seconds: number }>("/api/system/uptime"),
    refetchInterval: 60000,
    retry: 2,
  });
}

export function useSystemCpuLoad() {
  return useQuery({
    queryKey: ["aurora", "system", "load"],
    queryFn: () => callAuroraApi<{ load: number[] }>("/api/system/load"),
    refetchInterval: 15000,
    retry: 2,
  });
}

export function useSystemMemory() {
  return useQuery({
    queryKey: ["aurora", "system", "memory"],
    queryFn: () => callAuroraApi<{ total: number; used: number; percent: number }>("/api/system/memory"),
    refetchInterval: 15000,
    retry: 2,
  });
}

export function useSystemDisk() {
  return useQuery({
    queryKey: ["aurora", "system", "disk"],
    queryFn: () => callAuroraApi<{ total: number; used: number; percent: number }>("/api/system/disk"),
    refetchInterval: 60000,
    retry: 2,
  });
}

export function useServiceStatus(serviceName: string) {
  return useQuery({
    queryKey: ["aurora", "systemctl", serviceName],
    queryFn: () => callAuroraApi<{ active: boolean; status: string }>(`/api/systemctl/${serviceName}`),
    refetchInterval: 30000,
    retry: 2,
    enabled: !!serviceName,
  });
}

// =============================================
// HOOKS - GENERAL STATS
// =============================================

export function useGeneralStats() {
  return useQuery({
    queryKey: ["aurora", "stats"],
    queryFn: () => callAuroraApi<Record<string, unknown>>("/api/stats"),
    refetchInterval: 15000,
    retry: 2,
  });
}

export function useEndpointStatsHistory() {
  return useQuery({
    queryKey: ["aurora", "stats", "endpoints", "history"],
    queryFn: () => callAuroraApi<Array<{ timestamp: string; endpoint: string; count: number }>>("/api/stats/endpoints/history"),
    refetchInterval: 60000,
    retry: 2,
  });
}

// =============================================
// HOOKS - DATA FILES
// =============================================

export function useStarlinkStatusFile() {
  return useQuery({
    queryKey: ["aurora", "files", "starlink_status"],
    queryFn: () => callAuroraApi<string>("/starlink_status.jsonl"),
    refetchInterval: 30000,
    retry: 2,
  });
}

export function useGpsdStatusFile() {
  return useQuery({
    queryKey: ["aurora", "files", "gpsd_status"],
    queryFn: () => callAuroraApi<string>("/gpsd_status.jsonl"),
    refetchInterval: 30000,
    retry: 2,
  });
}

export function useBandwidthFile() {
  return useQuery({
    queryKey: ["aurora", "files", "bandwidth"],
    queryFn: () => callAuroraApi<string>("/bandwidth.jsonl"),
    refetchInterval: 30000,
    retry: 2,
  });
}

export function useArduinoDataFile() {
  return useQuery({
    queryKey: ["aurora", "files", "arduino_data"],
    queryFn: () => callAuroraApi<string>("/arduino_data.jsonl"),
    refetchInterval: 30000,
    retry: 2,
  });
}

export function useVisibleSatsFile() {
  return useQuery({
    queryKey: ["aurora", "files", "visible_sats"],
    queryFn: () => callAuroraApi<string>("/visible_sats.jsonl"),
    refetchInterval: 30000,
    retry: 2,
  });
}

export function usePingStatsFile() {
  return useQuery({
    queryKey: ["aurora", "files", "ping_stats"],
    queryFn: () => callAuroraApi<string>("/ping_stats.jsonl"),
    refetchInterval: 30000,
    retry: 2,
  });
}

// =============================================
// HOOKS - ANALYTICS
// =============================================

export function useMovingAverage(sensorType?: string, field?: string, window?: number) {
  return useQuery({
    queryKey: ["aurora", "data", "moving_average", sensorType, field, window],
    queryFn: () => {
      const params = new URLSearchParams();
      if (sensorType) params.append("sensor_type", sensorType);
      if (field) params.append("field", field);
      if (window) params.append("window", window.toString());
      const queryString = params.toString();
      return callAuroraApi<Record<string, unknown>>(`/api/v1/data/moving_average${queryString ? `?${queryString}` : ""}`);
    },
    refetchInterval: 30000,
    retry: 2,
  });
}

// =============================================
// MUTATIONS - USER MANAGEMENT
// =============================================

export function useCreateUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (user: { username: string; password: string; role?: string }) => {
      return callAuroraApi<{ success: boolean; message: string }>("/api/users", "POST", user);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aurora", "users"] });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (username: string) => {
      return callAuroraApi<{ success: boolean; message: string }>(`/api/users/${username}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aurora", "users"] });
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (data: { current_password: string; new_password: string }) => {
      return callAuroraApi<{ success: boolean; message: string }>("/api/auth/change-password", "POST", data);
    },
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

export function useClientHeartbeat() {
  return useMutation({
    mutationFn: async (clientId: string) => {
      return callAuroraApi<{ success: boolean }>(`/api/clients/${clientId}/heartbeat`, "POST");
    },
  });
}

export function useUpdateClientConfig() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ clientId, config }: { clientId: string; config: ServerConfig }) => {
      return callAuroraApi<{ success: boolean; message: string }>(`/api/clients/${clientId}/config`, "PUT", config);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["aurora", "clients", variables.clientId, "config"] });
      queryClient.invalidateQueries({ queryKey: ["aurora", "clients", "configs", "all"] });
    },
  });
}

export function useRenameClient() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ clientId, hostname }: { clientId: string; hostname: string }) => {
      return callAuroraApi<{ success: boolean; message: string }>(`/api/clients/${clientId}`, "PUT", { hostname });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aurora", "clients"] });
    },
  });
}

// =============================================
// MUTATIONS - CLIENT STATE MANAGEMENT
// =============================================

export function useAdoptClientDirect() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ clientId, reason, metadata }: { clientId: string; reason?: string; metadata?: Record<string, unknown> }) => {
      return callAuroraApi<StateTransitionResponse>(`/api/clients/${clientId}/adopt-direct`, "POST", { reason, metadata });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aurora", "clients"] });
    },
  });
}

export function useRegisterClient() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ clientId, reason, metadata }: { clientId: string; reason?: string; metadata?: Record<string, unknown> }) => {
      return callAuroraApi<StateTransitionResponse>(`/api/clients/${clientId}/register`, "POST", { reason, metadata });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aurora", "clients"] });
    },
  });
}

export function useDisableClient() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ clientId, reason, metadata }: { clientId: string; reason?: string; metadata?: Record<string, unknown> }) => {
      return callAuroraApi<StateTransitionResponse>(`/api/clients/${clientId}/disable`, "POST", { reason, metadata });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aurora", "clients"] });
    },
  });
}

export function useEnableClient() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ clientId, reason, metadata }: { clientId: string; reason?: string; metadata?: Record<string, unknown> }) => {
      return callAuroraApi<StateTransitionResponse>(`/api/clients/${clientId}/enable`, "POST", { reason, metadata });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aurora", "clients"] });
    },
  });
}

export function useSuspendClient() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ clientId, reason, metadata }: { clientId: string; reason?: string; metadata?: Record<string, unknown> }) => {
      return callAuroraApi<StateTransitionResponse>(`/api/clients/${clientId}/suspend`, "POST", { reason, metadata });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aurora", "clients"] });
    },
  });
}

export function useSoftDeleteClient() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ clientId, reason, metadata }: { clientId: string; reason?: string; metadata?: Record<string, unknown> }) => {
      return callAuroraApi<StateTransitionResponse>(`/api/clients/${clientId}/delete-soft`, "POST", { reason, metadata });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aurora", "clients"] });
    },
  });
}

export function useRestoreClient() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ clientId, reason, metadata }: { clientId: string; reason?: string; metadata?: Record<string, unknown> }) => {
      return callAuroraApi<StateTransitionResponse>(`/api/clients/${clientId}/restore`, "POST", { reason, metadata });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aurora", "clients"] });
    },
  });
}

// =============================================
// MUTATIONS - WIFI
// =============================================

export function useSetWifiMode() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ clientId, mode }: { clientId: string; mode: string }) => {
      return callAuroraApi<{ success: boolean }>(`/api/clients/${clientId}/wifi/mode`, "POST", { mode });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["aurora", "clients", variables.clientId, "wifi", "mode"] });
    },
  });
}

export function useUpdateWifiConfig() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ clientId, config }: { clientId: string; config: WifiConfig }) => {
      return callAuroraApi<{ success: boolean }>(`/api/clients/${clientId}/wifi/config`, "POST", config);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["aurora", "clients", variables.clientId, "wifi", "config"] });
    },
  });
}

export function useDisconnectWifiClient() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ clientId, mac }: { clientId: string; mac: string }) => {
      return callAuroraApi<{ success: boolean }>(`/api/clients/${clientId}/wifi/clients/${mac}/disconnect`, "POST");
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["aurora", "clients", variables.clientId, "wifi", "clients"] });
    },
  });
}

// =============================================
// MUTATIONS - CONFIGURATION
// =============================================

export function useUpdateConfig() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (config: ServerConfig) => {
      return callAuroraApi<{ success: boolean }>("/api/config", "POST", config);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aurora", "config"] });
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

export function useAddAlertRule() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (rule: Omit<AlertRule, 'id'>) => {
      return callAuroraApi<{ success: boolean; message: string; id?: number }>("/api/alerts/add", "POST", rule);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aurora", "alerts", "rules"] });
      queryClient.invalidateQueries({ queryKey: ["aurora", "alerts", "list"] });
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

export function useTestAlert() {
  return useMutation({
    mutationFn: async () => {
      return callAuroraApi<{ success: boolean; message: string }>("/api/alerts/test", "POST");
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

export function useAddBaselineEntry() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ profileId, entry }: { profileId: number; entry: Partial<BaselineEntry> }) => {
      return callAuroraApi<{ success: boolean; id?: number }>(`/api/baselines/profiles/${profileId}/entries`, "POST", entry);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["aurora", "baselines", "profiles", variables.profileId, "entries"] });
    },
  });
}

export function useRemoveBaselineEntry() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (entryId: number) => {
      return callAuroraApi<{ success: boolean }>(`/api/baselines/entries/${entryId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aurora", "baselines"] });
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

export function useAutoLearnBaseline() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (profileId: number) => {
      return callAuroraApi<{ success: boolean; entries_added?: number }>(`/api/baselines/profiles/${profileId}/auto-learn`, "POST");
    },
    onSuccess: (_, profileId) => {
      queryClient.invalidateQueries({ queryKey: ["aurora", "baselines", "profiles", profileId, "entries"] });
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
