import { useMemo } from "react";
import { Server, Database, Activity, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useDashboardClientStats,
  useClientsWithHostnames,
  type ClientStatsItem,
} from "@/hooks/aurora";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

interface ClientReadingsBreakdownProps {
  periodHours?: number;
  clientId?: string | null;
}

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#ef4444', '#84cc16'];

const ClientReadingsBreakdown = ({ periodHours = 24, clientId }: ClientReadingsBreakdownProps) => {
  // Normalize clientId - "all" or empty means global view (no filter)
  const effectiveClientId = clientId && clientId !== "all" ? clientId : undefined;
  
  // Fetch client stats for the specified period and client filter
  const { data: clientStats, isLoading } = useDashboardClientStats(effectiveClientId, periodHours);
  const { data: clientsWithHostnames } = useClientsWithHostnames();

  // Build a map of client_id to hostname
  const hostnameMap = useMemo(() => {
    const map: Record<string, string> = {};
    if (clientsWithHostnames) {
      clientsWithHostnames.forEach(c => {
        if (c.client_id && c.hostname && c.hostname !== 'unknown') {
          map[c.client_id] = c.hostname;
        }
      });
    }
    return map;
  }, [clientsWithHostnames]);

  // Process client data for visualization
  const chartData = useMemo(() => {
    if (!clientStats?.clients || clientStats.clients.length === 0) return [];
    
    const totalReadings = clientStats.clients.reduce((sum, c) => sum + (c.reading_count || 0), 0);
    
    return clientStats.clients
      .sort((a, b) => (b.reading_count || 0) - (a.reading_count || 0))
      .map((client, idx) => {
        const hostname = hostnameMap[client.client_id] || null;
        const displayName = hostname || client.client_id?.slice(0, 12) || `Client ${idx + 1}`;
        const percentage = totalReadings > 0 ? ((client.reading_count || 0) / totalReadings) * 100 : 0;
        
        return {
          name: displayName,
          fullName: client.client_id,
          hostname,
          value: client.reading_count || 0,
          percentage,
          deviceCount: client.device_count || 0,
          sensorTypes: client.sensor_types || [],
          sensorTypeCount: client.sensor_type_count || 0,
          color: COLORS[idx % COLORS.length],
          lastReading: client.last_reading,
        };
      });
  }, [clientStats?.clients, hostnameMap]);

  const totalReadings = useMemo(() => {
    return chartData.reduce((sum, c) => sum + c.value, 0);
  }, [chartData]);

  const totalClients = chartData.length;

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: typeof chartData[0] }> }) => {
    if (!active || !payload?.length) return null;
    const data = payload[0].payload;
    
    return (
      <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-lg">
        <p className="font-medium text-foreground">{data.name}</p>
        {data.hostname && (
          <p className="text-xs text-muted-foreground">{data.fullName}</p>
        )}
        <div className="mt-2 space-y-1">
          <p className="text-sm">
            <span className="text-muted-foreground">Readings:</span>{' '}
            <span className="font-medium text-primary">{data.value.toLocaleString()}</span>
          </p>
          <p className="text-sm">
            <span className="text-muted-foreground">Share:</span>{' '}
            <span className="font-medium">{data.percentage.toFixed(1)}%</span>
          </p>
          <p className="text-sm">
            <span className="text-muted-foreground">Sensors:</span>{' '}
            <span className="font-medium">{data.sensorTypeCount}</span>
          </p>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card className="glass-card border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Server className="w-4 h-4 text-green-500" />
            Client Readings Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-[200px]" />
            <Skeleton className="h-[200px]" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card className="glass-card border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Server className="w-4 h-4 text-green-500" />
            Client Readings Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[200px] flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <Server className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No client data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Server className="w-4 h-4 text-green-500" />
            Client Readings Breakdown ({periodHours}h)
          </CardTitle>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-xs">
              <Database className="w-3 h-3 mr-1" />
              {totalReadings.toLocaleString()} readings
            </Badge>
            <Badge variant="outline" className="text-xs">
              <Server className="w-3 h-3 mr-1" />
              {totalClients} clients
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie Chart */}
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Bar Chart */}
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  width={80}
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`bar-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Client List with Progress Bars */}
        <div className="mt-6 space-y-3">
          {chartData.slice(0, 6).map((client, idx) => (
            <div key={client.fullName || idx} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: client.color }}
                  />
                  <span className="font-medium truncate max-w-[200px]" title={client.fullName}>
                    {client.name}
                  </span>
                  {client.sensorTypeCount > 0 && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {client.sensorTypeCount} sensors
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <span className="text-xs">{client.percentage.toFixed(1)}%</span>
                  <span className="font-medium text-foreground tabular-nums">
                    {client.value.toLocaleString()}
                  </span>
                </div>
              </div>
              <Progress 
                value={client.percentage} 
                className="h-2"
              />
            </div>
          ))}
          
          {chartData.length > 6 && (
            <p className="text-xs text-muted-foreground text-center pt-2">
              +{chartData.length - 6} more clients
            </p>
          )}
        </div>

        {/* Sensor Type Summary */}
        {chartData.length > 0 && (
          <div className="mt-6 pt-4 border-t border-border/50">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium">Active Sensor Types</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {Array.from(new Set(chartData.flatMap(c => c.sensorTypes)))
                .slice(0, 12)
                .map((sensorType, idx) => (
                  <Badge 
                    key={sensorType} 
                    variant="outline" 
                    className="text-xs"
                    style={{ borderColor: COLORS[idx % COLORS.length] + '40' }}
                  >
                    {sensorType.replace(/_/g, ' ')}
                  </Badge>
                ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ClientReadingsBreakdown;
