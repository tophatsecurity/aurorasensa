import { useState, useMemo } from "react";
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
  ChevronLeft,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  type SystemInfo,
  useClientSystemInfo,
  useWifiStatus,
  useWifiConfig,
  useWifiClients,
  useWifiMode,
  useBatchesByClient,
  useBatchReadings,
  useClient,
  useClientLatestBatch,
} from "@/hooks/aurora";
import { formatLastSeen } from "@/utils/dateUtils";
import { ClientSensorTab, ClientRawBatchTab } from "@/components/client";

interface ClientDetailPageProps {
  clientId: string;
  onBack: () => void;
}

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
  const type = sensorType.toLowerCase();
  if (type.includes('arduino')) return <Cpu className={iconClass} />;
  if (type.includes('lora')) return <Radio className={iconClass} />;
  if (type.includes('starlink')) return <Satellite className={iconClass} />;
  if (type.includes('wifi')) return <Wifi className={iconClass} />;
  if (type.includes('bluetooth')) return <Bluetooth className={iconClass} />;
  if (type.includes('adsb')) return <Plane className={iconClass} />;
  if (type.includes('gps')) return <Navigation className={iconClass} />;
  if (type.includes('thermal')) return <Thermometer className={iconClass} />;
  if (type.includes('system')) return <Monitor className={iconClass} />;
  return <Cpu className={iconClass} />;
};

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
  if (type.includes('system_monitor')) return 'System Monitor';
  if (type.includes('aht_sensor')) return 'AHT Sensor';
  if (type.includes('bmt_sensor')) return 'BMT Sensor';
  
  // Default: clean up the type name
  return sensorType
    .replace(/_/g, ' ')
    .replace(/\d+$/, '')
    .replace(/^\w/, c => c.toUpperCase())
    .trim();
};

const getResourceColor = (percent: number): string => {
  if (percent >= 90) return 'text-destructive';
  if (percent >= 75) return 'text-warning';
  return 'text-success';
};

export function ClientDetailPage({ clientId, onBack }: ClientDetailPageProps) {
  const [activeTab, setActiveTab] = useState("overview");
  
  const { data: client, isLoading: clientLoading, refetch: refetchClient } = useClient(clientId);
  const { data: systemInfo, isLoading: systemLoading, refetch: refetchSystem } = useClientSystemInfo(clientId);
  const { data: wifiStatus, isLoading: wifiStatusLoading } = useWifiStatus(clientId);
  const { data: wifiConfig, isLoading: wifiConfigLoading } = useWifiConfig(clientId);
  const { data: wifiClients, isLoading: wifiClientsLoading } = useWifiClients(clientId);
  const { data: wifiMode } = useWifiMode(clientId);
  const { data: batchesData } = useBatchesByClient(clientId);
  const { data: latestBatchData, refetch: refetchBatch } = useClientLatestBatch(clientId, true);
  
  const latestBatch = batchesData?.batches?.[0] || null;
  const { data: batchReadingsData } = useBatchReadings(latestBatch?.batch_id || "");

  const batchReadings = useMemo(() => {
    return latestBatchData?.batch?.json_content?.readings || [];
  }, [latestBatchData]);

  // Extract system metrics from various sources with better fallbacks
  const systemMetrics = useMemo(() => {
    // First try direct system info API
    if (systemInfo) {
      const info = systemInfo as SystemInfo;
      return {
        hostname: info.hostname,
        platform: info.platform,
        uptime_seconds: info.uptime_seconds,
        cpu_load: info.cpu_load || info.load,
        cpu_count: info.cpu_count,
        memory: info.memory || { percent: 0, total: 0, used: 0 },
        disk: info.disk || { percent: 0, total: 0, used: 0 },
        network_interfaces: info.network_interfaces,
        usb_devices: info.usb_devices,
        version: info.version,
      };
    }
    
    // Try extracting from batch readings (system_monitor sensor)
    for (const reading of batchReadings) {
      const sensors = reading.sensors as Record<string, any> | undefined;
      if (!sensors) continue;
      
      // Look for system_monitor sensor (can have different naming conventions)
      const sysMonitorKey = Object.keys(sensors).find(k => 
        k.toLowerCase().includes('system_monitor') || k.toLowerCase().includes('system')
      );
      
      if (sysMonitorKey) {
        const sysMonitor = sensors[sysMonitorKey];
        if (sysMonitor?.system) {
          const sys = sysMonitor.system;
          const perf = sysMonitor.performance || {};
          return {
            hostname: sys.hostname,
            platform: sys.platform || sys.os,
            uptime_seconds: sys.uptime_seconds || perf.uptime,
            cpu_load: perf.cpu_percent ? [perf.cpu_percent] : undefined,
            cpu_count: sys.cpu_count,
            memory: { percent: perf.memory_percent || 0, total: perf.memory_total, used: perf.memory_used },
            disk: { percent: perf.disk_percent || 0, total: perf.disk_total, used: perf.disk_used },
            network_interfaces: sys.network_interfaces,
            usb_devices: sysMonitor.usb_devices,
            version: sys.version,
          };
        }
      }
    }
    
    // Fallback: create minimal metrics from client data
    const clientData = client as any;
    if (clientData) {
      return {
        hostname: clientData.hostname || clientId,
        platform: clientData.metadata?.platform || null,
        uptime_seconds: null,
        cpu_load: null,
        cpu_count: null,
        memory: { percent: 0, total: 0, used: 0 },
        disk: { percent: 0, total: 0, used: 0 },
        network_interfaces: clientData.metadata?.network_interfaces || null,
        usb_devices: null,
        version: clientData.metadata?.version || null,
      };
    }
    
    return null;
  }, [systemInfo, batchReadings, client, clientId]);

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
    'system_monitor',
    'aht_sensor', 'bmt_sensor',
  ];

  const sensorTypes = useMemo((): string[] => {
    // First, try to get sensor types from batch readings
    const batchTypes = batchReadings.map((r: any) => {
      const sensors = r.sensors as Record<string, any> | undefined;
      if (sensors) return Object.keys(sensors);
      return [r.device_type || 'unknown'];
    }).flat().filter(Boolean);

    // Also check client.sensors array if available
    const clientSensors = (client as any)?.sensors || [];
    
    // Combine both sources
    const allTypes = [...batchTypes, ...clientSensors];
    const uniqueTypes = [...new Set(allTypes)] as string[];
    
    // Filter out system_monitor (it's shown in overview) and sort by preferred order
    return uniqueTypes
      .filter(t => t && !t.toLowerCase().includes('system_monitor'))
      .sort((a, b) => {
        const aIndex = SENSOR_ORDER.findIndex(s => a.toLowerCase().includes(s));
        const bIndex = SENSOR_ORDER.findIndex(s => b.toLowerCase().includes(s));
        const aOrder = aIndex >= 0 ? aIndex : 999;
        const bOrder = bIndex >= 0 ? bIndex : 999;
        return aOrder - bOrder;
      });
  }, [batchReadings, client]);

  const isLoading = clientLoading || systemLoading;
  const wifiClientsList = (wifiClients as any)?.clients || [];
  const cpuPercent = systemMetrics?.cpu_load?.[0] ?? 0;
  const memoryPercent = systemMetrics?.memory?.percent ?? 0;
  const diskPercent = systemMetrics?.disk?.percent ?? 0;
  const displayHostname = systemMetrics?.hostname || (client as any)?.hostname || clientId;

  const handleRefresh = () => {
    refetchClient();
    refetchSystem();
    refetchBatch();
  };

  if (clientLoading && !client) {
    return (
      <div className="flex-1 p-6">
        <Skeleton className="h-20 w-full mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-6 pb-4 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
              <ChevronLeft className="w-4 h-4" />
              Back
            </Button>
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30">
              <Server className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{displayHostname}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">{(client as any)?.ip_address || 'No IP'}</Badge>
                <Badge variant="outline" className={`text-xs ${(client as any)?.state === 'adopted' ? 'bg-success/20 text-success border-success/30' : 'bg-muted text-muted-foreground'}`}>
                  {(client as any)?.state || 'unknown'}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
            <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <div className="px-6 pt-4 border-b border-border/30">
          <TabsList className="flex flex-wrap h-auto gap-1 p-1 bg-muted/50">
            <TabsTrigger value="overview" className="gap-2"><Activity className="w-4 h-4" />Overview</TabsTrigger>
            {sensorTypes.map((type) => (
              <TabsTrigger key={type} value={`sensor-${type}`} className="gap-2 capitalize">
                {getSensorIcon(type)}
                {formatSensorLabel(type)}
              </TabsTrigger>
            ))}
            <TabsTrigger value="raw" className="gap-2"><FileJson className="w-4 h-4" />Raw Data</TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea className="flex-1 p-6">
          {/* Overview Tab */}
          <TabsContent value="overview" className="m-0 space-y-6">
            {/* Resource Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-card/50 border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-chart-1/10"><Cpu className="w-5 h-5 text-chart-1" /></div>
                    <div>
                      <p className={`text-2xl font-bold ${getResourceColor(cpuPercent)}`}>{cpuPercent.toFixed(0)}%</p>
                      <p className="text-xs text-muted-foreground">CPU</p>
                    </div>
                  </div>
                  <Progress value={cpuPercent} className="h-1 mt-2" />
                </CardContent>
              </Card>
              <Card className="bg-card/50 border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10"><MemoryStick className="w-5 h-5 text-primary" /></div>
                    <div>
                      <p className={`text-2xl font-bold ${getResourceColor(memoryPercent)}`}>{memoryPercent.toFixed(0)}%</p>
                      <p className="text-xs text-muted-foreground">Memory</p>
                    </div>
                  </div>
                  <Progress value={memoryPercent} className="h-1 mt-2" />
                </CardContent>
              </Card>
              <Card className="bg-card/50 border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-chart-4/10"><HardDrive className="w-5 h-5 text-chart-4" /></div>
                    <div>
                      <p className={`text-2xl font-bold ${getResourceColor(diskPercent)}`}>{diskPercent.toFixed(0)}%</p>
                      <p className="text-xs text-muted-foreground">Disk</p>
                    </div>
                  </div>
                  <Progress value={diskPercent} className="h-1 mt-2" />
                </CardContent>
              </Card>
              <Card className="bg-card/50 border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-success/10"><Clock className="w-5 h-5 text-success" /></div>
                    <div>
                      <p className="text-2xl font-bold text-success">{systemMetrics?.uptime_seconds ? formatUptime(systemMetrics.uptime_seconds) : '—'}</p>
                      <p className="text-xs text-muted-foreground">Uptime</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* System Information */}
            <Card className="bg-card/50 border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2"><Server className="w-4 h-4 text-primary" />System Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div><p className="text-muted-foreground text-xs">Hostname</p><p className="font-medium">{displayHostname}</p></div>
                  <div><p className="text-muted-foreground text-xs">Client ID</p><p className="font-mono text-xs truncate">{clientId}</p></div>
                  <div><p className="text-muted-foreground text-xs">IP Address</p><p className="font-mono">{(client as any)?.ip_address || '—'}</p></div>
                  <div><p className="text-muted-foreground text-xs">MAC Address</p><p className="font-mono text-xs">{(client as any)?.mac_address || '—'}</p></div>
                  <div><p className="text-muted-foreground text-xs">Platform</p><p>{systemMetrics?.platform || '—'}</p></div>
                  <div><p className="text-muted-foreground text-xs">CPU Cores</p><p>{systemMetrics?.cpu_count || '—'}</p></div>
                  <div><p className="text-muted-foreground text-xs">Version</p><p>{systemMetrics?.version || '—'}</p></div>
                  <div>
                    <p className="text-muted-foreground text-xs">State</p>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${
                        (client as any)?.state === 'adopted' 
                          ? 'bg-success/20 text-success border-success/30' 
                          : (client as any)?.state === 'pending'
                          ? 'bg-warning/20 text-warning border-warning/30'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {(client as any)?.state || 'unknown'}
                    </Badge>
                  </div>
                  <div><p className="text-muted-foreground text-xs">Last Seen</p><p>{(client as any)?.last_seen ? formatLastSeen((client as any).last_seen) : '—'}</p></div>
                  <div><p className="text-muted-foreground text-xs">Batches Received</p><p className="font-semibold">{((client as any)?.batches_received || (client as any)?.batch_count || 0).toLocaleString()}</p></div>
                </div>
              </CardContent>
            </Card>

            {/* Sensor Quick Stats - Only show if we have batch data */}
            {batchReadings.length > 0 && (
              <Card className="bg-card/50 border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2"><Activity className="w-4 h-4 text-primary" />Latest Batch Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Batch ID</p>
                      <p className="font-mono text-xs truncate">{latestBatchData?.batch?.batch_id?.split('_').slice(-2).join('_') || '—'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Readings</p>
                      <p className="font-semibold">{latestBatchData?.batch?.reading_count || batchReadings.length}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Sensors Active</p>
                      <p className="font-semibold">{sensorTypes.length}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Batch Time</p>
                      <p>{latestBatchData?.batch?.batch_timestamp ? formatLastSeen(latestBatchData.batch.batch_timestamp) : '—'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Network Interfaces */}
            <Card className="bg-card/50 border-border/50">
              <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Network className="w-4 h-4 text-primary" />Network Interfaces</CardTitle></CardHeader>
              <CardContent>{systemMetrics?.network_interfaces?.length ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">{(systemMetrics.network_interfaces as any[]).map((iface, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/30">
                    <div className="flex items-center gap-3"><Network className="w-4 h-4 text-primary" /><p className="text-sm font-medium">{iface.name || iface.interface}</p></div>
                    {iface.ip && <p className="text-sm font-mono">{iface.ip}</p>}
                  </div>
                ))}</div>
              ) : <p className="text-sm text-muted-foreground text-center py-4">No network interfaces available</p>}</CardContent>
            </Card>

            {/* USB Devices */}
            {systemMetrics?.usb_devices?.length > 0 && (
              <Card className="bg-card/50 border-border/50">
                <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Usb className="w-4 h-4 text-primary" />USB Devices ({systemMetrics.usb_devices.length})</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">{(systemMetrics.usb_devices as any[]).map((device, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/30">
                      <Usb className="w-4 h-4 text-primary" />
                      <div>
                        <p className="text-sm font-medium">{device.product || device.name || 'Unknown Device'}</p>
                        <p className="text-xs text-muted-foreground font-mono">{device.vendor_id}:{device.product_id}</p>
                      </div>
                    </div>
                  ))}</div>
                </CardContent>
              </Card>
            )}

            {/* Active Sensors */}
            {sensorTypes.length > 0 && (
              <Card className="bg-card/50 border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2"><Activity className="w-4 h-4 text-primary" />Active Sensors ({sensorTypes.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {sensorTypes.map((type) => (
                      <button key={type} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border/50 hover:border-primary/50 transition-colors bg-muted/30" onClick={() => setActiveTab(`sensor-${type}`)}>
                        {getSensorIcon(type)}
                        <span className="text-sm">{formatSensorLabel(type)}</span>
                        <ChevronRight className="w-3 h-3 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Dynamic Sensor Tabs */}
          {sensorTypes.map((type) => {
            // Transform batch readings to the format ClientSensorTab expects
            const sensorReadings = batchReadings
              .filter((r: any) => {
                const sensors = r.sensors as Record<string, any> | undefined;
                return sensors && Object.keys(sensors).some(k => k.includes(type));
              })
              .map((r: any) => {
                const sensors = r.sensors as Record<string, any> | undefined;
                const sensorKey = Object.keys(sensors || {}).find(k => k.includes(type));
                const sensorData = sensorKey ? sensors?.[sensorKey] : {};
                return {
                  device_id: sensorKey || type,
                  device_type: type,
                  timestamp: r.device_timestamp || new Date().toISOString(),
                  data: sensorData || {},
                };
              });

            return (
              <TabsContent key={type} value={`sensor-${type}`} className="m-0">
                <ClientSensorTab sensorType={type} readings={sensorReadings} />
              </TabsContent>
            );
          })}

          {/* Raw Data Tab */}
          <TabsContent value="raw" className="m-0">
            <ClientRawBatchTab 
              batch={latestBatch} 
              readings={batchReadingsData?.readings || null} 
              latestBatchData={latestBatchData}
            />
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}

export default ClientDetailPage;
