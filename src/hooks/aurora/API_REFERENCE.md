# Aurora API Reference

Based on the official API documentation at http://aurora.tophatsecurity.com:9151/docs

## Authentication
- `POST /api/auth/login` - Login (OAuth2 password flow)
- `POST /api/auth/logout` - Logout
- `POST /api/login` - Proxy Login
- `POST /api/logout` - Proxy Logout
- `GET /api/auth/verify` - Verify Session
- `GET /api/auth/me` - Get Current User Info
- `POST /api/auth/change-password` - Change Password

## User Management
- `GET /api/users` - List Users
- `POST /api/users` - Create User
- `DELETE /api/users/{target_username}` - Delete User (by username)
- `GET /api/users/{user_id}` - Get User Details
- `PUT /api/users/{user_id}` - Update User
- `PATCH /api/users/{user_id}` - Partial Update User
- `DELETE /api/users/{user_id}` - Delete User (by ID)
- `POST /api/users/{user_id}/password` - Change User Password
- `POST /api/users/{user_id}/activate` - Activate User
- `POST /api/users/{user_id}/deactivate` - Deactivate User
- `POST /api/users/{user_id}/change-password` - Change Password
- `POST /api/users/{user_id}/reset-password` - Reset Password
- `GET /api/users/search` - Search Users
- `GET /api/users/by-role/{role_name}` - Get Users by Role
- `GET /api/users/{user_id}/activity` - Get User Activity

## Roles & Permissions
- `GET /api/roles` - List Roles
- `POST /api/roles` - Create Role
- `PUT /api/roles/{role_id}` - Update Role
- `DELETE /api/roles/{role_id}` - Delete Role
- `GET /api/roles/{role_id}/permissions` - Get Role Permissions
- `POST /api/roles/{role_id}/permissions` - Assign Permissions to Role
- `POST /api/users/{user_id}/roles` - Assign Role to User
- `GET /api/users/{user_id}/roles` - Get User Roles
- `DELETE /api/users/{user_id}/roles/{role_id}` - Remove Role from User
- `GET /api/permissions` - List Permissions
- `GET /api/users/{user_id}/permissions` - Get User Permissions
- `POST /api/users/{user_id}/permissions` - Assign Permission to User
- `DELETE /api/users/{user_id}/permissions/{permission_id}` - Remove Permission

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
- `GET /api/alerts/{alert_id}` - Get Alert Details
- `GET /api/alerts/stats` - Get Alert Stats
- `GET /api/alerts/settings` - Get Alert Settings
- `PUT /api/alerts/settings` - Update Alert Settings
- `POST /api/alerts/test` - Test Alert
- `POST /api/alerts/add` - Add Alert Rule
- `DELETE /api/alerts/{rule_id}` - Delete Alert Rule
- `GET /api/device-alerts` - Get Device Alerts
- `POST /api/alerts/{alert_id}/acknowledge` - Acknowledge Alert
- `POST /api/alerts/{alert_id}/resolve` - Resolve Alert

## Alert Exclusions
- `POST /api/alerts/exclusions` - Create Alert Exclusion
- `GET /api/alerts/exclusions` - List Alert Exclusions
- `DELETE /api/alerts/exclusions/{exclusion_id}` - Delete Alert Exclusion
- `POST /api/alerts/exclusions/cleanup` - Cleanup Expired Exclusions
- `POST /api/alerts/{alert_id}/exclude-source` - Exclude Alert Source

## Alert Rules
- `GET /api/alerts/rules` - Get Alert Rules
- `POST /api/alerts/rules` - Create Alert Rule
- `GET /api/alerts/rules/{rule_id}` - Get Alert Rule
- `PUT /api/alerts/rules/{rule_id}` - Update Alert Rule
- `DELETE /api/alerts/rules/{rule_id}` - Delete Alert Rule

## Sensors
- `GET /api/sensors/list` - List All Sensors (UI View)
- `GET /api/sensors/recent` - Get Recent Sensors
- `GET /api/sensors/{sensor_id}` - Get Sensor Details (UI View)
- `PUT /api/sensors/{sensor_id}` - Update Sensor
- `DELETE /api/sensors/{sensor_id}` - Delete Sensor
- `POST /api/sensors/add` - Add New Sensor (UI Action)

## Devices (CRUD)
- `GET /api/devices` - List All Devices/Sensors
- `POST /api/devices` - Create New Device/Sensor
- `GET /api/devices/{sensor}` - Get Device/Sensor Details
- `PUT /api/devices/{sensor}` - Update Device/Sensor
- `DELETE /api/devices/{sensor}` - Delete Device/Sensor
- `GET /api/devices/{sensor}/readings` - Get Device Readings
- `GET /api/devices/{sensor}/stats` - Get Device Statistics
- `GET /api/devices/status/summary` - Device Status Summary
- `GET /api/devices/status` - Get Device Status
- `GET /api/devices/tree` - Get Device Tree
- `GET /api/devices/{device_id}/latest` - Get Device Latest

## Data Readings
- `GET /api/readings/latest` - Get Latest Readings
- `GET /api/readings/sensor/{sensor_type}` - Get Sensor Readings by Type
- `GET /api/v1/data/readings` - Get V1 Readings
- `GET /api/v1/data/latest` - Get V1 Latest

## Batches
- `GET /api/batches/list` - List Batches
- `GET /api/batches/latest` - Get Latest Batch
- `GET /api/batches/{batch_id}` - Get Batch By ID
- `GET /api/batches/{batch_id}/sensors` - Get Batch Sensors
- `GET /api/batches/{batch_id}/readings` - Get Batch Readings
- `GET /api/batches/by-client/{client_id}` - Get Batches By Client

## Clients
- `POST /api/clients/register` - Register New Client
- `GET /api/clients/list` - List All Clients
- `GET /api/clients/{client_id}` - Get Client Details
- `PUT /api/clients/{client_id}` - Update Client (legacy)
- `DELETE /api/clients/{client_id}` - Hard Delete Client
- `POST /api/clients/{client_id}/heartbeat` - Client Heartbeat
- `POST /api/clients/{client_id}/adopt` - Adopt Client

## Client State Management
- `GET /api/clients/all-states` - List All Client States
- `GET /api/clients/statistics` - Client Statistics
- `GET /api/clients/pending` - List Pending Clients
- `GET /api/clients/registered` - List Registered Clients
- `GET /api/clients/adopted` - List Adopted Clients
- `GET /api/clients/disabled` - List Disabled Clients
- `GET /api/clients/suspended` - List Suspended Clients
- `GET /api/clients/deleted` - List Deleted Clients
- `POST /api/clients/{client_id}/register` - Register Specific Client
- `POST /api/clients/{client_id}/adopt-direct` - Direct Adopt Client
- `POST /api/clients/{client_id}/disable` - Disable Client
- `POST /api/clients/{client_id}/enable` - Enable Client
- `POST /api/clients/{client_id}/suspend` - Suspend Client
- `POST /api/clients/{client_id}/delete-soft` - Soft Delete Client
- `POST /api/clients/{client_id}/restore` - Restore Deleted Client
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

## WiFi Management (Per-Client)
- `GET /api/clients/{client_id}/wifi/mode` - Get WiFi Mode
- `POST /api/clients/{client_id}/wifi/mode` - Set WiFi Mode
- `GET /api/clients/{client_id}/wifi/config` - Get WiFi Config
- `POST /api/clients/{client_id}/wifi/config` - Update WiFi Config
- `GET /api/clients/{client_id}/wifi/status` - Get WiFi Status
- `GET /api/clients/{client_id}/wifi/scan` - Scan WiFi Networks
- `GET /api/clients/{client_id}/wifi/clients` - Get Connected Clients
- `POST /api/clients/{client_id}/wifi/clients/{mac}/disconnect` - Disconnect Client
- `GET /api/clients/{client_id}/wifi/version` - Get WiFi API Version

## WiFi Scanner
- `GET /api/wifi/networks` - List Networks
- `GET /api/wifi/scan` - Get Latest Scan
- `GET /api/wifi/history` - Get History
- `GET /api/wifi/summary` - Get Summary
- `GET /api/wifi/security-analysis` - Get Security Analysis
- `GET /api/wifi/strongest` - Get Strongest Networks
- `GET /api/wifi/devices` - List WiFi Devices
- `GET /api/wifi/clients/{client_id}/networks` - Get Client Networks

## Bluetooth Scanner
- `GET /api/bluetooth/devices` - List Devices
- `GET /api/bluetooth/scan` - Get Latest Scan
- `GET /api/bluetooth/history` - Get History
- `GET /api/bluetooth/summary` - Get Summary
- `GET /api/bluetooth/by-type` - Get By Device Type
- `GET /api/bluetooth/nearby` - Get Nearby
- `GET /api/bluetooth/scanners` - List Scanners
- `GET /api/bluetooth/clients/{client_id}/devices` - Get Client Devices

## Location
- `GET /api/location/client/{client_id}/latest` - Get Client Latest Location
- `GET /api/location/client/{client_id}/history` - Get Client Location History
  - Query params: `hours` (default: 24)
- `GET /api/location/clients/latest` - Get Latest Locations for Multiple Clients
- `GET /api/location/summary` - Get Location Summary
  - Query params: `hours` (default: 24)
- `GET /api/location/track/{client_id}` - Get GeoJSON Track for Mapping
  - Query params: `hours` (default: 24)

## Geolocation
- `GET /api/geo/locations` - Get Geo Locations
- `GET /api/geo/lookup/{ip}` - IP Geolocation Lookup
- `POST /api/geo/update` - Update Geo Location

## Map
- `GET /api/map/markers` - Get Map Markers

## ADS-B Aircraft Tracking
- `GET /api/adsb/aircraft` - List Aircraft
- `GET /api/adsb/aircraft/{icao}` - Get Aircraft by ICAO
- `GET /api/adsb/stats` - Get ADS-B Stats
- `GET /api/adsb/emergencies` - Get Emergency Aircraft
- `GET /api/adsb/nearby` - Get Nearby Aircraft
- `GET /api/adsb/low-altitude` - Get Low Altitude Aircraft
- `GET /api/adsb/coverage` - Get Coverage Stats
- `GET /api/adsb/history/{icao}` - Get Aircraft History
- `GET /api/adsb/devices` - Get ADS-B Devices

## APRS
- `GET /api/aprs/stations` - Get APRS Stations
- `GET /api/aprs/stations/{callsign}` - Get APRS Station
- `GET /api/aprs/history/{callsign}` - Get APRS History

## AIS
- `GET /api/ais/vessels` - Get AIS Vessels
- `GET /api/ais/vessels/{mmsi}` - Get AIS Vessel
- `GET /api/ais/history/{mmsi}` - Get AIS History

## EPIRB
- `GET /api/epirb/beacons` - Get EPIRB Beacons
- `GET /api/epirb/beacons/{beacon_id}` - Get EPIRB Beacon
- `GET /api/epirb/history/{beacon_id}` - Get EPIRB History

## Maritime Radio (Unified)
- `GET /api/maritime/ais/vessels` - List AIS Vessels
- `GET /api/maritime/ais/positions` - Get Vessel Positions
- `GET /api/maritime/ais/vessel/{mmsi}` - Get Vessel Details
- `GET /api/maritime/ais/nearby` - Get Nearby Vessels
- `GET /api/maritime/aprs/stations` - List APRS Stations
- `GET /api/maritime/aprs/packets` - List APRS Packets
- `GET /api/maritime/aprs/station/{callsign}` - Get Station Details
- `GET /api/maritime/aprs/weather` - Get APRS Weather
- `GET /api/maritime/epirb/beacons` - List EPIRB Beacons
- `GET /api/maritime/epirb/emergencies` - Get EPIRB Emergencies
- `GET /api/maritime/summary` - Get Maritime Summary
- `GET /api/maritime/devices` - List Maritime Devices
- `GET /api/maritime-radio/stats` - Get Maritime Radio Stats

## Starlink
- `GET /api/starlink/devices` - Get Starlink Devices
- `GET /api/starlink/devices/{device_id}` - Get Starlink Device
- `GET /api/starlink/clients` - List Starlink Clients
- `GET /api/starlink/summary` - Starlink Global Summary
- `GET /api/starlink/stats` - Get Starlink Stats
- `GET /api/starlink/clients/{client_id}/latest` - Latest Starlink Telemetry
- `GET /api/starlink/clients/{client_id}/telemetry` - Starlink Telemetry History
- `GET /api/starlink/clients/{client_id}/performance` - Starlink Performance Metrics
- `GET /api/starlink/clients/{client_id}/gps` - Starlink GPS Location
- `GET /api/starlink/clients/{client_id}/obstruction` - Starlink Obstruction Map
- `GET /api/starlink/clients/{client_id}/power` - Starlink Power Metrics
- `GET /api/starlink/clients/{client_id}/connection` - Starlink Connection Status
- `GET /api/starlink/clients/{client_id}/hourly-stats` - Starlink Hourly Statistics
- `GET /api/starlink/signal-strength` - Get Signal Strength
- `GET /api/starlink/performance` - Get Performance
- `GET /api/starlink/power` - Get Power
- `GET /api/starlink/connectivity` - Get Connectivity
- `GET /api/starlink/stats/global` - Get Global Starlink Stats
- `GET /api/starlink/stats/device/{device_id}` - Get Device Starlink Stats

## LoRa
- `GET /api/lora/devices` - List LoRa Devices
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
- `GET /api/lora/config/devices` - Get Registered LoRa Devices
- `GET /api/lora/config/devices/{device_id}` - Get LoRa Device Config

## LoRa Detector
- `GET /api/lora/scan` - Get Latest Scan
- `GET /api/lora/history` - Get History
- `GET /api/lora/packets` - List Packets
- `GET /api/lora/packets/recent` - Get Recent Packets
- `GET /api/lora/packets/by-device` - Get Packets By Device
- `GET /api/lora/summary` - Get Summary
- `GET /api/lora/network-analysis` - Get Network Analysis
- `GET /api/lora/strongest` - Get Strongest Signals
- `GET /api/lora/detectors` - List Detectors

## Arduino Sensors
- `GET /api/arduino/devices` - List Arduino Devices
- `GET /api/arduino/current` - Get Current Readings
- `GET /api/arduino/temperature` - Get Temperature
- `GET /api/arduino/humidity` - Get Humidity
- `GET /api/arduino/pressure` - Get Pressure
- `GET /api/arduino/light` - Get Light
- `GET /api/arduino/sound` - Get Sound
- `GET /api/arduino/accelerometer` - Get Accelerometer
- `GET /api/arduino/history` - Get History
- `GET /api/arduino/summary` - Get Summary
- `GET /api/arduino/stats` - Get Stats

## Thermal Probes
- `GET /api/thermal/devices` - List Thermal Devices
- `GET /api/thermal/latest` - Get Latest Readings
- `GET /api/thermal/celsius` - Get Celsius Readings
- `GET /api/thermal/fahrenheit` - Get Fahrenheit Readings
- `GET /api/thermal/history` - Get History
- `GET /api/thermal/stats` - Get Stats
- `GET /api/thermal/status` - Get Status

## Power Management
- `GET /api/power/stats` - Get Power Stats
- `GET /api/power/current` - Get Current Power
- `GET /api/power/usb` - Get USB Power
- `GET /api/power/voltage` - Get Voltage Metrics
- `GET /api/power/battery` - Get Battery Metrics
- `GET /api/power/history` - Get Power History
- `GET /api/power/summary` - Get Power Summary
- `GET /api/power/devices` - Get Power By Device

## Timeseries & Analytics
- `GET /api/timeseries` - Get Timeseries Data
- `GET /api/v1/data/moving_average` - Get Moving Average

## Export
- `GET /api/export/formats` - Get Export Formats
- `GET /api/v1/export/csv` - Export CSV
- `GET /api/v1/export/json` - Export JSON

## Statistics
- `GET /api/stats` - Complete Statistics (all granularities)
- `GET /api/stats/1hr` - 1-Hour Statistics
- `GET /api/stats/6hr` - 6-Hour Statistics
- `GET /api/stats/12hr` - 12-Hour Statistics
- `GET /api/stats/24hr` - Daily Statistics
- `GET /api/stats/weekly` - Weekly Statistics
- `GET /api/stats/global` - Get Global Stats
- `GET /api/stats/overview` - Get General Stats (DIRECT RESPONSE)
- `GET /api/stats/summary` - Get Stats Summary
- `GET /api/stats/comprehensive` - Get Comprehensive Stats
- `GET /api/stats/by-client` - Statistics by Client
- `GET /api/stats/by-sensor` - Statistics by Sensor Type
- `GET /api/stats/client/{client_id}` - Client Detail Statistics
- `GET /api/stats/client/{client_id}/latest` - Client Latest Statistics
- `GET /api/stats/sensor/{sensor_type}` - Sensor Type Detail Statistics
- `GET /api/stats/devices` - Get All Devices Stats
- `GET /api/stats/devices/{device_id}` - Get Device Stats
- `GET /api/stats/sensors` - Get All Sensor Stats
- `GET /api/stats/sensors/{sensor_type}` - Get Sensor Type Stats
- `GET /api/stats/aircraft` - Get Aircraft Activity
- `GET /api/stats/endpoints` - Get Endpoint Stats Summary
- `GET /api/stats/endpoints/history` - Get Endpoint Stats History
- `GET /api/performance/stats` - Get Performance Stats

## Historical Stats
- `GET /api/stats/history/global` - Get Global Stats History
- `GET /api/stats/history/sensors` - Get Sensor Stats History
- `GET /api/stats/history/devices` - Get Device Stats History
- `GET /api/stats/history/alerts` - Get Alert Stats History
- `GET /api/stats/history/system` - Get System Resource Stats History

## Dashboard
- `GET /api/dashboard/sensor-stats` - Get Dashboard Sensor Stats
- `GET /api/dashboard/sensor-timeseries` - Get Sensor Timeseries
- `GET /api/dashboard/system-stats` - Get Dashboard System Stats

## System Info
- `GET /api/system/all` - Get All System Info
- `GET /api/system/arp` - Get ARP Table
- `GET /api/system/routing` - Get Routing Table
- `GET /api/system/interfaces` - Get Network Interfaces
- `GET /api/system/netstat` - Get Netstat
- `GET /api/system/external-ip` - Get External IP

## Health
- `GET /health` - Health Check
- `GET /api/health` - API Health Check

## Configuration
- `GET /api/config` - Get Config
- `POST /api/config` - Update Config

## Logs
- `GET /api/logs` - Get Logs

## SSE Streaming
- `GET /api/stream/readings` - Stream All Readings
- `GET /api/stream/readings/{sensor_type}` - Stream Sensor Readings
- `GET /api/stream/readings/starlink` - Stream Starlink Readings
- `GET /api/stream/readings/thermal_probe` - Stream Thermal Probe Readings
- `GET /api/stream/readings/adsb` - Stream ADS-B Readings
- `GET /api/stream/readings/arduino` - Stream Arduino Readings
- `GET /api/stream/readings/gps` - Stream GPS Readings
- `GET /api/stream/readings/power` - Stream Power Readings
- `GET /api/stream/readings/system_monitor` - Stream System Monitor Readings
- `GET /api/stream/readings/radio` - Stream Radio Readings
- `GET /api/stream/clients` - Stream All Clients
- `GET /api/stream/clients/{client_id}` - Stream Client Data
- `GET /api/stream/alerts` - Stream Alerts
- `GET /api/stream/dashboard/stats` - Stream Dashboard Stats
- `GET /api/stream/dashboard/clients` - Stream Client Status
- `GET /api/stream/starlink` - Stream Starlink
- `GET /api/stream/map/positions` - Stream Map Positions
- `GET /api/stream/system/health` - Stream System Health
- `GET /api/stream/commands/{command_id}/status` - Stream Command Status

## OTA Updates
- `GET /api/updates/list` - List Updates
- `POST /api/updates/upload` - Upload Update
- `GET /api/updates/{update_id}` - Get Update Details
- `DELETE /api/updates/{update_id}` - Delete Update
- `POST /api/updates/deploy` - Deploy Update
- `GET /api/updates/deployments/status` - Get Deployment Status
- `POST /api/updates/deployments/{deployment_id}/rollback` - Rollback Deployment
- `GET /api/updates/latest` - Get Latest Update
- `GET /api/updates/history` - Get Update History
- `GET /api/updates/clients/{client_id}/updates` - Get Client Updates
- `GET /api/updates/clients/{client_id}/status` - Get Client Update Status

## Remote Commands
- `POST /api/commands/send` - Send Command
- `POST /api/commands/send-batch` - Send Batch Command
- `GET /api/commands/list` - List Commands
- `GET /api/commands/{command_id}` - Get Command Details
- `GET /api/commands/{command_id}/status` - Get Command Status
- `GET /api/commands/{command_id}/results` - Get Command Results
- `POST /api/commands/{command_id}/cancel` - Cancel Command
- `GET /api/commands/pending` - Get Pending Commands
- `GET /api/commands/history` - Get Command History
- `GET /api/commands/clients/{client_id}/commands` - Get Client Commands
- `GET /api/commands/stats` - Get Command Stats

## Remote Commands - Admin (Legacy)
- `POST /api/admin/commands/send` - Send Command
- `GET /api/admin/commands/list` - List Commands
- `GET /api/admin/commands/{command_id}/results` - Get Command Results
- `GET /api/admin/commands/{command_id}/results/{client_id}` - Get Client Command Result

## Remote Commands - Client (Legacy)
- `GET /api/clients/{client_id}/commands/pending` - Get Pending Commands
- `POST /api/clients/{client_id}/commands/results` - Submit Command Result

## Batch Retention
- `GET /api/retention/policies` - List Policies
- `POST /api/retention/policies` - Create Policy
- `GET /api/retention/policies/{policy_id}` - Get Policy Details
- `PUT /api/retention/policies/{policy_id}` - Update Policy
- `DELETE /api/retention/policies/{policy_id}` - Delete Policy
- `POST /api/retention/apply` - Apply Policy
- `POST /api/retention/apply-all` - Apply All Policies
- `GET /api/retention/status` - Get Retention Status
- `GET /api/retention/preview/{policy_id}` - Preview Policy Impact
- `GET /api/retention/summary` - Get Retention Summary
- `GET /api/retention/cleanup-history` - Get Cleanup History
- `GET /api/retention/stats` - Get Retention Stats

## Batch Retention - Admin (Legacy)
- `GET /api/admin/batch-retention/config` - Get Batch Retention Config
- `POST /api/admin/batch-retention/config` - Update Batch Retention Config
- `GET /api/admin/batch-retention/clients/{client_id}` - Get Client Batch Retention
- `POST /api/admin/batch-retention/clients/{client_id}` - Update Client Batch Retention
- `DELETE /api/admin/batch-retention/clients/{client_id}` - Delete Client Batch Retention
- `POST /api/admin/batch-retention/clients/{client_id}/debug` - Toggle Client Debug Mode
- `GET /api/admin/batch-retention/disk-usage` - Get Disk Usage Info

## Update Management - Admin (Legacy)
- `POST /api/admin/updates/upload` - Upload Update Package
- `GET /api/admin/updates/packages` - List Packages
- `GET /api/admin/updates/packages/{package_id}` - Get Package Details
- `POST /api/admin/updates/packages/{package_id}/publish` - Publish Package
- `POST /api/admin/updates/assignments` - Create Assignment
- `GET /api/admin/updates/status` - Get Update Status Dashboard
- `GET /api/admin/updates/clients/{client_id}/history` - Get Client Update History

## Client Updates (Legacy)
- `GET /api/clients/{client_id}/updates/available` - Check Available Updates
- `GET /api/clients/{client_id}/updates/download/{package_id}` - Download Update Package
- `POST /api/clients/{client_id}/updates/status` - Report Update Status

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

## Parser Statistics
- `GET /api/parser/stats` - Get Parser Stats
- `GET /api/parser/summary` - Get Parser Summary
- `GET /api/parser/health` - Get Parser Health
- `GET /api/parser/ingestion-rate` - Get Ingestion Rate
- `GET /api/parser/json-files` - Get JSON File Stats
- `GET /api/parser/batch-queue` - Get Batch Queue Status
- `GET /api/parser/client-data-sizes` - Get Client Data Sizes
- `GET /api/parser/client-ingestion` - Get Client Ingestion Rates
- `GET /api/parser/client/{client_id}/stats` - Get Client Parser Stats
- `GET /api/parser/parse-times` - Get Parse Time Metrics
- `GET /api/parser/success-rate` - Get Parse Success Rate
- `GET /api/parser/errors` - Get Parse Errors
- `GET /api/parser/throughput` - Get Parser Throughput
- `GET /api/parser/storage-usage` - Get Storage Usage
- `GET /api/parser/cleanup-stats` - Get Cleanup Stats
- `GET /api/parser/unparsed-batches` - Get Unparsed Batches
- `GET /api/parser/recent-activity` - Get Recent Parse Activity
- `GET /api/parser/sensor-breakdown` - Get Sensor Type Breakdown
- `GET /api/parser/trends` - Get Parser Trends
- `GET /api/parser/growth-metrics` - Get Data Growth Metrics

## Real-Time Statistics
- `GET /api/realtime/stats` - Get Realtime Stats
- `GET /api/realtime/rates` - Get Ingestion Rates
- `GET /api/realtime/clients` - Get Client Activity
- `GET /api/realtime/clients/{client_id}` - Get Specific Client Stats
- `GET /api/realtime/sensors` - Get Sensor Activity
- `GET /api/realtime/sensors/{sensor_type}` - Get Specific Sensor Stats
- `GET /api/realtime/schemas` - Get Schema Detection Stats
- `GET /api/realtime/summary` - Get Stats Summary
- `GET /api/realtime/stream` - Stream Realtime Stats (SSE)
- `GET /api/realtime/stream/full` - Stream Full Stats (SSE)

## V1 Configuration (Legacy)
- `GET /api/v1/config/{client_id}` - Get Client Config
- `POST /api/v1/config/{client_id}` - Update Client Config
- `POST /api/v1/config/new` - Create New Client
- `GET /api/v1/config` - List All Configs
- `GET /api/v1/devices` - List Devices

## Data Ingestion
- `POST /api/v1/batch` - Receive Batch
- `POST /api/v1/batch/test` - Test Batch
- `POST /api/v1/client/config` - Receive Client Config

## Data Files (JSONL)
- `GET /starlink_status.jsonl` - Get Starlink Status
- `GET /gpsd_status.jsonl` - Get GPSD Status
- `GET /bandwidth.jsonl` - Get Bandwidth
- `GET /arduino_data.jsonl` - Get Arduino Data
- `GET /visible_sats.jsonl` - Get Visible Satellites
- `GET /ping_stats.jsonl` - Get Ping Stats

## System Service
- `GET /api/systemctl/{service_name}` - Get Service Status
