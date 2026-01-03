import { useState, useEffect } from "react";
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
  ChevronDown,
  ChevronUp,
  Eye,
  Database,
  RefreshCw,
  Loader2
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
import { Client, useClientSystemInfo } from "@/hooks/useAuroraApi";
import { formatDateTime } from "@/utils/dateUtils";

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
  const iconClass = "w-5 h-5";
  switch (sensorType) {
    case 'arduino': return <Cpu className={iconClass} />;
    case 'lora': return <Radio className={iconClass} />;
    case 'starlink': return <Satellite className={iconClass} />;
    case 'wifi': return <Wifi className={iconClass} />;
    case 'bluetooth': return <Bluetooth className={iconClass} />;
    case 'adsb': return <Plane className={iconClass} />;
    case 'gps': return <Navigation className={iconClass} />;
    case 'thermal': return <Thermometer className={iconClass} />;
    case 'system': return <Monitor className={iconClass} />;
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
    case 'thermal': return '#f59e0b';
    case 'system': return '#64748b';
    default: return '#8b5cf6';
  }
};

const formatValue = (key: string, value: unknown): string => {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') {
    if (key.includes('frequency')) return `${(value / 1000000).toFixed(2)} MHz`;
    if (key.includes('seconds') || key.includes('interval') || key.includes('timeout')) return `${value}s`;
    if (key.includes('bytes')) return `${(value / 1024 / 1024).toFixed(2)} MB`;
    if (key.includes('percent')) return `${value.toFixed(1)}%`;
    return value.toString();
  }
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const formatLabel = (key: string): string => {
  return key
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
};

interface SensorCardProps {
  sensorId: string;
  config: SensorConfig | null;
  type: string;
  onViewAll: () => void;
  isExpanded: boolean;
}

const SensorCard = ({ sensorId, config, type, onViewAll, isExpanded }: SensorCardProps) => {
  const color = getSensorColor(type);
  const enabled = config?.enabled ?? true;

  // Get summary metrics (first 4 important values)
  const getSummaryMetrics = () => {
    if (!config) return [];
    const metrics: { label: string; value: string }[] = [];
    
    const priorityKeys = [
      'frequency', 'gain', 'sample_rate', 'interface', 'serial_port', 
      'baud_rate', 'scan_interval', 'host', 'port', 'coverage_radius_km',
      'sdr_type', 'rssi_threshold', 'refresh_interval', 'max_range_km'
    ];

    for (const key of priorityKeys) {
      if (key in config && config[key] !== undefined && config[key] !== null) {
        metrics.push({ label: formatLabel(key), value: formatValue(key, config[key]) });
        if (metrics.length >= 4) break;
      }
    }

    return metrics;
  };

  // Get all properties (excluding common ones for the detailed view)
  const getAllProperties = () => {
    if (!config) return [];
    const properties: { key: string; label: string; value: string }[] = [];
    
    const excludeKeys = ['device_id', 'enabled'];
    
    Object.entries(config).forEach(([key, value]) => {
      if (!excludeKeys.includes(key) && value !== undefined && value !== null) {
        properties.push({
          key,
          label: formatLabel(key),
          value: formatValue(key, value)
        });
      }
    });

    return properties.sort((a, b) => a.label.localeCompare(b.label));
  };

  const summaryMetrics = getSummaryMetrics();
  const allProperties = getAllProperties();

  return (
    <div className="glass-card rounded-xl p-4 border border-border/50 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${color}20` }}
          >
            <span style={{ color }}>{getSensorIcon(type)}</span>
          </div>
          <div>
            <h4 className="font-semibold text-sm">{sensorId.replace(/_/g, ' ')}</h4>
            <p className="text-xs text-muted-foreground capitalize">{type} Sensor</p>
          </div>
        </div>
        <Badge 
          variant="outline" 
          className={enabled ? 'bg-success/20 text-success border-success/30' : 'bg-muted text-muted-foreground'}
        >
          {enabled ? <CheckCircle className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
          {enabled ? 'Active' : 'Disabled'}
        </Badge>
      </div>

      {/* Summary Metrics */}
      {summaryMetrics.length > 0 && (
        <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-border/30">
          {summaryMetrics.map((metric, idx) => (
            <div key={idx} className="text-xs">
              <span className="text-muted-foreground">{metric.label}: </span>
              <span className="font-medium">{metric.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Expand/Collapse Button */}
      {allProperties.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border/30">
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full text-xs gap-2"
            onClick={onViewAll}
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-3 h-3" />
                Hide Details
              </>
            ) : (
              <>
                <Eye className="w-3 h-3" />
                View All Data ({allProperties.length} properties)
              </>
            )}
          </Button>

          {/* Expanded Details */}
          {isExpanded && (
            <div className="mt-3 p-3 rounded-lg bg-muted/30 max-h-64 overflow-y-auto">
              <div className="grid grid-cols-1 gap-2">
                {allProperties.map((prop) => (
                  <div 
                    key={prop.key} 
                    className="flex justify-between items-start py-1 border-b border-border/20 last:border-0"
                  >
                    <span className="text-xs text-muted-foreground">{prop.label}</span>
                    <span className="text-xs font-mono text-right max-w-[60%] break-all">
                      {prop.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
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
  const [expandedSensors, setExpandedSensors] = useState<Set<string>>(new Set());
  const [pollingEnabled, setPollingEnabled] = useState(true);
  
  // Real-time polling for system info
  const { data: liveSystemInfo, isLoading: systemLoading, refetch: refetchSystem } = useClientSystemInfo(
    client?.client_id || ""
  );

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

  // Toggle sensor expansion
  const toggleSensorExpanded = (sensorId: string) => {
    setExpandedSensors(prev => {
      const next = new Set(prev);
      if (next.has(sensorId)) {
        next.delete(sensorId);
      } else {
        next.add(sensorId);
      }
      return next;
    });
  };

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

  // Calculate sensor data summary
  const sensorSummary = {
    total: sensorItems.length,
    active: sensorItems.filter(s => s.config?.enabled !== false).length,
    types: [...new Set(sensorItems.map(s => s.type))].length,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
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
              {systemLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetchSystem()}
                className="gap-1"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </Button>
              <Badge variant={pollingEnabled ? "default" : "secondary"} className="cursor-pointer" onClick={() => setPollingEnabled(!pollingEnabled)}>
                {pollingEnabled ? "Live" : "Paused"}
              </Badge>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="sensors" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="sensors" className="gap-2">
              <Activity className="w-4 h-4" />
              Sensors ({sensorSummary.total})
            </TabsTrigger>
            <TabsTrigger value="info" className="gap-2">
              <Server className="w-4 h-4" />
              Device Info
            </TabsTrigger>
            <TabsTrigger value="config" className="gap-2">
              <Settings className="w-4 h-4" />
              Configuration
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-4">
            <TabsContent value="sensors" className="m-0">
              {/* Sensor Data Summary Page */}
              {sensorItems.length > 0 && (
                <div className="space-y-4 mb-6">
                  {/* Overview Card */}
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
                      <p className="text-xs text-muted-foreground mb-3">Sensor Types</p>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(
                          sensorItems.reduce((acc, s) => {
                            acc[s.type] = (acc[s.type] || 0) + 1;
                            return acc;
                          }, {} as Record<string, number>)
                        ).map(([type, count]) => (
                          <div 
                            key={type} 
                            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border/50"
                            style={{ backgroundColor: `${getSensorColor(type)}15` }}
                          >
                            <span style={{ color: getSensorColor(type) }}>{getSensorIcon(type)}</span>
                            <span className="text-sm font-medium capitalize">{type}</span>
                            <Badge variant="secondary" className="text-xs">{count}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Key Metrics Card */}
                  <div className="glass-card rounded-xl p-5 border border-border/50">
                    <div className="flex items-center gap-2 mb-4">
                      <Activity className="w-5 h-5 text-cyan-400" />
                      <h3 className="font-semibold">Key Sensor Data</h3>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {sensorItems.slice(0, 4).map((sensor) => {
                        const metrics = sensor.config ? 
                          Object.entries(sensor.config)
                            .filter(([k, v]) => !['device_id', 'enabled'].includes(k) && v !== undefined && v !== null)
                            .slice(0, 2) : [];
                        return (
                          <div 
                            key={sensor.id} 
                            className="p-3 rounded-lg bg-muted/30 border border-border/30"
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <span style={{ color: getSensorColor(sensor.type) }}>{getSensorIcon(sensor.type)}</span>
                              <span className="text-xs font-medium truncate capitalize">{sensor.type}</span>
                            </div>
                            {metrics.map(([key, value]) => (
                              <div key={key} className="text-xs">
                                <span className="text-muted-foreground">{formatLabel(key)}: </span>
                                <span className="font-mono">{formatValue(key, value)}</span>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Sensor Cards */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-muted-foreground mb-3">All Sensors</h4>
              </div>
              {sensorItems.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {sensorItems.map((sensor) => (
                    <SensorCard 
                      key={sensor.id} 
                      sensorId={sensor.id} 
                      config={sensor.config}
                      type={sensor.type}
                      onViewAll={() => toggleSensorExpanded(sensor.id)}
                      isExpanded={expandedSensors.has(sensor.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Cpu className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No sensors configured for this device</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="info" className="m-0">
              <div className="space-y-4">
                {/* Device Details */}
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
                        {client.status || 'Active'}
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
                      <p className="text-xs text-muted-foreground">Adopted At</p>
                      <p className="text-sm">{formatDate(client.adopted_at)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Batches Received</p>
                      <p className="text-sm font-semibold">{(client.batches_received ?? 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Auto Registered</p>
                      <p className="text-sm">{client.auto_registered ? 'Yes' : 'No'}</p>
                    </div>
                  </div>
                </div>

                {/* System Metrics */}
                {system && (
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
                        <p className="font-semibold">{config.project?.name || 'AURORASENSE'}</p>
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

export default DeviceDetailDialog;
