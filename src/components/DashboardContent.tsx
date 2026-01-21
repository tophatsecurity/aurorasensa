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
  RefreshCw
} from "lucide-react";
import ConnectionStatusIndicator from "./ConnectionStatusIndicator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

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

// Quick stat card - minimal, fast rendering
const QuickStat = ({ 
  label, 
  value, 
  icon: Icon, 
  color, 
  subtitle,
  isLoading 
}: { 
  label: string; 
  value: string | number; 
  icon: React.ElementType; 
  color: string;
  subtitle?: string;
  isLoading?: boolean;
}) => (
  <div className="glass-card rounded-xl p-4 border border-border/50 hover:border-primary/20 transition-colors">
    <div className="flex items-center gap-3">
      <div className={`p-2.5 rounded-lg ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-foreground truncate">
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : value}
        </p>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
    </div>
  </div>
);

// Compact metric card for secondary stats
const MetricCard = ({ 
  label, 
  value, 
  icon: Icon, 
  color,
  trend
}: { 
  label: string; 
  value: string | number; 
  icon: React.ElementType; 
  color: string;
  trend?: 'up' | 'down' | 'stable';
}) => (
  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/30">
    <div className={`p-2 rounded-lg ${color}`}>
      <Icon className="w-4 h-4" />
    </div>
    <div className="flex-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  </div>
);

// Format large numbers
const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString();
};

const DashboardContent = () => {
  const periodHours = 24;
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // ===== DASHBOARD STATS FROM API =====
  // Primary dashboard stats from /api/stats/global, /api/stats/overview, /api/stats/by-client
  const { data: dashboardStats, isLoading: dashboardStatsLoading, refetch: refetchDashboardStats } = useDashboardStats();
  
  // Sensor stats from /api/dashboard/sensor-stats with fallback chain
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
  // Total readings - from dashboard stats (already aggregated from best source)
  const totalReadings = dashboardStats?.total_readings ?? 
    sensorStats?.readings_last_24h ?? 0;

  // Client count - from dashboard stats or client stats
  const totalClients = dashboardStats?.total_clients ?? 
    clientStats?.clients?.length ?? 
    sensorStats?.total_clients ?? 0;
  
  // Active clients (estimate from clientStats)
  const activeClientCount = clientStats?.clients?.filter(c => c.reading_count > 0).length ?? totalClients;

  // Sensor types count - from dashboard stats or sensor stats
  const sensorTypesCount = dashboardStats?.total_sensors ?? 
    sensorStats?.total_sensors ?? 0;

  // Device count
  const totalDevices = dashboardStats?.total_devices ?? 
    sensorStats?.total_devices ?? 0;

  // Power metrics
  const currentPower = powerSummary?.total_power_watts ?? powerSummary?.avg_power_watts;
  
  // Connectivity metrics
  const wifiNetworks = wifiStats?.unique_networks_24h ?? wifiStats?.total_networks_discovered ?? 0;
  const btDevices = bluetoothStats?.unique_devices_24h ?? bluetoothStats?.total_devices_discovered ?? 0;
  
  // Aviation/Maritime metrics
  const aircraftCount = adsbStats?.aircraft_active ?? adsbStats?.aircraft_tracked_total ?? 0;
  const loraDevices = loraStats?.total_devices ?? loraStats?.active_devices ?? 0;

  // Alerts
  const activeAlerts = alertStats?.active ?? 0;

  const isLoading = dashboardStatsLoading || sensorStatsLoading || clientStatsLoading;

  // Refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetchDashboardStats();
    setIsRefreshing(false);
  };

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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <QuickStat
          label="Clients"
          value={totalClients}
          icon={Users}
          color="bg-emerald-500/20 text-emerald-400"
          subtitle={`${activeClientCount} active`}
          isLoading={clientStatsLoading}
        />
        <QuickStat
          label="Readings / Day"
          value={formatNumber(totalReadings)}
          icon={Database}
          color="bg-cyan-500/20 text-cyan-400"
          subtitle={totalDevices > 0 ? `${totalDevices} devices` : undefined}
          isLoading={isLoading}
        />
        <QuickStat
          label="Sensor Types"
          value={sensorTypesCount}
          icon={Radio}
          color="bg-violet-500/20 text-violet-400"
          subtitle={`${sensorStats?.sensorItems?.length ?? 0} types tracked`}
          isLoading={sensorStatsLoading}
        />
        <QuickStat
          label="Measurements"
          value={formatNumber(totalReadings * 5)}
          icon={Gauge}
          color="bg-amber-500/20 text-amber-400"
          subtitle="Estimated daily"
          isLoading={isLoading}
        />
      </div>

      {/* ===== SECONDARY METRICS ROW ===== */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <MetricCard
          label="Power"
          value={currentPower ? `${currentPower.toFixed(0)}W` : '--'}
          icon={Zap}
          color="bg-yellow-500/20 text-yellow-400"
        />
        <MetricCard
          label="WiFi Networks"
          value={formatNumber(wifiNetworks)}
          icon={Wifi}
          color="bg-blue-500/20 text-blue-400"
        />
        <MetricCard
          label="BT Devices"
          value={formatNumber(btDevices)}
          icon={Signal}
          color="bg-purple-500/20 text-purple-400"
        />
        <MetricCard
          label="Aircraft"
          value={aircraftCount}
          icon={Plane}
          color="bg-sky-500/20 text-sky-400"
        />
        <MetricCard
          label="LoRa Devices"
          value={loraDevices}
          icon={Activity}
          color="bg-green-500/20 text-green-400"
        />
        <MetricCard
          label="Active Alerts"
          value={activeAlerts}
          icon={Thermometer}
          color={activeAlerts > 0 ? "bg-red-500/20 text-red-400" : "bg-muted/50 text-muted-foreground"}
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
