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

  const systemMetrics = useMemo(() => {
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
    
    // Try extracting from batch readings
    for (const reading of batchReadings) {
      const sensors = reading.sensors as Record<string, any> | undefined;
      const sysMonitor = sensors?.['system_monitor_1'];
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
    return null;
  }, [systemInfo, batchReadings]);

  const sensorTypes = useMemo((): string[] => {
    const types = batchReadings.map((r: any) => {
      const sensors = r.sensors as Record<string, any> | undefined;
      if (sensors) return Object.keys(sensors);
      return [r.device_type || 'unknown'];
    }).flat();
    return [...new Set(types.filter(Boolean))] as string[];
  }, [batchReadings]);

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
          <ScrollArea className="w-full">
            <TabsList className="inline-flex h-10 p-1 w-auto bg-muted/50">
              <TabsTrigger value="overview" className="gap-2"><Activity className="w-4 h-4" />Overview</TabsTrigger>
              <TabsTrigger value="system" className="gap-2"><Server className="w-4 h-4" />System</TabsTrigger>
              <TabsTrigger value="wifi" className="gap-2"><Wifi className="w-4 h-4" />WiFi</TabsTrigger>
              <TabsTrigger value="network" className="gap-2"><Network className="w-4 h-4" />Network</TabsTrigger>
              {sensorTypes.map((type) => (
                <TabsTrigger key={type} value={`sensor-${type}`} className="gap-2 capitalize">
                  {getSensorIcon(type)}
                  {type.replace(/_/g, ' ').replace(/\d+$/, '')}
                </TabsTrigger>
              ))}
              <TabsTrigger value="raw" className="gap-2"><FileJson className="w-4 h-4" />Raw Data</TabsTrigger>
            </TabsList>
          </ScrollArea>
        </div>

        <ScrollArea className="flex-1 p-6">
          {/* Overview Tab */}
          <TabsContent value="overview" className="m-0 space-y-6">
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

            {/* Client Info */}
            <Card className="bg-card/50 border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2"><Server className="w-4 h-4 text-primary" />Client Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div><p className="text-muted-foreground text-xs">Hostname</p><p className="font-medium">{displayHostname}</p></div>
                  <div><p className="text-muted-foreground text-xs">Platform</p><p>{systemMetrics?.platform || '—'}</p></div>
                  <div><p className="text-muted-foreground text-xs">Last Seen</p><p>{(client as any)?.last_seen ? formatLastSeen((client as any).last_seen) : '—'}</p></div>
                </div>
              </CardContent>
            </Card>

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
                        <span className="text-sm capitalize">{type.replace(/_/g, ' ').replace(/\d+$/, '')}</span>
                        <ChevronRight className="w-3 h-3 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* System Tab */}
          <TabsContent value="system" className="m-0 space-y-4">
            {systemMetrics ? (
              <Card className="bg-card/50 border-border/50">
                <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Server className="w-4 h-4 text-primary" />System Information</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div><p className="text-muted-foreground text-xs">Hostname</p><p className="font-medium">{displayHostname}</p></div>
                    <div><p className="text-muted-foreground text-xs">Platform</p><p>{systemMetrics.platform || '—'}</p></div>
                    <div><p className="text-muted-foreground text-xs">CPU Cores</p><p>{systemMetrics.cpu_count || '—'}</p></div>
                    <div><p className="text-muted-foreground text-xs">Version</p><p>{systemMetrics.version || '—'}</p></div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-card/50 border-border/50"><CardContent className="p-8 text-center"><Server className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" /><p className="text-muted-foreground">System information unavailable</p></CardContent></Card>
            )}
          </TabsContent>

          {/* WiFi Tab */}
          <TabsContent value="wifi" className="m-0 space-y-4">
            <Card className="bg-card/50 border-border/50">
              <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Wifi className="w-4 h-4 text-primary" />WiFi Configuration</CardTitle></CardHeader>
              <CardContent>
                {wifiConfig ? (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><p className="text-muted-foreground text-xs">SSID</p><p className="font-medium">{(wifiConfig as any).ssid || '—'}</p></div>
                    <div><p className="text-muted-foreground text-xs">Mode</p><p>{(wifiConfig as any).mode || (wifiMode as any)?.mode || '—'}</p></div>
                    <div><p className="text-muted-foreground text-xs">Channel</p><p>{(wifiConfig as any).channel || '—'}</p></div>
                    <div><p className="text-muted-foreground text-xs">Status</p><Badge className={(wifiStatus as any)?.connected ? 'bg-success/20 text-success border-success/30' : 'bg-muted text-muted-foreground'}>{(wifiStatus as any)?.connected ? 'Connected' : 'Disconnected'}</Badge></div>
                  </div>
                ) : <p className="text-sm text-muted-foreground">WiFi configuration unavailable</p>}
              </CardContent>
            </Card>
            <Card className="bg-card/50 border-border/50">
              <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Users className="w-4 h-4 text-primary" />Connected Clients ({wifiClientsList.length})</CardTitle></CardHeader>
              <CardContent>{wifiClientsList.length > 0 ? (
                <div className="space-y-2">{wifiClientsList.map((wc: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/30">
                    <div className="flex items-center gap-3"><Wifi className="w-4 h-4 text-primary" /><div><p className="text-sm font-medium">{wc.hostname || 'Unknown'}</p><p className="text-xs text-muted-foreground font-mono">{wc.mac}</p></div></div>
                    {wc.ip && <p className="text-sm font-mono">{wc.ip}</p>}
                  </div>
                ))}</div>
              ) : <p className="text-sm text-muted-foreground text-center py-4">No clients connected</p>}</CardContent>
            </Card>
          </TabsContent>

          {/* Network Tab */}
          <TabsContent value="network" className="m-0 space-y-4">
            <Card className="bg-card/50 border-border/50">
              <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Network className="w-4 h-4 text-primary" />Network Interfaces</CardTitle></CardHeader>
              <CardContent>{systemMetrics?.network_interfaces?.length ? (
                <div className="space-y-2">{(systemMetrics.network_interfaces as any[]).map((iface, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/30">
                    <div className="flex items-center gap-3"><Network className="w-4 h-4 text-primary" /><p className="text-sm font-medium">{iface.name || iface.interface}</p></div>
                    {iface.ip && <p className="text-sm font-mono">{iface.ip}</p>}
                  </div>
                ))}</div>
              ) : <p className="text-sm text-muted-foreground text-center py-4">No network interfaces available</p>}</CardContent>
            </Card>
          </TabsContent>

          {/* Dynamic Sensor Tabs */}
          {sensorTypes.map((type) => (
            <TabsContent key={type} value={`sensor-${type}`} className="m-0">
              <ClientSensorTab clientId={clientId} sensorType={type} batchReadings={batchReadings} />
            </TabsContent>
          ))}

          {/* Raw Data Tab */}
          <TabsContent value="raw" className="m-0">
            <ClientRawBatchTab batch={latestBatch} readings={batchReadingsData?.readings || null} />
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}

export default ClientDetailPage;
