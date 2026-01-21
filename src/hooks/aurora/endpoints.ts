// Aurora API Endpoints - Centralized path configuration
// Based on official API documentation at http://aurora.tophatsecurity.com:9151/docs

// =============================================
// AUTHENTICATION
// =============================================
export const AUTH = {
  LOGIN: '/api/login',
  LOGOUT: '/api/logout',
  VERIFY: '/api/auth/verify',
  ME: '/api/auth/me',
  CHANGE_PASSWORD: '/api/auth/change-password',
} as const;

// =============================================
// USERS
// =============================================
export const USERS = {
  LIST: '/api/users',
  CREATE: '/api/users',
  GET: (userId: string) => `/api/users/${userId}`,
  UPDATE: (userId: string) => `/api/users/${userId}`,
  PATCH: (userId: string) => `/api/users/${userId}`,
  DELETE: (username: string) => `/api/users/${username}`,
  ACTIVATE: (userId: string) => `/api/users/${userId}/activate`,
  DEACTIVATE: (userId: string) => `/api/users/${userId}/deactivate`,
  // API Keys
  API_KEYS: (userId: string) => `/api/users/${userId}/api-keys`,
  DELETE_API_KEY: (userId: string, keyId: string) => `/api/users/${userId}/api-keys/${keyId}`,
  // Sessions
  SESSIONS: (userId: string) => `/api/users/${userId}/sessions`,
  DELETE_SESSION: (userId: string, sessionId: string) => `/api/users/${userId}/sessions/${sessionId}`,
  // Roles & Permissions
  ROLES: (userId: string) => `/api/users/${userId}/roles`,
  DELETE_ROLE: (userId: string, roleId: string) => `/api/users/${userId}/roles/${roleId}`,
  PERMISSIONS: (userId: string) => `/api/users/${userId}/permissions`,
  DELETE_PERMISSION: (userId: string, permissionId: string) => `/api/users/${userId}/permissions/${permissionId}`,
  // Activity
  ACTIVITY: (userId: string) => `/api/users/${userId}/activity`,
} as const;

// =============================================
// ROLES & PERMISSIONS
// =============================================
export const ROLES = {
  LIST: '/api/roles',
  CREATE: '/api/roles',
  UPDATE: (roleId: string) => `/api/roles/${roleId}`,
  DELETE: (roleId: string) => `/api/roles/${roleId}`,
  PERMISSIONS: (roleId: string) => `/api/roles/${roleId}/permissions`,
} as const;

export const PERMISSIONS = {
  LIST: '/api/permissions',
} as const;

// =============================================
// ACTIVITY & AUDIT
// =============================================
export const ACTIVITY = {
  FEED: '/api/activity',
} as const;

export const AUDIT = {
  LOGS: '/api/audit/logs',
  STATS: '/api/audit/stats',
} as const;

// =============================================
// ALERTS
// =============================================
export const ALERTS = {
  LIST: '/api/alerts',
  LIST_FILTERED: '/api/alerts/list',
  STATS: '/api/alerts/stats',
  SETTINGS: '/api/alerts/settings',
  TEST: '/api/alerts/test',
  DEVICE_ALERTS: '/api/device-alerts',
  ACKNOWLEDGE: (alertId: number) => `/api/alerts/${alertId}/acknowledge`,
  RESOLVE: (alertId: number) => `/api/alerts/${alertId}/resolve`,
  DELETE: (alertId: number) => `/api/alerts/${alertId}`,
  // Rules
  RULES: '/api/alerts/rules',
  RULE: (ruleId: number) => `/api/alerts/rules/${ruleId}`,
} as const;

// =============================================
// SENSORS
// =============================================
export const SENSORS = {
  LIST: '/api/sensors/list',
  RECENT: '/api/sensors/recent',
  GET: (sensorId: string) => `/api/sensors/${sensorId}`,
  ADD: '/api/sensors/add',
  UPDATE: (sensorId: string) => `/api/sensors/${sensorId}`,
  DELETE: (sensorId: string) => `/api/sensors/${sensorId}`,
} as const;

// =============================================
// READINGS
// =============================================
export const READINGS = {
  LATEST: '/api/readings/latest',
  BY_SENSOR_TYPE: (sensorType: string) => `/api/readings/sensor/${sensorType}`,
} as const;

// =============================================
// DEVICES
// =============================================
export const DEVICES = {
  TREE: '/api/devices/tree',
  STATUS: '/api/devices/status',
  GET: (deviceId: string) => `/api/devices/${deviceId}`,
  LATEST: (deviceId: string) => `/api/devices/${deviceId}/latest`,
  READINGS: (deviceId: string) => `/api/devices/${deviceId}/readings`,
  STATS: (deviceId: string) => `/api/devices/${deviceId}/stats`,
} as const;

// =============================================
// BATCHES
// =============================================
export const BATCHES = {
  LIST: '/api/batches/list',
  LATEST: '/api/batches/latest',
  GET: (batchId: string) => `/api/batches/${batchId}`,
  SENSORS: (batchId: string) => `/api/batches/${batchId}/sensors`,
  READINGS: (batchId: string) => `/api/batches/${batchId}/readings`,
  BY_CLIENT: (clientId: string) => `/api/batches/by-client/${clientId}`,
} as const;

// =============================================
// CLIENTS
// =============================================
export const CLIENTS = {
  LIST: '/api/clients/list',
  GET: (clientId: string) => `/api/clients/${clientId}`,
  UPDATE: (clientId: string) => `/api/clients/${clientId}`,
  DELETE: (clientId: string) => `/api/clients/${clientId}`,
  HEARTBEAT: (clientId: string) => `/api/clients/${clientId}/heartbeat`,
  ADOPT: (clientId: string) => `/api/clients/${clientId}/adopt`,
  // State Management
  ALL_STATES: '/api/clients/all-states',
  STATISTICS: '/api/clients/statistics',
  PENDING: '/api/clients/pending',
  REGISTERED: '/api/clients/registered',
  ADOPTED: '/api/clients/adopted',
  DISABLED: '/api/clients/disabled',
  SUSPENDED: '/api/clients/suspended',
  DELETED: '/api/clients/deleted',
  REGISTER: (clientId: string) => `/api/clients/${clientId}/register`,
  ADOPT_DIRECT: (clientId: string) => `/api/clients/${clientId}/adopt-direct`,
  DISABLE: (clientId: string) => `/api/clients/${clientId}/disable`,
  ENABLE: (clientId: string) => `/api/clients/${clientId}/enable`,
  SUSPEND: (clientId: string) => `/api/clients/${clientId}/suspend`,
  SOFT_DELETE: (clientId: string) => `/api/clients/${clientId}/delete-soft`,
  RESTORE: (clientId: string) => `/api/clients/${clientId}/restore`,
  STATE_HISTORY: (clientId: string) => `/api/clients/${clientId}/state-history`,
  // System Info
  SYSTEM_INFO: (clientId: string) => `/api/clients/${clientId}/system-info`,
  SYSTEM_INFO_ALL: '/api/clients/system-info/all',
  // Config
  CONFIG: (clientId: string) => `/api/clients/${clientId}/config`,
  CONFIG_VERSION: (clientId: string) => `/api/clients/${clientId}/config/version`,
  CONFIGS_ALL: '/api/clients/configs/all',
  // WiFi
  WIFI_MODE: (clientId: string) => `/api/clients/${clientId}/wifi/mode`,
  WIFI_CONFIG: (clientId: string) => `/api/clients/${clientId}/wifi/config`,
  WIFI_STATUS: (clientId: string) => `/api/clients/${clientId}/wifi/status`,
  WIFI_SCAN: (clientId: string) => `/api/clients/${clientId}/wifi/scan`,
  WIFI_CLIENTS: (clientId: string) => `/api/clients/${clientId}/wifi/clients`,
  WIFI_DISCONNECT: (clientId: string, mac: string) => `/api/clients/${clientId}/wifi/clients/${mac}/disconnect`,
  WIFI_VERSION: (clientId: string) => `/api/clients/${clientId}/wifi/version`,
  // Updates
  UPDATES_AVAILABLE: (clientId: string) => `/api/clients/${clientId}/updates/available`,
  UPDATES_DOWNLOAD: (clientId: string, packageId: string) => `/api/clients/${clientId}/updates/download/${packageId}`,
  UPDATES_STATUS: (clientId: string) => `/api/clients/${clientId}/updates/status`,
  // Commands
  COMMANDS_PENDING: (clientId: string) => `/api/clients/${clientId}/commands/pending`,
  COMMANDS_RESULTS: (clientId: string) => `/api/clients/${clientId}/commands/results`,
} as const;

// =============================================
// ADS-B
// =============================================
export const ADSB = {
  AIRCRAFT: '/api/adsb/aircraft',
  AIRCRAFT_BY_ICAO: (icao: string) => `/api/adsb/aircraft/${icao}`,
  STATS: '/api/adsb/stats',
  EMERGENCIES: '/api/adsb/emergencies',
  NEARBY: '/api/adsb/nearby',
  LOW_ALTITUDE: '/api/adsb/low-altitude',
  COVERAGE: '/api/adsb/coverage',
  HISTORY: (icao: string) => `/api/adsb/history/${icao}`,
  DEVICES: '/api/adsb/devices',
} as const;

// =============================================
// STARLINK
// =============================================
export const STARLINK = {
  // Device management
  DEVICES: '/api/starlink/devices',
  DEVICE: (deviceId: string) => `/api/starlink/devices/${deviceId}`,
  // Real-time status & history
  STATUS: (deviceId: string) => `/api/starlink/status/${deviceId}`,
  HISTORY: (deviceId: string) => `/api/starlink/history/${deviceId}`,
  OBSTRUCTIONS: (deviceId: string) => `/api/starlink/obstructions/${deviceId}`,
  // Stats endpoints
  STATS: '/api/starlink/stats',
  STATS_GLOBAL: '/api/starlink/stats/global',
  STATS_DEVICE: (deviceId: string) => `/api/starlink/stats/device/${deviceId}`,
  // Metrics endpoints  
  SIGNAL_STRENGTH: '/api/starlink/signal-strength',
  PERFORMANCE: '/api/starlink/performance',
  POWER: '/api/starlink/power',
  CONNECTIVITY: '/api/starlink/connectivity',
  // Timeseries - supports ?hours= query param
  TIMESERIES: '/api/starlink/timeseries',
  TIMESERIES_DEVICE: (deviceId: string) => `/api/starlink/timeseries/${deviceId}`,
} as const;

// =============================================
// LORA
// =============================================
export const LORA = {
  DEVICES: '/api/lora/devices',
  DEVICE: (deviceId: string) => `/api/lora/devices/${deviceId}`,
  ACTIVATE: (deviceId: string) => `/api/lora/devices/${deviceId}/activate`,
  DEACTIVATE: (deviceId: string) => `/api/lora/devices/${deviceId}/deactivate`,
  DETECTIONS: '/api/lora/detections',
  DETECTIONS_RECENT: '/api/lora/detections/recent',
  STATS_GLOBAL: '/api/lora/stats/global',
  STATS_DEVICE: (deviceId: string) => `/api/lora/stats/device/${deviceId}`,
  CHANNELS: '/api/lora/channels',
  SPECTRUM: '/api/lora/spectrum',
  // Config
  CONFIG_DEVICES: '/api/lora/config/devices',
  CONFIG_DEVICE: (deviceId: string) => `/api/lora/config/devices/${deviceId}`,
} as const;

// =============================================
// MARITIME (AIS, APRS, EPIRB)
// =============================================
export const AIS = {
  VESSELS: '/api/ais/vessels',
  VESSEL: (mmsi: string) => `/api/ais/vessels/${mmsi}`,
  STATS: '/api/ais/stats',
  NEARBY: '/api/ais/nearby',
  HISTORY: (mmsi: string) => `/api/ais/history/${mmsi}`,
} as const;

export const APRS = {
  STATIONS: '/api/aprs/stations',
  STATION: (callsign: string) => `/api/aprs/stations/${callsign}`,
  STATS: '/api/aprs/stats',
  PACKETS: '/api/aprs/packets',
  NEARBY: '/api/aprs/nearby',
  HISTORY: (callsign: string) => `/api/aprs/history/${callsign}`,
  WEATHER: '/api/aprs/weather',
} as const;

export const EPIRB = {
  BEACONS: '/api/epirb/beacons',
  BEACON: (beaconId: string) => `/api/epirb/beacons/${beaconId}`,
  STATS: '/api/epirb/stats',
  ACTIVE: '/api/epirb/active',
  HISTORY: (beaconId: string) => `/api/epirb/history/${beaconId}`,
} as const;

// =============================================
// SYSTEM
// =============================================
export const SYSTEM = {
  ALL: '/api/system/all',
  ARP: '/api/system/arp',
  ROUTING: '/api/system/routing',
  INTERFACES: '/api/system/interfaces',
  NETSTAT: '/api/system/netstat',
  EXTERNAL_IP: '/api/system/external-ip',
  HOSTNAME: '/api/system/hostname',
  IP: '/api/system/ip',
  UPTIME: '/api/system/uptime',
  LOAD: '/api/system/load',
  MEMORY: '/api/system/memory',
  DISK: '/api/system/disk',
  USB: '/api/system/usb',
  SERVICE: (serviceName: string) => `/api/systemctl/${serviceName}`,
} as const;

// =============================================
// HEALTH
// =============================================
export const HEALTH = {
  ROOT: '/health',
  API: '/api/health',
} as const;

// =============================================
// STATS
// =============================================
export const STATS = {
  // Comprehensive stats - all granularities at once
  ALL: '/api/stats',
  COMPREHENSIVE: '/api/stats/comprehensive',
  SUMMARY: '/api/stats/summary',
  GLOBAL: '/api/stats/global',
  OVERVIEW: '/api/stats/overview',
  // Time-based granularities
  HOUR_1: '/api/stats/1hr',
  HOUR_6: '/api/stats/6hr',
  HOUR_12: '/api/stats/12hr',
  HOUR_24: '/api/stats/24hr',
  WEEKLY: '/api/stats/weekly',
  // Grouped stats
  BY_CLIENT: '/api/stats/by-client',
  BY_SENSOR: '/api/stats/by-sensor',
  // Entity-specific stats
  CLIENT: (clientId: string) => `/api/stats/client/${clientId}`,
  CLIENT_LATEST: (clientId: string) => `/api/stats/client/${clientId}/latest`,
  DEVICES: '/api/stats/devices',
  DEVICE: (deviceId: string) => `/api/stats/devices/${deviceId}`,
  SENSORS: '/api/stats/sensors',
  SENSOR_TYPE: (sensorType: string) => `/api/stats/sensors/${sensorType}`,
  SENSOR_DETAIL: (sensorType: string) => `/api/stats/sensor/${sensorType}`,
  SENSORS_BY_TYPE: '/api/stats/sensors/by-type',
  SENSORS_BY_CLIENT: (clientId: string) => `/api/stats/sensors/by-client/${clientId}`,
  SENSORS_BY_CLIENT_LATEST: (clientId: string) => `/api/stats/sensors/by-client/${clientId}/latest`,
  AIRCRAFT: '/api/stats/aircraft',
  ENDPOINTS: '/api/stats/endpoints',
  ENDPOINTS_HISTORY: '/api/stats/endpoints/history',
  PERFORMANCE: '/api/performance/stats',
  POWER: '/api/power/stats',
  // Historical timeseries
  HISTORY_GLOBAL: '/api/stats/history/global',
  HISTORY_SENSORS: '/api/stats/history/sensors',
  HISTORY_DEVICES: '/api/stats/history/devices',
  HISTORY_ALERTS: '/api/stats/history/alerts',
  HISTORY_SYSTEM: '/api/stats/history/system',
} as const;

// =============================================
// POWER
// =============================================
export const POWER = {
  CURRENT: '/api/power/current',
  SUMMARY: '/api/power/summary',
  HISTORY: '/api/power/history',
  DEVICES: '/api/power/devices',
  BATTERY: '/api/power/battery',
  VOLTAGE: '/api/power/voltage',
  USB: '/api/power/usb',
} as const;

// =============================================
// BLUETOOTH
// =============================================
export const BLUETOOTH = {
  DEVICES: '/api/bluetooth/devices',
  SCAN: '/api/bluetooth/scan',
  NEARBY: '/api/bluetooth/nearby',
  STATS: '/api/bluetooth/stats',
  HISTORY: (macAddress: string) => `/api/bluetooth/history/${macAddress}`,
} as const;

// =============================================
// WIFI
// =============================================
export const WIFI = {
  DEVICES: '/api/wifi/devices',
  SCAN: '/api/wifi/scan',
  NETWORKS: '/api/wifi/networks',
  NEARBY: '/api/wifi/nearby',
  STATS: '/api/wifi/stats',
  HISTORY: (bssid: string) => `/api/wifi/history/${bssid}`,
} as const;

// =============================================
// DASHBOARD
// =============================================
export const DASHBOARD = {
  SENSOR_STATS: '/api/dashboard/sensor-stats',
  SENSOR_TIMESERIES: '/api/dashboard/sensor-timeseries',
  SYSTEM_STATS: '/api/dashboard/system-stats',
} as const;

// =============================================
// CONFIG
// =============================================
export const CONFIG = {
  GET: '/api/config',
  UPDATE: '/api/config',
} as const;

// =============================================
// TIMESERIES & ANALYTICS
// =============================================
export const TIMESERIES = {
  GET: '/api/timeseries',
  MOVING_AVERAGE: '/api/v1/data/moving_average',
  // Sensor-specific timeseries
  SENSOR: (sensorType: string) => `/api/timeseries/sensor/${sensorType}`,
  DEVICE: (deviceId: string) => `/api/timeseries/device/${deviceId}`,
  CLIENT: (clientId: string) => `/api/timeseries/client/${clientId}`,
} as const;

// =============================================
// EXPORT
// =============================================
export const EXPORT = {
  FORMATS: '/api/export/formats',
  CSV: '/api/v1/export/csv',
  JSON: '/api/v1/export/json',
} as const;

// =============================================
// LOGS
// =============================================
export const LOGS = {
  GET: '/api/logs',
  DATACOLLECTOR: '/api/logs/datacollector',
  DATASERVER: '/api/logs/dataserver',
} as const;

// =============================================
// GEO & IP GEOLOCATION
// =============================================
export const GEO = {
  LOCATIONS: '/api/geo/locations',
  UPDATE: '/api/geo/update',
  // IP Geolocation - lookup location by IP address
  LOOKUP: '/api/geo/lookup',
  LOOKUP_IP: (ip: string) => `/api/geo/lookup/${ip}`,
} as const;

// IP Geolocation (alternative endpoints)
export const IP_GEO = {
  // External IP with geolocation
  LOCATE: '/api/ip/locate',
  LOCATE_IP: (ip: string) => `/api/ip/locate/${ip}`,
  // Client IP geolocation
  CLIENT: (clientId: string) => `/api/clients/${clientId}/location`,
} as const;

// =============================================
// LOCATION (New unified location API)
// =============================================
export const LOCATION = {
  // Get latest location for a client
  CLIENT_LATEST: (clientId: string) => `/api/location/client/${clientId}/latest`,
  // Get location history for a client (supports ?hours= query param)
  CLIENT_HISTORY: (clientId: string) => `/api/location/client/${clientId}/history`,
  // Get summary stats (supports ?hours= query param)
  SUMMARY: '/api/location/summary',
  // Get GeoJSON track for mapping (supports ?hours= query param)
  TRACK: (clientId: string) => `/api/location/track/${clientId}`,
} as const;

// =============================================
// MAP (Unified map markers API)
// =============================================
export const MAP = {
  // Unified endpoint for all map markers (clients, Starlink, aircraft)
  // Query params: include_clients, include_starlink, include_aircraft, client_id, hours
  MARKERS: '/api/map/markers',
} as const;

// =============================================
// GPS
// =============================================
export const GPS = {
  READINGS: '/api/readings/sensor/gps',
  STATUS: '/api/gpsd/status',
  SATELLITES: '/api/gpsd/satellites',
} as const;

// =============================================
// THERMAL PROBE
// =============================================
export const THERMAL = {
  READINGS: '/api/readings/sensor/thermal_probe',
  STATS: '/api/stats/sensors/thermal_probe',
} as const;

// =============================================
// ARDUINO
// =============================================
export const ARDUINO = {
  READINGS: '/api/readings/sensor/arduino',
  STATS: '/api/stats/sensors/arduino',
} as const;

// =============================================
// SYSTEM MONITOR
// =============================================
export const SYSTEM_MONITOR = {
  READINGS: '/api/readings/sensor/system_monitor',
  STATS: '/api/stats/sensors/system_monitor',
} as const;

// =============================================
// AHT/BMT SENSORS
// =============================================
export const AHT_SENSOR = {
  READINGS: '/api/readings/sensor/aht_sensor',
  STATS: '/api/stats/sensors/aht_sensor',
} as const;

export const BMT_SENSOR = {
  READINGS: '/api/readings/sensor/bmt_sensor',
  STATS: '/api/stats/sensors/bmt_sensor',
} as const;

// =============================================
// REAL-TIME STREAMS (SSE)
// =============================================
export const STREAMS = {
  READINGS: '/api/stream/readings',
  COMMAND_STATUS: (commandId: string) => `/api/stream/commands/${commandId}/status`,
  CLIENTS: '/api/stream/clients',
  ALERTS: '/api/stream/alerts',
  DASHBOARD_STATS: '/api/stream/dashboard/stats',
  // Sensor-specific streams
  STARLINK: '/api/stream/readings/starlink',
  THERMAL_PROBE: '/api/stream/readings/thermal_probe',
  ADSB: '/api/stream/readings/adsb',
  ARDUINO: '/api/stream/readings/arduino',
  GPS: '/api/stream/readings/gps',
  POWER: '/api/stream/readings/power',
  SYSTEM_MONITOR: '/api/stream/readings/system_monitor',
  RADIO: '/api/stream/readings/radio',
} as const;
// =============================================
export const ADMIN_UPDATES = {
  UPLOAD: '/api/admin/updates/upload',
  PACKAGES: '/api/admin/updates/packages',
  PACKAGE: (packageId: string) => `/api/admin/updates/packages/${packageId}`,
  PUBLISH: (packageId: string) => `/api/admin/updates/packages/${packageId}/publish`,
  ASSIGNMENTS: '/api/admin/updates/assignments',
  STATUS: '/api/admin/updates/status',
  CLIENT_HISTORY: (clientId: string) => `/api/admin/updates/clients/${clientId}/history`,
} as const;

// =============================================
// ADMIN - COMMANDS
// =============================================
export const ADMIN_COMMANDS = {
  SEND: '/api/admin/commands/send',
  LIST: '/api/admin/commands/list',
  RESULTS: (commandId: string) => `/api/admin/commands/${commandId}/results`,
  CLIENT_RESULT: (commandId: string, clientId: string) => `/api/admin/commands/${commandId}/results/${clientId}`,
} as const;

// =============================================
// ADMIN - BATCH RETENTION
// =============================================
export const ADMIN_BATCH_RETENTION = {
  CONFIG: '/api/admin/batch-retention/config',
  CLIENT: (clientId: string) => `/api/admin/batch-retention/clients/${clientId}`,
  CLIENT_DEBUG: (clientId: string) => `/api/admin/batch-retention/clients/${clientId}/debug`,
  DISK_USAGE: '/api/admin/batch-retention/disk-usage',
} as const;

// =============================================
// BASELINES
// =============================================
export const BASELINES = {
  PROFILES: '/api/baselines/profiles',
  PROFILE_ENTRIES: (profileId: string) => `/api/baselines/profiles/${profileId}/entries`,
  ENTRY_DELETE: (entryId: string) => `/api/baselines/entries/${entryId}`,
  VIOLATIONS: '/api/baselines/violations',
  VIOLATION_ACK: (violationId: string) => `/api/baselines/violations/${violationId}/acknowledge`,
  VIOLATION_WHITELIST: (violationId: string) => `/api/baselines/violations/${violationId}/whitelist`,
  AUTO_LEARN: (profileId: string) => `/api/baselines/profiles/${profileId}/auto-learn`,
} as const;

// =============================================
// V1 API
// =============================================
export const V1 = {
  DEVICES: '/api/v1/devices',
  READINGS: '/api/v1/data/readings',
  LATEST: '/api/v1/data/latest',
  BATCH: '/api/v1/batch',
  CLIENT_CONFIG: '/api/v1/client/config',
  CONFIG: (clientId: string) => `/api/v1/config/${clientId}`,
  CONFIG_NEW: '/api/v1/config/new',
  CONFIG_ALL: '/api/v1/config',
} as const;

// =============================================
// DATA FILES (JSONL)
// =============================================
export const DATA_FILES = {
  STARLINK_STATUS: '/starlink_status.jsonl',
  GPSD_STATUS: '/gpsd_status.jsonl',
  BANDWIDTH: '/bandwidth.jsonl',
  ARDUINO_DATA: '/arduino_data.jsonl',
  VISIBLE_SATS: '/visible_sats.jsonl',
  PING_STATS: '/ping_stats.jsonl',
} as const;

// =============================================
// HELPER TYPES
// =============================================
export type EndpointPath = string | ((...args: string[]) => string);

// Query string builder helper
export function buildQueryString(params: Record<string, string | number | boolean | undefined | null>): string {
  const filtered = Object.entries(params)
    .filter(([_, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  
  return filtered.length > 0 ? `?${filtered.join('&')}` : '';
}

// Append query params to a path
export function withQuery(path: string, params: Record<string, string | number | boolean | undefined | null>): string {
  const queryString = buildQueryString(params);
  return `${path}${queryString}`;
}
