import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { 
  Thermometer, 
  Droplets, 
  Zap, 
  Gauge, 
  Activity,
  Cpu,
  HardDrive,
  Wifi,
  Radio,
  Satellite,
  Navigation,
  Compass,
  Database,
  Sun,
  Volume2,
  TrendingUp,
  FileJson,
  Clock,
  Copy,
  Download,
  type LucideIcon
} from "lucide-react";
import { format, parseISO, subHours } from "date-fns";
import { 
  useClientDetailStats,
  useClientLatestBatch,
  useSensorsByClientId,
  useClientTimeseries,
  useThermalProbeTimeseries,
  useArduinoSensorTimeseries,
  useClientThermalData,
  useClientStarlinkData,
  useClientSystemMonitorData,
  // New hooks for power, wifi, bluetooth
  usePowerCurrent,
  usePowerHistory,
  useWifiScan,
  useWifiStats,
  useBluetoothScan,
  useBluetoothStats,
  useBatteryStats,
} from "@/hooks/aurora";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { toast } from "sonner";

interface ClientSensorStatsProps {
  clientId?: string;
}

// Color mapping for semantic design tokens
const colorClasses: Record<string, { bg: string; text: string }> = {
  primary: { bg: 'bg-primary/20', text: 'text-primary' },
  'orange-500': { bg: 'bg-chart-1/20', text: 'text-chart-1' },
  'red-500': { bg: 'bg-destructive/20', text: 'text-destructive' },
  'blue-500': { bg: 'bg-chart-2/20', text: 'text-chart-2' },
  'yellow-500': { bg: 'bg-chart-4/20', text: 'text-chart-4' },
  'green-500': { bg: 'bg-chart-3/20', text: 'text-chart-3' },
  'purple-500': { bg: 'bg-chart-5/20', text: 'text-chart-5' },
};

// Unit conversion helpers
function cToF(celsius: number | null): number | null {
  if (celsius === null) return null;
  return (celsius * 9/5) + 32;
}

function metersToFeet(meters: number | null): number | null {
  if (meters === null) return null;
  return meters * 3.28084;
}

function bpsToMbps(bps: number | null): number | null {
  if (bps === null) return null;
  return bps / 1000000;
}

// Stat card component with dual units support
function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  unit, 
  color = "primary",
  secondaryValue,
  secondaryUnit,
}: { 
  icon: LucideIcon; 
  label: string; 
  value: string | number | null | undefined; 
  unit: string;
  color?: string;
  secondaryValue?: string | number | null;
  secondaryUnit?: string;
}) {
  const displayValue = value !== null && value !== undefined ? value : '--';
  const colorClass = colorClasses[color] || colorClasses.primary;
  
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
      <div className={`w-10 h-10 rounded-lg ${colorClass.bg} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-5 h-5 ${colorClass.text}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <p className="text-lg font-bold">
          {displayValue}
          <span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span>
        </p>
        {secondaryValue !== undefined && secondaryValue !== null && secondaryUnit && (
          <p className="text-xs text-muted-foreground">
            {secondaryValue} {secondaryUnit}
          </p>
        )}
      </div>
    </div>
  );
}

// Helper to safely extract numeric value from nested objects
function extractNumber(data: unknown, ...keys: string[]): number | null {
  if (!data || typeof data !== 'object') return null;
  const obj = data as Record<string, unknown>;
  
  for (const key of keys) {
    if (typeof obj[key] === 'number' && !isNaN(obj[key] as number)) {
      return obj[key] as number;
    }
    // Check nested objects
    for (const nestedKey of Object.keys(obj)) {
      const nested = obj[nestedKey];
      if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
        const nestedObj = nested as Record<string, unknown>;
        if (typeof nestedObj[key] === 'number' && !isNaN(nestedObj[key] as number)) {
          return nestedObj[key] as number;
        }
      }
    }
  }
  return null;
}

// Extract sensor data from latest batch readings
interface SensorValues {
  // System Info
  hostname: string | null;
  uptimeDays: number | null;
  uptimeSeconds: number | null;
  osName: string | null;
  model: string | null;
  cpuTempC: number | null;
  cpuTempF: number | null;
  // Environmental
  thermalTempC: number | null;
  thermalTempF: number | null;
  arduinoTempC: number | null;
  arduinoTempF: number | null;
  humidity: number | null;
  pressure: number | null;
  pressureInHg: number | null;
  light: number | null;
  sound: number | null;
  // Starlink
  starlinkPower: number | null;
  starlinkLatency: number | null;
  starlinkDownloadMbps: number | null;
  starlinkUploadMbps: number | null;
  starlinkObstruction: number | null;
  starlinkUptimeS: number | null;
  // System Performance
  cpuPercent: number | null;
  memoryPercent: number | null;
  diskPercent: number | null;
  // Location
  latitude: number | null;
  longitude: number | null;
  altitudeM: number | null;
  altitudeFt: number | null;
  satellites: number | null;
  // Connectivity
  wifiNetworks: number | null;
  wifiSignal: number | null;
  bluetoothDevices: number | null;
  wifiTrackedNetworks: number | null;
}

function extractSensorValuesFromBatch(batchData: unknown): SensorValues {
  const defaults: SensorValues = {
    // System Info
    hostname: null, uptimeDays: null, uptimeSeconds: null, osName: null, model: null,
    cpuTempC: null, cpuTempF: null,
    // Environmental
    thermalTempC: null, thermalTempF: null, arduinoTempC: null, arduinoTempF: null,
    humidity: null, pressure: null, pressureInHg: null, light: null, sound: null,
    // Starlink
    starlinkPower: null, starlinkLatency: null, starlinkDownloadMbps: null, 
    starlinkUploadMbps: null, starlinkObstruction: null, starlinkUptimeS: null,
    // System Performance
    cpuPercent: null, memoryPercent: null, diskPercent: null,
    // Location
    latitude: null, longitude: null, altitudeM: null, altitudeFt: null, satellites: null,
    // Connectivity
    wifiNetworks: null, wifiSignal: null, bluetoothDevices: null, wifiTrackedNetworks: null,
  };
  
  if (!batchData || typeof batchData !== 'object') return defaults;
  
  const batch = batchData as { batch?: { json_content?: { readings?: Array<{ sensors?: Record<string, unknown> }> } } };
  const readings = batch.batch?.json_content?.readings;
  
  if (!readings || !Array.isArray(readings)) return defaults;
  
  // Find first reading with sensors
  const reading = readings.find(r => r.sensors && Object.keys(r.sensors).length > 0);
  if (!reading?.sensors) return defaults;
  
  const sensors = reading.sensors;
  
  // Extract thermal probe data - check multiple possible sensor keys
  const thermalKeys = ['thermal_probe_1', 'thermal_probe', 'thermalProbe', 'thermal'];
  for (const key of thermalKeys) {
    const thermal = sensors[key] as Record<string, unknown> | undefined;
    if (thermal && defaults.thermalTempC === null) {
      // Try direct properties - prioritize F value if available
      defaults.thermalTempF = extractNumber(thermal, 'temperature_f', 'temp_f');
      defaults.thermalTempC = extractNumber(thermal, 'temperature_c', 'temp_c', 'probe_c', 'ambient_c', 'temperature', 'value', 'temp');
      
      // Check for nested 'probe' object
      const probe = thermal['probe'] as Record<string, unknown> | undefined;
      if (probe && defaults.thermalTempC === null) {
        defaults.thermalTempC = extractNumber(probe, 'temp_c', 'temperature', 'value');
        defaults.thermalTempF = extractNumber(probe, 'temp_f', 'temperature_f');
      }
      
      // Check for 'readings' array inside thermal
      const thermalReadings = thermal['readings'] as unknown[] | undefined;
      if (thermalReadings && thermalReadings.length > 0 && defaults.thermalTempC === null) {
        const firstReading = thermalReadings[0] as Record<string, unknown>;
        defaults.thermalTempC = extractNumber(firstReading, 'temp_c', 'temperature', 'value');
        defaults.thermalTempF = extractNumber(firstReading, 'temp_f', 'temperature_f');
      }
      
      // Calculate missing unit
      if (defaults.thermalTempC !== null && defaults.thermalTempF === null) {
        defaults.thermalTempF = cToF(defaults.thermalTempC);
      }
      
      if (defaults.thermalTempC !== null) break;
    }
  }
  
  // Also check for thermal probes directly in sensors root with numbered keys
  for (const sensorKey of Object.keys(sensors)) {
    if (sensorKey.toLowerCase().includes('thermal') && defaults.thermalTempC === null) {
      const thermalData = sensors[sensorKey] as Record<string, unknown> | undefined;
      if (thermalData) {
        defaults.thermalTempF = extractNumber(thermalData, 'temperature_f', 'temp_f');
        defaults.thermalTempC = extractNumber(thermalData, 'temperature_c', 'temp_c', 'probe_c', 'ambient_c', 'temperature', 'value');
        if (defaults.thermalTempC !== null && defaults.thermalTempF === null) {
          defaults.thermalTempF = cToF(defaults.thermalTempC);
        }
      }
    }
  }
  
  // Extract Arduino data
  const arduino = sensors['arduino_1'] as Record<string, unknown> | undefined;
  if (arduino) {
    const th = arduino['th'] as Record<string, unknown> | undefined;
    const bmp = arduino['bmp'] as Record<string, unknown> | undefined;
    const analog = arduino['analog'] as Record<string, unknown> | undefined;
    
    if (th) {
      defaults.arduinoTempC = extractNumber(th, 'temp_c', 'temperature');
      defaults.arduinoTempF = cToF(defaults.arduinoTempC);
      defaults.humidity = extractNumber(th, 'hum_pct', 'humidity');
    }
    if (bmp) {
      const pressHpa = extractNumber(bmp, 'press_hpa', 'pressure');
      defaults.pressure = pressHpa;
      defaults.pressureInHg = pressHpa !== null ? pressHpa * 0.02953 : null;
      if (!defaults.arduinoTempC) {
        defaults.arduinoTempC = extractNumber(bmp, 'temp_c');
        defaults.arduinoTempF = cToF(defaults.arduinoTempC);
      }
    }
    if (analog) {
      defaults.light = extractNumber(analog, 'light_raw', 'light');
      defaults.sound = extractNumber(analog, 'sound_raw', 'sound');
    }
  }
  
  // Extract Starlink data - check multiple possible sensor keys
  const starlinkKeys = ['starlink_dish_1', 'starlink_dish', 'starlink_dish_comprehensive', 'starlink', 'starlink_1'];
  for (const key of starlinkKeys) {
    const starlink = sensors[key] as Record<string, unknown> | undefined;
    if (starlink && defaults.starlinkPower === null) {
      // Try direct properties
      defaults.starlinkPower = extractNumber(starlink, 'power_watts', 'avg_power_watts', 'power', 'power_w');
      defaults.starlinkLatency = extractNumber(starlink, 'pop_ping_latency_ms', 'latency_ms', 'latency', 'ping_ms');
      defaults.starlinkObstruction = extractNumber(starlink, 'obstruction_percent', 'obstruction_pct', 'obstruction');
      defaults.starlinkUptimeS = extractNumber(starlink, 'uptime_s', 'uptime', 'uptime_seconds');
      const dlBps = extractNumber(starlink, 'downlink_throughput_bps', 'download_bps', 'dl_throughput');
      const ulBps = extractNumber(starlink, 'uplink_throughput_bps', 'upload_bps', 'ul_throughput');
      defaults.starlinkDownloadMbps = bpsToMbps(dlBps);
      defaults.starlinkUploadMbps = bpsToMbps(ulBps);
      
      // Check for nested 'starlink' object inside
      const nestedStarlink = starlink['starlink'] as Record<string, unknown> | undefined;
      if (nestedStarlink) {
        if (defaults.starlinkPower === null) {
          defaults.starlinkPower = extractNumber(nestedStarlink, 'power_watts', 'avg_power_watts', 'power');
        }
        if (defaults.starlinkLatency === null) {
          defaults.starlinkLatency = extractNumber(nestedStarlink, 'pop_ping_latency_ms', 'latency_ms', 'ping_ms');
          // Check ping_latency object
          const pingLatency = nestedStarlink['ping_latency'] as Record<string, unknown> | undefined;
          if (pingLatency && defaults.starlinkLatency === null) {
            defaults.starlinkLatency = extractNumber(pingLatency, 'Mean RTT, drop == 0', 'Mean RTT, drop < 1', 'mean_rtt');
          }
        }
        if (defaults.starlinkObstruction === null) {
          defaults.starlinkObstruction = extractNumber(nestedStarlink, 'obstruction_percent', 'obstruction_pct');
        }
        if (defaults.starlinkUptimeS === null) {
          defaults.starlinkUptimeS = extractNumber(nestedStarlink, 'uptime_s', 'uptime');
        }
        if (defaults.starlinkDownloadMbps === null) {
          const dl = extractNumber(nestedStarlink, 'downlink_throughput_bps');
          defaults.starlinkDownloadMbps = bpsToMbps(dl);
        }
        if (defaults.starlinkUploadMbps === null) {
          const ul = extractNumber(nestedStarlink, 'uplink_throughput_bps');
          defaults.starlinkUploadMbps = bpsToMbps(ul);
        }
      }
      
      // Check for ping_latency at root level
      const rootPingLatency = starlink['ping_latency'] as Record<string, unknown> | undefined;
      if (rootPingLatency && defaults.starlinkLatency === null) {
        defaults.starlinkLatency = extractNumber(rootPingLatency, 'Mean RTT, drop == 0', 'Mean RTT, drop < 1', 'mean_rtt');
      }
      
      if (defaults.starlinkPower !== null) break;
    }
  }
  
  // Also check for starlink in any sensor key containing 'starlink'
  for (const sensorKey of Object.keys(sensors)) {
    if (sensorKey.toLowerCase().includes('starlink') && defaults.starlinkPower === null) {
      const starlinkData = sensors[sensorKey] as Record<string, unknown> | undefined;
      if (starlinkData) {
        defaults.starlinkPower = extractNumber(starlinkData, 'power_watts', 'avg_power_watts', 'power');
        defaults.starlinkLatency = extractNumber(starlinkData, 'pop_ping_latency_ms', 'latency_ms', 'latency', 'ping_ms');
        defaults.starlinkObstruction = extractNumber(starlinkData, 'obstruction_percent', 'obstruction_pct');
        defaults.starlinkUptimeS = extractNumber(starlinkData, 'uptime_s', 'uptime');
        const dl = extractNumber(starlinkData, 'downlink_throughput_bps', 'download_bps');
        const ul = extractNumber(starlinkData, 'uplink_throughput_bps', 'upload_bps');
        defaults.starlinkDownloadMbps = bpsToMbps(dl);
        defaults.starlinkUploadMbps = bpsToMbps(ul);
      }
    }
  }
  
  // Also check for starlink in any sensor key containing 'starlink'
  for (const sensorKey of Object.keys(sensors)) {
    if (sensorKey.toLowerCase().includes('starlink') && defaults.starlinkPower === null) {
      const starlinkData = sensors[sensorKey] as Record<string, unknown> | undefined;
      if (starlinkData) {
        defaults.starlinkPower = extractNumber(starlinkData, 'power_watts', 'avg_power_watts', 'power');
        defaults.starlinkLatency = extractNumber(starlinkData, 'pop_ping_latency_ms', 'latency_ms', 'latency');
        const dl = extractNumber(starlinkData, 'downlink_throughput_bps', 'download_bps');
        const ul = extractNumber(starlinkData, 'uplink_throughput_bps', 'upload_bps');
        defaults.starlinkDownloadMbps = bpsToMbps(dl);
        defaults.starlinkUploadMbps = bpsToMbps(ul);
      }
    }
  }
  
  // Extract System Monitor data
  const systemMonitor = sensors['system_monitor_1'] as Record<string, unknown> | undefined;
  if (systemMonitor) {
    // Extract system info (hostname, uptime, os, model)
    const systemInfo = systemMonitor['system'] as Record<string, unknown> | undefined;
    if (systemInfo) {
      defaults.hostname = typeof systemInfo['hostname'] === 'string' ? systemInfo['hostname'] : null;
      defaults.uptimeDays = extractNumber(systemInfo, 'uptime_days');
      defaults.uptimeSeconds = extractNumber(systemInfo, 'uptime_seconds');
      defaults.osName = typeof systemInfo['os'] === 'string' ? systemInfo['os'] : null;
      defaults.model = typeof systemInfo['model'] === 'string' ? systemInfo['model'] : null;
    }
    
    // Check direct properties first
    defaults.cpuPercent = extractNumber(systemMonitor, 'cpu_percent', 'cpu_usage', 'cpu');
    defaults.memoryPercent = extractNumber(systemMonitor, 'memory_percent', 'mem_percent');
    defaults.diskPercent = extractNumber(systemMonitor, 'disk_percent', 'disk_usage');
    
    // Check nested 'performance' object (actual API structure)
    const performance = systemMonitor['performance'] as Record<string, unknown> | undefined;
    if (performance) {
      if (defaults.cpuPercent === null) {
        defaults.cpuPercent = extractNumber(performance, 'cpu_usage_percent', 'cpu_percent', 'cpu_usage');
      }
      // CPU Temperature
      defaults.cpuTempC = extractNumber(performance, 'cpu_temp_celsius', 'cpu_temp');
      const cpuTempF = extractNumber(performance, 'cpu_temp_fahrenheit');
      defaults.cpuTempF = cpuTempF !== null ? cpuTempF : cToF(defaults.cpuTempC);
      
      // Check nested memory object
      const memoryNested = performance['memory'] as Record<string, unknown> | undefined;
      if (memoryNested && defaults.memoryPercent === null) {
        defaults.memoryPercent = extractNumber(memoryNested, 'usage_percent', 'percent', 'used_percent');
      }
    }
    
    // Legacy structure checks
    const cpu = systemMonitor['cpu'] as Record<string, unknown> | undefined;
    const memory = systemMonitor['memory'] as Record<string, unknown> | undefined;
    const disk = systemMonitor['disk'] as Record<string, unknown> | undefined;
    
    if (cpu && defaults.cpuPercent === null) {
      defaults.cpuPercent = extractNumber(cpu, 'percent', 'usage', 'usage_percent');
    }
    if (memory && defaults.memoryPercent === null) {
      defaults.memoryPercent = extractNumber(memory, 'percent', 'usage', 'usage_percent');
    }
    if (disk && defaults.diskPercent === null) {
      defaults.diskPercent = extractNumber(disk, 'percent', 'usage', 'usage_percent');
    }
  }
  
  // Extract WiFi data
  const wifi = sensors['wifi_scanner_1'] as Record<string, unknown> | undefined;
  if (wifi) {
    // Direct count property
    defaults.wifiNetworks = extractNumber(wifi, 'networks_found');
    defaults.wifiTrackedNetworks = extractNumber(wifi, 'tracked_networks_count');
    
    const networks = wifi['networks'] as unknown[] | undefined;
    if (networks) {
      if (defaults.wifiNetworks === null) {
        defaults.wifiNetworks = networks.length;
      }
      // Get best signal (use rssi_dbm from actual API)
      const signals = networks.map(n => extractNumber(n, 'rssi_dbm', 'signal', 'rssi', 'signal_strength')).filter(s => s !== null) as number[];
      if (signals.length > 0) {
        defaults.wifiSignal = Math.max(...signals);
      }
    }
  }
  
  // Extract Bluetooth data
  const bluetooth = sensors['bluetooth_scanner_1'] as Record<string, unknown> | undefined;
  if (bluetooth) {
    // Use tracked_devices_count which is the actual count from API
    defaults.bluetoothDevices = extractNumber(bluetooth, 'tracked_devices_count', 'devices_found', 'ble_devices_found');
    if (defaults.bluetoothDevices === null) {
      const devices = bluetooth['devices'] as unknown[] | undefined;
      if (devices) {
        defaults.bluetoothDevices = devices.length;
      }
    }
  }
  
  // Extract GPS data
  const gps = sensors['gps_1'] as Record<string, unknown> | undefined;
  if (gps) {
    defaults.latitude = extractNumber(gps, 'latitude', 'lat');
    defaults.longitude = extractNumber(gps, 'longitude', 'lng', 'lon');
    defaults.altitudeM = extractNumber(gps, 'altitude', 'alt');
    defaults.altitudeFt = metersToFeet(defaults.altitudeM);
    defaults.satellites = extractNumber(gps, 'satellites', 'sats', 'num_satellites');
  }
  
  return defaults;
}

// Extract sensor values from readings API response
function extractFromReadingsApi(readings: unknown[]): Partial<SensorValues> {
  const values: Partial<SensorValues> = {};
  
  if (!readings || !Array.isArray(readings) || readings.length === 0) return values;
  
  // Get the latest reading (first one since sorted desc)
  const latestReading = readings[0] as { measurement?: string; data?: unknown };
  
  // Parse the measurement JSON string
  let measurementData: Record<string, unknown> = {};
  if (typeof latestReading.measurement === 'string') {
    try {
      measurementData = JSON.parse(latestReading.measurement);
    } catch { /* ignore parse error */ }
  } else if (latestReading.data && typeof latestReading.data === 'object') {
    measurementData = latestReading.data as Record<string, unknown>;
  }
  
  return measurementData;
}

// =============================================
// CURRENT TAB COMPONENT
// =============================================
function CurrentTab({ 
  sensorValues, 
  isLoading,
  batchTimestamp,
  totalReadings,
  totalDevices,
  sensorTypesCount,
  sensorBreakdown,
  clientStats
}: { 
  sensorValues: SensorValues;
  isLoading: boolean;
  batchTimestamp: string | null;
  totalReadings: number;
  totalDevices: number;
  sensorTypesCount: number;
  sensorBreakdown: Array<{ sensor_type: string; reading_count: number; device_count: number }>;
  clientStats: unknown;
}) {
  // Format uptime nicely
  const formatUptime = (days: number | null, seconds: number | null): string => {
    if (days !== null) {
      const wholeDays = Math.floor(days);
      const hours = Math.round((days - wholeDays) * 24);
      return `${wholeDays}d ${hours}h`;
    }
    if (seconds !== null) {
      const d = Math.floor(seconds / 86400);
      const h = Math.floor((seconds % 86400) / 3600);
      return `${d}d ${h}h`;
    }
    return '--';
  };

  return (
    <div className="space-y-6">
      {/* System Overview with Hostname & Uptime */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Database className="w-4 h-4 text-primary" />
              Client Overview
            </CardTitle>
            <div className="flex gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs">
                {totalReadings.toLocaleString()} readings
              </Badge>
              <Badge variant="outline" className="text-xs">
                {totalDevices} devices
              </Badge>
              <Badge variant="outline" className="text-xs">
                {sensorTypesCount} sensor types
              </Badge>
              {batchTimestamp && (
                <Badge variant="secondary" className="text-xs">
                  Last: {batchTimestamp}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50 col-span-2">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Cpu className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">Hostname</p>
                <p className="text-lg font-bold truncate">{sensorValues.hostname || '--'}</p>
                {sensorValues.model && (
                  <p className="text-xs text-muted-foreground truncate">{sensorValues.model}</p>
                )}
              </div>
            </div>
            <StatCard 
              icon={Clock} 
              label="Uptime" 
              value={formatUptime(sensorValues.uptimeDays, sensorValues.uptimeSeconds)} 
              unit="" 
              color="green-500" 
            />
            <StatCard 
              icon={Thermometer} 
              label="CPU Temp" 
              value={sensorValues.cpuTempF?.toFixed(1)} 
              unit="°F" 
              color="orange-500"
              secondaryValue={sensorValues.cpuTempC?.toFixed(1)}
              secondaryUnit="°C"
            />
            <StatCard icon={Cpu} label="CPU Usage" value={sensorValues.cpuPercent?.toFixed(0)} unit="%" color="blue-500" />
            <StatCard icon={HardDrive} label="Memory" value={sensorValues.memoryPercent?.toFixed(0)} unit="%" color="purple-500" />
          </div>
        </CardContent>
      </Card>

      {/* Environmental Sensors */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Thermometer className="w-4 h-4 text-chart-1" />
            Environmental Sensors (Latest)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-20 bg-muted/30 animate-pulse rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <StatCard 
                icon={Thermometer} 
                label="Thermal Probe" 
                value={sensorValues.thermalTempF?.toFixed(1)} 
                unit="°F" 
                color="orange-500"
                secondaryValue={sensorValues.thermalTempC?.toFixed(1)}
                secondaryUnit="°C"
              />
              <StatCard 
                icon={Thermometer} 
                label="Arduino Temp" 
                value={sensorValues.arduinoTempF?.toFixed(1)} 
                unit="°F" 
                color="red-500"
                secondaryValue={sensorValues.arduinoTempC?.toFixed(1)}
                secondaryUnit="°C"
              />
              <StatCard icon={Droplets} label="Humidity" value={sensorValues.humidity?.toFixed(1)} unit="%" color="blue-500" />
              <StatCard 
                icon={Gauge} 
                label="Pressure" 
                value={sensorValues.pressureInHg?.toFixed(2)} 
                unit="inHg" 
                color="purple-500"
                secondaryValue={sensorValues.pressure?.toFixed(0)}
                secondaryUnit="hPa"
              />
              <StatCard icon={Sun} label="Light Level" value={sensorValues.light} unit="" color="yellow-500" />
              <StatCard icon={Volume2} label="Sound Level" value={sensorValues.sound} unit="" color="green-500" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Starlink & Connectivity */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Satellite className="w-4 h-4 text-chart-4" />
            Starlink & Connectivity (Latest)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-20 bg-muted/30 animate-pulse rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              <StatCard icon={Zap} label="Starlink Power" value={sensorValues.starlinkPower?.toFixed(0)} unit="W" color="yellow-500" />
              <StatCard icon={Activity} label="Starlink Latency" value={sensorValues.starlinkLatency?.toFixed(0)} unit="ms" color="blue-500" />
              <StatCard icon={TrendingUp} label="Download" value={sensorValues.starlinkDownloadMbps?.toFixed(1)} unit="Mbps" color="green-500" />
              <StatCard icon={TrendingUp} label="Upload" value={sensorValues.starlinkUploadMbps?.toFixed(1)} unit="Mbps" color="primary" />
              <StatCard icon={Satellite} label="Obstruction" value={sensorValues.starlinkObstruction?.toFixed(1)} unit="%" color="orange-500" />
              <StatCard icon={Clock} label="Starlink Uptime" value={sensorValues.starlinkUptimeS ? Math.floor(sensorValues.starlinkUptimeS / 3600) : null} unit="hrs" color="purple-500" />
              <StatCard icon={Wifi} label="WiFi Networks" value={sensorValues.wifiNetworks} unit="" color="green-500" />
              <StatCard icon={Radio} label="BT Tracked" value={sensorValues.bluetoothDevices} unit="" color="purple-500" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Location */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Navigation className="w-4 h-4 text-chart-3" />
            Location (Latest)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-20 bg-muted/30 animate-pulse rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              <StatCard icon={Navigation} label="Latitude" value={sensorValues.latitude?.toFixed(6)} unit="°" color="green-500" />
              <StatCard icon={Compass} label="Longitude" value={sensorValues.longitude?.toFixed(6)} unit="°" color="green-500" />
              <StatCard 
                icon={Satellite} 
                label="Altitude" 
                value={sensorValues.altitudeFt?.toFixed(0)} 
                unit="ft" 
                color="primary"
                secondaryValue={sensorValues.altitudeM?.toFixed(0)}
                secondaryUnit="m"
              />
              <StatCard icon={Navigation} label="GPS Satellites" value={sensorValues.satellites} unit="" color="blue-500" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sensor Breakdown */}
      {sensorBreakdown.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Sensor Breakdown (24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
              {sensorBreakdown.slice(0, 12).map((sensor) => (
                <div key={sensor.sensor_type} className="p-3 rounded-lg bg-muted/30 border border-border/50">
                  <p className="text-xs text-muted-foreground capitalize truncate">
                    {(sensor.sensor_type || 'unknown').replace(/_/g, ' ')}
                  </p>
                  <p className="text-xl font-bold">{(sensor.reading_count || 0).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">
                    {sensor.device_count || 0} device{sensor.device_count !== 1 ? 's' : ''}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Devices */}
      {clientStats && typeof clientStats === 'object' && 'recent_devices' in clientStats && 
       Array.isArray((clientStats as { recent_devices?: unknown[] }).recent_devices) && 
       ((clientStats as { recent_devices: unknown[] }).recent_devices).length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Database className="w-4 h-4 text-primary" />
              Recent Devices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {((clientStats as { recent_devices: Array<{ device_id: string; sensor_type?: string; reading_count?: number; last_seen?: string }> }).recent_devices).slice(0, 8).map((device) => (
                <div key={device.device_id} className="p-3 rounded-lg bg-muted/30 border border-border/50">
                  <p className="text-sm font-medium truncate">{device.device_id}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {(device.sensor_type || 'unknown').replace(/_/g, ' ')}
                  </p>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs text-muted-foreground">
                      {(device.reading_count || 0).toLocaleString()} readings
                    </span>
                    {device.last_seen && (
                      <span className="text-xs text-muted-foreground">
                        {(() => {
                          try { return format(parseISO(device.last_seen), 'HH:mm'); } catch { return ''; }
                        })()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// =============================================
// TREND TAB COMPONENT
// =============================================
function TrendTab({ 
  sensorBreakdown,
  clientStats,
  clientId,
}: { 
  sensorBreakdown: Array<{ sensor_type: string; reading_count: number; device_count: number; first_reading?: string; last_reading?: string }>;
  clientStats: unknown;
  clientId: string;
}) {
  // Fetch real historical timeseries data
  const { data: clientTimeseries, isLoading: timeseriesLoading } = useClientTimeseries(clientId, 24);
  const { data: thermalData, isLoading: thermalLoading } = useThermalProbeTimeseries(24, clientId);
  const { data: arduinoData, isLoading: arduinoLoading } = useArduinoSensorTimeseries(24, clientId);

  // Process timeseries data into hourly buckets for charting
  const trendData = useMemo(() => {
    const hours = 24;
    const data: Record<string, unknown>[] = [];
    const now = new Date();
    
    // Create hour buckets
    const hourBuckets: Record<string, Record<string, number>> = {};
    for (let i = hours; i >= 0; i--) {
      const time = subHours(now, i);
      const hourKey = format(time, 'HH:00');
      hourBuckets[hourKey] = {};
    }
    
    // Process client timeseries data if available
    if (clientTimeseries?.timeseries && clientTimeseries.timeseries.length > 0) {
      clientTimeseries.timeseries.forEach((point) => {
        try {
          const timestamp = parseISO(point.timestamp);
          const hourKey = format(timestamp, 'HH:00');
          if (hourBuckets[hourKey]) {
            const sensorType = point.sensor_type || 'unknown';
            hourBuckets[hourKey][sensorType] = (hourBuckets[hourKey][sensorType] || 0) + (point.reading_count || 1);
          }
        } catch { /* ignore invalid timestamps */ }
      });
    }
    
    // Process thermal probe readings
    if (thermalData?.readings && thermalData.readings.length > 0) {
      thermalData.readings.forEach((reading) => {
        try {
          const timestamp = parseISO(reading.timestamp);
          const hourKey = format(timestamp, 'HH:00');
          if (hourBuckets[hourKey]) {
            hourBuckets[hourKey]['thermal_probe'] = (hourBuckets[hourKey]['thermal_probe'] || 0) + 1;
          }
        } catch { /* ignore */ }
      });
    }
    
    // Process arduino readings
    if (arduinoData?.readings && arduinoData.readings.length > 0) {
      arduinoData.readings.forEach((reading) => {
        try {
          const timestamp = parseISO(reading.timestamp);
          const hourKey = format(timestamp, 'HH:00');
          if (hourBuckets[hourKey]) {
            hourBuckets[hourKey]['arduino'] = (hourBuckets[hourKey]['arduino'] || 0) + 1;
          }
        } catch { /* ignore */ }
      });
    }
    
    // If no real data, fall back to estimated distribution from sensor breakdown
    const hasRealData = Object.values(hourBuckets).some(bucket => Object.keys(bucket).length > 0);
    
    // Build chart data
    for (let i = hours; i >= 0; i--) {
      const time = subHours(now, i);
      const hourKey = format(time, 'HH:00');
      const bucket = hourBuckets[hourKey];
      
      const point: Record<string, unknown> = {
        time: hourKey,
        hour: i,
      };
      
      if (hasRealData) {
        // Use real data from buckets
        sensorBreakdown.slice(0, 5).forEach((sensor) => {
          point[sensor.sensor_type] = bucket[sensor.sensor_type] || 0;
        });
      } else {
        // Fallback to estimated distribution
        sensorBreakdown.slice(0, 5).forEach((sensor) => {
          const baseValue = Math.round((sensor.reading_count || 0) / hours);
          // Use hour index for deterministic variation instead of random
          const variation = 0.7 + (Math.sin(i * 0.5 + sensor.sensor_type.length) * 0.3 + 0.3);
          point[sensor.sensor_type] = Math.round(baseValue * variation);
        });
      }
      
      data.push(point);
    }
    
    return data;
  }, [clientTimeseries, thermalData, arduinoData, sensorBreakdown]);

  const isLoading = timeseriesLoading || thermalLoading || arduinoLoading;
  const hasRealData = (clientTimeseries?.timeseries?.length || 0) > 0 || 
                      (thermalData?.readings?.length || 0) > 0 || 
                      (arduinoData?.readings?.length || 0) > 0;

  const chartColors = [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
  ];

  return (
    <div className="space-y-6">
      {/* Readings Over Time */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Readings Over Time (24h)
            </CardTitle>
            <div className="flex items-center gap-2">
              {isLoading && (
                <Badge variant="outline" className="text-xs animate-pulse">
                  Loading...
                </Badge>
              )}
              <Badge variant={hasRealData ? "default" : "secondary"} className="text-xs">
                {hasRealData ? 'Live Data' : 'Estimated'}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-[300px] flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <Activity className="w-8 h-8 text-muted-foreground animate-pulse" />
                <p className="text-sm text-muted-foreground">Loading timeseries data...</p>
              </div>
            </div>
          ) : (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="time" 
                    className="text-xs" 
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    className="text-xs" 
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  {sensorBreakdown.slice(0, 5).map((sensor, idx) => (
                    <Area
                      key={sensor.sensor_type}
                      type="monotone"
                      dataKey={sensor.sensor_type}
                      name={sensor.sensor_type.replace(/_/g, ' ')}
                      stackId="1"
                      stroke={chartColors[idx % chartColors.length]}
                      fill={chartColors[idx % chartColors.length]}
                      fillOpacity={0.6}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sensor Distribution */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Sensor Activity Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="time" 
                  className="text-xs" 
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  className="text-xs" 
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                {sensorBreakdown.slice(0, 5).map((sensor, idx) => (
                  <Line
                    key={sensor.sensor_type}
                    type="monotone"
                    dataKey={sensor.sensor_type}
                    name={sensor.sensor_type.replace(/_/g, ' ')}
                    stroke={chartColors[idx % chartColors.length]}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Sensor Stats Summary */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Database className="w-4 h-4 text-primary" />
            Sensor Statistics (24h Summary)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sensorBreakdown.map((sensor) => (
              <div key={sensor.sensor_type} className="p-4 rounded-lg bg-muted/30 border border-border/50">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="text-sm font-medium capitalize">{sensor.sensor_type.replace(/_/g, ' ')}</h4>
                  <Badge variant="outline" className="text-xs">{sensor.device_count} devices</Badge>
                </div>
                <p className="text-2xl font-bold">{sensor.reading_count.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">readings</p>
                {sensor.last_reading && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Last: {(() => {
                      try { return format(parseISO(sensor.last_reading), 'HH:mm MMM d'); } catch { return sensor.last_reading; }
                    })()}
                  </p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// =============================================
// DETAILS TAB COMPONENT
// =============================================
function DetailsTab({ 
  latestBatch,
  clientStats,
  sensorsByClient 
}: { 
  latestBatch: unknown;
  clientStats: unknown;
  sensorsByClient: unknown;
}) {
  const [activeJson, setActiveJson] = useState<'batch' | 'stats' | 'sensors'>('batch');

  const jsonData = useMemo(() => {
    switch (activeJson) {
      case 'batch':
        return latestBatch;
      case 'stats':
        return clientStats;
      case 'sensors':
        return sensorsByClient;
      default:
        return null;
    }
  }, [activeJson, latestBatch, clientStats, sensorsByClient]);

  const handleCopy = () => {
    if (jsonData) {
      navigator.clipboard.writeText(JSON.stringify(jsonData, null, 2));
      toast.success('Copied to clipboard');
    }
  };

  const handleDownload = () => {
    if (jsonData) {
      const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeJson}-data.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Downloaded JSON file');
    }
  };

  return (
    <div className="space-y-4">
      {/* JSON Source Selector */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileJson className="w-4 h-4 text-primary" />
              Raw JSON Data
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCopy}>
                <Copy className="w-4 h-4 mr-1" />
                Copy
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="w-4 h-4 mr-1" />
                Download
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex gap-2 mb-4">
            <Button 
              variant={activeJson === 'batch' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setActiveJson('batch')}
            >
              Latest Batch
            </Button>
            <Button 
              variant={activeJson === 'stats' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setActiveJson('stats')}
            >
              Client Stats
            </Button>
            <Button 
              variant={activeJson === 'sensors' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setActiveJson('sensors')}
            >
              Sensors by Client
            </Button>
          </div>
          
          <ScrollArea className="h-[500px] w-full rounded-lg border border-border bg-muted/30">
            <pre className="p-4 text-xs font-mono whitespace-pre-wrap break-all">
              {jsonData ? JSON.stringify(jsonData, null, 2) : 'No data available'}
            </pre>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

// =============================================
// MAIN COMPONENT
// =============================================
export default function ClientSensorStats({ clientId }: ClientSensorStatsProps) {
  const effectiveClientId = clientId && clientId !== 'all' ? clientId : '';
  
  // Use client detail stats for aggregates (/api/stats/client/{id})
  const { data: clientStats, isLoading: clientStatsLoading } = useClientDetailStats(effectiveClientId || null, 24);
  
  // Use latest batch for real-time sensor values (/api/clients/{id}/latest-batch)
  const { data: latestBatch, isLoading: batchLoading } = useClientLatestBatch(effectiveClientId || null, true);

  // Use sensors by client for accurate sensor breakdown (/api/stats/sensors/by-client/{id})
  const { data: sensorsByClient, isLoading: sensorsLoading } = useSensorsByClientId(effectiveClientId || null, 24);

  // Fallback data from readings API
  const { data: thermalData } = useClientThermalData(effectiveClientId);
  const { data: starlinkData } = useClientStarlinkData(effectiveClientId);
  const { data: systemData } = useClientSystemMonitorData(effectiveClientId);

  // New hooks for power, wifi, and bluetooth data
  const { data: powerCurrent } = usePowerCurrent(effectiveClientId || null);
  const { data: powerHistory } = usePowerHistory({ clientId: effectiveClientId || null, hours: 24, limit: 100 });
  // useWifiScan from clients.ts takes a string, returns { networks: WifiNetwork[] }
  const { data: wifiScanData } = useWifiScan(effectiveClientId || '');
  const { data: wifiStats } = useWifiStats(effectiveClientId || null);
  // useBluetoothScan takes options object
  const { data: btScanData } = useBluetoothScan({ clientId: effectiveClientId || null, hours: 24, limit: 100 });
  const { data: btStats } = useBluetoothStats(effectiveClientId || null);
  const { data: batteryStats } = useBatteryStats(effectiveClientId || null);

  // Process new data sources
  const connectivityData = useMemo(() => {
    // Power data
    const currentPower = powerCurrent?.[0]?.power_watts ?? null;
    const currentVoltage = powerCurrent?.[0]?.voltage_v ?? null;
    const avgPower = powerHistory && powerHistory.length > 0
      ? powerHistory.reduce((sum, p) => sum + (p.power_watts || 0), 0) / powerHistory.length
      : null;

    // WiFi data - useWifiScan returns { networks: WifiNetwork[] }
    const wifiNetworksArr = wifiScanData?.networks ?? [];
    const wifiNetworksFound = wifiNetworksArr.length > 0 ? wifiNetworksArr.length : (wifiStats?.unique_networks_24h ?? 0);
    const wifiScanCount = wifiStats?.scan_count_24h ?? 0;
    const wifiActiveScanners = wifiStats?.active_scanners ?? 0;

    // Bluetooth data - useBluetoothScan returns BluetoothDevice[] array
    const btDevicesArr = btScanData ?? [];
    const btDevicesFound = btDevicesArr.length > 0 ? btDevicesArr.length : (btStats?.unique_devices_24h ?? 0);
    const btScanCount = btStats?.scan_count_24h ?? 0;
    const btActiveScanners = btStats?.active_scanners ?? 0;

    // Battery data
    const batteryArr = batteryStats ?? [];
    const batteryAvgCharge = batteryArr.length > 0
      ? batteryArr.reduce((sum, b) => sum + (b.charge_percent || 0), 0) / batteryArr.length
      : null;
    const batteryStatus = batteryArr[0]?.status ?? null;

    return {
      currentPower, currentVoltage, avgPower,
      wifiNetworksFound, wifiScanCount, wifiActiveScanners,
      btDevicesFound, btScanCount, btActiveScanners,
      batteryAvgCharge, batteryStatus,
      wifiNetworks: wifiNetworksArr,
      btDevices: btDevicesArr,
    };
  }, [powerCurrent, powerHistory, wifiScanData, wifiStats, btScanData, btStats, batteryStats]);

  // Extract real-time sensor values - combine batch data with fallback readings
  const sensorValues = useMemo(() => {
    const batchValues = extractSensorValuesFromBatch(latestBatch);
    
    // If batch data missing, try to extract from readings API fallbacks
    if (batchValues.thermalTempC === null && thermalData?.latest?.data) {
      const data = thermalData.latest.data as Record<string, unknown>;
      batchValues.thermalTempC = (data.temperature_c as number) ?? null;
      batchValues.thermalTempF = (data.temperature_f as number) ?? cToF(batchValues.thermalTempC);
    }
    
    if (batchValues.starlinkPower === null && starlinkData?.latest?.data) {
      const data = starlinkData.latest.data as Record<string, unknown>;
      batchValues.starlinkPower = (data.power_watts as number) ?? (data.avg_power_watts as number) ?? null;
      batchValues.starlinkLatency = (data.pop_ping_latency_ms as number) ?? (data.latency_ms as number) ?? null;
      const dl = (data.downlink_throughput_bps as number) ?? null;
      const ul = (data.uplink_throughput_bps as number) ?? null;
      batchValues.starlinkDownloadMbps = dl !== null ? dl / 1000000 : null;
      batchValues.starlinkUploadMbps = ul !== null ? ul / 1000000 : null;
    }
    
    if (batchValues.cpuPercent === null && systemData?.latest?.data) {
      const data = systemData.latest.data as Record<string, unknown>;
      batchValues.cpuPercent = (data.cpu_percent as number) ?? null;
      batchValues.memoryPercent = (data.memory_percent as number) ?? null;
      batchValues.diskPercent = (data.disk_percent as number) ?? null;
    }
    
    return batchValues;
  }, [latestBatch, thermalData, starlinkData, systemData]);

  // Get aggregate stats from client detail endpoint
  const totalReadings = clientStats?.overall?.total_readings || 0;
  const totalDevices = clientStats?.overall?.device_count || 0;
  
  // Prefer sensors by client endpoint for sensor count and breakdown
  const sensorTypesCount = sensorsByClient?.sensor_count || clientStats?.overall?.sensor_type_count || 0;
  
  // Get sensor breakdown - prefer new endpoint, fallback to client stats
  const sensorBreakdown = useMemo(() => {
    if (sensorsByClient?.sensors && sensorsByClient.sensors.length > 0) {
      return sensorsByClient.sensors.sort((a, b) => (b.reading_count || 0) - (a.reading_count || 0));
    }
    if (clientStats?.by_sensor_type) {
      return clientStats.by_sensor_type.sort((a, b) => (b.reading_count || 0) - (a.reading_count || 0));
    }
    return [];
  }, [sensorsByClient, clientStats]);

  // Get batch timestamp
  const batchTimestamp = useMemo(() => {
    try {
      const ts = latestBatch?.batch?.batch_timestamp;
      if (ts) {
        return format(parseISO(ts), 'HH:mm:ss MMM d');
      }
    } catch { /* ignore */ }
    return null;
  }, [latestBatch]);

  const isLoading = clientStatsLoading || batchLoading || sensorsLoading;

  if (!effectiveClientId) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-8 text-center text-muted-foreground">
          Select a client to view sensor statistics
        </CardContent>
      </Card>
    );
  }

  return (
    <Tabs defaultValue="current" className="w-full">
      <TabsList className="grid w-full grid-cols-3 mb-6">
        <TabsTrigger value="current" className="flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Current
        </TabsTrigger>
        <TabsTrigger value="trend" className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Trend
        </TabsTrigger>
        <TabsTrigger value="details" className="flex items-center gap-2">
          <FileJson className="w-4 h-4" />
          Details
        </TabsTrigger>
      </TabsList>

      <TabsContent value="current">
        <CurrentTab 
          sensorValues={sensorValues}
          isLoading={isLoading}
          batchTimestamp={batchTimestamp}
          totalReadings={totalReadings}
          totalDevices={totalDevices}
          sensorTypesCount={sensorTypesCount}
          sensorBreakdown={sensorBreakdown}
          clientStats={clientStats}
        />
      </TabsContent>

      <TabsContent value="trend">
        <TrendTab 
          sensorBreakdown={sensorBreakdown}
          clientStats={clientStats}
          clientId={effectiveClientId}
        />
      </TabsContent>

      <TabsContent value="details">
        <DetailsTab 
          latestBatch={latestBatch}
          clientStats={clientStats}
          sensorsByClient={sensorsByClient}
        />
      </TabsContent>
    </Tabs>
  );
}
