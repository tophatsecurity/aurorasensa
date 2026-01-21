import { useMemo, useState, Suspense, lazy } from "react";
import { 
  Zap, 
  Loader2,
  Database,
  Satellite,
  Radio,
  Users,
  Gauge,
  Wifi,
  Activity,
  RefreshCw,
  HardDrive,
  TrendingUp,
  BarChart3,
  Server,
  Cpu,
  ThermometerSun
} from "lucide-react";
import ConnectionStatusIndicator from "./ConnectionStatusIndicator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  ResponsiveContainer, 
  Tooltip,
  Cell,
  LineChart,
  Line,
  CartesianGrid
} from 'recharts';

// Lazy load heavy chart components  
const HourlyTrendChart = lazy(() => import("./dashboard/HourlyTrendChart"));
const SensorTypeStatsSection = lazy(() => import("./dashboard/SensorTypeStatsSection"));

// Use dashboard-specific hooks that fetch from /api/dashboard/* and /api/stats/* endpoints
import { 
  useDashboardStats,
  useDashboardSensorStats,
  useDashboardClientStats,
  useLoraGlobalStats,
  useStarlinkReadings,
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

// Starlink reading type from hook
interface StarlinkReadingData {
  timestamp: string;
  signal_dbm?: number;
  power_w?: number;
  snr?: number;
  downlink_throughput_bps?: number;
  uplink_throughput_bps?: number;
  pop_ping_latency_ms?: number;
}

// Parse Starlink data from readings (using the StarlinkReading type from hook)
const parseStarlinkData = (readings: StarlinkReadingData[] | undefined) => {
  if (!readings || readings.length === 0) return null;
  
  const latest = readings[0];
  if (!latest) return null;
  
  return {
    state: 'CONNECTED', // Inferred from having readings
    powerWatts: latest.power_w,
    latencyMs: latest.pop_ping_latency_ms,
    downlinkBps: latest.downlink_throughput_bps,
    uplinkBps: latest.uplink_throughput_bps,
    signalDbm: latest.signal_dbm,
    snr: latest.snr,
  };
};

// Parse Starlink timeseries from readings
const parseStarlinkTimeseries = (readings: StarlinkReadingData[] | undefined) => {
  if (!readings || readings.length === 0) return [];
  
  return readings.slice(0, 24).reverse().map((r, idx) => ({
    time: new Date(r.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    power: r.power_w ?? 0,
    latency: r.pop_ping_latency_ms ?? 0,
  }));
};

const DashboardContent = () => {
  const periodHours = 24;
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // ===== DASHBOARD STATS FROM API =====
  const { data: dashboardStats, isLoading: dashboardStatsLoading, refetch: refetchDashboardStats } = useDashboardStats();
  const { data: sensorStats, isLoading: sensorStatsLoading } = useDashboardSensorStats();
  const { data: clientStats, isLoading: clientStatsLoading } = useDashboardClientStats(undefined, periodHours);
  const { data: loraStats } = useLoraGlobalStats();
  const { data: starlinkReadings } = useStarlinkReadings(periodHours);

  // ===== DERIVED METRICS FROM DASHBOARD API =====
  const totalReadings = dashboardStats?.total_readings ?? sensorStats?.readings_last_24h ?? 0;
  const totalBatches = (dashboardStats as Record<string, unknown>)?.total_batches as number ?? 0;
  const totalClients = dashboardStats?.total_clients ?? clientStats?.clients?.length ?? sensorStats?.total_clients ?? 0;
  const totalDevices = dashboardStats?.total_devices ?? sensorStats?.total_devices ?? 0;
  const sensorTypesCount = dashboardStats?.total_sensors ?? sensorStats?.total_sensors ?? 0;
  const activeClients24h = (dashboardStats as Record<string, unknown>)?.active_clients_24h as number ?? totalClients;
  
  // Total measurements from device breakdown (sum of all sensor type readings)
  const totalMeasurements = useMemo(() => {
    const breakdown = (dashboardStats as Record<string, unknown>)?.device_breakdown as Array<{ device_type: string; count: number }> | undefined;
    if (breakdown && Array.isArray(breakdown)) {
      return breakdown.reduce((sum, d) => sum + (d.count || 0), 0);
    }
    // Fallback to total readings
    return totalReadings;
  }, [dashboardStats, totalReadings]);

  // Device breakdown from /api/stats/global
  const deviceBreakdown = useMemo(() => {
    const breakdown = (dashboardStats as Record<string, unknown>)?.device_breakdown as Array<{ device_type: string; count: number }> | undefined;
    if (!breakdown || !Array.isArray(breakdown)) return [];
    return breakdown.sort((a, b) => b.count - a.count).slice(0, 6);
  }, [dashboardStats]);

  const maxDeviceCount = deviceBreakdown.length > 0 ? deviceBreakdown[0].count : 0;

  // Readings by day from /api/stats/global - for chart
  const readingsByDay = useMemo(() => {
    const data = (dashboardStats as Record<string, unknown>)?.readings_by_day as Array<{ date: string; count: number }> | undefined;
    if (!data || !Array.isArray(data)) return [];
    return data.slice(0, 7).reverse().map(d => ({
      date: new Date(d.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      shortDate: new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' }),
      count: d.count,
    }));
  }, [dashboardStats]);

  const todayReadings = readingsByDay.length > 0 ? readingsByDay[readingsByDay.length - 1].count : 0;
  const yesterdayReadings = readingsByDay.length > 1 ? readingsByDay[readingsByDay.length - 2].count : 0;
  const readingsTrend = yesterdayReadings > 0 
    ? ((todayReadings - yesterdayReadings) / yesterdayReadings * 100).toFixed(0) 
    : '0';

  // Storage info from /api/stats/global
  const storage = (dashboardStats as Record<string, unknown>)?.storage as { readings_size?: string; batches_size?: string; total_db_size?: string } | undefined;

  // Sensor types from /api/dashboard/sensor-stats
  const sensorItems = sensorStats?.sensorItems ?? [];
  const topSensorTypes = sensorItems.slice(0, 5);

  // Starlink metrics from /api/readings/sensor/starlink
  const starlinkData = useMemo(() => 
    parseStarlinkData(starlinkReadings?.readings), 
    [starlinkReadings]
  );
  
  const starlinkTimeseries = useMemo(() => 
    parseStarlinkTimeseries(starlinkReadings?.readings), 
    [starlinkReadings]
  );

  // LoRa from /api/lora/stats/global
  const loraDevicesCount = loraStats?.total_devices ?? 0;
  const loraDetections = loraStats?.total_detections ?? 0;

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

  // Chart colors
  const chartColors = ['#06b6d4', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#3b82f6'];

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

      {/* ===== PRIMARY STATS ROW ===== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
      </div>

      {/* ===== SENSOR TYPES SECTION ===== */}
      {topSensorTypes.length > 0 && (
        <div className="mb-6">
          <Card className="glass-card border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Gauge className="w-4 h-4 text-cyan-400" />
                Top Sensor Types (7 days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {topSensorTypes.map((sensor, idx) => (
                  <DeviceBar 
                    key={sensor.sensor_type}
                    name={sensor.sensor_type.replace(/_/g, ' ')}
                    count={sensor.reading_count}
                    maxCount={topSensorTypes[0]?.reading_count ?? 0}
                    color={barColors[idx % barColors.length]}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ===== CHARTS SECTION - LAZY LOADED ===== */}
      <div className="space-y-6">
        {/* Hourly Sensor Type Readings */}
        <Suspense fallback={<ChartSkeleton />}>
          <HourlyTrendChart />
        </Suspense>

        {/* Sensor Type Distribution */}
        <Suspense fallback={<ChartSkeleton height="h-[300px]" />}>
          <SensorTypeStatsSection periodHours={periodHours} />
        </Suspense>
      </div>
    </div>
  );
};

export default DashboardContent;
