// Aurora API Types - All shared type definitions

// =============================================
// SENSOR TYPES
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
// ALERT TYPES
// =============================================

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

export interface AlertsResponse {
  count: number;
  alerts: Alert[];
}

export interface AlertRulesResponse {
  count: number;
  rules: AlertRule[];
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
  baro_rate?: number;
  geom_rate?: number;
  ias?: number;
  tas?: number;
  mach?: number;
  mag_heading?: number;
  true_heading?: number;
  nav_altitude_mcp?: number;
  nav_altitude_fms?: number;
  nav_qnh?: number;
  nav_heading?: number;
  nic?: number;
  rc?: number;
  version?: number;
  nic_baro?: number;
  nac_p?: number;
  nac_v?: number;
  sil?: number;
  sil_type?: string;
  gva?: number;
  sda?: number;
  emergency?: string;
  messages?: number;
  seen_pos?: number;
  mlat?: string[];
  tisb?: string[];
  type?: string;
  registration?: string;
  operator?: string;
  operator_icao?: string;
  operator_callsign?: string;
  owner?: string;
  year_built?: number;
  description?: string;
  dbFlags?: number;
  country?: string;
  military?: boolean;
}

export interface AdsbStats {
  device_id?: string;
  sdr_type?: string;
  messages_decoded?: number;
  aircraft_tracked_total?: number;
  aircraft_active?: number;
  positions_received?: number;
  uptime_seconds?: number;
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
  description?: string;
  severity?: string;
}

export interface AdsbCoverage {
  total_positions?: number;
  unique_aircraft?: number;
  max_range_km?: number;
  avg_altitude_ft?: number;
  coverage_area_km2?: number;
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
  sample_rate?: number;
  ppm_error?: number;
  bias_tee?: boolean;
  agc?: boolean;
  last_seen?: string;
  status?: string;
}

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

export interface AdsbHistoricalResponse {
  count: number;
  readings: AdsbHistoricalReading[];
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

export interface ClientsListResponse {
  count: number;
  clients: Client[];
}

export interface ClientsByStateResponse {
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

export interface ClientStatisticsResponse {
  total: number;
  by_state: Record<ClientState, number>;
  summary: {
    active: number;
    needs_attention: number;
    inactive: number;
  };
}

export interface ClientStateResponse {
  state: ClientState;
  clients: Client[];
  count: number;
  description: string;
}

export interface StateTransitionRequest {
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface StateTransitionResponse {
  success: boolean;
  message: string;
  client_id: string;
  new_state: ClientState;
  previous_state: ClientState;
}

export interface ClientStateHistoryResponse {
  client_id: string;
  current_state: ClientState;
  state_history: ClientStateHistoryEntry[];
  last_state_change: string;
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

export interface BatchInfo {
  batch_id: string;
  client_id: string;
  timestamp: string;
  reading_count: number;
  device_types?: string[];
  sensors?: string[];
  file_path?: string;
  file_size_bytes?: number;
  processed?: boolean;
  error?: string;
}

export interface BatchSensor {
  device_id: string;
  device_type: string;
  reading_count?: number;
}

export interface BatchReading {
  device_id: string;
  device_type: string;
  timestamp: string;
  data: Record<string, unknown>;
}

export interface BatchRetentionConfig {
  default_retention_days: number;
  max_retention_days: number;
  min_retention_days: number;
  cleanup_enabled: boolean;
  cleanup_interval_hours: number;
}

export interface ClientBatchRetention {
  client_id: string;
  retention_days: number;
  debug_mode?: boolean;
  last_cleanup?: string;
}

export interface DiskUsageInfo {
  total_bytes: number;
  used_bytes: number;
  free_bytes: number;
  usage_percent: number;
  batch_storage_bytes?: number;
}

export interface LatestReading {
  device_id: string;
  device_type: string;
  timestamp: string;
  data: Record<string, unknown>;
}

export interface LatestReadingsResponse {
  count: number;
  readings: LatestReading[];
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
  client_id?: string;
  device_id?: string;
  signal_dbm?: number;
  power_w?: number;
  snr?: number;
  downlink_throughput_bps?: number;
  uplink_throughput_bps?: number;
  pop_ping_latency_ms?: number;
  obstruction_percent?: number;
}

export interface StarlinkTimeseriesResponse {
  count: number;
  readings: StarlinkTimeseriesPoint[];
}

export interface StarlinkDevice {
  device_id: string;
  device_type: string;
  client_id?: string;
  status?: string;
  last_seen?: string;
  latitude?: number;
  longitude?: number;
  altitude?: number;
  gps_latitude?: number;
  gps_longitude?: number;
  gps_altitude?: number;
  lat?: number;
  lng?: number;
  lon?: number;
  alt?: number;
  location?: {
    latitude?: number;
    longitude?: number;
    altitude?: number;
    lat?: number;
    lng?: number;
    lon?: number;
  };
  location_detail?: {
    latitude?: number;
    longitude?: number;
    altitude?: number;
  };
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
// GPS TYPES
// =============================================

export interface GPSReading {
  device_id: string;
  timestamp: string;
  lat?: number;
  lon?: number;
  altitude?: number;
  speed?: number;
  heading?: number;
  satellites?: number;
  hdop?: number;
  fix_type?: string;
  client_id?: string;
}

export interface GPSReadingsResponse {
  count: number;
  readings: GPSReading[];
}

// =============================================
// LORA TYPES
// =============================================

export interface LoRaDevice {
  device_id: string;
  device_type?: string;
  last_seen?: string;
  status?: string;
  rssi?: number;
  snr?: number;
  frequency?: number;
}

export interface LoRaDetection {
  id: string;
  device_id?: string;
  timestamp: string;
  rssi?: number;
  snr?: number;
  frequency?: number;
  data?: Record<string, unknown>;
}

export interface LoRaStats {
  total_devices?: number;
  total_detections?: number;
  detections_last_hour?: number;
  avg_rssi?: number;
  avg_snr?: number;
}

export interface LoRaChannelStats {
  channel: number;
  frequency: number;
  message_count: number;
  avg_rssi?: number;
}

export interface LoRaSpectrumAnalysis {
  channels: LoRaChannelStats[];
  total_messages: number;
  scan_time?: string;
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

export interface NetstatEntry {
  protocol: string;
  local_address: string;
  foreign_address: string;
  state?: string;
  pid?: number;
  program?: string;
}

// =============================================
// USER & AUDIT TYPES
// =============================================

export interface User {
  username: string;
  role: string;
  created_at?: string;
  last_login?: string;
}

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
// WIFI TYPES
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
// EXPORT TYPES
// =============================================

export interface ExportFormat {
  format: string;
  description: string;
  mime_type: string;
}

// =============================================
// CONFIGURATION TYPES
// =============================================

export interface ServerConfig {
  [key: string]: unknown;
}

// =============================================
// STATISTICS TYPES
// =============================================

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

export interface TimePeriodStats {
  period: string;
  timestamp: string;
  total_readings?: number;
  total_batches?: number;
  active_devices?: number;
  active_clients?: number;
  sensor_types?: Record<string, {
    count: number;
    avg_value?: number;
    min_value?: number;
    max_value?: number;
  }>;
  averages?: {
    temperature_c?: number;
    humidity?: number;
    power_w?: number;
    signal_dbm?: number;
  };
}

// =============================================
// UPDATE MANAGEMENT TYPES
// =============================================

export interface UpdatePackage {
  package_id: string;
  name: string;
  version: string;
  description?: string;
  file_size?: number;
  created_at: string;
  published: boolean;
  published_at?: string;
}

export interface UpdateAssignment {
  assignment_id: string;
  package_id: string;
  client_id?: string;
  all_clients?: boolean;
  created_at: string;
  status: string;
}

export interface UpdateStatus {
  client_id: string;
  package_id: string;
  status: string;
  started_at?: string;
  completed_at?: string;
  error?: string;
}

export interface UpdateStatusDashboard {
  pending_updates: number;
  in_progress: number;
  completed: number;
  failed: number;
  clients_status: UpdateStatus[];
}

// =============================================
// REMOTE COMMANDS TYPES
// =============================================

export interface RemoteCommand {
  command_id: string;
  command: string;
  client_ids?: string[];
  all_clients?: boolean;
  created_at: string;
  created_by: string;
  status: string;
  timeout_seconds?: number;
}

export interface CommandResult {
  client_id: string;
  command_id: string;
  output?: string;
  error?: string;
  exit_code?: number;
  executed_at?: string;
  status: string;
}
