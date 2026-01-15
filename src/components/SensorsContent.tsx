import { useMemo } from "react";
import { 
  Thermometer, 
  Loader2, 
  RefreshCw, 
  Droplets, 
  Signal, 
  Zap,
  TrendingUp,
  TrendingDown,
  Minus,
  Radio,
  Cpu,
  Wifi,
  Bluetooth,
  Plane,
  Satellite,
  Monitor,
  ArrowUp,
  ArrowDown,
  Activity
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useComprehensiveStats, useDashboardTimeseries, useDashboardStats, useClients } from "@/hooks/aurora";
import { useQueryClient } from "@tanstack/react-query";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface StatCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  trend?: 'up' | 'down' | 'stable';
}

const StatCard = ({ title, value, subtitle, icon, color, trend }: StatCardProps) => {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  
  return (
    <div className="glass-card rounded-xl p-5 border border-border/50">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            {title}
          </p>
          <p className="text-3xl font-bold" style={{ color }}>{value}</p>
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div 
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${color}20` }}
          >
            {icon}
          </div>
          {trend && (
            <TrendIcon className={`w-4 h-4 ${trend === 'up' ? 'text-success' : trend === 'down' ? 'text-destructive' : 'text-muted-foreground'}`} />
          )}
        </div>
      </div>
    </div>
  );
};

interface MiniChartProps {
  title: string;
  data: { time: string; value: number }[];
  color: string;
  unit: string;
  icon: React.ReactNode;
}

const MiniChart = ({ title, data, color, unit, icon }: MiniChartProps) => {
  const currentValue = data.length > 0 ? data[data.length - 1]?.value.toFixed(1) : '—';

  return (
    <div className="glass-card rounded-xl p-5 border border-border/50">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${color}20` }}
          >
            {icon}
          </div>
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {title}
            </h4>
            <p className="text-2xl font-bold" style={{ color }}>
              {currentValue}{unit}
            </p>
          </div>
        </div>
      </div>

      <div className="h-[120px]">
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
            No data
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id={`gradient-${title}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis 
                dataKey="time" 
                tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis 
                tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                domain={['auto', 'auto']}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2}
                fill={`url(#gradient-${title})`}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

const getSensorIcon = (deviceType: string) => {
  switch (deviceType) {
    case 'arduino_sensor_kit':
      return <Cpu className="w-5 h-5 text-orange-400" />;
    case 'thermal_probe':
      return <Thermometer className="w-5 h-5 text-amber-400" />;
    case 'wifi_scanner':
      return <Wifi className="w-5 h-5 text-blue-400" />;
    case 'bluetooth_scanner':
      return <Bluetooth className="w-5 h-5 text-indigo-400" />;
    case 'adsb_detector':
      return <Plane className="w-5 h-5 text-cyan-400" />;
    case 'lora_detector':
      return <Radio className="w-5 h-5 text-red-400" />;
    case 'starlink_dish_comprehensive':
      return <Satellite className="w-5 h-5 text-violet-400" />;
    case 'system_monitor':
      return <Monitor className="w-5 h-5 text-slate-400" />;
    default:
      return <Signal className="w-5 h-5 text-primary" />;
  }
};

const getSensorColor = (deviceType: string) => {
  switch (deviceType) {
    case 'arduino_sensor_kit':
      return 'bg-orange-500/20 border-orange-500/30';
    case 'thermal_probe':
      return 'bg-amber-500/20 border-amber-500/30';
    case 'wifi_scanner':
      return 'bg-blue-500/20 border-blue-500/30';
    case 'bluetooth_scanner':
      return 'bg-indigo-500/20 border-indigo-500/30';
    case 'adsb_detector':
      return 'bg-cyan-500/20 border-cyan-500/30';
    case 'lora_detector':
      return 'bg-red-500/20 border-red-500/30';
    case 'starlink_dish_comprehensive':
      return 'bg-violet-500/20 border-violet-500/30';
    case 'system_monitor':
      return 'bg-slate-500/20 border-slate-500/30';
    default:
      return 'bg-primary/20 border-primary/30';
  }
};

interface SensorStats {
  min: number | null;
  max: number | null;
  avg: number | null;
}

const calcStats = (data: { value: number }[] | undefined): SensorStats => {
  if (!data || data.length === 0) {
    return { min: null, max: null, avg: null };
  }
  const values = data.map(d => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  return { min, max, avg };
};

const SensorsContent = () => {
  const { data: stats, isLoading: statsLoading } = useComprehensiveStats();
  const { data: dashboardStats, isLoading: dashboardStatsLoading } = useDashboardStats();
  const { data: timeseries, isLoading: timeseriesLoading } = useDashboardTimeseries(24);
  const { data: clients } = useClients();
  const queryClient = useQueryClient();

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["aurora"] });
  };

  const isLoading = statsLoading || timeseriesLoading;

  const global = stats?.global;
  const sensorTypes = stats?.sensors_summary?.sensor_types || [];
  // Use flat structure first, fallback to nested
  const totalReadings = global?.total_readings ?? global?.database?.total_readings ?? 0;
  const totalDevices = global?.total_devices ?? global?.devices?.total_unique_devices ?? 0;
  const activeDevices1h = global?.activity?.last_1_hour?.active_devices_1h ?? 0;

  // Live sensor values
  const avgTemp = dashboardStats?.avg_temp_c ?? dashboardStats?.avg_temp_aht;
  const avgHumidity = dashboardStats?.avg_humidity;
  const avgSignal = dashboardStats?.avg_signal_dbm;
  const avgPower = dashboardStats?.avg_power_w;

  // Calculate 24h stats
  const tempStats = useMemo(() => calcStats(timeseries?.temperature), [timeseries?.temperature]);
  const humidityStats = useMemo(() => calcStats(timeseries?.humidity), [timeseries?.humidity]);
  const signalStats = useMemo(() => calcStats(timeseries?.signal), [timeseries?.signal]);
  const powerStats = useMemo(() => calcStats(timeseries?.power), [timeseries?.power]);

  const formatData = (points: { timestamp: string; value: number }[] | undefined) => {
    if (!points || points.length === 0) return [];
    return points.map(p => ({
      time: new Date(p.timestamp).toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit'
      }),
      value: Number(p.value.toFixed(1)),
    }));
  };

  const temperatureData = useMemo(() => formatData(timeseries?.temperature), [timeseries?.temperature]);
  const humidityData = useMemo(() => formatData(timeseries?.humidity), [timeseries?.humidity]);
  const signalData = useMemo(() => formatData(timeseries?.signal), [timeseries?.signal]);
  const powerData = useMemo(() => formatData(timeseries?.power), [timeseries?.power]);

  // Count sensors from clients
  const totalSensors = clients?.reduce((acc, client) => acc + (client.sensors?.length || 0), 0) || 0;

  return (
    <div className="flex-1 overflow-y-auto p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold text-foreground">Sensors</h1>
          <Badge className="bg-success/20 text-success border-success/30 px-3 py-1">
            LIVE
          </Badge>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2"
          onClick={handleRefresh}
          disabled={isLoading}
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Sensor Statistics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Devices"
            value={statsLoading ? "..." : totalDevices.toString()}
            subtitle={`${activeDevices1h} active in last hour`}
            icon={<Cpu className="w-6 h-6" style={{ color: '#3b82f6' }} />}
            color="#3b82f6"
          />
          <StatCard
            title="Total Readings"
            value={statsLoading ? "..." : totalReadings.toLocaleString()}
            subtitle="All sensor data"
            icon={<Signal className="w-6 h-6" style={{ color: '#a855f7' }} />}
            color="#a855f7"
          />
          <StatCard
            title="Sensor Types"
            value={statsLoading ? "..." : sensorTypes.length.toString()}
            subtitle={`${totalSensors} total sensors`}
            icon={<Radio className="w-6 h-6" style={{ color: '#f97316' }} />}
            color="#f97316"
          />
          <StatCard
            title="Avg/Hour"
            value={statsLoading ? "..." : (global?.activity?.avg_readings_per_hour?.toFixed(0) ?? "—")}
            subtitle="Readings per hour"
            icon={<TrendingUp className="w-6 h-6" style={{ color: '#22c55e' }} />}
            color="#22c55e"
          />
        </div>
      </div>

      {/* Live Sensor Values with 24h Range */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          Live Sensor Values (with 24h range)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-card rounded-xl p-4 border border-border/50">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                <Thermometer className="w-4 h-4 text-red-400" />
              </div>
              <span className="font-medium text-sm">Temperature</span>
            </div>
            <p className="text-2xl font-bold text-red-400 mb-2">
              {dashboardStatsLoading ? "..." : avgTemp !== null && avgTemp !== undefined ? `${avgTemp.toFixed(1)}°C` : "—"}
            </p>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1"><ArrowDown className="w-3 h-3 text-blue-400" />Min</span>
                <span>{tempStats.min !== null ? `${tempStats.min.toFixed(1)}°C` : '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1"><ArrowUp className="w-3 h-3 text-red-400" />Max</span>
                <span>{tempStats.max !== null ? `${tempStats.max.toFixed(1)}°C` : '—'}</span>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-xl p-4 border border-border/50">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Droplets className="w-4 h-4 text-blue-400" />
              </div>
              <span className="font-medium text-sm">Humidity</span>
            </div>
            <p className="text-2xl font-bold text-blue-400 mb-2">
              {dashboardStatsLoading ? "..." : avgHumidity !== null && avgHumidity !== undefined ? `${avgHumidity.toFixed(1)}%` : "—"}
            </p>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1"><ArrowDown className="w-3 h-3 text-blue-400" />Min</span>
                <span>{humidityStats.min !== null ? `${humidityStats.min.toFixed(1)}%` : '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1"><ArrowUp className="w-3 h-3 text-red-400" />Max</span>
                <span>{humidityStats.max !== null ? `${humidityStats.max.toFixed(1)}%` : '—'}</span>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-xl p-4 border border-border/50">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Signal className="w-4 h-4 text-purple-400" />
              </div>
              <span className="font-medium text-sm">Signal</span>
            </div>
            <p className="text-2xl font-bold text-purple-400 mb-2">
              {dashboardStatsLoading ? "..." : avgSignal !== null && avgSignal !== undefined ? `${avgSignal.toFixed(0)} dBm` : "—"}
            </p>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1"><ArrowDown className="w-3 h-3 text-blue-400" />Min</span>
                <span>{signalStats.min !== null ? `${signalStats.min.toFixed(0)} dBm` : '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1"><ArrowUp className="w-3 h-3 text-red-400" />Max</span>
                <span>{signalStats.max !== null ? `${signalStats.max.toFixed(0)} dBm` : '—'}</span>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-xl p-4 border border-border/50">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
                <Zap className="w-4 h-4 text-orange-400" />
              </div>
              <span className="font-medium text-sm">Power</span>
            </div>
            <p className="text-2xl font-bold text-orange-400 mb-2">
              {dashboardStatsLoading ? "..." : avgPower !== null && avgPower !== undefined ? `${avgPower.toFixed(1)}W` : "—"}
            </p>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1"><ArrowDown className="w-3 h-3 text-blue-400" />Min</span>
                <span>{powerStats.min !== null ? `${powerStats.min.toFixed(1)}W` : '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1"><ArrowUp className="w-3 h-3 text-red-400" />Max</span>
                <span>{powerStats.max !== null ? `${powerStats.max.toFixed(1)}W` : '—'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Timeseries Charts */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">24-Hour Trends</h2>
        {timeseriesLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MiniChart
              title="Temperature"
              data={temperatureData}
              color="#ef4444"
              unit="°C"
              icon={<Thermometer className="w-5 h-5" style={{ color: '#ef4444' }} />}
            />
            <MiniChart
              title="Humidity"
              data={humidityData}
              color="#3b82f6"
              unit="%"
              icon={<Droplets className="w-5 h-5" style={{ color: '#3b82f6' }} />}
            />
            <MiniChart
              title="Signal Strength"
              data={signalData}
              color="#a855f7"
              unit=" dBm"
              icon={<Signal className="w-5 h-5" style={{ color: '#a855f7' }} />}
            />
            <MiniChart
              title="Power"
              data={powerData}
              color="#f97316"
              unit="W"
              icon={<Zap className="w-5 h-5" style={{ color: '#f97316' }} />}
            />
          </div>
        )}
      </div>

      {/* Sensor Types List */}
      <div>
        <h2 className="text-lg font-semibold mb-4">
          Active Sensor Types ({sensorTypes.length})
        </h2>
        {statsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : sensorTypes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sensorTypes.map((sensor) => (
              <div 
                key={sensor.device_type}
                className={`glass-card rounded-xl p-5 border border-border/50 hover:border-primary/30 transition-all ${getSensorColor(sensor.device_type)}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-background/50 flex items-center justify-center">
                      {getSensorIcon(sensor.device_type)}
                    </div>
                    <div>
                      <h3 className="font-semibold capitalize">
                        {sensor.device_type.replace(/_/g, ' ')}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {sensor.device_count} device{sensor.device_count !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <Badge 
                    variant={sensor.active_last_hour ? 'default' : 'secondary'}
                    className={sensor.active_last_hour ? 'bg-success/20 text-success' : ''}
                  >
                    {sensor.active_last_hour ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Readings:</span>
                    <span className="font-medium">{sensor.total_readings.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Last Seen:</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(sensor.last_seen).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass-card rounded-xl p-12 text-center border border-border/50">
            <Thermometer className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold mb-2">No Sensors Found</h3>
            <p className="text-muted-foreground">
              No sensor data is currently available.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SensorsContent;