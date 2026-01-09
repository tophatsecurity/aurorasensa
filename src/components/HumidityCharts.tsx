import { useMemo, useState } from "react";
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  ReferenceLine,
  ReferenceArea
} from "recharts";
import { Droplets, Loader2, RefreshCw } from "lucide-react";
import { useDashboardTimeseries } from "@/hooks/useAuroraApi";
import { useArduinoRealTime } from "@/hooks/useSSE";
import { SSEConnectionStatus } from "./SSEConnectionStatus";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface ChartData {
  time: string;
  value: number;
}

// Comfort zone definitions
const COMFORT_ZONES = {
  dry: { min: 0, max: 30, color: '#f59e0b', label: 'Dry' },
  comfortable: { min: 30, max: 60, color: '#22c55e', label: 'Comfortable' },
  humid: { min: 60, max: 100, color: '#3b82f6', label: 'Humid' },
};

interface HumidityChartsProps {
  hours?: number;
  clientId?: string;
}

const HumidityCharts = ({ hours = 24, clientId }: HumidityChartsProps) => {
  const [realTimeEnabled, setRealTimeEnabled] = useState(true);
  
  const { data: timeseries, isLoading, refetch } = useDashboardTimeseries(hours);
  
  // Polling-based real-time updates (replaces SSE)
  const realTimeData = useArduinoRealTime(realTimeEnabled, clientId);

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

  const chartData = useMemo(() => formatData(timeseries?.humidity), [timeseries?.humidity]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (chartData.length === 0) return { current: null, avg: null, min: null, max: null, timeInComfort: 0 };
    const values = chartData.map(d => d.value);
    const inComfort = values.filter(v => v >= 30 && v <= 60).length;
    return {
      current: values[values.length - 1],
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      timeInComfort: Math.round((inComfort / values.length) * 100),
    };
  }, [chartData]);

  const getComfortZone = (humidity: number | null) => {
    if (humidity === null) return null;
    if (humidity < 30) return COMFORT_ZONES.dry;
    if (humidity <= 60) return COMFORT_ZONES.comfortable;
    return COMFORT_ZONES.humid;
  };

  const currentZone = getComfortZone(stats.current);

  const formatValue = (val: number | null) => {
    if (val === null) return '—';
    return val.toFixed(1);
  };

  return (
    <div className="glass-card rounded-xl p-5 border border-border/50">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <Droplets className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              Humidity Level
              <SSEConnectionStatus
                isConnected={realTimeData.isConnected}
                isConnecting={realTimeData.isConnecting}
                error={realTimeData.error?.message || null}
                reconnectCount={realTimeData.reconnectCount}
                onReconnect={realTimeData.reconnect}
              />
            </h4>
            <p className="text-2xl font-bold text-blue-400">
              {isLoading ? '...' : `${formatValue(stats.current)}%`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {!isLoading && chartData.length > 0 && (
            <div className="text-right text-xs space-y-0.5">
              <div className="text-muted-foreground">
                Avg: <span className="font-medium text-blue-400">{formatValue(stats.avg)}%</span>
              </div>
              <div className="text-muted-foreground">
                Min/Max: {formatValue(stats.min)}% / {formatValue(stats.max)}%
              </div>
              <div className="text-muted-foreground">
                Comfort: <span className="text-success">{stats.timeInComfort}%</span> of time
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => refetch()}
            title="Refresh data"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Switch
              id="realtime-toggle-humidity"
              checked={realTimeEnabled}
              onCheckedChange={setRealTimeEnabled}
            />
            <Label htmlFor="realtime-toggle-humidity" className="text-xs text-muted-foreground">
              Live
            </Label>
          </div>
        </div>
      </div>

      {/* Comfort Zone Legend */}
      <div className="flex items-center gap-4 mb-3 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-amber-500/30 border border-amber-500/50" />
          <span className="text-muted-foreground">Dry (&lt;30%)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-green-500/30 border border-green-500/50" />
          <span className="text-muted-foreground">Comfortable (30-60%)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-blue-500/30 border border-blue-500/50" />
          <span className="text-muted-foreground">Humid (&gt;60%)</span>
        </div>
      </div>

      <div className="h-[200px]">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
            No humidity data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradient-humidity" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              
              {/* Comfort zone background bands */}
              <ReferenceArea 
                y1={0} 
                y2={30} 
                fill="#f59e0b" 
                fillOpacity={0.08}
                strokeOpacity={0}
              />
              <ReferenceArea 
                y1={30} 
                y2={60} 
                fill="#22c55e" 
                fillOpacity={0.08}
                strokeOpacity={0}
              />
              <ReferenceArea 
                y1={60} 
                y2={100} 
                fill="#3b82f6" 
                fillOpacity={0.08}
                strokeOpacity={0}
              />
              
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
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
              />
              
              {/* Comfort zone boundary lines */}
              <ReferenceLine 
                y={30} 
                stroke="#f59e0b" 
                strokeDasharray="4 4" 
                strokeOpacity={0.5}
              />
              <ReferenceLine 
                y={60} 
                stroke="#3b82f6" 
                strokeDasharray="4 4" 
                strokeOpacity={0.5}
              />
              
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
                formatter={(value: number) => {
                  const zone = getComfortZone(value);
                  return [`${value.toFixed(1)}% (${zone?.label || 'Unknown'})`, 'Humidity'];
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#gradient-humidity)"
                dot={false}
                animationDuration={300}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Status indicator */}
      {!isLoading && chartData.length > 0 && currentZone && (
        <div className="mt-4 pt-3 border-t border-border/50">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Current Status:</span>
            <div className="flex items-center gap-2">
              <div 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: currentZone.color }}
              />
              <span style={{ color: currentZone.color }} className="font-medium">
                {currentZone.label} Zone
              </span>
              <span className="text-muted-foreground">
                ({stats.current !== null && stats.current < 30 
                  ? 'Consider using a humidifier' 
                  : stats.current !== null && stats.current > 60 
                    ? 'Consider dehumidifying' 
                    : 'Optimal comfort level'})
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HumidityCharts;