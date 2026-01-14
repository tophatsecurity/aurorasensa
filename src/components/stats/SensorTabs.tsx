import { useMemo, useState } from "react";
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
  Activity,
  Loader2,
  AlertCircle,
  Zap,
  Signal,
  Clock,
  MapPin,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Gauge,
  Wind,
  Eye,
  FileJson,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import type { DeviceGroup } from "./types";
import {
  useClientStarlinkData,
  useClientAdsbData,
  useClientWifiData,
  useClientBluetoothData,
  useClientGpsData,
  useClientArduinoData,
  useClientThermalData,
  useClientLoraData,
} from "@/hooks/aurora";

interface SensorTabsProps {
  devices: DeviceGroup[];
  isLoading?: boolean;
  clientId?: string;
}

// Sensor type configuration
const SENSOR_TYPES = {
  starlink: { label: 'Starlink', icon: Satellite, color: '#8b5cf6', priority: 1 },
  system_monitor: { label: 'System', icon: Monitor, color: '#64748b', priority: 2 },
  wifi_scanner: { label: 'WiFi', icon: Wifi, color: '#3b82f6', priority: 3 },
  bluetooth_scanner: { label: 'Bluetooth', icon: Bluetooth, color: '#6366f1', priority: 4 },
  adsb_detector: { label: 'ADS-B', icon: Plane, color: '#06b6d4', priority: 5 },
  gps: { label: 'GPS', icon: Navigation, color: '#22c55e', priority: 6 },
  thermal_probe: { label: 'Thermal', icon: Thermometer, color: '#f59e0b', priority: 7 },
  arduino: { label: 'Arduino', icon: Cpu, color: '#f97316', priority: 8 },
  lora: { label: 'LoRa', icon: Radio, color: '#ef4444', priority: 9 },
} as const;

const getSensorConfig = (deviceType: string) => {
  const type = deviceType.toLowerCase();
  for (const [key, config] of Object.entries(SENSOR_TYPES)) {
    if (type.includes(key.replace('_', ''))) return config;
    if (type.includes(key)) return config;
  }
  if (type.includes('starlink')) return SENSOR_TYPES.starlink;
  if (type.includes('system') || type.includes('monitor')) return SENSOR_TYPES.system_monitor;
  if (type.includes('wifi')) return SENSOR_TYPES.wifi_scanner;
  if (type.includes('bluetooth') || type.includes('ble')) return SENSOR_TYPES.bluetooth_scanner;
  if (type.includes('adsb') || type.includes('aircraft')) return SENSOR_TYPES.adsb_detector;
  if (type.includes('gps') || type.includes('gnss')) return SENSOR_TYPES.gps;
  if (type.includes('thermal') || type.includes('temp') || type.includes('probe')) return SENSOR_TYPES.thermal_probe;
  if (type.includes('arduino')) return SENSOR_TYPES.arduino;
  if (type.includes('lora')) return SENSOR_TYPES.lora;
  return { label: deviceType.replace(/_/g, ' '), icon: Activity, color: '#8b5cf6', priority: 99 };
};

const formatValue = (key: string, value: unknown): string => {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') {
    const k = key.toLowerCase();
    if (k.includes('temp') && !k.includes('timestamp')) return `${value.toFixed(1)}°C`;
    if (k.includes('humidity')) return `${value.toFixed(1)}%`;
    if (k.includes('pressure') && value > 100) return `${value.toFixed(0)} hPa`;
    if (k.includes('power') || k.includes('watt')) return `${value.toFixed(1)}W`;
    if (k.includes('voltage')) return `${value.toFixed(2)}V`;
    if (k.includes('current') && !k.includes('aircraft')) return `${value.toFixed(2)}A`;
    if (k.includes('signal') || k.includes('rssi') || k.includes('dbm')) return `${value.toFixed(1)} dBm`;
    if (k.includes('percent') || k.includes('cpu') || k.includes('memory') || k.includes('disk') || k.includes('obstruction')) return `${value.toFixed(1)}%`;
    if (k.includes('throughput') || k.includes('bps')) {
      if (value > 1e9) return `${(value / 1e9).toFixed(2)} Gbps`;
      if (value > 1e6) return `${(value / 1e6).toFixed(2)} Mbps`;
      if (value > 1e3) return `${(value / 1e3).toFixed(2)} Kbps`;
      return `${value.toFixed(0)} bps`;
    }
    if (k.includes('latency') || k.includes('ping') || k.includes('rtt')) return `${value.toFixed(1)} ms`;
    if (k.includes('altitude') || k.includes('alt')) return `${value.toFixed(0)} m`;
    if (k.includes('speed') && !k.includes('throughput')) return `${value.toFixed(1)} m/s`;
    if (k.includes('uptime')) {
      const days = Math.floor(value / 86400);
      const hours = Math.floor((value % 86400) / 3600);
      if (days > 0) return `${days}d ${hours}h`;
      return `${hours}h ${Math.floor((value % 3600) / 60)}m`;
    }
    if (k.includes('snr')) return `${value.toFixed(1)} dB`;
    if (k.includes('count') || k.includes('total') || k.includes('active')) return value.toFixed(0);
    if (Number.isInteger(value)) return value.toString();
    return value.toFixed(2);
  }
  if (typeof value === 'object') {
    if (Array.isArray(value)) return `[${value.length} items]`;
    return JSON.stringify(value).slice(0, 50);
  }
  return String(value);
};

const formatLabel = (key: string): string => {
  return key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
};

const flattenData = (data: Record<string, unknown>, prefix = ''): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    const newKey = prefix ? `${prefix}_${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenData(value as Record<string, unknown>, newKey));
    } else {
      result[newKey] = value;
    }
  }
  return result;
};

const CHART_COLORS = ['#8b5cf6', '#f97316', '#22c55e', '#3b82f6', '#ef4444', '#06b6d4'];

// =============================================
// HELPER COMPONENTS
// =============================================
function MetricCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <Card className="p-3">
      <div className="flex items-center gap-2 mb-1">
        <span className={color}>{icon}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className={`font-mono text-lg font-semibold ${color}`}>{value}</p>
    </Card>
  );
}

function ResourceGauge({ label, value, color }: { label: string; value: number | undefined; color: string }) {
  const percent = value ?? 0;
  return (
    <Card className="p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="font-mono text-sm font-semibold">{percent.toFixed(1)}%</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(percent, 100)}%`, backgroundColor: color }} />
      </div>
    </Card>
  );
}

function RawDataCard({ data, title, latestReading }: { data: Record<string, unknown>; title: string; latestReading?: { timestamp: string; data: Record<string, unknown> } | null }) {
  const [isOpen, setIsOpen] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);
  
  // Use latest reading data if available, otherwise use the passed data
  const displayData = latestReading?.data || data;
  const entries = Object.entries(displayData).filter(([, v]) => v !== null && v !== undefined);
  
  if (entries.length === 0 && !latestReading) return null;
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between p-4 h-auto">
            <div className="flex items-center gap-2">
              <FileJson className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">{title}</span>
              {latestReading?.timestamp && (
                <Badge variant="secondary" className="text-[10px] ml-2">
                  {new Date(latestReading.timestamp).toLocaleString()}
                </Badge>
              )}
            </div>
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-3">
            {/* Toggle between formatted and raw JSON view */}
            <div className="flex justify-end">
              <Button 
                variant="outline" 
                size="sm" 
                className="text-xs h-7"
                onClick={() => setShowRawJson(!showRawJson)}
              >
                {showRawJson ? 'Formatted View' : 'Raw JSON'}
              </Button>
            </div>
            
            {showRawJson ? (
              <div className="bg-muted/50 rounded-lg p-3 overflow-auto max-h-[400px]">
                <pre className="text-xs font-mono whitespace-pre-wrap break-all">
                  {JSON.stringify(displayData, null, 2)}
                </pre>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {entries.map(([key, value]) => (
                  <div key={key} className="p-2 rounded bg-muted/30 text-xs">
                    <p className="text-muted-foreground truncate">{formatLabel(key)}</p>
                    <p className="font-mono truncate" title={typeof value === 'object' ? JSON.stringify(value) : String(value)}>
                      {typeof value === 'object' ? (
                        <span className="text-blue-400">{Array.isArray(value) ? `[${value.length} items]` : '{...}'}</span>
                      ) : (
                        formatValue(key, value)
                      )}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

// =============================================
// STARLINK PANEL
// =============================================
function StarlinkPanel({ device, clientId }: { device: DeviceGroup; clientId?: string }) {
  const { data: starlinkApiData, isLoading } = useClientStarlinkData(clientId || '');
  
  const latestReading = device.latest;
  const data = latestReading?.data as Record<string, unknown> || {};
  const starlinkData = (data.starlink as Record<string, unknown>) || data;
  const apiLatest = starlinkApiData?.latest?.data as Record<string, unknown> | undefined;
  const mergedData = apiLatest ? { ...starlinkData, ...apiLatest } : starlinkData;
  
  const uptime = mergedData.uptime_seconds as number | undefined;
  const downlink = mergedData.downlink_throughput_bps as number | undefined;
  const uplink = mergedData.uplink_throughput_bps as number | undefined;
  const latency = mergedData.pop_ping_latency_ms as number | undefined;
  const obstruction = mergedData.obstruction_percent as number | undefined;
  const snr = mergedData.snr as number | undefined;
  const power = mergedData.power_watts as number | undefined;
  const state = mergedData.state as string | undefined;
  const lat = mergedData.latitude as number | undefined;
  const lng = mergedData.longitude as number | undefined;
  
  const chartReadings = starlinkApiData?.readings || device.readings || [];
  const chartData = useMemo(() => {
    return chartReadings.slice(-30).map((r: any) => {
      const d = r.data as Record<string, unknown> || {};
      const sl = (d.starlink as Record<string, unknown>) || d;
      return {
        time: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        downlink: (sl.downlink_throughput_bps as number) ? (sl.downlink_throughput_bps as number) / 1e6 : null,
        uplink: (sl.uplink_throughput_bps as number) ? (sl.uplink_throughput_bps as number) / 1e6 : null,
        latency: sl.pop_ping_latency_ms as number,
      };
    }).filter(d => d.downlink !== null || d.latency !== null);
  }, [chartReadings]);
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center relative">
            <Satellite className="w-6 h-6 text-violet-400" />
            {isLoading && <Loader2 className="w-3 h-3 animate-spin absolute -top-1 -right-1" />}
          </div>
          <div>
            <h3 className="font-semibold text-lg">Starlink Dish</h3>
            <p className="text-sm text-muted-foreground font-mono">{device.device_id}</p>
          </div>
        </div>
        <Badge variant="outline" className={state === 'CONNECTED' ? 'bg-success/20 text-success border-success/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'}>
          <Activity className="w-3 h-3 mr-1" />
          {state || 'Unknown'}
        </Badge>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard icon={<Zap className="w-4 h-4" />} label="Downlink" value={downlink ? formatValue('throughput', downlink) : '—'} color="text-green-400" />
        <MetricCard icon={<Zap className="w-4 h-4 rotate-180" />} label="Uplink" value={uplink ? formatValue('throughput', uplink) : '—'} color="text-blue-400" />
        <MetricCard icon={<Clock className="w-4 h-4" />} label="Latency" value={latency ? `${latency.toFixed(1)} ms` : '—'} color="text-amber-400" />
        <MetricCard icon={<Signal className="w-4 h-4" />} label="SNR" value={snr ? `${snr.toFixed(1)} dB` : '—'} color="text-violet-400" />
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard icon={<Activity className="w-4 h-4" />} label="Obstruction" value={obstruction !== undefined ? `${obstruction.toFixed(1)}%` : '—'} color={obstruction && obstruction > 5 ? "text-red-400" : "text-green-400"} />
        <MetricCard icon={<Zap className="w-4 h-4" />} label="Power" value={power ? `${power.toFixed(1)}W` : '—'} color="text-yellow-400" />
        <MetricCard icon={<Clock className="w-4 h-4" />} label="Uptime" value={uptime ? formatValue('uptime', uptime) : '—'} color="text-cyan-400" />
        <MetricCard icon={<Activity className="w-4 h-4" />} label="Readings" value={String(device.readings?.length || 0)} color="text-muted-foreground" />
      </div>
      
      {(lat && lng) && (
        <Card className="p-4 border-violet-500/30 bg-violet-500/5">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-4 h-4 text-violet-400" />
            <span className="text-sm font-medium">Location</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Latitude</p>
              <p className="font-mono text-sm">{lat.toFixed(6)}°</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Longitude</p>
              <p className="font-mono text-sm">{lng.toFixed(6)}°</p>
            </div>
          </div>
        </Card>
      )}
      
      {chartData.length > 1 && (
        <Card className="p-4">
          <h4 className="text-sm font-medium text-muted-foreground mb-3">Throughput & Latency Trend</h4>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <RechartsTooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                <Line type="monotone" dataKey="downlink" name="Downlink (Mbps)" stroke="#22c55e" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="uplink" name="Uplink (Mbps)" stroke="#3b82f6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
      
      <RawDataCard data={starlinkData} title="Latest Batch Data" latestReading={latestReading ? { timestamp: latestReading.timestamp, data: latestReading.data as Record<string, unknown> } : null} />
    </div>
  );
}

// =============================================
// SYSTEM MONITOR PANEL
// =============================================
function SystemMonitorPanel({ device }: { device: DeviceGroup }) {
  const latestReading = device.latest;
  const data = latestReading?.data as Record<string, unknown> || {};
  const systemData = (data.system_monitor as Record<string, unknown>) || (data.system as Record<string, unknown>) || data;
  
  const cpu = systemData.cpu_percent as number | undefined;
  const memory = systemData.memory_percent as number | undefined;
  const disk = systemData.disk_percent as number | undefined;
  const uptime = systemData.uptime_seconds as number | undefined;
  
  const chartData = useMemo(() => {
    return device.readings.slice(-30).map(r => {
      const d = r.data as Record<string, unknown> || {};
      const sys = (d.system_monitor as Record<string, unknown>) || (d.system as Record<string, unknown>) || d;
      return {
        time: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        cpu: sys.cpu_percent as number,
        memory: sys.memory_percent as number,
        disk: sys.disk_percent as number,
      };
    });
  }, [device.readings]);
  
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-slate-500/20 flex items-center justify-center">
          <Monitor className="w-5 h-5 text-slate-400" />
        </div>
        <div>
          <h3 className="font-semibold">System Monitor</h3>
          <p className="text-xs text-muted-foreground font-mono">{device.device_id}</p>
        </div>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ResourceGauge label="CPU" value={cpu} color="#3b82f6" />
        <ResourceGauge label="Memory" value={memory} color="#8b5cf6" />
        <ResourceGauge label="Disk" value={disk} color="#f97316" />
        <MetricCard icon={<Clock className="w-4 h-4" />} label="Uptime" value={uptime ? formatValue('uptime', uptime) : '—'} color="text-green-400" />
      </div>
      
      {chartData.length > 1 && (
        <Card className="p-4">
          <h4 className="text-sm font-medium text-muted-foreground mb-3">Resource Usage Trend</h4>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" domain={[0, 100]} />
                <RechartsTooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                <Area type="monotone" dataKey="cpu" name="CPU %" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
                <Area type="monotone" dataKey="memory" name="Memory %" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} />
                <Area type="monotone" dataKey="disk" name="Disk %" stroke="#f97316" fill="#f97316" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
      
      <RawDataCard data={systemData} title="Latest Batch Data" latestReading={latestReading ? { timestamp: latestReading.timestamp, data: latestReading.data as Record<string, unknown> } : null} />
    </div>
  );
}

// =============================================
// WIFI SCANNER PANEL - With API data
// =============================================
function WifiScannerPanel({ device, clientId }: { device: DeviceGroup; clientId?: string }) {
  const { data: wifiApiData, isLoading } = useClientWifiData(clientId || '');
  
  const latestReading = device.latest;
  const data = latestReading?.data as Record<string, unknown> || {};
  
  // Extract WiFi data from multiple possible locations
  const wifiData = (data.wifi_scanner as Record<string, unknown>) || 
                   (data.wifi as Record<string, unknown>) || 
                   data;
  
  // Try to extract networks from various data structures
  const extractNetworks = (): Record<string, unknown>[] => {
    // First try API data
    if (wifiApiData?.networks && Array.isArray(wifiApiData.networks) && wifiApiData.networks.length > 0) {
      return wifiApiData.networks as unknown as Record<string, unknown>[];
    }
    // Try device data
    if (Array.isArray(wifiData.networks)) {
      return wifiData.networks as Record<string, unknown>[];
    }
    if (Array.isArray(wifiData.access_points)) {
      return wifiData.access_points as Record<string, unknown>[];
    }
    if (Array.isArray(wifiData.aps)) {
      return wifiData.aps as Record<string, unknown>[];
    }
    // Check if data itself contains network entries
    if (Array.isArray(data)) {
      return data as Record<string, unknown>[];
    }
    // Try to extract from readings
    const readings = wifiApiData?.readings || device.readings || [];
    if (readings.length > 0) {
      const latestData = (readings[0] as any)?.data || {};
      const wifiPart = latestData.wifi_scanner || latestData.wifi || latestData;
      if (Array.isArray(wifiPart.networks)) return wifiPart.networks;
      if (Array.isArray(wifiPart.access_points)) return wifiPart.access_points;
    }
    return [];
  };
  
  const networks = extractNetworks();
  const networkCount = wifiApiData?.networkCount || 
                       wifiData.network_count as number || 
                       wifiData.total_networks as number ||
                       networks.length;
  const scanDuration = wifiData.scan_duration_ms as number || wifiData.duration as number;
  const lastScan = wifiData.timestamp as string || wifiData.last_scan as string;
  
  // Get signal strength distribution
  const signalGroups = useMemo(() => {
    const strong = networks.filter(n => (n.signal as number || n.rssi as number || -100) > -50).length;
    const medium = networks.filter(n => {
      const sig = n.signal as number || n.rssi as number || -100;
      return sig <= -50 && sig > -70;
    }).length;
    const weak = networks.filter(n => (n.signal as number || n.rssi as number || -100) <= -70).length;
    return { strong, medium, weak };
  }, [networks]);
  
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center relative">
          <Wifi className="w-5 h-5 text-blue-400" />
          {isLoading && <Loader2 className="w-3 h-3 animate-spin absolute -top-1 -right-1" />}
        </div>
        <div>
          <h3 className="font-semibold">WiFi Scanner</h3>
          <p className="text-xs text-muted-foreground font-mono">{device.device_id}</p>
        </div>
        <Badge variant="outline" className="ml-auto bg-blue-500/20 text-blue-400 border-blue-500/30">
          {networkCount} networks
        </Badge>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard icon={<Wifi className="w-4 h-4" />} label="Networks Found" value={String(networkCount)} color="text-blue-400" />
        <MetricCard icon={<Signal className="w-4 h-4" />} label="Strong Signal" value={String(signalGroups.strong)} color="text-green-400" />
        <MetricCard icon={<Signal className="w-4 h-4" />} label="Medium Signal" value={String(signalGroups.medium)} color="text-amber-400" />
        <MetricCard icon={<Signal className="w-4 h-4" />} label="Weak Signal" value={String(signalGroups.weak)} color="text-red-400" />
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <MetricCard icon={<Clock className="w-4 h-4" />} label="Scan Duration" value={scanDuration ? `${scanDuration}ms` : '—'} color="text-muted-foreground" />
        <MetricCard icon={<Activity className="w-4 h-4" />} label="Readings" value={String(wifiApiData?.readings?.length || device.readings?.length || 0)} color="text-muted-foreground" />
      </div>
      
      {networks.length > 0 ? (
        <Card className="p-4">
          <h4 className="text-sm font-medium text-muted-foreground mb-3">Detected Networks ({networks.length})</h4>
          <div className="space-y-2 max-h-[400px] overflow-auto">
            {networks.slice(0, 50).map((network, idx) => {
              const signalValue = network.signal as number || network.rssi as number;
              const signalColor = signalValue > -50 ? 'text-green-400' : signalValue > -70 ? 'text-amber-400' : 'text-red-400';
              return (
                <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Wifi className={`w-4 h-4 shrink-0 ${signalColor}`} />
                    <span className="font-mono text-sm truncate">{String(network.ssid || network.SSID || network.bssid || network.BSSID || 'Hidden Network')}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                    {signalValue && <span className={signalColor}>{signalValue.toFixed(0)} dBm</span>}
                    {(network.channel || network.Channel) && <span>Ch {String(network.channel || network.Channel)}</span>}
                    {(network.frequency || network.freq) && <span>{((network.frequency || network.freq) as number / 1000).toFixed(1)} GHz</span>}
                    {(network.security || network.Security || network.encryption) && (
                      <Badge variant="outline" className="text-[10px]">
                        {String(network.security || network.Security || network.encryption)}
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ) : (
        <Card className="p-6">
          <div className="text-center text-muted-foreground">
            <Wifi className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No WiFi networks detected yet</p>
            <p className="text-xs mt-1">Data will appear when scans complete</p>
          </div>
        </Card>
      )}
      
      <RawDataCard data={wifiData} title="Latest Batch Data" latestReading={latestReading ? { timestamp: latestReading.timestamp, data: latestReading.data as Record<string, unknown> } : null} />
    </div>
  );
}

// =============================================
// BLUETOOTH SCANNER PANEL - With API data
// =============================================
function BluetoothScannerPanel({ device, clientId }: { device: DeviceGroup; clientId?: string }) {
  const { data: btApiData, isLoading } = useClientBluetoothData(clientId || '');
  
  const latestReading = device.latest;
  const data = latestReading?.data as Record<string, unknown> || {};
  
  // Extract Bluetooth data from multiple possible locations
  const btData = (data.bluetooth_scanner as Record<string, unknown>) || 
                 (data.bluetooth as Record<string, unknown>) || 
                 (data.ble as Record<string, unknown>) ||
                 data;
  
  // Try to extract devices from various data structures
  const extractDevices = (): Record<string, unknown>[] => {
    // First try API data
    if (btApiData?.devices && Array.isArray(btApiData.devices) && btApiData.devices.length > 0) {
      return btApiData.devices as unknown as Record<string, unknown>[];
    }
    // Try device data
    if (Array.isArray(btData.devices)) {
      return btData.devices as Record<string, unknown>[];
    }
    if (Array.isArray(btData.discovered)) {
      return btData.discovered as Record<string, unknown>[];
    }
    if (Array.isArray(btData.peripherals)) {
      return btData.peripherals as Record<string, unknown>[];
    }
    // Try to extract from readings
    const readings = btApiData?.readings || device.readings || [];
    if (readings.length > 0) {
      const latestData = (readings[0] as any)?.data || {};
      const btPart = latestData.bluetooth_scanner || latestData.bluetooth || latestData.ble || latestData;
      if (Array.isArray(btPart.devices)) return btPart.devices;
      if (Array.isArray(btPart.discovered)) return btPart.discovered;
    }
    return [];
  };
  
  const devices_found = extractDevices();
  const deviceCount = btApiData?.deviceCount || 
                      btData.device_count as number || 
                      btData.total_devices as number ||
                      devices_found.length;
  
  // Categorize devices
  const deviceTypes = useMemo(() => {
    const classic = devices_found.filter(d => (d.type as string)?.toLowerCase() === 'classic').length;
    const ble = devices_found.filter(d => (d.type as string)?.toLowerCase()?.includes('le') || (d.type as string)?.toLowerCase() === 'ble').length;
    const other = devices_found.length - classic - ble;
    return { classic, ble, other };
  }, [devices_found]);
  
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center relative">
          <Bluetooth className="w-5 h-5 text-indigo-400" />
          {isLoading && <Loader2 className="w-3 h-3 animate-spin absolute -top-1 -right-1" />}
        </div>
        <div>
          <h3 className="font-semibold">Bluetooth Scanner</h3>
          <p className="text-xs text-muted-foreground font-mono">{device.device_id}</p>
        </div>
        <Badge variant="outline" className="ml-auto bg-indigo-500/20 text-indigo-400 border-indigo-500/30">
          {deviceCount} devices
        </Badge>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard icon={<Bluetooth className="w-4 h-4" />} label="Total Devices" value={String(deviceCount)} color="text-indigo-400" />
        <MetricCard icon={<Radio className="w-4 h-4" />} label="Classic" value={String(deviceTypes.classic)} color="text-blue-400" />
        <MetricCard icon={<Signal className="w-4 h-4" />} label="BLE" value={String(deviceTypes.ble)} color="text-cyan-400" />
        <MetricCard icon={<Activity className="w-4 h-4" />} label="Readings" value={String(btApiData?.readings?.length || device.readings?.length || 0)} color="text-muted-foreground" />
      </div>
      
      {devices_found.length > 0 ? (
        <Card className="p-4">
          <h4 className="text-sm font-medium text-muted-foreground mb-3">Detected Devices ({devices_found.length})</h4>
          <div className="space-y-2 max-h-[400px] overflow-auto">
            {devices_found.slice(0, 50).map((dev, idx) => {
              const rssiValue = dev.rssi as number;
              const rssiColor = rssiValue > -50 ? 'text-green-400' : rssiValue > -70 ? 'text-amber-400' : 'text-red-400';
              return (
                <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Bluetooth className={`w-4 h-4 shrink-0 ${rssiValue ? rssiColor : 'text-indigo-400'}`} />
                    <div className="min-w-0">
                      <span className="font-mono text-sm block truncate">
                        {String(dev.name || dev.local_name || dev.complete_name || 'Unknown Device')}
                      </span>
                      {dev.address && (
                        <span className="text-[10px] text-muted-foreground font-mono block truncate">
                          {String(dev.address || dev.mac)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                    {rssiValue && <span className={rssiColor}>{rssiValue.toFixed(0)} dBm</span>}
                    {(dev.type || dev.device_type) && (
                      <Badge variant="outline" className="text-[10px]">
                        {String(dev.type || dev.device_type)}
                      </Badge>
                    )}
                    {dev.manufacturer && <span className="max-w-[100px] truncate">{String(dev.manufacturer)}</span>}
                    {dev.connectable !== undefined && (
                      <Badge variant={dev.connectable ? "default" : "secondary"} className="text-[10px]">
                        {dev.connectable ? 'Conn' : 'N/C'}
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ) : (
        <Card className="p-6">
          <div className="text-center text-muted-foreground">
            <Bluetooth className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No Bluetooth devices detected yet</p>
            <p className="text-xs mt-1">Data will appear when scans complete</p>
          </div>
        </Card>
      )}
      
      <RawDataCard data={btData} title="Latest Batch Data" latestReading={latestReading ? { timestamp: latestReading.timestamp, data: latestReading.data as Record<string, unknown> } : null} />
    </div>
  );
}

// =============================================
// ADSB PANEL - Comprehensive with API data
// =============================================
function AdsbPanel({ device, clientId }: { device: DeviceGroup; clientId?: string }) {
  const { data: adsbApiData, isLoading } = useClientAdsbData(clientId || '');
  
  const latestReading = device.latest;
  const data = latestReading?.data as Record<string, unknown> || {};
  
  // Extract ADS-B data from multiple possible locations
  const adsbData = (data.adsb_detector as Record<string, unknown>) || 
                   (data.adsb as Record<string, unknown>) || 
                   data;
  
  const apiStats = adsbApiData?.stats as Record<string, unknown> || {};
  const mergedData = { ...adsbData, ...apiStats };
  
  // Try to extract aircraft from various data structures
  const extractAircraft = (): Record<string, unknown>[] => {
    // First try API data
    if (adsbApiData?.aircraft && Array.isArray(adsbApiData.aircraft) && adsbApiData.aircraft.length > 0) {
      return adsbApiData.aircraft as Record<string, unknown>[];
    }
    // Try device data
    if (Array.isArray(adsbData.aircraft)) {
      return adsbData.aircraft as Record<string, unknown>[];
    }
    if (Array.isArray(adsbData.planes)) {
      return adsbData.planes as Record<string, unknown>[];
    }
    if (Array.isArray(adsbData.targets)) {
      return adsbData.targets as Record<string, unknown>[];
    }
    // Try to extract from readings
    const readings = device.readings || [];
    if (readings.length > 0) {
      const latestData = (readings[0] as any)?.data || {};
      const adsbPart = latestData.adsb_detector || latestData.adsb || latestData;
      if (Array.isArray(adsbPart.aircraft)) return adsbPart.aircraft;
    }
    return [];
  };
  
  const aircraft = extractAircraft();
  const aircraftCount = mergedData.aircraft_count as number || 
                       mergedData.aircraft_active as number || 
                       mergedData.total_aircraft as number ||
                       aircraft.length;
  const messagesDecoded = mergedData.messages_decoded as number || mergedData.messages as number || mergedData.total_messages as number;
  const maxRange = mergedData.max_range_nm as number || mergedData.max_range as number;
  const coverage = adsbApiData?.coverage as Record<string, unknown> || {};
  const emergencies = adsbApiData?.emergencies as unknown[] || [];
  
  // Calculate stats from aircraft
  const aircraftStats = useMemo(() => {
    const withPosition = aircraft.filter(ac => ac.lat !== undefined || ac.latitude !== undefined).length;
    const withAltitude = aircraft.filter(ac => ac.alt_baro !== undefined || ac.altitude !== undefined).length;
    const withSquawk = aircraft.filter(ac => ac.squawk !== undefined).length;
    return { withPosition, withAltitude, withSquawk };
  }, [aircraft]);
  
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center relative">
          <Plane className="w-5 h-5 text-cyan-400" />
          {isLoading && <Loader2 className="w-3 h-3 animate-spin absolute -top-1 -right-1" />}
        </div>
        <div>
          <h3 className="font-semibold">ADS-B Detector</h3>
          <p className="text-xs text-muted-foreground font-mono">{device.device_id}</p>
        </div>
        <Badge variant="outline" className="ml-auto bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
          {aircraftCount} aircraft
        </Badge>
        {emergencies.length > 0 && (
          <Badge variant="destructive" className="animate-pulse">
            {emergencies.length} Emergency
          </Badge>
        )}
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard icon={<Plane className="w-4 h-4" />} label="Aircraft Active" value={String(aircraftCount)} color="text-cyan-400" />
        <MetricCard icon={<Activity className="w-4 h-4" />} label="Messages" value={messagesDecoded ? messagesDecoded.toLocaleString() : '—'} color="text-green-400" />
        <MetricCard icon={<Signal className="w-4 h-4" />} label="Max Range" value={maxRange ? `${maxRange.toFixed(0)} nm` : '—'} color="text-amber-400" />
        <MetricCard icon={<MapPin className="w-4 h-4" />} label="With Position" value={String(aircraftStats.withPosition)} color="text-violet-400" />
      </div>
      
      <div className="grid grid-cols-3 gap-3">
        <MetricCard icon={<Navigation className="w-4 h-4" />} label="With Altitude" value={String(aircraftStats.withAltitude)} color="text-blue-400" />
        <MetricCard icon={<Radio className="w-4 h-4" />} label="With Squawk" value={String(aircraftStats.withSquawk)} color="text-amber-400" />
        <MetricCard icon={<Eye className="w-4 h-4" />} label="Coverage" value={coverage.coverage_area_km2 ? `${(coverage.coverage_area_km2 as number).toFixed(0)} km²` : '—'} color="text-green-400" />
      </div>
      
      {aircraft.length > 0 ? (
        <Card className="p-4">
          <h4 className="text-sm font-medium text-muted-foreground mb-3">Tracked Aircraft ({aircraft.length})</h4>
          <div className="space-y-2 max-h-[400px] overflow-auto">
            {aircraft.slice(0, 30).map((ac, idx) => {
              const altitude = ac.alt_baro as number || ac.altitude as number;
              const speed = ac.gs as number || ac.ground_speed as number || ac.speed as number;
              const heading = ac.track as number || ac.heading as number;
              const callsign = ac.flight || ac.callsign || ac.hex || ac.icao || 'Unknown';
              
              return (
                <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Plane className={`w-4 h-4 shrink-0 ${ac.emergency ? 'text-red-500 animate-pulse' : 'text-cyan-400'}`} />
                    <span className="font-mono text-sm font-medium truncate">{String(callsign).trim()}</span>
                    {ac.registration && <Badge variant="outline" className="text-[10px] shrink-0">{String(ac.registration)}</Badge>}
                    {ac.squawk && <Badge variant="secondary" className="text-[10px] shrink-0">SQ {String(ac.squawk)}</Badge>}
                  </div>
                  <div className="flex items-center gap-4 text-xs shrink-0">
                    {altitude && <span className="text-muted-foreground">{Number(altitude).toLocaleString()} ft</span>}
                    {speed && <span className="text-muted-foreground">{Number(speed).toFixed(0)} kts</span>}
                    {heading && <span className="text-muted-foreground">{Number(heading).toFixed(0)}°</span>}
                    {ac.rssi && <span className="text-cyan-400">{Number(ac.rssi).toFixed(0)} dBm</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ) : (
        <Card className="p-6">
          <div className="text-center text-muted-foreground">
            <Plane className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No aircraft detected yet</p>
            <p className="text-xs mt-1">Data will appear when aircraft are in range</p>
          </div>
        </Card>
      )}
      
      <RawDataCard data={mergedData} title="Latest Batch Data" latestReading={latestReading ? { timestamp: latestReading.timestamp, data: latestReading.data as Record<string, unknown> } : null} />
    </div>
  );
}

// =============================================
// GPS PANEL - With coordinates and satellite info
// =============================================
function GpsPanel({ device, clientId }: { device: DeviceGroup; clientId?: string }) {
  const { data: gpsApiData, isLoading } = useClientGpsData(clientId || '');
  
  const latestReading = device.latest;
  const data = latestReading?.data as Record<string, unknown> || {};
  const gpsData = (data.gps as Record<string, unknown>) || (data.gnss as Record<string, unknown>) || data;
  
  // Merge API data
  const apiGps = gpsApiData?.gpsData || {};
  const mergedGps = { ...gpsData, ...apiGps };
  
  const lat = mergedGps.latitude as number | undefined;
  const lng = mergedGps.longitude as number | undefined;
  const alt = mergedGps.altitude as number | undefined;
  const speed = mergedGps.speed as number | undefined;
  const heading = mergedGps.heading as number | undefined;
  const satellites = mergedGps.satellites as number | undefined;
  const fixQuality = mergedGps.fix_quality as number | undefined;
  const hdop = mergedGps.hdop as number | undefined;
  
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center relative">
          <Navigation className="w-5 h-5 text-green-400" />
          {isLoading && <Loader2 className="w-3 h-3 animate-spin absolute -top-1 -right-1" />}
        </div>
        <div>
          <h3 className="font-semibold">GPS / GNSS</h3>
          <p className="text-xs text-muted-foreground font-mono">{device.device_id}</p>
        </div>
        {satellites !== undefined && (
          <Badge variant="outline" className="ml-auto bg-green-500/20 text-green-400 border-green-500/30">
            {satellites} satellites
          </Badge>
        )}
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard icon={<Satellite className="w-4 h-4" />} label="Satellites" value={satellites !== undefined ? String(satellites) : '—'} color="text-green-400" />
        <MetricCard icon={<Signal className="w-4 h-4" />} label="Fix Quality" value={fixQuality !== undefined ? String(fixQuality) : '—'} color="text-blue-400" />
        <MetricCard icon={<Activity className="w-4 h-4" />} label="HDOP" value={hdop !== undefined ? hdop.toFixed(2) : '—'} color="text-amber-400" />
        <MetricCard icon={<Wind className="w-4 h-4" />} label="Speed" value={speed !== undefined ? `${speed.toFixed(1)} m/s` : '—'} color="text-cyan-400" />
      </div>
      
      {(lat !== undefined && lng !== undefined) && (
        <Card className="p-4 border-green-500/30 bg-green-500/5">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-4 h-4 text-green-400" />
            <span className="text-sm font-medium">Current Position</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Latitude</p>
              <p className="font-mono text-sm">{lat.toFixed(6)}°</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Longitude</p>
              <p className="font-mono text-sm">{lng.toFixed(6)}°</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Altitude</p>
              <p className="font-mono text-sm">{alt !== undefined ? `${alt.toFixed(1)} m` : '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Heading</p>
              <p className="font-mono text-sm">{heading !== undefined ? `${heading.toFixed(1)}°` : '—'}</p>
            </div>
          </div>
        </Card>
      )}
      
      <RawDataCard data={gpsData} title="Latest Batch Data" latestReading={latestReading ? { timestamp: latestReading.timestamp, data: latestReading.data as Record<string, unknown> } : null} />
    </div>
  );
}

// =============================================
// THERMAL PROBE PANEL - With temperature selection
// =============================================
function ThermalProbePanel({ device, clientId }: { device: DeviceGroup; clientId?: string }) {
  const { data: thermalApiData, isLoading } = useClientThermalData(clientId || '');
  const [selectedMetric, setSelectedMetric] = useState<string>('temperature_c');
  
  const latestReading = device.latest;
  const data = latestReading?.data as Record<string, unknown> || {};
  const thermalData = (data.thermal_probe as Record<string, unknown>) || (data.thermal as Record<string, unknown>) || data;
  
  const temperature = thermalData.temperature_c as number || thermalData.temp_c as number;
  const humidity = thermalData.humidity as number;
  const pressure = thermalData.pressure as number;
  
  const readings = thermalApiData?.readings || device.readings || [];
  
  const chartData = useMemo(() => {
    return readings.slice(-50).map((r: any) => {
      const d = r.data as Record<string, unknown> || {};
      const th = (d.thermal_probe as Record<string, unknown>) || (d.thermal as Record<string, unknown>) || d;
      return {
        time: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        temperature_c: (th.temperature_c as number) || (th.temp_c as number),
        humidity: th.humidity as number,
        pressure: th.pressure as number,
      };
    });
  }, [readings]);
  
  const availableMetrics = [
    { key: 'temperature_c', label: 'Temperature (°C)', color: '#f59e0b' },
    { key: 'humidity', label: 'Humidity (%)', color: '#3b82f6' },
    { key: 'pressure', label: 'Pressure (hPa)', color: '#8b5cf6' },
  ].filter(m => chartData.some(d => (d as any)[m.key] !== undefined));
  
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center relative">
          <Thermometer className="w-5 h-5 text-amber-400" />
          {isLoading && <Loader2 className="w-3 h-3 animate-spin absolute -top-1 -right-1" />}
        </div>
        <div>
          <h3 className="font-semibold">Thermal Probe</h3>
          <p className="text-xs text-muted-foreground font-mono">{device.device_id}</p>
        </div>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="p-4 border-amber-500/30 bg-amber-500/5">
          <div className="text-center">
            <Thermometer className="w-8 h-8 mx-auto mb-2 text-amber-400" />
            <p className="text-3xl font-bold text-amber-400">{temperature !== undefined ? `${temperature.toFixed(1)}°C` : '—'}</p>
            <p className="text-xs text-muted-foreground">Temperature</p>
          </div>
        </Card>
        <Card className="p-4 border-blue-500/30 bg-blue-500/5">
          <div className="text-center">
            <Wind className="w-8 h-8 mx-auto mb-2 text-blue-400" />
            <p className="text-3xl font-bold text-blue-400">{humidity !== undefined ? `${humidity.toFixed(1)}%` : '—'}</p>
            <p className="text-xs text-muted-foreground">Humidity</p>
          </div>
        </Card>
        <Card className="p-4 border-violet-500/30 bg-violet-500/5">
          <div className="text-center">
            <Gauge className="w-8 h-8 mx-auto mb-2 text-violet-400" />
            <p className="text-3xl font-bold text-violet-400">{pressure !== undefined ? `${pressure.toFixed(0)}` : '—'}</p>
            <p className="text-xs text-muted-foreground">Pressure (hPa)</p>
          </div>
        </Card>
      </div>
      
      {chartData.length > 1 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-muted-foreground">Sensor Trend</h4>
            <Select value={selectedMetric} onValueChange={setSelectedMetric}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableMetrics.map(m => (
                  <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <RechartsTooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                <Line 
                  type="monotone" 
                  dataKey={selectedMetric} 
                  name={availableMetrics.find(m => m.key === selectedMetric)?.label} 
                  stroke={availableMetrics.find(m => m.key === selectedMetric)?.color || '#f59e0b'} 
                  strokeWidth={2} 
                  dot={false} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
      
      <RawDataCard data={thermalData} title="Latest Batch Data" latestReading={latestReading ? { timestamp: latestReading.timestamp, data: latestReading.data as Record<string, unknown> } : null} />
    </div>
  );
}

// =============================================
// ARDUINO PANEL - With all sensors and metric selection (similar to Thermal Probe)
// =============================================
function ArduinoPanel({ device, clientId }: { device: DeviceGroup; clientId?: string }) {
  const { data: arduinoApiData, isLoading } = useClientArduinoData(clientId || '');
  const [selectedMetric, setSelectedMetric] = useState<string>('temperature_c');
  
  const latestReading = device.latest;
  const data = latestReading?.data as Record<string, unknown> || {};
  
  // Extract Arduino data from multiple possible locations (like Thermal Probe)
  const extractArduinoData = (): Record<string, unknown> => {
    // Try direct arduino key
    if (data.arduino && typeof data.arduino === 'object') {
      return data.arduino as Record<string, unknown>;
    }
    // Try arduino_sensor key
    if (data.arduino_sensor && typeof data.arduino_sensor === 'object') {
      return data.arduino_sensor as Record<string, unknown>;
    }
    // Try sensors.arduino
    if ((data.sensors as Record<string, unknown>)?.arduino) {
      return (data.sensors as Record<string, unknown>).arduino as Record<string, unknown>;
    }
    // Try to extract from readings
    const readings = arduinoApiData?.readings || device.readings || [];
    if (readings.length > 0) {
      const latestData = (readings[0] as any)?.data || {};
      if (latestData.arduino) return latestData.arduino;
      if (latestData.arduino_sensor) return latestData.arduino_sensor;
    }
    // Fall back to raw data
    return data;
  };
  
  const arduinoData = extractArduinoData();
  
  // Merge with API data
  const apiMetrics = arduinoApiData?.metrics || {};
  const jsonlData = arduinoApiData?.jsonlData || {};
  const mergedData = { ...arduinoData, ...apiMetrics, ...jsonlData };
  
  // Extract metrics with fallback key names
  const temperature = (mergedData.temperature_c ?? mergedData.temp_c ?? mergedData.temperature ?? mergedData.temp) as number | undefined;
  const humidity = (mergedData.humidity ?? mergedData.hum ?? mergedData.rh) as number | undefined;
  const pressure = (mergedData.pressure ?? mergedData.press ?? mergedData.baro) as number | undefined;
  const lightLevel = (mergedData.light_level ?? mergedData.light ?? mergedData.lux ?? mergedData.illuminance) as number | undefined;
  const soilMoisture = (mergedData.soil_moisture ?? mergedData.soil ?? mergedData.moisture) as number | undefined;
  const co2 = (mergedData.co2_ppm ?? mergedData.co2 ?? mergedData.eCO2) as number | undefined;
  const tvoc = (mergedData.tvoc_ppb ?? mergedData.tvoc ?? mergedData.TVOC) as number | undefined;
  const voltage = (mergedData.voltage ?? mergedData.volts ?? mergedData.v) as number | undefined;
  const current = (mergedData.current ?? mergedData.amps ?? mergedData.a) as number | undefined;
  const power = (mergedData.power_w ?? mergedData.power ?? mergedData.watts) as number | undefined;
  const gas = (mergedData.gas ?? mergedData.gas_resistance ?? mergedData.air_quality) as number | undefined;
  
  const readings = arduinoApiData?.readings || device.readings || [];
  
  const chartData = useMemo(() => {
    return readings.slice(-50).map((r: any) => {
      const d = r.data as Record<string, unknown> || {};
      const ar = (d.arduino as Record<string, unknown>) || 
                 (d.arduino_sensor as Record<string, unknown>) || 
                 d;
      return {
        time: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        temperature_c: (ar.temperature_c ?? ar.temp_c ?? ar.temperature ?? ar.temp) as number,
        humidity: (ar.humidity ?? ar.hum ?? ar.rh) as number,
        pressure: (ar.pressure ?? ar.press ?? ar.baro) as number,
        light_level: (ar.light_level ?? ar.light ?? ar.lux) as number,
        soil_moisture: (ar.soil_moisture ?? ar.soil ?? ar.moisture) as number,
        co2_ppm: (ar.co2_ppm ?? ar.co2 ?? ar.eCO2) as number,
        tvoc_ppb: (ar.tvoc_ppb ?? ar.tvoc ?? ar.TVOC) as number,
        voltage: (ar.voltage ?? ar.volts ?? ar.v) as number,
        power_w: (ar.power_w ?? ar.power ?? ar.watts) as number,
      };
    });
  }, [readings]);
  
  // Define all possible metrics with icons (similar to Thermal Probe)
  const allMetrics = [
    { key: 'temperature_c', label: 'Temperature (°C)', color: '#f97316', icon: Thermometer, value: temperature },
    { key: 'humidity', label: 'Humidity (%)', color: '#3b82f6', icon: Wind, value: humidity },
    { key: 'pressure', label: 'Pressure (hPa)', color: '#8b5cf6', icon: Gauge, value: pressure },
    { key: 'light_level', label: 'Light (lux)', color: '#eab308', icon: Eye, value: lightLevel },
    { key: 'soil_moisture', label: 'Soil Moisture (%)', color: '#22c55e', icon: Wind, value: soilMoisture },
    { key: 'co2_ppm', label: 'CO₂ (ppm)', color: '#64748b', icon: Activity, value: co2 },
    { key: 'tvoc_ppb', label: 'TVOC (ppb)', color: '#06b6d4', icon: Activity, value: tvoc },
    { key: 'voltage', label: 'Voltage (V)', color: '#ef4444', icon: Zap, value: voltage },
    { key: 'power_w', label: 'Power (W)', color: '#f59e0b', icon: Zap, value: power },
  ];
  
  const availableMetrics = allMetrics.filter(m => m.value !== undefined && m.value !== null);
  
  // Set default selected metric to first available
  useMemo(() => {
    if (availableMetrics.length > 0 && !availableMetrics.find(m => m.key === selectedMetric)) {
      setSelectedMetric(availableMetrics[0].key);
    }
  }, [availableMetrics, selectedMetric]);
  
  // Get top 3 metrics for large display (like Thermal Probe)
  const primaryMetrics = availableMetrics.slice(0, 3);
  const primaryColors = ['amber', 'blue', 'violet'];
  
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center relative">
          <Cpu className="w-5 h-5 text-orange-400" />
          {isLoading && <Loader2 className="w-3 h-3 animate-spin absolute -top-1 -right-1" />}
        </div>
        <div>
          <h3 className="font-semibold">Arduino Sensors</h3>
          <p className="text-xs text-muted-foreground font-mono">{device.device_id}</p>
        </div>
        <Badge variant="outline" className="ml-auto bg-orange-500/20 text-orange-400 border-orange-500/30">
          {availableMetrics.length} metrics
        </Badge>
      </div>
      
      {/* Primary Metrics - Large Cards (like Thermal Probe) */}
      {primaryMetrics.length > 0 && (
        <div className={`grid gap-4 ${primaryMetrics.length === 1 ? 'grid-cols-1' : primaryMetrics.length === 2 ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3'}`}>
          {primaryMetrics.map((metric, idx) => {
            const Icon = metric.icon;
            const colorClass = primaryColors[idx] || 'orange';
            return (
              <Card key={metric.key} className={`p-4 border-${colorClass}-500/30 bg-${colorClass}-500/5`}>
                <div className="text-center">
                  <Icon className={`w-8 h-8 mx-auto mb-2`} style={{ color: metric.color }} />
                  <p className={`text-3xl font-bold`} style={{ color: metric.color }}>
                    {metric.value !== undefined ? formatValue(metric.key, metric.value) : '—'}
                  </p>
                  <p className="text-xs text-muted-foreground">{metric.label.split(' (')[0]}</p>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      
      {/* Secondary Metrics Grid */}
      {availableMetrics.length > 3 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {availableMetrics.slice(3).map(metric => {
            const Icon = metric.icon;
            return (
              <MetricCard 
                key={metric.key}
                icon={<Icon className="w-4 h-4" />} 
                label={metric.label.split(' (')[0]} 
                value={formatValue(metric.key, metric.value)} 
                color={`text-[${metric.color}]`} 
              />
            );
          })}
        </div>
      )}
      
      {/* No data fallback */}
      {availableMetrics.length === 0 && (
        <Card className="p-6">
          <div className="text-center text-muted-foreground">
            <Cpu className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No Arduino sensor data yet</p>
            <p className="text-xs mt-1">Data will appear when sensors report</p>
          </div>
        </Card>
      )}
      
      {/* Chart with selectable metrics (like Thermal Probe) */}
      {chartData.length > 1 && availableMetrics.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-muted-foreground">Sensor Trend</h4>
            <Select value={selectedMetric} onValueChange={setSelectedMetric}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableMetrics.map(m => (
                  <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <RechartsTooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                <Line 
                  type="monotone" 
                  dataKey={selectedMetric} 
                  name={availableMetrics.find(m => m.key === selectedMetric)?.label} 
                  stroke={availableMetrics.find(m => m.key === selectedMetric)?.color || '#f97316'} 
                  strokeWidth={2} 
                  dot={false} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
      
      <RawDataCard data={mergedData} title="Latest Batch Data" latestReading={latestReading ? { timestamp: latestReading.timestamp, data: latestReading.data as Record<string, unknown> } : null} />
    </div>
  );
}

// =============================================
// LORA PANEL
// =============================================
function LoraPanel({ device, clientId }: { device: DeviceGroup; clientId?: string }) {
  const { data: loraApiData, isLoading } = useClientLoraData(clientId || '');
  
  const latestReading = device.latest;
  const data = latestReading?.data as Record<string, unknown> || {};
  const loraData = (data.lora as Record<string, unknown>) || data;
  
  const devices = loraApiData?.devices as unknown[] || [];
  const detections = loraApiData?.detections as unknown[] || [];
  const stats = loraApiData?.stats as Record<string, unknown> || {};
  
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center relative">
          <Radio className="w-5 h-5 text-red-400" />
          {isLoading && <Loader2 className="w-3 h-3 animate-spin absolute -top-1 -right-1" />}
        </div>
        <div>
          <h3 className="font-semibold">LoRa Radio</h3>
          <p className="text-xs text-muted-foreground font-mono">{device.device_id}</p>
        </div>
        <Badge variant="outline" className="ml-auto bg-red-500/20 text-red-400 border-red-500/30">
          {devices.length} devices
        </Badge>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard icon={<Radio className="w-4 h-4" />} label="Devices" value={String(devices.length)} color="text-red-400" />
        <MetricCard icon={<Activity className="w-4 h-4" />} label="Detections" value={String(detections.length)} color="text-amber-400" />
        <MetricCard icon={<Signal className="w-4 h-4" />} label="Total Packets" value={stats.total_packets ? String(stats.total_packets) : '—'} color="text-green-400" />
        <MetricCard icon={<Activity className="w-4 h-4" />} label="Readings" value={String(device.readings?.length || 0)} color="text-muted-foreground" />
      </div>
      
      {detections.length > 0 && (
        <Card className="p-4">
          <h4 className="text-sm font-medium text-muted-foreground mb-3">Recent Detections ({detections.length})</h4>
          <div className="space-y-2 max-h-[300px] overflow-auto">
            {(detections as Record<string, unknown>[]).slice(0, 20).map((det, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-red-400" />
                  <span className="font-mono text-sm">{String(det.device_id || det.dev_eui || 'Unknown')}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {det.rssi && <span className="text-red-400">{formatValue('rssi', det.rssi)}</span>}
                  {det.snr && <span>{Number(det.snr).toFixed(1)} dB</span>}
                  {det.frequency && <span>{Number(det.frequency).toFixed(2)} MHz</span>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
      
      <RawDataCard data={loraData} title="Latest Batch Data" latestReading={latestReading ? { timestamp: latestReading.timestamp, data: latestReading.data as Record<string, unknown> } : null} />
    </div>
  );
}

// =============================================
// GENERIC SENSOR PANEL (fallback)
// =============================================
function GenericSensorPanel({ device }: { device: DeviceGroup }) {
  const config = getSensorConfig(device.device_type);
  const Icon = config.icon;
  const latestReading = device.latest;
  const data = flattenData(latestReading?.data as Record<string, unknown> || {});
  
  const numericEntries = Object.entries(data)
    .filter(([k, v]) => typeof v === 'number' && !k.includes('_id') && !k.includes('timestamp'))
    .slice(0, 8);
  
  const chartData = useMemo(() => {
    if (!device.readings.length) return [];
    const keys = numericEntries.map(([k]) => k).slice(0, 4);
    return device.readings.slice(-30).map(r => {
      const flat = flattenData(r.data as Record<string, unknown> || {});
      const entry: Record<string, unknown> = {
        time: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      keys.forEach(k => { entry[k] = flat[k]; });
      return entry;
    });
  }, [device.readings, numericEntries]);
  
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${config.color}20` }}>
          <Icon className="w-5 h-5" style={{ color: config.color }} />
        </div>
        <div>
          <h3 className="font-semibold capitalize">{device.device_type.replace(/_/g, ' ')}</h3>
          <p className="text-xs text-muted-foreground font-mono">{device.device_id}</p>
        </div>
        <Badge variant="outline" className="ml-auto">
          {device.readings?.length || 0} readings
        </Badge>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {numericEntries.map(([key, value]) => (
          <div key={key} className="p-3 rounded-lg bg-muted/30 border border-border/30">
            <p className="text-xs text-muted-foreground truncate">{formatLabel(key)}</p>
            <p className="font-mono text-sm font-medium">{formatValue(key, value)}</p>
          </div>
        ))}
      </div>
      
      {chartData.length > 1 && numericEntries.length > 0 && (
        <Card className="p-4">
          <h4 className="text-sm font-medium text-muted-foreground mb-3">Trend</h4>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <RechartsTooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                {numericEntries.slice(0, 4).map(([key], idx) => (
                  <Line key={key} type="monotone" dataKey={key} name={formatLabel(key)} stroke={CHART_COLORS[idx % CHART_COLORS.length]} strokeWidth={2} dot={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
      
      <RawDataCard data={data} title="Latest Batch Data" latestReading={latestReading ? { timestamp: latestReading.timestamp, data: latestReading.data as Record<string, unknown> } : null} />
    </div>
  );
}

// =============================================
// MAIN COMPONENT
// =============================================
export function SensorTabs({ devices, isLoading, clientId }: SensorTabsProps) {
  if (isLoading) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading sensors...</span>
        </div>
      </Card>
    );
  }

  if (!devices || devices.length === 0) {
    return (
      <Card className="p-8">
        <div className="text-center text-muted-foreground">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No sensors found for this client</p>
        </div>
      </Card>
    );
  }

  const sortedDevices = [...devices].sort((a, b) => {
    const configA = getSensorConfig(a.device_type);
    const configB = getSensorConfig(b.device_type);
    return configA.priority - configB.priority;
  });

  const defaultTab = sortedDevices[0]?.device_id || '';

  const getPanelComponent = (device: DeviceGroup) => {
    const type = device.device_type.toLowerCase();
    if (type.includes('starlink')) return <StarlinkPanel device={device} clientId={clientId} />;
    if (type.includes('system') || type.includes('monitor')) return <SystemMonitorPanel device={device} />;
    if (type.includes('wifi')) return <WifiScannerPanel device={device} clientId={clientId} />;
    if (type.includes('bluetooth') || type.includes('ble')) return <BluetoothScannerPanel device={device} clientId={clientId} />;
    if (type.includes('adsb')) return <AdsbPanel device={device} clientId={clientId} />;
    if (type.includes('gps') || type.includes('gnss')) return <GpsPanel device={device} clientId={clientId} />;
    if (type.includes('thermal') || type.includes('probe') || type.includes('temp')) return <ThermalProbePanel device={device} clientId={clientId} />;
    if (type.includes('arduino')) return <ArduinoPanel device={device} clientId={clientId} />;
    if (type.includes('lora')) return <LoraPanel device={device} clientId={clientId} />;
    return <GenericSensorPanel device={device} />;
  };

  return (
    <Card className="border-border/50">
      <Tabs defaultValue={defaultTab} className="w-full">
        <div className="border-b border-border/50 px-4 pt-4">
          <ScrollArea className="w-full">
            <TabsList className="h-auto p-1 bg-muted/30 inline-flex w-max">
              {sortedDevices.map((device) => {
                const config = getSensorConfig(device.device_type);
                const Icon = config.icon;
                return (
                  <TabsTrigger 
                    key={device.device_id} 
                    value={device.device_id}
                    className="flex items-center gap-2 px-3 py-2 data-[state=active]:bg-background"
                  >
                    <Icon className="w-4 h-4" style={{ color: config.color }} />
                    <span className="text-sm">{config.label}</span>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {device.readings?.length || 0}
                    </Badge>
                  </TabsTrigger>
                );
              })}
            </TabsList>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
        
        {sortedDevices.map((device) => (
          <TabsContent key={device.device_id} value={device.device_id} className="p-4 mt-0">
            {getPanelComponent(device)}
          </TabsContent>
        ))}
      </Tabs>
    </Card>
  );
}
