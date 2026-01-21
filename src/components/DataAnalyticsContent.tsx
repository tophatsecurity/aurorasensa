import { useState, useMemo } from "react";
import { 
  BarChart3, 
  Loader2, 
  RefreshCw, 
  Thermometer,
  Droplets,
  Signal,
  Zap,
  Radio,
  Cpu,
  Wifi,
  Bluetooth,
  Plane,
  Satellite,
  Monitor,
  TrendingUp,
  TrendingDown,
  Activity,
  Calendar,
  Clock,
  Database,
  Filter,
  X,
  Check
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  useComprehensiveStats, 
  useDashboardTimeseries,
  useSensorTypeStatsById,
  useClients,
  useDeviceTree,
  type SensorTypeSummary,
  type DeviceSummary
} from "@/hooks/aurora";
import { useQueryClient } from "@tanstack/react-query";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
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
  default: '#a855f7',
};

const getSensorColor = (deviceType: string): string => {
  return SENSOR_COLORS[deviceType] || SENSOR_COLORS.default;
};

const getSensorIcon = (deviceType: string) => {
  const iconProps = { className: "w-5 h-5" };
  switch (deviceType) {
    case 'arduino_sensor_kit':
      return <Cpu {...iconProps} />;
    case 'thermal_probe':
      return <Thermometer {...iconProps} />;
    case 'wifi_scanner':
      return <Wifi {...iconProps} />;
    case 'bluetooth_scanner':
      return <Bluetooth {...iconProps} />;
    case 'adsb_detector':
      return <Plane {...iconProps} />;
    case 'lora_detector':
      return <Radio {...iconProps} />;
    case 'starlink_dish_comprehensive':
      return <Satellite {...iconProps} />;
    case 'system_monitor':
      return <Monitor {...iconProps} />;
    case 'aht_sensor':
      return <Droplets {...iconProps} />;
    case 'bmt_sensor':
      return <Thermometer {...iconProps} />;
    default:
      return <Signal {...iconProps} />;
  }
};

const formatNumber = (num: number | undefined | null): string => {
  if (num === undefined || num === null) return '—';
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toFixed(0);
};

const formatDuration = (seconds: number | undefined | null): string => {
  if (seconds === undefined || seconds === null) return '—';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days > 0) return `${days}d ${hours}h`;
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

interface SensorAnalyticsCardProps {
  sensor: SensorTypeSummary;
  onClick: () => void;
  isSelected: boolean;
}

const SensorAnalyticsCard = ({ sensor, onClick, isSelected }: SensorAnalyticsCardProps) => {
  const color = getSensorColor(sensor.device_type);
  const icon = getSensorIcon(sensor.device_type);
  
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
              {icon}
            </div>
            <div>
              <h4 className="font-semibold text-sm capitalize">
                {sensor.device_type.replace(/_/g, ' ')}
              </h4>
              <p className="text-xs text-muted-foreground">
                {sensor.device_count} device{sensor.device_count !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <Badge 
            variant={sensor.active_last_hour ? "default" : "secondary"}
            className="text-xs"
          >
            {sensor.active_last_hour ? 'Active' : 'Inactive'}
          </Badge>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-muted-foreground">Total Readings</span>
            <p className="font-semibold" style={{ color }}>{formatNumber(sensor.total_readings)}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Last Seen</span>
            <p className="font-semibold">
              {sensor.last_seen ? new Date(sensor.last_seen).toLocaleTimeString() : '—'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface SensorDetailPanelProps {
  sensorType: string;
  timeseries: { temperature?: any[]; humidity?: any[]; signal?: any[]; power?: any[] } | undefined;
}

const SensorDetailPanel = ({ sensorType, timeseries }: SensorDetailPanelProps) => {
  const { data: sensorStats, isLoading } = useSensorTypeStatsById(sensorType);
  const color = getSensorColor(sensorType);
  
  const formatChartData = (data: any[] | undefined) => {
    if (!data || data.length === 0) return [];
    return data.slice(-50).map(p => ({
      time: new Date(p.timestamp).toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit'
      }),
      value: Number(p.value?.toFixed(2) ?? 0),
    }));
  };

  // Get relevant timeseries based on sensor type
  const getRelevantData = () => {
    if (!timeseries) return [];
    if (sensorType.includes('thermal') || sensorType.includes('bmt') || sensorType.includes('aht')) {
      return formatChartData(timeseries.temperature);
    }
    if (sensorType.includes('starlink') || sensorType.includes('power')) {
      return formatChartData(timeseries.power);
    }
    if (sensorType.includes('wifi') || sensorType.includes('bluetooth') || sensorType.includes('lora') || sensorType.includes('adsb')) {
      return formatChartData(timeseries.signal);
    }
    return formatChartData(timeseries.temperature);
  };

  const chartData = getRelevantData();
  const numericStats = sensorStats?.numeric_field_stats_24h;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div 
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${color}20`, color }}
        >
          {getSensorIcon(sensorType)}
        </div>
        <div>
          <h3 className="text-xl font-bold capitalize">{sensorType.replace(/_/g, ' ')}</h3>
          <p className="text-sm text-muted-foreground">Detailed analytics and trends</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                  <Database className="w-3 h-3" />
                  Total Readings
                </div>
                <p className="text-2xl font-bold" style={{ color }}>
                  {formatNumber(sensorStats?.total_readings)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                  <Activity className="w-3 h-3" />
                  Devices
                </div>
                <p className="text-2xl font-bold" style={{ color }}>
                  {sensorStats?.device_count ?? '—'}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                  <Clock className="w-3 h-3" />
                  Last 24h
                </div>
                <p className="text-2xl font-bold" style={{ color }}>
                  {formatNumber(sensorStats?.readings_last_24h)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                  <TrendingUp className="w-3 h-3" />
                  Last Hour
                </div>
                <p className="text-2xl font-bold" style={{ color }}>
                  {formatNumber(sensorStats?.readings_last_hour)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Numeric Field Stats */}
          {numericStats && Object.keys(numericStats).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">24-Hour Field Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(numericStats).map(([field, stats]) => (
                    <div key={field} className="p-3 rounded-lg bg-muted/50">
                      <h5 className="text-xs font-medium text-muted-foreground mb-2 capitalize">
                        {field.replace(/_/g, ' ')}
                      </h5>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Min</span>
                          <p className="font-semibold">{stats.min?.toFixed(2) ?? '—'}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Avg</span>
                          <p className="font-semibold" style={{ color }}>{stats.avg?.toFixed(2) ?? '—'}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Max</span>
                          <p className="font-semibold">{stats.max?.toFixed(2) ?? '—'}</p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {stats.sample_count?.toLocaleString() ?? 0} samples
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">24-Hour Trend</CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length === 0 ? (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                  No trend data available
                </div>
              ) : (
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id={`gradient-${sensorType}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={color} stopOpacity={0} />
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
                        domain={['auto', 'auto']}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke={color}
                        strokeWidth={2}
                        fill={`url(#gradient-${sensorType})`}
                        dot={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Activity Info</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <span className="text-muted-foreground">First Seen</span>
                    <p className="font-medium">
                      {sensorStats?.first_seen 
                        ? new Date(sensorStats.first_seen).toLocaleDateString() 
                        : '—'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <span className="text-muted-foreground">Last Seen</span>
                    <p className="font-medium">
                      {sensorStats?.last_seen 
                        ? new Date(sensorStats.last_seen).toLocaleString() 
                        : '—'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

const DataAnalyticsContent = () => {
  const [selectedSensor, setSelectedSensor] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<string>("24h");
  const [selectedClients, setSelectedClients] = useState<string[]>([]); // Empty = All Clients
  const [selectedSensorTypes, setSelectedSensorTypes] = useState<string[]>([]); // Empty = All Types
  const [clientFilterOpen, setClientFilterOpen] = useState(false);
  const [sensorTypeFilterOpen, setSensorTypeFilterOpen] = useState(false);
  
  const { data: stats, isLoading: statsLoading } = useComprehensiveStats();
  const { data: timeseries, isLoading: timeseriesLoading } = useDashboardTimeseries(24);
  const { data: clients } = useClients();
  const { data: deviceTree } = useDeviceTree();
  const queryClient = useQueryClient();

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["aurora"] });
  };

  const isLoading = statsLoading || timeseriesLoading;

  // Get all devices from stats
  const allDevices: DeviceSummary[] = stats?.devices_summary?.devices || [];
  const sensorTypes = stats?.sensors_summary?.sensor_types || [];
  const globalStats = stats?.global;
  
  // Get all clients list
  const allClients = clients || [];

  // Build device to client mapping from device tree
  const deviceToClientMap = useMemo(() => {
    const map = new Map<string, string>();
    
    const processNode = (node: { device_id: string; client_id?: string; children?: typeof deviceTree }) => {
      if (node.client_id) {
        map.set(node.device_id, node.client_id);
      }
      if (node.children) {
        node.children.forEach(processNode);
      }
    };
    
    deviceTree?.forEach(processNode);
    return map;
  }, [deviceTree]);

  // Get unique clients from device tree
  const clientsFromDevices = useMemo(() => {
    const clientIds = new Set<string>();
    deviceToClientMap.forEach(clientId => clientIds.add(clientId));
    return Array.from(clientIds).sort();
  }, [deviceToClientMap]);
  
  // Get unique sensor types for the filter dropdown
  const availableSensorTypes = useMemo(() => {
    return sensorTypes.map(s => s.device_type).sort();
  }, [sensorTypes]);
  
  // Map client_id to client name for display
  const getClientName = (clientId: string) => {
    const client = allClients.find(c => c.client_id === clientId);
    return client?.hostname || clientId;
  };

  // Filter sensor types based on both client and sensor type filters
  const filteredSensorTypes = useMemo(() => {
    let filtered = sensorTypes;
    
    // Filter by sensor type selection
    if (selectedSensorTypes.length > 0) {
      filtered = filtered.filter(s => selectedSensorTypes.includes(s.device_type));
    }
    
    return filtered;
  }, [sensorTypes, selectedSensorTypes]);

  // Filter devices list based on both client and sensor type filters
  const filteredDevices = useMemo(() => {
    let filtered = allDevices;
    
    // Filter by sensor type
    if (selectedSensorTypes.length > 0) {
      filtered = filtered.filter(d => selectedSensorTypes.includes(d.device_type));
    }
    
    // Filter by client using device tree mapping
    if (selectedClients.length > 0) {
      filtered = filtered.filter(d => {
        const clientId = deviceToClientMap.get(d.device_id);
        return clientId && selectedClients.includes(clientId);
      });
    }
    
    return filtered;
  }, [allDevices, selectedSensorTypes, selectedClients, deviceToClientMap]);

  // Toggle client selection
  const toggleClient = (clientId: string) => {
    setSelectedClients(prev => 
      prev.includes(clientId) 
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
  };

  // Toggle sensor type selection
  const toggleSensorType = (sensorType: string) => {
    setSelectedSensorTypes(prev => 
      prev.includes(sensorType) 
        ? prev.filter(id => id !== sensorType)
        : [...prev, sensorType]
    );
  };

  // Clear all client filters
  const clearClientFilter = () => {
    setSelectedClients([]);
  };

  // Clear all sensor type filters
  const clearSensorTypeFilter = () => {
    setSelectedSensorTypes([]);
  };

  // Select all clients - use clients from device tree or all clients
  const selectAllClients = () => {
    const clientIds = clientsFromDevices.length > 0 ? clientsFromDevices : allClients.map(c => c.client_id);
    setSelectedClients(clientIds);
  };

  // Select all sensor types
  const selectAllSensorTypes = () => {
    setSelectedSensorTypes(availableSensorTypes);
  };

  // Prepare pie chart data - filtered
  const pieData = useMemo(() => {
    return filteredSensorTypes.map(sensor => ({
      name: sensor.device_type.replace(/_/g, ' '),
      value: sensor.total_readings,
      fill: getSensorColor(sensor.device_type),
    }));
  }, [filteredSensorTypes]);

  // Prepare bar chart data for readings distribution - filtered
  const barData = useMemo(() => {
    return filteredSensorTypes
      .slice()
      .sort((a, b) => b.total_readings - a.total_readings)
      .slice(0, 8)
      .map(sensor => ({
        name: sensor.device_type.replace(/_/g, ' ').slice(0, 12),
        readings: sensor.total_readings,
        devices: sensor.device_count,
        fill: getSensorColor(sensor.device_type),
      }));
  }, [filteredSensorTypes]);

  return (
    <div className="flex-1 overflow-y-auto p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold text-foreground">Data Analytics</h1>
          <Badge className="bg-primary/20 text-primary border-primary/30 px-3 py-1">
            <BarChart3 className="w-3 h-3 mr-1" />
            Sensors
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          {/* Client Filter */}
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
                    : `${selectedClients.length} of ${Math.max(allClients.length, clientsFromDevices.length)} clients selected`}
                </p>
              </div>
              <ScrollArea className="h-[300px]">
                <div className="p-2 space-y-1">
                  {allClients.map((client) => {
                    const isSelected = selectedClients.includes(client.client_id);
                    const isActive = client.state === 'adopted' || client.state === 'registered';
                    
                    return (
                      <div
                        key={client.client_id}
                        className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors hover:bg-muted/50 ${
                          isSelected ? 'bg-primary/10' : ''
                        }`}
                        onClick={() => toggleClient(client.client_id)}
                      >
                        <Checkbox 
                          checked={isSelected}
                          onCheckedChange={() => toggleClient(client.client_id)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {client.hostname || client.client_id}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {client.ip_address}
                          </p>
                        </div>
                        <Badge 
                          variant={isActive ? 'default' : 'secondary'}
                          className="text-xs flex-shrink-0"
                        >
                          {client.state || 'unknown'}
                        </Badge>
                      </div>
                    );
                  })}
                  {allClients.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No clients found
                    </p>
                  )}
                </div>
              </ScrollArea>
            </PopoverContent>
          </Popover>

          {/* Sensor Type Filter */}
          <Popover open={sensorTypeFilterOpen} onOpenChange={setSensorTypeFilterOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Cpu className="w-4 h-4" />
                {selectedSensorTypes.length === 0 ? (
                  "All Sensors"
                ) : (
                  <span className="flex items-center gap-1">
                    {selectedSensorTypes.length} Type{selectedSensorTypes.length !== 1 ? 's' : ''}
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                      {selectedSensorTypes.length}
                    </Badge>
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
              <div className="p-3 border-b border-border">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm">Filter by Sensor Type</h4>
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 text-xs"
                      onClick={clearSensorTypeFilter}
                    >
                      Clear
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 text-xs"
                      onClick={selectAllSensorTypes}
                    >
                      Select All
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedSensorTypes.length === 0 
                    ? "Showing all sensor types" 
                    : `${selectedSensorTypes.length} of ${availableSensorTypes.length} types selected`}
                </p>
              </div>
              <ScrollArea className="h-[300px]">
                <div className="p-2 space-y-1">
                  {availableSensorTypes.map((sensorType) => {
                    const isSelected = selectedSensorTypes.includes(sensorType);
                    const color = getSensorColor(sensorType);
                    const icon = getSensorIcon(sensorType);
                    const sensorData = sensorTypes.find(s => s.device_type === sensorType);
                    
                    return (
                      <div
                        key={sensorType}
                        className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors hover:bg-muted/50 ${
                          isSelected ? 'bg-primary/10' : ''
                        }`}
                        onClick={() => toggleSensorType(sensorType)}
                      >
                        <Checkbox 
                          checked={isSelected}
                          onCheckedChange={() => toggleSensorType(sensorType)}
                        />
                        <div 
                          className="w-8 h-8 rounded-md flex items-center justify-center"
                          style={{ backgroundColor: `${color}20`, color }}
                        >
                          {icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate capitalize">
                            {sensorType.replace(/_/g, ' ')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {sensorData?.device_count || 0} device{(sensorData?.device_count || 0) !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <Badge 
                          variant={sensorData?.active_last_hour ? 'default' : 'secondary'}
                          className="text-xs flex-shrink-0"
                        >
                          {sensorData?.active_last_hour ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    );
                  })}
                  {availableSensorTypes.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No sensor types found
                    </p>
                  )}
                </div>
              </ScrollArea>
            </PopoverContent>
          </Popover>

          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last 1h</SelectItem>
              <SelectItem value="6h">Last 6h</SelectItem>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7d</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="sensors">By Sensor</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Active Filters Indicator */}
            {(selectedClients.length > 0 || selectedSensorTypes.length > 0) && (
              <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
                <Filter className="w-4 h-4 text-primary" />
                <span className="text-sm">Active filters:</span>
                {selectedClients.length > 0 && (
                  <Badge variant="secondary" className="gap-1">
                    {selectedClients.length} Client{selectedClients.length !== 1 ? 's' : ''}
                    <button 
                      onClick={clearClientFilter}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                )}
                {selectedSensorTypes.length > 0 && (
                  <Badge variant="secondary" className="gap-1">
                    {selectedSensorTypes.length} Sensor Type{selectedSensorTypes.length !== 1 ? 's' : ''}
                    <button 
                      onClick={clearSensorTypeFilter}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                )}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="ml-auto h-7 text-xs gap-1"
                  onClick={() => {
                    clearClientFilter();
                    clearSensorTypeFilter();
                  }}
                >
                  <X className="w-3 h-3" />
                  Clear All
                </Button>
              </div>
            )}

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                    <Database className="w-3 h-3" />
                    Total Readings
                  </div>
                  <p className="text-3xl font-bold text-primary">
                    {formatNumber(
                      (selectedClients.length === 0 && selectedSensorTypes.length === 0)
                        ? (globalStats?.total_readings ?? globalStats?.database?.total_readings)
                        : filteredSensorTypes.reduce((sum: number, s: { total_readings: number }) => sum + s.total_readings, 0)
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {(selectedClients.length === 0 && selectedSensorTypes.length === 0) 
                      ? 'Across all sensors' 
                      : 'From selected filters'}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                    <Activity className="w-3 h-3" />
                    Sensor Types
                  </div>
                  <p className="text-3xl font-bold text-orange-500">
                    {filteredSensorTypes.length}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedSensorTypes.length === 0 
                      ? 'Unique sensor categories' 
                      : `of ${sensorTypes.length} total`}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                    <Cpu className="w-3 h-3" />
                    Clients
                  </div>
                  <p className="text-3xl font-bold text-green-500">
                    {selectedClients.length === 0 ? allClients.length : selectedClients.length}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedClients.length === 0 ? 'All clients' : `of ${allClients.length} total`}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                    <Clock className="w-3 h-3" />
                    Data Span
                  </div>
                  <p className="text-3xl font-bold text-blue-500">
                    {globalStats?.time_ranges?.data_span_days?.toFixed(1) ?? '—'}d
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Historical data range
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Readings Distribution Pie Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Readings by Sensor Type</CardTitle>
                </CardHeader>
                <CardContent>
                  {pieData.length === 0 ? (
                    <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
                      No data available
                    </div>
                  ) : (
                    <div className="h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {pieData.map((entry, index) => (
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
                            wrapperStyle={{ fontSize: '11px' }}
                            formatter={(value) => <span className="capitalize">{value}</span>}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Bar Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Top Sensors by Readings</CardTitle>
                </CardHeader>
                <CardContent>
                  {barData.length === 0 ? (
                    <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
                      No data available
                    </div>
                  ) : (
                    <div className="h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barData} margin={{ top: 5, right: 5, left: -10, bottom: 30 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                          <XAxis 
                            dataKey="name" 
                            tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                            tickLine={false}
                            angle={-45}
                            textAnchor="end"
                          />
                          <YAxis 
                            tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                            tickLine={false}
                            tickFormatter={(v) => formatNumber(v)}
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
                          <Bar dataKey="readings" radius={[4, 4, 0, 0]}>
                            {barData.map((entry, index) => (
                              <Cell key={`bar-${index}`} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="sensors" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Sensor List */}
              <div className="lg:col-span-1 space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Select Sensor Type
                </h3>
                <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                  {filteredSensorTypes.map((sensor) => (
                    <SensorAnalyticsCard
                      key={sensor.device_type}
                      sensor={sensor}
                      onClick={() => setSelectedSensor(sensor.device_type)}
                      isSelected={selectedSensor === sensor.device_type}
                    />
                  ))}
                  {filteredSensorTypes.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No sensors found
                    </p>
                  )}
                </div>
              </div>

              {/* Detail Panel */}
              <div className="lg:col-span-2">
                {selectedSensor ? (
                  <SensorDetailPanel 
                    sensorType={selectedSensor} 
                    timeseries={timeseries}
                  />
                ) : (
                  <Card className="h-full">
                    <CardContent className="h-full flex flex-col items-center justify-center py-24 text-muted-foreground">
                      <BarChart3 className="w-16 h-16 mb-4 opacity-30" />
                      <p className="text-lg font-medium">Select a sensor type</p>
                      <p className="text-sm">Click on a sensor card to view detailed analytics</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            {/* Multi-metric trend comparison */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">24-Hour Multi-Metric Trends</CardTitle>
              </CardHeader>
              <CardContent>
                {(!timeseries?.temperature || timeseries.temperature.length === 0) ? (
                  <div className="h-[400px] flex items-center justify-center text-muted-foreground text-sm">
                    No trend data available
                  </div>
                ) : (
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart 
                        data={timeseries.temperature.slice(-30).map((p, i) => ({
                          time: new Date(p.timestamp).toLocaleTimeString('en-US', { 
                            hour12: false, 
                            hour: '2-digit', 
                            minute: '2-digit'
                          }),
                          temperature: p.value,
                          humidity: timeseries?.humidity?.[i]?.value ?? null,
                          power: timeseries?.power?.[i]?.value ?? null,
                        }))}
                        margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                        <XAxis 
                          dataKey="time"
                          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                          tickLine={false}
                        />
                        <YAxis 
                          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                          tickLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            fontSize: '12px',
                          }}
                        />
                        <Legend />
                        <Line 
                          type="monotone"
                          dataKey="temperature"
                          name="Temperature (°C)"
                          stroke="#ef4444"
                          strokeWidth={2}
                          dot={false}
                          connectNulls
                        />
                        <Line 
                          type="monotone"
                          dataKey="humidity"
                          name="Humidity (%)"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          dot={false}
                          connectNulls
                        />
                        <Line 
                          type="monotone"
                          dataKey="power"
                          name="Power (W)"
                          stroke="#f97316"
                          strokeWidth={2}
                          dot={false}
                          connectNulls
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Activity by sensor type over time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Readings Last 24 Hours</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {filteredSensorTypes
                      .sort((a, b) => b.total_readings - a.total_readings)
                      .slice(0, 6)
                      .map(sensor => {
                        const maxReadings = Math.max(...filteredSensorTypes.map(s => s.total_readings));
                        const percentage = maxReadings > 0 ? (sensor.total_readings / maxReadings) * 100 : 0;
                        const color = getSensorColor(sensor.device_type);
                        
                        return (
                          <div key={sensor.device_type} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="capitalize truncate">{sensor.device_type.replace(/_/g, ' ')}</span>
                              <span className="font-medium">{formatNumber(sensor.total_readings)}</span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full rounded-full transition-all"
                                style={{ width: `${percentage}%`, backgroundColor: color }}
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Sensor Activity Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {filteredSensorTypes.map(sensor => {
                      const color = getSensorColor(sensor.device_type);
                      return (
                        <div 
                          key={sensor.device_type}
                          className="flex items-center justify-between p-2 rounded-lg bg-muted/30"
                        >
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: sensor.active_last_hour ? '#22c55e' : '#6b7280' }}
                            />
                            <span className="text-sm capitalize truncate">
                              {sensor.device_type.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={sensor.active_last_hour ? "default" : "secondary"} className="text-xs">
                              {sensor.device_count} devices
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default DataAnalyticsContent;
