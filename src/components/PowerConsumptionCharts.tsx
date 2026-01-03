import { useMemo } from "react";
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  ReferenceLine,
  ReferenceDot
} from "recharts";
import { Zap, Loader2, TrendingUp, TrendingDown } from "lucide-react";
import { useDashboardTimeseries } from "@/hooks/useAuroraApi";

interface ChartData {
  time: string;
  value: number;
  isPeak?: boolean;
}

const PowerConsumptionCharts = () => {
  const { data: timeseries, isLoading } = useDashboardTimeseries(24);

  const formatData = (points: { timestamp: string; value: number }[] | undefined): ChartData[] => {
    if (!points || points.length === 0) return [];
    const data = points.map(p => ({
      time: new Date(p.timestamp).toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit'
      }),
      value: Number(p.value.toFixed(2)),
      isPeak: false,
    }));
    
    // Mark peak values
    if (data.length > 0) {
      const maxValue = Math.max(...data.map(d => d.value));
      data.forEach(d => {
        if (d.value === maxValue) d.isPeak = true;
      });
    }
    
    return data;
  };

  const chartData = useMemo(() => formatData(timeseries?.power), [timeseries?.power]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (chartData.length === 0) return { 
      current: null, avg: null, min: null, max: null, 
      hourlyAvg: null, trend: 'stable' as const,
      peakTime: null, totalKwh: null
    };
    
    const values = chartData.map(d => d.value);
    const current = values[values.length - 1];
    const previous = values.length > 1 ? values[values.length - 2] : current;
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const max = Math.max(...values);
    const peakIndex = values.indexOf(max);
    
    // Estimate kWh (assuming readings are evenly spaced over 24h)
    const totalKwh = (avg * 24) / 1000;
    
    return {
      current,
      avg,
      min: Math.min(...values),
      max,
      hourlyAvg: avg,
      trend: current > previous + 0.5 ? 'up' as const : current < previous - 0.5 ? 'down' as const : 'stable' as const,
      peakTime: chartData[peakIndex]?.time || null,
      totalKwh,
    };
  }, [chartData]);

  const formatValue = (val: number | null) => {
    if (val === null) return '—';
    return val.toFixed(1);
  };

  const formatKwh = (val: number | null) => {
    if (val === null) return '—';
    return val.toFixed(2);
  };

  return (
    <div className="glass-card rounded-xl p-5 border border-border/50">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
            <Zap className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Power Consumption
            </h4>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold text-orange-400">
                {isLoading ? '...' : `${formatValue(stats.current)}W`}
              </p>
              {!isLoading && stats.trend !== 'stable' && (
                <span className={stats.trend === 'up' ? 'text-destructive' : 'text-success'}>
                  {stats.trend === 'up' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                </span>
              )}
            </div>
          </div>
        </div>
        {!isLoading && chartData.length > 0 && (
          <div className="text-right text-xs space-y-0.5">
            <div className="text-muted-foreground">
              Avg: <span className="font-medium text-orange-400">{formatValue(stats.avg)}W</span>
            </div>
            <div className="text-muted-foreground">
              Est. Daily: <span className="text-cyan-400">{formatKwh(stats.totalKwh)} kWh</span>
            </div>
          </div>
        )}
      </div>

      {/* Peak Usage Indicators */}
      {!isLoading && chartData.length > 0 && (
        <div className="flex items-center gap-4 mb-3 text-xs">
          <div className="flex items-center gap-2 px-2 py-1 rounded bg-red-500/10 border border-red-500/20">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-muted-foreground">Peak:</span>
            <span className="font-medium text-red-400">{formatValue(stats.max)}W</span>
            {stats.peakTime && (
              <span className="text-muted-foreground">at {stats.peakTime}</span>
            )}
          </div>
          <div className="flex items-center gap-2 px-2 py-1 rounded bg-green-500/10 border border-green-500/20">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-muted-foreground">Min:</span>
            <span className="font-medium text-green-400">{formatValue(stats.min)}W</span>
          </div>
        </div>
      )}

      <div className="h-[200px]">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
            No power data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradient-power" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0.05} />
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
                tickFormatter={(v) => `${v}W`}
              />
              
              {/* Average line */}
              {stats.avg !== null && (
                <ReferenceLine 
                  y={stats.avg} 
                  stroke="#22c55e" 
                  strokeDasharray="4 4" 
                  strokeOpacity={0.7}
                  label={{ 
                    value: `Avg: ${stats.avg.toFixed(1)}W`, 
                    position: 'right',
                    fontSize: 9,
                    fill: '#22c55e'
                  }}
                />
              )}
              
              {/* Peak indicator */}
              {stats.max !== null && stats.peakTime && (
                <ReferenceDot
                  x={stats.peakTime}
                  y={stats.max}
                  r={6}
                  fill="#ef4444"
                  stroke="#fff"
                  strokeWidth={2}
                />
              )}
              
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
                formatter={(value: number) => {
                  const isPeak = value === stats.max;
                  return [
                    `${value.toFixed(2)}W${isPeak ? ' (PEAK)' : ''}`, 
                    'Power'
                  ];
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#f97316"
                strokeWidth={2}
                fill="url(#gradient-power)"
                dot={false}
                animationDuration={300}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Summary stats */}
      {!isLoading && chartData.length > 0 && (
        <div className="mt-4 pt-3 border-t border-border/50 grid grid-cols-3 gap-4 text-xs">
          <div className="text-center">
            <div className="text-muted-foreground">Hourly Avg</div>
            <div className="font-medium text-orange-400">{formatValue(stats.hourlyAvg)}W</div>
          </div>
          <div className="text-center">
            <div className="text-muted-foreground">Peak Usage</div>
            <div className="font-medium text-red-400">{formatValue(stats.max)}W</div>
          </div>
          <div className="text-center">
            <div className="text-muted-foreground">Est. Daily</div>
            <div className="font-medium text-cyan-400">{formatKwh(stats.totalKwh)} kWh</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PowerConsumptionCharts;