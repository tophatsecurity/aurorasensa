// Aurora API Endpoints - Centralized path configuration
// Based on official API documentation at http://aurora.tophatsecurity.com:9151/docs
// Last synced: 2026-02-13

// =============================================
// AUTHENTICATION
// =============================================
export const AUTH = {
  LOGIN: '/api/login',
  LOGOUT: '/api/logout',
  AUTH_LOGIN: '/api/auth/login',
  AUTH_LOGOUT: '/api/auth/logout',
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
  SEARCH: '/api/users/search',
  BY_ROLE: (roleName: string) => `/api/users/by-role/${roleName}`,
  GET: (userId: string) => `/api/users/${userId}`,
  UPDATE: (userId: string) => `/api/users/${userId}`,
  PATCH: (userId: string) => `/api/users/${userId}`,
  DELETE: (username: string) => `/api/users/${username}`,
  ACTIVATE: (userId: string) => `/api/users/${userId}/activate`,
  DEACTIVATE: (userId: string) => `/api/users/${userId}/deactivate`,
  PASSWORD: (userId: string) => `/api/users/${userId}/password`,
  CHANGE_PASSWORD: (userId: string) => `/api/users/${userId}/change-password`,
  RESET_PASSWORD: (userId: string) => `/api/users/${userId}/reset-password`,
  // API Keys
  API_KEYS: (userId: string) => `/api/users/${userId}/api-keys`,
  DELETE_API_KEY: (userId: string, keyId: string) => `/api/users/${userId}/api-keys/${keyId}`,
  // Sessions
  SESSIONS: (userId: string) => `/api/users/${userId}/sessions`,
  DELETE_ALL_SESSIONS: (userId: string) => `/api/users/${userId}/sessions`,
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
  ASSIGN_PERMISSIONS: (roleId: string) => `/api/roles/${roleId}/permissions`,
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
  ADD: '/api/alerts/add',
  DEVICE_ALERTS: '/api/device-alerts',
  GET: (alertId: number) => `/api/alerts/${alertId}`,
  ACKNOWLEDGE: (alertId: number) => `/api/alerts/${alertId}/acknowledge`,
  RESOLVE: (alertId: number) => `/api/alerts/${alertId}/resolve`,
  DELETE: (alertId: number) => `/api/alerts/${alertId}`,
  EXCLUDE_SOURCE: (alertId: number) => `/api/alerts/${alertId}/exclude-source`,
  // Rules
  RULES: '/api/alerts/rules',
  RULE: (ruleId: number) => `/api/alerts/rules/${ruleId}`,
  // Exclusions
  EXCLUSIONS: '/api/alerts/exclusions',
  DELETE_EXCLUSION: (exclusionId: number) => `/api/alerts/exclusions/${exclusionId}`,
  CLEANUP_EXCLUSIONS: '/api/alerts/exclusions/cleanup',
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
  // V1 data retrieval
  V1_READINGS: '/api/v1/data/readings',
  V1_LATEST: '/api/v1/data/latest',
} as const;

// =============================================
// DEVICES (CRUD)
// =============================================
export const DEVICES = {
  LIST: '/api/devices',
  CREATE: '/api/devices',
  TREE: '/api/devices/tree',
  STATUS: '/api/devices/status',
  STATUS_SUMMARY: '/api/devices/status/summary',
  GET: (deviceId: string) => `/api/devices/${deviceId}`,
  UPDATE: (deviceId: string) => `/api/devices/${deviceId}`,
  DELETE: (deviceId: string) => `/api/devices/${deviceId}`,
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
  REGISTER: '/api/clients/register',
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
  REGISTER_CLIENT: (clientId: string) => `/api/clients/${clientId}/register`,
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
  // WiFi Management
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
  // Client-based endpoints (NEW)
  CLIENTS: '/api/starlink/clients',
  SUMMARY: '/api/starlink/summary',
  CLIENT_LATEST: (clientId: string) => `/api/starlink/clients/${clientId}/latest`,
  CLIENT_TELEMETRY: (clientId: string) => `/api/starlink/clients/${clientId}/telemetry`,
  CLIENT_PERFORMANCE: (clientId: string) => `/api/starlink/clients/${clientId}/performance`,
  CLIENT_GPS: (clientId: string) => `/api/starlink/clients/${clientId}/gps`,
  CLIENT_OBSTRUCTION: (clientId: string) => `/api/starlink/clients/${clientId}/obstruction`,
  CLIENT_POWER: (clientId: string) => `/api/starlink/clients/${clientId}/power`,
  CLIENT_CONNECTION: (clientId: string) => `/api/starlink/clients/${clientId}/connection`,
  CLIENT_HOURLY_STATS: (clientId: string) => `/api/starlink/clients/${clientId}/hourly-stats`,
  // Real-time status & history (legacy device-based)
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
  CREATE: '/api/lora/devices',
  UPDATE: (deviceId: string) => `/api/lora/devices/${deviceId}`,
  PATCH: (deviceId: string) => `/api/lora/devices/${deviceId}`,
  DELETE: (deviceId: string) => `/api/lora/devices/${deviceId}`,
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
  // LoRa Detector (NEW)
  SCAN: '/api/lora/scan',
  HISTORY: '/api/lora/history',
  PACKETS: '/api/lora/packets',
  PACKETS_RECENT: '/api/lora/packets/recent',
  PACKETS_BY_DEVICE: '/api/lora/packets/by-device',
  SUMMARY: '/api/lora/summary',
  NETWORK_ANALYSIS: '/api/lora/network-analysis',
  STRONGEST: '/api/lora/strongest',
  DETECTORS: '/api/lora/detectors',
} as const;

// =============================================
// MARITIME & RADIO (Unified)
// =============================================
export const MARITIME = {
  // AIS
  AIS_VESSELS: '/api/maritime/ais/vessels',
  AIS_POSITIONS: '/api/maritime/ais/positions',
  AIS_VESSEL: (mmsi: string) => `/api/maritime/ais/vessel/${mmsi}`,
  AIS_NEARBY: '/api/maritime/ais/nearby',
  // APRS
  APRS_STATIONS: '/api/maritime/aprs/stations',
  APRS_PACKETS: '/api/maritime/aprs/packets',
  APRS_STATION: (callsign: string) => `/api/maritime/aprs/station/${callsign}`,
  APRS_WEATHER: '/api/maritime/aprs/weather',
  // EPIRB
  EPIRB_BEACONS: '/api/maritime/epirb/beacons',
  EPIRB_EMERGENCIES: '/api/maritime/epirb/emergencies',
  // Summary
  SUMMARY: '/api/maritime/summary',
  DEVICES: '/api/maritime/devices',
  // Combined stats
  RADIO_STATS: '/api/maritime-radio/stats',
} as const;

// Legacy AIS/APRS/EPIRB endpoints (kept for backward compat)
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
// ARDUINO SENSORS (NEW dedicated endpoints)
// =============================================
export const ARDUINO = {
  DEVICES: '/api/arduino/devices',
  CURRENT: '/api/arduino/current',
  TEMPERATURE: '/api/arduino/temperature',
  HUMIDITY: '/api/arduino/humidity',
  PRESSURE: '/api/arduino/pressure',
  LIGHT: '/api/arduino/light',
  SOUND: '/api/arduino/sound',
  ACCELEROMETER: '/api/arduino/accelerometer',
  HISTORY: '/api/arduino/history',
  SUMMARY: '/api/arduino/summary',
  STATS: '/api/arduino/stats',
  // Generic readings fallback
  READINGS: '/api/readings/sensor/arduino',
} as const;

// =============================================
// THERMAL PROBES (NEW dedicated endpoints)
// =============================================
export const THERMAL = {
  DEVICES: '/api/thermal/devices',
  LATEST: '/api/thermal/latest',
  CELSIUS: '/api/thermal/celsius',
  FAHRENHEIT: '/api/thermal/fahrenheit',
  HISTORY: '/api/thermal/history',
  STATS: '/api/thermal/stats',
  STATUS: '/api/thermal/status',
  // Generic readings fallback
  READINGS: '/api/readings/sensor/thermal_probe',
} as const;

// =============================================
// WIFI SCANNER (NEW dedicated endpoints)
// =============================================
export const WIFI = {
  DEVICES: '/api/wifi/devices',
  SCAN: '/api/wifi/scan',
  NETWORKS: '/api/wifi/networks',
  NEARBY: '/api/wifi/nearby',
  STATS: '/api/wifi/stats',
  HISTORY: '/api/wifi/history',
  SUMMARY: '/api/wifi/summary',
  SECURITY_ANALYSIS: '/api/wifi/security-analysis',
  STRONGEST: '/api/wifi/strongest',
  CLIENT_NETWORKS: (clientId: string) => `/api/wifi/clients/${clientId}/networks`,
} as const;

// =============================================
// BLUETOOTH SCANNER (NEW dedicated endpoints)
// =============================================
export const BLUETOOTH = {
  DEVICES: '/api/bluetooth/devices',
  SCAN: '/api/bluetooth/scan',
  NEARBY: '/api/bluetooth/nearby',
  STATS: '/api/bluetooth/stats',
  HISTORY: '/api/bluetooth/history',
  SUMMARY: '/api/bluetooth/summary',
  BY_TYPE: '/api/bluetooth/by-type',
  SCANNERS: '/api/bluetooth/scanners',
  CLIENT_DEVICES: (clientId: string) => `/api/bluetooth/clients/${clientId}/devices`,
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
  // Comprehensive stats
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
// POWER MANAGEMENT
// =============================================
export const POWER = {
  CURRENT: '/api/power/current',
  SUMMARY: '/api/power/summary',
  HISTORY: '/api/power/history',
  DEVICES: '/api/power/devices',
  BATTERY: '/api/power/battery',
  VOLTAGE: '/api/power/voltage',
  USB: '/api/power/usb',
  STATS: '/api/power/stats',
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
  COMPREHENSIVE_TYPES: '/api/v1/export/comprehensive/types',
  COMPREHENSIVE_CSV: '/api/v1/export/comprehensive/csv',
  COMPREHENSIVE_STATS: '/api/v1/export/comprehensive/stats',
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
  LOOKUP: '/api/geo/lookup',
  LOOKUP_IP: (ip: string) => `/api/geo/lookup/${ip}`,
} as const;

export const IP_GEO = {
  LOCATE: '/api/ip/locate',
  LOCATE_IP: (ip: string) => `/api/ip/locate/${ip}`,
  CLIENT: (clientId: string) => `/api/clients/${clientId}/location`,
} as const;

// =============================================
// LOCATION
// =============================================
export const LOCATION = {
  CLIENT_LATEST: (clientId: string) => `/api/location/client/${clientId}/latest`,
  CLIENT_HISTORY: (clientId: string) => `/api/location/client/${clientId}/history`,
  CLIENTS_LATEST: '/api/location/clients/latest',
  SUMMARY: '/api/location/summary',
  TRACK: (clientId: string) => `/api/location/track/${clientId}`,
} as const;

// =============================================
// MAP
// =============================================
export const MAP = {
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
  // General streams
  READINGS: '/api/stream/readings',
  CLIENTS: '/api/stream/clients',
  CLIENT: (clientId: string) => `/api/stream/clients/${clientId}`,
  ALERTS: '/api/stream/alerts',
  DASHBOARD_STATS: '/api/stream/dashboard/stats',
  DASHBOARD_CLIENTS: '/api/stream/dashboard/clients',
  COMMAND_STATUS: (commandId: string) => `/api/stream/commands/${commandId}/status`,
  // Sensor-specific streams (generic pattern)
  SENSOR: (sensorType: string) => `/api/stream/readings/${sensorType}`,
  // Named sensor streams
  STARLINK: '/api/stream/starlink',
  STARLINK_READINGS: '/api/stream/readings/starlink',
  THERMAL_PROBE: '/api/stream/readings/thermal_probe',
  ADSB: '/api/stream/readings/adsb',
  ARDUINO: '/api/stream/readings/arduino',
  GPS: '/api/stream/readings/gps',
  POWER: '/api/stream/readings/power',
  SYSTEM_MONITOR: '/api/stream/readings/system_monitor',
  RADIO: '/api/stream/readings/radio',
  // New streams
  MAP_POSITIONS: '/api/stream/map/positions',
  SYSTEM_HEALTH: '/api/stream/system/health',
} as const;

// =============================================
// REMOTE COMMANDS (NEW unified)
// =============================================
export const COMMANDS = {
  SEND: '/api/commands/send',
  SEND_BATCH: '/api/commands/send-batch',
  LIST: '/api/commands/list',
  GET: (commandId: string) => `/api/commands/${commandId}`,
  STATUS: (commandId: string) => `/api/commands/${commandId}/status`,
  RESULTS: (commandId: string) => `/api/commands/${commandId}/results`,
  CANCEL: (commandId: string) => `/api/commands/${commandId}/cancel`,
  PENDING: '/api/commands/pending',
  HISTORY: '/api/commands/history',
  CLIENT_COMMANDS: (clientId: string) => `/api/commands/clients/${clientId}/commands`,
  STATS: '/api/commands/stats',
} as const;

// =============================================
// OTA UPDATES (NEW unified)
// =============================================
export const UPDATES = {
  LIST: '/api/updates/list',
  UPLOAD: '/api/updates/upload',
  GET: (updateId: string) => `/api/updates/${updateId}`,
  DELETE: (updateId: string) => `/api/updates/${updateId}`,
  DEPLOY: '/api/updates/deploy',
  DEPLOYMENTS_STATUS: '/api/updates/deployments/status',
  ROLLBACK: (deploymentId: string) => `/api/updates/deployments/${deploymentId}/rollback`,
  LATEST: '/api/updates/latest',
  HISTORY: '/api/updates/history',
  CLIENT_UPDATES: (clientId: string) => `/api/updates/clients/${clientId}/updates`,
  CLIENT_STATUS: (clientId: string) => `/api/updates/clients/${clientId}/status`,
} as const;

// =============================================
// BATCH RETENTION (NEW unified)
// =============================================
export const RETENTION = {
  POLICIES: '/api/retention/policies',
  CREATE_POLICY: '/api/retention/policies',
  POLICY: (policyId: string) => `/api/retention/policies/${policyId}`,
  DELETE_POLICY: (policyId: string) => `/api/retention/policies/${policyId}`,
  APPLY: '/api/retention/apply',
  APPLY_ALL: '/api/retention/apply-all',
  STATUS: '/api/retention/status',
  PREVIEW: (policyId: string) => `/api/retention/preview/${policyId}`,
  SUMMARY: '/api/retention/summary',
  CLEANUP_HISTORY: '/api/retention/cleanup-history',
  STATS: '/api/retention/stats',
} as const;

// =============================================
// PARSER STATISTICS (NEW)
// =============================================
export const PARSER = {
  STATS: '/api/parser/stats',
  SUMMARY: '/api/parser/summary',
  HEALTH: '/api/parser/health',
  INGESTION_RATE: '/api/parser/ingestion-rate',
  JSON_FILES: '/api/parser/json-files',
  BATCH_QUEUE: '/api/parser/batch-queue',
  CLIENT_DATA_SIZES: '/api/parser/client-data-sizes',
  CLIENT_INGESTION: '/api/parser/client-ingestion',
  CLIENT_STATS: (clientId: string) => `/api/parser/client/${clientId}/stats`,
  PARSE_TIMES: '/api/parser/parse-times',
  SUCCESS_RATE: '/api/parser/success-rate',
  ERRORS: '/api/parser/errors',
  THROUGHPUT: '/api/parser/throughput',
  STORAGE_USAGE: '/api/parser/storage-usage',
  CLEANUP_STATS: '/api/parser/cleanup-stats',
  UNPARSED_BATCHES: '/api/parser/unparsed-batches',
  RECENT_ACTIVITY: '/api/parser/recent-activity',
  SENSOR_BREAKDOWN: '/api/parser/sensor-breakdown',
  TRENDS: '/api/parser/trends',
  GROWTH_METRICS: '/api/parser/growth-metrics',
} as const;

// =============================================
// REAL-TIME STATISTICS (NEW)
// =============================================
export const REALTIME = {
  STATS: '/api/realtime/stats',
  RATES: '/api/realtime/rates',
  CLIENTS: '/api/realtime/clients',
  CLIENT: (clientId: string) => `/api/realtime/clients/${clientId}`,
  SENSORS: '/api/realtime/sensors',
  SENSOR: (sensorType: string) => `/api/realtime/sensors/${sensorType}`,
  SCHEMAS: '/api/realtime/schemas',
  SUMMARY: '/api/realtime/summary',
  STREAM: '/api/realtime/stream',
  STREAM_FULL: '/api/realtime/stream/full',
} as const;

// =============================================
// ADMIN - UPDATES (Legacy)
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
// ADMIN - COMMANDS (Legacy)
// =============================================
export const ADMIN_COMMANDS = {
  SEND: '/api/admin/commands/send',
  LIST: '/api/admin/commands/list',
  RESULTS: (commandId: string) => `/api/admin/commands/${commandId}/results`,
  CLIENT_RESULT: (commandId: string, clientId: string) => `/api/admin/commands/${commandId}/results/${clientId}`,
} as const;

// =============================================
// ADMIN - BATCH RETENTION (Legacy)
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
