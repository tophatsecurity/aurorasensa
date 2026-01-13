// Aurora API - Main barrel export
// Re-exports all hooks from modular files for backward compatibility

// Core utilities
export { callAuroraApi, hasAuroraSession, clearAuroraSession, invalidateAuroraCache, getAuroraQueueStats } from "./core";

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
  useSensorTypeStats,
  useSensorTypeStatsWithPeriod,
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
  useStarlinkSensorReadings,
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
  useDashboardSensorTimeseries,
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
  use24hrStats,
  useWeeklyStats,
  usePeriodStats,
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
  type ClientStats,
} from "./stats";

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
  // Update Management
  useUpdatePackages,
  useUpdateStatus,
  usePublishPackage,
  useCreateUpdateAssignment,
  useClientUpdateHistory,
  useClientAvailableUpdates,
  useReportUpdateStatus,
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
} from "../useAuroraApi";
