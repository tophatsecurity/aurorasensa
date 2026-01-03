import { useMemo, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Minus
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import SensorCard from "./SensorCard";
import StatCardWithChart from "./StatCardWithChart";
import SensorCharts from "./SensorCharts";
import StarlinkCharts from "./StarlinkCharts";
import ThermalProbeCharts from "./ThermalProbeCharts";
import ThermalProbeDeviceChart from "./ThermalProbeDeviceChart";
import HumidityCharts from "./HumidityCharts";
import PowerConsumptionCharts from "./PowerConsumptionCharts";
import SystemMonitorCharts from "./SystemMonitorCharts";
import { 
  useComprehensiveStats, 
  useAlerts, 
  useClients, 
  useDashboardStats, 
  useDashboardTimeseries, 
  useSensorTypeStats,
  useStarlinkTimeseries,
  useThermalProbeTimeseries,
  useSystemInfo,
  Client 
} from "@/hooks/useAuroraApi";
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
  const { data: stats, isLoading: statsLoading } = useComprehensiveStats();
  const { data: dashboardStats, isLoading: dashboardStatsLoading } = useDashboardStats();
  const { data: timeseries, isLoading: timeseriesLoading } = useDashboardTimeseries(24);
  const { data: alerts } = useAlerts();
  const { data: clients, isLoading: clientsLoading } = useClients();
  
  // Sensor type specific stats - these contain numeric_field_stats_24h with real data
  const { data: thermalProbeStats, isLoading: thermalLoading } = useSensorTypeStats("thermal_probe");
  const { data: starlinkStats, isLoading: starlinkLoading } = useSensorTypeStats("starlink");
  const { data: ahtStats } = useSensorTypeStats("aht_sensor");
  const { data: bmtStats } = useSensorTypeStats("bmt_sensor");
  const { data: systemMonitorStats, isLoading: systemMonitorLoading } = useSensorTypeStats("system_monitor");
  
  // System info from API
  const { data: systemInfo, isLoading: systemInfoLoading } = useSystemInfo();
  
  // Real timeseries data for sparklines
  const { data: starlinkTimeseries, isLoading: starlinkTimeseriesLoading } = useStarlinkTimeseries(24);
  const { data: thermalTimeseries, isLoading: thermalTimeseriesLoading } = useThermalProbeTimeseries(24);

  // Extract key metrics from comprehensive stats
  const global = stats?.global;
  const devicesSummary = stats?.devices_summary;
  const sensorsSummary = stats?.sensors_summary;

  const totalReadings = global?.database?.total_readings ?? 0;
  // Filter out deleted/disabled/suspended clients for dashboard display
  const activeClients = clients?.filter((c: Client) => 
    !['deleted', 'disabled', 'suspended'].includes(c.state || '')
  ) || [];
  const totalClients = activeClients.length;
  const activeDevices1h = global?.activity?.last_1_hour?.active_devices_1h ?? 0;
  const readings1h = global?.activity?.last_1_hour?.readings_1h ?? 0;
  const totalSensorTypes = sensorsSummary?.total_sensor_types ?? 0;
  const totalDevices = devicesSummary?.total_devices ?? 0;
  const activeAlerts = global?.database?.active_alerts ?? 0;

  // Extract real sensor data from numeric_field_stats_24h
  const thermalFieldStats = thermalProbeStats?.numeric_field_stats_24h;
  const starlinkFieldStats = starlinkStats?.numeric_field_stats_24h;
  const bmtFieldStats = bmtStats?.numeric_field_stats_24h;
  const ahtFieldStats = ahtStats?.numeric_field_stats_24h;
  
  // Thermal probe temperature from real API data
  const thermalAvgTemp = thermalFieldStats?.temperature_c?.avg ?? thermalFieldStats?.temp_c?.avg;
  const thermalMinTemp = thermalFieldStats?.temperature_c?.min ?? thermalFieldStats?.temp_c?.min;
  const thermalMaxTemp = thermalFieldStats?.temperature_c?.max ?? thermalFieldStats?.temp_c?.max;
  
  // Starlink metrics from real API data
  const starlinkPower = starlinkFieldStats?.power_watts?.avg ?? starlinkFieldStats?.power_w?.avg;
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

  // Sensor averages - use sensor-specific stats
  const avgTemp = dashboardStats?.avg_temp_c ?? thermalAvgTemp ?? bmtTemp?.avg ?? ahtTemp?.avg;
  const avgHumidity = dashboardStats?.avg_humidity ?? bmtHumidity?.avg ?? ahtHumidity?.avg;
  const avgSignal = dashboardStats?.avg_signal_dbm;
  const avgPower = dashboardStats?.avg_power_w ?? starlinkPower;

  // 24h sensor statistics - use API stats instead of timeseries
  const tempStats = useMemo((): SensorStats => {
    // Try thermal probe first, then BMT, then AHT
    const stats = thermalFieldStats?.temp_c ?? thermalFieldStats?.temperature_c ?? bmtTemp ?? ahtTemp;
    if (!stats) return { min: null, max: null, avg: null, current: null, trend: 'stable' };
    return {
      min: stats.min ?? null,
      max: stats.max ?? null,
      avg: stats.avg ?? null,
      current: stats.avg ?? null,
      trend: 'stable'
    };
  }, [thermalFieldStats, bmtTemp, ahtTemp]);

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
    const stats = starlinkFieldStats?.power_watts;
    if (!stats) return { min: null, max: null, avg: null, current: null, trend: 'stable' };
    return {
      min: stats.min ?? null,
      max: stats.max ?? null,
      avg: stats.avg ?? null,
      current: stats.avg ?? null,
      trend: 'stable'
    };
  }, [starlinkFieldStats]);

  // Devices pending adoption (auto-registered but not manually adopted)
  const pendingDevices = clients?.filter((c: Client) => c.auto_registered && !c.adopted_at) || [];
  const adoptedDevices = clients?.filter((c: Client) => c.adopted_at) || [];
  
  // Time period state for stats tabs
  const [timePeriod, setTimePeriod] = useState<'hourly' | 'daily' | 'monthly'>('hourly');
  
  return (
    <div className="flex-1 overflow-y-auto p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold text-foreground">AURORASENSE Server</h1>
          <Badge className="bg-success/20 text-success border-success/30 px-3 py-1">
            LIVE
          </Badge>
        </div>
        <Tabs value={timePeriod} onValueChange={(v) => setTimePeriod(v as 'hourly' | 'daily' | 'monthly')}>
          <TabsList className="bg-muted/50">
            <TabsTrigger value="hourly" className="text-xs">Hourly</TabsTrigger>
            <TabsTrigger value="daily" className="text-xs">Daily</TabsTrigger>
            <TabsTrigger value="monthly" className="text-xs">Monthly</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Top Stats with Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatCardWithChart
          title="CONNECTED CLIENTS"
          value={clientsLoading ? "..." : totalClients.toString()}
          subtitle={`${activeDevices1h} devices active in last hour`}
          icon={Server}
          iconBgColor="bg-green-500/20"
          isLoading={clientsLoading}
          devices={activeClients.map((c, idx) => ({
            device_id: c.hostname || c.client_id,
            device_type: 'client',
            color: ['#22c55e', '#3b82f6', '#f59e0b', '#ec4899'][idx % 4],
            reading_count: c.batches_received * 50,
            status: c.status || 'active'
          }))}
        />
        <StatCardWithChart
          title="TOTAL READINGS"
          value={statsLoading ? "..." : totalReadings.toLocaleString()}
          subtitle={`${readings1h.toLocaleString()} last hour`}
          icon={Database}
          iconBgColor="bg-blue-500/20"
          isLoading={statsLoading}
          devices={(sensorsSummary?.sensor_types || []).slice(0, 6).map((s, idx) => ({
            device_id: s.device_type,
            device_type: s.device_type,
            color: ['#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'][idx % 6],
            reading_count: s.total_readings,
            status: s.active_last_hour ? 'active' : 'inactive'
          }))}
        />
        <StatCardWithChart
          title="SENSOR TYPES"
          value={statsLoading ? "..." : totalSensorTypes.toString()}
          subtitle={`${totalDevices} unique devices`}
          icon={Radio}
          iconBgColor="bg-purple-500/20"
          isLoading={statsLoading}
          devices={(devicesSummary?.devices || []).slice(0, 6).map((d, idx) => ({
            device_id: d.device_id,
            device_type: d.device_type,
            color: ['#8b5cf6', '#06b6d4', '#ef4444', '#84cc16', '#f59e0b', '#ec4899'][idx % 6],
            reading_count: d.total_readings,
            status: d.status
          }))}
        />
      </div>

      {/* Power Consumption */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-orange-500" />
          Power Consumption (24h)
        </h2>
        <PowerConsumptionCharts />
      </div>

      {/* Thermal - All Temperature Sources */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Thermometer className="w-5 h-5 text-red-500" />
          Thermal (°F / °C)
        </h2>
        <ThermalProbeDeviceChart />
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
            value={starlinkPower !== undefined ? starlinkPower.toFixed(0) : "—"}
            unit=" W"
            subtitle={starlinkObstruction !== undefined 
              ? `Obstruction: ${starlinkObstruction.toFixed(1)}%`
              : `${starlinkStats?.count ?? 0} readings`}
            icon={Zap}
            iconBgColor="bg-orange-500/20"
            isLoading={starlinkLoading || starlinkTimeseriesLoading}
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
        <StarlinkCharts />
      </div>

      {/* System Monitor - Local System Stats */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Cpu className="w-5 h-5 text-cyan-500" />
          System Monitor
        </h2>
        {(systemMonitorLoading || systemInfoLoading) ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* CPU Usage */}
            <div className="glass-card rounded-lg p-4 border border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                  <Cpu className="w-4 h-4 text-cyan-400" />
                </div>
                <span className="text-xs text-muted-foreground">CPU</span>
              </div>
              <div className="text-2xl font-bold text-foreground">
                {systemMonitorStats?.numeric_field_stats_24h?.cpu_percent?.avg?.toFixed(1) ?? 
                 systemInfo?.cpu_load?.[0]?.toFixed(1) ?? "—"}%
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {systemMonitorStats?.numeric_field_stats_24h?.cpu_percent?.max !== undefined 
                  ? `Max: ${systemMonitorStats.numeric_field_stats_24h.cpu_percent.max.toFixed(1)}%`
                  : "24h avg"}
              </div>
            </div>

            {/* Memory Usage */}
            <div className="glass-card rounded-lg p-4 border border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <MemoryStick className="w-4 h-4 text-purple-400" />
                </div>
                <span className="text-xs text-muted-foreground">Memory</span>
              </div>
              <div className="text-2xl font-bold text-foreground">
                {systemMonitorStats?.numeric_field_stats_24h?.memory_percent?.avg?.toFixed(1) ?? 
                 systemInfo?.memory?.percent?.toFixed(1) ?? "—"}%
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {systemInfo?.memory?.total 
                  ? `${(systemInfo.memory.used / 1024 / 1024 / 1024).toFixed(1)}/${(systemInfo.memory.total / 1024 / 1024 / 1024).toFixed(1)} GB`
                  : "24h avg"}
              </div>
            </div>

            {/* Disk Usage */}
            <div className="glass-card rounded-lg p-4 border border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
                  <HardDrive className="w-4 h-4 text-orange-400" />
                </div>
                <span className="text-xs text-muted-foreground">Disk</span>
              </div>
              <div className="text-2xl font-bold text-foreground">
                {systemMonitorStats?.numeric_field_stats_24h?.disk_percent?.avg?.toFixed(1) ?? 
                 systemInfo?.disk?.percent?.toFixed(1) ?? "—"}%
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {systemInfo?.disk?.total 
                  ? `${(systemInfo.disk.used / 1024 / 1024 / 1024).toFixed(1)}/${(systemInfo.disk.total / 1024 / 1024 / 1024).toFixed(1)} GB`
                  : "24h avg"}
              </div>
            </div>

            {/* CPU Temp */}
            <div className="glass-card rounded-lg p-4 border border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                  <Thermometer className="w-4 h-4 text-red-400" />
                </div>
                <span className="text-xs text-muted-foreground">CPU Temp</span>
              </div>
              <div className="text-2xl font-bold text-foreground">
                {systemMonitorStats?.numeric_field_stats_24h?.cpu_temp_c?.avg?.toFixed(1) ?? "—"}°C
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {systemMonitorStats?.numeric_field_stats_24h?.cpu_temp_c?.max !== undefined 
                  ? `Max: ${systemMonitorStats.numeric_field_stats_24h.cpu_temp_c.max.toFixed(1)}°C`
                  : "24h avg"}
              </div>
            </div>

            {/* Voltage */}
            <div className="glass-card rounded-lg p-4 border border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-yellow-400" />
                </div>
                <span className="text-xs text-muted-foreground">Voltage</span>
              </div>
              <div className="text-2xl font-bold text-foreground">
                {systemMonitorStats?.numeric_field_stats_24h?.voltage?.avg?.toFixed(2) ?? "—"}V
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {systemMonitorStats?.numeric_field_stats_24h?.voltage?.min !== undefined 
                  ? `Min: ${systemMonitorStats.numeric_field_stats_24h.voltage.min.toFixed(2)}V`
                  : "24h avg"}
              </div>
            </div>

            {/* Uptime */}
            <div className="glass-card rounded-lg p-4 border border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-green-400" />
                </div>
                <span className="text-xs text-muted-foreground">Uptime</span>
              </div>
              <div className="text-2xl font-bold text-foreground">
                {systemInfo?.uptime_seconds 
                  ? `${Math.floor(systemInfo.uptime_seconds / 86400)}d`
                  : typeof systemInfo?.uptime === 'object' && systemInfo?.uptime !== null
                    ? (systemInfo.uptime as { formatted?: string })?.formatted ?? "—"
                    : typeof systemInfo?.uptime === 'string' 
                      ? systemInfo.uptime 
                      : "—"}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {systemInfo?.hostname ?? "Server"}
              </div>
            </div>
          </div>
        )}
        <SystemMonitorCharts />
      </div>

      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Droplets className="w-5 h-5 text-blue-500" />
          Humidity Trends (24h)
        </h2>
        <HumidityCharts />
      </div>

      {/* Sensor Types Summary */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Radio className="w-5 h-5 text-primary" />
          Active Sensor Types ({sensorsSummary?.total_sensor_types ?? 0})
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {sensorsSummary?.sensor_types?.slice(0, 6).map((sensor) => (
            <div 
              key={sensor.device_type}
              className="glass-card rounded-lg p-3 border border-border/50 hover:border-primary/30 transition-colors"
            >
              <div className="text-xs text-muted-foreground capitalize truncate">
                {sensor.device_type.replace(/_/g, ' ')}
              </div>
              <div className="text-lg font-bold text-foreground">
                {sensor.device_count}
              </div>
              <div className="text-xs text-muted-foreground">
                {sensor.total_readings.toLocaleString()} readings
              </div>
              {sensor.active_last_hour && (
                <Badge variant="outline" className="mt-1 text-[10px] px-1.5 py-0 bg-success/10 text-success border-success/30">
                  Active
                </Badge>
              )}
            </div>
          ))}
        </div>
      </div>

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

      {/* GPS Position & Device Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        <SensorCard
          title="DATA TIME RANGE"
          icon={Clock}
          iconBgColor="bg-green-500/20"
          className="min-h-[200px]"
        >
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Data Span:</span>
              <span className="font-medium">{global?.time_ranges?.data_span_days?.toFixed(1) ?? "—"} days</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Earliest Reading:</span>
              <span className="font-medium text-xs">
                {formatDate(global?.time_ranges?.earliest_reading)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Latest Reading:</span>
              <span className="font-medium text-xs">
                {formatDateTime(global?.time_ranges?.latest_reading)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Active Alerts:</span>
              <span className="font-medium">{activeAlerts}</span>
            </div>
          </div>
        </SensorCard>

        {/* Device Activity */}
        <SensorCard
          title="DEVICE ACTIVITY"
          icon={Activity}
          iconBgColor="bg-cyan-500/20"
          className="min-h-[200px]"
        >
          {statsLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Active (1h):</span>
                <span className="font-medium text-success">{activeDevices1h} devices</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Active (24h):</span>
                <span className="font-medium">{global?.activity?.last_24_hours?.active_devices_24h ?? "—"} devices</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Readings (24h):</span>
                <span className="font-medium">{global?.activity?.last_24_hours?.readings_24h?.toLocaleString() ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Avg/Hour:</span>
                <span className="font-medium">{global?.activity?.avg_readings_per_hour?.toFixed(1) ?? "—"}</span>
              </div>
            </div>
          )}
        </SensorCard>
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
      {alerts && alerts.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="text-warning">⚠</span>
            Recent Alerts ({alerts.length})
          </h2>
          <div className="space-y-2">
            {alerts.slice(0, 5).map((alert) => (
              <div 
                key={alert.id} 
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
                <span className="text-xs text-muted-foreground">{alert.timestamp}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardContent;
