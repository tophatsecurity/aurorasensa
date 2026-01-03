import { useMemo } from "react";
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line
} from "recharts";
import { Cpu, MemoryStick, HardDrive, Thermometer, Loader2 } from "lucide-react";
import { useSystemMonitorTimeseries, SystemMonitorReading } from "@/hooks/useAuroraApi";

interface ChartData {
  time: string;
  value: number;
}

interface SystemChartProps {
  title: string;
  icon: React.ReactNode;
  color: string;
  unit: string;
  data: ChartData[];
  isLoading?: boolean;
  chartType?: 'area' | 'line';
}

const SystemChart = ({ title, icon, color, unit, data, isLoading, chartType = 'area' }: SystemChartProps) => {
  const currentValue = data.length > 0 ? data[data.length - 1]?.value : null;
  const avgValue = data.length > 0 ? data.reduce((a, b) => a + b.value, 0) / data.length : null;
  const minValue = data.length > 0 ? Math.min(...data.map(d => d.value)) : null;
  const maxValue = data.length > 0 ? Math.max(...data.map(d => d.value)) : null;

  const formatValue = (val: number | null) => {
    if (val === null) return '—';
    return val.toFixed(1);
  };

  return (
    <div className="glass-card rounded-xl p-5 border border-border/50">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
            {icon}
          </div>
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {title}
            </h4>
            <p className="text-2xl font-bold" style={{ color }}>
              {isLoading ? '...' : `${formatValue(currentValue)}${unit}`}
            </p>
          </div>
        </div>
        {!isLoading && data.length > 0 && (
          <div className="text-right text-xs">
            <div className="text-muted-foreground">
              Avg: <span className="font-medium" style={{ color }}>{formatValue(avgValue)}{unit}</span>
            </div>
            <div className="text-muted-foreground">
              Min/Max: {formatValue(minValue)} / {formatValue(maxValue)}
            </div>
          </div>
        )}
      </div>
      
      <div className="h-[120px] mt-2">
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
            {chartType === 'area' ? (
              <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id={`gradient-system-${title}`} x1="0" y1="0" x2="0" y2="1">
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
                  tickFormatter={(v) => formatValue(v)}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                  formatter={(value: number) => [`${formatValue(value)}${unit}`, title]}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={color}
                  strokeWidth={2}
                  fill={`url(#gradient-system-${title})`}
                  dot={false}
                  animationDuration={300}
                />
              </AreaChart>
            ) : (
              <LineChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
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
                  tickFormatter={(v) => formatValue(v)}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                  formatter={(value: number) => [`${formatValue(value)}${unit}`, title]}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={color}
                  strokeWidth={2}
                  dot={false}
                  animationDuration={300}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

const SystemMonitorCharts = () => {
  const { data: systemData, isLoading } = useSystemMonitorTimeseries(24);

  const formatData = (
    readings: SystemMonitorReading[] | undefined,
    field: keyof SystemMonitorReading
  ): ChartData[] => {
    if (!readings || readings.length === 0) return [];
    return readings
      .filter(r => r[field] !== undefined && r[field] !== null)
      .map(r => ({
        time: new Date(r.timestamp).toLocaleTimeString('en-US', { 
          hour12: false, 
          hour: '2-digit', 
          minute: '2-digit'
        }),
        value: Number(r[field]),
      }));
  };

  const cpuData = useMemo(() => formatData(systemData?.readings, 'cpu_percent'), [systemData?.readings]);
  const memoryData = useMemo(() => formatData(systemData?.readings, 'memory_percent'), [systemData?.readings]);
  const diskData = useMemo(() => formatData(systemData?.readings, 'disk_percent'), [systemData?.readings]);
  const tempData = useMemo(() => formatData(systemData?.readings, 'cpu_temp_c'), [systemData?.readings]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <SystemChart
        title="CPU Usage"
        icon={<Cpu className="w-5 h-5" style={{ color: '#06b6d4' }} />}
        color="#06b6d4"
        unit="%"
        data={cpuData}
        isLoading={isLoading}
      />
      <SystemChart
        title="Memory Usage"
        icon={<MemoryStick className="w-5 h-5" style={{ color: '#8b5cf6' }} />}
        color="#8b5cf6"
        unit="%"
        data={memoryData}
        isLoading={isLoading}
      />
      <SystemChart
        title="Disk Usage"
        icon={<HardDrive className="w-5 h-5" style={{ color: '#f59e0b' }} />}
        color="#f59e0b"
        unit="%"
        data={diskData}
        isLoading={isLoading}
      />
      <SystemChart
        title="CPU Temperature"
        icon={<Thermometer className="w-5 h-5" style={{ color: '#ef4444' }} />}
        color="#ef4444"
        unit="°C"
        data={tempData}
        isLoading={isLoading}
        chartType="line"
      />
    </div>
  );
};

export default SystemMonitorCharts;
