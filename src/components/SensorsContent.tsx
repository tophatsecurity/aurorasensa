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
  Minus
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSensors, useDashboardStats, useDashboardTimeseries } from "@/hooks/useAuroraApi";
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

const SensorsContent = () => {
  const { data: sensors, isLoading: sensorsLoading } = useSensors();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: timeseries, isLoading: timeseriesLoading } = useDashboardTimeseries(24);
  const queryClient = useQueryClient();

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["aurora"] });
  };

  const isLoading = sensorsLoading || statsLoading || timeseriesLoading;

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
            title="Avg Temperature"
            value={stats?.avg_temp_c !== null ? `${stats?.avg_temp_c?.toFixed(1)}°C` : '—'}
            subtitle="Across all sensors"
            icon={<Thermometer className="w-6 h-6" style={{ color: '#ef4444' }} />}
            color="#ef4444"
          />
          <StatCard
            title="Avg Humidity"
            value={stats?.avg_humidity !== null ? `${stats?.avg_humidity?.toFixed(1)}%` : '—'}
            subtitle="Relative humidity"
            icon={<Droplets className="w-6 h-6" style={{ color: '#3b82f6' }} />}
            color="#3b82f6"
          />
          <StatCard
            title="Avg Signal"
            value={stats?.avg_signal_dbm !== null ? `${stats?.avg_signal_dbm?.toFixed(0)} dBm` : '—'}
            subtitle="Signal strength"
            icon={<Signal className="w-6 h-6" style={{ color: '#a855f7' }} />}
            color="#a855f7"
          />
          <StatCard
            title="Avg Power"
            value={stats?.avg_power_w !== null ? `${stats?.avg_power_w?.toFixed(1)}W` : '—'}
            subtitle="Power consumption"
            icon={<Zap className="w-6 h-6" style={{ color: '#f97316' }} />}
            color="#f97316"
          />
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

      {/* Sensor List */}
      <div>
        <h2 className="text-lg font-semibold mb-4">
          Active Sensors ({stats?.total_sensors ?? sensors?.length ?? 0})
        </h2>
        {sensorsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : sensors && sensors.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sensors.map((sensor) => (
              <div 
                key={sensor.id}
                className="glass-card rounded-xl p-5 border border-border/50 hover:border-primary/30 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                      <Thermometer className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{sensor.name}</h3>
                      <p className="text-xs text-muted-foreground">{sensor.type}</p>
                    </div>
                  </div>
                  <Badge 
                    variant={sensor.status === 'online' ? 'default' : 'secondary'}
                    className={sensor.status === 'online' ? 'bg-success/20 text-success' : ''}
                  >
                    {sensor.status}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Value:</span>
                    <span className="font-medium">{sensor.value} {sensor.unit}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Last Update:</span>
                    <span className="text-xs text-muted-foreground">{sensor.lastUpdate}</span>
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
