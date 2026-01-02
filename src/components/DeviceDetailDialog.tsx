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
  Activity
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Client } from "@/hooks/useAuroraApi";

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

const SensorCard = ({ sensorId, config, type }: { sensorId: string; config: SensorConfig | null; type: string }) => {
  const color = getSensorColor(type);
  const enabled = config?.enabled ?? true;

  const getConfigDetails = () => {
    if (!config) return [];
    const details: { label: string; value: string }[] = [];
    
    // Common fields to display
    if ('frequency' in config && config.frequency) {
      const freq = config.frequency as number;
      details.push({ label: 'Frequency', value: `${(freq / 1000000).toFixed(1)} MHz` });
    }
    if ('gain' in config) details.push({ label: 'Gain', value: `${config.gain}` });
    if ('sample_rate' in config) details.push({ label: 'Sample Rate', value: `${config.sample_rate}` });
    if ('interface' in config) details.push({ label: 'Interface', value: `${config.interface}` });
    if ('serial_port' in config) details.push({ label: 'Serial Port', value: `${config.serial_port}` });
    if ('baud_rate' in config) details.push({ label: 'Baud Rate', value: `${config.baud_rate}` });
    if ('scan_interval' in config) details.push({ label: 'Scan Interval', value: `${config.scan_interval}s` });
    if ('host' in config) details.push({ label: 'Host', value: `${config.host}` });
    if ('port' in config) details.push({ label: 'Port', value: `${config.port}` });
    if ('coverage_radius_km' in config) details.push({ label: 'Coverage', value: `${config.coverage_radius_km} km` });
    if ('sdr_type' in config) details.push({ label: 'SDR Type', value: `${config.sdr_type}` });
    if ('rssi_threshold' in config) details.push({ label: 'RSSI Threshold', value: `${config.rssi_threshold} dBm` });

    return details.slice(0, 6); // Limit to 6 details
  };

  const details = getConfigDetails();

  return (
    <div className="glass-card rounded-xl p-4 border border-border/50">
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

      {details.length > 0 && (
        <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-border/30">
          {details.map((detail, idx) => (
            <div key={idx} className="text-xs">
              <span className="text-muted-foreground">{detail.label}: </span>
              <span className="font-medium">{detail.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString();
};

const DeviceDetailDialog = ({ client, open, onOpenChange }: DeviceDetailDialogProps) => {
  if (!client) return null;

  const config = client.metadata?.config;
  const sensors = config?.sensors || {};
  const system = client.metadata?.system;

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
              <Server className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <span className="text-xl">{client.hostname || client.client_id}</span>
              <p className="text-sm text-muted-foreground font-normal">{client.ip_address}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="sensors" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="sensors" className="gap-2">
              <Activity className="w-4 h-4" />
              Sensors
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

          <div className="flex-1 overflow-y-auto mt-4">
            <TabsContent value="sensors" className="m-0">
              {sensorItems.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {sensorItems.map((sensor) => (
                    <SensorCard 
                      key={sensor.id} 
                      sensorId={sensor.id} 
                      config={sensor.config}
                      type={sensor.type}
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
                      <p className="text-sm font-semibold">{client.batches_received.toLocaleString()}</p>
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
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default DeviceDetailDialog;
