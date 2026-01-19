import { useState, useMemo, memo } from "react";
import { 
  Satellite, 
  Activity, 
  ArrowDownUp, 
  Zap, 
  Clock, 
  MapPin,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Gauge,
  Eye,
  Loader2,
  ChevronDown
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ComposedChart,
  Bar,
  Line,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { 
  useStarlinkDevicesFromReadings,
  useStarlinkDeviceMetrics,
  type StarlinkDeviceWithMetrics 
} from "@/hooks/aurora/starlink";
import { formatLastSeen } from "@/utils/dateUtils";

// Time period options
const TIME_PERIODS = [
  { value: "6", label: "6 Hours" },
  { value: "12", label: "12 Hours" },
  { value: "24", label: "24 Hours" },
  { value: "48", label: "48 Hours" },
  { value: "168", label: "7 Days" },
];

// Chart colors
const COLORS = {
  download: "#06b6d4",
  upload: "#22c55e",
  latency: "#f59e0b",
  obstruction: "#ef4444",
  power: "#f97316",
  obstructed: "#ef4444",
  clear: "#22c55e",
};

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  unit?: string;
  status?: "good" | "warning" | "critical";
  trend?: "up" | "down" | "stable";
  subtitle?: string;
}

const MetricCard = memo(({ icon, label, value, unit, status, trend, subtitle }: MetricCardProps) => {
  const statusColors = {
    good: "text-green-500",
    warning: "text-yellow-500",
    critical: "text-red-500",
  };

  return (
    <Card className="bg-card/50 border-border/50">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            {icon}
            <span className="text-xs uppercase tracking-wide">{label}</span>
          </div>
          {trend && (
            <div className={status ? statusColors[status] : "text-muted-foreground"}>
              {trend === "up" && <TrendingUp className="w-4 h-4" />}
              {trend === "down" && <TrendingDown className="w-4 h-4" />}
            </div>
          )}
        </div>
        <p className={`text-2xl font-bold ${status ? statusColors[status] : "text-foreground"}`}>
          {value}
          {unit && <span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span>}
        </p>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );
});
MetricCard.displayName = "MetricCard";

interface DeviceSelectorProps {
  devices: StarlinkDeviceWithMetrics[];
  selectedDevice: StarlinkDeviceWithMetrics | null;
  onSelect: (device: StarlinkDeviceWithMetrics) => void;
  isLoading: boolean;
}

const DeviceSelector = memo(({ devices, selectedDevice, onSelect, isLoading }: DeviceSelectorProps) => {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading devices...</span>
      </div>
    );
  }

  if (devices.length === 0) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <AlertCircle className="w-4 h-4" />
        <span className="text-sm">No Starlink devices found</span>
      </div>
    );
  }

  return (
    <Select
      value={selectedDevice?.composite_key || ""}
      onValueChange={(value) => {
        const device = devices.find(d => d.composite_key === value);
        if (device) onSelect(device);
      }}
    >
      <SelectTrigger className="w-[280px] bg-background/50">
        <SelectValue placeholder="Select a device">
          {selectedDevice && (
            <div className="flex items-center gap-2">
              <Satellite className="w-4 h-4 text-purple-500" />
              <span className="truncate">{selectedDevice.device_id}</span>
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {devices.map((device) => (
          <SelectItem key={device.composite_key} value={device.composite_key}>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${device.metrics.connected ? "bg-green-500" : "bg-gray-400"}`} />
              <span className="truncate">{device.device_id}</span>
              <span className="text-xs text-muted-foreground">({device.client_id})</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
});
DeviceSelector.displayName = "DeviceSelector";

interface ChartSkeletonProps {
  height?: number;
}

const ChartSkeleton = ({ height = 250 }: ChartSkeletonProps) => (
  <div className={`h-[${height}px] flex items-center justify-center`} style={{ height }}>
    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
  </div>
);

const StarlinkDeviceDetailView = () => {
  const [selectedDevice, setSelectedDevice] = useState<StarlinkDeviceWithMetrics | null>(null);
  const [hours, setHours] = useState(24);
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch all devices
  const { data: devices = [], isLoading: devicesLoading, refetch: refetchDevices } = useStarlinkDevicesFromReadings();

  // Auto-select first device
  useMemo(() => {
    if (devices.length > 0 && !selectedDevice) {
      setSelectedDevice(devices[0]);
    }
  }, [devices, selectedDevice]);

  // Fetch device metrics for selected device
  const { 
    data: metricsData, 
    isLoading: metricsLoading,
    refetch: refetchMetrics 
  } = useStarlinkDeviceMetrics(
    selectedDevice?.client_id || null, 
    selectedDevice?.device_id || null, 
    hours
  );

  // Process chart data
  const chartData = useMemo(() => {
    if (!metricsData?.readings || metricsData.readings.length === 0) {
      return { throughput: [], latency: [], obstruction: [], combined: [] };
    }

    const readings = metricsData.readings;
    const formatTime = (timestamp: string) => {
      return new Date(timestamp).toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit'
      });
    };

    // Throughput data
    const throughput = readings
      .filter(r => r.downlink_throughput_bps !== undefined || r.uplink_throughput_bps !== undefined)
      .map(r => ({
        time: formatTime(r.timestamp),
        fullTime: new Date(r.timestamp).toLocaleString(),
        download: r.downlink_throughput_bps ? r.downlink_throughput_bps / 1e6 : 0,
        upload: r.uplink_throughput_bps ? r.uplink_throughput_bps / 1e6 : 0,
      }));

    // Latency data
    const latency = readings
      .filter(r => r.pop_ping_latency_ms !== undefined)
      .map(r => ({
        time: formatTime(r.timestamp),
        fullTime: new Date(r.timestamp).toLocaleString(),
        latency: r.pop_ping_latency_ms ?? 0,
      }));

    // Obstruction data
    const obstruction = readings
      .filter(r => r.obstruction_percent !== undefined)
      .map(r => ({
        time: formatTime(r.timestamp),
        fullTime: new Date(r.timestamp).toLocaleString(),
        obstruction: r.obstruction_percent ?? 0,
      }));

    // Combined for overview
    const combined = readings.map(r => ({
      time: formatTime(r.timestamp),
      fullTime: new Date(r.timestamp).toLocaleString(),
      download: r.downlink_throughput_bps ? r.downlink_throughput_bps / 1e6 : null,
      upload: r.uplink_throughput_bps ? r.uplink_throughput_bps / 1e6 : null,
      latency: r.pop_ping_latency_ms ?? null,
      obstruction: r.obstruction_percent ?? null,
      power: r.power_w ?? null,
    }));

    return { throughput, latency, obstruction, combined };
  }, [metricsData]);

  // Calculate statistics
  const stats = useMemo(() => {
    const { throughput, latency, obstruction } = chartData;

    const avgDownload = throughput.length > 0 
      ? throughput.reduce((sum, d) => sum + d.download, 0) / throughput.length 
      : 0;
    const avgUpload = throughput.length > 0 
      ? throughput.reduce((sum, d) => sum + d.upload, 0) / throughput.length 
      : 0;
    const maxDownload = throughput.length > 0 
      ? Math.max(...throughput.map(d => d.download)) 
      : 0;
    const maxUpload = throughput.length > 0 
      ? Math.max(...throughput.map(d => d.upload)) 
      : 0;

    const avgLatency = latency.length > 0 
      ? latency.reduce((sum, d) => sum + d.latency, 0) / latency.length 
      : 0;
    const minLatency = latency.length > 0 
      ? Math.min(...latency.map(d => d.latency)) 
      : 0;
    const maxLatency = latency.length > 0 
      ? Math.max(...latency.map(d => d.latency)) 
      : 0;

    const avgObstruction = obstruction.length > 0 
      ? obstruction.reduce((sum, d) => sum + d.obstruction, 0) / obstruction.length 
      : 0;
    const maxObstruction = obstruction.length > 0 
      ? Math.max(...obstruction.map(d => d.obstruction)) 
      : 0;

    return {
      avgDownload,
      avgUpload,
      maxDownload,
      maxUpload,
      avgLatency,
      minLatency,
      maxLatency,
      avgObstruction,
      maxObstruction,
      totalSamples: chartData.combined.length,
    };
  }, [chartData]);

  // Obstruction pie chart data
  const obstructionPieData = useMemo(() => {
    const avg = stats.avgObstruction;
    return [
      { name: "Obstructed", value: avg, color: COLORS.obstructed },
      { name: "Clear Sky", value: 100 - avg, color: COLORS.clear },
    ];
  }, [stats.avgObstruction]);

  const handleRefresh = () => {
    refetchDevices();
    refetchMetrics();
  };

  // Get status indicators
  const getLatencyStatus = (ms: number): "good" | "warning" | "critical" => {
    if (ms < 40) return "good";
    if (ms < 80) return "warning";
    return "critical";
  };

  const getObstructionStatus = (pct: number): "good" | "warning" | "critical" => {
    if (pct < 5) return "good";
    if (pct < 15) return "warning";
    return "critical";
  };

  const tooltipStyle = {
    backgroundColor: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
    fontSize: '12px',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-purple-500/20 border border-purple-500/30">
            <Satellite className="w-6 h-6 text-purple-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Starlink Device Details</h2>
            <p className="text-sm text-muted-foreground">Historical performance analysis</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <DeviceSelector
            devices={devices}
            selectedDevice={selectedDevice}
            onSelect={setSelectedDevice}
            isLoading={devicesLoading}
          />
          
          <Select value={hours.toString()} onValueChange={(v) => setHours(parseInt(v))}>
            <SelectTrigger className="w-[120px] bg-background/50">
              <Clock className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIME_PERIODS.map((period) => (
                <SelectItem key={period.value} value={period.value}>
                  {period.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={metricsLoading}>
            <RefreshCw className={`w-4 h-4 ${metricsLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Device Info Card */}
      {selectedDevice && (
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                {selectedDevice.metrics.connected ? (
                  <Badge variant="default" className="bg-green-500/20 text-green-400 border-green-500/30">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-muted text-muted-foreground">
                    Offline
                  </Badge>
                )}
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Device: </span>
                <span className="font-mono text-foreground">{selectedDevice.device_id}</span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Client: </span>
                <span className="font-mono text-foreground">{selectedDevice.client_id}</span>
              </div>
              {selectedDevice.latitude && selectedDevice.longitude && (
                <div className="text-sm flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-muted-foreground" />
                  <span className="text-foreground">
                    {selectedDevice.latitude.toFixed(4)}, {selectedDevice.longitude.toFixed(4)}
                  </span>
                </div>
              )}
              {selectedDevice.last_seen && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Last seen: </span>
                  <span className="text-foreground">{formatLastSeen(selectedDevice.last_seen)}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <MetricCard
          icon={<TrendingDown className="w-4 h-4 text-cyan-400" />}
          label="Avg Download"
          value={stats.avgDownload.toFixed(1)}
          unit="Mbps"
          trend="down"
        />
        <MetricCard
          icon={<TrendingUp className="w-4 h-4 text-green-400" />}
          label="Avg Upload"
          value={stats.avgUpload.toFixed(1)}
          unit="Mbps"
          trend="up"
        />
        <MetricCard
          icon={<Gauge className="w-4 h-4 text-violet-400" />}
          label="Peak Download"
          value={stats.maxDownload.toFixed(1)}
          unit="Mbps"
        />
        <MetricCard
          icon={<Activity className="w-4 h-4 text-amber-400" />}
          label="Avg Latency"
          value={stats.avgLatency.toFixed(0)}
          unit="ms"
          status={getLatencyStatus(stats.avgLatency)}
          subtitle={`${stats.minLatency.toFixed(0)} - ${stats.maxLatency.toFixed(0)} ms`}
        />
        <MetricCard
          icon={<Eye className="w-4 h-4 text-red-400" />}
          label="Avg Obstruction"
          value={stats.avgObstruction.toFixed(1)}
          unit="%"
          status={getObstructionStatus(stats.avgObstruction)}
          subtitle={`Peak: ${stats.maxObstruction.toFixed(1)}%`}
        />
        <MetricCard
          icon={<Zap className="w-4 h-4 text-orange-400" />}
          label="Power"
          value={selectedDevice?.metrics.power_watts?.toFixed(1) || "N/A"}
          unit="W"
        />
      </div>

      {/* Chart Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-4">
          <TabsTrigger value="overview" className="gap-2">
            <Activity className="w-4 h-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="throughput" className="gap-2">
            <ArrowDownUp className="w-4 h-4" />
            <span className="hidden sm:inline">Throughput</span>
          </TabsTrigger>
          <TabsTrigger value="latency" className="gap-2">
            <Gauge className="w-4 h-4" />
            <span className="hidden sm:inline">Latency</span>
          </TabsTrigger>
          <TabsTrigger value="obstruction" className="gap-2">
            <Eye className="w-4 h-4" />
            <span className="hidden sm:inline">Obstruction</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-0 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Combined Chart */}
            <Card className="lg:col-span-2 bg-card/50 border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  Performance Overview ({hours}h)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {metricsLoading ? (
                  <ChartSkeleton height={300} />
                ) : chartData.combined.length === 0 ? (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No data available for selected period
                  </div>
                ) : (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={chartData.combined} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gradDown" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={COLORS.download} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={COLORS.download} stopOpacity={0} />
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
                          yAxisId="left"
                          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v) => `${v}M`}
                        />
                        <YAxis 
                          yAxisId="right"
                          orientation="right"
                          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v) => `${v}ms`}
                        />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Legend />
                        <Area
                          yAxisId="left"
                          type="monotone"
                          dataKey="download"
                          name="Download (Mbps)"
                          stroke={COLORS.download}
                          fill="url(#gradDown)"
                          strokeWidth={2}
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="latency"
                          name="Latency (ms)"
                          stroke={COLORS.latency}
                          strokeWidth={2}
                          dot={false}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Obstruction Pie */}
            <Card className="bg-card/50 border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Eye className="w-4 h-4 text-red-400" />
                  Sky Visibility
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={obstructionPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {obstructionPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => `${value.toFixed(1)}%`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-4 mt-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="text-sm text-muted-foreground">Clear</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span className="text-sm text-muted-foreground">Obstructed</span>
                  </div>
                </div>
                <div className="text-center mt-4">
                  <p className="text-3xl font-bold text-foreground">{(100 - stats.avgObstruction).toFixed(1)}%</p>
                  <p className="text-xs text-muted-foreground">Clear Sky View</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Throughput Tab */}
        <TabsContent value="throughput" className="mt-0">
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <ArrowDownUp className="w-4 h-4 text-cyan-400" />
                  Network Throughput ({hours}h)
                </CardTitle>
                <Badge variant="outline" className="text-xs">
                  {chartData.throughput.length} samples
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {metricsLoading ? (
                <ChartSkeleton height={350} />
              ) : chartData.throughput.length === 0 ? (
                <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                  No throughput data available
                </div>
              ) : (
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData.throughput} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gradDownload" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLORS.download} stopOpacity={0.4} />
                          <stop offset="95%" stopColor={COLORS.download} stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gradUpload" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLORS.upload} stopOpacity={0.4} />
                          <stop offset="95%" stopColor={COLORS.upload} stopOpacity={0} />
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
                        tickFormatter={(v) => `${v} Mbps`}
                      />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(value: number, name: string) => [
                          `${value.toFixed(2)} Mbps`,
                          name === 'download' ? 'Download' : 'Upload'
                        ]}
                        labelFormatter={(_, payload) => payload?.[0]?.payload?.fullTime || ''}
                      />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="download"
                        name="Download"
                        stroke={COLORS.download}
                        strokeWidth={2}
                        fill="url(#gradDownload)"
                      />
                      <Area
                        type="monotone"
                        dataKey="upload"
                        name="Upload"
                        stroke={COLORS.upload}
                        strokeWidth={2}
                        fill="url(#gradUpload)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Throughput Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground uppercase mb-1">Avg Download</p>
                <p className="text-2xl font-bold text-cyan-400">{stats.avgDownload.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Mbps</p>
              </CardContent>
            </Card>
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground uppercase mb-1">Peak Download</p>
                <p className="text-2xl font-bold text-cyan-400">{stats.maxDownload.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Mbps</p>
              </CardContent>
            </Card>
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground uppercase mb-1">Avg Upload</p>
                <p className="text-2xl font-bold text-green-400">{stats.avgUpload.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Mbps</p>
              </CardContent>
            </Card>
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground uppercase mb-1">Peak Upload</p>
                <p className="text-2xl font-bold text-green-400">{stats.maxUpload.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Mbps</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Latency Tab */}
        <TabsContent value="latency" className="mt-0">
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-amber-400" />
                  Network Latency ({hours}h)
                </CardTitle>
                <Badge 
                  variant="outline" 
                  className={`text-xs ${
                    getLatencyStatus(stats.avgLatency) === 'good' ? 'border-green-500 text-green-500' :
                    getLatencyStatus(stats.avgLatency) === 'warning' ? 'border-yellow-500 text-yellow-500' :
                    'border-red-500 text-red-500'
                  }`}
                >
                  Avg: {stats.avgLatency.toFixed(0)}ms
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {metricsLoading ? (
                <ChartSkeleton height={350} />
              ) : chartData.latency.length === 0 ? (
                <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                  No latency data available
                </div>
              ) : (
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData.latency} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
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
                        tickFormatter={(v) => `${v} ms`}
                      />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(value: number) => [`${value.toFixed(1)} ms`, 'Latency']}
                        labelFormatter={(_, payload) => payload?.[0]?.payload?.fullTime || ''}
                      />
                      <Bar 
                        dataKey="latency" 
                        fill={COLORS.latency}
                        fillOpacity={0.5}
                        radius={[2, 2, 0, 0]}
                      />
                      <Line
                        type="monotone"
                        dataKey="latency"
                        stroke={COLORS.latency}
                        strokeWidth={2}
                        dot={false}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Latency Stats */}
          <div className="grid grid-cols-3 gap-4 mt-4">
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground uppercase mb-1">Minimum</p>
                <p className="text-2xl font-bold text-green-400">{stats.minLatency.toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">ms</p>
              </CardContent>
            </Card>
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground uppercase mb-1">Average</p>
                <p className="text-2xl font-bold text-amber-400">{stats.avgLatency.toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">ms</p>
              </CardContent>
            </Card>
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground uppercase mb-1">Maximum</p>
                <p className="text-2xl font-bold text-red-400">{stats.maxLatency.toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">ms</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Obstruction Tab */}
        <TabsContent value="obstruction" className="mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Obstruction Chart */}
            <Card className="lg:col-span-2 bg-card/50 border-border/50">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Eye className="w-4 h-4 text-red-400" />
                    Obstruction History ({hours}h)
                  </CardTitle>
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${
                      getObstructionStatus(stats.avgObstruction) === 'good' ? 'border-green-500 text-green-500' :
                      getObstructionStatus(stats.avgObstruction) === 'warning' ? 'border-yellow-500 text-yellow-500' :
                      'border-red-500 text-red-500'
                    }`}
                  >
                    Avg: {stats.avgObstruction.toFixed(1)}%
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {metricsLoading ? (
                  <ChartSkeleton height={300} />
                ) : chartData.obstruction.length === 0 ? (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No obstruction data available
                  </div>
                ) : (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData.obstruction} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gradObstruction" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={COLORS.obstruction} stopOpacity={0.4} />
                            <stop offset="95%" stopColor={COLORS.obstruction} stopOpacity={0} />
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
                          tickFormatter={(v) => `${v}%`}
                          domain={[0, Math.max(stats.maxObstruction * 1.2, 10)]}
                        />
                        <Tooltip
                          contentStyle={tooltipStyle}
                          formatter={(value: number) => [`${value.toFixed(2)}%`, 'Obstruction']}
                          labelFormatter={(_, payload) => payload?.[0]?.payload?.fullTime || ''}
                        />
                        <Area
                          type="monotone"
                          dataKey="obstruction"
                          stroke={COLORS.obstruction}
                          strokeWidth={2}
                          fill="url(#gradObstruction)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Obstruction Summary */}
            <Card className="bg-card/50 border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Sky View Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center">
                  <div className="relative inline-flex items-center justify-center">
                    <Progress 
                      value={100 - stats.avgObstruction} 
                      className="w-32 h-32 [&>div]:bg-green-500"
                      style={{ 
                        borderRadius: '50%',
                        transform: 'rotate(-90deg)',
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center flex-col">
                      <p className="text-3xl font-bold text-foreground">{(100 - stats.avgObstruction).toFixed(1)}%</p>
                      <p className="text-xs text-muted-foreground">Clear View</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Average Obstruction</span>
                    <span className={`text-sm font-medium ${
                      getObstructionStatus(stats.avgObstruction) === 'good' ? 'text-green-500' :
                      getObstructionStatus(stats.avgObstruction) === 'warning' ? 'text-yellow-500' :
                      'text-red-500'
                    }`}>{stats.avgObstruction.toFixed(2)}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Peak Obstruction</span>
                    <span className="text-sm font-medium text-red-400">{stats.maxObstruction.toFixed(2)}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Data Points</span>
                    <span className="text-sm font-medium text-foreground">{chartData.obstruction.length}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-border/50">
                  <p className="text-xs text-muted-foreground">
                    {stats.avgObstruction < 5 ? (
                      <span className="text-green-500">Excellent sky view! Minimal obstructions detected.</span>
                    ) : stats.avgObstruction < 15 ? (
                      <span className="text-yellow-500">Moderate obstruction. Consider adjusting dish position.</span>
                    ) : (
                      <span className="text-red-500">High obstruction level. Repositioning recommended.</span>
                    )}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StarlinkDeviceDetailView;