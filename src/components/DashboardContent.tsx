import { useMemo, useState, Suspense, lazy } from "react";
import { 
  Thermometer, 
  Zap, 
  Loader2,
  Database,
  Satellite,
  Plane,
  Radio,
  Users,
  Gauge,
  Wifi,
  Activity,
  Signal,
  RefreshCw,
  HardDrive,
  TrendingUp,
  Clock,
  BarChart3
} from "lucide-react";
import ConnectionStatusIndicator from "./ConnectionStatusIndicator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";

// Lazy load heavy chart components
const HourlyClientTrendChart = lazy(() => import("./dashboard/HourlyClientTrendChart"));
const HourlyTrendChart = lazy(() => import("./dashboard/HourlyTrendChart"));
const SensorTypeStatsSection = lazy(() => import("./dashboard/SensorTypeStatsSection"));
const PowerHistoryChart = lazy(() => import("./dashboard/PowerHistoryChart"));
const StarlinkCharts = lazy(() => import("./StarlinkCharts"));

// Use dashboard-specific hooks that fetch from /api/dashboard/* and /api/stats/* endpoints
import { 
  useDashboardStats,
  useDashboardSensorStats,
  useDashboardClientStats,
  useAlertStats,
  usePowerSummary,
  useBluetoothStats,
  useWifiStats,
  useAdsbStats,
  useLoraGlobalStats,
} from "@/hooks/aurora";

// Chart loading fallback
const ChartSkeleton = ({ height = "h-[260px]" }: { height?: string }) => (
  <Card className="glass-card border-border/50">
    <CardHeader className="pb-2">
      <Skeleton className="h-5 w-40" />
    </CardHeader>
    <CardContent>
      <Skeleton className={`w-full ${height}`} />
    </CardContent>
  </Card>
);

// Primary stat card - large, prominent
const PrimaryStat = ({ 
  label, 
  value, 
  icon: Icon, 
  iconColor,
  subtitle,
  trend,
  isLoading 
}: { 
  label: string; 
  value: string | number; 
  icon: React.ElementType; 
  iconColor: string;
  subtitle?: string;
  trend?: string;
  isLoading?: boolean;
}) => (
  <div className="glass-card rounded-xl p-5 border border-border/50 hover:border-primary/30 transition-all hover:shadow-lg">
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">{label}</p>
        <p className="text-3xl font-bold text-foreground">
          {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : value}
        </p>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
            {trend && <TrendingUp className="w-3 h-3 text-emerald-400" />}
            {subtitle}
          </p>
        )}
      </div>
      <div className={`p-3 rounded-xl ${iconColor}`}>
        <Icon className="w-6 h-6" />
      </div>
    </div>
  </div>
);

// Secondary stat - compact row
const SecondaryStat = ({ 
  label, 
  value, 
  icon: Icon, 
  iconColor,
}: { 
  label: string; 
  value: string | number; 
  icon: React.ElementType; 
  iconColor: string;
}) => (
  <div className="flex items-center gap-3 p-3 rounded-lg bg-card/50 border border-border/30 hover:border-border/50 transition-colors">
    <div className={`p-2 rounded-lg ${iconColor}`}>
      <Icon className="w-4 h-4" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs text-muted-foreground truncate">{label}</p>
      <p className="text-lg font-semibold truncate">{value}</p>
    </div>
  </div>
);

// Device breakdown bar
const DeviceBar = ({ 
  name, 
  count, 
  maxCount,
  color
}: { 
  name: string; 
  count: number;
  maxCount: number;
  color: string;
}) => {
  const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground truncate">{name}</span>
        <span className="font-medium">{formatNumber(count)}</span>
      </div>
      <Progress value={percentage} className={`h-1.5 ${color}`} />
    </div>
  );
};

// Format large numbers
const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString();
};

// Format bytes
const formatBytes = (bytes: string): string => {
  return bytes; // Already formatted from API
};

const DashboardContent = () => {
  const periodHours = 24;
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // ===== DASHBOARD STATS FROM API =====
  // Primary dashboard stats from /api/stats/global - contains device_breakdown, readings_by_day, storage
  const { data: dashboardStats, isLoading: dashboardStatsLoading, refetch: refetchDashboardStats } = useDashboardStats();
  
  // Sensor stats from /api/dashboard/sensor-stats - contains per-sensor type breakdown
  const { data: sensorStats, isLoading: sensorStatsLoading } = useDashboardSensorStats();
  
  // Client stats from /api/stats/by-client
  const { data: clientStats, isLoading: clientStatsLoading } = useDashboardClientStats(undefined, periodHours);
  
  // Secondary stats - for quick metrics
  const { data: alertStats } = useAlertStats();
  const { data: powerSummary } = usePowerSummary();
  const { data: wifiStats } = useWifiStats();
  const { data: bluetoothStats } = useBluetoothStats();
  const { data: adsbStats } = useAdsbStats();
  const { data: loraStats } = useLoraGlobalStats();

  // ===== DERIVED METRICS FROM DASHBOARD API =====
  const totalReadings = dashboardStats?.total_readings ?? sensorStats?.readings_last_24h ?? 0;
  const totalBatches = (dashboardStats as Record<string, unknown>)?.total_batches as number ?? 0;
  const totalClients = dashboardStats?.total_clients ?? clientStats?.clients?.length ?? sensorStats?.total_clients ?? 0;
  const totalDevices = dashboardStats?.total_devices ?? sensorStats?.total_devices ?? 0;
  const sensorTypesCount = dashboardStats?.total_sensors ?? sensorStats?.total_sensors ?? 0;
  const activeClients24h = (dashboardStats as Record<string, unknown>)?.active_clients_24h as number ?? totalClients;

  // Device breakdown from /api/stats/global
  const deviceBreakdown = useMemo(() => {
    const breakdown = (dashboardStats as Record<string, unknown>)?.device_breakdown as Array<{ device_type: string; count: number }> | undefined;
    if (!breakdown || !Array.isArray(breakdown)) return [];
    return breakdown.sort((a, b) => b.count - a.count).slice(0, 6);
  }, [dashboardStats]);

  const maxDeviceCount = deviceBreakdown.length > 0 ? deviceBreakdown[0].count : 0;

  // Readings by day from /api/stats/global
  const readingsByDay = useMemo(() => {
    const data = (dashboardStats as Record<string, unknown>)?.readings_by_day as Array<{ date: string; count: number }> | undefined;
    if (!data || !Array.isArray(data)) return [];
    return data.slice(0, 7);
  }, [dashboardStats]);

  const todayReadings = readingsByDay.length > 0 ? readingsByDay[0].count : 0;
  const yesterdayReadings = readingsByDay.length > 1 ? readingsByDay[1].count : 0;
  const readingsTrend = yesterdayReadings > 0 
    ? ((todayReadings - yesterdayReadings) / yesterdayReadings * 100).toFixed(0) 
    : '0';

  // Storage info from /api/stats/global
  const storage = (dashboardStats as Record<string, unknown>)?.storage as { readings_size?: string; batches_size?: string; total_db_size?: string } | undefined;

  // Sensor types from /api/dashboard/sensor-stats
  const sensorItems = sensorStats?.sensorItems ?? [];
  const topSensorTypes = sensorItems.slice(0, 5);

  // Secondary metrics
  const currentPower = powerSummary?.total_power_watts ?? powerSummary?.avg_power_watts;
  const wifiNetworks = wifiStats?.unique_networks_24h ?? wifiStats?.total_networks_discovered ?? 0;
  const btDevices = bluetoothStats?.unique_devices_24h ?? bluetoothStats?.total_devices_discovered ?? 0;
  const aircraftCount = adsbStats?.aircraft_active ?? adsbStats?.aircraft_tracked_total ?? 0;
  const loraDevices = loraStats?.total_devices ?? loraStats?.active_devices ?? 0;
  const activeAlerts = alertStats?.active ?? 0;

  const isLoading = dashboardStatsLoading || sensorStatsLoading || clientStatsLoading;

  // Refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetchDashboardStats();
    setIsRefreshing(false);
  };

  // Colors for device breakdown bars
  const barColors = [
    'bg-cyan-500',
    'bg-emerald-500', 
    'bg-violet-500',
    'bg-amber-500',
    'bg-rose-500',
    'bg-blue-500'
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">AURORASENSE</h1>
          <ConnectionStatusIndicator />
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* ===== PRIMARY STATS ROW - From /api/stats/global ===== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <PrimaryStat
          label="Total Readings"
          value={formatNumber(totalReadings)}
          icon={Database}
          iconColor="bg-cyan-500/20 text-cyan-400"
          subtitle={`${formatNumber(todayReadings)} today`}
          trend={parseInt(readingsTrend) > 0 ? `+${readingsTrend}%` : undefined}
          isLoading={dashboardStatsLoading}
        />
        <PrimaryStat
          label="Connected Clients"
          value={totalClients}
          icon={Users}
          iconColor="bg-emerald-500/20 text-emerald-400"
          subtitle={`${activeClients24h} active (24h)`}
          isLoading={clientStatsLoading}
        />
        <PrimaryStat
          label="Devices"
          value={totalDevices}
          icon={HardDrive}
          iconColor="bg-violet-500/20 text-violet-400"
          subtitle={`${sensorTypesCount} sensor types`}
          isLoading={dashboardStatsLoading}
        />
        <PrimaryStat
          label="Data Batches"
          value={formatNumber(totalBatches)}
          icon={BarChart3}
          iconColor="bg-amber-500/20 text-amber-400"
          subtitle={storage?.total_db_size ? `DB: ${storage.total_db_size}` : undefined}
          isLoading={dashboardStatsLoading}
        />
      </div>

      {/* ===== BREAKDOWN CARDS ROW ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Device Breakdown - From /api/stats/global device_breakdown */}
        <Card className="glass-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Radio className="w-4 h-4 text-violet-400" />
              Device Activity Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {deviceBreakdown.length > 0 ? (
              deviceBreakdown.map((device, idx) => (
                <DeviceBar 
                  key={device.device_type}
                  name={device.device_type.replace(/_/g, ' ')}
                  count={device.count}
                  maxCount={maxDeviceCount}
                  color={barColors[idx % barColors.length]}
                />
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No device data available</p>
            )}
          </CardContent>
        </Card>

        {/* Sensor Types - From /api/dashboard/sensor-stats */}
        <Card className="glass-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Gauge className="w-4 h-4 text-cyan-400" />
              Top Sensor Types (7 days)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topSensorTypes.length > 0 ? (
              topSensorTypes.map((sensor, idx) => (
                <DeviceBar 
                  key={sensor.sensor_type}
                  name={sensor.sensor_type.replace(/_/g, ' ')}
                  count={sensor.reading_count}
                  maxCount={topSensorTypes[0]?.reading_count ?? 0}
                  color={barColors[idx % barColors.length]}
                />
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No sensor data available</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ===== SECONDARY METRICS ROW ===== */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <SecondaryStat
          label="Power"
          value={currentPower ? `${currentPower.toFixed(0)}W` : '--'}
          icon={Zap}
          iconColor="bg-yellow-500/20 text-yellow-400"
        />
        <SecondaryStat
          label="WiFi Networks"
          value={formatNumber(wifiNetworks)}
          icon={Wifi}
          iconColor="bg-blue-500/20 text-blue-400"
        />
        <SecondaryStat
          label="BT Devices"
          value={formatNumber(btDevices)}
          icon={Signal}
          iconColor="bg-purple-500/20 text-purple-400"
        />
        <SecondaryStat
          label="Aircraft"
          value={aircraftCount}
          icon={Plane}
          iconColor="bg-sky-500/20 text-sky-400"
        />
        <SecondaryStat
          label="LoRa"
          value={loraDevices}
          icon={Activity}
          iconColor="bg-green-500/20 text-green-400"
        />
        <SecondaryStat
          label="Alerts"
          value={activeAlerts}
          icon={Thermometer}
          iconColor={activeAlerts > 0 ? "bg-red-500/20 text-red-400" : "bg-muted/50 text-muted-foreground"}
        />
      </div>

      {/* ===== CHARTS SECTION - LAZY LOADED ===== */}
      <div className="space-y-6">
        {/* Hourly Client Readings */}
        <Suspense fallback={<ChartSkeleton />}>
          <HourlyClientTrendChart />
        </Suspense>

        {/* Hourly Sensor Type Readings */}
        <Suspense fallback={<ChartSkeleton />}>
          <HourlyTrendChart />
        </Suspense>

        {/* Sensor Type Distribution */}
        <Suspense fallback={<ChartSkeleton height="h-[300px]" />}>
          <SensorTypeStatsSection periodHours={periodHours} />
        </Suspense>

        {/* Power History */}
        <Suspense fallback={<ChartSkeleton />}>
          <PowerHistoryChart hours={periodHours} />
        </Suspense>

        {/* Starlink Overview */}
        <Card className="glass-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Satellite className="w-5 h-5 text-violet-500" />
              Starlink Connectivity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<Skeleton className="w-full h-[200px]" />}>
              <StarlinkCharts hours={periodHours} />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardContent;
