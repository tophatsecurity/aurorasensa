import { useMemo, useState, Suspense, lazy } from "react";
import { 
  Loader2,
  Database,
  Users,
  RefreshCw,
  HardDrive,
  TrendingUp,
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

// Use stats endpoints for all dashboard data
import { 
  useGlobalStats,
  use1hrStats,
  use24hrStats,
  useAlertStats,
  useStatsBySensor,
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



const DashboardContent = () => {
  const periodHours = 24;
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // ===== STATS ENDPOINTS =====
  const { data: globalStats, isLoading: globalLoading, refetch: refetchGlobalStats } = useGlobalStats();
  const { data: stats1hr, isLoading: stats1hrLoading } = use1hrStats();
  const { data: stats24hr } = use24hrStats();
  const { data: alertStats } = useAlertStats();
  const { data: sensorStats } = useStatsBySensor({ hours: periodHours });

  // ===== DERIVED METRICS FROM STATS API =====
  const totalReadings = globalStats?.total_readings ?? 0;
  const totalBatches = globalStats?.total_batches ?? 0;
  const totalClients = globalStats?.total_clients ?? 0;
  const totalDevices = globalStats?.total_devices ?? 0;
  const sensorTypesCount = globalStats?.sensor_types_count ?? globalStats?.device_breakdown?.length ?? 0;
  const activeClients24h = globalStats?.active_clients_24h ?? totalClients;
  
  // Total measurements from device breakdown
  const totalMeasurements = useMemo(() => {
    const breakdown = globalStats?.device_breakdown;
    if (breakdown && Array.isArray(breakdown)) {
      return breakdown.reduce((sum, d) => sum + (d.count || 0), 0);
    }
    return totalReadings;
  }, [globalStats, totalReadings]);

  // Device breakdown from /api/stats/global
  const deviceBreakdown = useMemo(() => {
    const breakdown = globalStats?.device_breakdown;
    if (!breakdown || !Array.isArray(breakdown)) return [];
    return breakdown.sort((a, b) => b.count - a.count).slice(0, 6);
  }, [globalStats]);

  const maxDeviceCount = deviceBreakdown.length > 0 ? deviceBreakdown[0].count : 0;

  // Readings by day from /api/stats/global
  const readingsByDay = useMemo(() => {
    const data = globalStats?.readings_by_day;
    if (!data || !Array.isArray(data)) return [];
    return data.slice(0, 7).reverse().map(d => ({
      date: new Date(d.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      shortDate: new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' }),
      count: d.count,
    }));
  }, [globalStats]);

  const todayReadings = readingsByDay.length > 0 ? readingsByDay[readingsByDay.length - 1].count : 0;
  const yesterdayReadings = readingsByDay.length > 1 ? readingsByDay[readingsByDay.length - 2].count : 0;
  const readingsTrend = yesterdayReadings > 0 
    ? ((todayReadings - yesterdayReadings) / yesterdayReadings * 100).toFixed(0) 
    : '0';

  // Storage info from /api/stats/global
  const storage = globalStats?.storage;

  // Sensor types from stats/by-sensor
  const sensorItems = sensorStats?.sensors ?? [];
  const topSensorTypes = sensorItems.slice(0, 5);

  const isLoading = globalLoading || stats1hrLoading;

  // Refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetchGlobalStats();
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
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">AuroraSENSE</h1>
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
          isLoading={globalLoading}
        />
        <PrimaryStat
          label="Connected Clients"
          value={totalClients}
          icon={Users}
          iconColor="bg-emerald-500/20 text-emerald-400"
          subtitle={`${activeClients24h} active (24h)`}
          isLoading={globalLoading}
        />
        <PrimaryStat
          label="Devices"
          value={totalDevices}
          icon={HardDrive}
          iconColor="bg-violet-500/20 text-violet-400"
          subtitle={`${sensorTypesCount} sensor types`}
          isLoading={globalLoading}
        />
      </div>


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
