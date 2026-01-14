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
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
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

interface SensorTabsProps {
  devices: DeviceGroup[];
  isLoading?: boolean;
}

// Sensor type configuration
const SENSOR_TYPES = {
  starlink: { 
    label: 'Starlink', 
    icon: Satellite, 
    color: '#8b5cf6',
    priority: 1 
  },
  system_monitor: { 
    label: 'System', 
    icon: Monitor, 
    color: '#64748b',
    priority: 2 
  },
  wifi_scanner: { 
    label: 'WiFi', 
    icon: Wifi, 
    color: '#3b82f6',
    priority: 3 
  },
  bluetooth_scanner: { 
    label: 'Bluetooth', 
    icon: Bluetooth, 
    color: '#6366f1',
    priority: 4 
  },
  adsb_detector: { 
    label: 'ADS-B', 
    icon: Plane, 
    color: '#06b6d4',
    priority: 5 
  },
  gps: { 
    label: 'GPS', 
    icon: Navigation, 
    color: '#22c55e',
    priority: 6 
  },
  thermal_probe: { 
    label: 'Thermal', 
    icon: Thermometer, 
    color: '#f59e0b',
    priority: 7 
  },
  arduino: { 
    label: 'Arduino', 
    icon: Cpu, 
    color: '#f97316',
    priority: 8 
  },
  lora: { 
    label: 'LoRa', 
    icon: Radio, 
    color: '#ef4444',
    priority: 9 
  },
} as const;

const getSensorConfig = (deviceType: string) => {
  const type = deviceType.toLowerCase();
  for (const [key, config] of Object.entries(SENSOR_TYPES)) {
    if (type.includes(key.replace('_', ''))) return config;
    if (type.includes(key)) return config;
  }
  // Check partial matches
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
  return key
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
};

// Flatten nested data for display
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
// STARLINK PANEL - Comprehensive display
// =============================================
function StarlinkPanel({ device }: { device: DeviceGroup }) {
  const latestReading = device.latest;
  const data = latestReading?.data as Record<string, unknown> || {};
  const starlinkData = (data.starlink as Record<string, unknown>) || data;
  
  // Extract key metrics
  const uptime = starlinkData.uptime_seconds as number | undefined;
  const downlink = starlinkData.downlink_throughput_bps as number | undefined;
  const uplink = starlinkData.uplink_throughput_bps as number | undefined;
  const latency = starlinkData.pop_ping_latency_ms as number | undefined;
  const obstruction = starlinkData.obstruction_percent as number | undefined;
  const snr = starlinkData.snr as number | undefined;
  const power = starlinkData.power_watts as number | undefined;
  const state = starlinkData.state as string | undefined;
  
  // Location
  const lat = starlinkData.latitude as number | undefined;
  const lng = starlinkData.longitude as number | undefined;
  const alt = starlinkData.altitude as number | undefined;
  
  // Additional details
  const locationDetail = starlinkData.location_detail as Record<string, unknown> | undefined;
  const pingLatency = starlinkData.ping_latency as Record<string, number> | undefined;
  
  return (
    <div className="space-y-4">
      {/* Status Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center">
            <Satellite className="w-6 h-6 text-violet-400" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Starlink Dish</h3>
            <p className="text-sm text-muted-foreground font-mono">{device.device_id}</p>
          </div>
        </div>
        <Badge 
          variant="outline" 
          className={state === 'CONNECTED' 
            ? 'bg-success/20 text-success border-success/30' 
            : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
          }
        >
          <Activity className="w-3 h-3 mr-1" />
          {state || 'Unknown'}
        </Badge>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard 
          icon={<Zap className="w-4 h-4" />}
          label="Downlink"
          value={downlink ? formatValue('throughput', downlink) : '—'}
          color="text-green-400"
        />
        <MetricCard 
          icon={<Zap className="w-4 h-4 rotate-180" />}
          label="Uplink"
          value={uplink ? formatValue('throughput', uplink) : '—'}
          color="text-blue-400"
        />
        <MetricCard 
          icon={<Clock className="w-4 h-4" />}
          label="Latency"
          value={latency ? `${latency.toFixed(1)} ms` : '—'}
          color="text-amber-400"
        />
        <MetricCard 
          icon={<Signal className="w-4 h-4" />}
          label="SNR"
          value={snr ? `${snr.toFixed(1)} dB` : '—'}
          color="text-violet-400"
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard 
          icon={<Activity className="w-4 h-4" />}
          label="Obstruction"
          value={obstruction !== undefined ? `${obstruction.toFixed(1)}%` : '—'}
          color={obstruction && obstruction > 5 ? "text-red-400" : "text-green-400"}
        />
        <MetricCard 
          icon={<Zap className="w-4 h-4" />}
          label="Power"
          value={power ? `${power.toFixed(1)}W` : '—'}
          color="text-yellow-400"
        />
        <MetricCard 
          icon={<Clock className="w-4 h-4" />}
          label="Uptime"
          value={uptime ? formatValue('uptime', uptime) : '—'}
          color="text-cyan-400"
        />
        <MetricCard 
          icon={<Activity className="w-4 h-4" />}
          label="Readings"
          value={String(device.readings?.length || 0)}
          color="text-muted-foreground"
        />
      </div>

      {/* Location Card */}
      {(lat && lng) && (
        <Card className="border-violet-500/30 bg-violet-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <MapPin className="w-4 h-4 text-violet-400" />
              <span>Starlink Location</span>
              <Badge variant="outline" className="ml-auto text-violet-400 border-violet-400/30">
                <Satellite className="w-3 h-3 mr-1" />
                Starlink
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-4">
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
              <p className="font-mono text-sm">{alt ? `${alt.toFixed(0)} m` : '—'}</p>
            </div>
            {locationDetail && (
              <>
                {locationDetail.city && (
                  <div>
                    <p className="text-xs text-muted-foreground">City</p>
                    <p className="text-sm">{String(locationDetail.city)}</p>
                  </div>
                )}
                {locationDetail.country && (
                  <div>
                    <p className="text-xs text-muted-foreground">Country</p>
                    <p className="text-sm">{String(locationDetail.country)}</p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Ping Latency Details */}
      {pingLatency && Object.keys(pingLatency).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Ping Latency Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(pingLatency).map(([key, value]) => (
                <div key={key} className="p-2 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground truncate">{key}</p>
                  <p className="font-mono text-sm">{typeof value === 'number' ? `${value.toFixed(2)} ms` : String(value)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Raw Data */}
      <RawDataCard data={starlinkData} title="All Starlink Data" />
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
  
  // Build chart data from readings
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

      {/* Resource Gauges */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ResourceGauge label="CPU" value={cpu} color="#3b82f6" />
        <ResourceGauge label="Memory" value={memory} color="#8b5cf6" />
        <ResourceGauge label="Disk" value={disk} color="#f97316" />
        <MetricCard
          icon={<Clock className="w-4 h-4" />}
          label="Uptime"
          value={uptime ? formatValue('uptime', uptime) : '—'}
          color="text-green-400"
        />
      </div>

      {/* Trend Chart */}
      {chartData.length > 1 && (
        <Card className="p-4">
          <h4 className="text-sm font-medium text-muted-foreground mb-3">Resource Usage Trend</h4>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" domain={[0, 100]} />
                <RechartsTooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Area type="monotone" dataKey="cpu" name="CPU %" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
                <Area type="monotone" dataKey="memory" name="Memory %" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} />
                <Area type="monotone" dataKey="disk" name="Disk %" stroke="#f97316" fill="#f97316" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      <RawDataCard data={systemData} title="All System Data" />
    </div>
  );
}

// =============================================
// WIFI SCANNER PANEL
// =============================================
function WifiScannerPanel({ device }: { device: DeviceGroup }) {
  const latestReading = device.latest;
  const data = latestReading?.data as Record<string, unknown> || {};
  const wifiData = (data.wifi as Record<string, unknown>) || (data.wifi_scanner as Record<string, unknown>) || data;
  
  const networks = wifiData.networks as unknown[] | undefined;
  const networkCount = wifiData.network_count as number || (networks?.length || 0);
  const scanDuration = wifiData.scan_duration_ms as number | undefined;
  
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
          <Wifi className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h3 className="font-semibold">WiFi Scanner</h3>
          <p className="text-xs text-muted-foreground font-mono">{device.device_id}</p>
        </div>
        <Badge variant="outline" className="ml-auto bg-blue-500/20 text-blue-400 border-blue-500/30">
          {networkCount} networks
        </Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <MetricCard icon={<Wifi className="w-4 h-4" />} label="Networks Found" value={String(networkCount)} color="text-blue-400" />
        <MetricCard icon={<Clock className="w-4 h-4" />} label="Scan Duration" value={scanDuration ? `${scanDuration}ms` : '—'} color="text-muted-foreground" />
        <MetricCard icon={<Activity className="w-4 h-4" />} label="Readings" value={String(device.readings?.length || 0)} color="text-muted-foreground" />
      </div>

      {/* Network List */}
      {networks && Array.isArray(networks) && networks.length > 0 && (
        <Card className="p-4">
          <h4 className="text-sm font-medium text-muted-foreground mb-3">Detected Networks</h4>
          <div className="space-y-2 max-h-[300px] overflow-auto">
            {(networks as Record<string, unknown>[]).slice(0, 20).map((network, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2">
                  <Wifi className="w-4 h-4 text-blue-400" />
                  <span className="font-mono text-sm">{String(network.ssid || network.bssid || 'Hidden')}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {network.signal && <span>{formatValue('signal', network.signal)}</span>}
                  {network.channel && <span>Ch {String(network.channel)}</span>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <RawDataCard data={wifiData} title="All WiFi Data" />
    </div>
  );
}

// =============================================
// BLUETOOTH SCANNER PANEL
// =============================================
function BluetoothScannerPanel({ device }: { device: DeviceGroup }) {
  const latestReading = device.latest;
  const data = latestReading?.data as Record<string, unknown> || {};
  const btData = (data.bluetooth as Record<string, unknown>) || (data.bluetooth_scanner as Record<string, unknown>) || data;
  
  const devices_found = btData.devices as unknown[] | undefined;
  const deviceCount = btData.device_count as number || (devices_found?.length || 0);
  
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
          <Bluetooth className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <h3 className="font-semibold">Bluetooth Scanner</h3>
          <p className="text-xs text-muted-foreground font-mono">{device.device_id}</p>
        </div>
        <Badge variant="outline" className="ml-auto bg-indigo-500/20 text-indigo-400 border-indigo-500/30">
          {deviceCount} devices
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <MetricCard icon={<Bluetooth className="w-4 h-4" />} label="Devices Found" value={String(deviceCount)} color="text-indigo-400" />
        <MetricCard icon={<Activity className="w-4 h-4" />} label="Readings" value={String(device.readings?.length || 0)} color="text-muted-foreground" />
      </div>

      {/* Device List */}
      {devices_found && Array.isArray(devices_found) && devices_found.length > 0 && (
        <Card className="p-4">
          <h4 className="text-sm font-medium text-muted-foreground mb-3">Detected Devices</h4>
          <div className="space-y-2 max-h-[300px] overflow-auto">
            {(devices_found as Record<string, unknown>[]).slice(0, 20).map((dev, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2">
                  <Bluetooth className="w-4 h-4 text-indigo-400" />
                  <span className="font-mono text-sm">{String(dev.name || dev.address || 'Unknown')}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {dev.rssi && <span>{formatValue('rssi', dev.rssi)}</span>}
                  {dev.type && <span>{String(dev.type)}</span>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <RawDataCard data={btData} title="All Bluetooth Data" />
    </div>
  );
}

// =============================================
// ADSB PANEL
// =============================================
function AdsbPanel({ device }: { device: DeviceGroup }) {
  const latestReading = device.latest;
  const data = latestReading?.data as Record<string, unknown> || {};
  const adsbData = (data.adsb as Record<string, unknown>) || (data.adsb_detector as Record<string, unknown>) || data;
  
  const aircraft = adsbData.aircraft as unknown[] | undefined;
  const aircraftCount = adsbData.aircraft_count as number || adsbData.aircraft_active as number || (aircraft?.length || 0);
  const messagesDecoded = adsbData.messages_decoded as number;
  const maxRange = adsbData.max_range_nm as number;
  
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
          <Plane className="w-5 h-5 text-cyan-400" />
        </div>
        <div>
          <h3 className="font-semibold">ADS-B Detector</h3>
          <p className="text-xs text-muted-foreground font-mono">{device.device_id}</p>
        </div>
        <Badge variant="outline" className="ml-auto bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
          {aircraftCount} aircraft
        </Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard icon={<Plane className="w-4 h-4" />} label="Aircraft Active" value={String(aircraftCount)} color="text-cyan-400" />
        <MetricCard icon={<Activity className="w-4 h-4" />} label="Messages" value={messagesDecoded ? messagesDecoded.toLocaleString() : '—'} color="text-green-400" />
        <MetricCard icon={<Signal className="w-4 h-4" />} label="Max Range" value={maxRange ? `${maxRange.toFixed(0)} nm` : '—'} color="text-amber-400" />
        <MetricCard icon={<Clock className="w-4 h-4" />} label="Readings" value={String(device.readings?.length || 0)} color="text-muted-foreground" />
      </div>

      <RawDataCard data={adsbData} title="All ADS-B Data" />
    </div>
  );
}

// =============================================
// THERMAL PROBE PANEL
// =============================================
function ThermalProbePanel({ device }: { device: DeviceGroup }) {
  const latestReading = device.latest;
  const data = latestReading?.data as Record<string, unknown> || {};
  const thermalData = (data.thermal_probe as Record<string, unknown>) || (data.thermal as Record<string, unknown>) || data;
  
  const temperature = thermalData.temperature_c as number || thermalData.temp_c as number;
  const humidity = thermalData.humidity as number;
  
  // Chart data
  const chartData = useMemo(() => {
    return device.readings.slice(-30).map(r => {
      const d = r.data as Record<string, unknown> || {};
      const th = (d.thermal_probe as Record<string, unknown>) || (d.thermal as Record<string, unknown>) || d;
      return {
        time: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        temp: (th.temperature_c as number) || (th.temp_c as number),
        humidity: th.humidity as number,
      };
    });
  }, [device.readings]);
  
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
          <Thermometer className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h3 className="font-semibold">Thermal Probe</h3>
          <p className="text-xs text-muted-foreground font-mono">{device.device_id}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4 border-amber-500/30 bg-amber-500/5">
          <div className="text-center">
            <Thermometer className="w-8 h-8 mx-auto mb-2 text-amber-400" />
            <p className="text-3xl font-bold text-amber-400">{temperature ? `${temperature.toFixed(1)}°C` : '—'}</p>
            <p className="text-xs text-muted-foreground">Temperature</p>
          </div>
        </Card>
        <Card className="p-4 border-blue-500/30 bg-blue-500/5">
          <div className="text-center">
            <Activity className="w-8 h-8 mx-auto mb-2 text-blue-400" />
            <p className="text-3xl font-bold text-blue-400">{humidity ? `${humidity.toFixed(1)}%` : '—'}</p>
            <p className="text-xs text-muted-foreground">Humidity</p>
          </div>
        </Card>
      </div>

      {chartData.length > 1 && (
        <Card className="p-4">
          <h4 className="text-sm font-medium text-muted-foreground mb-3">Temperature Trend</h4>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <RechartsTooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Line type="monotone" dataKey="temp" name="Temperature °C" stroke="#f59e0b" strokeWidth={2} dot={false} />
                {chartData.some(d => d.humidity !== undefined) && (
                  <Line type="monotone" dataKey="humidity" name="Humidity %" stroke="#3b82f6" strokeWidth={2} dot={false} />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      <RawDataCard data={thermalData} title="All Thermal Data" />
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
  
  // Get numeric keys for charting
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
        <div 
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${config.color}20` }}
        >
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

      {/* Values Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {numericEntries.map(([key, value]) => (
          <div key={key} className="p-3 rounded-lg bg-muted/30 border border-border/30">
            <p className="text-xs text-muted-foreground truncate">{formatLabel(key)}</p>
            <p className="font-mono text-sm font-medium">{formatValue(key, value)}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      {chartData.length > 1 && numericEntries.length > 0 && (
        <Card className="p-4">
          <h4 className="text-sm font-medium text-muted-foreground mb-3">Trend</h4>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <RechartsTooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                {numericEntries.slice(0, 4).map(([key], idx) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    name={formatLabel(key)}
                    stroke={CHART_COLORS[idx % CHART_COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      <RawDataCard data={data} title="All Data" />
    </div>
  );
}

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
        <div 
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(percent, 100)}%`, backgroundColor: color }}
        />
      </div>
    </Card>
  );
}

function RawDataCard({ data, title }: { data: Record<string, unknown>; title: string }) {
  const [isOpen, setIsOpen] = useState(false);
  
  const entries = Object.entries(data).filter(([k, v]) => v !== null && v !== undefined);
  
  if (entries.length === 0) return null;
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between p-4 h-auto">
            <span className="text-sm font-medium">{title}</span>
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {entries.map(([key, value]) => (
                <div key={key} className="p-2 rounded bg-muted/30 text-xs">
                  <p className="text-muted-foreground truncate">{formatLabel(key)}</p>
                  <p className="font-mono truncate" title={String(value)}>{formatValue(key, value)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

// =============================================
// MAIN COMPONENT
// =============================================
export function SensorTabs({ devices, isLoading }: SensorTabsProps) {
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

  // Sort devices by priority
  const sortedDevices = [...devices].sort((a, b) => {
    const configA = getSensorConfig(a.device_type);
    const configB = getSensorConfig(b.device_type);
    return configA.priority - configB.priority;
  });

  const defaultTab = sortedDevices[0]?.device_id || '';

  // Select appropriate panel component
  const getPanelComponent = (device: DeviceGroup) => {
    const type = device.device_type.toLowerCase();
    if (type.includes('starlink')) return <StarlinkPanel device={device} />;
    if (type.includes('system') || type.includes('monitor')) return <SystemMonitorPanel device={device} />;
    if (type.includes('wifi')) return <WifiScannerPanel device={device} />;
    if (type.includes('bluetooth') || type.includes('ble')) return <BluetoothScannerPanel device={device} />;
    if (type.includes('adsb')) return <AdsbPanel device={device} />;
    if (type.includes('thermal') || type.includes('probe') || type.includes('temp')) return <ThermalProbePanel device={device} />;
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