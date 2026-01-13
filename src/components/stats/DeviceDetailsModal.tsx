import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Activity,
  Clock,
  MapPin,
  Cpu,
  Thermometer,
  Zap,
  Signal,
  Satellite,
  Radio,
  Wifi,
  Navigation,
} from "lucide-react";
import DeviceMetricsCharts from "./DeviceMetricsCharts";

interface SensorReading {
  device_id: string;
  device_type: string;
  client_id?: string;
  timestamp: string;
  data?: Record<string, unknown>;
  latitude?: number;
  longitude?: number;
}

interface DeviceGroup {
  device_id: string;
  device_type: string;
  client_id: string;
  readings: SensorReading[];
  latest: SensorReading;
  location?: { lat: number; lng: number };
}

interface DeviceDetailsModalProps {
  device: DeviceGroup | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getDeviceIcon(type: string) {
  const iconClass = "w-5 h-5";
  switch (type.toLowerCase()) {
    case 'starlink':
      return <Satellite className={iconClass} />;
    case 'gps':
      return <Navigation className={iconClass} />;
    case 'temperature':
    case 'thermal':
      return <Thermometer className={iconClass} />;
    case 'power':
      return <Zap className={iconClass} />;
    case 'wifi':
    case 'bluetooth':
      return <Wifi className={iconClass} />;
    case 'radio':
    case 'lora':
      return <Radio className={iconClass} />;
    default:
      return <Activity className={iconClass} />;
  }
}

function getDeviceColor(type: string) {
  switch (type.toLowerCase()) {
    case 'starlink':
      return 'bg-violet-500/20 text-violet-400';
    case 'gps':
      return 'bg-blue-500/20 text-blue-400';
    case 'temperature':
    case 'thermal':
      return 'bg-orange-500/20 text-orange-400';
    case 'power':
      return 'bg-yellow-500/20 text-yellow-400';
    case 'wifi':
    case 'bluetooth':
      return 'bg-cyan-500/20 text-cyan-400';
    case 'radio':
    case 'lora':
      return 'bg-green-500/20 text-green-400';
    default:
      return 'bg-primary/20 text-primary';
  }
}

function formatValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return 'N/A';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') {
    if (key.includes('temp') || key.includes('temperature')) return `${value.toFixed(1)}°`;
    if (key.includes('power') || key.includes('watt')) return `${value.toFixed(1)} W`;
    if (key.includes('voltage')) return `${value.toFixed(2)} V`;
    if (key.includes('current')) return `${value.toFixed(2)} A`;
    if (key.includes('humidity')) return `${value.toFixed(1)}%`;
    if (key.includes('signal') || key.includes('rssi') || key.includes('dbm')) return `${value.toFixed(1)} dBm`;
    if (key.includes('speed') || key.includes('throughput')) {
      if (value > 1e6) return `${(value / 1e6).toFixed(2)} Mbps`;
      if (value > 1e3) return `${(value / 1e3).toFixed(2)} Kbps`;
      return `${value.toFixed(0)} bps`;
    }
    if (key.includes('latency') || key.includes('ping')) return `${value.toFixed(0)} ms`;
    if (key.includes('lat') || key.includes('lon')) return value.toFixed(6);
    return value.toFixed(2);
  }
  return String(value);
}

function formatKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

export default function DeviceDetailsModal({ device, open, onOpenChange }: DeviceDetailsModalProps) {
  if (!device) return null;

  const dataEntries = device.latest.data 
    ? Object.entries(device.latest.data).filter(([k, v]) => 
        v !== null && v !== undefined && !['device_id', 'client_id', 'timestamp'].includes(k)
      )
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${getDeviceColor(device.device_type)}`}>
              {getDeviceIcon(device.device_type)}
            </div>
            <div>
              <span className="text-lg">{device.device_id}</span>
              <p className="text-sm text-muted-foreground font-normal capitalize">
                {device.device_type.replace(/_/g, ' ')}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(85vh-120px)]">
          <div className="space-y-4 pr-4">
            {/* Basic Info */}
            <Card className="glass-card border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Cpu className="w-4 h-4" />
                  Device Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Device ID</p>
                    <p className="font-mono text-sm">{device.device_id}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Client</p>
                    <Badge variant="outline">{device.client_id}</Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Device Type</p>
                    <p className="text-sm capitalize">{device.device_type.replace(/_/g, ' ')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Readings</p>
                    <p className="text-sm">{device.readings.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Last Update */}
            <Card className="glass-card border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Last Reading
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Timestamp</p>
                    <p className="font-mono text-sm">
                      {format(new Date(device.latest.timestamp), 'PPpp')}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {format(new Date(device.latest.timestamp), 'HH:mm:ss')}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Location */}
            {device.location && (
              <Card className="glass-card border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Location
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Latitude</p>
                      <p className="font-mono text-sm">{device.location.lat.toFixed(6)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Longitude</p>
                      <p className="font-mono text-sm">{device.location.lng.toFixed(6)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Sensor Data */}
            {dataEntries.length > 0 && (
              <Card className="glass-card border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Signal className="w-4 h-4" />
                    Sensor Readings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {dataEntries.map(([key, value]) => (
                      <div key={key} className="p-2 rounded-lg bg-muted/30">
                        <p className="text-xs text-muted-foreground truncate">
                          {formatKey(key)}
                        </p>
                        <p className="font-mono text-sm truncate">
                          {formatValue(key, value)}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Metrics Charts */}
            <DeviceMetricsCharts readings={device.readings} deviceType={device.device_type} />

            {/* Recent Readings History */}
            {device.readings.length > 1 && (
              <Card className="glass-card border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Recent Readings ({Math.min(device.readings.length, 10)})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {device.readings.slice(0, 10).map((reading, idx) => (
                      <div 
                        key={`${reading.timestamp}-${idx}`}
                        className="flex items-center justify-between p-2 rounded-lg bg-muted/20 text-sm"
                      >
                        <span className="font-mono text-xs text-muted-foreground">
                          {format(new Date(reading.timestamp), 'HH:mm:ss')}
                        </span>
                        <div className="flex gap-2 flex-wrap justify-end">
                          {reading.data && Object.entries(reading.data).slice(0, 3).map(([k, v]) => (
                            <Badge key={k} variant="outline" className="text-xs">
                              {formatKey(k)}: {formatValue(k, v)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}