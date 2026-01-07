import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  TrendingUp,
  Database,
  Radio,
  AlertTriangle,
  Cpu,
  Loader2,
  Server,
  Activity,
} from "lucide-react";
import { format } from "date-fns";
import {
  useGlobalStatsHistory,
  useSensorStatsHistory,
  useDeviceStatsHistory,
  useAlertStatsHistory,
  useSystemResourceStatsHistory,
  GlobalStatsHistoryPoint,
  SensorStatsHistoryPoint,
  DeviceStatsHistoryPoint,
  AlertStatsHistoryPoint,
  SystemResourceStatsHistoryPoint,
} from "@/hooks/useAuroraApi";

interface StatsHistoryChartsProps {
  hours?: number;
}

const formatTimestamp = (timestamp: string) => {
  try {
    return format(new Date(timestamp), "HH:mm");
  } catch {
    return timestamp;
  }
};

const formatTooltipTime = (timestamp: string) => {
  try {
    return format(new Date(timestamp), "MMM d, HH:mm");
  } catch {
    return timestamp;
  }
};

const ChartLoading = () => (
  <div className="h-[300px] flex items-center justify-center">
    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
  </div>
);

const NoDataMessage = () => (
  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
    No historical data available
  </div>
);

// Global Stats Chart
const GlobalStatsChart = ({ data, isLoading }: { data?: GlobalStatsHistoryPoint[]; isLoading: boolean }) => {
  if (isLoading) return <ChartLoading />;
  if (!data || data.length === 0) return <NoDataMessage />;

  const chartData = data.map((point) => ({
    ...point,
    time: formatTimestamp(point.timestamp),
    fullTime: formatTooltipTime(point.timestamp),
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id="colorReadings" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorDevices" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorClients" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
        <XAxis dataKey="time" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
        <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
          }}
          labelFormatter={(_, payload) => payload?.[0]?.payload?.fullTime || ""}
        />
        <Legend />
        <Area
          type="monotone"
          dataKey="total_readings"
          name="Readings"
          stroke="#3b82f6"
          fill="url(#colorReadings)"
        />
        <Area
          type="monotone"
          dataKey="total_devices"
          name="Devices"
          stroke="#22c55e"
          fill="url(#colorDevices)"
        />
        <Area
          type="monotone"
          dataKey="total_clients"
          name="Clients"
          stroke="#f59e0b"
          fill="url(#colorClients)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

// Sensor Stats Chart
const SensorStatsChart = ({ data, isLoading }: { data?: SensorStatsHistoryPoint[]; isLoading: boolean }) => {
  if (isLoading) return <ChartLoading />;
  if (!data || data.length === 0) return <NoDataMessage />;

  // Group by sensor type
  const sensorTypes = [...new Set(data.map((d) => d.sensor_type))];
  const colors = ["#3b82f6", "#22c55e", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#ef4444", "#84cc16"];

  // Transform data for chart - group by timestamp
  const groupedByTimestamp = data.reduce((acc, point) => {
    const time = formatTimestamp(point.timestamp);
    if (!acc[time]) {
      acc[time] = { time, fullTime: formatTooltipTime(point.timestamp) };
    }
    acc[time][point.sensor_type] = point.reading_count;
    return acc;
  }, {} as Record<string, Record<string, string | number>>);

  const chartData = Object.values(groupedByTimestamp);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
        <XAxis dataKey="time" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
        <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
          }}
          labelFormatter={(_, payload) => payload?.[0]?.payload?.fullTime || ""}
        />
        <Legend />
        {sensorTypes.map((type, idx) => (
          <Bar
            key={type}
            dataKey={type}
            name={type.replace(/_/g, " ")}
            fill={colors[idx % colors.length]}
            stackId="sensors"
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
};

// Device Stats Chart
const DeviceStatsChart = ({ data, isLoading }: { data?: DeviceStatsHistoryPoint[]; isLoading: boolean }) => {
  if (isLoading) return <ChartLoading />;
  if (!data || data.length === 0) return <NoDataMessage />;

  // Get unique device types
  const deviceTypes = [...new Set(data.map((d) => d.device_type))];
  const colors = ["#8b5cf6", "#06b6d4", "#ef4444", "#84cc16", "#f59e0b", "#ec4899", "#3b82f6", "#22c55e"];

  // Group by timestamp and device_type
  const groupedByTimestamp = data.reduce((acc, point) => {
    const time = formatTimestamp(point.timestamp);
    if (!acc[time]) {
      acc[time] = { time, fullTime: formatTooltipTime(point.timestamp) };
    }
    acc[time][point.device_type] = (acc[time][point.device_type] as number || 0) + point.reading_count;
    return acc;
  }, {} as Record<string, Record<string, string | number>>);

  const chartData = Object.values(groupedByTimestamp);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
        <XAxis dataKey="time" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
        <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
          }}
          labelFormatter={(_, payload) => payload?.[0]?.payload?.fullTime || ""}
        />
        <Legend />
        {deviceTypes.map((type, idx) => (
          <Line
            key={type}
            type="monotone"
            dataKey={type}
            name={type.replace(/_/g, " ")}
            stroke={colors[idx % colors.length]}
            strokeWidth={2}
            dot={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
};

// Alert Stats Chart
const AlertStatsChart = ({ data, isLoading }: { data?: AlertStatsHistoryPoint[]; isLoading: boolean }) => {
  if (isLoading) return <ChartLoading />;
  if (!data || data.length === 0) return <NoDataMessage />;

  const chartData = data.map((point) => ({
    ...point,
    time: formatTimestamp(point.timestamp),
    fullTime: formatTooltipTime(point.timestamp),
    active: point.total_alerts - point.acknowledged_count - point.resolved_count,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id="colorCritical" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorWarning" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorInfo" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
        <XAxis dataKey="time" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
        <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
          }}
          labelFormatter={(_, payload) => payload?.[0]?.payload?.fullTime || ""}
        />
        <Legend />
        <Area
          type="monotone"
          dataKey="critical_count"
          name="Critical"
          stroke="#ef4444"
          fill="url(#colorCritical)"
          stackId="alerts"
        />
        <Area
          type="monotone"
          dataKey="warning_count"
          name="Warning"
          stroke="#f59e0b"
          fill="url(#colorWarning)"
          stackId="alerts"
        />
        <Area
          type="monotone"
          dataKey="info_count"
          name="Info"
          stroke="#3b82f6"
          fill="url(#colorInfo)"
          stackId="alerts"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

// System Resource Stats Chart
const SystemResourceChart = ({ data, isLoading }: { data?: SystemResourceStatsHistoryPoint[]; isLoading: boolean }) => {
  if (isLoading) return <ChartLoading />;
  if (!data || data.length === 0) return <NoDataMessage />;

  const chartData = data.map((point) => ({
    ...point,
    time: formatTimestamp(point.timestamp),
    fullTime: formatTooltipTime(point.timestamp),
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
        <XAxis dataKey="time" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
        <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} domain={[0, 100]} />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
          }}
          labelFormatter={(_, payload) => payload?.[0]?.payload?.fullTime || ""}
          formatter={(value: number) => `${value?.toFixed(1)}%`}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="cpu_usage"
          name="CPU"
          stroke="#ef4444"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="memory_usage"
          name="Memory"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="disk_usage"
          name="Disk"
          stroke="#22c55e"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default function StatsHistoryCharts({ hours: initialHours = 24 }: StatsHistoryChartsProps) {
  const [hours, setHours] = useState(initialHours);
  const [activeTab, setActiveTab] = useState("global");

  const { data: globalData, isLoading: globalLoading } = useGlobalStatsHistory(hours);
  const { data: sensorData, isLoading: sensorLoading } = useSensorStatsHistory(hours);
  const { data: deviceData, isLoading: deviceLoading } = useDeviceStatsHistory(hours);
  const { data: alertData, isLoading: alertLoading } = useAlertStatsHistory(hours);
  const { data: systemData, isLoading: systemLoading } = useSystemResourceStatsHistory(hours);

  const latestGlobal = globalData?.[globalData.length - 1];
  const latestAlerts = alertData?.[alertData.length - 1];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Stats History</h2>
            <p className="text-sm text-muted-foreground">Historical trends and analytics</p>
          </div>
        </div>
        <Select value={hours.toString()} onValueChange={(v) => setHours(parseInt(v))}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Last 1 hour</SelectItem>
            <SelectItem value="6">Last 6 hours</SelectItem>
            <SelectItem value="24">Last 24 hours</SelectItem>
            <SelectItem value="72">Last 3 days</SelectItem>
            <SelectItem value="168">Last 7 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Database className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Total Readings</span>
            </div>
            <div className="text-2xl font-bold">
              {globalLoading ? "..." : latestGlobal?.total_readings?.toLocaleString() ?? "—"}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Server className="w-4 h-4 text-green-500" />
              <span className="text-xs text-muted-foreground">Active Devices</span>
            </div>
            <div className="text-2xl font-bold">
              {globalLoading ? "..." : latestGlobal?.total_devices?.toLocaleString() ?? "—"}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Radio className="w-4 h-4 text-purple-500" />
              <span className="text-xs text-muted-foreground">Sensor Types</span>
            </div>
            <div className="text-2xl font-bold">
              {globalLoading ? "..." : latestGlobal?.total_sensors?.toLocaleString() ?? "—"}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span className="text-xs text-muted-foreground">Active Alerts</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">
                {alertLoading ? "..." : latestAlerts?.total_alerts?.toLocaleString() ?? "—"}
              </span>
              {latestAlerts && latestAlerts.critical_count > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {latestAlerts.critical_count} critical
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Different Charts */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/50">
          <TabsTrigger value="global" className="gap-2">
            <TrendingUp className="w-4 h-4" />
            Global
          </TabsTrigger>
          <TabsTrigger value="sensors" className="gap-2">
            <Radio className="w-4 h-4" />
            Sensors
          </TabsTrigger>
          <TabsTrigger value="devices" className="gap-2">
            <Activity className="w-4 h-4" />
            Devices
          </TabsTrigger>
          <TabsTrigger value="alerts" className="gap-2">
            <AlertTriangle className="w-4 h-4" />
            Alerts
          </TabsTrigger>
          <TabsTrigger value="system" className="gap-2">
            <Cpu className="w-4 h-4" />
            System
          </TabsTrigger>
        </TabsList>

        <TabsContent value="global" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Global Statistics Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <GlobalStatsChart data={globalData} isLoading={globalLoading} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sensors" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Radio className="w-4 h-4" />
                Sensor Type Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SensorStatsChart data={sensorData} isLoading={sensorLoading} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="devices" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Device Activity by Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DeviceStatsChart data={deviceData} isLoading={deviceLoading} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Alert Trends by Severity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AlertStatsChart data={alertData} isLoading={alertLoading} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Cpu className="w-4 h-4" />
                System Resource Usage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SystemResourceChart data={systemData} isLoading={systemLoading} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
