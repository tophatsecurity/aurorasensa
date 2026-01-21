// Stats components barrel export
export * from "./types";
export * from "./utils";
export * from "./locationResolver";
export { ClientStatsPanel } from "./ClientStatsPanel";
export { ClientInfoCard } from "./ClientInfoCard";
export { MeasurementsSection } from "./MeasurementsSection";
export { ClientLocationMap } from "./ClientLocationMap";

// New sensor-based components
export { SensorTypeStats } from "./SensorTypeStats";
export { SensorListCard } from "./SensorListCard";
export { SensorMeasurementsCard } from "./SensorMeasurementsCard";
export { SensorLocationMap } from "./SensorLocationMap";
export { default as SensorDetailsModal } from "./SensorDetailsModal";
export { default as SensorMetricsCharts } from "./SensorMetricsCharts";

// Legacy exports for backward compatibility
export { SensorTypeStats as DeviceTypeStats } from "./SensorTypeStats";
export { SensorListCard as DeviceListCard } from "./SensorListCard";
export { SensorMeasurementsCard as DeviceMeasurementsCard } from "./SensorMeasurementsCard";
export { SensorLocationMap as DeviceLocationMap } from "./SensorLocationMap";
export { default as DeviceDetailsModal } from "./SensorDetailsModal";
export { default as DeviceMetricsCharts } from "./SensorMetricsCharts";

export { StarlinkTab } from "./StarlinkTab";
export { ArduinoTab } from "./ArduinoTab";
export { SensorTabs } from "./SensorTabs";
export { StatsHeader } from "./StatsHeader";
export { StatsLoadingSkeleton } from "./StatsLoadingSkeleton";
export { RawJsonPanel } from "./RawJsonPanel";
export { default as GlobalStatsCards } from "./GlobalStatsCards";
export { default as GlobalReadingsTrendChart } from "./GlobalReadingsTrendChart";
export { default as ClientTrendChart } from "./ClientTrendChart";
export { default as ClientSensorStats } from "./ClientSensorStats";
export { ClientListView } from "./ClientListView";
export { ClientDetailPage } from "./ClientDetailPage";
