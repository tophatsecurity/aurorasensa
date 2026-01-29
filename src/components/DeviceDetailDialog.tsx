import { useState, useMemo } from "react";
import { 
  Cpu, 
  Wifi, 
  Radio, 
  Plane, 
  Navigation, 
  Thermometer, 
  Bluetooth, 
  Monitor,
  Satellite,
  CheckCircle,
  XCircle,
  Server,
  Clock,
  Settings,
  Activity,
  Database,
  RefreshCw,
  Loader2,
  FileJson,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { type Client, useClientSystemInfo, useBatchesByClient, useBatchReadings, useSensorReadings } from "@/hooks/aurora";
import { formatDateTime } from "@/utils/dateUtils";
import { ClientSensorTab, ClientRawBatchTab } from "@/components/client";

interface DeviceDetailDialogProps {
  client: Client | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SensorConfig {
  device_id: string;
  enabled: boolean;
  [key: string]: unknown;
}

const getSensorIcon = (sensorType: string) => {
  const iconClass = "w-4 h-4";
  switch (sensorType) {
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

const getSensorColor = (sensorType: string) => {
  switch (sensorType) {
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

const formatDate = (dateString: string | null | undefined): string => {
  return formatDateTime(dateString, "—");
};

interface SystemMetrics {
  cpu_percent?: number;
  memory_percent?: number;
  disk_percent?: number;
  uptime_seconds?: number;
}

const DeviceDetailDialog = ({ client, open, onOpenChange }: DeviceDetailDialogProps) => {
  const [activeTab, setActiveTab] = useState("overview");
  
  // System info
  const { data: liveSystemInfo, isLoading: systemLoading, refetch: refetchSystem } = useClientSystemInfo(
    client?.client_id || ""
  );

  // Batches for this client
  const { data: batchesData, isLoading: batchesLoading } = useBatchesByClient(client?.client_id || "");
  const latestBatch = batchesData?.batches?.[0] || null;
  
  // Batch readings
  const { data: batchReadingsData, isLoading: readingsLoading } = useBatchReadings(latestBatch?.batch_id || "");
  
  // Get sensor types from batch
  const sensorTypes = useMemo(() => {
    if (!latestBatch?.device_types) return [];
    return latestBatch.device_types;
  }, [latestBatch]);

  // Extract metrics from SystemInfo or use client metadata
  const extractMetrics = (systemInfo: unknown, clientMetadata: SystemMetrics | undefined): SystemMetrics => {
    if (systemInfo && typeof systemInfo === 'object') {
      const info = systemInfo as Record<string, unknown>;
      return {
        cpu_percent: info.cpu_load?.[0] as number | undefined ?? clientMetadata?.cpu_percent,
        memory_percent: (info.memory as { percent?: number })?.percent ?? clientMetadata?.memory_percent,
        disk_percent: (info.disk as { percent?: number })?.percent ?? clientMetadata?.disk_percent,
        uptime_seconds: info.uptime_seconds as number | undefined ?? clientMetadata?.uptime_seconds,
      };
    }
    return clientMetadata || {};
  };

  // Use live data if available, fallback to client metadata
  const system = extractMetrics(liveSystemInfo, client?.metadata?.system);

  if (!client) return null;

  const config = client.metadata?.config;
  const sensors = config?.sensors || {};

  // Build sensor list from config
  const sensorItems: { id: string; type: string; config: SensorConfig | null }[] = [];

  // Arduino devices
  if (sensors.arduino_devices) {
    sensors.arduino_devices.forEach((device: SensorConfig) => {
      sensorItems.push({ id: device.device_id, type: 'arduino', config: device });
    });
  }

  // ADS-B devices
  if (sensors.adsb_devices) {
    sensors.adsb_devices.forEach((device: SensorConfig) => {
      sensorItems.push({ id: device.device_id, type: 'adsb', config: device });
    });
  }

  // Single sensors
  const singleSensors = ['lora', 'starlink', 'wifi', 'bluetooth', 'gps', 'thermal_probe', 'system_monitor'] as const;
  singleSensors.forEach((key) => {
    const sensor = sensors[key as keyof typeof sensors] as SensorConfig | undefined;
    if (sensor && sensor.device_id) {
      const type = key.replace('_probe', '').replace('_monitor', '');
      sensorItems.push({ id: sensor.device_id, type, config: sensor });
    }
  });

  // Get unique sensor types for tabs
  const uniqueSensorTypes = [...new Set(sensorItems.map(s => s.type))];

  // Calculate sensor data summary
  const sensorSummary = {
    total: sensorItems.length,
    active: sensorItems.filter(s => s.config?.enabled !== false).length,
    types: uniqueSensorTypes.length,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                <Server className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <span className="text-xl">{client.hostname || client.client_id}</span>
                <p className="text-sm text-muted-foreground font-normal">{client.ip_address}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {(systemLoading || batchesLoading) && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetchSystem()}
                className="gap-1"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <ScrollArea className="w-full">
            <TabsList className="inline-flex h-10 p-1 w-auto">
              <TabsTrigger value="overview" className="gap-2 whitespace-nowrap">
                <Database className="w-4 h-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="info" className="gap-2 whitespace-nowrap">
                <Server className="w-4 h-4" />
                Device Info
              </TabsTrigger>
              {uniqueSensorTypes.map((type) => (
                <TabsTrigger 
                  key={type} 
                  value={`sensor-${type}`} 
                  className="gap-2 whitespace-nowrap capitalize"
                  style={{ color: activeTab === `sensor-${type}` ? getSensorColor(type) : undefined }}
                >
                  {getSensorIcon(type)}
                  {type.replace(/_/g, ' ')}
                </TabsTrigger>
              ))}
              <TabsTrigger value="raw-batch" className="gap-2 whitespace-nowrap">
                <FileJson className="w-4 h-4" />
                Raw Batch
              </TabsTrigger>
              <TabsTrigger value="config" className="gap-2 whitespace-nowrap">
                <Settings className="w-4 h-4" />
                Config
              </TabsTrigger>
            </TabsList>
          </ScrollArea>

          <ScrollArea className="flex-1 mt-4">
            {/* Overview Tab */}
            <TabsContent value="overview" className="m-0">
              <div className="space-y-4">
                {/* Sensor Overview Card */}
                <div className="glass-card rounded-xl p-5 border border-border/50">
                  <div className="flex items-center gap-2 mb-4">
                    <Database className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold">Sensor Overview</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center p-4 rounded-lg bg-primary/10 border border-primary/20">
                      <p className="text-3xl font-bold text-primary">{sensorSummary.total}</p>
                      <p className="text-xs text-muted-foreground mt-1">Total Sensors</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-success/10 border border-success/20">
                      <p className="text-3xl font-bold text-success">{sensorSummary.active}</p>
                      <p className="text-xs text-muted-foreground mt-1">Active</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-warning/10 border border-warning/20">
                      <p className="text-3xl font-bold text-warning">{sensorSummary.total - sensorSummary.active}</p>
                      <p className="text-xs text-muted-foreground mt-1">Disabled</p>
                    </div>
                  </div>
                  
                  {/* Sensor Types Breakdown */}
                  <div className="pt-4 border-t border-border/30">
                    <p className="text-xs text-muted-foreground mb-3">Sensor Types (click to view details)</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(
                        sensorItems.reduce((acc, s) => {
                          acc[s.type] = (acc[s.type] || 0) + 1;
                          return acc;
                        }, {} as Record<string, number>)
                      ).map(([type, count]) => (
                        <button
                          key={type} 
                          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border/50 hover:border-primary/50 transition-colors cursor-pointer"
                          style={{ backgroundColor: `${getSensorColor(type)}15` }}
                          onClick={() => setActiveTab(`sensor-${type}`)}
                        >
                          <span style={{ color: getSensorColor(type) }}>{getSensorIcon(type)}</span>
                          <span className="text-sm font-medium capitalize">{type.replace(/_/g, ' ')}</span>
                          <Badge variant="secondary" className="text-xs">{count}</Badge>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Latest Batch Summary */}
                {latestBatch && (
                  <div className="glass-card rounded-xl p-5 border border-border/50">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <FileJson className="w-5 h-5 text-cyan-400" />
                        <h3 className="font-semibold">Latest Batch</h3>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setActiveTab("raw-batch")}>
                        View Raw Data
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Timestamp</p>
                        <p className="text-sm flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(latestBatch.timestamp)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Readings</p>
                        <p className="text-sm font-semibold">{latestBatch.reading_count}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Device Types</p>
                        <p className="text-sm">{latestBatch.device_types?.length || 0}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Size</p>
                        <p className="text-sm font-mono">
                          {latestBatch.file_size_bytes 
                            ? `${(latestBatch.file_size_bytes / 1024).toFixed(1)} KB` 
                            : '—'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* System Metrics */}
                {system && Object.keys(system).length > 0 && (
                  <div className="glass-card rounded-xl p-5 border border-border/50">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-primary" />
                      System Metrics
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {system.cpu_percent !== undefined && (
                        <div className="text-center p-3 rounded-lg bg-muted/30">
                          <p className="text-2xl font-bold text-orange-400">{system.cpu_percent.toFixed(1)}%</p>
                          <p className="text-xs text-muted-foreground">CPU</p>
                        </div>
                      )}
                      {system.memory_percent !== undefined && (
                        <div className="text-center p-3 rounded-lg bg-muted/30">
                          <p className="text-2xl font-bold text-blue-400">{system.memory_percent.toFixed(1)}%</p>
                          <p className="text-xs text-muted-foreground">Memory</p>
                        </div>
                      )}
                      {system.disk_percent !== undefined && (
                        <div className="text-center p-3 rounded-lg bg-muted/30">
                          <p className="text-2xl font-bold text-purple-400">{system.disk_percent.toFixed(1)}%</p>
                          <p className="text-xs text-muted-foreground">Disk</p>
                        </div>
                      )}
                      {system.uptime_seconds !== undefined && (
                        <div className="text-center p-3 rounded-lg bg-muted/30">
                          <p className="text-2xl font-bold text-green-400">
                            {Math.floor(system.uptime_seconds / 3600)}h
                          </p>
                          <p className="text-xs text-muted-foreground">Uptime</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Device Info Tab */}
            <TabsContent value="info" className="m-0">
              <div className="space-y-4">
                <div className="glass-card rounded-xl p-5 border border-border/50">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Server className="w-4 h-4 text-primary" />
                    Device Details
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Client ID</p>
                      <p className="font-mono text-sm">{client.client_id}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">MAC Address</p>
                      <p className="font-mono text-sm">{client.mac_address}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">IP Address</p>
                      <p className="font-mono text-sm">{client.ip_address}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Status</p>
                      <Badge className="bg-success/20 text-success border-success/30">
                        {client.status || client.state || 'Active'}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Last Seen</p>
                      <p className="text-sm flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(client.last_seen)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">First Seen</p>
                      <p className="text-sm">{formatDate(client.first_seen)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Adopted At</p>
                      <p className="text-sm">{formatDate(client.adopted_at)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Batches Received</p>
                      <p className="text-sm font-semibold">{(client.batches_received ?? client.batch_count ?? 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Auto Registered</p>
                      <p className="text-sm">{client.auto_registered ? 'Yes' : 'No'}</p>
                    </div>
                    {(client as any).location && (
                      <>
                        <div>
                          <p className="text-xs text-muted-foreground">Location</p>
                          <p className="text-sm">
                            {[(client as any).location.city, (client as any).location.region, (client as any).location.country]
                              .filter(Boolean)
                              .join(', ') || '—'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">ISP</p>
                          <p className="text-sm">{(client as any).location.isp || '—'}</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Sensor Config Summary */}
                <div className="glass-card rounded-xl p-5 border border-border/50">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-primary" />
                    Configured Sensors
                  </h3>
                  {sensorItems.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {sensorItems.map((sensor) => (
                        <div 
                          key={sensor.id}
                          className="flex items-center gap-3 p-3 rounded-lg border border-border/50"
                          style={{ backgroundColor: `${getSensorColor(sensor.type)}10` }}
                        >
                          <span style={{ color: getSensorColor(sensor.type) }}>
                            {getSensorIcon(sensor.type)}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{sensor.id}</p>
                            <p className="text-xs text-muted-foreground capitalize">{sensor.type.replace(/_/g, ' ')}</p>
                          </div>
                          <Badge 
                            variant="outline" 
                            className={sensor.config?.enabled !== false 
                              ? 'bg-success/20 text-success border-success/30' 
                              : 'bg-muted text-muted-foreground'
                            }
                          >
                            {sensor.config?.enabled !== false ? (
                              <><CheckCircle className="w-3 h-3 mr-1" />Active</>
                            ) : (
                              <><XCircle className="w-3 h-3 mr-1" />Disabled</>
                            )}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Cpu className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p>No sensors configured</p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Sensor Type Tabs */}
            {uniqueSensorTypes.map((type) => (
              <TabsContent key={type} value={`sensor-${type}`} className="m-0">
                <SensorTabContent 
                  sensorType={type} 
                  clientId={client.client_id} 
                  batchReadings={batchReadingsData?.readings || []}
                  isLoading={readingsLoading}
                />
              </TabsContent>
            ))}

            {/* Raw Batch Tab */}
            <TabsContent value="raw-batch" className="m-0">
              <ClientRawBatchTab 
                batch={latestBatch} 
                readings={batchReadingsData?.readings || null}
                isLoading={batchesLoading || readingsLoading}
              />
            </TabsContent>

            {/* Config Tab */}
            <TabsContent value="config" className="m-0">
              <div className="glass-card rounded-xl p-5 border border-border/50">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Settings className="w-4 h-4 text-primary" />
                  Configuration
                </h3>
                {config ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Project Name</p>
                        <p className="font-semibold">{config.project?.name || 'AuroraSENSE'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Version</p>
                        <p className="text-sm">{config.project?.version || '—'}</p>
                      </div>
                    </div>
                    <div className="pt-3 border-t border-border/30">
                      <p className="text-xs text-muted-foreground mb-2">Raw Configuration</p>
                      <pre className="text-xs bg-muted/30 p-3 rounded-lg overflow-auto max-h-64">
                        {JSON.stringify(config, null, 2)}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No configuration available</p>
                )}
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

// Separate component for sensor tab content to handle per-sensor-type data fetching
interface SensorTabContentProps {
  sensorType: string;
  clientId: string;
  batchReadings: Array<{ device_id: string; device_type: string; timestamp: string; data: Record<string, unknown> }>;
  isLoading: boolean;
}

function SensorTabContent({ sensorType, clientId, batchReadings, isLoading }: SensorTabContentProps) {
  // Get readings from API for this sensor type
  const { data: apiReadings, isLoading: apiLoading } = useSensorReadings(sensorType, 24);
  
  // Filter readings for this client and sensor type
  const filteredReadings = useMemo(() => {
    // First try batch readings (most recent)
    const fromBatch = batchReadings.filter(r => 
      r.device_type === sensorType || 
      r.device_type?.includes(sensorType) ||
      sensorType.includes(r.device_type || '')
    );
    
    // Also get from API readings if available
    const apiReadingsList = Array.isArray(apiReadings) ? apiReadings : (apiReadings?.readings || []);
    const fromApi = apiReadingsList.filter((r: { client_id?: string }) => 
      !r.client_id || r.client_id === clientId || r.client_id === 'unknown'
    );
    
    // Combine and dedupe by timestamp
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

export default DeviceDetailDialog;
