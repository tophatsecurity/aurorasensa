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
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  RadialBarChart,
  RadialBar
} from "recharts";
import { 
  Satellite, 
  Zap, 
  Signal, 
  Clock, 
  Activity,
  AlertTriangle,
  CheckCircle,
  ArrowUp,
  ArrowDown,
  Globe
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
  useStarlinkStats, 
  useStarlinkTimeseries, 
  useSensorTypeStats, 
  useStarlinkDevices,
  useStarlinkDeviceStats,
  useStarlinkDeviceTimeseries,
  StarlinkTimeseriesPoint 
} from "@/hooks/useAuroraApi";

// Chart color palette
const COLORS = {
  primary: '#8b5cf6',
  secondary: '#06b6d4',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  muted: '#64748b',
};

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'stable';
  status?: 'good' | 'warning' | 'critical';
  subtitle?: string;
  isLoading?: boolean;
}

const MetricCard = ({ title, value, unit, icon, trend, status, subtitle, isLoading }: MetricCardProps) => {
  const statusColor = status === 'good' ? 'text-success' : status === 'warning' ? 'text-warning' : status === 'critical' ? 'text-destructive' : 'text-foreground';
  
  return (
    <div className="glass-card rounded-xl p-4 border border-border/50 hover:border-violet-500/30 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
            {icon}
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{title}</p>
            <div className="flex items-center gap-1">
              <p className={`text-xl font-bold ${statusColor}`}>
                {isLoading ? '...' : value}
              </p>
              {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
              {trend === 'up' && <ArrowUp className="w-4 h-4 text-success" />}
              {trend === 'down' && <ArrowDown className="w-4 h-4 text-destructive" />}
            </div>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

const StarlinkContent = () => {
  const [selectedDevice, setSelectedDevice] = useState<string>("all");
  
  // Fetch list of Starlink devices
  const { data: starlinkDevices, isLoading: devicesLoading } = useStarlinkDevices();
  
  // Average stats (for "All" selection)
  const { data: starlinkStats, isLoading: statsLoading } = useStarlinkStats();
  const { data: starlinkTimeseries, isLoading: timeseriesLoading } = useStarlinkTimeseries(24);
  const { data: sensorStats, isLoading: sensorLoading } = useSensorTypeStats("starlink");
  
  // Individual device stats (when a specific device is selected)
  const { data: deviceStats, isLoading: deviceStatsLoading } = useStarlinkDeviceStats(
    selectedDevice !== "all" ? selectedDevice : null
  );
  const { data: deviceTimeseries, isLoading: deviceTimeseriesLoading } = useStarlinkDeviceTimeseries(
    selectedDevice !== "all" ? selectedDevice : null,
    24
  );

  const isAllSelected = selectedDevice === "all";
  const isLoading = statsLoading || timeseriesLoading || sensorLoading || devicesLoading || 
    (!isAllSelected && (deviceStatsLoading || deviceTimeseriesLoading));
  
  // Use either aggregate stats or device-specific stats
  const activeStats = isAllSelected ? starlinkStats : deviceStats;
  const activeTimeseries = isAllSelected ? starlinkTimeseries : deviceTimeseries;

  // Format uptime
  const formatUptime = (seconds?: number) => {
    if (!seconds) return '—';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  // Format throughput
  const formatThroughput = (bps?: number) => {
    if (!bps) return { value: '—', unit: '' };
    if (bps >= 1000000000) return { value: (bps / 1000000000).toFixed(1), unit: 'Gbps' };
    if (bps >= 1000000) return { value: (bps / 1000000).toFixed(1), unit: 'Mbps' };
    if (bps >= 1000) return { value: (bps / 1000).toFixed(1), unit: 'Kbps' };
    return { value: bps.toFixed(0), unit: 'bps' };
  };

  const downlink = formatThroughput(activeStats?.downlink_throughput_bps);
  const uplink = formatThroughput(activeStats?.uplink_throughput_bps);

  // Obstruction status
  const obstructionPercent = activeStats?.obstruction_percent_time ?? 0;
  const obstructionStatus = obstructionPercent < 1 ? 'good' : obstructionPercent < 5 ? 'warning' : 'critical';

  // SNR status
  const snr = activeStats?.snr ?? 0;
  const snrStatus = snr > 9 ? 'good' : snr > 5 ? 'warning' : 'critical';

  // Latency status
  const latency = activeStats?.pop_ping_latency_ms ?? 0;
  const latencyStatus = latency < 40 ? 'good' : latency < 100 ? 'warning' : 'critical';

  // Format timeseries data for charts
  const formatTimeseriesData = (readings: StarlinkTimeseriesPoint[] | undefined, field: keyof StarlinkTimeseriesPoint) => {
    if (!readings) return [];
    return readings
      .filter(r => r[field] !== undefined)
      .map(r => ({
        time: new Date(r.timestamp).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
        value: Number(r[field]),
      }));
  };

  const signalData = useMemo(() => formatTimeseriesData(activeTimeseries?.readings, 'signal_dbm'), [activeTimeseries]);
  const powerData = useMemo(() => formatTimeseriesData(activeTimeseries?.readings, 'power_w'), [activeTimeseries]);
  const latencyData = useMemo(() => formatTimeseriesData(activeTimeseries?.readings, 'pop_ping_latency_ms'), [activeTimeseries]);
  const throughputData = useMemo(() => formatTimeseriesData(activeTimeseries?.readings, 'downlink_throughput_bps'), [activeTimeseries]);


  // Obstruction pie chart data
  const obstructionPieData = [
    { name: 'Clear', value: 100 - obstructionPercent, color: COLORS.success },
    { name: 'Obstructed', value: obstructionPercent, color: COLORS.danger },
  ];

  // SNR gauge data
  const snrGaugeData = [
    { name: 'SNR', value: Math.min(snr, 15), fill: snr > 9 ? COLORS.success : snr > 5 ? COLORS.warning : COLORS.danger },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8 flex-wrap">
        <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center">
          <Satellite className="w-6 h-6 text-violet-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Starlink Dashboard</h1>
          <p className="text-muted-foreground">
            {isAllSelected ? 'Average across all devices' : `Device: ${selectedDevice}`}
          </p>
        </div>
        
        {/* Device Selector */}
        <div className="ml-auto flex items-center gap-3">
          <Select value={selectedDevice} onValueChange={setSelectedDevice}>
            <SelectTrigger className="w-[200px] bg-background border-border">
              <SelectValue placeholder="Select device" />
            </SelectTrigger>
            <SelectContent className="bg-background border-border z-50">
              <SelectItem value="all">All Devices (Average)</SelectItem>
              {starlinkDevices && starlinkDevices.length > 0 && (
                starlinkDevices.map((device) => (
                  <SelectItem key={device.device_id} value={device.device_id}>
                    {device.device_id}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <Badge className="bg-violet-500/20 text-violet-400 border-violet-500/30">
            {isLoading ? 'Loading...' : 'Live'}
          </Badge>
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard
          title="Uptime"
          value={formatUptime(activeStats?.uptime_seconds)}
          icon={<Clock className="w-5 h-5 text-violet-400" />}
          status="good"
          subtitle="Since last restart"
          isLoading={isLoading}
        />
        <MetricCard
          title="Latency"
          value={latency.toFixed(0)}
          unit="ms"
          icon={<Activity className="w-5 h-5 text-violet-400" />}
          status={latencyStatus}
          subtitle={latencyStatus === 'good' ? 'Excellent' : latencyStatus === 'warning' ? 'Acceptable' : 'High latency'}
          isLoading={isLoading}
        />
        <MetricCard
          title="SNR"
          value={snr.toFixed(1)}
          unit="dB"
          icon={<Signal className="w-5 h-5 text-violet-400" />}
          status={snrStatus}
          subtitle={snrStatus === 'good' ? 'Strong signal' : snrStatus === 'warning' ? 'Moderate' : 'Weak signal'}
          isLoading={isLoading}
        />
        <MetricCard
          title="Obstruction"
          value={obstructionPercent.toFixed(1)}
          unit="%"
          icon={obstructionStatus === 'good' ? <CheckCircle className="w-5 h-5 text-success" /> : <AlertTriangle className="w-5 h-5 text-warning" />}
          status={obstructionStatus}
          subtitle={obstructionStatus === 'good' ? 'Clear view' : obstructionStatus === 'warning' ? 'Minor blockage' : 'Check positioning'}
          isLoading={isLoading}
        />
      </div>

      {/* Throughput Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        <div className="glass-card rounded-xl p-5 border border-border/50">
          <div className="flex items-center gap-3 mb-4">
            <ArrowDown className="w-5 h-5 text-cyan-400" />
            <h3 className="font-semibold">Downlink Throughput</h3>
          </div>
          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-4xl font-bold text-cyan-400">{downlink.value}</span>
            <span className="text-lg text-muted-foreground">{downlink.unit}</span>
          </div>
          <div className="h-[120px]">
            {throughputData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={throughputData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradient-downlink" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="time" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="value" stroke="#06b6d4" fill="url(#gradient-downlink)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                No throughput data
              </div>
            )}
          </div>
        </div>

        <div className="glass-card rounded-xl p-5 border border-border/50">
          <div className="flex items-center gap-3 mb-4">
            <ArrowUp className="w-5 h-5 text-green-400" />
            <h3 className="font-semibold">Uplink Throughput</h3>
          </div>
          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-4xl font-bold text-green-400">{uplink.value}</span>
            <span className="text-lg text-muted-foreground">{uplink.unit}</span>
          </div>
          <div className="h-[120px] flex items-center justify-center">
            <div className="text-center">
              <Globe className="w-12 h-12 text-green-400/50 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Upload metrics available</p>
            </div>
          </div>
        </div>
      </div>

      {/* Obstruction & SNR Visualization */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        <div className="glass-card rounded-xl p-5 border border-border/50">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning" />
            Sky Obstruction Analysis
          </h3>
          <div className="flex items-center gap-6">
            <div className="w-[150px] h-[150px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={obstructionPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {obstructionPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-success" />
                  <span className="text-sm">Clear Sky</span>
                </div>
                <span className="font-medium">{(100 - obstructionPercent).toFixed(1)}%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-destructive" />
                  <span className="text-sm">Obstructed</span>
                </div>
                <span className="font-medium">{obstructionPercent.toFixed(1)}%</span>
              </div>
              <div className="pt-2 border-t border-border/50">
                <p className="text-xs text-muted-foreground">
                  {obstructionStatus === 'good' 
                    ? '✓ Optimal positioning with minimal obstruction'
                    : obstructionStatus === 'warning'
                    ? '⚠ Consider adjusting dish position'
                    : '⚠ High obstruction - reposition recommended'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-5 border border-border/50">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Signal className="w-5 h-5 text-violet-400" />
            Signal-to-Noise Ratio
          </h3>
          <div className="flex items-center gap-6">
            <div className="w-[150px] h-[150px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart 
                  cx="50%" 
                  cy="50%" 
                  innerRadius="60%" 
                  outerRadius="100%" 
                  barSize={15}
                  data={snrGaugeData}
                  startAngle={180}
                  endAngle={0}
                >
                  <RadialBar
                    background={{ fill: 'hsl(var(--muted))' }}
                    dataKey="value"
                    cornerRadius={10}
                  />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-3">
              <div className="text-center">
                <span className="text-3xl font-bold" style={{ color: snr > 9 ? COLORS.success : snr > 5 ? COLORS.warning : COLORS.danger }}>
                  {snr.toFixed(1)} dB
                </span>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Quality:</span>
                  <span className={snrStatus === 'good' ? 'text-success' : snrStatus === 'warning' ? 'text-warning' : 'text-destructive'}>
                    {snrStatus === 'good' ? 'Excellent' : snrStatus === 'warning' ? 'Good' : 'Poor'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Target:</span>
                  <span>&gt;9 dB</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Signal & Power Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        <div className="glass-card rounded-xl p-5 border border-border/50">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Signal className="w-5 h-5 text-violet-400" />
            Signal Strength (24h)
          </h3>
          <div className="h-[150px]">
            {signalData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={signalData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="time" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                No signal data available
              </div>
            )}
          </div>
        </div>

        <div className="glass-card rounded-xl p-5 border border-border/50">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-orange-400" />
            Power Consumption (24h)
          </h3>
          <div className="h-[150px]">
            {powerData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={powerData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradient-starlink-power" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="time" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="value" stroke="#f97316" fill="url(#gradient-starlink-power)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                No power data available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Latency Trend */}
      <div className="glass-card rounded-xl p-5 border border-border/50 mb-8">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-cyan-400" />
          Latency History (24h)
        </h3>
        <div className="h-[150px]">
          {latencyData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={latencyData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="time" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                <Tooltip formatter={(value: number) => [`${value.toFixed(0)}ms`, 'Latency']} />
                <Bar dataKey="value" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
              No latency data available
            </div>
          )}
        </div>
      </div>

      {/* Device Info */}
      {sensorStats && (
        <div className="glass-card rounded-xl p-5 border border-border/50">
          <h3 className="font-semibold mb-4">Device Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Device Count</p>
              <p className="font-medium text-lg">{sensorStats.device_count ?? 0}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Total Readings</p>
              <p className="font-medium text-lg">{sensorStats.count?.toLocaleString() ?? 0}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Last 24h Readings</p>
              <p className="font-medium text-lg">{sensorStats.readings_last_24h?.toLocaleString() ?? 0}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Last Seen</p>
              <p className="font-medium text-lg">
                {sensorStats.last_seen ? new Date(sensorStats.last_seen).toLocaleTimeString() : '—'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StarlinkContent;