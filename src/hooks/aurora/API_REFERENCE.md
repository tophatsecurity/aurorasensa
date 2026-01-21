# Aurora API Reference

Based on the official API documentation at http://aurora.tophatsecurity.com:9151/docs

## Authentication
- `POST /api/auth/login` - Login (OAuth2 password flow)
- `POST /api/auth/logout` - Logout
- `GET /api/auth/verify` - Verify Session
- `GET /api/auth/me` - Get Current User Info
- `POST /api/auth/change-password` - Change Password

## User Management
- `GET /api/users` - List Users
- `POST /api/users` - Create User
- `GET /api/users/{user_id}` - Get User
- `PUT /api/users/{user_id}` - Update User
- `PATCH /api/users/{user_id}` - Patch User
- `DELETE /api/users/{target_username}` - Delete User
- `POST /api/users/{user_id}/activate` - Activate User
- `POST /api/users/{user_id}/deactivate` - Deactivate User

## Roles & Permissions
- `GET /api/roles` - List Roles
- `POST /api/roles` - Create Role
- `PUT /api/roles/{role_id}` - Update Role
- `DELETE /api/roles/{role_id}` - Delete Role
- `POST /api/roles/{role_id}/permissions` - Assign Role Permissions
- `POST /api/users/{user_id}/roles` - Assign Role to User
- `DELETE /api/users/{user_id}/roles/{role_id}` - Remove Role from User
- `GET /api/users/{user_id}/roles` - Get User Roles
- `GET /api/permissions` - List Permissions
- `GET /api/users/{user_id}/permissions` - Get User Permissions
- `POST /api/users/{user_id}/permissions` - Assign Permission to User
- `DELETE /api/users/{user_id}/permissions/{permission_id}` - Remove Permission from User

## API Keys
- `GET /api/users/{user_id}/api-keys` - List User API Keys
- `POST /api/users/{user_id}/api-keys` - Create User API Key
- `DELETE /api/users/{user_id}/api-keys/{key_id}` - Delete API Key

## Sessions
- `GET /api/users/{user_id}/sessions` - List User Sessions
- `DELETE /api/users/{user_id}/sessions/{session_id}` - Delete Session
- `DELETE /api/users/{user_id}/sessions` - Delete All User Sessions

## Activity & Audit
- `GET /api/activity` - Get Activity Feed
- `GET /api/users/{user_id}/activity` - Get User Activity Log
- `GET /api/audit/logs` - Get Audit Logs
- `GET /api/audit/stats` - Get Audit Stats

## Alerts
- `GET /api/alerts` - Get Alerts
- `GET /api/alerts/list` - List Alerts (with filters)
- `GET /api/alerts/stats` - Get Alert Stats
- `GET /api/alerts/settings` - Get Alert Settings
- `PUT /api/alerts/settings` - Update Alert Settings
- `POST /api/alerts/test` - Test Alert
- `GET /api/device-alerts` - Get Device Alerts
- `POST /api/alerts/{alert_id}/acknowledge` - Acknowledge Alert
- `POST /api/alerts/{alert_id}/resolve` - Resolve Alert
- `DELETE /api/alerts/{alert_id}` - Delete Alert

## Alert Rules
- `GET /api/alerts/rules` - Get Alert Rules
- `POST /api/alerts/rules` - Create Alert Rule
- `GET /api/alerts/rules/{rule_id}` - Get Alert Rule
- `PUT /api/alerts/rules/{rule_id}` - Update Alert Rule
- `DELETE /api/alerts/rules/{rule_id}` - Delete Alert Rule

## Sensors
- `GET /api/sensors/list` - List Sensors
- `GET /api/sensors/recent` - Get Recent Sensors
- `GET /api/sensors/{sensor_id}` - Get Sensor
- `PUT /api/sensors/{sensor_id}` - Update Sensor
- `DELETE /api/sensors/{sensor_id}` - Delete Sensor
- `POST /api/sensors/add` - Add Sensor

## Data Readings
- `GET /api/readings/latest` - Get Latest Readings
- `GET /api/readings/sensor/{sensor_type}` - Get Sensor Readings by Type
- `GET /api/devices/tree` - Get Device Tree
- `GET /api/devices/{device_id}/latest` - Get Device Latest
- `GET /api/devices/status` - Get Device Status

## Power
- `GET /api/power/stats` - Get Power Stats

## Batches
- `GET /api/batches/list` - List Batches
- `GET /api/batches/latest` - Get Latest Batch
- `GET /api/batches/{batch_id}` - Get Batch By ID
- `GET /api/batches/{batch_id}/sensors` - Get Batch Sensors
- `GET /api/batches/{batch_id}/readings` - Get Batch Readings
- `GET /api/batches/by-client/{client_id}` - Get Batches By Client

## Timeseries & Analytics
- `GET /api/timeseries` - Get Timeseries Data
- `GET /api/v1/data/readings` - Get V1 Readings
- `GET /api/v1/data/latest` - Get V1 Latest
- `GET /api/v1/data/moving_average` - Get Moving Average

## Export
- `GET /api/export/formats` - Get Export Formats
- `GET /api/v1/export/csv` - Export CSV
- `GET /api/v1/export/json` - Export JSON

## System Info
- `GET /api/system/all` - Get All System Info
- `GET /api/system/arp` - Get ARP Table
- `GET /api/system/routing` - Get Routing Table
- `GET /api/system/interfaces` - Get Network Interfaces
- `GET /api/system/netstat` - Get Netstat
- `GET /api/system/external-ip` - Get External IP
- `GET /api/system/hostname` - Get Hostname
- `GET /api/system/ip` - Get IP Address
- `GET /api/system/uptime` - Get Uptime
- `GET /api/system/load` - Get CPU Load
- `GET /api/system/memory` - Get Memory Usage
- `GET /api/system/disk` - Get Disk Usage
- `GET /api/system/usb` - Get USB Devices
- `GET /api/systemctl/{service_name}` - Get Service Status

## Health
- `GET /health` - Health Check
- `GET /api/health` - API Health Check

## ADS-B Aircraft Tracking
- `GET /api/adsb/aircraft` - Get All Aircraft
- `GET /api/adsb/aircraft/{icao}` - Get Aircraft by ICAO
- `GET /api/adsb/stats` - Get ADS-B Stats
- `GET /api/adsb/emergencies` - Get Emergency Aircraft
- `GET /api/adsb/nearby` - Get Nearby Aircraft
- `GET /api/adsb/low-altitude` - Get Low Altitude Aircraft
- `GET /api/adsb/coverage` - Get Coverage Stats
- `GET /api/adsb/history/{icao}` - Get Aircraft History
- `GET /api/adsb/devices` - Get ADS-B Devices

## Starlink
- `GET /api/starlink/devices` - Get Starlink Devices
- `GET /api/starlink/devices/{device_id}` - Get Starlink Device
- `GET /api/starlink/status/{device_id}` - Get Real-time Status (NEW)
- `GET /api/starlink/history/{device_id}` - Get Historical Telemetry (NEW)
  - Query params: `hours` (default: 24)
- `GET /api/starlink/obstructions/{device_id}` - Get Detailed Obstruction Map (NEW)
- `GET /api/starlink/stats` - Get Starlink Stats
- `GET /api/starlink/stats/global` - Get Global Starlink Stats
- `GET /api/starlink/stats/device/{device_id}` - Get Device Starlink Stats
- `GET /api/starlink/signal-strength` - Get Signal Strength
- `GET /api/starlink/performance` - Get Performance
- `GET /api/starlink/power` - Get Power
- `GET /api/starlink/connectivity` - Get Connectivity
- `GET /api/starlink/timeseries` - Get Starlink Timeseries (NEW)
  - Query params: `hours` (default: 24)
- `GET /api/starlink/timeseries/{device_id}` - Get Device Starlink Timeseries (NEW)
  - Query params: `hours` (default: 24)

## Location (New Unified API)
- `GET /api/location/client/{client_id}/latest` - Get Latest Location for Client
- `GET /api/location/client/{client_id}/history` - Get Location History
  - Query params: `hours` (default: 24)
- `GET /api/location/summary` - Get System-wide Location Statistics
  - Query params: `hours` (default: 24)
- `GET /api/location/track/{client_id}` - Get GeoJSON Track for Mapping
  - Query params: `hours` (default: 24)

## LoRa
- `GET /api/lora/devices` - Get LoRa Devices
- `POST /api/lora/devices` - Create LoRa Device
- `GET /api/lora/devices/{device_id}` - Get LoRa Device
- `PUT /api/lora/devices/{device_id}` - Update LoRa Device
- `PATCH /api/lora/devices/{device_id}` - Patch LoRa Device
- `DELETE /api/lora/devices/{device_id}` - Delete LoRa Device
- `POST /api/lora/devices/{device_id}/activate` - Activate Device
- `POST /api/lora/devices/{device_id}/deactivate` - Deactivate Device
- `GET /api/lora/detections` - Get LoRa Detections
- `GET /api/lora/detections/recent` - Get Recent Detections
- `GET /api/lora/stats/global` - Get Global LoRa Stats
- `GET /api/lora/stats/device/{device_id}` - Get Device LoRa Stats
- `GET /api/lora/channels` - Get LoRa Channel Stats
- `GET /api/lora/spectrum` - Get LoRa Spectrum Analysis

## Clients
- `GET /api/clients/list` - List Clients
- `GET /api/clients/{client_id}` - Get Client
- `PUT /api/clients/{client_id}` - Update Client
- `DELETE /api/clients/{client_id}` - Delete Client
- `POST /api/clients/{client_id}/heartbeat` - Client Heartbeat
- `POST /api/clients/{client_id}/adopt` - Adopt Client

## Client State Management
- `GET /api/clients/all-states` - Get All Clients by State
- `GET /api/clients/statistics` - Get Client Statistics
- `GET /api/clients/pending` - Get Pending Clients
- `GET /api/clients/registered` - Get Registered Clients
- `GET /api/clients/adopted` - Get Adopted Clients
- `GET /api/clients/disabled` - Get Disabled Clients
- `GET /api/clients/suspended` - Get Suspended Clients
- `GET /api/clients/deleted` - Get Deleted Clients
- `POST /api/clients/{client_id}/register` - Register Client
- `POST /api/clients/{client_id}/adopt-direct` - Adopt Client Direct
- `POST /api/clients/{client_id}/disable` - Disable Client
- `POST /api/clients/{client_id}/enable` - Enable Client
- `POST /api/clients/{client_id}/suspend` - Suspend Client
- `POST /api/clients/{client_id}/delete-soft` - Soft Delete Client
- `POST /api/clients/{client_id}/restore` - Restore Client
- `GET /api/clients/{client_id}/state-history` - Get Client State History

## Client System Info
- `GET /api/clients/{client_id}/system-info` - Get Client System Info
- `POST /api/clients/{client_id}/system-info` - Update Client System Info
- `GET /api/clients/system-info/all` - Get All Clients System Info

## Client Configuration
- `GET /api/clients/{client_id}/config` - Get Client Config
- `PUT /api/clients/{client_id}/config` - Update Client Config
- `GET /api/clients/{client_id}/config/version` - Get Config Version
- `GET /api/clients/configs/all` - Get All Client Configs

## WiFi Management
- `GET /api/clients/{client_id}/wifi/mode` - Get WiFi Mode
- `POST /api/clients/{client_id}/wifi/mode` - Set WiFi Mode
- `GET /api/clients/{client_id}/wifi/config` - Get WiFi Config
- `POST /api/clients/{client_id}/wifi/config` - Update WiFi Config
- `GET /api/clients/{client_id}/wifi/status` - Get WiFi Status
- `GET /api/clients/{client_id}/wifi/scan` - Scan WiFi Networks
- `GET /api/clients/{client_id}/wifi/clients` - Get Connected Clients
- `POST /api/clients/{client_id}/wifi/clients/{mac}/disconnect` - Disconnect Client
- `GET /api/clients/{client_id}/wifi/version` - Get WiFi API Version

## Update Management (Admin)
- `POST /api/admin/updates/upload` - Upload Update Package
- `GET /api/admin/updates/packages` - List Packages
- `GET /api/admin/updates/packages/{package_id}` - Get Package Details
- `POST /api/admin/updates/packages/{package_id}/publish` - Publish Package
- `POST /api/admin/updates/assignments` - Create Assignment
- `GET /api/admin/updates/status` - Get Update Status Dashboard
- `GET /api/admin/updates/clients/{client_id}/history` - Get Client Update History

## Client Updates
- `GET /api/clients/{client_id}/updates/available` - Check Available Updates
- `GET /api/clients/{client_id}/updates/download/{package_id}` - Download Update Package
- `POST /api/clients/{client_id}/updates/status` - Report Update Status

## Remote Commands (Admin)
- `POST /api/admin/commands/send` - Send Command
- `GET /api/admin/commands/list` - List Commands
- `GET /api/admin/commands/{command_id}/results` - Get Command Results
- `GET /api/admin/commands/{command_id}/results/{client_id}` - Get Client Command Result

## Remote Commands (Client)
- `GET /api/clients/{client_id}/commands/pending` - Get Pending Commands
- `POST /api/clients/{client_id}/commands/results` - Submit Command Result

## Geo Data
- `GET /api/geo/locations` - Get Geo Locations
- `POST /api/geo/update` - Update Geo Location

## Logs
- `GET /api/logs` - Get Logs
- `GET /api/logs/datacollector` - Get Datacollector Logs
- `GET /api/logs/dataserver` - Get Dataserver Logs

## Configuration
- `GET /api/config` - Get Config
- `POST /api/config` - Update Config

## Statistics (API v2.0.2)
- `GET /api/stats` - Get All Statistics (all granularities combined)
  - Query params: `client_id`, `device_id`, `sensor_type`, `limit_hourly`, `limit_sixhour`, `limit_twelvehour`, `limit_daily`, `limit_weekly`
  - Returns: `{ hourly: [], six_hour: [], twelve_hour: [], daily: [], weekly: [] }`
- `GET /api/stats/comprehensive` - Get Comprehensive Stats
  - Returns: `{ daily: {...}, hourly: {...}, six_hour: {...}, status: "success" }`
- `GET /api/stats/summary` - Get Stats Summary (may return empty object)
- `GET /api/stats/overview` - Get Quick Overview Stats (DIRECT RESPONSE - no wrapper)
  - Returns: `{ total_readings: number, total_batches: number, timestamp: string }`
  - NOTE: This endpoint returns data directly, NOT wrapped in {data: {...}}
- `GET /api/stats/global` - Get Global Stats (WRAPPED RESPONSE)
  - Returns: `{ data: { total_readings, total_devices, total_clients, total_batches, sensor_types_count, active_clients_24h, device_breakdown, readings_by_day, storage }, status: "success" }`
  - Query params: `client_id`
- `GET /api/stats/1hr` - Get 1Hr Sensor Stats (last 24 hours)
  - Query params: `client_id`, `device_id`, `sensor_type`, `limit` (default: 100), `offset`
- `GET /api/stats/6hr` - Get 6Hr Sensor Stats (last 48 hours)
  - Query params: `client_id`, `device_id`, `sensor_type`, `limit` (default: 100), `offset`
- `GET /api/stats/12hr` - Get 12Hr Sensor Stats (last 7 days)
  - Query params: `client_id`, `device_id`, `sensor_type`, `limit` (default: 100), `offset`
- `GET /api/stats/24hr` - Get 24Hr Sensor Stats (last 30 days)
  - Query params: `client_id`, `device_id`, `sensor_type`, `limit` (default: 100), `offset`
- `GET /api/stats/weekly` - Get Weekly Sensor Stats (last 12 weeks)
  - Query params: `client_id`, `device_id`, `sensor_type`, `limit` (default: 100), `offset`
- `GET /api/stats/by-client` - Get Statistics Grouped by Client
  - Query params: `client_id`, `hours` (default: 24), `limit` (default: 100), `offset` (default: 0)
  - Returns: `{ data: [], pagination: {...}, status: "success" }` - NOTE: May return empty when no data in time window
- `GET /api/stats/by-sensor` - Get Statistics Grouped by Sensor Type
  - Query params: `client_id`, `hours` (default: 24), `limit` (default: 100), `offset` (default: 0)
  - Returns: `{ sensors: [{ sensor_type, reading_count, client_count, device_count, avg_data_size, first_reading, last_reading }], total }`
- `GET /api/stats/client/{client_id}` - Get Detailed Client Statistics
  - Query params: `hours` (default: 24)
  - Returns: `{ client_id, overall: {...}, by_sensor_type: [...], recent_devices: [...] }`
- `GET /api/stats/devices` - Get All Devices Stats
- `GET /api/stats/devices/{device_id}` - Get Device Stats
- `GET /api/stats/sensors` - Get All Sensor Stats
- `GET /api/stats/sensors/{sensor_type}` - Get Sensor Type Stats
- `GET /api/stats/aircraft` - Get Aircraft Activity
- `GET /api/stats/endpoints` - Get Endpoint Stats Summary
- `GET /api/stats/endpoints/history` - Get Endpoint Stats History
- `GET /api/performance/stats` - Get Performance Stats
- `GET /api/power/stats` - Get Power Stats

## Dashboard Stats
- `GET /api/dashboard/sensor-stats` - Get Dashboard Sensor Stats
  - Returns: `{ data: [], summary: { total_readings, total_sensor_types }, status: "success" }`
  - NOTE: May return empty data array when no recent readings

## Historical Stats
- `GET /api/stats/history/global` - Get Global Stats History
- `GET /api/stats/history/sensors` - Get Sensor Stats History
- `GET /api/stats/history/devices` - Get Device Stats History
- `GET /api/stats/history/alerts` - Get Alert Stats History
- `GET /api/stats/history/system` - Get System Resource Stats History

## Batch Retention (Admin)
- `GET /api/admin/batch-retention/config` - Get Batch Retention Config
- `POST /api/admin/batch-retention/config` - Update Batch Retention Config
- `GET /api/admin/batch-retention/clients/{client_id}` - Get Client Batch Retention
- `POST /api/admin/batch-retention/clients/{client_id}` - Update Client Batch Retention
- `DELETE /api/admin/batch-retention/clients/{client_id}` - Delete Client Batch Retention
- `POST /api/admin/batch-retention/clients/{client_id}/debug` - Toggle Client Debug Mode
- `GET /api/admin/batch-retention/disk-usage` - Get Disk Usage Info

## Baselines
- `GET /api/baselines/profiles` - Get Baseline Profiles
- `POST /api/baselines/profiles` - Create Baseline Profile
- `GET /api/baselines/profiles/{profile_id}/entries` - Get Baseline Entries
- `POST /api/baselines/profiles/{profile_id}/entries` - Add Baseline Entry
- `DELETE /api/baselines/entries/{entry_id}` - Remove Baseline Entry
- `GET /api/baselines/violations` - Get Baseline Violations
- `POST /api/baselines/violations/{violation_id}/acknowledge` - Acknowledge Violation
- `POST /api/baselines/violations/{violation_id}/whitelist` - Whitelist Violation
- `POST /api/baselines/profiles/{profile_id}/auto-learn` - Auto Learn Baseline

## Dashboard
- `GET /api/dashboard/sensor-stats` - Get Dashboard Sensor Stats
- `GET /api/dashboard/sensor-timeseries` - Get Sensor Timeseries
- `GET /api/dashboard/system-stats` - Get Dashboard System Stats

## Data Files (JSONL)
- `GET /starlink_status.jsonl` - Get Starlink Status
- `GET /gpsd_status.jsonl` - Get GPSD Status
- `GET /bandwidth.jsonl` - Get Bandwidth
- `GET /arduino_data.jsonl` - Get Arduino Data
- `GET /visible_sats.jsonl` - Get Visible Satellites
- `GET /ping_stats.jsonl` - Get Ping Stats

## V1 Configuration
- `GET /api/v1/config/{client_id}` - Get Client Config
- `POST /api/v1/config/{client_id}` - Update Client Config
- `POST /api/v1/config/new` - Create New Client
- `GET /api/v1/config` - List All Configs
- `GET /api/v1/devices` - List Devices

## Data Ingestion
- `POST /api/v1/batch` - Receive Batch
- `POST /api/v1/client/config` - Receive Client Config
