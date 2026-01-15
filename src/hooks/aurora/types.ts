/**
 * Aurora API Types
 * 
 * Comprehensive type definitions for all Aurora API responses.
 * This file serves as the single source of truth for TypeScript types
 * used throughout the application when interacting with the Aurora API.
 * 
 * @module aurora/types
 */

// =============================================
// CORE & UTILITY TYPES
// =============================================

/** Generic API response wrapper */
export interface ApiResponse<T> {
  success?: boolean;
  message?: string;
  data?: T;
  error?: string;
}

/** Paginated response wrapper */
export interface PaginatedResponse<T> {
  count: number;
  total?: number;
  page?: number;
  per_page?: number;
  items?: T[];
  data?: T[];
}

/** Generic timestamp format used across the API */
export type ISOTimestamp = string;

/** Geographic coordinates */
export interface GeoCoordinates {
  latitude?: number;
  longitude?: number;
  lat?: number;
  lng?: number;
  lon?: number;
  altitude?: number;
  alt?: number;
  accuracy?: number;
}

// =============================================
// SENSOR TYPES
// =============================================

/** Core sensor data structure */
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

/** Aggregated sensor statistics */
export interface SensorStats {
  avgTemperature: number;
  avgSignal: number;
  avgPower: number;
  totalSensors: number;
}

/** Statistics for a specific sensor type */
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
  sample_count?: number;
  numeric_field_stats_24h?: Record<string, {
    min: number;
    max: number;
    avg: number;
    sample_count: number;
  }>;
}

/** Latest reading from any sensor */
export interface LatestReading {
  device_id: string;
  device_type: string;
  timestamp: string;
  data: Record<string, unknown>;
  client_id?: string;
  batch_id?: string;
}

/** Response for latest readings endpoint */
export interface LatestReadingsResponse {
  count: number;
  readings: LatestReading[];
}

// =============================================
// ALERT TYPES
// =============================================

/** Individual alert instance */
export interface Alert {
  alert_id: number;
  rule_id?: number;
  client_id?: string | null;
  sensor_id?: string;
  sensor_type?: string;
  severity: string;
  message: string;
  value?: string;
  threshold?: string;
  status: string;
  triggered_at: string;
  acknowledged_at?: string | null;
  resolved_at?: string | null;
  rule_name?: string;
  // Legacy compatibility fields
  type?: string;
  device_id?: string;
  timestamp?: string;
  acknowledged?: boolean;
  resolved?: boolean;
}

/** Alert rule definition */
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

/** Aggregated alert statistics */
export interface AlertStats {
  total_alerts: number;
  active_alerts: number;
  acknowledged_alerts: number;
  resolved_alerts: number;
  alerts_by_severity: Record<string, number>;
  alerts_last_24h: number;
}

/** Alert notification settings */
export interface AlertSettings {
  email_enabled: boolean;
  email_recipients?: string[];
  webhook_enabled: boolean;
  webhook_url?: string;
  cooldown_seconds?: number;
}

/** Response for alerts list endpoint */
export interface AlertsResponse {
  count: number;
  alerts: Alert[];
}

/** Response for alert rules endpoint */
export interface AlertRulesResponse {
  count: number;
  rules: AlertRule[];
}

// =============================================
// ADS-B TYPES
// =============================================

/** Aircraft tracked via ADS-B */
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

/** ADS-B receiver statistics */
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

/** ADS-B emergency alert */
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

/** ADS-B coverage statistics */
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

/** ADS-B receiver device */
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

/** Historical ADS-B reading */
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

/** Response for historical ADS-B data */
export interface AdsbHistoricalResponse {
  count: number;
  readings: AdsbHistoricalReading[];
}

// =============================================
// CLIENT TYPES
// =============================================

/** Client lifecycle states */
export type ClientState = "pending" | "registered" | "adopted" | "disabled" | "suspended" | "deleted";

/** Individual sensor configuration within a client */
export interface ClientSensorConfig {
  device_id: string;
  enabled: boolean;
  [key: string]: unknown;
}

/** Client state transition history entry */
export interface ClientStateHistoryEntry {
  from_state: ClientState | null;
  to_state: ClientState;
  timestamp: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}

/** Client geographic location (from IP geolocation) */
export interface ClientLocation {
  city?: string;
  country?: string;
  country_code?: string;
  isp?: string;
  latitude?: number;
  longitude?: number;
  region?: string;
  source?: string;
}

/** Full client entity */
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
  location?: ClientLocation;
  location_updated_at?: string;
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

/** Response for clients list endpoint */
export interface ClientsListResponse {
  count: number;
  clients: Client[];
}

/** Response for clients grouped by state */
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

/** Client statistics summary */
export interface ClientStatisticsResponse {
  total: number;
  by_state: Record<ClientState, number>;
  summary: {
    active: number;
    needs_attention: number;
    inactive: number;
  };
}

/** Response for single state clients endpoint */
export interface ClientStateResponse {
  state: ClientState;
  clients: Client[];
  count: number;
  description: string;
}

/** Request body for state transitions */
export interface StateTransitionRequest {
  reason?: string;
  metadata?: Record<string, unknown>;
}

/** Response from state transition operations */
export interface StateTransitionResponse {
  success: boolean;
  message: string;
  client_id: string;
  new_state: ClientState;
  previous_state: ClientState;
}

/** Response for client state history */
export interface ClientStateHistoryResponse {
  client_id: string;
  current_state: ClientState;
  state_history: ClientStateHistoryEntry[];
  last_state_change: string;
}

// =============================================
// DASHBOARD TYPES
// =============================================

/** Main dashboard statistics */
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

/** System statistics for dashboard */
export interface DashboardSystemStats {
  cpu_percent?: number;
  memory_percent?: number;
  disk_percent?: number;
  uptime_seconds?: number;
  load_average?: number[];
  network_rx_bytes?: number;
  network_tx_bytes?: number;
}

/** Generic timeseries data point */
export interface TimeseriesPoint {
  timestamp: string;
  value: number;
}

/** Dashboard timeseries data */
export interface DashboardTimeseries {
  humidity: TimeseriesPoint[];
  power: TimeseriesPoint[];
  signal: TimeseriesPoint[];
  temperature: TimeseriesPoint[];
}

// =============================================
// DEVICE & BATCH TYPES
// =============================================

/** Device hierarchy tree node */
export interface DeviceTreeNode {
  device_id: string;
  device_type: string;
  client_id?: string;
  status?: string;
  last_seen?: string;
  children?: DeviceTreeNode[];
}

/** Current device status */
export interface DeviceStatus {
  device_id: string;
  device_type: string;
  status: string;
  last_seen: string;
  readings_count?: number;
}

/** Device summary with activity info */
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

/** Summary by sensor type */
export interface SensorTypeSummary {
  device_type: string;
  device_count: number;
  total_readings: number;
  first_seen: string;
  last_seen: string;
  active_last_hour: boolean;
}

/** Batch metadata */
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

/** Sensor within a batch */
export interface BatchSensor {
  device_id: string;
  device_type: string;
  reading_count?: number;
}

/** Individual reading within a batch */
export interface BatchReading {
  device_id: string;
  device_type: string;
  timestamp: string;
  data: Record<string, unknown>;
}

/** Batch retention configuration */
export interface BatchRetentionConfig {
  default_retention_days: number;
  max_retention_days: number;
  min_retention_days: number;
  cleanup_enabled: boolean;
  cleanup_interval_hours: number;
}

/** Per-client batch retention settings */
export interface ClientBatchRetention {
  client_id: string;
  retention_days: number;
  debug_mode?: boolean;
  last_cleanup?: string;
}

/** Disk usage information */
export interface DiskUsageInfo {
  total_bytes: number;
  used_bytes: number;
  free_bytes: number;
  usage_percent: number;
  batch_storage_bytes?: number;
}

// =============================================
// STARLINK TYPES
// =============================================

/** Starlink device statistics */
export interface StarlinkStats {
  uptime_seconds?: number;
  downlink_throughput_bps?: number;
  uplink_throughput_bps?: number;
  pop_ping_latency_ms?: number;
  snr?: number;
  obstruction_percent_time?: number;
}

/** Individual Starlink reading */
export interface StarlinkReading {
  timestamp: string;
  signal_dbm?: number;
  power_w?: number;
  snr?: number;
  downlink_throughput_bps?: number;
  uplink_throughput_bps?: number;
  pop_ping_latency_ms?: number;
}

/** Response for Starlink readings */
export interface StarlinkReadingsResponse {
  count: number;
  readings: StarlinkReading[];
  avg_signal_dbm?: number;
  avg_power_w?: number;
  avg_snr?: number;
}

/** Starlink timeseries data point */
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

/** Response for Starlink timeseries */
export interface StarlinkTimeseriesResponse {
  count: number;
  readings: StarlinkTimeseriesPoint[];
}

/** Starlink device entity */
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

/** Starlink device with current metrics (from readings) */
export interface StarlinkDeviceWithMetrics {
  device_id: string;
  client_id: string;
  composite_key: string;
  hostname?: string;
  last_seen?: string;
  latitude?: number;
  longitude?: number;
  altitude?: number;
  metrics: {
    uptime_seconds?: number;
    downlink_throughput_bps?: number;
    uplink_throughput_bps?: number;
    pop_ping_latency_ms?: number;
    snr?: number;
    signal_strength_dbm?: number;
    obstruction_percent?: number;
    power_watts?: number;
    connected?: boolean;
  };
}

/** Per-device Starlink statistics */
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

/** Starlink signal strength data */
export interface StarlinkSignalStrength {
  device_id?: string;
  signal_strength_dbm?: number;
  snr?: number;
  timestamp?: string;
}

/** Starlink performance metrics */
export interface StarlinkPerformance {
  device_id?: string;
  downlink_throughput_bps?: number;
  uplink_throughput_bps?: number;
  pop_ping_latency_ms?: number;
  timestamp?: string;
}

/** Starlink power summary for a device */
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

/** Starlink power data point */
export interface StarlinkPowerDataPoint {
  device_id: string;
  timestamp: string;
  power_watts: number;
  state?: string;
}

/** Starlink power response */
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

/** Starlink connectivity status */
export interface StarlinkConnectivity {
  device_id?: string;
  connected?: boolean;
  obstruction_percent?: number;
  uptime_seconds?: number;
  timestamp?: string;
}

// =============================================
// ARDUINO TYPES
// =============================================

/** Arduino device with current metrics */
export interface ArduinoDeviceWithMetrics {
  device_id: string;
  client_id: string;
  composite_key: string;
  last_seen?: string;
  latitude?: number;
  longitude?: number;
  metrics: {
    temperature_c?: number;
    temperature_f?: number;
    humidity?: number;
    pressure?: number;
    light_level?: number;
    soil_moisture?: number;
    co2_ppm?: number;
    tvoc_ppb?: number;
    voltage?: number;
    current?: number;
    power_w?: number;
    [key: string]: number | undefined;
  };
}

/** Arduino sensor statistics */
export interface ArduinoStats {
  device_count?: number;
  total_readings?: number;
  avg_temperature_c?: number;
  avg_humidity?: number;
  avg_pressure?: number;
  readings_last_hour?: number;
  readings_last_24h?: number;
}

/** Arduino timeseries data point */
export interface ArduinoTimeseriesPoint {
  timestamp: string;
  client_id?: string;
  device_id?: string;
  temperature_c?: number;
  temperature_f?: number;
  humidity?: number;
  pressure?: number;
  light_level?: number;
  soil_moisture?: number;
  co2_ppm?: number;
  tvoc_ppb?: number;
  voltage?: number;
  current?: number;
  power_w?: number;
}

// =============================================
// THERMAL PROBE TYPES
// =============================================

/** Thermal probe reading */
export interface ThermalProbeReading {
  timestamp: string;
  temp_c?: number;
  temp_f?: number;
  ambient_c?: number;
  probe_c?: number;
}

/** Thermal probe statistics */
export interface ThermalProbeStats {
  count: number;
  readings?: ThermalProbeReading[];
  avg_temp_c?: number;
  min_temp_c?: number;
  max_temp_c?: number;
  latest_reading?: Record<string, unknown>;
}

/** Thermal probe timeseries point */
export interface ThermalProbeTimeseriesPoint {
  timestamp: string;
  temp_c?: number;
  temp_f?: number;
  ambient_c?: number;
  probe_c?: number;
  device_id?: string;
  client_id?: string;
}

/** Thermal probe timeseries response */
export interface ThermalProbeTimeseriesResponse {
  count: number;
  readings: ThermalProbeTimeseriesPoint[];
}

// =============================================
// GPS TYPES
// =============================================

/** GPS reading data */
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

/** GPS readings response */
export interface GPSReadingsResponse {
  count: number;
  readings: GPSReading[];
}

/** Geographic location for map */
export interface GeoLocation {
  device_id: string;
  lat: number;
  lng: number;
  altitude?: number;
  timestamp?: string;
  accuracy?: number;
}

// =============================================
// LORA TYPES
// =============================================

/** LoRa device entity */
export interface LoRaDevice {
  device_id: string;
  device_type?: string;
  client_id?: string;
  last_seen?: string;
  first_seen?: string;
  status?: string;
  rssi?: number;
  snr?: number;
  frequency?: number;
  spreading_factor?: number;
  bandwidth?: number;
  packet_count?: number;
}

/** LoRa device configuration */
export interface LoRaDeviceConfig {
  device_id: string;
  device_name?: string;
  description?: string;
  main_channel_mhz?: number;
  bandwidth_khz?: number;
  spreading_factor?: number;
  is_active?: boolean;
  location?: string;
  metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  last_configured_at?: string;
}

/** LoRa packet detection */
export interface LoRaDetection {
  id: string;
  timestamp: string;
  device_id?: string;
  client_id?: string;
  rssi?: number;
  snr?: number;
  frequency?: number;
  payload?: string;
  spreading_factor?: number;
  bandwidth?: number;
  coding_rate?: string;
  data?: Record<string, unknown>;
}

/** LoRa statistics */
export interface LoRaStats {
  total_devices?: number;
  total_detections?: number;
  active_devices?: number;
  detections_last_hour?: number;
  avg_rssi?: number;
  avg_snr?: number;
  packets_per_hour?: number;
  unique_frequencies?: number;
}

/** LoRa channel statistics */
export interface LoRaChannelStats {
  channel: number;
  frequency: number;
  frequency_mhz?: number;
  message_count?: number;
  packet_count?: number;
  avg_rssi?: number;
  avg_snr?: number;
  bandwidth_khz?: number;
  spreading_factor?: number;
}

/** LoRa spectrum analysis */
export interface LoRaSpectrumAnalysis {
  frequencies?: number[];
  power_levels?: number[];
  noise_floor?: number;
  peak_frequency?: number;
  peak_power?: number;
  channels?: LoRaChannelStats[];
  channel_activity?: { channel: number; activity_percent: number }[];
  total_messages?: number;
  scan_time?: string;
}

// =============================================
// MARITIME TYPES (AIS, APRS, EPIRB)
// =============================================

/** AIS vessel data */
export interface AisVessel {
  mmsi: string;
  name?: string;
  callsign?: string;
  imo?: string;
  ship_type?: number;
  ship_type_name?: string;
  lat: number;
  lon: number;
  course?: number;
  speed?: number;
  heading?: number;
  destination?: string;
  eta?: string;
  draught?: number;
  length?: number;
  width?: number;
  nav_status?: number;
  nav_status_name?: string;
  last_seen?: string;
  timestamp?: string;
  country?: string;
  flag?: string;
}

/** AIS statistics */
export interface AisStats {
  total_vessels: number;
  active_vessels: number;
  vessels_last_hour: number;
  vessels_last_24h: number;
  avg_speed?: number;
  coverage_area_nm?: number;
}

/** APRS station data */
export interface AprsStation {
  callsign: string;
  ssid?: string;
  lat: number;
  lon: number;
  altitude?: number;
  course?: number;
  speed?: number;
  symbol?: string;
  symbol_table?: string;
  comment?: string;
  path?: string;
  timestamp?: string;
  last_seen?: string;
  weather?: {
    temperature?: number;
    humidity?: number;
    pressure?: number;
    wind_speed?: number;
    wind_direction?: number;
    rain_1h?: number;
  };
  telemetry?: Record<string, number>;
}

/** APRS statistics */
export interface AprsStats {
  total_stations: number;
  active_stations: number;
  packets_last_hour: number;
  packets_last_24h: number;
  digipeaters: number;
  igates: number;
  weather_stations: number;
}

/** APRS packet data */
export interface AprsPacket {
  id: string;
  raw: string;
  from_callsign: string;
  to_callsign: string;
  path?: string;
  packet_type: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

/** EPIRB beacon data */
export interface EpirbBeacon {
  beacon_id: string;
  hex_id: string;
  lat: number;
  lon: number;
  altitude?: number;
  activation_time?: string;
  last_seen?: string;
  beacon_type?: string;
  country_code?: string;
  protocol?: string;
  status: 'active' | 'test' | 'resolved' | 'unknown';
  owner_info?: {
    name?: string;
    vessel_name?: string;
    contact?: string;
  };
  signal_strength?: number;
}

/** EPIRB statistics */
export interface EpirbStats {
  total_beacons: number;
  active_alerts: number;
  test_alerts: number;
  resolved_last_24h: number;
}

// =============================================
// BASELINE TYPES
// =============================================

/** Baseline profile */
export interface BaselineProfile {
  id: number;
  name: string;
  description?: string;
  sensor_type?: string;
  created_at: string;
  entry_count?: number;
}

/** Baseline entry within a profile */
export interface BaselineEntry {
  id: number;
  profile_id: number;
  identifier: string;
  identifier_type: string;
  first_seen: string;
  last_seen: string;
  notes?: string;
}

/** Baseline violation */
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

/** Power statistics */
export interface PowerStats {
  count?: number;
  readings?: Array<{
    timestamp: string;
    power_w?: number;
    voltage?: number;
    current?: number;
  }>;
  timestamp?: string;
  avg_power_w?: number;
  max_power_w?: number;
  min_power_w?: number;
  total_energy_wh?: number;
  readings_count?: number;
}

/** Performance statistics */
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

// =============================================
// SYSTEM INFO TYPES
// =============================================

/** System information */
export interface SystemInfo {
  hostname?: string;
  ip?: string;
  ip_address?: string;
  platform?: string;
  uptime?: string;
  uptime_seconds?: number;
  cpu_count?: number;
  cpu_load?: number[];
  load?: number[];
  memory_total?: number;
  memory_available?: number;
  disk_total?: number;
  disk_free?: number;
  version?: string;
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

/** ARP table entry */
export interface ArpEntry {
  ip: string;
  mac: string;
  interface?: string;
  type?: string;
}

/** Routing table entry */
export interface RoutingEntry {
  destination: string;
  gateway: string;
  genmask?: string;
  flags?: string;
  metric?: number;
  interface?: string;
}

/** Network interface */
export interface NetworkInterface {
  name: string;
  mac?: string;
  ip?: string;
  netmask?: string;
  broadcast?: string;
  state?: string;
  mtu?: number;
  rx_bytes?: number;
  tx_bytes?: number;
}

/** USB device */
export interface UsbDevice {
  bus: string;
  device: string;
  id: string;
  description?: string;
  manufacturer?: string;
  product?: string;
}

/** Service status */
export interface ServiceStatus {
  active: boolean;
  status: string;
  name: string;
}

/** Netstat entry */
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

/** User entity */
export interface User {
  username: string;
  role: string;
  created_at?: string;
  last_login?: string;
  email?: string;
  is_active?: boolean;
}

/** Audit log entry */
export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  resource: string;
  details?: Record<string, unknown>;
  ip_address?: string;
}

/** Audit statistics */
export interface AuditStats {
  total_logs: number;
  actions_by_type: Record<string, number>;
  actions_last_24h: number;
  unique_users: number;
}

/** Activity entry */
export interface ActivityEntry {
  id: string;
  timestamp: string;
  action: string;
  resource?: string;
  details?: Record<string, unknown>;
  user_id?: string;
  username?: string;
}

/** User session */
export interface UserSession {
  session_id: string;
  user_id: string;
  created_at: string;
  last_active?: string;
  ip_address?: string;
  user_agent?: string;
  is_current?: boolean;
}

/** API key */
export interface ApiKey {
  key_id: string;
  name: string;
  created_at: string;
  last_used?: string;
  expires_at?: string;
  permissions?: string[];
}

// =============================================
// WIFI TYPES
// =============================================

/** WiFi mode configuration */
export interface WifiMode {
  mode: string;
  description?: string;
}

/** WiFi configuration */
export interface WifiConfig {
  ssid?: string;
  password?: string;
  channel?: number;
  mode?: string;
  [key: string]: unknown;
}

/** WiFi connection status */
export interface WifiStatus {
  connected: boolean;
  ssid?: string;
  signal_strength?: number;
  ip_address?: string;
  mac_address?: string;
}

/** WiFi network (from scan) */
export interface WifiNetwork {
  ssid: string;
  bssid?: string;
  signal_strength?: number;
  channel?: number;
  security?: string;
}

/** WiFi client connected to AP */
export interface WifiClient {
  mac: string;
  ip?: string;
  hostname?: string;
  connected_at?: string;
}

// =============================================
// EXPORT TYPES
// =============================================

/** Available export format */
export interface ExportFormat {
  format: string;
  description: string;
  mime_type: string;
}

// =============================================
// CONFIGURATION TYPES
// =============================================

/** Server configuration */
export interface ServerConfig {
  server_address?: string;
  server_port?: number;
  data_directory?: string;
  log_level?: string;
  batch_size?: number;
  upload_interval?: number;
  sensors?: Record<string, unknown>;
  [key: string]: unknown;
}

// =============================================
// STATISTICS TYPES
// =============================================

/** Comprehensive statistics response */
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

/** Time period statistics */
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

/** Global statistics */
export interface GlobalStats {
  total_readings?: number;
  total_devices?: number;
  total_clients?: number;
  total_batches?: number;
  active_alerts?: number;
  readings_last_hour?: number;
  readings_last_24h?: number;
}

/** Device statistics */
export interface DeviceStats {
  device_id?: string;
  device_type?: string;
  total_readings?: number;
  first_seen?: string;
  last_seen?: string;
  status?: string;
}

/** Period statistics */
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

/** Aircraft statistics */
export interface AircraftStats {
  total_tracked?: number;
  active?: number;
  positions_received?: number;
  messages_decoded?: number;
  max_range_nm?: number;
  coverage_area_km2?: number;
}

/** Client statistics */
export interface ClientStats {
  client_id: string;
  hostname?: string;
  total_batches: number;
  total_readings: number;
  sensor_types: string[];
  first_seen: string;
  last_seen: string;
  is_active: boolean;
}

// =============================================
// HISTORY POINT TYPES
// =============================================

/** Global stats history point */
export interface GlobalStatsHistoryPoint {
  timestamp: string;
  total_readings: number;
  total_devices: number;
  total_clients: number;
  readings_rate?: number;
}

/** Sensor stats history point */
export interface SensorStatsHistoryPoint {
  timestamp: string;
  sensor_type: string;
  count: number;
  avg_value?: number;
  min_value?: number;
  max_value?: number;
}

/** Device stats history point */
export interface DeviceStatsHistoryPoint {
  timestamp: string;
  active_devices: number;
  inactive_devices: number;
  total_readings: number;
}

/** Alert stats history point */
export interface AlertStatsHistoryPoint {
  timestamp: string;
  active_alerts: number;
  triggered_count: number;
  resolved_count: number;
}

/** System resource stats history point */
export interface SystemResourceStatsHistoryPoint {
  timestamp: string;
  cpu_percent: number;
  memory_percent: number;
  disk_percent: number;
  network_rx_bytes?: number;
  network_tx_bytes?: number;
}

// =============================================
// UPDATE MANAGEMENT TYPES
// =============================================

/** Update package */
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

/** Update assignment */
export interface UpdateAssignment {
  assignment_id: string;
  package_id: string;
  client_id?: string;
  all_clients?: boolean;
  created_at: string;
  status: string;
}

/** Update status per client */
export interface UpdateStatus {
  client_id: string;
  package_id: string;
  status: string;
  started_at?: string;
  completed_at?: string;
  error?: string;
}

/** Update status dashboard */
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

/** Remote command */
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

/** Command execution result */
export interface CommandResult {
  client_id: string;
  command_id: string;
  output?: string;
  error?: string;
  exit_code?: number;
  executed_at?: string;
  status: string;
}

// =============================================
// STREAM MESSAGE TYPES
// =============================================

/** Real-time stream reading message */
export interface StreamReadingMessage {
  type: 'reading';
  device_id: string;
  device_type: string;
  timestamp: string;
  data: Record<string, unknown>;
}

/** Real-time stream client message */
export interface StreamClientMessage {
  type: 'client_update';
  client_id: string;
  event: 'connected' | 'disconnected' | 'state_change';
  state?: ClientState;
}

/** Real-time stream alert message */
export interface StreamAlertMessage {
  type: 'alert';
  alert_id: number;
  severity: string;
  message: string;
  triggered_at: string;
}

/** Real-time stream dashboard stats message */
export interface StreamDashboardStatsMessage {
  type: 'dashboard_stats';
  stats: DashboardStats;
}

/** Real-time stream command status message */
export interface StreamCommandStatusMessage {
  type: 'command_status';
  command_id: string;
  client_id: string;
  status: string;
  output?: string;
  error?: string;
}
