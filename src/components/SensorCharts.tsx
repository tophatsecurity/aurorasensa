import { useMemo } from "react";
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";
import { Thermometer, Droplets, Signal, Zap, Loader2 } from "lucide-react";
import { useDashboardTimeseries } from "@/hooks/useAuroraApi";

interface ChartData {
  time: string;
  value: number;
}

interface SensorChartProps {
  title: string;
  icon: React.ReactNode;
  color: string;
  unit: string;
  data: ChartData[];
  isLoading?: boolean;
}

const SensorChart = ({ title, icon, color, unit, data, isLoading }: SensorChartProps) => {
  const currentValue = data.length > 0 ? data[data.length - 1]?.value.toFixed(1) : '—';

  return (
    <div className="glass-card rounded-xl p-5 border border-border/50">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center`} style={{ backgroundColor: `${color}20` }}>
            {icon}
          </div>
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {title}
            </h4>
            <p className="text-2xl font-bold" style={{ color }}>
              {isLoading ? '...' : `${currentValue}${unit}`}
            </p>
          </div>
        </div>
      </div>
      
      <div className="h-[150px] mt-2">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
            No data available
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
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis 
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
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
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2}
                fill={`url(#gradient-${title})`}
                dot={false}
                animationDuration={300}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

const SensorCharts = () => {
  const { data: timeseries, isLoading } = useDashboardTimeseries(24);

  const formatData = (points: { timestamp: string; value: number }[] | undefined): ChartData[] => {
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <SensorChart
        title="Temperature"
        icon={<Thermometer className="w-5 h-5" style={{ color: '#ef4444' }} />}
        color="#ef4444"
        unit="°C"
        data={temperatureData}
        isLoading={isLoading}
      />
      <SensorChart
        title="Humidity"
        icon={<Droplets className="w-5 h-5" style={{ color: '#3b82f6' }} />}
        color="#3b82f6"
        unit="%"
        data={humidityData}
        isLoading={isLoading}
      />
      <SensorChart
        title="Signal Strength"
        icon={<Signal className="w-5 h-5" style={{ color: '#a855f7' }} />}
        color="#a855f7"
        unit=" dBm"
        data={signalData}
        isLoading={isLoading}
      />
      <SensorChart
        title="Power"
        icon={<Zap className="w-5 h-5" style={{ color: '#f97316' }} />}
        color="#f97316"
        unit="W"
        data={powerData}
        isLoading={isLoading}
      />
    </div>
  );
};

export default SensorCharts;
