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
  Globe,
  Filter,
  X,
  Check
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  useSensorTypeStatsById, 
  useStarlinkDevices,
  useStarlinkDeviceStats,
  useStarlinkDeviceTimeseries,
  useStarlinkSignalStrength,
  useStarlinkPerformance,
  useStarlinkPower,
  useStarlinkConnectivity,
  useStarlinkGlobalStats,
  useClients,
  useStarlinkDevicesFromReadings,
  useStarlinkDeviceMetrics,
  StarlinkTimeseriesPoint 
} from "@/hooks/aurora";
import { StarlinkMonitoringPanel, StarlinkPerformanceCharts, StarlinkSignalChart } from "@/components/starlink";


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
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [clientFilterOpen, setClientFilterOpen] = useState(false);
  
  // Fetch actual Starlink devices from latest readings (with metrics per terminal)
  const { data: starlinkDevicesWithMetrics = [], isLoading: devicesLoading } = useStarlinkDevicesFromReadings();
  const { data: allClients = [] } = useClients();
  
  // Parse selected device to get client_id and device_id
  const selectedDeviceParsed = useMemo(() => {
    if (selectedDevice === "all") return { clientId: null, deviceId: null };
    const device = starlinkDevicesWithMetrics.find(d => d.composite_key === selectedDevice);
    return device ? { clientId: device.client_id, deviceId: device.device_id } : { clientId: null, deviceId: null };
  }, [selectedDevice, starlinkDevicesWithMetrics]);
  
  // Average stats (for "All" selection) - filter by first selected client if any
  const activeClientFilter = selectedClients.length > 0 ? selectedClients[0] : undefined;
  const { data: starlinkStats, isLoading: statsLoading } = useStarlinkStats();
  const { data: starlinkTimeseries, isLoading: timeseriesLoading } = useStarlinkTimeseries(24, activeClientFilter);
  const { data: sensorStats, isLoading: sensorLoading } = useSensorTypeStatsById("starlink");
  
  // New dedicated API endpoints for detailed metrics
  const { data: signalStrength } = useStarlinkSignalStrength();
  const { data: performance } = useStarlinkPerformance();
  const { data: power } = useStarlinkPower();
  const { data: connectivity } = useStarlinkConnectivity();
  const { data: globalStats } = useStarlinkGlobalStats();
  
  // Individual device stats - now using device-specific timeseries hook
  const { data: deviceTimeseries, isLoading: deviceTimeseriesLoading } = useStarlinkDeviceMetrics(
    selectedDeviceParsed.clientId,
    selectedDeviceParsed.deviceId,
    24
  );

  // Extract unique clients from starlink devices
  const availableClients = useMemo(() => {
    const clientIds = new Set<string>();
    starlinkDevicesWithMetrics.forEach(device => {
      if (device.client_id) {
        clientIds.add(device.client_id);
      }
    });
    return Array.from(clientIds).sort();
  }, [starlinkDevicesWithMetrics]);

  // Get client name helper
  const getClientName = (clientId: string) => {
    const client = allClients.find(c => c.client_id === clientId);
    return client?.hostname || clientId;
  };

  // Filter devices based on selected clients
  const filteredDevices = useMemo(() => {
    if (selectedClients.length === 0) return starlinkDevicesWithMetrics;
    return starlinkDevicesWithMetrics.filter(device => 
      device.client_id && selectedClients.includes(device.client_id)
    );
  }, [starlinkDevicesWithMetrics, selectedClients]);

  // Toggle client selection
  const toggleClient = (clientId: string) => {
    setSelectedClients(prev => 
      prev.includes(clientId) 
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
  };

  // Clear all client filters
  const clearClientFilter = () => {
    setSelectedClients([]);
  };

  // Select all clients
  const selectAllClients = () => {
    setSelectedClients(availableClients);
  };

  const isAllSelected = selectedDevice === "all";
  const isLoading = statsLoading || timeseriesLoading || sensorLoading || devicesLoading || 
    (!isAllSelected && deviceTimeseriesLoading);
  
  // Get the selected device's metrics from the devices list
  const selectedDeviceData = useMemo(() => {
    if (isAllSelected) return null;
    return starlinkDevicesWithMetrics.find(d => d.composite_key === selectedDevice) ?? null;
  }, [isAllSelected, selectedDevice, starlinkDevicesWithMetrics]);
  
  // Build device-specific stats from selected device metrics
  const deviceStats = useMemo(() => {
    if (!selectedDeviceData) return null;
    return {
      uptime_seconds: selectedDeviceData.metrics.uptime_seconds,
      downlink_throughput_bps: selectedDeviceData.metrics.downlink_throughput_bps,
      uplink_throughput_bps: selectedDeviceData.metrics.uplink_throughput_bps,
      pop_ping_latency_ms: selectedDeviceData.metrics.pop_ping_latency_ms,
      snr: selectedDeviceData.metrics.snr,
      obstruction_percent_time: selectedDeviceData.metrics.obstruction_percent,
      signal_dbm: selectedDeviceData.metrics.signal_strength_dbm,
      power_w: selectedDeviceData.metrics.power_watts,
    };
  }, [selectedDeviceData]);
  
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
            {isAllSelected 
              ? `${starlinkDevicesWithMetrics.length} terminal${starlinkDevicesWithMetrics.length !== 1 ? 's' : ''} detected` 
              : selectedDeviceData 
                ? `${selectedDeviceData.device_id} @ ${getClientName(selectedDeviceData.client_id)}`
                : `Device: ${selectedDevice}`}
            {selectedClients.length > 0 && ` • ${selectedClients.length} client${selectedClients.length !== 1 ? 's' : ''} filtered`}
          </p>
        </div>
        
        {/* Filters */}
        <div className="ml-auto flex items-center gap-3">
          {/* Client Multi-Select Filter */}
          <Popover open={clientFilterOpen} onOpenChange={setClientFilterOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="w-4 h-4" />
                {selectedClients.length === 0 ? (
                  "All Clients"
                ) : (
                  <span className="flex items-center gap-1">
                    {selectedClients.length} Client{selectedClients.length !== 1 ? 's' : ''}
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                      {selectedClients.length}
                    </Badge>
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
              <div className="p-3 border-b border-border">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm">Filter by Client</h4>
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 text-xs"
                      onClick={clearClientFilter}
                    >
                      Clear
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 text-xs"
                      onClick={selectAllClients}
                    >
                      Select All
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedClients.length === 0 
                    ? "Showing all clients" 
                    : `${selectedClients.length} of ${availableClients.length} clients selected`}
                </p>
              </div>
              <ScrollArea className="h-[300px]">
                <div className="p-2 space-y-1">
                  {availableClients.length > 0 ? (
                    availableClients.map((clientId) => {
                      const isSelected = selectedClients.includes(clientId);
                      const client = allClients.find(c => c.client_id === clientId);
                      const isActive = client?.state === 'adopted' || client?.state === 'registered';
                      
                      return (
                        <div
                          key={clientId}
                          className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors hover:bg-muted/50 ${
                            isSelected ? 'bg-primary/10' : ''
                          }`}
                          onClick={() => toggleClient(clientId)}
                        >
                          <Checkbox 
                            checked={isSelected}
                            className="pointer-events-none"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {getClientName(clientId)}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {clientId}
                            </p>
                          </div>
                          <Badge 
                            variant={isActive ? "default" : "secondary"}
                            className="text-xs shrink-0"
                          >
                            {isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      No clients available
                    </div>
                  )}
                </div>
              </ScrollArea>
            </PopoverContent>
          </Popover>

          {/* Device Selector */}
          <Select value={selectedDevice} onValueChange={setSelectedDevice}>
            <SelectTrigger className="w-[200px] bg-background border-border">
              <SelectValue placeholder="Select device" />
            </SelectTrigger>
            <SelectContent className="bg-background border-border z-50">
              <SelectItem value="all">All Devices (Average)</SelectItem>
              {filteredDevices && filteredDevices.length > 0 && (
                filteredDevices.map((device) => (
                  <SelectItem key={device.composite_key} value={device.composite_key}>
                    <div className="flex flex-col">
                      <span>{device.device_id}</span>
                      <span className="text-xs text-muted-foreground">{getClientName(device.client_id)}</span>
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          
        </div>
      </div>

      {/* Active Filters Display */}
      {selectedClients.length > 0 && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-xs text-muted-foreground">Active filters:</span>
          {selectedClients.map(clientId => (
            <Badge 
              key={clientId}
              variant="secondary" 
              className="gap-1 pr-1"
            >
              {getClientName(clientId)}
              <button
                onClick={() => toggleClient(clientId)}
                className="ml-1 hover:bg-muted rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 text-xs text-muted-foreground"
            onClick={clearClientFilter}
          >
            Clear all
          </Button>
        </div>
      )}

      {/* Real-time Signal Strength Chart */}
      <div className="mb-8">
        <StarlinkSignalChart 
          hours={6} 
          clientId={selectedDeviceParsed.clientId ?? activeClientFilter} 
          deviceId={selectedDeviceParsed.deviceId ?? undefined} 
        />
      </div>

      {/* Real-time Monitoring Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-1">
          <StarlinkMonitoringPanel />
        </div>
        <div className="lg:col-span-2">
          <StarlinkPerformanceCharts 
            hours={24} 
            deviceId={selectedDeviceParsed.deviceId ?? (selectedDevice !== "all" ? selectedDevice : undefined)} 
          />
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

      {/* Individual Device Stats - Signal Strength & Power */}
      {!isAllSelected && deviceStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <MetricCard
            title="Signal Strength"
            value={deviceStats.signal_dbm?.toFixed(1) ?? '—'}
            unit="dBm"
            icon={<Signal className="w-5 h-5 text-cyan-400" />}
            status={(deviceStats.signal_dbm ?? -100) > -70 ? 'good' : (deviceStats.signal_dbm ?? -100) > -85 ? 'warning' : 'critical'}
            subtitle={(deviceStats.signal_dbm ?? -100) > -70 ? 'Strong signal' : (deviceStats.signal_dbm ?? -100) > -85 ? 'Moderate' : 'Weak signal'}
            isLoading={devicesLoading}
          />
          <MetricCard
            title="Power Consumption"
            value={deviceStats.power_w?.toFixed(1) ?? '—'}
            unit="W"
            icon={<Zap className="w-5 h-5 text-amber-400" />}
            status={(deviceStats.power_w ?? 0) < 100 ? 'good' : (deviceStats.power_w ?? 0) < 150 ? 'warning' : 'critical'}
            subtitle={(deviceStats.power_w ?? 0) < 100 ? 'Normal' : (deviceStats.power_w ?? 0) < 150 ? 'Elevated' : 'High usage'}
            isLoading={devicesLoading}
          />
        </div>
      )}

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