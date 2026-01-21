import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  Server, 
  Wifi, 
  WifiOff,
  Activity, 
  Clock, 
  Cpu, 
  HardDrive,
  MemoryStick,
  Network,
  Globe,
  MapPin,
  RefreshCw,
  Loader2,
  Users,
  Signal,
  Radio,
  Satellite,
  Plane,
  Navigation,
  Thermometer,
  Bluetooth,
  Monitor,
  FileJson,
  ChevronRight,
  Usb,
  Router,
  ArrowLeft,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import AuroraBackground from "@/components/AuroraBackground";
import { 
  type Client,
  type SystemInfo,
  useClients,
  useClientSystemInfo,
  useWifiStatus,
  useWifiConfig,
  useWifiClients,
  useWifiMode,
  useBatchesByClient,
  useBatchReadings,
  useSensorReadings,
} from "@/hooks/aurora";
import { formatDateTime, formatLastSeen } from "@/utils/dateUtils";
import { ClientSensorTab, ClientRawBatchTab } from "@/components/client";

// Helper functions
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const formatUptime = (seconds: number): string => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

const getSensorIcon = (sensorType: string) => {
  const iconClass = "w-4 h-4";
  switch (sensorType.toLowerCase()) {
    case 'arduino': return <Cpu className={iconClass} />;
    case 'lora': return <Radio className={iconClass} />;
    case 'starlink': return <Satellite className={iconClass} />;
    case 'wifi': return <Wifi className={iconClass} />;
    case 'bluetooth': return <Bluetooth className={iconClass} />;
    case 'adsb': return <Plane className={iconClass} />;
    case 'gps': return <Navigation className={iconClass} />;
    case 'thermal': case 'thermal_probe': return <Thermometer className={iconClass} />;
    case 'system_monitor': case 'system': return <Monitor className={iconClass} />;
    default: return <Cpu className={iconClass} />;
  }
};

const getSensorColor = (sensorType: string): string => {
  switch (sensorType.toLowerCase()) {
    case 'arduino': return '#f97316';
    case 'lora': return '#ef4444';
    case 'starlink': return '#8b5cf6';
    case 'wifi': return '#3b82f6';
    case 'bluetooth': return '#6366f1';
    case 'adsb': return '#06b6d4';
    case 'gps': return '#22c55e';
    case 'thermal': case 'thermal_probe': return '#f59e0b';
    case 'system_monitor': case 'system': return '#64748b';
    default: return '#8b5cf6';
  }
};

const getResourceColor = (percent: number): string => {
  if (percent >= 90) return 'text-destructive';
  if (percent >= 75) return 'text-warning';
  return 'text-success';
};

const getResourceBgColor = (percent: number): string => {
  if (percent >= 90) return 'bg-destructive';
  if (percent >= 75) return 'bg-warning';
  return 'bg-success';
};

export default function ClientDetailsPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  
  // Fetch client data
  const { data: clientsData, isLoading: clientsLoading } = useClients();
  const client = useMemo(() => {
    const clients = Array.isArray(clientsData) ? clientsData : (clientsData as { clients?: Client[] })?.clients || [];
    return clients.find((c: Client) => c.client_id === clientId) || null;
  }, [clientsData, clientId]);

  // Fetch real data
  const { data: systemInfo, isLoading: systemLoading, refetch: refetchSystem } = useClientSystemInfo(clientId || "");
  const { data: wifiStatus, isLoading: wifiStatusLoading } = useWifiStatus(clientId || "");
  const { data: wifiConfig, isLoading: wifiConfigLoading } = useWifiConfig(clientId || "");
  const { data: wifiClients, isLoading: wifiClientsLoading } = useWifiClients(clientId || "");
  const { data: wifiMode } = useWifiMode(clientId || "");
  const { data: batchesData, isLoading: batchesLoading } = useBatchesByClient(clientId || "");
  
  const latestBatch = batchesData?.batches?.[0] || null;
  const { data: batchReadingsData, isLoading: readingsLoading } = useBatchReadings(latestBatch?.batch_id || "");

  // Extract system metrics
  const systemMetrics = useMemo(() => {
    if (!systemInfo) return null;
    
    const info = systemInfo as SystemInfo;
    return {
      hostname: info.hostname,
      platform: info.platform,
      uptime_seconds: info.uptime_seconds,
      cpu_load: info.cpu_load || info.load,
      cpu_count: info.cpu_count,
      memory: info.memory || {
        total: info.memory_total,
        used: info.memory_total && info.memory_available ? info.memory_total - info.memory_available : undefined,
        percent: info.memory_total && info.memory_available 
          ? ((info.memory_total - info.memory_available) / info.memory_total) * 100 
          : undefined,
      },
      disk: info.disk || {
        total: info.disk_total,
        used: info.disk_total && info.disk_free ? info.disk_total - info.disk_free : undefined,
        percent: info.disk_total && info.disk_free 
          ? ((info.disk_total - info.disk_free) / info.disk_total) * 100 
          : undefined,
      },
      network_interfaces: info.network_interfaces,
      usb_devices: info.usb_devices,
      version: info.version,
    };
  }, [systemInfo]);

  // Define preferred tab order for sensors
  const SENSOR_ORDER = [
    'starlink_dish', 'starlink', 
    'thermal_probe', 
    'arduino_sensor_kit', 'arduino',
    'wifi_scanner', 'wifi',
    'bluetooth_scanner', 'bluetooth',
    'adsb', 'adsb_receiver',
    'lora', 'lora_detector',
    'gps', 'gps_receiver',
    'aht_sensor', 'bmt_sensor',
  ];

  // Format sensor type label for display
  const formatSensorLabel = (sensorType: string): string => {
    const type = sensorType.toLowerCase();
    
    // Custom labels for specific sensors
    if (type.includes('starlink_dish') || type === 'starlink') return 'Starlink Dish';
    if (type.includes('thermal_probe')) return 'Thermal Probe';
    if (type.includes('arduino_sensor_kit') || type === 'arduino') return 'Arduino Sensor Kit';
    if (type.includes('wifi_scanner')) return 'WiFi Scanner';
    if (type.includes('bluetooth_scanner')) return 'Bluetooth Scanner';
    if (type.includes('adsb')) return 'ADS-B Receiver';
    if (type.includes('lora')) return 'LoRa Detector';
    if (type.includes('gps')) return 'GPS';
    if (type.includes('aht_sensor')) return 'AHT Sensor';
    if (type.includes('bmt_sensor')) return 'BMT Sensor';
    
    // Default: clean up the type name
    return sensorType
      .replace(/_/g, ' ')
      .replace(/\d+$/, '')
      .replace(/^\w/, c => c.toUpperCase())
      .trim();
  };

  // Build sensor list from both client.sensors array AND batch readings
  const sensorTypes: string[] = useMemo(() => {
    const allTypes: string[] = [];
    
    // From client.sensors array
    if (client?.sensors) {
      allTypes.push(...client.sensors);
    }
    
    // From batch readings
    const readings = batchReadingsData?.readings || [];
    readings.forEach((r: { device_type?: string }) => {
      if (r.device_type) {
        allTypes.push(r.device_type);
      }
    });
    
    // Get unique types, filter out system_monitor, and sort by priority
    const uniqueTypes = [...new Set(allTypes.filter(Boolean))];
    
    return uniqueTypes
      .filter(t => !t.toLowerCase().includes('system_monitor'))
      .sort((a, b) => {
        const aIndex = SENSOR_ORDER.findIndex(s => a.toLowerCase().includes(s));
        const bIndex = SENSOR_ORDER.findIndex(s => b.toLowerCase().includes(s));
        const aOrder = aIndex >= 0 ? aIndex : 999;
        const bOrder = bIndex >= 0 ? bIndex : 999;
        return aOrder - bOrder;
      });
  }, [client?.sensors, batchReadingsData]);

  const isLoading = clientsLoading || systemLoading || wifiStatusLoading || batchesLoading;

  const wifiClientsList = wifiClients?.clients || [];
  const cpuPercent = systemMetrics?.cpu_load?.[0] ?? 0;
  const memoryPercent = systemMetrics?.memory?.percent ?? 0;
  const diskPercent = systemMetrics?.disk?.percent ?? 0;

  if (clientsLoading) {
    return (
      <div className="h-screen flex items-center justify-center relative bg-slate-950">
        <AuroraBackground />
        <div className="relative z-10 flex flex-col items-center gap-6">
          <Loader2 className="w-12 h-12 animate-spin text-cyan-400" />
          <p className="text-slate-400">Loading client details...</p>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="h-screen flex items-center justify-center relative bg-slate-950">
        <AuroraBackground />
        <div className="relative z-10 flex flex-col items-center gap-6 text-center">
          <Server className="w-16 h-16 text-muted-foreground/50" />
          <div>
            <h2 className="text-xl font-semibold text-slate-100 mb-2">Client Not Found</h2>
            <p className="text-slate-400 text-sm mb-4">The requested client could not be found.</p>
            <Button onClick={() => navigate('/')} variant="outline" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col relative overflow-hidden">
      <AuroraBackground />
      
      {/* Header */}
      <header className="relative z-10 border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/')}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center border border-cyan-500/30">
                <Server className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">{client.hostname || client.client_id}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {client.ip_address}
                  </Badge>
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${
                      client.state === 'adopted' 
                        ? 'bg-success/20 text-success border-success/30'
                        : client.state === 'pending'
                        ? 'bg-warning/20 text-warning border-warning/30'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {client.state || 'unknown'}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchSystem()}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative z-10 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <div className="px-6 py-3 border-b border-border/50 bg-background/50 backdrop-blur-sm">
            <ScrollArea className="w-full">
              <TabsList className="inline-flex h-10 p-1 w-auto bg-muted/50">
                <TabsTrigger value="overview" className="gap-2">
                  <Activity className="w-4 h-4" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="system" className="gap-2">
                  <Server className="w-4 h-4" />
                  System
                </TabsTrigger>
                <TabsTrigger value="network" className="gap-2">
                  <Network className="w-4 h-4" />
                  Network
                </TabsTrigger>
                {sensorTypes.map((type) => (
                  <TabsTrigger 
                    key={type} 
                    value={`sensor-${type}`} 
                    className="gap-2"
                  >
                    {getSensorIcon(type)}
                    {formatSensorLabel(type)}
                  </TabsTrigger>
                ))}
                <TabsTrigger value="raw" className="gap-2">
                  <FileJson className="w-4 h-4" />
                  Raw Data
                </TabsTrigger>
              </TabsList>
            </ScrollArea>
          </div>

          <ScrollArea className="flex-1 px-6 py-6">
            {/* Overview Tab */}
            <TabsContent value="overview" className="m-0 space-y-6">
              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-card/50 border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-orange-500/10">
                        <Cpu className="w-5 h-5 text-orange-400" />
                      </div>
                      <div>
                        <p className={`text-2xl font-bold ${getResourceColor(cpuPercent)}`}>
                          {cpuPercent.toFixed(0)}%
                        </p>
                        <p className="text-xs text-muted-foreground">CPU</p>
                      </div>
                    </div>
                    <Progress value={cpuPercent} className={`h-1 mt-2 ${getResourceBgColor(cpuPercent)}`} />
                  </CardContent>
                </Card>

                <Card className="bg-card/50 border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-500/10">
                        <MemoryStick className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <p className={`text-2xl font-bold ${getResourceColor(memoryPercent)}`}>
                          {memoryPercent.toFixed(0)}%
                        </p>
                        <p className="text-xs text-muted-foreground">Memory</p>
                      </div>
                    </div>
                    <Progress value={memoryPercent} className={`h-1 mt-2 ${getResourceBgColor(memoryPercent)}`} />
                  </CardContent>
                </Card>

                <Card className="bg-card/50 border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-purple-500/10">
                        <HardDrive className="w-5 h-5 text-purple-400" />
                      </div>
                      <div>
                        <p className={`text-2xl font-bold ${getResourceColor(diskPercent)}`}>
                          {diskPercent.toFixed(0)}%
                        </p>
                        <p className="text-xs text-muted-foreground">Disk</p>
                      </div>
                    </div>
                    <Progress value={diskPercent} className={`h-1 mt-2 ${getResourceBgColor(diskPercent)}`} />
                  </CardContent>
                </Card>

                <Card className="bg-card/50 border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-green-500/10">
                        <Clock className="w-5 h-5 text-green-400" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-green-400">
                          {systemMetrics?.uptime_seconds ? formatUptime(systemMetrics.uptime_seconds) : '—'}
                        </p>
                        <p className="text-xs text-muted-foreground">Uptime</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Client Info & WiFi Status */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Client Info */}
                <Card className="bg-card/50 border-border/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Server className="w-4 h-4 text-primary" />
                      Client Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">Client ID</p>
                        <p className="font-mono truncate">{client.client_id}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Hostname</p>
                        <p className="font-medium">{systemMetrics?.hostname || client.hostname || '—'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">MAC Address</p>
                        <p className="font-mono">{client.mac_address || '—'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Platform</p>
                        <p>{systemMetrics?.platform || '—'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Last Seen</p>
                        <p>{formatLastSeen(client.last_seen)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Batches</p>
                        <p className="font-semibold">{(client.batches_received ?? client.batch_count ?? 0).toLocaleString()}</p>
                      </div>
                    </div>
                    
                    {client.location && (
                      <div className="pt-3 border-t border-border/30">
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          <span>
                            {[client.location.city, client.location.region, client.location.country]
                              .filter(Boolean)
                              .join(', ') || 'Unknown location'}
                          </span>
                        </div>
                        {client.location.isp && (
                          <p className="text-xs text-muted-foreground ml-6 mt-1">
                            ISP: {client.location.isp}
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* WiFi Status */}
                <Card className="bg-card/50 border-border/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      {wifiStatus?.connected ? (
                        <Wifi className="w-4 h-4 text-success" />
                      ) : (
                        <WifiOff className="w-4 h-4 text-muted-foreground" />
                      )}
                      WiFi Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {wifiStatusLoading ? (
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                      </div>
                    ) : wifiStatus ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Connected</span>
                          <Badge className={wifiStatus.connected 
                            ? 'bg-success/20 text-success border-success/30' 
                            : 'bg-destructive/20 text-destructive border-destructive/30'
                          }>
                            {wifiStatus.connected ? 'Yes' : 'No'}
                          </Badge>
                        </div>
                        {wifiStatus.ssid && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">SSID</span>
                            <span className="text-sm font-medium">{wifiStatus.ssid}</span>
                          </div>
                        )}
                        {wifiStatus.signal_strength !== undefined && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Signal</span>
                            <div className="flex items-center gap-2">
                              <Signal className="w-4 h-4 text-primary" />
                              <span className="text-sm">{wifiStatus.signal_strength} dBm</span>
                            </div>
                          </div>
                        )}
                        {wifiStatus.ip_address && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">IP</span>
                            <span className="text-sm font-mono">{wifiStatus.ip_address}</span>
                          </div>
                        )}
                        {wifiMode?.mode && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Mode</span>
                            <Badge variant="outline">{wifiMode.mode}</Badge>
                          </div>
                        )}
                        {wifiClientsList.length > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Connected Clients</span>
                            <Badge variant="secondary">{wifiClientsList.length}</Badge>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">WiFi status unavailable</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Sensors Overview */}
              {sensorTypes.length > 0 && (
                <Card className="bg-card/50 border-border/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Activity className="w-4 h-4 text-primary" />
                      Active Sensors ({client.sensors?.length || 0})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {sensorTypes.map((type) => {
                        const count = client.sensors?.filter(s => 
                          s.toLowerCase().includes(type.replace('_probe', '').replace('_monitor', ''))
                        ).length || 0;
                        
                        return (
                          <button
                            key={type}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border/50 hover:border-primary/50 transition-colors"
                            style={{ backgroundColor: `${getSensorColor(type)}15` }}
                            onClick={() => setActiveTab(`sensor-${type}`)}
                          >
                            <span style={{ color: getSensorColor(type) }}>{getSensorIcon(type)}</span>
                            <span className="text-sm capitalize">{type.replace(/_/g, ' ')}</span>
                            <Badge variant="secondary" className="text-xs">{count}</Badge>
                            <ChevronRight className="w-3 h-3 text-muted-foreground" />
                          </button>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* System Tab */}
            <TabsContent value="system" className="m-0 space-y-6">
              {systemLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-32" />
                  <Skeleton className="h-48" />
                </div>
              ) : systemMetrics ? (
                <>
                  {/* System Overview */}
                  <Card className="bg-card/50 border-border/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Server className="w-4 h-4 text-primary" />
                        System Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground text-xs">Hostname</p>
                          <p className="font-medium">{systemMetrics.hostname || '—'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Platform</p>
                          <p>{systemMetrics.platform || '—'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">CPU Cores</p>
                          <p>{systemMetrics.cpu_count || '—'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Version</p>
                          <p>{systemMetrics.version || '—'}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Resource Usage */}
                  <Card className="bg-card/50 border-border/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Activity className="w-4 h-4 text-primary" />
                        Resource Usage
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* CPU */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm flex items-center gap-2">
                            <Cpu className="w-4 h-4 text-orange-400" />
                            CPU Load
                          </span>
                          <span className={`text-sm font-medium ${getResourceColor(cpuPercent)}`}>
                            {cpuPercent.toFixed(1)}%
                          </span>
                        </div>
                        <Progress value={cpuPercent} className="h-2" />
                        {systemMetrics.cpu_load && systemMetrics.cpu_load.length > 1 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Load: {systemMetrics.cpu_load.map(l => l.toFixed(2)).join(', ')} (1m, 5m, 15m)
                          </p>
                        )}
                      </div>

                      {/* Memory */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm flex items-center gap-2">
                            <MemoryStick className="w-4 h-4 text-blue-400" />
                            Memory
                          </span>
                          <span className={`text-sm font-medium ${getResourceColor(memoryPercent)}`}>
                            {memoryPercent.toFixed(1)}%
                            {systemMetrics.memory?.total && (
                              <span className="text-muted-foreground ml-2">
                                ({formatBytes(systemMetrics.memory.used || 0)} / {formatBytes(systemMetrics.memory.total)})
                              </span>
                            )}
                          </span>
                        </div>
                        <Progress value={memoryPercent} className="h-2" />
                      </div>

                      {/* Disk */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm flex items-center gap-2">
                            <HardDrive className="w-4 h-4 text-purple-400" />
                            Disk
                          </span>
                          <span className={`text-sm font-medium ${getResourceColor(diskPercent)}`}>
                            {diskPercent.toFixed(1)}%
                            {systemMetrics.disk?.total && (
                              <span className="text-muted-foreground ml-2">
                                ({formatBytes(systemMetrics.disk.used || 0)} / {formatBytes(systemMetrics.disk.total)})
                              </span>
                            )}
                          </span>
                        </div>
                        <Progress value={diskPercent} className="h-2" />
                      </div>

                      {/* Uptime */}
                      <div className="flex items-center justify-between pt-2 border-t border-border/30">
                        <span className="text-sm flex items-center gap-2">
                          <Clock className="w-4 h-4 text-green-400" />
                          Uptime
                        </span>
                        <span className="text-sm font-medium text-green-400">
                          {systemMetrics.uptime_seconds ? formatUptime(systemMetrics.uptime_seconds) : '—'}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* USB Devices */}
                  {systemMetrics.usb_devices && systemMetrics.usb_devices.length > 0 && (
                    <Card className="bg-card/50 border-border/50">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Usb className="w-4 h-4 text-primary" />
                          USB Devices ({systemMetrics.usb_devices.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {systemMetrics.usb_devices.map((device, idx) => (
                            <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                              <Usb className="w-4 h-4 text-muted-foreground" />
                              <div>
                                <p className="text-sm font-medium">{device.product || device.device}</p>
                                {device.vendor && (
                                  <p className="text-xs text-muted-foreground">{device.vendor}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <Card className="bg-card/50 border-border/50">
                  <CardContent className="p-8 text-center">
                    <Server className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">System information unavailable</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>


            {/* Network Tab */}
            <TabsContent value="network" className="m-0 space-y-6">
              <Card className="bg-card/50 border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Network className="w-4 h-4 text-primary" />
                    Network Interfaces
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {systemMetrics?.network_interfaces && systemMetrics.network_interfaces.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {systemMetrics.network_interfaces.map((iface, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/30">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                              <Router className="w-4 h-4 text-blue-400" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">{iface.name}</p>
                              {iface.mac && (
                                <p className="text-xs text-muted-foreground font-mono">{iface.mac}</p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-mono">{iface.ip || '—'}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No network interfaces available
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* External IP */}
              <Card className="bg-card/50 border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Globe className="w-4 h-4 text-primary" />
                    External Connection
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Public IP</p>
                      <p className="font-mono">{client.ip_address || '—'}</p>
                    </div>
                    {client.location && (
                      <>
                        <div>
                          <p className="text-muted-foreground text-xs">Location</p>
                          <p>
                            {[client.location.city, client.location.country]
                              .filter(Boolean)
                              .join(', ') || '—'}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">ISP</p>
                          <p>{client.location.isp || '—'}</p>
                        </div>
                        {client.location.latitude && client.location.longitude && (
                          <div>
                            <p className="text-muted-foreground text-xs">Coordinates</p>
                            <p className="font-mono text-xs">
                              {client.location.latitude.toFixed(4)}, {client.location.longitude.toFixed(4)}
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Sensor Tabs */}
            {sensorTypes.map((type) => (
              <TabsContent key={type} value={`sensor-${type}`} className="m-0">
                <SensorTabContent 
                  sensorType={type} 
                  clientId={client.client_id} 
                  batchReadings={batchReadingsData?.readings || []}
                  isLoading={readingsLoading}
                />
              </TabsContent>
            ))}

            {/* Raw Data Tab */}
            <TabsContent value="raw" className="m-0">
              <ClientRawBatchTab 
                batch={latestBatch} 
                readings={batchReadingsData?.readings || null}
                isLoading={batchesLoading || readingsLoading}
              />
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </main>
    </div>
  );
}

// Sensor tab content component
interface SensorTabContentProps {
  sensorType: string;
  clientId: string;
  batchReadings: Array<{ device_id: string; device_type: string; timestamp: string; data: Record<string, unknown> }>;
  isLoading: boolean;
}

function SensorTabContent({ sensorType, clientId, batchReadings, isLoading }: SensorTabContentProps) {
  const { data: apiReadings, isLoading: apiLoading } = useSensorReadings(sensorType, 24);
  
  const filteredReadings = useMemo(() => {
    const fromBatch = batchReadings.filter(r => 
      r.device_type === sensorType || 
      r.device_type?.includes(sensorType) ||
      sensorType.includes(r.device_type || '')
    );
    
    const apiReadingsList = Array.isArray(apiReadings) ? apiReadings : (apiReadings?.readings || []);
    const fromApi = apiReadingsList.filter((r: { client_id?: string }) => 
      !r.client_id || r.client_id === clientId || r.client_id === 'unknown'
    );
    
    const combined = [...fromBatch, ...fromApi];
    const seen = new Set<string>();
    return combined.filter(r => {
      const key = `${r.device_id}-${r.timestamp}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [batchReadings, apiReadings, sensorType, clientId]);

  return (
    <ClientSensorTab 
      sensorType={sensorType}
      readings={filteredReadings}
      isLoading={isLoading || apiLoading}
    />
  );
}
