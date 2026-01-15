import { useState, useMemo, useEffect } from "react";
import {
  Users,
  Cpu,
  Loader2,
  RefreshCw,
  Clock,
  Database,
  Activity,
  TrendingUp,
  Layers,
  ChevronRight,
  Server,
  Zap,
  Radio,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  useStatsByClient,
  useStatsBySensor,
  useClientDetailStats,
  useClientsWithHostnames,
  useClientSystemInfo,
  use1hrStats,
  use24hrStats,
  type ClientGroupedStats,
  type SensorGroupedStats,
} from "@/hooks/aurora";
import { useQueryClient } from "@tanstack/react-query";
import { useClientContext } from "@/contexts/ClientContext";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts";

// =============================================
// CONSTANTS & HELPERS
// =============================================

const SENSOR_COLORS: Record<string, string> = {
  arduino_sensor_kit: '#f97316',
  thermal_probe: '#f59e0b',
  wifi_scanner: '#3b82f6',
  bluetooth_scanner: '#6366f1',
  adsb_detector: '#06b6d4',
  lora_detector: '#ef4444',
  starlink_dish_comprehensive: '#8b5cf6',
  system_monitor: '#64748b',
  aht_sensor: '#ec4899',
  bmt_sensor: '#14b8a6',
  power_monitor: '#10b981',
  gps_tracker: '#0ea5e9',
  maritime_ais: '#84cc16',
  default: '#a855f7',
};

const CLIENT_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#6366f1',
  '#ec4899', '#14b8a6', '#f97316', '#8b5cf6', '#06b6d4',
];

const getSensorColor = (sensorType: string): string => SENSOR_COLORS[sensorType] || SENSOR_COLORS.default;
const getClientColor = (index: number): string => CLIENT_COLORS[index % CLIENT_COLORS.length];

const formatNumber = (num: number | undefined | null): string => {
  if (num === undefined || num === null) return '—';
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toFixed(0);
};

const formatDate = (dateStr: string | undefined | null): string => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString();
};

const formatSensorName = (sensorType: string): string => {
  return sensorType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};

const formatClientName = (clientId: string, hostname?: string): string => {
  if (hostname && hostname !== 'unknown') return hostname;
  if (clientId.length > 12) return `${clientId.slice(0, 8)}...`;
  return clientId;
};

const getResourceColor = (percent: number): string => {
  if (percent >= 90) return "text-red-400";
  if (percent >= 75) return "text-amber-400";
  if (percent >= 50) return "text-yellow-400";
  return "text-green-400";
};

// =============================================
// SUB-COMPONENTS
// =============================================

interface ClientSelectorProps {
  clients: ClientGroupedStats[];
  selectedClientId: string;
  onSelect: (clientId: string) => void;
  isLoading: boolean;
}

const ClientSelectorBar = ({ clients, selectedClientId, onSelect, isLoading }: ClientSelectorProps) => {
  const selectedClient = clients.find(c => c.client_id === selectedClientId);
  const selectedIndex = clients.findIndex(c => c.client_id === selectedClientId);
  const color = selectedIndex >= 0 ? getClientColor(selectedIndex) : '#3b82f6';

  return (
    <Card className="border-primary/30">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div 
              className="w-12 h-12 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${color}20`, color }}
            >
              <Server className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Selected Client</p>
              <Select value={selectedClientId} onValueChange={onSelect} disabled={isLoading}>
                <SelectTrigger className="w-[220px] h-9 font-medium border-0 bg-transparent px-0 focus:ring-0">
                  <SelectValue placeholder="Select client...">
                    {selectedClient ? formatClientName(selectedClient.client_id, selectedClient.hostname) : 'Select...'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client, index) => (
                    <SelectItem key={client.client_id} value={client.client_id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: getClientColor(index) }}
                        />
                        {formatClientName(client.client_id, client.hostname)}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {selectedClient && (
            <div className="flex flex-wrap gap-4 sm:ml-auto text-sm">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Readings:</span>
                <span className="font-semibold" style={{ color }}>{formatNumber(selectedClient.reading_count)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Devices:</span>
                <span className="font-semibold">{selectedClient.device_count}</span>
              </div>
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Sensors:</span>
                <span className="font-semibold">{selectedClient.sensor_type_count}</span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

interface StatMetricProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color?: string;
  subValue?: string;
}

const StatMetric = ({ icon: Icon, label, value, color, subValue }: StatMetricProps) => (
  <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
    <div className="flex items-center gap-2 text-muted-foreground mb-1">
      <Icon className="w-4 h-4" />
      <span className="text-xs">{label}</span>
    </div>
    <p className={`text-xl font-bold ${color || ''}`}>{value}</p>
    {subValue && <p className="text-xs text-muted-foreground mt-0.5">{subValue}</p>}
  </div>
);

interface ResourceMetricProps {
  icon: React.ElementType;
  label: string;
  value: number;
  unit: string;
}

const ResourceMetric = ({ icon: Icon, label, value, unit }: ResourceMetricProps) => {
  const color = getResourceColor(value);
  return (
    <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        <Icon className="w-4 h-4" />
        <span className="text-xs">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <p className={`text-xl font-bold ${color}`}>{value.toFixed(1)}</p>
        <span className="text-xs text-muted-foreground">{unit}</span>
      </div>
      <Progress value={Math.min(value, 100)} className="mt-2 h-1" />
    </div>
  );
};

interface ClientCardProps {
  client: ClientGroupedStats;
  index: number;
  onClick: () => void;
  isSelected: boolean;
}

const ClientCard = ({ client, index, onClick, isSelected }: ClientCardProps) => {
  const color = getClientColor(index);
  
  return (
    <Card 
      className={`cursor-pointer transition-all hover:scale-[1.02] ${isSelected ? 'ring-2 ring-primary' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${color}20`, color }}
            >
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-sm">
                {formatClientName(client.client_id, client.hostname)}
              </h4>
              <p className="text-xs text-muted-foreground">
                {client.device_count} device{client.device_count !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs">
            {client.sensor_type_count} types
          </Badge>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-muted-foreground">Readings</span>
            <p className="font-semibold" style={{ color }}>{formatNumber(client.reading_count)}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Last Activity</span>
            <p className="font-semibold text-xs">
              {client.last_reading ? new Date(client.last_reading).toLocaleTimeString() : '—'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface SensorCardProps {
  sensor: SensorGroupedStats;
  onClick: () => void;
  isSelected: boolean;
}

const SensorBreakdownCard = ({ sensor, onClick, isSelected }: SensorCardProps) => {
  const color = getSensorColor(sensor.sensor_type);
  
  return (
    <Card 
      className={`cursor-pointer transition-all hover:scale-[1.02] ${isSelected ? 'ring-2 ring-primary' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${color}20`, color }}
            >
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-sm">
                {formatSensorName(sensor.sensor_type)}
              </h4>
              <p className="text-xs text-muted-foreground">
                {sensor.client_count} client{sensor.client_count !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs">
            {sensor.device_count} devices
          </Badge>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-muted-foreground">Readings</span>
            <p className="font-semibold" style={{ color }}>{formatNumber(sensor.reading_count)}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Last Activity</span>
            <p className="font-semibold text-xs">
              {sensor.last_reading ? new Date(sensor.last_reading).toLocaleTimeString() : '—'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// =============================================
// MAIN COMPONENT
// =============================================

const ClientSensorBreakdownContent = () => {
  const [activeTab, setActiveTab] = useState<"overview" | "clients" | "sensors">("overview");
  const [timeRange, setTimeRange] = useState<number>(24);
  const [selectedSensor, setSelectedSensor] = useState<string | null>(null);
  
  // Use global client context
  const { selectedClientId, setSelectedClientId, isAllClients } = useClientContext();
  
  // For this component, we need a specific client - use first client if "all" is selected
  const effectiveClientId = isAllClients ? "" : selectedClientId;
  
  const queryClient = useQueryClient();
  
  // Fetch all clients with hostnames for the dropdown
  const { data: allClients } = useClientsWithHostnames();
  
  // Fetch stats by client and sensor
  const { data: clientStats, isLoading: clientsLoading } = useStatsByClient({ hours: timeRange });
  const { data: sensorStats, isLoading: sensorsLoading } = useStatsBySensor({ 
    hours: timeRange, 
    clientId: effectiveClientId || undefined 
  });
  
  // Fetch detailed stats for selected client
  const { data: clientDetailStats, isLoading: detailLoading } = useClientDetailStats(
    effectiveClientId || null, 
    timeRange
  );
  
  // Fetch system info for selected client
  const { data: systemInfo } = useClientSystemInfo(effectiveClientId || "");
  
  // Fetch period stats for selected client
  const { data: stats1hr } = use1hrStats(effectiveClientId || null);
  const { data: stats24hr } = use24hrStats(effectiveClientId || null);

  const clients = clientStats?.clients || [];
  const sensors = sensorStats?.sensors || [];
  
  // Auto-select first client when data loads and no client is selected
  useEffect(() => {
    if (clients.length > 0 && isAllClients) {
      setSelectedClientId(clients[0].client_id);
    }
  }, [clients, isAllClients, setSelectedClientId]);
  
  const isLoading = clientsLoading || sensorsLoading;
  
  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["aurora", "stats"] });
    queryClient.invalidateQueries({ queryKey: ["aurora", "clients"] });
  };

  // Get the selected client from stats
  const selectedClient = useMemo(() => 
    clients.find(c => c.client_id === selectedClientId),
    [clients, selectedClientId]
  );
  
  const selectedClientIndex = clients.findIndex(c => c.client_id === selectedClientId);
  const clientColor = selectedClientIndex >= 0 ? getClientColor(selectedClientIndex) : '#3b82f6';

  // Prepare chart data
  const clientChartData = clients.map((c, i) => ({
    name: formatClientName(c.client_id, c.hostname),
    readings: c.reading_count,
    devices: c.device_count,
    fill: getClientColor(i),
  }));

  const clientPieData = clients.map((c, i) => ({
    name: formatClientName(c.client_id, c.hostname),
    value: c.reading_count,
    fill: getClientColor(i),
  }));

  const sensorChartData = sensors.map(s => ({
    name: formatSensorName(s.sensor_type),
    readings: s.reading_count,
    clients: s.client_count,
    devices: s.device_count,
    fill: getSensorColor(s.sensor_type),
  }));

  const sensorPieData = sensors.map(s => ({
    name: formatSensorName(s.sensor_type),
    value: s.reading_count,
    fill: getSensorColor(s.sensor_type),
  }));

  // Totals
  const totalClientReadings = clients.reduce((sum, c) => sum + c.reading_count, 0);
  const totalDevices = clients.reduce((sum, c) => sum + c.device_count, 0);

  // Selected sensor data
  const selectedSensorData = selectedSensor ? sensors.find(s => s.sensor_type === selectedSensor) : null;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Layers className="w-6 h-6 text-primary" />
            Client Statistics
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Detailed breakdown by client and sensor type
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeRange.toString()} onValueChange={(v) => setTimeRange(parseInt(v))}>
            <SelectTrigger className="w-[140px]">
              <Clock className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Last 1 hour</SelectItem>
              <SelectItem value="6">Last 6 hours</SelectItem>
              <SelectItem value="12">Last 12 hours</SelectItem>
              <SelectItem value="24">Last 24 hours</SelectItem>
              <SelectItem value="168">Last 7 days</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Client Selector Bar */}
      {clients.length > 0 && (
        <ClientSelectorBar
          clients={clients}
          selectedClientId={selectedClientId}
          onSelect={setSelectedClientId}
          isLoading={isLoading}
        />
      )}

      {/* Loading State */}
      {isLoading && !clients.length ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : clients.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No client data available for the selected time range</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Client Details Section */}
          {selectedClient && (
            <div className="space-y-4">
              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                <StatMetric 
                  icon={Database} 
                  label="Total Readings" 
                  value={formatNumber(selectedClient.reading_count)}
                  color={clientColor}
                />
                <StatMetric 
                  icon={Cpu} 
                  label="Devices" 
                  value={selectedClient.device_count}
                />
                <StatMetric 
                  icon={Layers} 
                  label="Sensor Types" 
                  value={selectedClient.sensor_type_count}
                />
                <StatMetric 
                  icon={TrendingUp} 
                  label="Readings/1h" 
                  value={formatNumber(stats1hr?.readings)}
                  subValue={`${stats1hr?.devices || 0} active`}
                />
                <StatMetric 
                  icon={TrendingUp} 
                  label="Readings/24h" 
                  value={formatNumber(stats24hr?.readings)}
                />
                <StatMetric 
                  icon={Clock} 
                  label="Last Activity" 
                  value={selectedClient.last_reading ? 
                    new Date(selectedClient.last_reading).toLocaleTimeString() : '—'
                  }
                />
              </div>

              {/* System Resources (if available) */}
              {systemInfo && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {systemInfo.cpu_load && systemInfo.cpu_load.length > 0 && (
                    <ResourceMetric icon={Zap} label="CPU Load" value={systemInfo.cpu_load[0]} unit="%" />
                  )}
                  {systemInfo.memory?.percent !== undefined && (
                    <ResourceMetric icon={Activity} label="Memory" value={systemInfo.memory.percent} unit="%" />
                  )}
                  {systemInfo.disk?.percent !== undefined && (
                    <ResourceMetric icon={Database} label="Disk" value={systemInfo.disk.percent} unit="%" />
                  )}
                  {systemInfo.uptime_seconds !== undefined && (
                    <StatMetric 
                      icon={Clock} 
                      label="Uptime" 
                      value={`${Math.floor(systemInfo.uptime_seconds / 86400)}d`}
                      subValue={`${Math.floor((systemInfo.uptime_seconds % 86400) / 3600)}h`}
                    />
                  )}
                </div>
              )}

              {/* Sensor Types for Selected Client */}
              {selectedClient.sensor_types && selectedClient.sensor_types.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Radio className="w-4 h-4" />
                      Active Sensor Types
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {selectedClient.sensor_types.map(type => (
                        <Badge 
                          key={type}
                          variant="outline"
                          className="cursor-pointer hover:bg-muted transition-colors"
                          style={{ borderColor: getSensorColor(type), color: getSensorColor(type) }}
                          onClick={() => {
                            setSelectedSensor(selectedSensor === type ? null : type);
                            setActiveTab("sensors");
                          }}
                        >
                          {formatSensorName(type)}
                          <ChevronRight className="w-3 h-3 ml-1" />
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Detailed Stats from clientDetailStats */}
              {clientDetailStats && clientDetailStats.by_sensor_type && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Sensor Breakdown for Client</CardTitle>
                    <CardDescription>Readings and devices per sensor type</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart 
                          data={clientDetailStats.by_sensor_type.map(s => ({
                            name: formatSensorName(s.sensor_type),
                            readings: s.reading_count,
                            devices: s.device_count,
                            fill: getSensorColor(s.sensor_type),
                          }))}
                          layout="vertical"
                          margin={{ left: 100 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                          <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                          <YAxis 
                            type="category" 
                            dataKey="name" 
                            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                            width={95}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                              fontSize: '12px',
                            }}
                            formatter={(value: number) => [formatNumber(value), 'Readings']}
                          />
                          <Bar dataKey="readings" radius={[0, 4, 4, 0]}>
                            {clientDetailStats.by_sensor_type.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={getSensorColor(entry.sensor_type)} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Tabs for All Clients / Sensors Overview */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "overview" | "clients" | "sensors")}>
            <TabsList className="grid w-full max-w-md grid-cols-3">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="clients" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                All Clients
              </TabsTrigger>
              <TabsTrigger value="sensors" className="flex items-center gap-2">
                <Cpu className="w-4 h-4" />
                Sensors
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6 mt-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                      <Users className="w-3 h-3" />
                      Total Clients
                    </div>
                    <p className="text-2xl font-bold text-primary">{clients.length}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                      <Cpu className="w-3 h-3" />
                      Sensor Types
                    </div>
                    <p className="text-2xl font-bold text-primary">{sensors.length}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                      <Activity className="w-3 h-3" />
                      Total Devices
                    </div>
                    <p className="text-2xl font-bold text-primary">{formatNumber(totalDevices)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                      <Database className="w-3 h-3" />
                      Total Readings
                    </div>
                    <p className="text-2xl font-bold text-primary">{formatNumber(totalClientReadings)}</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Client Distribution Pie */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Client Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={clientPieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={90}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {clientPieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                              fontSize: '12px',
                            }}
                            formatter={(value: number) => [formatNumber(value), 'Readings']}
                          />
                          <Legend 
                            verticalAlign="bottom" 
                            height={36}
                            formatter={(value) => <span className="text-xs">{value}</span>}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Sensor Distribution Pie */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Sensor Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={sensorPieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={90}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {sensorPieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                              fontSize: '12px',
                            }}
                            formatter={(value: number) => [formatNumber(value), 'Readings']}
                          />
                          <Legend 
                            verticalAlign="bottom" 
                            height={36}
                            formatter={(value) => <span className="text-xs">{value}</span>}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Clients Tab */}
            <TabsContent value="clients" className="space-y-6 mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Bar Chart */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Readings by Client
                    </CardTitle>
                    <CardDescription>Distribution of readings across clients</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={clientChartData} layout="vertical" margin={{ left: 80 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                          <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                          <YAxis 
                            type="category" 
                            dataKey="name" 
                            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                            width={75}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                              fontSize: '12px',
                            }}
                            formatter={(value: number) => [formatNumber(value), 'Readings']}
                          />
                          <Bar dataKey="readings" radius={[0, 4, 4, 0]}>
                            {clientChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Client Cards Grid */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-sm">All Clients</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[300px] pr-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {clients.map((client, index) => (
                          <ClientCard
                            key={client.client_id}
                            client={client}
                            index={index}
                            onClick={() => setSelectedClientId(client.client_id)}
                            isSelected={selectedClientId === client.client_id}
                          />
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Sensors Tab */}
            <TabsContent value="sensors" className="space-y-6 mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Bar Chart */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Readings by Sensor Type
                      {selectedClientId && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          Filtered by selected client
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription>Distribution of readings across sensor types</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={sensorChartData} layout="vertical" margin={{ left: 120 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                          <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                          <YAxis 
                            type="category" 
                            dataKey="name" 
                            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                            width={115}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                              fontSize: '12px',
                            }}
                            formatter={(value: number, name: string) => [
                              formatNumber(value), 
                              name === 'readings' ? 'Readings' : name === 'clients' ? 'Clients' : 'Devices'
                            ]}
                          />
                          <Bar dataKey="readings" radius={[0, 4, 4, 0]}>
                            {sensorChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Sensor Cards Grid */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-sm">Sensor Type Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[300px] pr-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {sensors.map((sensor) => (
                          <SensorBreakdownCard
                            key={sensor.sensor_type}
                            sensor={sensor}
                            onClick={() => setSelectedSensor(
                              selectedSensor === sensor.sensor_type ? null : sensor.sensor_type
                            )}
                            isSelected={selectedSensor === sensor.sensor_type}
                          />
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>

              {/* Selected Sensor Details */}
              {selectedSensorData && (
                <Card className="border-primary/50">
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-primary" />
                      {formatSensorName(selectedSensorData.sensor_type)} Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div>
                        <span className="text-xs text-muted-foreground">Total Readings</span>
                        <p className="text-lg font-bold">{formatNumber(selectedSensorData.reading_count)}</p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Clients</span>
                        <p className="text-lg font-bold">{selectedSensorData.client_count}</p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Devices</span>
                        <p className="text-lg font-bold">{selectedSensorData.device_count}</p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">First Seen</span>
                        <p className="text-sm font-medium">{formatDate(selectedSensorData.first_reading)}</p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Last Activity</span>
                        <p className="text-sm font-medium">{formatDate(selectedSensorData.last_reading)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
};

export default ClientSensorBreakdownContent;
