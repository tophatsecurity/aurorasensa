// Aurora API - Main barrel export
// Re-exports all hooks from modular files for backward compatibility

// Core utilities
export { callAuroraApi, hasAuroraSession, clearAuroraSession } from "./core";

// All types
export * from "./types";

// Domain-specific hooks
export * from "./sensors";
export * from "./clients";
export * from "./adsb";
export * from "./starlink";

// Re-export from the original file for hooks not yet migrated
// This ensures backward compatibility during the transition
export {
  // Dashboard hooks
  useDashboardStats,
  useDashboardTimeseries,
  useDashboardSystemStats,
  // Statistics hooks
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
  // Power & Performance
  usePowerStats,
  usePerformanceStats,
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
  // System Info
  useSystemInfo,
  useSystemArp,
  useSystemRouting,
  useSystemInterfaces,
  useSystemUsb,
  useExternalIp,
  // Baselines
  useBaselineProfiles,
  useBaselineEntries,
  useBaselineViolations,
  // Alerts
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
  // Export
  useExportFormats,
  // User Management
  useUsers,
  useCreateUser,
  useDeleteUser,
  // Audit
  useAuditLogs,
  useAuditStats,
  // Logs
  useLogs,
  useDatacollectorLogs,
  useDataserverLogs,
  // Config
  useServerConfig,
  useUpdateServerConfig,
  // GPS
  useGPSReadings,
  useGPSTimeseries,
  // LoRa
  useLoRaDevices,
  useLoRaDevice,
  useLoRaDetections,
  useLoRaRecentDetections,
  useLoRaGlobalStats,
  useLoRaDeviceStats,
  useLoRaChannelStats,
  useLoRaSpectrumAnalysis,
  // Thermal Probe
  useThermalProbeReadings,
  useThermalProbeTimeseries,
  useThermalProbeStats,
  // Update Management
  useUpdatePackages,
  useUpdatePackageDetails,
  useUploadUpdatePackage,
  usePublishUpdatePackage,
  useCreateUpdateAssignment,
  useUpdateStatusDashboard,
  useClientUpdateHistory,
  // Remote Commands
  useSendCommand,
  useListCommands,
  useCommandResults,
  useClientCommandResult,
  // Health
  useHealth,
  useApiHealth,
  // V1 API
  useV1Devices,
  useV1Readings,
  useV1Latest,
  useV1MovingAverage,
  useV1ClientConfig,
  useUpdateV1ClientConfig,
  useV1AllConfigs,
  useCreateV1Client,
  // Activity & Sessions
  useActivityFeed,
  useUserActivity,
  useUserSessions,
  // Roles & Permissions
  useRoles,
  useUserRoles,
  useAssignRole,
  usePermissions,
  useUserPermissions,
  // API Keys
  useUserApiKeys,
  useCreateApiKey,
  useDeleteApiKey,
  // Timeseries
  useTimeseries,
  // Stats History
  useGlobalStatsHistory,
  useSensorStatsHistory,
  useDeviceStatsHistory,
  useAlertStatsHistory,
  useSystemResourceStatsHistory,
} from "../useAuroraApi";
