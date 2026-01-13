import { useMemo, useState } from "react";
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
import { Satellite, Zap, Signal, Wifi, Loader2, RefreshCw } from "lucide-react";
import { useStarlinkTimeseries, useDashboardTimeseries, StarlinkTimeseriesPoint } from "@/hooks/useAuroraApi";
import { Button } from "@/components/ui/button";

interface ChartData {
  time: string;
  value: number;
}

interface StarlinkChartProps {
  title: string;
  icon: React.ReactNode;
  color: string;
  unit: string;
  data: ChartData[];
  isLoading?: boolean;
  chartType?: 'area' | 'line';
}

const StarlinkChart = ({ title, icon, color, unit, data, isLoading, chartType = 'area' }: StarlinkChartProps) => {
  const currentValue = data.length > 0 ? data[data.length - 1]?.value : null;
  const avgValue = data.length > 0 ? data.reduce((a, b) => a + b.value, 0) / data.length : null;
  const minValue = data.length > 0 ? Math.min(...data.map(d => d.value)) : null;
  const maxValue = data.length > 0 ? Math.max(...data.map(d => d.value)) : null;

  const formatValue = (val: number | null) => {
    if (val === null) return '—';
    if (Math.abs(val) >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
    if (Math.abs(val) >= 1000) return `${(val / 1000).toFixed(1)}K`;
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
            No Starlink data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'area' ? (
              <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id={`gradient-starlink-${title}`} x1="0" y1="0" x2="0" y2="1">
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
                  fill={`url(#gradient-starlink-${title})`}
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

interface StarlinkChartsProps {
  hours?: number;
  clientId?: string;
}

const StarlinkCharts = ({ hours = 24, clientId }: StarlinkChartsProps) => {
  const { data: starlinkData, isLoading: starlinkLoading, refetch } = useStarlinkTimeseries(hours);
  const { data: dashboardTimeseries, isLoading: dashboardLoading } = useDashboardTimeseries(hours);

  const isLoading = starlinkLoading || dashboardLoading;

  // Format starlink-specific data
  const formatStarlinkData = (
    readings: StarlinkTimeseriesPoint[] | undefined,
    field: keyof StarlinkTimeseriesPoint
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

  // Format dashboard timeseries data as fallback
  const formatDashboardData = (points: { timestamp: string; value: number }[] | undefined): ChartData[] => {
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

  // Get data from starlink readings or fall back to dashboard timeseries
  const signalData = useMemo(() => {
    const starlinkSignal = formatStarlinkData(starlinkData?.readings, 'signal_dbm');
    if (starlinkSignal.length > 0) return starlinkSignal;
    return formatDashboardData(dashboardTimeseries?.signal);
  }, [starlinkData?.readings, dashboardTimeseries?.signal]);

  const powerData = useMemo(() => {
    const starlinkPower = formatStarlinkData(starlinkData?.readings, 'power_w');
    if (starlinkPower.length > 0) return starlinkPower;
    return formatDashboardData(dashboardTimeseries?.power);
  }, [starlinkData?.readings, dashboardTimeseries?.power]);

  const throughputData = useMemo(() => {
    return formatStarlinkData(starlinkData?.readings, 'downlink_throughput_bps');
  }, [starlinkData?.readings]);

  const latencyData = useMemo(() => {
    return formatStarlinkData(starlinkData?.readings, 'pop_ping_latency_ms');
  }, [starlinkData?.readings]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2 mb-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => refetch()}
          title="Refresh data"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StarlinkChart
          title="Signal Strength"
          icon={<Satellite className="w-5 h-5" style={{ color: '#8b5cf6' }} />}
          color="#8b5cf6"
          unit=" dBm"
          data={signalData}
          isLoading={isLoading}
          
        />
        <StarlinkChart
          title="Power Draw"
          icon={<Zap className="w-5 h-5" style={{ color: '#06b6d4' }} />}
          color="#06b6d4"
          unit="W"
          data={powerData}
          isLoading={isLoading}
        />
      </div>
      {(throughputData.length > 0 || latencyData.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {throughputData.length > 0 && (
            <StarlinkChart
              title="Downlink Throughput"
              icon={<Wifi className="w-5 h-5" style={{ color: '#22c55e' }} />}
              color="#22c55e"
              unit=" bps"
              data={throughputData}
              isLoading={isLoading}
              chartType="line"
            />
          )}
          {latencyData.length > 0 && (
            <StarlinkChart
              title="PoP Latency"
              icon={<Signal className="w-5 h-5" style={{ color: '#f59e0b' }} />}
              color="#f59e0b"
              unit="ms"
              data={latencyData}
              isLoading={isLoading}
              chartType="line"
            />
          )}
        </div>
      )}
    </div>
  );
};

export default StarlinkCharts;