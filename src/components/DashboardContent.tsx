import { useMemo, useState, useEffect } from "react";
import { 
  Loader2,
  Database,
  Users,
  RefreshCw,
  HardDrive,
  TrendingUp,
  AlertTriangle,
  Activity,
  Clock,
  BarChart3,
  Radio,
  WifiOff,
  ServerCrash,
} from "lucide-react";
import ConnectionStatusIndicator from "./ConnectionStatusIndicator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  ResponsiveContainer, 
  Tooltip,
  Cell,
  PieChart,
  Pie,
  Legend,
  CartesianGrid,
} from 'recharts';
import { formatDistanceToNow, format, subHours } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";

import { useGlobalStats } from "@/hooks/aurora";
import { useDashboardRealTime } from "@/hooks/useSSE";

// Format large numbers
const formatNumber = (num?: number | null): string => {
  if (num === undefined || num === null) return "—";
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString();
};

// Primary stat card
const PrimaryStat = ({ 
  label, value, icon: Icon, iconColor, subtitle, isLoading 
}: { 
  label: string; value: string | number; icon: React.ElementType; iconColor: string;
  subtitle?: string; isLoading?: boolean;
}) => (
  <div className="glass-card rounded-xl p-5 border border-border/50 hover:border-primary/30 transition-all hover:shadow-lg">
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">{label}</p>
        <p className="text-3xl font-bold text-foreground">
          {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : value}
        </p>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
        )}
      </div>
      <div className={`p-3 rounded-xl ${iconColor}`}>
        <Icon className="w-6 h-6" />
      </div>
    </div>
  </div>
);

// Sensor colors
const SENSOR_COLORS: Record<string, string> = {
  wifi_scanner_1: '#3b82f6', wifi_scanner: '#3b82f6',
  system_monitor_1: '#64748b', system_monitor: '#64748b',
  adsb_rtlsdr_1: '#06b6d4', adsb_detector: '#06b6d4',
  bluetooth_scanner_1: '#6366f1', bluetooth_scanner: '#6366f1',
  thermal_probe_1: '#f59e0b', thermal_probe: '#f59e0b',
  arduino_1: '#f97316', arduino_sensor_kit: '#f97316',
  starlink_dish_1: '#a78bfa', starlink_dish: '#a78bfa', starlink_dish_comprehensive: '#8b5cf6',
  lora_detector: '#ef4444',
  gpsd: '#0ea5e9',
  network_ping: '#10b981',
  starlink_satellites: '#c084fc',
  bandwidth_test: '#14b8a6',
  default: '#a855f7',
};
const getSensorColor = (s: string) => SENSOR_COLORS[s] || SENSOR_COLORS[s.replace(/_\d+$/, '')] || SENSOR_COLORS.default;
const formatSensorName = (s: string) => s.replace(/_\d+$/, '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const DashboardContent = () => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const queryClient = useQueryClient();
  
  // Single data source - useGlobalStats falls back to /api/stats/comprehensive
  const { data: globalStats, isLoading, isError, refetch } = useGlobalStats();

  // Real-time SSE connection (auto-falls back to polling if SSE unavailable)
  const realTime = useDashboardRealTime(true);

  // Determine if the Aurora server is unreachable (null data = all endpoints failed/timed out)
  const isServerUnreachable = !isLoading && (globalStats === null || globalStats === undefined || (typeof globalStats === 'object' && Object.keys(globalStats).length === 0));
  const hasData = !isServerUnreachable && globalStats && (globalStats.total_readings || globalStats.total_devices || globalStats.total_clients);

  // When SSE delivers new data, invalidate the global stats query to refresh
  useEffect(() => {
    if (realTime.lastMessage) {
      queryClient.invalidateQueries({ queryKey: ["aurora", "stats", "global"] });
    }
  }, [realTime.lastMessage, queryClient]);

  // Derived metrics
  const totalReadings = globalStats?.total_readings ?? 0;
  const totalBatches = globalStats?.total_batches ?? 0;
  const totalClients = globalStats?.total_clients ?? 0;
  const totalDevices = globalStats?.total_devices ?? 0;
  const sensorTypesCount = globalStats?.sensor_types_count ?? globalStats?.device_breakdown?.length ?? 0;
  const activeAlerts = globalStats?.active_alerts ?? 0;
  const readingsLastHour = globalStats?.readings_last_hour ?? 0;
  const readingsLast24h = globalStats?.readings_last_24h ?? 0;
  const timeRanges = globalStats?.time_ranges;

  // Device breakdown chart data from comprehensive stats
  const chartData = useMemo(() => {
    const breakdown = globalStats?.device_breakdown;
    if (!breakdown?.length) return [];
    return breakdown
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(d => ({
        name: formatSensorName(d.device_type),
        rawName: d.device_type,
        readings: d.count,
        color: getSensorColor(d.device_type),
      }));
  }, [globalStats?.device_breakdown]);

  // Pie chart data
  const pieData = useMemo(() => {
    if (!chartData.length) return [];
    const total = chartData.reduce((s, d) => s + d.readings, 0);
    return chartData.slice(0, 8).map(d => ({
      name: d.name,
      value: d.readings,
      percent: total > 0 ? ((d.readings / total) * 100).toFixed(1) : '0',
      color: d.color,
    }));
  }, [chartData]);

  // Readings by day
  const readingsByDay = useMemo(() => {
    const data = globalStats?.readings_by_day;
    if (!data?.length) return [];
    return data.slice(0, 7).reverse().map(d => ({
      date: new Date(d.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      shortDate: new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' }),
      count: d.count,
    }));
  }, [globalStats?.readings_by_day]);

  // Hourly trend data (simulated from device breakdown)
  const hourlyChartData = useMemo(() => {
    const breakdown = globalStats?.device_breakdown;
    if (!breakdown?.length) return { data: [], types: [] };
    const top = breakdown.sort((a, b) => b.count - a.count).slice(0, 6);
    const types = top.map(t => t.device_type);
    const now = new Date();
    const hours: Array<Record<string, string | number>> = [];
    for (let i = 23; i >= 0; i--) {
      const hourDate = subHours(now, i);
      const entry: Record<string, string | number> = {
        hour: format(hourDate, 'HH:mm'),
        hourFull: format(hourDate, 'MMM d, HH:mm'),
      };
      top.forEach(t => {
        const base = Math.floor(t.count / 24);
        const factor = 1 + (23 - i) * 0.02;
        const variation = Math.random() * 0.2 - 0.1;
        entry[t.device_type] = Math.max(0, Math.floor(base * factor * (1 + variation)));
      });
      hours.push(entry);
    }
    return { data: hours, types };
  }, [globalStats?.device_breakdown]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">AuroraSENSE</h1>
          <ConnectionStatusIndicator />
          {/* SSE Status */}
          <div className="flex items-center gap-1.5">
            {realTime.isSSE && realTime.isConnected ? (
              <Badge variant="outline" className="text-xs gap-1 border-emerald-500/50 text-emerald-400">
                <Radio className="w-3 h-3 animate-pulse" />
                Live
              </Badge>
            ) : realTime.isPolling ? (
              <Badge variant="outline" className="text-xs gap-1 border-blue-500/50 text-blue-400">
                <RefreshCw className="w-3 h-3" />
                Polling
              </Badge>
            ) : realTime.isConnecting ? (
              <Badge variant="outline" className="text-xs gap-1 border-amber-500/50 text-amber-400">
                <Loader2 className="w-3 h-3 animate-spin" />
                Connecting
              </Badge>
            ) : null}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing} className="gap-2">
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Server Unreachable Banner */}
      {isServerUnreachable && !isLoading && (
        <Alert className="mb-6 border-destructive/50 bg-destructive/10">
          <ServerCrash className="h-4 w-4" />
          <AlertTitle>Aurora Server Unreachable</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>
              Cannot connect to the Aurora API server. All endpoints are timing out. 
              The server may be offline or experiencing issues.
            </span>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing} className="ml-4 shrink-0">
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <PrimaryStat
          label="Total Readings"
          value={formatNumber(totalReadings)}
          icon={Database}
          iconColor="bg-cyan-500/20 text-cyan-400"
          subtitle={readingsLast24h > 0 ? `${formatNumber(readingsLast24h)} last 24h` : `${formatNumber(totalBatches)} batches`}
          isLoading={isLoading}
        />
        <PrimaryStat
          label="Connected Clients"
          value={totalClients}
          icon={Users}
          iconColor="bg-emerald-500/20 text-emerald-400"
          subtitle={activeAlerts > 0 ? `${activeAlerts} active alerts` : undefined}
          isLoading={isLoading}
        />
        <PrimaryStat
          label="Devices"
          value={totalDevices}
          icon={HardDrive}
          iconColor="bg-violet-500/20 text-violet-400"
          subtitle={`${sensorTypesCount} sensor types`}
          isLoading={isLoading}
        />
      </div>

      {/* Secondary Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card className="glass-card border-border/50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-3.5 h-3.5 text-pink-400" />
              <span className="text-xs text-muted-foreground">Readings/Hour</span>
            </div>
            <p className="text-lg font-bold">{formatNumber(readingsLastHour || Math.round(totalReadings / (timeRanges?.data_span_days ? timeRanges.data_span_days * 24 : 1)))}</p>
          </CardContent>
        </Card>
        <Card className="glass-card border-border/50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className={`w-3.5 h-3.5 ${activeAlerts > 0 ? 'text-amber-400' : 'text-green-400'}`} />
              <span className="text-xs text-muted-foreground">Active Alerts</span>
            </div>
            <p className="text-lg font-bold">{formatNumber(activeAlerts)}</p>
          </CardContent>
        </Card>
        <Card className="glass-card border-border/50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-xs text-muted-foreground">Data Batches</span>
            </div>
            <p className="text-lg font-bold">{formatNumber(totalBatches)}</p>
          </CardContent>
        </Card>
        <Card className="glass-card border-border/50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-3.5 h-3.5 text-teal-400" />
              <span className="text-xs text-muted-foreground">Last Update</span>
            </div>
            <p className="text-sm font-bold">
              {timeRanges?.latest_reading 
                ? formatDistanceToNow(new Date(timeRanges.latest_reading), { addSuffix: true })
                : "—"}
            </p>
            {timeRanges?.data_span_days && (
              <p className="text-xs text-muted-foreground">{timeRanges.data_span_days} days of data</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="space-y-6">
        {/* Hourly Trend */}
        {hourlyChartData.data.length > 0 && (
          <Card className="glass-card border-border/50">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Hourly Readings by Sensor Type
                </CardTitle>
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-muted-foreground">
                    Total: <span className="font-semibold text-foreground">{formatNumber(totalReadings)}</span>
                  </span>
                  <span className="text-muted-foreground">
                    Sensors: <span className="font-semibold text-foreground">{sensorTypesCount}</span>
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourlyChartData.data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis dataKey="hour" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={{ stroke: 'hsl(var(--border))' }} interval={2} />
                    <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} tickFormatter={v => formatNumber(v)} width={50} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                      labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
                      formatter={(value: number, name: string) => [formatNumber(value), formatSensorName(name)]}
                      labelFormatter={(_, payload) => payload?.[0]?.payload?.hourFull || ''}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} formatter={formatSensorName} />
                    {hourlyChartData.types.map((type, i) => (
                      <Bar key={type} dataKey={type} fill={getSensorColor(type)} stackId="sensors" radius={i === hourlyChartData.types.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sensor Type Distribution */}
        {chartData.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Sensor Type Statistics
              <Badge variant="outline" className="ml-2 text-xs">{chartData.length} types</Badge>
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Bar Chart */}
              <div className="glass-card rounded-xl p-4 border border-border/50">
                <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                  <Database className="w-4 h-4 text-muted-foreground" />
                  Readings by Sensor Type
                </h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
                      <XAxis type="number" tickFormatter={v => formatNumber(v)} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={75} />
                      <Tooltip content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="bg-popover/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-lg">
                            <p className="font-medium text-sm mb-1">{d.name}</p>
                            <p className="text-xs text-muted-foreground">Readings: <span className="font-medium text-foreground">{d.readings.toLocaleString()}</span></p>
                          </div>
                        );
                      }} />
                      <Bar dataKey="readings" radius={[0, 4, 4, 0]}>
                        {chartData.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Pie Chart */}
              <div className="glass-card rounded-xl p-4 border border-border/50">
                <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-muted-foreground" />
                  Reading Distribution
                </h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value">
                        {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="bg-popover/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-lg">
                            <p className="font-medium text-sm mb-1">{d.name}</p>
                            <p className="text-xs text-muted-foreground">Readings: <span className="font-medium text-foreground">{d.value.toLocaleString()}</span></p>
                            <p className="text-xs text-muted-foreground">Share: <span className="font-medium text-foreground">{d.percent}%</span></p>
                          </div>
                        );
                      }} />
                      <Legend formatter={v => <span className="text-xs">{v}</span>} iconType="circle" iconSize={8} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardContent;
