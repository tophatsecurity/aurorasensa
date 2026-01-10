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
  Line,
  Legend
} from "recharts";
import { Thermometer, Loader2, RefreshCw } from "lucide-react";
import { useThermalProbeTimeseries, useDashboardTimeseries, ThermalProbeTimeseriesPoint } from "@/hooks/useAuroraApi";
import { useThermalProbeRealTime } from "@/hooks/useSSE";
import { SSEConnectionStatus } from "./SSEConnectionStatus";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface ChartData {
  time: string;
  temp_c?: number;
  ambient_c?: number;
  probe_c?: number;
  [key: string]: string | number | undefined;
}

interface ThermalProbeChartsProps {
  hours?: number;
  clientId?: string;
}

const ThermalProbeCharts = ({ hours = 24, clientId }: ThermalProbeChartsProps) => {
  const [realTimeEnabled, setRealTimeEnabled] = useState(true);
  
  const { data: thermalData, isLoading: thermalLoading, refetch } = useThermalProbeTimeseries(hours);
  const { data: dashboardTimeseries, isLoading: dashboardLoading } = useDashboardTimeseries(hours);
  
  // Polling-based real-time updates (replaces SSE)
  const realTimeData = useThermalProbeRealTime(realTimeEnabled, clientId);

  const isLoading = thermalLoading || dashboardLoading;

  // Format thermal probe data for multi-line chart
  const formatThermalData = (readings: ThermalProbeTimeseriesPoint[] | undefined): ChartData[] => {
    if (!readings || readings.length === 0) return [];
    
    // Filter out readings with no actual temperature data
    const validReadings = readings.filter(r => 
      r.temp_c !== undefined || r.ambient_c !== undefined || r.probe_c !== undefined
    );
    
    if (validReadings.length === 0) return [];
    
    return validReadings.map(r => ({
      time: new Date(r.timestamp).toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit'
      }),
      temp_c: r.temp_c !== undefined ? Number(r.temp_c) : undefined,
      ambient_c: r.ambient_c !== undefined ? Number(r.ambient_c) : undefined,
      probe_c: r.probe_c !== undefined ? Number(r.probe_c) : undefined,
    }));
  };

  // Format dashboard temperature - this is the reliable data source
  const formatDashboardTemp = (points: { timestamp: string; value: number }[] | undefined): ChartData[] => {
    if (!points || points.length === 0) return [];
    return points.map(p => ({
      time: new Date(p.timestamp).toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit'
      }),
      temp_c: Number(p.value.toFixed(1)),
    }));
  };

  const chartData = useMemo(() => {
    // First try thermal probe specific data
    const thermalFormatted = formatThermalData(thermalData?.readings);
    if (thermalFormatted.length > 0) {
      return thermalFormatted;
    }
    
    // Fall back to dashboard timeseries which has real data
    return formatDashboardTemp(dashboardTimeseries?.temperature);
  }, [thermalData?.readings, dashboardTimeseries?.temperature]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (chartData.length === 0) return { current: null, avg: null, min: null, max: null };
    const temps = chartData.map(d => d.temp_c ?? d.probe_c ?? d.ambient_c).filter(v => v !== undefined) as number[];
    if (temps.length === 0) return { current: null, avg: null, min: null, max: null };
    return {
      current: temps[temps.length - 1],
      avg: temps.reduce((a, b) => a + b, 0) / temps.length,
      min: Math.min(...temps),
      max: Math.max(...temps),
    };
  }, [chartData]);

  // Check which data series are available
  const hasProbeC = chartData.some(d => d.probe_c !== undefined);
  const hasAmbientC = chartData.some(d => d.ambient_c !== undefined);
  const hasTempC = chartData.some(d => d.temp_c !== undefined);

  const formatValue = (val: number | null) => {
    if (val === null) return '—';
    return val.toFixed(1);
  };

  const toFahrenheit = (celsius: number | null) => {
    if (celsius === null) return null;
    return (celsius * 9/5) + 32;
  };

  const formatDualTemp = (celsius: number | null) => {
    if (celsius === null) return '—';
    const f = toFahrenheit(celsius);
    return `${f?.toFixed(1)}°F / ${celsius.toFixed(1)}°C`;
  };

  return (
    <div className="glass-card rounded-xl p-5 border border-border/50">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
            <Thermometer className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              Thermal Probe Temperature
              <SSEConnectionStatus
                isConnected={realTimeData.isConnected}
                isConnecting={realTimeData.isConnecting}
                error={realTimeData.error || null}
                reconnectCount={realTimeData.reconnectCount}
                onReconnect={realTimeData.reconnect}
              />
            </h4>
            <p className="text-2xl font-bold text-red-400">
              {isLoading ? '...' : formatDualTemp(stats.current)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {!isLoading && chartData.length > 0 && (
            <div className="text-right text-xs space-y-0.5">
              <div className="text-muted-foreground">
                Avg: <span className="font-medium text-red-400">{formatDualTemp(stats.avg)}</span>
              </div>
              <div className="text-muted-foreground">
                Min: {formatDualTemp(stats.min)}
              </div>
              <div className="text-muted-foreground">
                Max: {formatDualTemp(stats.max)}
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
              id="realtime-toggle-thermal"
              checked={realTimeEnabled}
              onCheckedChange={setRealTimeEnabled}
            />
            <Label htmlFor="realtime-toggle-thermal" className="text-xs text-muted-foreground">
              Live
            </Label>
          </div>
        </div>
      </div>

      <div className="h-[200px] mt-2">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
            No thermal probe data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {(hasProbeC || hasAmbientC) ? (
              <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
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
                  tickFormatter={(v) => `${v}°`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                  formatter={(value: number, name: string) => {
                    const label = name === 'probe_c' ? 'Probe' : name === 'ambient_c' ? 'Ambient' : 'Temperature';
                    const fahrenheit = ((value * 9/5) + 32).toFixed(1);
                    return [`${fahrenheit}°F / ${value.toFixed(1)}°C`, label];
                  }}
                />
                <Legend 
                  wrapperStyle={{ fontSize: '10px' }}
                  formatter={(value) => value === 'probe_c' ? 'Probe' : value === 'ambient_c' ? 'Ambient' : 'Temp'}
                />
                {hasProbeC && (
                  <Line
                    type="monotone"
                    dataKey="probe_c"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={false}
                    animationDuration={300}
                  />
                )}
                {hasAmbientC && (
                  <Line
                    type="monotone"
                    dataKey="ambient_c"
                    stroke="#f97316"
                    strokeWidth={2}
                    dot={false}
                    animationDuration={300}
                  />
                )}
                {hasTempC && !hasProbeC && (
                  <Line
                    type="monotone"
                    dataKey="temp_c"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={false}
                    animationDuration={300}
                  />
                )}
              </LineChart>
            ) : (
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradient-thermal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
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
                  tickFormatter={(v) => `${v}°`}
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
                    const fahrenheit = ((value * 9/5) + 32).toFixed(1);
                    return [`${fahrenheit}°F / ${value.toFixed(1)}°C`, 'Temperature'];
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="temp_c"
                  stroke="#ef4444"
                  strokeWidth={2}
                  fill="url(#gradient-thermal)"
                  dot={false}
                  animationDuration={300}
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        )}
      </div>

      {/* Temperature scale indicator */}
      {!isLoading && chartData.length > 0 && stats.current !== null && (
        <div className="mt-4 pt-3 border-t border-border/50">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Temperature Status:</span>
            <span className={
              stats.current < 10 ? "text-blue-400" :
              stats.current < 25 ? "text-success" :
              stats.current < 35 ? "text-warning" :
              "text-destructive"
            }>
              {stats.current < 10 ? "Cold" :
               stats.current < 25 ? "Normal" :
               stats.current < 35 ? "Warm" :
               "Hot"} ({formatDualTemp(stats.current)})
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThermalProbeCharts;