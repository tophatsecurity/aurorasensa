/**
 * Aurora API - Main barrel export
 * 
 * This module re-exports all hooks and types from modular files.
 * Import from "@/hooks/aurora" for consistent API access.
 * 
 * @example
 * import { useClients, useAlerts, type Client, type Alert } from "@/hooks/aurora";
 */

// Core utilities
export { callAuroraApi, hasAuroraSession, clearAuroraSession, invalidateAuroraCache, getAuroraQueueStats, type AuroraApiOptions, type HttpMethod } from "./core";

// Centralized API endpoints
export * from "./endpoints";

// All types from central types file
export * from "./types";

// Domain-specific hooks (only export functions, not types to avoid conflicts)
export {
  useSensors,
  useRecentSensors,
  useSensorById,
  useLatestReadings,
  useSensorReadings,
  useAllSensorStats,
  useAddSensor,
  useUpdateSensor,
  useDeleteSensor,
} from "./sensors";

export {
  useClients,
  useClientsWithHostnames,
  useClient,
  useClientsByState,
  useClientStatistics,
  usePendingClients,
  useAdoptedClients,
  useRegisteredClients,
  useDisabledClients,
  useSuspendedClients,
  useDeletedClients,
  useClientStateHistory,
  useClientSystemInfo,
  useAllClientsSystemInfo,
  useClientConfig,
  useClientConfigVersion,
  useAllClientConfigs,
  useWifiMode,
  useWifiConfig,
  useWifiStatus,
  useWifiScan,
  useWifiClients,
  useWifiApiVersion,
  useAdoptClient,
  useAdoptClientDirect,
  useRegisterClient,
  useDisableClient,
  useEnableClient,
  useSuspendClient,
  useSoftDeleteClient,
  useRestoreClient,
  useDeleteClient,
  useUpdateClientConfig,
  useSetWifiMode,
  useUpdateWifiConfig,
  useDisconnectWifiClient,
  // Latest Batch
  useClientLatestBatch,
  type ClientLatestBatch,
  type LatestBatchReading,
} from "./clients";

export {
  useAdsbAircraft,
  useAdsbAircraftByIcao,
  useAdsbStats,
  useAdsbEmergencies,
  useAdsbNearby,
  useAdsbLowAltitude,
  useAdsbCoverage,
  useAdsbAircraftHistory,
  useAdsbDevices,
  useAdsbHistorical,
  useAdsbAircraftWithHistory,
} from "./adsb";

export {
  useStarlinkDevices,
  useStarlinkDevice,
  useStarlinkStats,
  useStarlinkGlobalStats,
  useStarlinkDeviceStatsById,
  useStarlinkSignalStrength,
  useStarlinkPerformance,
  useStarlinkPower,
  useStarlinkConnectivity,
  useStarlinkDeviceStats,
  useStarlinkDeviceTimeseries,
  useStarlinkReadings,
  useStarlinkTimeseries,
  useStarlinkDashboard,
  useStarlinkDevicesFromReadings,
  useStarlinkDeviceMetrics,
  type StarlinkDeviceWithMetrics,
} from "./starlink";

export {
  useLoraDevices,
  useLoraDevice,
  useLoraDetections,
  useLoraRecentDetections,
  useLoraGlobalStats,
  useLoraDeviceStats,
  useLoraChannelStats,
  useLoraSpectrumAnalysis,
  // Config & Registered devices
  useLoraConfigDevices,
  useLoraConfigDevice,
  // Mutations
  useCreateLoraDevice,
  useUpdateLoraDevice,
  usePatchLoraDevice,
  useDeleteLoraDevice,
  useActivateLoraDevice,
  useDeactivateLoraDevice,
} from "./lora";

export {
  // AIS hooks
  useAisVessels,
  useAisVessel,
  useAisStats,
  useAisNearby,
  useAisVesselHistory,
  useAisHistorical,
  // APRS hooks
  useAprsStations,
  useAprsStation,
  useAprsStats,
  useAprsPackets,
  useAprsNearby,
  useAprsStationHistory,
  useAprsHistorical,
  useAprsWeatherStations,
  // EPIRB hooks
  useEpirbBeacons,
  useEpirbBeacon,
  useEpirbStats,
  useEpirbActiveAlerts,
  useEpirbHistory,
  useEpirbHistorical,
  // Types
  type AisVessel,
  type AisStats,
  type AprsStation,
  type AprsStats,
  type AprsPacket,
  type EpirbBeacon,
  type EpirbStats,
} from "./maritime";

export {
  useAlerts,
  useAlertsList,
  useAlertRules,
  useAlertStats,
  useAlertSettings,
  useDeviceAlerts,
  useCreateAlertRule,
  useUpdateAlertRule,
  useDeleteAlertRule,
  useAcknowledgeAlert,
  useResolveAlert,
  useUpdateAlertSettings,
  useTestAlert,
} from "./alerts";

export {
  useDashboardStats,
  useDashboardTimeseries,
  useDashboardSystemStats,
  useDashboardSensorStats,
  useDashboardClientStats,
  useDashboardSensorTimeseries,
  // Types
  type DashboardSensorStatsItem,
  type DashboardSensorStatsResponse,
  type ClientStatsItem,
  type ClientStatsResponse,
} from "./dashboard";

export {
  useSystemInfo,
  useSystemArp,
  useSystemRouting,
  useSystemInterfaces,
  useSystemUsb,
  useExternalIp,
  useSystemHostname,
  useSystemIp,
  useSystemUptime,
  useSystemCpuLoad,
  useSystemMemory,
  useSystemDisk,
  useServiceStatus,
  useAuroraServices,
  useServerConfig,
  useUpdateServerConfig,
  // IP Geolocation
  useIpGeolocation,
  useIpGeolocationByIp,
  useClientGeolocation,
  type IpGeolocation,
  // Location API (new unified endpoints)
  useClientLatestLocation,
  useClientLocationHistory,
  useLocationSummary,
  useClientLocationTrack,
  type ClientLocation,
  type LocationHistoryPoint,
  type LocationSummary,
  type GeoJsonTrack,
} from "./system";

export {
  useUsers,
  useUser,
  useUserApiKeys,
  useUserSessions,
  useRoles,
  usePermissions,
  useUserRoles,
  useUserPermissions,
  useActivityLog,
  useUserActivityLog,
  useRolePermissions,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  useChangePassword,
  useChangeUserPassword,
  useCreateUserApiKey,
  useDeleteUserApiKey,
  useAssignRole,
  // New user management hooks
  useRemoveUserRole,
  useAssignUserPermission,
  useRemoveUserPermission,
  useDeleteUserSession,
  useDeleteAllUserSessions,
  useActivateUser,
  useDeactivateUser,
  usePatchUser,
  // Role management hooks
  useCreateRole,
  useUpdateRole,
  useDeleteRole,
  useAssignRolePermissions,
} from "./users";

// Activity & Sessions hooks
export {
  useActivityFeed,
  useUserActivity,
  useUserSessions as useUserSessionsList,
  useUserApiKeys as useUserApiKeysList,
  useCreateApiKey,
  useDeleteApiKey,
  type ActivityEntry,
  type UserSession,
  type ApiKey,
} from "./activity";

// Real-Time Streams
export {
  STREAM_ENDPOINTS,
  getStreamUrl,
  type StreamReadingMessage,
  type StreamClientMessage,
  type StreamAlertMessage,
  type StreamDashboardStatsMessage,
  type StreamCommandStatusMessage,
} from "./streams";

export {
  useComprehensiveStats,
  useDeviceStats,
  useGlobalStats,
  use1hrStats,
  use6hrStats,
  use12hrStats,
  use24hrStats,
  useWeeklyStats,
  useStatsAll,
  useStatsByClient,
  useStatsBySensor,
  useClientDetailStats,
  useClientLatestStats,
  useSensorsByClientLatest,
  useDeviceReadings,
  useDeviceDetailStats,
  usePeriodStats,
  usePeriodStatsByHours,
  useSensorTypeStatsById,
  useSensorTypeStatsWithPeriod,
  useAircraftStats,
  useEndpointStats,
  usePowerStats,
  usePerformanceStats,
  useStatsOverview,
  useClientStats,
  useGlobalStatsHistory,
  useSensorStatsHistory,
  useDeviceStatsHistory,
  useAlertStatsHistory,
  useSystemResourceStatsHistory,
  // NEW: Sensor stats endpoints
  useSensorStatsByType,
  useSensorTypeStats,
  useSensorsByClientId,
  // NEW: Client timeseries
  useClientTimeseries,
  // Types
  type ClientStats,
  type TimePeriodStats,
  type SensorTypeStats,
  type GlobalStatsHistoryPoint,
  type SensorStatsHistoryPoint,
  type DeviceStatsHistoryPoint,
  type AlertStatsHistoryPoint,
  type SystemResourceStatsHistoryPoint,
  type PeriodStats,
  type PerformanceStats,
  type ClientGroupedStats,
  type SensorGroupedStats,
  type ClientDetailedStats,
  type DeviceReadings,
  type DeviceDetailedStats,
  type StatsAllResponse,
  // NEW: Sensor stats types
  type SensorTypeByTypeStats,
  type SensorTypeDetailedStats,
  type ClientSensorTypeStats,
  // NEW: Client timeseries types
  type ClientTimeseriesPoint,
  type ClientTimeseriesResponse,
  // NEW: Client latest stats types
  type ClientLatestStats,
  type ClientSensorLatestReading,
  type ClientSensorLatestResponse,
} from "./stats";

// Power domain hooks
export {
  usePowerCurrent,
  usePowerSummary,
  usePowerHistory,
  usePowerDevices,
  useBatteryStats,
  useVoltageStats,
  useUsbPower,
  type PowerDevice,
  type CurrentPowerStatus,
  type PowerSummary,
  type PowerHistoryPoint,
  type BatteryStats,
  type VoltageStats,
  type UsbPowerStats,
} from "./power";

// Bluetooth domain hooks
export {
  useBluetoothScanners,
  useBluetoothScan,
  useBluetoothNearby,
  useBluetoothStats,
  useBluetoothHistory,
  type BluetoothScanner,
  type BluetoothDevice as BluetoothDeviceData,
  type BluetoothStats,
  type BluetoothHistoryPoint,
} from "./bluetooth";

// WiFi domain hooks
export {
  useWifiScanners,
  useWifiScan as useWifiScanData,
  useWifiNetworks,
  useWifiNearby,
  useWifiStats,
  useWifiHistory,
  type WifiScanner,
  type WifiNetwork as WifiNetworkData,
  type WifiStats,
  type WifiHistoryPoint,
} from "./wifi";

// Client-specific sensor data hooks
export {
  useBatchesByClient as useClientBatches,
  useBatchWithReadings,
  useClientSensorData,
  useClientSensorTypeData,
  useClientStarlinkData,
  useClientSystemMonitorData,
  useClientWifiData,
  useClientBluetoothData,
  useClientAdsbData,
  useClientGpsData,
  useClientThermalData,
  useClientArduinoData,
  useClientLoraData,
  type ClientSensorReading,
  type SensorDataByType,
  type WifiNetwork,
  type BluetoothDevice,
  type GpsData,
  type ArduinoMetrics,
} from "./clientSensors";

export {
  useArduinoDevicesFromReadings,
  useArduinoReadings,
  useArduinoStats,
  useArduinoDeviceMetrics,
  type ArduinoDeviceWithMetrics,
  type ArduinoStats,
  type ArduinoTimeseriesPoint,
} from "./arduino";

// Arduino Stats with all 10 measurements
export {
  useArduino1hrStats,
  useArduino6hrStats,
  useArduino24hrStats,
  useArduinoDashboardStats,
  useArduinoAllStats,
  type ArduinoHourlyStats,
  type ArduinoStatsResponse,
  type ArduinoCurrentMeasurements,
  type ArduinoStatsAggregated,
} from "./arduinoStats";

// Re-export from the original file for hooks not yet migrated
// This ensures backward compatibility during the transition
export {
  // Baselines
  useBaselineProfiles,
  useBaselineEntries,
  useBaselineViolations,
  useCreateBaselineProfile,
  useAddBaselineEntry,
  useRemoveBaselineEntry,
  useAcknowledgeViolation,
  useWhitelistViolation,
  useAutoLearnBaseline,
  // Export
  useExportFormats,
  // Audit
  useAuditLogs,
  useAuditStats,
  type AuditLog,
  // Logs
  useLogs,
  useDatacollectorLogs,
  useDataserverLogs,
  // GPS
  useGpsReadings,
  useGpsdStatus,
  useVisibleSatellites,
  // Thermal Probe
  useThermalProbeStats,
  useThermalProbeTimeseries,
  // AHT/Arduino Sensor Timeseries
  useAhtSensorTimeseries,
  useArduinoSensorTimeseries,
  useBmtSensorTimeseries,
  // Devices & Batches
  useDeviceTree,
  useDeviceStatus,
  useDeviceLatest,
  useBatchesList,
  useLatestBatch,
  useBatchById,
  useBatchSensors,
  useBatchReadings,
  useBatchesByClient,
  // Batch Retention
  useBatchRetentionConfig,
  useUpdateBatchRetentionConfig,
  useClientBatchRetention,
  useUpdateClientBatchRetention,
  useDeleteClientBatchRetention,
  useToggleClientDebugMode,
  useDiskUsageInfo,
  // Geo Data
  useGeoLocations,
  useUpdateGeoLocation,
  useModifyGeoLocation,
  // Remote Commands
  useSendCommand,
  useAdminCommands,
  useCommandResults,
  useClientPendingCommands,
  useSubmitCommandResult,
  type RemoteCommand,
  type CommandResult,
  // Update Management
  useUpdatePackages,
  useUpdateStatus,
  usePublishPackage,
  useCreateUpdateAssignment,
  useClientUpdateHistory,
  useClientAvailableUpdates,
  useReportUpdateStatus,
  type UpdatePackage,
  type UpdateAssignment,
  // Health
  useHealth,
  useHealthCheck,
  // V1 API
  useV1Devices,
  useV1Readings,
  useV1Latest,
  useV1MovingAverage,
  useV1ClientConfiguration,
  useUpdateV1ClientConfiguration,
  useV1AllConfigurations,
  useCreateV1ClientConfig,
  // Timeseries
  useTimeseries,
  // Data Files
  useBandwidthData,
  useArduinoData,
  usePingStats,
  useStarlinkStatusData,
  useStarlinkStatusFile,
  useGpsdStatusFile,
  useBandwidthFile,
  useArduinoDataFile,
  useVisibleSatsFile,
  usePingStatsFile,
  // Analytics
  useMovingAverage,
  // Radio timeseries
  useWifiScannerTimeseries,
  useBluetoothScannerTimeseries,
  useLoraDetectorTimeseries,
  // LoRa
  useRecentLoraDetections,
  // Users
  useCurrentUser,
  type User,
  // Rename client
  useRenameClient,
} from "../useAuroraApi";
