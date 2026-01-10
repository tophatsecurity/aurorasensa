import { memo, useMemo, useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  ComposedChart,
  Bar,
  ReferenceLine,
} from "recharts";
import { 
  Signal, 
  Activity, 
  Radio, 
  TrendingUp,
  TrendingDown,
  Wifi,
  RefreshCw,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useStarlinkSignalStrength,
  useStarlinkPerformance,
  useStarlinkTimeseries,
  useStarlinkConnectivity,
} from "@/hooks/useAuroraApi";
import { useStarlinkRealTime } from "@/hooks/useSSE";

interface SignalDataPoint {
  time: string;
  timestamp: number;
  snr?: number;
  signal_dbm?: number;
  latency?: number;
  download?: number;
  upload?: number;
}

interface StarlinkSignalChartProps {
  hours?: number;
  clientId?: string;
  deviceId?: string;
}

const ChartSkeleton = () => (
  <div className="space-y-3">
    <Skeleton className="h-4 w-32" />
    <Skeleton className="h-[200px] w-full" />
  </div>
);

const StarlinkSignalChart = memo(({ hours = 6, clientId, deviceId }: StarlinkSignalChartProps) => {
  const [realTimeEnabled, setRealTimeEnabled] = useState(true);
  const [liveData, setLiveData] = useState<SignalDataPoint[]>([]);
  
  // API hooks
  const { data: signalStrength, isLoading: signalLoading, refetch: refetchSignal } = useStarlinkSignalStrength();
  const { data: performance, isLoading: perfLoading, refetch: refetchPerf } = useStarlinkPerformance();
  const { data: connectivity } = useStarlinkConnectivity();
  const { data: timeseries, isLoading: timeseriesLoading } = useStarlinkTimeseries(hours, clientId, deviceId);
  
  // Real-time SSE hook
  const realTimeData = useStarlinkRealTime(realTimeEnabled, clientId);
  
  // Process historical timeseries data
  const historicalData = useMemo(() => {
    if (!timeseries?.readings) return [];
    return timeseries.readings.map((r) => ({
      time: new Date(r.timestamp).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false,
      }),
      timestamp: new Date(r.timestamp).getTime(),
      snr: r.snr,
      signal_dbm: r.signal_dbm,
      latency: r.pop_ping_latency_ms,
      download: r.downlink_throughput_bps ? r.downlink_throughput_bps / 1e6 : undefined,
      upload: r.uplink_throughput_bps ? r.uplink_throughput_bps / 1e6 : undefined,
    })).sort((a, b) => a.timestamp - b.timestamp);
  }, [timeseries]);

  // Merge live data with historical data
  useEffect(() => {
    if (realTimeData.lastMessage && realTimeEnabled) {
      const msg = realTimeData.lastMessage as {
        timestamp?: string;
        snr?: number;
        signal_dbm?: number;
        pop_ping_latency_ms?: number;
        downlink_throughput_bps?: number;
        uplink_throughput_bps?: number;
      };
      
      if (msg.timestamp) {
        const newPoint: SignalDataPoint = {
          time: new Date(msg.timestamp).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          }),
          timestamp: new Date(msg.timestamp).getTime(),
          snr: msg.snr,
          signal_dbm: msg.signal_dbm,
          latency: msg.pop_ping_latency_ms,
          download: msg.downlink_throughput_bps ? msg.downlink_throughput_bps / 1e6 : undefined,
          upload: msg.uplink_throughput_bps ? msg.uplink_throughput_bps / 1e6 : undefined,
        };
        
        setLiveData(prev => {
          // Keep only last 60 live data points
          const updated = [...prev, newPoint].slice(-60);
          return updated;
        });
      }
    }
  }, [realTimeData.lastMessage, realTimeEnabled]);

  // Combine historical and live data
  const chartData = useMemo(() => {
    // Get last point from historical to avoid overlap
    const lastHistorical = historicalData.length > 0 
      ? historicalData[historicalData.length - 1].timestamp 
      : 0;
    
    // Filter live data to only include points after historical data
    const filteredLive = liveData.filter(p => p.timestamp > lastHistorical);
    
    return [...historicalData, ...filteredLive];
  }, [historicalData, liveData]);

  // Calculate stats
  const stats = useMemo(() => {
    const validSnr = chartData.filter(d => d.snr !== undefined).map(d => d.snr as number);
    const validLatency = chartData.filter(d => d.latency !== undefined).map(d => d.latency as number);
    const validDownload = chartData.filter(d => d.download !== undefined).map(d => d.download as number);
    
    return {
      currentSnr: signalStrength?.snr ?? (validSnr.length > 0 ? validSnr[validSnr.length - 1] : undefined),
      avgSnr: validSnr.length > 0 ? validSnr.reduce((a, b) => a + b, 0) / validSnr.length : undefined,
      minSnr: validSnr.length > 0 ? Math.min(...validSnr) : undefined,
      maxSnr: validSnr.length > 0 ? Math.max(...validSnr) : undefined,
      currentLatency: performance?.pop_ping_latency_ms ?? (validLatency.length > 0 ? validLatency[validLatency.length - 1] : undefined),
      avgLatency: validLatency.length > 0 ? validLatency.reduce((a, b) => a + b, 0) / validLatency.length : undefined,
      avgDownload: validDownload.length > 0 ? validDownload.reduce((a, b) => a + b, 0) / validDownload.length : undefined,
      connected: connectivity?.connected ?? false,
    };
  }, [chartData, signalStrength, performance, connectivity]);

  const getSnrStatus = (snr?: number): 'good' | 'warning' | 'critical' => {
    if (!snr) return 'warning';
    if (snr > 9) return 'good';
    if (snr > 5) return 'warning';
    return 'critical';
  };

  const isLoading = signalLoading || perfLoading || timeseriesLoading;

  const handleRefresh = () => {
    refetchSignal();
    refetchPerf();
    setLiveData([]);
  };

  return (
    <div className="glass-card rounded-xl border border-border/50 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border/50 bg-gradient-to-r from-violet-500/10 to-cyan-500/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
              <Signal className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Real-time Signal Strength</h3>
              <p className="text-xs text-muted-foreground">
                Live SNR & performance metrics
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge 
              variant={realTimeData.isConnected ? "default" : "secondary"}
              className={realTimeData.isConnected ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : ""}
            >
              {realTimeData.isSSE ? (
                <>
                  <Radio className="w-3 h-3 mr-1 animate-pulse" />
                  SSE Live
                </>
              ) : realTimeData.isPolling ? (
                <>
                  <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                  Polling
                </>
              ) : (
                "Disconnected"
              )}
            </Badge>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant={realTimeEnabled ? "default" : "outline"}
              size="sm"
              onClick={() => setRealTimeEnabled(!realTimeEnabled)}
            >
              {realTimeEnabled ? "Live" : "Paused"}
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4 p-4 border-b border-border/30 bg-muted/20">
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Current SNR</p>
          <p className={`text-xl font-bold ${
            getSnrStatus(stats.currentSnr) === 'good' ? 'text-emerald-400' :
            getSnrStatus(stats.currentSnr) === 'warning' ? 'text-amber-400' : 'text-red-400'
          }`}>
            {stats.currentSnr?.toFixed(1) ?? '—'} <span className="text-sm font-normal text-muted-foreground">dB</span>
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Avg SNR</p>
          <p className="text-xl font-bold text-foreground">
            {stats.avgSnr?.toFixed(1) ?? '—'} <span className="text-sm font-normal text-muted-foreground">dB</span>
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Latency</p>
          <p className="text-xl font-bold text-foreground">
            {stats.currentLatency?.toFixed(0) ?? '—'} <span className="text-sm font-normal text-muted-foreground">ms</span>
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Avg Download</p>
          <p className="text-xl font-bold text-foreground">
            {stats.avgDownload?.toFixed(0) ?? '—'} <span className="text-sm font-normal text-muted-foreground">Mbps</span>
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="p-4">
        <Tabs defaultValue="snr" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="snr" className="gap-2">
              <Signal className="w-4 h-4" />
              Signal (SNR)
            </TabsTrigger>
            <TabsTrigger value="latency" className="gap-2">
              <Activity className="w-4 h-4" />
              Latency
            </TabsTrigger>
            <TabsTrigger value="throughput" className="gap-2">
              <Wifi className="w-4 h-4" />
              Throughput
            </TabsTrigger>
          </TabsList>

          <TabsContent value="snr">
            {isLoading ? <ChartSkeleton /> : (
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="snrGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis 
                      dataKey="time" 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={11}
                      tickLine={false}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={11}
                      tickLine={false}
                      domain={['auto', 'auto']}
                      label={{ value: 'SNR (dB)', angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                      labelStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                    <ReferenceLine y={9} stroke="#22c55e" strokeDasharray="5 5" label={{ value: 'Good', fill: '#22c55e', fontSize: 10 }} />
                    <ReferenceLine y={5} stroke="#f59e0b" strokeDasharray="5 5" label={{ value: 'Warning', fill: '#f59e0b', fontSize: 10 }} />
                    <Area
                      type="monotone"
                      dataKey="snr"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      fill="url(#snrGradient)"
                      dot={false}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </TabsContent>

          <TabsContent value="latency">
            {isLoading ? <ChartSkeleton /> : (
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis 
                      dataKey="time" 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={11}
                      tickLine={false}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={11}
                      tickLine={false}
                      label={{ value: 'Latency (ms)', angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <ReferenceLine y={40} stroke="#22c55e" strokeDasharray="5 5" label={{ value: 'Good', fill: '#22c55e', fontSize: 10 }} />
                    <ReferenceLine y={100} stroke="#f59e0b" strokeDasharray="5 5" label={{ value: 'Warning', fill: '#f59e0b', fontSize: 10 }} />
                    <Bar dataKey="latency" fill="#06b6d4" opacity={0.6} radius={[4, 4, 0, 0]} />
                    <Line type="monotone" dataKey="latency" stroke="#06b6d4" strokeWidth={2} dot={false} isAnimationActive={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </TabsContent>

          <TabsContent value="throughput">
            {isLoading ? <ChartSkeleton /> : (
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="downloadGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="uploadGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis 
                      dataKey="time" 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={11}
                      tickLine={false}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={11}
                      tickLine={false}
                      label={{ value: 'Mbps', angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="download"
                      stroke="#22c55e"
                      strokeWidth={2}
                      fill="url(#downloadGradient)"
                      name="Download"
                      dot={false}
                      isAnimationActive={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="upload"
                      stroke="#06b6d4"
                      strokeWidth={2}
                      fill="url(#uploadGradient)"
                      name="Upload"
                      dot={false}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Footer with data info */}
      <div className="px-4 pb-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {chartData.length} data points • {hours}h history
          </span>
          <span>
            {liveData.length > 0 && (
              <span className="text-emerald-400">
                +{liveData.length} live points
              </span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
});

StarlinkSignalChart.displayName = 'StarlinkSignalChart';

export default StarlinkSignalChart;
