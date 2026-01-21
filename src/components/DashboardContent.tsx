import { useMemo, useState, Suspense, lazy } from "react";
import { 
  Thermometer, 
  Zap, 
  Loader2,
  Database,
  Server,
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy load heavy chart components
const HourlyClientTrendChart = lazy(() => import("./dashboard/HourlyClientTrendChart"));
const HourlyTrendChart = lazy(() => import("./dashboard/HourlyTrendChart"));
const SensorTypeStatsSection = lazy(() => import("./dashboard/SensorTypeStatsSection"));
const PowerHistoryChart = lazy(() => import("./dashboard/PowerHistoryChart"));
const StarlinkCharts = lazy(() => import("./StarlinkCharts"));

import { 
  useComprehensiveStats, 
  useClients,
  useClientsByState,
  useClientStatistics,
  useStatsOverview,
  useGlobalStats,
  useAlertStats,
  useDashboardClientStats,
  usePowerSummary,
  useBluetoothStats,
  useWifiStats,
  useAdsbStats,
  useLoraGlobalStats,
  type Client 
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
  
  // ===== CONSOLIDATED API CALLS =====
  // Core stats - single comprehensive fetch
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useComprehensiveStats();
  const { data: statsOverview, isLoading: overviewLoading } = useStatsOverview();
  const { data: globalStats, isLoading: globalLoading } = useGlobalStats();
  
  // Client data - consolidated
  const { data: clients, isLoading: clientsLoading } = useClients();
  const { data: clientsByState } = useClientsByState();
  const { data: clientStatistics } = useClientStatistics();
  const { data: dashboardClientStats } = useDashboardClientStats(undefined, periodHours);
  
  // Secondary stats - for quick metrics
  const { data: alertStats } = useAlertStats();
  const { data: powerSummary } = usePowerSummary();
  const { data: wifiStats } = useWifiStats();
  const { data: bluetoothStats } = useBluetoothStats();
  const { data: adsbStats } = useAdsbStats();
  const { data: loraStats } = useLoraGlobalStats();

  // ===== DERIVED METRICS =====
  const global = stats?.global;
  
  // Aggregate all clients from state
  const allClientsFromState = useMemo(() => {
    if (!clientsByState?.clients_by_state) return [];
    const { pending = [], registered = [], adopted = [], disabled = [], suspended = [] } = clientsByState.clients_by_state;
    return [...pending, ...registered, ...adopted, ...disabled, ...suspended];
  }, [clientsByState]);

  // Active clients count
  const activeClients = useMemo(() => {
    const clientList = allClientsFromState.length > 0 ? allClientsFromState : (clients || []);
    return clientList.filter((c: Client) => 
      !['deleted', 'disabled', 'suspended'].includes(c.state || '')
    );
  }, [allClientsFromState, clients]);

  // Total readings - best available source
  const totalReadings = statsOverview?.total_readings ?? 
    globalStats?.total_readings ?? 
    global?.total_readings ?? 0;

  // Client count - highest available
  const totalClients = Math.max(
    allClientsFromState.length,
    clientStatistics?.statistics?.total ?? 0,
    globalStats?.total_clients ?? 0,
    clients?.length ?? 0
  );

  // Sensor types count
  const sensorTypesCount = globalStats?.sensor_types_count ?? 
    global?.sensor_types_count ?? 
    globalStats?.device_breakdown?.length ?? 0;

  // Activity metrics
  const readings1h = global?.activity?.last_1_hour?.readings_1h ?? 0;
  const activeDevices1h = global?.activity?.last_1_hour?.active_devices_1h ?? 0;

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

  const isLoading = statsLoading || overviewLoading || globalLoading;

  // Refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetchStats();
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
          subtitle={`${activeClients.length} active`}
          isLoading={clientsLoading}
        />
        <QuickStat
          label="Readings / Day"
          value={formatNumber(totalReadings)}
          icon={Database}
          color="bg-cyan-500/20 text-cyan-400"
          subtitle={readings1h > 0 ? `${formatNumber(readings1h)} last hour` : undefined}
          isLoading={isLoading}
        />
        <QuickStat
          label="Sensor Types"
          value={sensorTypesCount}
          icon={Radio}
          color="bg-violet-500/20 text-violet-400"
          subtitle={`${activeDevices1h} devices active`}
          isLoading={isLoading}
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
