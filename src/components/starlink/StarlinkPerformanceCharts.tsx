import { useMemo, useState, memo } from "react";
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
  ComposedChart,
  Bar,
  Legend
} from "recharts";
import { 
  Activity, 
  ArrowDownUp, 
  Gauge, 
  Radio,
  Loader2,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  useStarlinkTimeseries,
  StarlinkTimeseriesPoint 
} from "@/hooks/useAuroraApi";

interface ChartContainerProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  isLoading?: boolean;
  subtitle?: string;
  badge?: React.ReactNode;
}

const ChartContainer = memo(({ title, icon, children, isLoading, subtitle, badge }: ChartContainerProps) => (
  <div className="glass-card rounded-xl border border-border/50 overflow-hidden">
    <div className="p-4 border-b border-border/30 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
          {icon}
        </div>
        <div>
          <h4 className="font-semibold text-sm">{title}</h4>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {badge}
    </div>
    <div className="p-4">
      {isLoading ? (
        <div className="h-[200px] flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        children
      )}
    </div>
  </div>
));

ChartContainer.displayName = 'ChartContainer';

interface PerformanceChartsProps {
  hours?: number;
}

const StarlinkPerformanceCharts = memo(({ hours = 24 }: PerformanceChartsProps) => {
  const [activeTab, setActiveTab] = useState('throughput');
  const { data: timeseriesData, isLoading } = useStarlinkTimeseries(hours);

  // Process data for charts
  const processedData = useMemo(() => {
    if (!timeseriesData?.readings) return { 
      throughput: [], 
      latency: [], 
      signal: [],
      combined: [] 
    };

    const readings = timeseriesData.readings;

    // Format time for display
    const formatTime = (timestamp: string) => {
      return new Date(timestamp).toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit'
      });
    };

    // Throughput data (convert to Mbps)
    const throughput = readings
      .filter(r => r.downlink_throughput_bps !== undefined || r.uplink_throughput_bps !== undefined)
      .map(r => ({
        time: formatTime(r.timestamp),
        download: r.downlink_throughput_bps ? r.downlink_throughput_bps / 1e6 : 0,
        upload: r.uplink_throughput_bps ? r.uplink_throughput_bps / 1e6 : 0,
      }));

    // Latency data
    const latency = readings
      .filter(r => r.pop_ping_latency_ms !== undefined)
      .map(r => ({
        time: formatTime(r.timestamp),
        latency: r.pop_ping_latency_ms ?? 0,
      }));

    // Signal & power data
    const signal = readings
      .filter(r => r.signal_dbm !== undefined || r.snr !== undefined || r.power_w !== undefined)
      .map(r => ({
        time: formatTime(r.timestamp),
        signal: r.signal_dbm ?? 0,
        snr: r.snr ?? 0,
        power: r.power_w ?? 0,
      }));

    // Combined view
    const combined = readings.map(r => ({
      time: formatTime(r.timestamp),
      download: r.downlink_throughput_bps ? r.downlink_throughput_bps / 1e6 : null,
      latency: r.pop_ping_latency_ms ?? null,
      power: r.power_w ?? null,
    }));

    return { throughput, latency, signal, combined };
  }, [timeseriesData]);

  // Calculate stats
  const stats = useMemo(() => {
    const { throughput, latency } = processedData;
    
    const avgDownload = throughput.length > 0 
      ? throughput.reduce((sum, d) => sum + d.download, 0) / throughput.length 
      : 0;
    const avgUpload = throughput.length > 0 
      ? throughput.reduce((sum, d) => sum + d.upload, 0) / throughput.length 
      : 0;
    const avgLatency = latency.length > 0 
      ? latency.reduce((sum, d) => sum + d.latency, 0) / latency.length 
      : 0;
    const maxDownload = throughput.length > 0 
      ? Math.max(...throughput.map(d => d.download)) 
      : 0;

    return { avgDownload, avgUpload, avgLatency, maxDownload };
  }, [processedData]);

  const hasData = processedData.throughput.length > 0 || processedData.latency.length > 0;

  return (
    <div className="space-y-4">
      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="glass-card rounded-lg p-3 border border-border/50">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="w-4 h-4 text-cyan-400" />
            <span className="text-xs text-muted-foreground">Avg Download</span>
          </div>
          <p className="text-xl font-bold text-cyan-400">
            {stats.avgDownload.toFixed(1)} <span className="text-sm font-normal">Mbps</span>
          </p>
        </div>
        <div className="glass-card rounded-lg p-3 border border-border/50">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-muted-foreground">Avg Upload</span>
          </div>
          <p className="text-xl font-bold text-emerald-400">
            {stats.avgUpload.toFixed(1)} <span className="text-sm font-normal">Mbps</span>
          </p>
        </div>
        <div className="glass-card rounded-lg p-3 border border-border/50">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-muted-foreground">Avg Latency</span>
          </div>
          <p className="text-xl font-bold text-amber-400">
            {stats.avgLatency.toFixed(0)} <span className="text-sm font-normal">ms</span>
          </p>
        </div>
        <div className="glass-card rounded-lg p-3 border border-border/50">
          <div className="flex items-center gap-2 mb-1">
            <Gauge className="w-4 h-4 text-violet-400" />
            <span className="text-xs text-muted-foreground">Peak Download</span>
          </div>
          <p className="text-xl font-bold text-violet-400">
            {stats.maxDownload.toFixed(1)} <span className="text-sm font-normal">Mbps</span>
          </p>
        </div>
      </div>

      {/* Chart Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="throughput" className="gap-2">
            <ArrowDownUp className="w-4 h-4" />
            <span className="hidden sm:inline">Throughput</span>
          </TabsTrigger>
          <TabsTrigger value="latency" className="gap-2">
            <Activity className="w-4 h-4" />
            <span className="hidden sm:inline">Latency</span>
          </TabsTrigger>
          <TabsTrigger value="signal" className="gap-2">
            <Radio className="w-4 h-4" />
            <span className="hidden sm:inline">Signal</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="throughput" className="mt-0">
          <ChartContainer
            title="Network Throughput"
            icon={<ArrowDownUp className="w-4 h-4 text-cyan-400" />}
            subtitle={`Last ${hours} hours`}
            isLoading={isLoading}
            badge={
              <Badge variant="outline" className="text-xs">
                {processedData.throughput.length} samples
              </Badge>
            }
          >
            {!hasData ? (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                No throughput data available
              </div>
            ) : (
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={processedData.throughput} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradientDownload" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradientUpload" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
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
                      tickFormatter={(v) => `${v}M`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                      formatter={(value: number, name: string) => [
                        `${value.toFixed(1)} Mbps`,
                        name === 'download' ? 'Download' : 'Upload'
                      ]}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="download"
                      name="Download"
                      stroke="#06b6d4"
                      strokeWidth={2}
                      fill="url(#gradientDownload)"
                    />
                    <Area
                      type="monotone"
                      dataKey="upload"
                      name="Upload"
                      stroke="#22c55e"
                      strokeWidth={2}
                      fill="url(#gradientUpload)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </ChartContainer>
        </TabsContent>

        <TabsContent value="latency" className="mt-0">
          <ChartContainer
            title="Network Latency"
            icon={<Activity className="w-4 h-4 text-amber-400" />}
            subtitle={`Last ${hours} hours`}
            isLoading={isLoading}
            badge={
              <Badge variant="outline" className="text-xs">
                Avg: {stats.avgLatency.toFixed(0)}ms
              </Badge>
            }
          >
            {processedData.latency.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                No latency data available
              </div>
            ) : (
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={processedData.latency} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
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
                      tickFormatter={(v) => `${v}ms`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                      formatter={(value: number) => [`${value.toFixed(0)} ms`, 'Latency']}
                    />
                    {/* Reference line for target latency */}
                    <Bar 
                      dataKey="latency" 
                      fill="#f59e0b" 
                      fillOpacity={0.6}
                      radius={[2, 2, 0, 0]}
                    />
                    <Line
                      type="monotone"
                      dataKey="latency"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </ChartContainer>
        </TabsContent>

        <TabsContent value="signal" className="mt-0">
          <ChartContainer
            title="Signal & Power"
            icon={<Radio className="w-4 h-4 text-violet-400" />}
            subtitle={`Last ${hours} hours`}
            isLoading={isLoading}
          >
            {processedData.signal.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                No signal data available
              </div>
            ) : (
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={processedData.signal} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis 
                      dataKey="time" 
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis 
                      yAxisId="left"
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
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
                    />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="snr"
                      name="SNR (dB)"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="power"
                      name="Power (W)"
                      stroke="#f97316"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </ChartContainer>
        </TabsContent>
      </Tabs>
    </div>
  );
});

StarlinkPerformanceCharts.displayName = 'StarlinkPerformanceCharts';

export default StarlinkPerformanceCharts;
