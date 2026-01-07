import { useMemo, useState } from "react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  ComposedChart,
  Area,
} from "recharts";
import { 
  Activity, 
  Zap, 
  Thermometer, 
  Loader2,
  TrendingUp,
  GitCompare
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  useStarlinkTimeseries,
  useDashboardTimeseries,
} from "@/hooks/useAuroraApi";

const CorrelationContent = () => {
  const [timeRange, setTimeRange] = useState<number>(24);
  
  const { data: starlinkData, isLoading: starlinkLoading } = useStarlinkTimeseries(timeRange);
  const { data: dashboardData, isLoading: dashboardLoading } = useDashboardTimeseries(timeRange);

  const isLoading = starlinkLoading || dashboardLoading;

  // Merge Starlink power and temperature data by timestamp
  const correlatedData = useMemo(() => {
    if (!starlinkData?.readings && !dashboardData?.temperature) return [];

    // Create a map of timestamps to data points
    const dataMap = new Map<string, { time: string; power?: number; temperature?: number }>();

    // Process Starlink power data
    if (starlinkData?.readings) {
      starlinkData.readings.forEach(reading => {
        const time = new Date(reading.timestamp).toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
        });
        const existing = dataMap.get(time) || { time };
        existing.power = reading.power_w ?? undefined;
        dataMap.set(time, existing);
      });
    }

    // Process temperature data
    if (dashboardData?.temperature) {
      dashboardData.temperature.forEach(point => {
        const time = new Date(point.timestamp).toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
        });
        const existing = dataMap.get(time) || { time };
        existing.temperature = point.value;
        dataMap.set(time, existing);
      });
    }

    // Convert map to sorted array
    return Array.from(dataMap.values())
      .filter(d => d.power !== undefined || d.temperature !== undefined)
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [starlinkData, dashboardData]);

  // Calculate correlation stats
  const stats = useMemo(() => {
    const validPoints = correlatedData.filter(d => d.power !== undefined && d.temperature !== undefined);
    
    if (validPoints.length < 2) {
      return { avgPower: 0, avgTemp: 0, correlation: 0, dataPoints: 0 };
    }

    const avgPower = validPoints.reduce((sum, d) => sum + (d.power || 0), 0) / validPoints.length;
    const avgTemp = validPoints.reduce((sum, d) => sum + (d.temperature || 0), 0) / validPoints.length;

    // Calculate Pearson correlation coefficient
    const n = validPoints.length;
    const sumXY = validPoints.reduce((sum, d) => sum + (d.power || 0) * (d.temperature || 0), 0);
    const sumX = validPoints.reduce((sum, d) => sum + (d.power || 0), 0);
    const sumY = validPoints.reduce((sum, d) => sum + (d.temperature || 0), 0);
    const sumX2 = validPoints.reduce((sum, d) => sum + (d.power || 0) ** 2, 0);
    const sumY2 = validPoints.reduce((sum, d) => sum + (d.temperature || 0) ** 2, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX ** 2) * (n * sumY2 - sumY ** 2));
    const correlation = denominator !== 0 ? numerator / denominator : 0;

    return { avgPower, avgTemp, correlation, dataPoints: validPoints.length };
  }, [correlatedData]);

  const getCorrelationLabel = (r: number) => {
    const abs = Math.abs(r);
    if (abs >= 0.7) return r > 0 ? "Strong Positive" : "Strong Negative";
    if (abs >= 0.4) return r > 0 ? "Moderate Positive" : "Moderate Negative";
    if (abs >= 0.2) return r > 0 ? "Weak Positive" : "Weak Negative";
    return "No Correlation";
  };

  const getCorrelationColor = (r: number) => {
    const abs = Math.abs(r);
    if (abs >= 0.7) return r > 0 ? "text-emerald-400" : "text-rose-400";
    if (abs >= 0.4) return r > 0 ? "text-cyan-400" : "text-amber-400";
    return "text-muted-foreground";
  };

  return (
    <div className="flex-1 overflow-y-auto p-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8 flex-wrap">
        <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
          <GitCompare className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Correlation Analysis</h1>
          <p className="text-muted-foreground">
            Starlink Power vs Temperature over time
          </p>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <Select value={timeRange.toString()} onValueChange={(v) => setTimeRange(Number(v))}>
            <SelectTrigger className="w-[150px] bg-background border-border">
              <SelectValue placeholder="Time range" />
            </SelectTrigger>
            <SelectContent className="bg-background border-border z-50">
              <SelectItem value="6">Last 6 hours</SelectItem>
              <SelectItem value="12">Last 12 hours</SelectItem>
              <SelectItem value="24">Last 24 hours</SelectItem>
              <SelectItem value="48">Last 48 hours</SelectItem>
              <SelectItem value="72">Last 72 hours</SelectItem>
            </SelectContent>
          </Select>
          <Badge className="bg-primary/20 text-primary border-primary/30">
            {isLoading ? 'Loading...' : 'Live'}
          </Badge>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="glass-card rounded-xl p-4 border border-border/50">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Avg Power</p>
              <p className="text-xl font-bold text-amber-400">
                {isLoading ? '...' : `${stats.avgPower.toFixed(1)} W`}
              </p>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-4 border border-border/50">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
              <Thermometer className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Avg Temp</p>
              <p className="text-xl font-bold text-cyan-400">
                {isLoading ? '...' : `${stats.avgTemp.toFixed(1)} °C`}
              </p>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-4 border border-border/50">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Correlation</p>
              <p className={`text-xl font-bold ${getCorrelationColor(stats.correlation)}`}>
                {isLoading ? '...' : stats.correlation.toFixed(3)}
              </p>
              <p className="text-xs text-muted-foreground">
                {getCorrelationLabel(stats.correlation)}
              </p>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-4 border border-border/50">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <Activity className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Data Points</p>
              <p className="text-xl font-bold text-emerald-400">
                {isLoading ? '...' : stats.dataPoints}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Combined Chart */}
      <div className="glass-card rounded-xl border border-border/50 mb-8">
        <div className="p-4 border-b border-border/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <GitCompare className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h4 className="font-semibold text-sm">Power & Temperature Correlation</h4>
              <p className="text-xs text-muted-foreground">Last {timeRange} hours</p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            {correlatedData.length} samples
          </Badge>
        </div>
        <div className="p-4">
          {isLoading ? (
            <div className="h-[400px] flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : correlatedData.length === 0 ? (
            <div className="h-[400px] flex items-center justify-center text-muted-foreground">
              No data available for the selected time range
            </div>
          ) : (
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={correlatedData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="powerGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
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
                    yAxisId="power"
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${v}W`}
                    label={{ value: 'Power (W)', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#f59e0b' }}
                  />
                  <YAxis
                    yAxisId="temp"
                    orientation="right"
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${v}°C`}
                    label={{ value: 'Temp (°C)', angle: 90, position: 'insideRight', fontSize: 10, fill: '#06b6d4' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(value: number, name: string) => {
                      if (name === 'power') return [`${value?.toFixed(1)} W`, 'Power'];
                      if (name === 'temperature') return [`${value?.toFixed(1)} °C`, 'Temperature'];
                      return [value, name];
                    }}
                  />
                  <Legend />
                  <Area
                    yAxisId="power"
                    type="monotone"
                    dataKey="power"
                    name="Power"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    fill="url(#powerGradient)"
                    connectNulls
                  />
                  <Line
                    yAxisId="temp"
                    type="monotone"
                    dataKey="temperature"
                    name="Temperature"
                    stroke="#06b6d4"
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Individual Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Power Chart */}
        <div className="glass-card rounded-xl border border-border/50">
          <div className="p-4 border-b border-border/30 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <Zap className="w-4 h-4 text-amber-400" />
            </div>
            <h4 className="font-semibold text-sm">Starlink Power Consumption</h4>
          </div>
          <div className="p-4">
            {isLoading ? (
              <div className="h-[250px] flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={correlatedData.filter(d => d.power !== undefined)} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
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
                      tickFormatter={(v) => `${v}W`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                      formatter={(value: number) => [`${value?.toFixed(1)} W`, 'Power']}
                    />
                    <Line
                      type="monotone"
                      dataKey="power"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={false}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Temperature Chart */}
        <div className="glass-card rounded-xl border border-border/50">
          <div className="p-4 border-b border-border/30 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
              <Thermometer className="w-4 h-4 text-cyan-400" />
            </div>
            <h4 className="font-semibold text-sm">Temperature Over Time</h4>
          </div>
          <div className="p-4">
            {isLoading ? (
              <div className="h-[250px] flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={correlatedData.filter(d => d.temperature !== undefined)} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
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
                      tickFormatter={(v) => `${v}°C`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                      formatter={(value: number) => [`${value?.toFixed(1)} °C`, 'Temperature']}
                    />
                    <Line
                      type="monotone"
                      dataKey="temperature"
                      stroke="#06b6d4"
                      strokeWidth={2}
                      dot={false}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CorrelationContent;
