// Aurora API - Main barrel export
// Re-exports all hooks from modular files for backward compatibility

// Core utilities
export { callAuroraApi, hasAuroraSession, clearAuroraSession } from "./core";

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
  useGlobalStatsHistory,
  useSensorStatsHistory,
  useDeviceStatsHistory,
  useAlertStatsHistory,
  useSystemResourceStatsHistory,
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
