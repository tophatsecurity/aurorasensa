import { useState } from "react";
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
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useStatsByClient,
  useStatsBySensor,
  type ClientGroupedStats,
  type SensorGroupedStats,
} from "@/hooks/aurora";
import { useQueryClient } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
  Treemap,
} from "recharts";

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
  '#3b82f6',
  '#ef4444',
  '#10b981',
  '#f59e0b',
  '#6366f1',
  '#ec4899',
  '#14b8a6',
  '#f97316',
  '#8b5cf6',
  '#06b6d4',
];

const getSensorColor = (sensorType: string): string => {
  return SENSOR_COLORS[sensorType] || SENSOR_COLORS.default;
};

const getClientColor = (index: number): string => {
  return CLIENT_COLORS[index % CLIENT_COLORS.length];
};

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

const ClientSensorBreakdownContent = () => {
  const [activeTab, setActiveTab] = useState<"clients" | "sensors">("clients");
  const [timeRange, setTimeRange] = useState<number>(24);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [selectedSensor, setSelectedSensor] = useState<string | null>(null);
  
  const { data: clientStats, isLoading: clientsLoading, refetch: refetchClients } = useStatsByClient({ hours: timeRange });
  const { data: sensorStats, isLoading: sensorsLoading, refetch: refetchSensors } = useStatsBySensor({ hours: timeRange });
  const queryClient = useQueryClient();

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["aurora", "stats"] });
  };

  const clients = clientStats?.clients || [];
  const sensors = sensorStats?.sensors || [];

  const isLoading = clientsLoading || sensorsLoading;

  // Prepare chart data for clients
  const clientChartData = clients.map((c, i) => ({
    name: formatClientName(c.client_id, c.hostname),
    readings: c.reading_count,
    devices: c.device_count,
    fill: getClientColor(i),
  }));

  // Prepare pie chart data for clients
  const clientPieData = clients.map((c, i) => ({
    name: formatClientName(c.client_id, c.hostname),
    value: c.reading_count,
    fill: getClientColor(i),
  }));

  // Prepare chart data for sensors
  const sensorChartData = sensors.map(s => ({
    name: formatSensorName(s.sensor_type),
    readings: s.reading_count,
    clients: s.client_count,
    devices: s.device_count,
    fill: getSensorColor(s.sensor_type),
  }));

  // Prepare pie chart data for sensors
  const sensorPieData = sensors.map(s => ({
    name: formatSensorName(s.sensor_type),
    value: s.reading_count,
    fill: getSensorColor(s.sensor_type),
  }));

  // Total readings calculation
  const totalClientReadings = clients.reduce((sum, c) => sum + c.reading_count, 0);
  const totalSensorReadings = sensors.reduce((sum, s) => sum + s.reading_count, 0);
  const totalDevices = clients.reduce((sum, c) => sum + c.device_count, 0);

  // Selected client details
  const selectedClientData = selectedClient ? clients.find(c => c.client_id === selectedClient) : null;
  const selectedSensorData = selectedSensor ? sensors.find(s => s.sensor_type === selectedSensor) : null;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Layers className="w-6 h-6 text-primary" />
            Data Breakdown Analytics
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Analyze readings by client and sensor type
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

      {/* Summary Stats */}
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

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "clients" | "sensors")}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="clients" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            By Client
          </TabsTrigger>
          <TabsTrigger value="sensors" className="flex items-center gap-2">
            <Cpu className="w-4 h-4" />
            By Sensor Type
          </TabsTrigger>
        </TabsList>

        {/* Clients Tab */}
        <TabsContent value="clients" className="space-y-6 mt-6">
          {isLoading ? (
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

              {/* Pie Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Reading Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={clientPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
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

              {/* Client Cards Grid */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Client Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[250px] pr-4">
                    <div className="space-y-3">
                      {clients.map((client, index) => (
                        <ClientCard
                          key={client.client_id}
                          client={client}
                          index={index}
                          onClick={() => setSelectedClient(
                            selectedClient === client.client_id ? null : client.client_id
                          )}
                          isSelected={selectedClient === client.client_id}
                        />
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Selected Client Details */}
          {selectedClientData && (
            <Card className="border-primary/50">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  {formatClientName(selectedClientData.client_id, selectedClientData.hostname)} Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <span className="text-xs text-muted-foreground">Total Readings</span>
                    <p className="text-lg font-bold">{formatNumber(selectedClientData.reading_count)}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Devices</span>
                    <p className="text-lg font-bold">{selectedClientData.device_count}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Sensor Types</span>
                    <p className="text-lg font-bold">{selectedClientData.sensor_type_count}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Last Activity</span>
                    <p className="text-sm font-medium">{formatDate(selectedClientData.last_reading)}</p>
                  </div>
                </div>
                {selectedClientData.sensor_types && selectedClientData.sensor_types.length > 0 && (
                  <div>
                    <span className="text-xs text-muted-foreground block mb-2">Sensor Types</span>
                    <div className="flex flex-wrap gap-2">
                      {selectedClientData.sensor_types.map((type) => (
                        <Badge 
                          key={type} 
                          variant="secondary"
                          style={{ borderColor: getSensorColor(type), color: getSensorColor(type) }}
                          className="border"
                        >
                          {formatSensorName(type)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Sensors Tab */}
        <TabsContent value="sensors" className="space-y-6 mt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : sensors.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                <Cpu className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No sensor data available for the selected time range</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Bar Chart */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Readings by Sensor Type
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

              {/* Pie Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Reading Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={sensorPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
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

              {/* Sensor Cards Grid */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Sensor Type Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[250px] pr-4">
                    <div className="space-y-3">
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
          )}

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
    </div>
  );
};

export default ClientSensorBreakdownContent;
