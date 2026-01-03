import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Client, useClients, useClientSystemInfo } from "@/hooks/useAuroraApi";
import {
  ArrowLeftRight,
  Cpu,
  HardDrive,
  Monitor,
  Server,
  Activity,
  Clock,
  Database,
  Wifi,
  Radio,
  Satellite,
  Thermometer,
  Plane,
  Navigation,
  Bluetooth,
  CheckCircle,
  XCircle,
} from "lucide-react";

interface DeviceComparisonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDevice?: Client | null;
}

const getSensorIcon = (type: string) => {
  const iconClass = "w-4 h-4";
  switch (type) {
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

const getSensorColor = (type: string) => {
  switch (type) {
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

const formatUptime = (seconds: number) => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
};

const getStatusColor = (percent: number) => {
  if (percent > 90) return "text-red-500";
  if (percent > 75) return "text-yellow-500";
  return "text-green-500";
};

interface MetricComparisonProps {
  label: string;
  icon: React.ReactNode;
  value1?: number;
  value2?: number;
  unit?: string;
  isPercentage?: boolean;
}

const MetricComparison = ({ label, icon, value1, value2, unit = "%", isPercentage = true }: MetricComparisonProps) => {
  const diff = value1 !== undefined && value2 !== undefined ? value1 - value2 : null;
  
  return (
    <div className="grid grid-cols-3 gap-4 items-center py-3 border-b border-border/30 last:border-0">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="text-center">
        {value1 !== undefined ? (
          <div>
            <span className={`text-lg font-bold ${isPercentage ? getStatusColor(value1) : ''}`}>
              {isPercentage ? value1.toFixed(1) : value1.toLocaleString()}
            </span>
            <span className="text-sm text-muted-foreground ml-1">{unit}</span>
            {isPercentage && <Progress value={value1} className="h-1.5 mt-1" />}
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </div>
      <div className="text-center">
        {value2 !== undefined ? (
          <div>
            <span className={`text-lg font-bold ${isPercentage ? getStatusColor(value2) : ''}`}>
              {isPercentage ? value2.toFixed(1) : value2.toLocaleString()}
            </span>
            <span className="text-sm text-muted-foreground ml-1">{unit}</span>
            {isPercentage && <Progress value={value2} className="h-1.5 mt-1" />}
            {diff !== null && (
              <span className={`text-xs ml-2 ${diff > 0 ? 'text-red-400' : diff < 0 ? 'text-green-400' : 'text-muted-foreground'}`}>
                ({diff > 0 ? '+' : ''}{isPercentage ? diff.toFixed(1) : diff.toLocaleString()})
              </span>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </div>
    </div>
  );
};

const getSensorList = (client: Client | null) => {
  if (!client?.metadata?.config?.sensors) return [];
  
  const sensors = client.metadata.config.sensors;
  const sensorItems: { id: string; type: string; enabled: boolean }[] = [];

  if (sensors.arduino_devices) {
    sensors.arduino_devices.forEach((device) => {
      sensorItems.push({ id: device.device_id, type: 'arduino', enabled: device.enabled });
    });
  }

  if (sensors.adsb_devices) {
    sensors.adsb_devices.forEach((device) => {
      sensorItems.push({ id: device.device_id, type: 'adsb', enabled: device.enabled });
    });
  }

  const singleSensors = ['lora', 'starlink', 'wifi', 'bluetooth', 'gps', 'thermal_probe', 'system_monitor'] as const;
  singleSensors.forEach((key) => {
    const sensor = sensors[key as keyof typeof sensors];
    if (sensor && 'device_id' in sensor) {
      const type = key.replace('_probe', '').replace('_monitor', '');
      sensorItems.push({ id: sensor.device_id, type, enabled: sensor.enabled });
    }
  });

  return sensorItems;
};

interface SystemMetrics {
  cpu_percent?: number;
  memory_percent?: number;
  disk_percent?: number;
  uptime_seconds?: number;
}

const DeviceComparisonDialog = ({ open, onOpenChange, initialDevice }: DeviceComparisonDialogProps) => {
  const { data: clients = [] } = useClients();
  const [device1Id, setDevice1Id] = useState<string>(initialDevice?.client_id || "");
  const [device2Id, setDevice2Id] = useState<string>("");

  const device1 = useMemo(() => clients.find(c => c.client_id === device1Id) || null, [clients, device1Id]);
  const device2 = useMemo(() => clients.find(c => c.client_id === device2Id) || null, [clients, device2Id]);

  const { data: system1Raw } = useClientSystemInfo(device1Id);
  const { data: system2Raw } = useClientSystemInfo(device2Id);

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

  const systemInfo1 = extractMetrics(system1Raw, device1?.metadata?.system);
  const systemInfo2 = extractMetrics(system2Raw, device2?.metadata?.system);

  const sensors1 = getSensorList(device1);
  const sensors2 = getSensorList(device2);

  const allSensorTypes = useMemo(() => {
    const types = new Set<string>();
    sensors1.forEach(s => types.add(s.type));
    sensors2.forEach(s => types.add(s.type));
    return Array.from(types).sort();
  }, [sensors1, sensors2]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-primary" />
            Device Comparison
          </DialogTitle>
        </DialogHeader>

        {/* Device Selectors */}
        <div className="grid grid-cols-2 gap-4 py-4 border-b border-border">
          <div className="space-y-2">
            <label className="text-sm font-medium">Device 1</label>
            <Select value={device1Id} onValueChange={setDevice1Id}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select device..." />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                {clients.map((client) => (
                  <SelectItem key={client.client_id} value={client.client_id} disabled={client.client_id === device2Id}>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${client.status === 'online' ? 'bg-green-500' : client.status === 'stale' ? 'bg-yellow-500' : 'bg-muted'}`} />
                      {client.hostname}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Device 2</label>
            <Select value={device2Id} onValueChange={setDevice2Id}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select device..." />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                {clients.map((client) => (
                  <SelectItem key={client.client_id} value={client.client_id} disabled={client.client_id === device1Id}>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${client.status === 'online' ? 'bg-green-500' : client.status === 'stale' ? 'bg-yellow-500' : 'bg-muted'}`} />
                      {client.hostname}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <ScrollArea className="flex-1">
          {device1 && device2 ? (
            <div className="space-y-6 p-1">
              {/* Device Headers */}
              <div className="grid grid-cols-3 gap-4 items-center pb-4 border-b border-border">
                <div className="text-sm font-medium text-muted-foreground">Metric</div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Server className="w-4 h-4 text-cyan-400" />
                    <span className="font-semibold">{device1.hostname}</span>
                  </div>
                  <Badge variant={device1.status === 'online' ? 'default' : 'secondary'} className="mt-1">
                    {device1.status}
                  </Badge>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Server className="w-4 h-4 text-purple-400" />
                    <span className="font-semibold">{device2.hostname}</span>
                  </div>
                  <Badge variant={device2.status === 'online' ? 'default' : 'secondary'} className="mt-1">
                    {device2.status}
                  </Badge>
                </div>
              </div>

              {/* System Metrics */}
              <div className="space-y-1">
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                  <Activity className="w-4 h-4 text-primary" />
                  System Metrics
                </h3>
                <MetricComparison
                  label="CPU Usage"
                  icon={<Cpu className="w-4 h-4 text-orange-400" />}
                  value1={systemInfo1?.cpu_percent}
                  value2={systemInfo2?.cpu_percent}
                />
                <MetricComparison
                  label="Memory Usage"
                  icon={<Monitor className="w-4 h-4 text-blue-400" />}
                  value1={systemInfo1?.memory_percent}
                  value2={systemInfo2?.memory_percent}
                />
                <MetricComparison
                  label="Disk Usage"
                  icon={<HardDrive className="w-4 h-4 text-purple-400" />}
                  value1={systemInfo1?.disk_percent}
                  value2={systemInfo2?.disk_percent}
                />
              </div>

              {/* Connection Stats */}
              <div className="space-y-1">
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                  <Database className="w-4 h-4 text-primary" />
                  Connection Stats
                </h3>
                <MetricComparison
                  label="Batches Received"
                  icon={<Database className="w-4 h-4 text-cyan-400" />}
                  value1={device1.batches_received}
                  value2={device2.batches_received}
                  unit=""
                  isPercentage={false}
                />
                <div className="grid grid-cols-3 gap-4 items-center py-3 border-b border-border/30">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm font-medium">Uptime</span>
                  </div>
                  <div className="text-center">
                    <span className="text-lg font-bold text-green-400">
                      {systemInfo1?.uptime_seconds ? formatUptime(systemInfo1.uptime_seconds) : '—'}
                    </span>
                  </div>
                  <div className="text-center">
                    <span className="text-lg font-bold text-green-400">
                      {systemInfo2?.uptime_seconds ? formatUptime(systemInfo2.uptime_seconds) : '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Sensor Comparison */}
              <div className="space-y-1">
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                  <Activity className="w-4 h-4 text-primary" />
                  Sensor Comparison
                </h3>
                <div className="grid grid-cols-3 gap-4 items-center py-3 border-b border-border/30">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Total Sensors</span>
                  </div>
                  <div className="text-center">
                    <span className="text-lg font-bold">{sensors1.length}</span>
                  </div>
                  <div className="text-center">
                    <span className="text-lg font-bold">{sensors2.length}</span>
                  </div>
                </div>
                {allSensorTypes.map((type) => {
                  const s1 = sensors1.filter(s => s.type === type);
                  const s2 = sensors2.filter(s => s.type === type);
                  const enabled1 = s1.filter(s => s.enabled).length;
                  const enabled2 = s2.filter(s => s.enabled).length;
                  
                  return (
                    <div key={type} className="grid grid-cols-3 gap-4 items-center py-2 border-b border-border/30 last:border-0">
                      <div className="flex items-center gap-2" style={{ color: getSensorColor(type) }}>
                        {getSensorIcon(type)}
                        <span className="text-sm font-medium capitalize">{type}</span>
                      </div>
                      <div className="text-center flex items-center justify-center gap-2">
                        {s1.length > 0 ? (
                          <>
                            <Badge variant="outline">{s1.length}</Badge>
                            {enabled1 === s1.length ? (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : (
                              <span className="text-xs text-muted-foreground">({enabled1} active)</span>
                            )}
                          </>
                        ) : (
                          <XCircle className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="text-center flex items-center justify-center gap-2">
                        {s2.length > 0 ? (
                          <>
                            <Badge variant="outline">{s2.length}</Badge>
                            {enabled2 === s2.length ? (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : (
                              <span className="text-xs text-muted-foreground">({enabled2} active)</span>
                            )}
                          </>
                        ) : (
                          <XCircle className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <ArrowLeftRight className="w-12 h-12 mb-4 opacity-50" />
              <p>Select two devices to compare</p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default DeviceComparisonDialog;
