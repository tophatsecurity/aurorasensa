import { Activity, Cpu, HardDrive, Clock, Thermometer, Server, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, Legend 
} from "recharts";
import { useClients, useDashboardStats } from "@/hooks/useAuroraApi";
import { useMetricsHistory } from "@/hooks/useMetricsHistory";
import { Skeleton } from "@/components/ui/skeleton";

const PerformanceContent = () => {
  const { data: clients, isLoading: clientsLoading } = useClients();
  const { data: dashboardStats, isLoading: statsLoading } = useDashboardStats();
  const { history: metricsHistory, isLoading: historyLoading } = useMetricsHistory(30000);

  // Aggregate system metrics from all clients
  const systemMetrics = clients?.reduce(
    (acc, client) => {
      const system = client.metadata?.system;
      if (system) {
        acc.clientsWithMetrics++;
        acc.totalCpu += system.cpu_percent || 0;
        acc.totalMemory += system.memory_percent || 0;
        acc.totalDisk += system.disk_percent || 0;
        acc.totalUptime += system.uptime_seconds || 0;
      }
      return acc;
    },
    { clientsWithMetrics: 0, totalCpu: 0, totalMemory: 0, totalDisk: 0, totalUptime: 0 }
  ) || { clientsWithMetrics: 0, totalCpu: 0, totalMemory: 0, totalDisk: 0, totalUptime: 0 };

  const avgCpu = systemMetrics.clientsWithMetrics > 0 
    ? Math.round(systemMetrics.totalCpu / systemMetrics.clientsWithMetrics) 
    : 0;
  const avgMemory = systemMetrics.clientsWithMetrics > 0 
    ? Math.round(systemMetrics.totalMemory / systemMetrics.clientsWithMetrics) 
    : 0;
  const avgDisk = systemMetrics.clientsWithMetrics > 0 
    ? Math.round(systemMetrics.totalDisk / systemMetrics.clientsWithMetrics) 
    : 0;
  const avgUptime = systemMetrics.clientsWithMetrics > 0 
    ? Math.round(systemMetrics.totalUptime / systemMetrics.clientsWithMetrics) 
    : 0;

  // Format uptime
  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  // Per-client CPU data for chart
  const cpuChartData = clients?.filter(c => c.metadata?.system?.cpu_percent !== undefined)
    .slice(0, 8)
    .map(client => ({
      name: client.hostname?.slice(0, 12) || client.client_id.slice(-8),
      value: Math.round(client.metadata?.system?.cpu_percent || 0),
    })) || [];

  // Per-client memory data for chart
  const memoryChartData = clients?.filter(c => c.metadata?.system?.memory_percent !== undefined)
    .slice(0, 8)
    .map(client => ({
      name: client.hostname?.slice(0, 12) || client.client_id.slice(-8),
      value: Math.round(client.metadata?.system?.memory_percent || 0),
    })) || [];

  const isLoading = clientsLoading || statsLoading;

  if (isLoading) {
    return (
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">System Performance</h1>
          <p className="text-muted-foreground">Monitor system resources and performance metrics</p>
        </div>
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-6 mb-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">System Performance</h1>
        <p className="text-muted-foreground">
          Aggregated metrics from {systemMetrics.clientsWithMetrics} clients with system monitoring
        </p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Avg CPU</span>
              </div>
              <span className="text-lg font-bold">{avgCpu}%</span>
            </div>
            <Progress value={avgCpu} className="h-2" />
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium">Avg Memory</span>
              </div>
              <span className="text-lg font-bold">{avgMemory}%</span>
            </div>
            <Progress value={avgMemory} className="h-2" />
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-yellow-500" />
                <span className="text-sm font-medium">Avg Disk</span>
              </div>
              <span className="text-lg font-bold">{avgDisk}%</span>
            </div>
            <Progress value={avgDisk} className="h-2" />
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium">Clients</span>
              </div>
              <span className="text-lg font-bold">{dashboardStats?.total_clients || clients?.length || 0}</span>
            </div>
            <Progress value={100} className="h-2" />
          </CardContent>
        </Card>
      </div>

      {/* NEW: Time-series history charts */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50 mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            System Metrics History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            {metricsHistory.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metricsHistory}>
                  <defs>
                    <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="memoryGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="diskGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-3))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--chart-3))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="time" 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={11} 
                    tickLine={false}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={11} 
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      background: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                    formatter={(value: number, name: string) => [`${value}%`, name]}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="avgCpu" 
                    name="CPU" 
                    stroke="hsl(var(--primary))" 
                    fill="url(#cpuGradient)"
                    strokeWidth={2}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="avgMemory" 
                    name="Memory" 
                    stroke="hsl(var(--chart-2))" 
                    fill="url(#memoryGradient)"
                    strokeWidth={2}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="avgDisk" 
                    name="Disk" 
                    stroke="hsl(var(--chart-3))" 
                    fill="url(#diskGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Collecting metrics history...</p>
                  <p className="text-xs">Data updates every 30 seconds</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">CPU Usage by Client</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              {cpuChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={cpuChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} angle={-20} textAnchor="end" height={50} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={[0, 100]} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                    <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))' }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No CPU data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Memory Usage by Client</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              {memoryChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={memoryChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} angle={-20} textAnchor="end" height={50} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={[0, 100]} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                    <Line type="monotone" dataKey="value" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{ fill: 'hsl(var(--chart-2))' }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No memory data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Fleet Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-6">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Clients</span>
                <span className="font-mono text-sm">{dashboardStats?.total_clients || clients?.length || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">With System Metrics</span>
                <span className="font-mono text-sm">{systemMetrics.clientsWithMetrics}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Sensors</span>
                <span className="font-mono text-sm">{dashboardStats?.total_sensors || 0}</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> Avg Uptime</span>
                <span className="font-mono text-sm">{formatUptime(avgUptime)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Avg Signal</span>
                <span className="font-mono text-sm">{dashboardStats?.avg_signal_dbm?.toFixed(1) || '--'} dBm</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Avg Power</span>
                <span className="font-mono text-sm">{dashboardStats?.avg_power_w?.toFixed(1) || '--'} W</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1"><Thermometer className="w-3 h-3" /> Avg Temp</span>
                <span className="font-mono text-sm text-green-500">{dashboardStats?.avg_temp_c?.toFixed(1) || '--'}°C</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Avg Humidity</span>
                <span className="font-mono text-sm">{dashboardStats?.avg_humidity?.toFixed(1) || '--'}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fleet CPU Load</span>
                <span className="font-mono text-sm">{avgCpu}%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PerformanceContent;
