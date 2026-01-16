import { useMemo, useState } from "react";
import { 
  Thermometer, 
  Radio, 
  Zap, 
  BarChart3, 
  MapPin,
  Loader2,
  TrendingUp,
  TrendingDown,
  Activity,
  Database,
  Clock,
  ExternalLink,
  Server,
  Cpu,
  Wifi,
  Droplets,
  Signal,
  UserPlus,
  CheckCircle,
  AlertCircle,
  Satellite,
  Plane,
  Navigation,
  ArrowUp,
  ArrowDown,
  Minus,
  RefreshCw
} from "lucide-react";
import ConnectionStatusIndicator from "./ConnectionStatusIndicator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import SensorCard from "./SensorCard";
import StatCardWithChart from "./StatCardWithChart";
import SensorCharts from "./SensorCharts";
import StarlinkCharts from "./StarlinkCharts";
import ThermalProbeCharts from "./ThermalProbeCharts";
import ThermalProbeDeviceChart from "./ThermalProbeDeviceChart";
import HumidityCharts from "./HumidityCharts";
import PowerConsumptionCharts from "./PowerConsumptionCharts";
import SystemMonitorCharts from "./SystemMonitorCharts";

import { AdsbSection, LoRaSection, WifiBluetoothSection, GpsSection, AlertsSection, BatchesSection, MaritimeSection, DashboardStatsHeader, DashboardSensorSummary, DashboardDeviceActivity, WeeklyTrendChart } from "./dashboard";

import { 
  ContextFilters,  
  timePeriodLabel 
} from "@/components/ui/context-selectors";
import { useClientContext } from "@/contexts/ClientContext";
import { 
  useComprehensiveStats, 
  useAlerts, 
  useClients,
  useClientsByState,
  useClientStatistics,
  useDashboardStats, 
  useDashboardTimeseries, 
  useSensorTypeStatsWithPeriod,
  usePeriodStatsByHours,
  useStarlinkTimeseries,
  useStarlinkPower,
  useThermalProbeTimeseries,
  useAhtSensorTimeseries,
  useArduinoSensorTimeseries,
  useSystemInfo,
  useHealth,
  useLatestReadings,
  useAlertStats,
  useBatchesList,
  useDeviceStatus,
  usePerformanceStats,
  useStatsOverview,
  useGlobalStats,
  useDeviceTree,
  type Client 
} from "@/hooks/aurora";
import { useSensorReadingsSSE } from "@/hooks/useSSE";
import { MemoryStick, HardDrive } from "lucide-react";
import { formatLastSeen, formatDate, formatDateTime, getDeviceStatusFromLastSeen } from "@/utils/dateUtils";

interface SensorStats {
  min: number | null;
  max: number | null;
  avg: number | null;
  current: number | null;
  trend: 'up' | 'down' | 'stable';
}

const calcStats = (data: { value: number }[] | undefined): SensorStats => {
  if (!data || data.length === 0) {
    return { min: null, max: null, avg: null, current: null, trend: 'stable' };
  }
  const values = data.map(d => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const current = values[values.length - 1];
  const previous = values.length > 1 ? values[values.length - 2] : current;
  const trend = current > previous + 0.1 ? 'up' : current < previous - 0.1 ? 'down' : 'stable';
  return { min, max, avg, current, trend };
};

// Helper to convert Celsius to Fahrenheit
const cToF = (celsius: number | null | undefined): number | null => {
  if (celsius === null || celsius === undefined) return null;
  return (celsius * 9/5) + 32;
};

// Format temperature with both C and F
const formatTemp = (celsius: number | null | undefined): string => {
  if (celsius === null || celsius === undefined) return "—";
  const f = cToF(celsius);
  return `${celsius.toFixed(1)}°C / ${f?.toFixed(1)}°F`;
};

// Format temperature for compact display
const formatTempCompact = (celsius: number | null | undefined): string => {
  if (celsius === null || celsius === undefined) return "—";
  const f = cToF(celsius);
  return `${celsius.toFixed(1)}°C (${f?.toFixed(0)}°F)`;
};

const DashboardContent = () => {
  // Use shared client context for time period and client selection
  const { 
    selectedClientId: selectedClient, 
    setSelectedClientId: setSelectedClient,
    timePeriod,
    setTimePeriod,
    periodHours 
  } = useClientContext();
  
  
  
  const { data: stats, isLoading: statsLoading } = useComprehensiveStats();
  const { data: dashboardStats, isLoading: dashboardStatsLoading } = useDashboardStats();
  const { data: timeseries, isLoading: timeseriesLoading } = useDashboardTimeseries(periodHours, selectedClient);
  const { data: alerts } = useAlerts();
  
  // Use both useClients and useClientsByState for better data coverage
  const { data: clients, isLoading: clientsLoading } = useClients();
  const { data: clientsByState, isLoading: clientsByStateLoading } = useClientsByState();
  const { data: clientStatistics, isLoading: clientStatisticsLoading } = useClientStatistics();
  
  // Use statsOverview for accurate reading counts
  const { data: statsOverview, isLoading: statsOverviewLoading } = useStatsOverview();
  
  // Device tree for sensor types count
  const { data: deviceTree, isLoading: deviceTreeLoading } = useDeviceTree();
  
  // Period-specific stats that update with time period selection
  const { data: periodStats, isLoading: periodStatsLoading } = usePeriodStatsByHours(periodHours);
  
  // Sensor type specific stats - use period-aware version for dynamic updates
  const { data: thermalProbeStats, isLoading: thermalLoading } = useSensorTypeStatsWithPeriod("thermal_probe", periodHours);
  const { data: starlinkStats, isLoading: starlinkLoading } = useSensorTypeStatsWithPeriod("starlink", periodHours);
  const { data: ahtStats } = useSensorTypeStatsWithPeriod("aht_sensor", periodHours);
  const { data: bmtStats } = useSensorTypeStatsWithPeriod("bmt_sensor", periodHours);
  const { data: systemMonitorStats, isLoading: systemMonitorLoading } = useSensorTypeStatsWithPeriod("system_monitor", periodHours);
  
  // System info from API - only fetch when needed
  const { data: systemInfo, isLoading: systemInfoLoading } = useSystemInfo();
  
  // Aurora services status - removed to reduce API calls, health check is sufficient
  const { data: health, isLoading: healthLoading } = useHealth();
  
  // Additional stats from API
  const { data: alertStats, isLoading: alertStatsLoading } = useAlertStats();
  const { data: batchesData, isLoading: batchesLoading } = useBatchesList(10);
  const { data: deviceStatus, isLoading: deviceStatusLoading } = useDeviceStatus();
  const { data: performanceStats, isLoading: performanceLoading } = usePerformanceStats();
  const { data: globalStats, isLoading: globalStatsLoading } = useGlobalStats();
  // Real timeseries data for sparklines - now using context filters
  const { data: starlinkTimeseries, isLoading: starlinkTimeseriesLoading } = useStarlinkTimeseries(periodHours, selectedClient);
  const { data: thermalTimeseries, isLoading: thermalTimeseriesLoading } = useThermalProbeTimeseries(periodHours, selectedClient);
  const { data: ahtTimeseries, isLoading: ahtTimeseriesLoading } = useAhtSensorTimeseries(periodHours, selectedClient);
  const { data: arduinoTimeseries, isLoading: arduinoTimeseriesLoading } = useArduinoSensorTimeseries(periodHours, selectedClient);
  
  // Dedicated Starlink power endpoint for accurate power data
  const { data: starlinkPowerData, isLoading: starlinkPowerLoading } = useStarlinkPower();
  
  // Latest readings for thermal sensors
  const { data: latestReadings, isLoading: latestReadingsLoading } = useLatestReadings();
  
  

  // Check if thermal timeseries has actual temperature values (not just timestamps)
  const thermalHasValidData = useMemo(() => {
    if (!thermalTimeseries?.readings || thermalTimeseries.readings.length === 0) return false;
    return thermalTimeseries.readings.some(r => 
      r.temp_c !== undefined || r.probe_c !== undefined || r.ambient_c !== undefined
    );
  }, [thermalTimeseries?.readings]);

  // Effective thermal timeseries - use dashboard timeseries if thermal probe returns empty data
  const effectiveThermalTimeseries = useMemo(() => {
    if (thermalHasValidData && thermalTimeseries?.readings) {
      return thermalTimeseries.readings.map(r => ({
        timestamp: r.timestamp,
        value: r.temp_c ?? r.probe_c ?? r.ambient_c ?? 0,
      }));
    }
    // Fall back to dashboard timeseries which has real temperature data
    return (timeseries?.temperature || []).map(t => ({
      timestamp: t.timestamp,
      value: t.value,
    }));
  }, [thermalHasValidData, thermalTimeseries?.readings, timeseries?.temperature]);

  // Extract key metrics from comprehensive stats
  const global = stats?.global;
  const devicesSummary = stats?.devices_summary;
  const sensorsSummary = stats?.sensors_summary;

  // Aggregate all clients from clientsByState for accurate count
  const allClientsFromState = useMemo(() => {
    if (!clientsByState?.clients_by_state) return [];
    const { pending = [], registered = [], adopted = [], disabled = [], suspended = [] } = clientsByState.clients_by_state;
    return [...pending, ...registered, ...adopted, ...disabled, ...suspended];
  }, [clientsByState]);

  // Use globalStats (from /api/stats/global) as primary source, fallback to comprehensive stats
  // API returns { data: { total_readings: 183249, ... }, status: "success" }
  const totalReadings = globalStats?.total_readings ?? statsOverview?.total_readings ?? global?.total_readings ?? global?.database?.total_readings ?? 0;
  
  // Get client counts - prefer globalStats, then comprehensive stats
  const comprehensiveClientCount = globalStats?.total_clients ?? global?.total_clients ?? global?.database?.total_clients ?? 0;
  // API returns { status, statistics: { total, by_state, summary } }
  const clientStatsTotal = clientStatistics?.statistics?.total ?? clientStatistics?.total ?? 0;
  const aggregatedClientCount = allClientsFromState.length;
  const clientsArrayCount = clients?.length ?? 0;
  
  // Use the best available client count (prefer globalStats, then comprehensive stats)
  const effectiveClients = comprehensiveClientCount > 0 ? comprehensiveClientCount :
                          clientStatsTotal > 0 ? clientStatsTotal : 
                          aggregatedClientCount > 0 ? aggregatedClientCount : 
                          clientsArrayCount;

  // Filter out deleted/disabled/suspended clients for dashboard display
  const activeClients = useMemo(() => {
    // Prefer clientsByState data since it has better structure
    if (allClientsFromState.length > 0) {
      return allClientsFromState.filter((c: Client) => 
        !['deleted', 'disabled', 'suspended'].includes(c.state || '')
      );
    }
    // Fallback to clients array
    return (clients || []).filter((c: Client) => 
      !['deleted', 'disabled', 'suspended'].includes(c.state || '')
    );
  }, [allClientsFromState, clients]);

  const totalClients = effectiveClients > 0 ? effectiveClients : activeClients.length;
  const activeDevices1h = global?.activity?.last_1_hour?.active_devices_1h ?? 0;
  const readings1h = global?.activity?.last_1_hour?.readings_1h ?? 0;
  
  // Get sensor types count from globalStats or comprehensive stats or device tree
  const deviceTypes = useMemo(() => {
    // Prefer globalStats sensor_types_count
    if (globalStats?.sensor_types_count && globalStats.sensor_types_count > 0) {
      return globalStats.sensor_types_count;
    }
    // Fallback to globalStats device_breakdown
    if (globalStats?.device_breakdown && globalStats.device_breakdown.length > 0) {
      return globalStats.device_breakdown.length;
    }
    // Fallback to comprehensive stats
    if (global?.sensor_types_count && global.sensor_types_count > 0) {
      return global.sensor_types_count;
    }
    // Fallback to device breakdown count
    if (global?.device_breakdown && global.device_breakdown.length > 0) {
      return global.device_breakdown.length;
    }
    if (Array.isArray(deviceTree) && deviceTree.length > 0) {
      const types = new Set<string>();
      deviceTree.forEach((d) => {
        if (d.device_type) types.add(d.device_type);
      });
      return types.size;
    }
    return sensorsSummary?.total_sensor_types ?? 0;
  }, [globalStats, global, deviceTree, sensorsSummary]);
  
  const totalSensorTypes = deviceTypes;
  const totalDevices = globalStats?.total_devices ?? global?.total_devices ?? (Array.isArray(deviceTree) ? deviceTree.length : (devicesSummary?.total_devices ?? 0));
  const totalBatches = globalStats?.total_batches ?? global?.total_batches ?? 0;
  const activeAlerts = alertStats?.active ?? global?.database?.active_alerts ?? 0;

  // Extract real sensor data from numeric_field_stats_24h
  const thermalFieldStats = thermalProbeStats?.numeric_field_stats_24h;
  const starlinkFieldStats = starlinkStats?.numeric_field_stats_24h;
  const bmtFieldStats = bmtStats?.numeric_field_stats_24h;
  const ahtFieldStats = ahtStats?.numeric_field_stats_24h;
  
  // Thermal probe temperature from real API data
  const thermalAvgTemp = thermalFieldStats?.temperature_c?.avg ?? thermalFieldStats?.temp_c?.avg;
  const thermalMinTemp = thermalFieldStats?.temperature_c?.min ?? thermalFieldStats?.temp_c?.min;
  const thermalMaxTemp = thermalFieldStats?.temperature_c?.max ?? thermalFieldStats?.temp_c?.max;
  
  // Starlink metrics - prefer dedicated power endpoint
  const starlinkPowerAvg = starlinkPowerData?.device_summaries?.[0]?.overall?.avg_watts ?? 
    starlinkFieldStats?.power_watts?.avg ?? starlinkFieldStats?.power_w?.avg;
  const starlinkPowerMin = starlinkPowerData?.device_summaries?.[0]?.overall?.min_watts;
  const starlinkPowerMax = starlinkPowerData?.device_summaries?.[0]?.overall?.max_watts;
  const starlinkLatency = starlinkFieldStats?.pop_ping_latency_ms?.avg;
  const starlinkObstruction = starlinkFieldStats?.obstruction_percent?.avg;
  const starlinkDownlink = starlinkFieldStats?.downlink_throughput_bps?.avg;
  const starlinkUplink = starlinkFieldStats?.uplink_throughput_bps?.avg;

  // BME280/BMT sensor stats
  const bmtTemp = bmtFieldStats?.bme280_temp_c ?? bmtFieldStats?.temp_c;
  const bmtHumidity = bmtFieldStats?.bme280_humidity ?? bmtFieldStats?.humidity;
  const bmtPressure = bmtFieldStats?.bme280_pressure_hpa ?? bmtFieldStats?.pressure_hpa;

  // AHT sensor stats  
  const ahtTemp = ahtFieldStats?.aht_temp_c ?? ahtFieldStats?.temp_c;
  const ahtHumidity = ahtFieldStats?.aht_humidity ?? ahtFieldStats?.humidity;

  // Sensor averages - prefer period-specific stats, then fall back to sensor-specific stats
  const avgTemp = periodStats?.averages?.temperature_c ?? dashboardStats?.avg_temp_c ?? thermalAvgTemp ?? bmtTemp?.avg ?? ahtTemp?.avg;
  const avgHumidity = periodStats?.averages?.humidity ?? dashboardStats?.avg_humidity ?? bmtHumidity?.avg ?? ahtHumidity?.avg;
  const avgSignal = dashboardStats?.avg_signal_dbm;
  const avgPower = periodStats?.averages?.power_w ?? dashboardStats?.avg_power_w ?? starlinkPowerAvg;

  // Period-specific sensor statistics - use period stats first, then API stats, then timeseries fallback
  const tempStats = useMemo((): SensorStats => {
    // Try thermal probe first, then BMT, then AHT
    const stats = thermalFieldStats?.temp_c ?? thermalFieldStats?.temperature_c ?? bmtTemp ?? ahtTemp;
    if (stats && (stats.min !== undefined || stats.avg !== undefined)) {
      return {
        min: stats.min ?? null,
        max: stats.max ?? null,
        avg: stats.avg ?? null,
        current: stats.avg ?? null,
        trend: 'stable'
      };
    }
    
    // Fall back to calculating from effective timeseries
    if (effectiveThermalTimeseries.length > 0) {
      const values = effectiveThermalTimeseries.map(t => t.value).filter(v => v !== undefined && v !== null && v !== 0);
      if (values.length > 0) {
        const min = Math.min(...values);
        const max = Math.max(...values);
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const current = values[values.length - 1];
        return { min, max, avg, current, trend: 'stable' };
      }
    }
    
    return { min: null, max: null, avg: null, current: null, trend: 'stable' };
  }, [thermalFieldStats, bmtTemp, ahtTemp, effectiveThermalTimeseries]);

  const humidityStats = useMemo((): SensorStats => {
    const stats = bmtHumidity ?? ahtHumidity;
    if (!stats) return { min: null, max: null, avg: null, current: null, trend: 'stable' };
    return {
      min: stats.min ?? null,
      max: stats.max ?? null,
      avg: stats.avg ?? null,
      current: stats.avg ?? null,
      trend: 'stable'
    };
  }, [bmtHumidity, ahtHumidity]);

  const signalStats = useMemo((): SensorStats => {
    // No signal data from these sensors currently
    return { min: null, max: null, avg: null, current: null, trend: 'stable' };
  }, []);

  const powerStats = useMemo((): SensorStats => {
    // Use dedicated Starlink power endpoint data first (most accurate)
    const powerSummary = starlinkPowerData?.device_summaries?.[0]?.overall;
    if (powerSummary) {
      return {
        min: powerSummary.min_watts ?? null,
        max: powerSummary.max_watts ?? null,
        avg: powerSummary.avg_watts ?? null,
        current: powerSummary.avg_watts ?? null, // Use avg as current approximation
        trend: 'stable'
      };
    }
    
    // Fallback to sensor type stats if available
    const stats = starlinkFieldStats?.power_watts;
    if (!stats) return { min: null, max: null, avg: null, current: null, trend: 'stable' };
    return {
      min: stats.min ?? null,
      max: stats.max ?? null,
      avg: stats.avg ?? null,
      current: stats.avg ?? null,
      trend: 'stable'
    };
  }, [starlinkPowerData, starlinkFieldStats]);

  // Devices pending adoption (auto-registered but not manually adopted)
  const pendingDevices = clients?.filter((c: Client) => c.auto_registered && !c.adopted_at) || [];
  const adoptedDevices = clients?.filter((c: Client) => c.adopted_at) || [];
  
  // Filter thermal sensors from latest readings
  const thermalSensorReadings = useMemo(() => {
    if (!latestReadings || latestReadings.length === 0) return [];
    
    // Filter for temperature-related sensor types
    const thermalTypes = ['thermal_probe', 'aht_sensor', 'bmt_sensor', 'arduino_sensor_kit'];
    
    return latestReadings
      .filter(reading => thermalTypes.includes(reading.device_type))
      .map(reading => {
        const data = (reading.data || {}) as Record<string, number | undefined>;
        // Try to extract temperature from various possible field names
        const temperature = 
          data?.temperature_c ?? 
          data?.temp_c ?? 
          data?.aht_temp_c ?? 
          data?.bmp_temp_c ?? 
          data?.th_temp_c ??
          data?.probe_c ??
          data?.ambient_c;
        
        const humidity = 
          data?.humidity ?? 
          data?.aht_humidity ?? 
          data?.th_humidity ??
          data?.bme280_humidity;
          
        return {
          device_id: reading.device_id,
          device_type: reading.device_type,
          client_id: reading.client_id,
          timestamp: reading.timestamp,
          temperature,
          humidity,
        };
      })
      .filter(sensor => sensor.temperature !== undefined);
  }, [latestReadings]);
  
  // Filter Starlink devices from latest readings
  const starlinkDeviceReadings = useMemo(() => {
    if (!latestReadings || latestReadings.length === 0) return [];
    
    const starlinkTypes = ['starlink', 'starlink_dish', 'starlink_dish_comprehensive'];
    
    return latestReadings
      .filter(reading => {
        // Support both device_type and sensor_type formats (sensor_type may come from newer API)
        const readingAny = reading as unknown as { sensor_type?: string };
        const deviceType = (reading.device_type || readingAny.sensor_type || '').toLowerCase();
        return starlinkTypes.some(t => deviceType.includes(t.toLowerCase())) || 
               deviceType.includes('starlink');
      })
      .map(reading => {
        const data = (reading.data || {}) as Record<string, number | undefined>;
        const readingAny = reading as unknown as { sensor_type?: string };
        
        return {
          device_id: reading.device_id || readingAny.sensor_type,
          device_type: reading.device_type || readingAny.sensor_type,
          client_id: reading.client_id,
          timestamp: reading.timestamp,
          power_w: data?.power_watts ?? data?.power_w ?? data?.power,
          latency_ms: data?.pop_ping_latency_ms ?? data?.latency_ms ?? data?.ping_ms,
          downlink_bps: data?.downlink_throughput_bps ?? data?.downlink_bps,
          uplink_bps: data?.uplink_throughput_bps ?? data?.uplink_bps,
          obstruction: data?.obstruction_percent ?? data?.obstruction_percent_time,
          snr: data?.snr,
          uptime: data?.uptime_seconds ?? data?.uptime,
        };
      });
  }, [latestReadings]);
  
  // Get period label for display
  const periodLabel = timePeriodLabel(timePeriod);
  
  return (
    <div className="flex-1 overflow-y-auto p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold text-foreground">AURORASENSE Server</h1>
          <ConnectionStatusIndicator />
        </div>
        <div className="flex items-center gap-4">
          <ContextFilters
            timePeriod={timePeriod}
            onTimePeriodChange={setTimePeriod}
            clientId={selectedClient}
            onClientChange={setSelectedClient}
            showClientFilter={true}
          />
        </div>
      </div>

      {/* Key Stats - Refactored Component */}
      <DashboardStatsHeader periodHours={periodHours} clientId={selectedClient} />

      {/* Weekly Readings Trend Chart */}
      <div className="mb-8">
        <WeeklyTrendChart clientId={selectedClient} />
      </div>

      {/* Power Consumption */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-orange-500" />
          Power Consumption ({periodLabel})
        </h2>
        <PowerConsumptionCharts hours={periodHours} clientId={selectedClient} />
      </div>

      {/* All Temperatures Over Time - moved below Power Consumption */}
      <div className="mb-8">
        <ThermalProbeDeviceChart hours={periodHours} clientId={selectedClient} />
      </div>

      {/* Thermal - All Temperature Sources */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Thermometer className="w-5 h-5 text-red-500" />
          Thermal ({periodLabel}) (°F / °C)
        </h2>
        
        {/* Thermal Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* Current Temperature */}
          <StatCardWithChart
            title="TEMPERATURE"
            value={thermalAvgTemp !== undefined ? thermalAvgTemp.toFixed(1) 
              : avgTemp !== undefined && avgTemp !== null ? avgTemp.toFixed(1) 
              : tempStats.current !== null ? tempStats.current.toFixed(1)
              : "—"}
            unit="°C"
            subtitle={thermalAvgTemp !== undefined 
              ? `${cToF(thermalAvgTemp)?.toFixed(1)}°F` 
              : avgTemp !== undefined && avgTemp !== null 
                ? `${cToF(avgTemp)?.toFixed(1)}°F`
                : tempStats.current !== null
                  ? `${cToF(tempStats.current)?.toFixed(1)}°F`
                  : "No data"}
            icon={Thermometer}
            iconBgColor="bg-red-500/20"
            isLoading={thermalLoading || thermalTimeseriesLoading || timeseriesLoading}
            timeseries={effectiveThermalTimeseries}
            devices={[{
              device_id: "thermal_probe",
              device_type: "thermal_probe",
              color: "#ef4444",
              reading_count: thermalProbeStats?.total_readings ?? thermalProbeStats?.count ?? 0,
              status: "active"
            }]}
          />
          
          {/* Min Temperature */}
          <div className="glass-card rounded-lg p-4 border border-border/50">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <ArrowDown className="w-4 h-4 text-blue-400" />
              </div>
              <span className="text-xs text-muted-foreground">Min Temp (24h)</span>
            </div>
            <div className="text-2xl font-bold text-blue-400">
              {thermalLoading ? "..." : thermalMinTemp !== undefined 
                ? `${thermalMinTemp.toFixed(1)}°C` 
                : tempStats.min !== null 
                  ? `${tempStats.min.toFixed(1)}°C`
                  : "—"}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {thermalMinTemp !== undefined 
                ? `${cToF(thermalMinTemp)?.toFixed(1)}°F`
                : tempStats.min !== null 
                  ? `${cToF(tempStats.min)?.toFixed(1)}°F`
                  : ""}
            </div>
          </div>
          
          {/* Max Temperature */}
          <div className="glass-card rounded-lg p-4 border border-border/50">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                <ArrowUp className="w-4 h-4 text-red-400" />
              </div>
              <span className="text-xs text-muted-foreground">Max Temp (24h)</span>
            </div>
            <div className="text-2xl font-bold text-red-400">
              {thermalLoading ? "..." : thermalMaxTemp !== undefined 
                ? `${thermalMaxTemp.toFixed(1)}°C` 
                : tempStats.max !== null 
                  ? `${tempStats.max.toFixed(1)}°C`
                  : "—"}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {thermalMaxTemp !== undefined 
                ? `${cToF(thermalMaxTemp)?.toFixed(1)}°F`
                : tempStats.max !== null 
                  ? `${cToF(tempStats.max)?.toFixed(1)}°F`
                  : ""}
            </div>
          </div>
          
          {/* Readings Count */}
          <div className="glass-card rounded-lg p-4 border border-border/50">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <Database className="w-4 h-4 text-amber-400" />
              </div>
              <span className="text-xs text-muted-foreground">Thermal Readings</span>
            </div>
            <div className="text-2xl font-bold text-amber-400">
              {thermalLoading ? "..." : (thermalProbeStats?.total_readings ?? thermalProbeStats?.count ?? 0).toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {thermalProbeStats?.device_count ?? 1} device{(thermalProbeStats?.device_count ?? 1) !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
        
        {/* AHT / Arduino Temperature Sensors */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* AHT Temperature with Sparkline */}
          <StatCardWithChart
            title="AHT TEMPERATURE"
            value={ahtTemp?.avg !== undefined ? ahtTemp.avg.toFixed(1) : 
              (ahtTimeseries?.readings?.length ?? 0) > 0 
                ? (ahtTimeseries?.readings?.[ahtTimeseries.readings.length - 1]?.aht_temp_c?.toFixed(1) ?? "—")
                : "—"}
            unit="°C"
            subtitle={ahtTemp?.avg !== undefined 
              ? `${cToF(ahtTemp.avg)?.toFixed(1)}°F | Min: ${ahtTemp.min?.toFixed(1)}°C Max: ${ahtTemp.max?.toFixed(1)}°C`
              : `${ahtTimeseries?.count ?? 0} readings`}
            icon={Thermometer}
            iconBgColor="bg-violet-500/20"
            isLoading={ahtTimeseriesLoading}
            timeseries={(ahtTimeseries?.readings || []).map(r => ({
              timestamp: r.timestamp,
              value: r.aht_temp_c ?? r.temp_c ?? 0,
            }))}
            devices={[{
              device_id: "aht_sensor",
              device_type: "aht_sensor",
              color: "#8b5cf6",
              reading_count: ahtTimeseries?.count ?? ahtStats?.count ?? 0,
              status: "active"
            }]}
          />
          
          {/* AHT Humidity with Sparkline */}
          <StatCardWithChart
            title="AHT HUMIDITY"
            value={ahtHumidity?.avg !== undefined ? ahtHumidity.avg.toFixed(1) : 
              (ahtTimeseries?.readings?.length ?? 0) > 0 
                ? (ahtTimeseries?.readings?.[ahtTimeseries.readings.length - 1]?.aht_humidity?.toFixed(1) ?? "—")
                : "—"}
            unit="%"
            subtitle={ahtHumidity?.avg !== undefined 
              ? `Min: ${ahtHumidity.min?.toFixed(1)}% | Max: ${ahtHumidity.max?.toFixed(1)}%`
              : `${ahtTimeseries?.count ?? 0} readings`}
            icon={Droplets}
            iconBgColor="bg-indigo-500/20"
            isLoading={ahtTimeseriesLoading}
            timeseries={(ahtTimeseries?.readings || []).map(r => ({
              timestamp: r.timestamp,
              value: r.aht_humidity ?? r.humidity ?? 0,
            }))}
            devices={[{
              device_id: "aht_humidity",
              device_type: "aht_sensor",
              color: "#6366f1",
              reading_count: ahtTimeseries?.count ?? ahtStats?.count ?? 0,
              status: "active"
            }]}
          />
          
          {/* Arduino BMP Temperature */}
          <StatCardWithChart
            title="ARDUINO BMP TEMP"
            value={(arduinoTimeseries?.readings?.length ?? 0) > 0 
              ? (arduinoTimeseries?.readings?.[arduinoTimeseries.readings.length - 1]?.bmp_temp_c?.toFixed(1) ?? bmtTemp?.avg?.toFixed(1) ?? "—")
              : bmtTemp?.avg?.toFixed(1) ?? "—"}
            unit="°C"
            subtitle={bmtTemp?.avg !== undefined 
              ? `${cToF(bmtTemp.avg)?.toFixed(1)}°F | Min: ${bmtTemp.min?.toFixed(1)}°C Max: ${bmtTemp.max?.toFixed(1)}°C`
              : `${arduinoTimeseries?.count ?? 0} readings`}
            icon={Thermometer}
            iconBgColor="bg-amber-500/20"
            isLoading={arduinoTimeseriesLoading}
            timeseries={(arduinoTimeseries?.readings || []).filter(r => r.bmp_temp_c !== undefined).map(r => ({
              timestamp: r.timestamp,
              value: r.bmp_temp_c ?? 0,
            }))}
            devices={[{
              device_id: "arduino_bmp",
              device_type: "arduino_sensor_kit",
              color: "#f59e0b",
              reading_count: arduinoTimeseries?.count ?? bmtStats?.count ?? 0,
              status: "active"
            }]}
          />
          
          {/* Arduino BMP Pressure */}
          <StatCardWithChart
            title="BMP PRESSURE"
            value={(arduinoTimeseries?.readings?.length ?? 0) > 0 
              ? (arduinoTimeseries?.readings?.[arduinoTimeseries.readings.length - 1]?.bmp_pressure_hpa?.toFixed(0) ?? bmtPressure?.avg?.toFixed(0) ?? "—")
              : bmtPressure?.avg?.toFixed(0) ?? "—"}
            unit=" hPa"
            subtitle={bmtPressure?.avg !== undefined 
              ? `Min: ${bmtPressure.min?.toFixed(0)} | Max: ${bmtPressure.max?.toFixed(0)} hPa`
              : `${arduinoTimeseries?.count ?? 0} readings`}
            icon={Activity}
            iconBgColor="bg-cyan-500/20"
            isLoading={arduinoTimeseriesLoading}
            timeseries={(arduinoTimeseries?.readings || []).filter(r => r.bmp_pressure_hpa !== undefined).map(r => ({
              timestamp: r.timestamp,
              value: r.bmp_pressure_hpa ?? 0,
            }))}
            devices={[{
              device_id: "arduino_pressure",
              device_type: "arduino_sensor_kit",
              color: "#06b6d4",
              reading_count: arduinoTimeseries?.count ?? 0,
              status: "active"
            }]}
          />
        </div>
        
        {/* Arduino DHT/TH Temperature Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* Arduino TH Temperature */}
          <StatCardWithChart
            title="ARDUINO TH TEMP"
            value={(arduinoTimeseries?.readings?.length ?? 0) > 0 
              ? (arduinoTimeseries?.readings?.[arduinoTimeseries.readings.length - 1]?.th_temp_c?.toFixed(1) ?? "—")
              : "—"}
            unit="°C"
            subtitle={`${arduinoTimeseries?.count ?? 0} readings`}
            icon={Thermometer}
            iconBgColor="bg-rose-500/20"
            isLoading={arduinoTimeseriesLoading}
            timeseries={(arduinoTimeseries?.readings || []).filter(r => r.th_temp_c !== undefined).map(r => ({
              timestamp: r.timestamp,
              value: r.th_temp_c ?? 0,
            }))}
            devices={[{
              device_id: "arduino_th",
              device_type: "arduino_sensor_kit",
              color: "#f43f5e",
              reading_count: arduinoTimeseries?.count ?? 0,
              status: "active"
            }]}
          />
          
          {/* Arduino TH Humidity */}
          <StatCardWithChart
            title="ARDUINO TH HUMIDITY"
            value={(arduinoTimeseries?.readings?.length ?? 0) > 0 
              ? (arduinoTimeseries?.readings?.[arduinoTimeseries.readings.length - 1]?.th_humidity?.toFixed(1) ?? "—")
              : "—"}
            unit="%"
            subtitle={`${arduinoTimeseries?.count ?? 0} readings`}
            icon={Droplets}
            iconBgColor="bg-sky-500/20"
            isLoading={arduinoTimeseriesLoading}
            timeseries={(arduinoTimeseries?.readings || []).filter(r => r.th_humidity !== undefined).map(r => ({
              timestamp: r.timestamp,
              value: r.th_humidity ?? 0,
            }))}
            devices={[{
              device_id: "arduino_th_hum",
              device_type: "arduino_sensor_kit",
              color: "#0ea5e9",
              reading_count: arduinoTimeseries?.count ?? 0,
              status: "active"
            }]}
          />
          
          {/* Arduino Light Sensor */}
          <StatCardWithChart
            title="LIGHT LEVEL"
            value={(arduinoTimeseries?.readings?.length ?? 0) > 0 
              ? (arduinoTimeseries?.readings?.[arduinoTimeseries.readings.length - 1]?.light_raw?.toString() ?? "—")
              : "—"}
            unit=""
            subtitle="Raw analog value"
            icon={Activity}
            iconBgColor="bg-yellow-500/20"
            isLoading={arduinoTimeseriesLoading}
            timeseries={(arduinoTimeseries?.readings || []).filter(r => r.light_raw !== undefined).map(r => ({
              timestamp: r.timestamp,
              value: r.light_raw ?? 0,
            }))}
            devices={[{
              device_id: "arduino_light",
              device_type: "arduino_sensor_kit",
              color: "#eab308",
              reading_count: arduinoTimeseries?.count ?? 0,
              status: "active"
            }]}
          />
          
          {/* Arduino Sound Sensor */}
          <StatCardWithChart
            title="SOUND LEVEL"
            value={(arduinoTimeseries?.readings?.length ?? 0) > 0 
              ? (arduinoTimeseries?.readings?.[arduinoTimeseries.readings.length - 1]?.sound_raw?.toString() ?? "—")
              : "—"}
            unit=""
            subtitle="Raw analog value"
            icon={Radio}
            iconBgColor="bg-emerald-500/20"
            isLoading={arduinoTimeseriesLoading}
            timeseries={(arduinoTimeseries?.readings || []).filter(r => r.sound_raw !== undefined).map(r => ({
              timestamp: r.timestamp,
              value: r.sound_raw ?? 0,
            }))}
            devices={[{
              device_id: "arduino_sound",
              device_type: "arduino_sensor_kit",
              color: "#10b981",
              reading_count: arduinoTimeseries?.count ?? 0,
              status: "active"
            }]}
          />
        </div>
        
        <div className="mt-4">
          <ThermalProbeCharts />
        </div>
        
        {/* Individual Thermal Sensors List */}
        {thermalSensorReadings.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <Thermometer className="w-4 h-4" />
              Active Thermal Sensors ({thermalSensorReadings.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {thermalSensorReadings.map((sensor) => {
                const tempF = sensor.temperature !== undefined ? (sensor.temperature * 9/5) + 32 : null;
                const isWarm = sensor.temperature !== undefined && sensor.temperature > 30;
                const isCold = sensor.temperature !== undefined && sensor.temperature < 15;
                
                return (
                  <div 
                    key={`${sensor.device_id}-${sensor.device_type}`}
                    className="glass-card rounded-lg p-3 border border-border/50 hover:border-red-500/30 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          isWarm ? 'bg-red-500/20' : isCold ? 'bg-blue-500/20' : 'bg-amber-500/20'
                        }`}>
                          <Thermometer className={`w-4 h-4 ${
                            isWarm ? 'text-red-400' : isCold ? 'text-blue-400' : 'text-amber-400'
                          }`} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate max-w-[120px]" title={sensor.device_id}>
                            {sensor.device_id.length > 16 
                              ? `${sensor.device_id.slice(0, 8)}...${sensor.device_id.slice(-4)}`
                              : sensor.device_id}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {sensor.device_type.replace(/_/g, ' ')}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                        {sensor.client_id?.slice(0, 8) || 'N/A'}
                      </Badge>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-baseline justify-between">
                        <span className={`text-xl font-bold ${
                          isWarm ? 'text-red-400' : isCold ? 'text-blue-400' : 'text-amber-400'
                        }`}>
                          {sensor.temperature?.toFixed(1)}°C
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {tempF?.toFixed(1)}°F
                        </span>
                      </div>
                      
                      {sensor.humidity !== undefined && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Droplets className="w-3 h-3" />
                          <span>{sensor.humidity.toFixed(1)}%</span>
                        </div>
                      )}
                      
                      <div className="text-[10px] text-muted-foreground/60 mt-1">
                        {formatLastSeen(sensor.timestamp)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {latestReadingsLoading && thermalSensorReadings.length === 0 && (
          <div className="mt-4 flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Loading thermal sensors...</span>
          </div>
        )}
      </div>

      {/* Starlink - Full Width Section */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Satellite className="w-5 h-5 text-violet-500" />
          Starlink Connectivity
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <StatCardWithChart
            title="LATENCY"
            value={starlinkLatency !== undefined ? starlinkLatency.toFixed(0) : "—"}
            unit=" ms"
            subtitle={starlinkDownlink !== undefined 
              ? `↓ ${(starlinkDownlink / 1000000).toFixed(1)} Mbps`
              : `${starlinkStats?.count ?? 0} readings`}
            icon={Satellite}
            iconBgColor="bg-violet-500/20"
            isLoading={starlinkLoading || starlinkTimeseriesLoading}
            timeseries={(starlinkTimeseries?.readings || []).map(r => ({
              timestamp: r.timestamp,
              value: r.pop_ping_latency_ms ?? 0,
            }))}
            devices={[{
              device_id: "starlink",
              device_type: "starlink",
              color: "#8b5cf6",
              reading_count: starlinkStats?.count ?? 0,
              status: "active"
            }]}
          />
          <StatCardWithChart
            title="POWER CONSUMPTION"
            value={starlinkPowerAvg !== undefined ? starlinkPowerAvg.toFixed(0) : "—"}
            unit=" W"
            subtitle={starlinkPowerMin !== undefined && starlinkPowerMax !== undefined
              ? `Min: ${starlinkPowerMin.toFixed(1)}W / Max: ${starlinkPowerMax.toFixed(1)}W`
              : starlinkObstruction !== undefined 
                ? `Obstruction: ${starlinkObstruction.toFixed(1)}%`
                : `${starlinkStats?.count ?? 0} readings`}
            icon={Zap}
            iconBgColor="bg-orange-500/20"
            isLoading={starlinkLoading || starlinkTimeseriesLoading || starlinkPowerLoading}
            timeseries={(starlinkTimeseries?.readings || []).map(r => ({
              timestamp: r.timestamp,
              value: r.power_w ?? 0,
            }))}
            devices={[{
              device_id: "starlink_power",
              device_type: "starlink",
              color: "#f59e0b",
              reading_count: starlinkStats?.count ?? 0,
              status: "active"
            }]}
          />
        </div>
        <StarlinkCharts hours={periodHours} />
        
        {/* Individual Starlink Devices List */}
        {starlinkDeviceReadings.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <Satellite className="w-4 h-4" />
              Active Starlink Devices ({starlinkDeviceReadings.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {starlinkDeviceReadings.map((device) => {
                const hasGoodLatency = device.latency_ms !== undefined && device.latency_ms < 50;
                const hasHighLatency = device.latency_ms !== undefined && device.latency_ms > 100;
                
                return (
                  <div 
                    key={`${device.device_id}-${device.device_type}`}
                    className="glass-card rounded-lg p-3 border border-border/50 hover:border-violet-500/30 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          hasGoodLatency ? 'bg-green-500/20' : hasHighLatency ? 'bg-red-500/20' : 'bg-violet-500/20'
                        }`}>
                          <Satellite className={`w-4 h-4 ${
                            hasGoodLatency ? 'text-green-400' : hasHighLatency ? 'text-red-400' : 'text-violet-400'
                          }`} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate max-w-[120px]" title={device.device_id}>
                            {device.device_id.length > 16 
                              ? `${device.device_id.slice(0, 8)}...${device.device_id.slice(-4)}`
                              : device.device_id}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {device.device_type.replace(/_/g, ' ')}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                        {device.client_id?.slice(0, 8) || 'N/A'}
                      </Badge>
                    </div>
                    
                    <div className="space-y-1.5">
                      {/* Latency */}
                      {device.latency_ms !== undefined && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Latency</span>
                          <span className={`text-sm font-medium ${
                            hasGoodLatency ? 'text-green-400' : hasHighLatency ? 'text-red-400' : 'text-violet-400'
                          }`}>
                            {device.latency_ms.toFixed(0)} ms
                          </span>
                        </div>
                      )}
                      
                      {/* Power */}
                      {device.power_w !== undefined && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Zap className="w-3 h-3" /> Power
                          </span>
                          <span className="text-sm font-medium text-orange-400">
                            {device.power_w.toFixed(0)} W
                          </span>
                        </div>
                      )}
                      
                      {/* Throughput */}
                      {(device.downlink_bps !== undefined || device.uplink_bps !== undefined) && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Throughput</span>
                          <span className="text-muted-foreground">
                            {device.downlink_bps !== undefined && `↓${(device.downlink_bps / 1000000).toFixed(1)}`}
                            {device.downlink_bps !== undefined && device.uplink_bps !== undefined && ' / '}
                            {device.uplink_bps !== undefined && `↑${(device.uplink_bps / 1000000).toFixed(1)}`} Mbps
                          </span>
                        </div>
                      )}
                      
                      {/* Obstruction */}
                      {device.obstruction !== undefined && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Obstruction</span>
                          <span className={device.obstruction > 5 ? 'text-amber-400' : 'text-muted-foreground'}>
                            {device.obstruction.toFixed(1)}%
                          </span>
                        </div>
                      )}
                      
                      <div className="text-[10px] text-muted-foreground/60 mt-1 pt-1 border-t border-border/30">
                        {formatLastSeen(device.timestamp)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {latestReadingsLoading && starlinkDeviceReadings.length === 0 && (
          <div className="mt-4 flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Loading Starlink devices...</span>
          </div>
        )}
      </div>

      {/* Server Status */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Server className="w-5 h-5 text-cyan-500" />
          Server Status
        </h2>
        {healthLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* API Health */}
            <div className="glass-card rounded-lg p-4 border border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  health?.status === 'ok' ? 'bg-success/20' : 'bg-destructive/20'
                }`}>
                  <Activity className={`w-4 h-4 ${
                    health?.status === 'ok' ? 'text-success' : 'text-destructive'
                  }`} />
                </div>
                <span className="text-xs text-muted-foreground">API Health</span>
              </div>
              <div className={`text-lg font-bold ${
                health?.status === 'ok' ? 'text-success' : 'text-destructive'
              }`}>
                {health?.status === 'ok' ? 'Healthy' : 'Unhealthy'}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {systemInfo?.hostname ?? 'Aurora Server'}
              </div>
            </div>
            
            {/* Server Uptime */}
            <div className="glass-card rounded-lg p-4 border border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-primary" />
                </div>
                <span className="text-xs text-muted-foreground">Server Uptime</span>
              </div>
              <div className="text-lg font-bold text-foreground">
                {statsOverview?.uptime_seconds 
                  ? `${Math.floor(statsOverview.uptime_seconds / 86400)}d ${Math.floor((statsOverview.uptime_seconds % 86400) / 3600)}h`
                  : systemInfo?.uptime_seconds 
                    ? `${Math.floor(systemInfo.uptime_seconds / 86400)}d ${Math.floor((systemInfo.uptime_seconds % 86400) / 3600)}h`
                    : typeof systemInfo?.uptime === 'object' && systemInfo?.uptime !== null
                      ? (systemInfo.uptime as { formatted?: string })?.formatted ?? "—"
                      : typeof systemInfo?.uptime === 'string' 
                        ? systemInfo.uptime 
                        : "—"}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {systemInfo?.ip_address ?? ""}
              </div>
            </div>
            
            {/* CPU Usage from Performance Stats */}
            <div className="glass-card rounded-lg p-4 border border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
                  <Cpu className="w-4 h-4 text-orange-400" />
                </div>
                <span className="text-xs text-muted-foreground">CPU Usage</span>
              </div>
              <div className="text-lg font-bold text-orange-400">
                {performanceStats?.cpu_percent !== undefined 
                  ? `${performanceStats.cpu_percent.toFixed(1)}%`
                  : "—"}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Processing load
              </div>
            </div>
            
            {/* Memory Usage */}
            <div className="glass-card rounded-lg p-4 border border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
                  <MemoryStick className="w-4 h-4 text-violet-400" />
                </div>
                <span className="text-xs text-muted-foreground">Memory</span>
              </div>
              <div className="text-lg font-bold text-violet-400">
                {performanceStats?.memory_percent !== undefined 
                  ? `${performanceStats.memory_percent.toFixed(1)}%`
                  : systemInfo?.memory?.percent !== undefined
                    ? `${systemInfo.memory.percent.toFixed(1)}%`
                    : "—"}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                RAM utilization
              </div>
            </div>
            
            {/* Disk Usage */}
            <div className="glass-card rounded-lg p-4 border border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                  <HardDrive className="w-4 h-4 text-cyan-400" />
                </div>
                <span className="text-xs text-muted-foreground">Disk</span>
              </div>
              <div className="text-lg font-bold text-cyan-400">
                {performanceStats?.disk_percent !== undefined 
                  ? `${performanceStats.disk_percent.toFixed(1)}%`
                  : systemInfo?.disk?.percent !== undefined
                    ? `${systemInfo.disk.percent.toFixed(1)}%`
                    : "—"}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Storage used
              </div>
            </div>
            
            {/* Requests/sec from Performance */}
            <div className="glass-card rounded-lg p-4 border border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-green-400" />
                </div>
                <span className="text-xs text-muted-foreground">Requests</span>
              </div>
              <div className="text-lg font-bold text-green-400">
                {performanceStats?.request_count_1h !== undefined 
                  ? performanceStats.request_count_1h.toLocaleString()
                  : "—"}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Last hour
              </div>
            </div>
          </div>
        )}
        <SystemMonitorCharts hours={periodHours} />
      </div>

      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Droplets className="w-5 h-5 text-blue-500" />
          Humidity Trends ({periodLabel})
        </h2>
        <HumidityCharts hours={periodHours} />
      </div>

      {/* Sensor Types Summary - Refactored Component */}
      <DashboardSensorSummary periodHours={periodHours} clientId={selectedClient} />

      {/* 24h Sensor Comparison */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          24-Hour Sensor Comparison
          {timeseriesLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Temperature */}
          <div className="glass-card rounded-xl p-4 border border-border/50">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                <Thermometer className="w-4 h-4 text-red-400" />
              </div>
              <span className="font-medium text-sm">Temperature</span>
              {tempStats.trend === 'up' && <TrendingUp className="w-4 h-4 text-success ml-auto" />}
              {tempStats.trend === 'down' && <TrendingDown className="w-4 h-4 text-destructive ml-auto" />}
              {tempStats.trend === 'stable' && <Minus className="w-4 h-4 text-muted-foreground ml-auto" />}
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <ArrowDown className="w-3 h-3 text-blue-400" /> Min
                </span>
                <span className="font-mono text-xs">{formatTempCompact(tempStats.min)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <ArrowUp className="w-3 h-3 text-red-400" /> Max
                </span>
                <span className="font-mono text-xs">{formatTempCompact(tempStats.max)}</span>
              </div>
              <div className="flex justify-between items-center border-t border-border/50 pt-2">
                <span className="text-xs text-muted-foreground">Avg</span>
                <span className="font-mono text-xs font-bold text-red-400">{formatTempCompact(tempStats.avg)}</span>
              </div>
            </div>
          </div>

          {/* Humidity */}
          <div className="glass-card rounded-xl p-4 border border-border/50">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Droplets className="w-4 h-4 text-blue-400" />
              </div>
              <span className="font-medium text-sm">Humidity</span>
              {humidityStats.trend === 'up' && <TrendingUp className="w-4 h-4 text-success ml-auto" />}
              {humidityStats.trend === 'down' && <TrendingDown className="w-4 h-4 text-destructive ml-auto" />}
              {humidityStats.trend === 'stable' && <Minus className="w-4 h-4 text-muted-foreground ml-auto" />}
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <ArrowDown className="w-3 h-3 text-blue-400" /> Min
                </span>
                <span className="font-mono text-sm">{humidityStats.min !== null ? `${humidityStats.min.toFixed(1)}%` : '—'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <ArrowUp className="w-3 h-3 text-red-400" /> Max
                </span>
                <span className="font-mono text-sm">{humidityStats.max !== null ? `${humidityStats.max.toFixed(1)}%` : '—'}</span>
              </div>
              <div className="flex justify-between items-center border-t border-border/50 pt-2">
                <span className="text-xs text-muted-foreground">Avg</span>
                <span className="font-mono text-sm font-bold text-blue-400">{humidityStats.avg !== null ? `${humidityStats.avg.toFixed(1)}%` : '—'}</span>
              </div>
            </div>
          </div>

          {/* Signal */}
          <div className="glass-card rounded-xl p-4 border border-border/50">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Signal className="w-4 h-4 text-purple-400" />
              </div>
              <span className="font-medium text-sm">Signal</span>
              {signalStats.trend === 'up' && <TrendingUp className="w-4 h-4 text-success ml-auto" />}
              {signalStats.trend === 'down' && <TrendingDown className="w-4 h-4 text-destructive ml-auto" />}
              {signalStats.trend === 'stable' && <Minus className="w-4 h-4 text-muted-foreground ml-auto" />}
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <ArrowDown className="w-3 h-3 text-blue-400" /> Min
                </span>
                <span className="font-mono text-sm">{signalStats.min !== null ? `${signalStats.min.toFixed(0)} dBm` : '—'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <ArrowUp className="w-3 h-3 text-red-400" /> Max
                </span>
                <span className="font-mono text-sm">{signalStats.max !== null ? `${signalStats.max.toFixed(0)} dBm` : '—'}</span>
              </div>
              <div className="flex justify-between items-center border-t border-border/50 pt-2">
                <span className="text-xs text-muted-foreground">Avg</span>
                <span className="font-mono text-sm font-bold text-purple-400">{signalStats.avg !== null ? `${signalStats.avg.toFixed(0)} dBm` : '—'}</span>
              </div>
            </div>
          </div>

          {/* Power */}
          <div className="glass-card rounded-xl p-4 border border-border/50">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
                <Zap className="w-4 h-4 text-orange-400" />
              </div>
              <span className="font-medium text-sm">Power</span>
              {powerStats.trend === 'up' && <TrendingUp className="w-4 h-4 text-success ml-auto" />}
              {powerStats.trend === 'down' && <TrendingDown className="w-4 h-4 text-destructive ml-auto" />}
              {powerStats.trend === 'stable' && <Minus className="w-4 h-4 text-muted-foreground ml-auto" />}
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <ArrowDown className="w-3 h-3 text-blue-400" /> Min
                </span>
                <span className="font-mono text-sm">{powerStats.min !== null ? `${powerStats.min.toFixed(1)}W` : '—'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <ArrowUp className="w-3 h-3 text-red-400" /> Max
                </span>
                <span className="font-mono text-sm">{powerStats.max !== null ? `${powerStats.max.toFixed(1)}W` : '—'}</span>
              </div>
              <div className="flex justify-between items-center border-t border-border/50 pt-2">
                <span className="text-xs text-muted-foreground">Avg</span>
                <span className="font-mono text-sm font-bold text-orange-400">{powerStats.avg !== null ? `${powerStats.avg.toFixed(1)}W` : '—'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Realtime Sensor Charts */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Sensor Trends (Realtime)
        </h2>
        <SensorCharts />
      </div>

      {/* ADS-B Air Traffic */}
      <AdsbSection hours={periodHours} />

      {/* LoRa Network */}
      <LoRaSection hours={periodHours} />

      {/* WiFi & Bluetooth */}
      <WifiBluetoothSection hours={periodHours} />

      {/* GPS Tracking */}
      <GpsSection hours={periodHours} />

      {/* Alerts */}
      <AlertsSection />

      {/* Data Batches */}
      <BatchesSection />

      {/* Devices to Adopt Section */}
      {pendingDevices.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-warning" />
            Devices to Adopt ({pendingDevices.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingDevices.slice(0, 6).map((device: Client) => (
              <div key={device.client_id} className="glass-card rounded-xl p-4 border border-warning/30 bg-warning/5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center">
                      <Server className="w-5 h-5 text-warning" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">{device.hostname || device.client_id.slice(0, 8)}</h3>
                      <p className="text-xs text-muted-foreground">{device.ip_address}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-warning/20 text-warning border-warning/30 text-xs">
                    Pending
                  </Badge>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last seen:</span>
                    <span>{formatLastSeen(device.last_seen)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Batches:</span>
                    <span>{device.batches_received}</span>
                  </div>
                  {device.sensors && device.sensors.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sensors:</span>
                      <span>{device.sensors.length} detected</span>
                    </div>
                  )}
                </div>
                <Button size="sm" className="w-full mt-3 gap-2 bg-warning/20 text-warning hover:bg-warning/30 border border-warning/30">
                  <CheckCircle className="w-4 h-4" />
                  Adopt Device
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Connected Devices */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Cpu className="w-5 h-5 text-primary" />
          Connected Devices ({adoptedDevices.length})
        </h2>
        {clientsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : adoptedDevices.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {adoptedDevices.slice(0, 6).map((client: Client) => {
              const status = getDeviceStatusFromLastSeen(client.last_seen);
              const system = client.metadata?.system;
              
              return (
                <div key={client.client_id} className="glass-card rounded-xl p-4 border border-border/50">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                        <Server className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm">{client.hostname || client.client_id.slice(0, 8)}</h3>
                        <p className="text-xs text-muted-foreground">{client.ip_address}</p>
                      </div>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${
                        status === 'online' 
                          ? 'bg-success/20 text-success border-success/30' 
                          : status === 'stale'
                          ? 'bg-warning/20 text-warning border-warning/30'
                          : 'bg-destructive/20 text-destructive border-destructive/30'
                      }`}
                    >
                      {status === 'online' ? <CheckCircle className="w-3 h-3 mr-1" /> : <AlertCircle className="w-3 h-3 mr-1" />}
                      {status}
                    </Badge>
                  </div>
                  
                  {/* Sensors */}
                  {client.sensors && client.sensors.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {client.sensors.slice(0, 5).map((sensorId) => (
                        <Badge key={sensorId} variant="outline" className="text-[10px] px-1.5 py-0">
                          {sensorId.includes('adsb') && <Plane className="w-2.5 h-2.5 mr-1" />}
                          {sensorId.includes('gps') && <Navigation className="w-2.5 h-2.5 mr-1" />}
                          {sensorId.includes('starlink') && <Satellite className="w-2.5 h-2.5 mr-1" />}
                          {sensorId.includes('lora') && <Radio className="w-2.5 h-2.5 mr-1" />}
                          {sensorId.includes('wifi') && <Wifi className="w-2.5 h-2.5 mr-1" />}
                          {sensorId.replace(/_/g, ' ').replace(/\d+$/, '').trim().slice(0, 10)}
                        </Badge>
                      ))}
                      {client.sensors.length > 5 && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          +{client.sensors.length - 5} more
                        </Badge>
                      )}
                    </div>
                  )}

                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Batches:</span>
                      <span>{(client.batches_received ?? 0).toLocaleString()}</span>
                    </div>
                    {system?.cpu_percent !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">CPU:</span>
                        <span>{system.cpu_percent.toFixed(1)}%</span>
                      </div>
                    )}
                    {system?.memory_percent !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Memory:</span>
                        <span>{system.memory_percent.toFixed(1)}%</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last seen:</span>
                      <span>{formatLastSeen(client.last_seen)}</span>
                    </div>
                  </div>
                  <a 
                    href={`/client/${client.client_id}`}
                    className="mt-3 w-full inline-flex items-center justify-center gap-2 text-xs px-3 py-2 rounded-md border border-border/50 hover:bg-primary/10 hover:border-primary/50 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Details
                  </a>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="glass-card rounded-xl p-8 text-center border border-border/50">
            <Server className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-muted-foreground">No adopted devices yet</p>
          </div>
        )}
      </div>

      {/* Device Activity - Refactored Component */}
      <DashboardDeviceActivity periodHours={periodHours} clientId={selectedClient} />

      {/* Maritime & RF Tracking */}
      <div className="mb-8">
        <MaritimeSection />
      </div>

      {/* Sensor Map Preview */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary" />
          Sensor Map (Live Locations)
        </h2>
        <div className="glass-card rounded-xl p-6 border border-border/50">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-muted-foreground">Showing:</span>
            <Badge variant="outline" className="border-green-500 text-green-500">🛰 GPS</Badge>
            <Badge variant="outline" className="border-cyan-500 text-cyan-500">✈ ADS-B</Badge>
            <Badge variant="outline" className="border-violet-500 text-violet-500">📡 Starlink</Badge>
            <Badge variant="outline" className="border-red-500 text-red-500">📻 LoRa</Badge>
          </div>
          <div 
            className="h-64 rounded-lg overflow-hidden relative bg-slate-900 flex items-center justify-center cursor-pointer group"
            style={{
              backgroundImage: 'url(https://a.basemaps.cartocdn.com/dark_all/8/75/96.png)',
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="text-center z-10">
              <MapPin className="w-12 h-12 text-primary mx-auto mb-2 opacity-80" />
              <p className="text-white/80 text-sm mb-3">View interactive sensor & aircraft map</p>
              <Badge className="bg-primary/90 text-primary-foreground gap-1">
                <ExternalLink className="w-3 h-3" />
                Open Full Map
              </Badge>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3 text-center">
            Click "Map" in the sidebar to view the full interactive map with real-time tracking
          </p>
        </div>
      </div>

      {/* Recent Alerts */}
      {alerts?.alerts && alerts.alerts.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="text-warning">⚠</span>
            Recent Alerts ({alerts.alerts.length})
          </h2>
          <div className="space-y-2">
            {alerts.alerts.slice(0, 5).map((alert) => (
              <div 
                key={alert.alert_id} 
                className="glass-card rounded-lg p-4 border border-border/50 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <Badge 
                    variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}
                    className="uppercase text-xs"
                  >
                    {alert.severity}
                  </Badge>
                  <span className="text-sm">{alert.message}</span>
                </div>
                <span className="text-xs text-muted-foreground">{alert.triggered_at}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardContent;
