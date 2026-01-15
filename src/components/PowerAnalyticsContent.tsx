import { useState, useMemo } from "react";
import {
  Zap,
  RefreshCw,
  Loader2,
  Filter,
  Satellite,
  TrendingUp,
  TrendingDown,
  Activity,
  Battery,
  Wifi,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend,
} from "recharts";
import {
  useStarlinkTimeseries,
  useStarlinkPower,
  useDashboardTimeseries,
  useClients,
} from "@/hooks/aurora";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

const COLORS = {
  power: "#f59e0b",
  starlink: "#8b5cf6",
  downlink: "#22c55e",
  uplink: "#3b82f6",
  latency: "#ef4444",
};

const SENSOR_TYPES = ["starlink_power", "starlink_network", "dashboard_power"] as const;
type PowerSensorType = typeof SENSOR_TYPES[number];

const SENSOR_TYPE_LABELS: Record<PowerSensorType, string> = {
  starlink_power: "Starlink Power",
  starlink_network: "Starlink Network",
  dashboard_power: "Dashboard Power",
};

const PowerAnalyticsContent = () => {
  const queryClient = useQueryClient();
  const [timeRange, setTimeRange] = useState("24");
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [selectedSensorTypes, setSelectedSensorTypes] = useState<PowerSensorType[]>([]);

  const hours = parseInt(timeRange);

  const { data: starlinkTimeseries, isLoading: starlinkLoading } = useStarlinkTimeseries(hours);
  const { data: starlinkPower, isLoading: powerLoading } = useStarlinkPower();
  const { data: dashboardTimeseries, isLoading: dashboardLoading } = useDashboardTimeseries(hours);
  const { data: clients } = useClients();

  const isLoading = starlinkLoading || powerLoading || dashboardLoading;

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["aurora"] });
  };

  // Get all unique clients from Starlink data
  const allClients = useMemo(() => {
    const clientIds = new Set<string>();
    starlinkTimeseries?.readings?.forEach((r: any) => r.client_id && clientIds.add(r.client_id));
    return Array.from(clientIds).sort();
  }, [starlinkTimeseries]);

  // Map client_id to client name for display
  const getClientName = (clientId: string) => {
    const client = clients?.find(c => c.client_id === clientId);
    return client?.hostname || clientId;
  };

  const isClientSelected = (clientId: string) =>
    selectedClients.length === 0 || selectedClients.includes(clientId);

  const toggleClient = (clientId: string) => {
    setSelectedClients(prev =>
      prev.includes(clientId)
        ? prev.filter(c => c !== clientId)
        : [...prev, clientId]
    );
  };

  const isSensorTypeSelected = (type: PowerSensorType) => 
    selectedSensorTypes.length === 0 || selectedSensorTypes.includes(type);

  const toggleSensorType = (type: PowerSensorType) => {
    setSelectedSensorTypes(prev => 
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  // Process Starlink power data
  const powerChartData = useMemo(() => {
    const showStarlinkPower = isSensorTypeSelected("starlink_power");
    const showStarlinkNetwork = isSensorTypeSelected("starlink_network");
    
    if (!showStarlinkPower && !showStarlinkNetwork) return [];
    
    const data: Array<{ time: string; power?: number; downlink?: number; uplink?: number; latency?: number }> = [];

    starlinkTimeseries?.readings?.forEach((r: any) => {
      if (r.client_id && !isClientSelected(r.client_id)) return;

      const time = format(new Date(r.timestamp), "HH:mm");
      const existing = data.find(d => d.time === time);

      if (existing) {
        if (showStarlinkPower && r.power_w !== undefined) existing.power = r.power_w;
        if (showStarlinkNetwork && r.downlink_mbps !== undefined) existing.downlink = r.downlink_mbps;
        if (showStarlinkNetwork && r.uplink_mbps !== undefined) existing.uplink = r.uplink_mbps;
        if (showStarlinkNetwork && r.latency_ms !== undefined) existing.latency = r.latency_ms;
      } else {
        data.push({
          time,
          power: showStarlinkPower ? r.power_w : undefined,
          downlink: showStarlinkNetwork ? r.downlink_mbps : undefined,
          uplink: showStarlinkNetwork ? r.uplink_mbps : undefined,
          latency: showStarlinkNetwork ? r.latency_ms : undefined,
        });
      }
    });

    return data.sort((a, b) => a.time.localeCompare(b.time));
  }, [starlinkTimeseries, selectedClients, selectedSensorTypes]);

  // Dashboard power data
  const dashboardPowerData = useMemo(() => {
    if (!isSensorTypeSelected("dashboard_power")) return [];
    return (dashboardTimeseries?.power || []).map(p => ({
      time: format(new Date(p.timestamp), "HH:mm"),
      power: p.value,
    })).sort((a, b) => a.time.localeCompare(b.time));
  }, [dashboardTimeseries, selectedSensorTypes]);

  // Calculate stats
  const stats = useMemo(() => {
    const showStarlinkPower = isSensorTypeSelected("starlink_power");
    const showStarlinkNetwork = isSensorTypeSelected("starlink_network");
    
    const powerValues: number[] = [];
    const downlinkValues: number[] = [];
    const uplinkValues: number[] = [];
    const latencyValues: number[] = [];

    starlinkTimeseries?.readings?.forEach((r: any) => {
      if (r.client_id && !isClientSelected(r.client_id)) return;
      if (showStarlinkPower && r.power_w !== undefined) powerValues.push(r.power_w);
      if (showStarlinkNetwork && r.downlink_mbps !== undefined) downlinkValues.push(r.downlink_mbps);
      if (showStarlinkNetwork && r.uplink_mbps !== undefined) uplinkValues.push(r.uplink_mbps);
      if (showStarlinkNetwork && r.latency_ms !== undefined) latencyValues.push(r.latency_ms);
    });

    return {
      currentPower: starlinkPower?.power_w ?? (powerValues.length > 0 ? powerValues[powerValues.length - 1] : null),
      avgPower: powerValues.length > 0 ? powerValues.reduce((a, b) => a + b, 0) / powerValues.length : null,
      maxPower: powerValues.length > 0 ? Math.max(...powerValues) : null,
      minPower: powerValues.length > 0 ? Math.min(...powerValues) : null,
      avgDownlink: downlinkValues.length > 0 ? downlinkValues.reduce((a, b) => a + b, 0) / downlinkValues.length : null,
      avgUplink: uplinkValues.length > 0 ? uplinkValues.reduce((a, b) => a + b, 0) / uplinkValues.length : null,
      avgLatency: latencyValues.length > 0 ? latencyValues.reduce((a, b) => a + b, 0) / latencyValues.length : null,
      totalReadings: powerValues.length,
    };
  }, [starlinkTimeseries, starlinkPower, selectedClients, selectedSensorTypes]);

  // Power efficiency percentage (mock calculation based on average vs max)
  const powerEfficiency = stats.maxPower && stats.avgPower
    ? Math.round((1 - (stats.avgPower / stats.maxPower)) * 100 + 50)
    : 75;

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
            <Zap className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Power Analytics</h1>
            <p className="text-muted-foreground">Power consumption and Starlink performance data</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Client Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="w-4 h-4" />
                Clients
                {selectedClients.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {selectedClients.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3" align="end">
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Filter by Client</span>
                  {selectedClients.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => setSelectedClients([])}
                    >
                      Clear
                    </Button>
                  )}
                </div>
                {allClients.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No clients found</p>
                ) : (
                  allClients.map(clientId => (
                    <div
                      key={clientId}
                      className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded cursor-pointer"
                      onClick={() => toggleClient(clientId)}
                    >
                      <Checkbox checked={selectedClients.includes(clientId)} />
                      <span className="text-sm truncate">{getClientName(clientId)}</span>
                    </div>
                  ))
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* Sensor Type Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="w-4 h-4" />
                Sensor Types
                {selectedSensorTypes.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {selectedSensorTypes.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3" align="end">
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Filter by Sensor Type</span>
                  {selectedSensorTypes.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => setSelectedSensorTypes([])}
                    >
                      Clear
                    </Button>
                  )}
                </div>
                {SENSOR_TYPES.map(type => (
                  <div
                    key={type}
                    className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded cursor-pointer"
                    onClick={() => toggleSensorType(type)}
                  >
                    <Checkbox checked={selectedSensorTypes.includes(type)} />
                    <span className="text-sm truncate">{SENSOR_TYPE_LABELS[type]}</span>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 Hour</SelectItem>
              <SelectItem value="6">6 Hours</SelectItem>
              <SelectItem value="24">24 Hours</SelectItem>
              <SelectItem value="168">7 Days</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Card className="glass-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <Zap className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {stats.currentPower !== null ? `${stats.currentPower.toFixed(1)}W` : "—"}
                </p>
                <p className="text-sm text-muted-foreground">Current Power</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {stats.avgDownlink !== null ? `${stats.avgDownlink.toFixed(1)}` : "—"}
                </p>
                <p className="text-sm text-muted-foreground">Avg Downlink (Mbps)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {stats.avgUplink !== null ? `${stats.avgUplink.toFixed(1)}` : "—"}
                </p>
                <p className="text-sm text-muted-foreground">Avg Uplink (Mbps)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                <Activity className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {stats.avgLatency !== null ? `${stats.avgLatency.toFixed(0)}ms` : "—"}
                </p>
                <p className="text-sm text-muted-foreground">Avg Latency</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
                <Satellite className="w-5 h-5 text-violet-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalReadings}</p>
                <p className="text-sm text-muted-foreground">Total Readings</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Power Efficiency Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="glass-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Battery className="w-5 h-5 text-amber-400" />
              Power Efficiency
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-4xl font-bold">{powerEfficiency}%</p>
              <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center">
                <Zap className="w-8 h-8 text-amber-400" />
              </div>
            </div>
            <Progress value={powerEfficiency} className="h-2" />
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/50">
              <div className="text-center">
                <p className="text-lg font-semibold">{stats.minPower?.toFixed(1) ?? "—"}W</p>
                <p className="text-xs text-muted-foreground">Min</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold">{stats.avgPower?.toFixed(1) ?? "—"}W</p>
                <p className="text-xs text-muted-foreground">Avg</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold">{stats.maxPower?.toFixed(1) ?? "—"}W</p>
                <p className="text-xs text-muted-foreground">Max</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Power Over Time */}
        <Card className="glass-card border-border/50 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              Power Consumption Over Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {isLoading ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : powerChartData.length > 0 || dashboardPowerData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={powerChartData.length > 0 ? powerChartData : dashboardPowerData}>
                    <defs>
                      <linearGradient id="powerGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.power} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={COLORS.power} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                    <Area type="monotone" dataKey="power" stroke={COLORS.power} fill="url(#powerGradient)" name="Power (W)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  No power data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Network Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Throughput Chart */}
        <Card className="glass-card border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Wifi className="w-5 h-5 text-green-400" />
              Network Throughput
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {isLoading ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : powerChartData.filter(d => d.downlink !== undefined || d.uplink !== undefined).length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={powerChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                    <Legend />
                    <Line type="monotone" dataKey="downlink" stroke={COLORS.downlink} name="Downlink (Mbps)" dot={false} strokeWidth={2} />
                    <Line type="monotone" dataKey="uplink" stroke={COLORS.uplink} name="Uplink (Mbps)" dot={false} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  No throughput data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Latency Chart */}
        <Card className="glass-card border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="w-5 h-5 text-red-400" />
              Latency Over Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {isLoading ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : powerChartData.filter(d => d.latency !== undefined).length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={powerChartData}>
                    <defs>
                      <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.latency} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={COLORS.latency} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                    <Area type="monotone" dataKey="latency" stroke={COLORS.latency} fill="url(#latencyGradient)" name="Latency (ms)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  No latency data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Combined Starlink Metrics */}
      <Card className="glass-card border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Satellite className="w-5 h-5 text-violet-400" />
            Starlink Performance Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            {isLoading ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : powerChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={powerChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="power" stroke={COLORS.power} name="Power (W)" dot={false} strokeWidth={2} />
                  <Line yAxisId="left" type="monotone" dataKey="downlink" stroke={COLORS.downlink} name="Downlink (Mbps)" dot={false} strokeWidth={1.5} />
                  <Line yAxisId="left" type="monotone" dataKey="uplink" stroke={COLORS.uplink} name="Uplink (Mbps)" dot={false} strokeWidth={1.5} />
                  <Line yAxisId="right" type="monotone" dataKey="latency" stroke={COLORS.latency} name="Latency (ms)" dot={false} strokeWidth={1.5} strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No Starlink data available
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PowerAnalyticsContent;
