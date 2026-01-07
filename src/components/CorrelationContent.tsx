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
  ScatterChart,
  Scatter,
} from "recharts";
import { 
  Activity, 
  Zap, 
  Thermometer, 
  Loader2,
  TrendingUp,
  GitCompare,
  Droplets,
  Radio,
  Wifi
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

interface CorrelationStats {
  avgX: number;
  avgY: number;
  correlation: number;
  dataPoints: number;
}

const calculateCorrelation = (
  data: Array<{ x?: number; y?: number }>
): CorrelationStats => {
  const validPoints = data.filter(d => d.x !== undefined && d.y !== undefined);
  
  if (validPoints.length < 2) {
    return { avgX: 0, avgY: 0, correlation: 0, dataPoints: 0 };
  }

  const avgX = validPoints.reduce((sum, d) => sum + (d.x || 0), 0) / validPoints.length;
  const avgY = validPoints.reduce((sum, d) => sum + (d.y || 0), 0) / validPoints.length;

  const n = validPoints.length;
  const sumXY = validPoints.reduce((sum, d) => sum + (d.x || 0) * (d.y || 0), 0);
  const sumX = validPoints.reduce((sum, d) => sum + (d.x || 0), 0);
  const sumY = validPoints.reduce((sum, d) => sum + (d.y || 0), 0);
  const sumX2 = validPoints.reduce((sum, d) => sum + (d.x || 0) ** 2, 0);
  const sumY2 = validPoints.reduce((sum, d) => sum + (d.y || 0) ** 2, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX ** 2) * (n * sumY2 - sumY ** 2));
  const correlation = denominator !== 0 ? numerator / denominator : 0;

  return { avgX, avgY, correlation, dataPoints: validPoints.length };
};

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

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue?: string;
  colorClass?: string;
  isLoading?: boolean;
}

const StatCard = ({ icon, label, value, subValue, colorClass = "text-foreground", isLoading }: StatCardProps) => (
  <div className="glass-card rounded-xl p-4 border border-border/50">
    <div className="flex items-center gap-3 mb-2">
      {icon}
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className={`text-xl font-bold ${colorClass}`}>
          {isLoading ? '...' : value}
        </p>
        {subValue && <p className="text-xs text-muted-foreground">{subValue}</p>}
      </div>
    </div>
  </div>
);

interface CorrelationChartProps {
  data: Array<{ time: string; x?: number; y?: number }>;
  xLabel: string;
  yLabel: string;
  xUnit: string;
  yUnit: string;
  xColor: string;
  yColor: string;
  isLoading: boolean;
  hours: number;
}

const CorrelationChart = ({ 
  data, xLabel, yLabel, xUnit, yUnit, xColor, yColor, isLoading, hours 
}: CorrelationChartProps) => (
  <div className="glass-card rounded-xl border border-border/50">
    <div className="p-4 border-b border-border/30 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
          <GitCompare className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h4 className="font-semibold text-sm">{xLabel} vs {yLabel}</h4>
          <p className="text-xs text-muted-foreground">Last {hours} hours</p>
        </div>
      </div>
      <Badge variant="outline" className="text-xs">
        {data.length} samples
      </Badge>
    </div>
    <div className="p-4">
      {isLoading ? (
        <div className="h-[350px] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : data.length === 0 ? (
        <div className="h-[350px] flex items-center justify-center text-muted-foreground">
          No data available
        </div>
      ) : (
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`gradient-${xLabel}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={xColor} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={xColor} stopOpacity={0} />
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
                yAxisId="x"
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}${xUnit}`}
              />
              <YAxis
                yAxisId="y"
                orientation="right"
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}${yUnit}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(value: number, name: string) => {
                  if (name === 'x') return [`${value?.toFixed(1)}${xUnit}`, xLabel];
                  if (name === 'y') return [`${value?.toFixed(1)}${yUnit}`, yLabel];
                  return [value, name];
                }}
              />
              <Legend formatter={(value) => value === 'x' ? xLabel : yLabel} />
              <Area
                yAxisId="x"
                type="monotone"
                dataKey="x"
                name="x"
                stroke={xColor}
                strokeWidth={2}
                fill={`url(#gradient-${xLabel})`}
                connectNulls
              />
              <Line
                yAxisId="y"
                type="monotone"
                dataKey="y"
                name="y"
                stroke={yColor}
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
);

const CorrelationContent = () => {
  const [timeRange, setTimeRange] = useState<number>(24);
  const [activeTab, setActiveTab] = useState("throughput-temp");
  
  const { data: starlinkData, isLoading: starlinkLoading } = useStarlinkTimeseries(timeRange);
  const { data: dashboardData, isLoading: dashboardLoading } = useDashboardTimeseries(timeRange);

  const isLoading = starlinkLoading || dashboardLoading;

  // Helper to format timestamp
  const formatTime = (timestamp: string) => 
    new Date(timestamp).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });

  // Correlation 1: Throughput vs Temperature (Starlink throughput correlates with ambient temp)
  const throughputTempData = useMemo(() => {
    const dataMap = new Map<string, { time: string; x?: number; y?: number }>();

    starlinkData?.readings?.forEach(r => {
      const time = formatTime(r.timestamp);
      const existing = dataMap.get(time) || { time };
      // Convert bps to Mbps for readability
      existing.x = r.downlink_throughput_bps ? r.downlink_throughput_bps / 1e6 : undefined;
      dataMap.set(time, existing);
    });

    dashboardData?.temperature?.forEach(p => {
      const time = formatTime(p.timestamp);
      const existing = dataMap.get(time) || { time };
      existing.y = p.value;
      dataMap.set(time, existing);
    });

    return Array.from(dataMap.values())
      .filter(d => d.x !== undefined || d.y !== undefined)
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [starlinkData, dashboardData]);

  // Correlation 2: Latency vs Humidity (Weather proxy)
  const latencyHumidityData = useMemo(() => {
    const dataMap = new Map<string, { time: string; x?: number; y?: number }>();

    starlinkData?.readings?.forEach(r => {
      const time = formatTime(r.timestamp);
      const existing = dataMap.get(time) || { time };
      existing.x = r.pop_ping_latency_ms ?? undefined;
      dataMap.set(time, existing);
    });

    dashboardData?.humidity?.forEach(p => {
      const time = formatTime(p.timestamp);
      const existing = dataMap.get(time) || { time };
      existing.y = p.value;
      dataMap.set(time, existing);
    });

    return Array.from(dataMap.values())
      .filter(d => d.x !== undefined || d.y !== undefined)
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [starlinkData, dashboardData]);

  // Correlation 3: Obstruction vs Network Throughput
  const obstructionThroughputData = useMemo(() => {
    if (!starlinkData?.readings) return [];

    return starlinkData.readings
      .filter(r => r.obstruction_percent !== undefined || r.downlink_throughput_bps !== undefined)
      .map(r => ({
        time: formatTime(r.timestamp),
        x: r.obstruction_percent ?? undefined,
        y: r.downlink_throughput_bps ? r.downlink_throughput_bps / 1e6 : undefined, // Convert to Mbps
      }))
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [starlinkData]);

  // Correlation 4: Latency vs Throughput (inverse relationship expected)
  const latencyThroughputData = useMemo(() => {
    if (!starlinkData?.readings) return [];

    return starlinkData.readings
      .filter(r => r.pop_ping_latency_ms !== undefined || r.downlink_throughput_bps !== undefined)
      .map(r => ({
        time: formatTime(r.timestamp),
        x: r.pop_ping_latency_ms ?? undefined,
        y: r.downlink_throughput_bps ? r.downlink_throughput_bps / 1e6 : undefined,
      }))
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [starlinkData]);

  // Calculate stats for each pair
  const throughputTempStats = useMemo(() => calculateCorrelation(throughputTempData), [throughputTempData]);
  const latencyHumidityStats = useMemo(() => calculateCorrelation(latencyHumidityData), [latencyHumidityData]);
  const obstructionThroughputStats = useMemo(() => calculateCorrelation(obstructionThroughputData), [obstructionThroughputData]);
  const latencyThroughputStats = useMemo(() => calculateCorrelation(latencyThroughputData), [latencyThroughputData]);

  const correlationPairs = [
    { id: "throughput-temp", label: "Throughput vs Temp", icon: <Zap className="w-4 h-4" /> },
    { id: "latency-humidity", label: "Latency vs Humidity", icon: <Droplets className="w-4 h-4" /> },
    { id: "obstruction-throughput", label: "Obstruction vs Network", icon: <Wifi className="w-4 h-4" /> },
    { id: "latency-throughput", label: "Latency vs Throughput", icon: <Radio className="w-4 h-4" /> },
  ];

  const getCurrentData = () => {
    switch (activeTab) {
      case "throughput-temp": return { data: throughputTempData, stats: throughputTempStats, xLabel: "Download", yLabel: "Temperature", xUnit: "Mbps", yUnit: "°C", xColor: "#06b6d4", yColor: "#f59e0b" };
      case "latency-humidity": return { data: latencyHumidityData, stats: latencyHumidityStats, xLabel: "Latency", yLabel: "Humidity", xUnit: "ms", yUnit: "%", xColor: "#8b5cf6", yColor: "#22c55e" };
      case "obstruction-throughput": return { data: obstructionThroughputData, stats: obstructionThroughputStats, xLabel: "Obstruction", yLabel: "Download", xUnit: "%", yUnit: "Mbps", xColor: "#ef4444", yColor: "#06b6d4" };
      case "latency-throughput": return { data: latencyThroughputData, stats: latencyThroughputStats, xLabel: "Latency", yLabel: "Download", xUnit: "ms", yUnit: "Mbps", xColor: "#8b5cf6", yColor: "#06b6d4" };
      default: return { data: throughputTempData, stats: throughputTempStats, xLabel: "Download", yLabel: "Temperature", xUnit: "Mbps", yUnit: "°C", xColor: "#06b6d4", yColor: "#f59e0b" };
    }
  };

  const current = getCurrentData();

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
            Analyze relationships between sensor metrics
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

      {/* Correlation Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div 
          className={`glass-card rounded-xl p-4 border cursor-pointer transition-all ${activeTab === 'throughput-temp' ? 'border-cyan-500/50 bg-cyan-500/10' : 'border-border/50 hover:border-border'}`}
          onClick={() => setActiveTab('throughput-temp')}
        >
          <div className="flex items-center gap-2 mb-2">
            <Wifi className="w-4 h-4 text-cyan-400" />
            <Thermometer className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-xs text-muted-foreground">Throughput ↔ Temperature</p>
          <p className={`text-lg font-bold ${getCorrelationColor(throughputTempStats.correlation)}`}>
            r = {throughputTempStats.correlation.toFixed(3)}
          </p>
          <p className="text-xs text-muted-foreground">{getCorrelationLabel(throughputTempStats.correlation)}</p>
        </div>

        <div 
          className={`glass-card rounded-xl p-4 border cursor-pointer transition-all ${activeTab === 'latency-humidity' ? 'border-violet-500/50 bg-violet-500/10' : 'border-border/50 hover:border-border'}`}
          onClick={() => setActiveTab('latency-humidity')}
        >
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-violet-400" />
            <Droplets className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-xs text-muted-foreground">Latency ↔ Humidity</p>
          <p className={`text-lg font-bold ${getCorrelationColor(latencyHumidityStats.correlation)}`}>
            r = {latencyHumidityStats.correlation.toFixed(3)}
          </p>
          <p className="text-xs text-muted-foreground">{getCorrelationLabel(latencyHumidityStats.correlation)}</p>
        </div>

        <div 
          className={`glass-card rounded-xl p-4 border cursor-pointer transition-all ${activeTab === 'obstruction-throughput' ? 'border-red-500/50 bg-red-500/10' : 'border-border/50 hover:border-border'}`}
          onClick={() => setActiveTab('obstruction-throughput')}
        >
          <div className="flex items-center gap-2 mb-2">
            <Radio className="w-4 h-4 text-red-400" />
            <Wifi className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-xs text-muted-foreground">Obstruction ↔ Network</p>
          <p className={`text-lg font-bold ${getCorrelationColor(obstructionThroughputStats.correlation)}`}>
            r = {obstructionThroughputStats.correlation.toFixed(3)}
          </p>
          <p className="text-xs text-muted-foreground">{getCorrelationLabel(obstructionThroughputStats.correlation)}</p>
        </div>

        <div 
          className={`glass-card rounded-xl p-4 border cursor-pointer transition-all ${activeTab === 'latency-throughput' ? 'border-violet-500/50 bg-violet-500/10' : 'border-border/50 hover:border-border'}`}
          onClick={() => setActiveTab('latency-throughput')}
        >
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-violet-400" />
            <Wifi className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-xs text-muted-foreground">Latency ↔ Throughput</p>
          <p className={`text-lg font-bold ${getCorrelationColor(latencyThroughputStats.correlation)}`}>
            r = {latencyThroughputStats.correlation.toFixed(3)}
          </p>
          <p className="text-xs text-muted-foreground">{getCorrelationLabel(latencyThroughputStats.correlation)}</p>
        </div>
      </div>

      {/* Stats for Selected Pair */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={<div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center"><TrendingUp className="w-5 h-5" style={{ color: current.xColor }} /></div>}
          label={`Avg ${current.xLabel}`}
          value={`${current.stats.avgX.toFixed(1)} ${current.xUnit}`}
          colorClass="text-amber-400"
          isLoading={isLoading}
        />
        <StatCard
          icon={<div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center"><TrendingUp className="w-5 h-5" style={{ color: current.yColor }} /></div>}
          label={`Avg ${current.yLabel}`}
          value={`${current.stats.avgY.toFixed(1)} ${current.yUnit}`}
          colorClass="text-cyan-400"
          isLoading={isLoading}
        />
        <StatCard
          icon={<div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center"><GitCompare className="w-5 h-5 text-violet-400" /></div>}
          label="Correlation"
          value={current.stats.correlation.toFixed(3)}
          subValue={getCorrelationLabel(current.stats.correlation)}
          colorClass={getCorrelationColor(current.stats.correlation)}
          isLoading={isLoading}
        />
        <StatCard
          icon={<div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center"><Activity className="w-5 h-5 text-emerald-400" /></div>}
          label="Data Points"
          value={current.stats.dataPoints.toString()}
          colorClass="text-emerald-400"
          isLoading={isLoading}
        />
      </div>

      {/* Main Chart */}
      <CorrelationChart
        data={current.data}
        xLabel={current.xLabel}
        yLabel={current.yLabel}
        xUnit={current.xUnit}
        yUnit={current.yUnit}
        xColor={current.xColor}
        yColor={current.yColor}
        isLoading={isLoading}
        hours={timeRange}
      />

      {/* Scatter Plot */}
      <div className="glass-card rounded-xl border border-border/50 mt-6">
        <div className="p-4 border-b border-border/30 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h4 className="font-semibold text-sm">Scatter Plot: {current.xLabel} vs {current.yLabel}</h4>
            <p className="text-xs text-muted-foreground">Direct relationship visualization</p>
          </div>
        </div>
        <div className="p-4">
          {isLoading ? (
            <div className="h-[300px] flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : current.data.filter(d => d.x !== undefined && d.y !== undefined).length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No paired data available
            </div>
          ) : (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis
                    dataKey="x"
                    type="number"
                    name={current.xLabel}
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${v}${current.xUnit}`}
                    label={{ value: `${current.xLabel} (${current.xUnit})`, position: 'bottom', fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis
                    dataKey="y"
                    type="number"
                    name={current.yLabel}
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${v}${current.yUnit}`}
                    label={{ value: `${current.yLabel} (${current.yUnit})`, angle: -90, position: 'insideLeft', fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(value: number, name: string) => {
                      if (name === current.xLabel) return [`${value?.toFixed(1)} ${current.xUnit}`, current.xLabel];
                      if (name === current.yLabel) return [`${value?.toFixed(1)} ${current.yUnit}`, current.yLabel];
                      return [value, name];
                    }}
                  />
                  <Scatter
                    name="Correlation"
                    data={current.data.filter(d => d.x !== undefined && d.y !== undefined)}
                    fill={current.xColor}
                    fillOpacity={0.6}
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CorrelationContent;
