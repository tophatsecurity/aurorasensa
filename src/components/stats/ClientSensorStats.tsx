import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  type LucideIcon
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { 
  useClientDetailStats,
  useClientLatestBatch,
} from "@/hooks/aurora";

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

// Stat card component
function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  unit, 
  color = "primary",
  subValue,
  subLabel 
}: { 
  icon: LucideIcon; 
  label: string; 
  value: string | number | null | undefined; 
  unit: string;
  color?: string;
  subValue?: string | number | null;
  subLabel?: string;
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
        {subValue !== undefined && subLabel && (
          <p className="text-xs text-muted-foreground">
            {subLabel}: {subValue ?? '--'}
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
  // Thermal
  thermalTemp: number | null;
  // Arduino
  arduinoTemp: number | null;
  humidity: number | null;
  pressure: number | null;
  light: number | null;
  sound: number | null;
  // Starlink
  starlinkPower: number | null;
  starlinkLatency: number | null;
  starlinkDownload: number | null;
  starlinkUpload: number | null;
  // System
  cpuPercent: number | null;
  memoryPercent: number | null;
  diskPercent: number | null;
  // GPS
  latitude: number | null;
  longitude: number | null;
  altitude: number | null;
  satellites: number | null;
  // WiFi
  wifiNetworks: number | null;
  wifiSignal: number | null;
  // Bluetooth
  bluetoothDevices: number | null;
}

function extractSensorValuesFromBatch(batchData: unknown): SensorValues {
  const defaults: SensorValues = {
    thermalTemp: null, arduinoTemp: null, humidity: null, pressure: null,
    light: null, sound: null, starlinkPower: null, starlinkLatency: null,
    starlinkDownload: null, starlinkUpload: null, cpuPercent: null,
    memoryPercent: null, diskPercent: null, latitude: null, longitude: null,
    altitude: null, satellites: null, wifiNetworks: null, wifiSignal: null,
    bluetoothDevices: null,
  };
  
  if (!batchData || typeof batchData !== 'object') return defaults;
  
  const batch = batchData as { batch?: { json_content?: { readings?: Array<{ sensors?: Record<string, unknown> }> } } };
  const readings = batch.batch?.json_content?.readings;
  
  if (!readings || !Array.isArray(readings)) return defaults;
  
  // Find first reading with sensors
  const reading = readings.find(r => r.sensors && Object.keys(r.sensors).length > 0);
  if (!reading?.sensors) return defaults;
  
  const sensors = reading.sensors;
  
  // Extract thermal probe data
  const thermal = sensors['thermal_probe_1'] as Record<string, unknown> | undefined;
  if (thermal) {
    defaults.thermalTemp = extractNumber(thermal, 'temp_c', 'probe_c', 'ambient_c', 'temperature');
  }
  
  // Extract Arduino data
  const arduino = sensors['arduino_1'] as Record<string, unknown> | undefined;
  if (arduino) {
    // Temperature from th (temp/humidity) or bmp (barometric)
    const th = arduino['th'] as Record<string, unknown> | undefined;
    const bmp = arduino['bmp'] as Record<string, unknown> | undefined;
    const analog = arduino['analog'] as Record<string, unknown> | undefined;
    
    if (th) {
      defaults.arduinoTemp = extractNumber(th, 'temp_c', 'temperature');
      defaults.humidity = extractNumber(th, 'hum_pct', 'humidity');
    }
    if (bmp) {
      defaults.pressure = extractNumber(bmp, 'press_hpa', 'pressure');
      if (!defaults.arduinoTemp) {
        defaults.arduinoTemp = extractNumber(bmp, 'temp_c');
      }
    }
    if (analog) {
      defaults.light = extractNumber(analog, 'light_raw', 'light');
      defaults.sound = extractNumber(analog, 'sound_raw', 'sound');
    }
  }
  
  // Extract Starlink data
  const starlink = sensors['starlink_dish_1'] as Record<string, unknown> | undefined;
  if (starlink) {
    defaults.starlinkPower = extractNumber(starlink, 'power_watts', 'avg_power_watts', 'power');
    defaults.starlinkLatency = extractNumber(starlink, 'pop_ping_latency_ms', 'latency_ms', 'latency');
    defaults.starlinkDownload = extractNumber(starlink, 'downlink_throughput_bps', 'download_bps');
    defaults.starlinkUpload = extractNumber(starlink, 'uplink_throughput_bps', 'upload_bps');
  }
  
  // Extract System Monitor data
  const systemMonitor = sensors['system_monitor_1'] as Record<string, unknown> | undefined;
  if (systemMonitor) {
    defaults.cpuPercent = extractNumber(systemMonitor, 'cpu_percent', 'cpu_usage', 'cpu');
    defaults.memoryPercent = extractNumber(systemMonitor, 'memory_percent', 'mem_percent', 'memory');
    defaults.diskPercent = extractNumber(systemMonitor, 'disk_percent', 'disk_usage', 'disk');
    
    // Try nested paths
    const cpu = systemMonitor['cpu'] as Record<string, unknown> | undefined;
    const memory = systemMonitor['memory'] as Record<string, unknown> | undefined;
    const disk = systemMonitor['disk'] as Record<string, unknown> | undefined;
    
    if (cpu && defaults.cpuPercent === null) {
      defaults.cpuPercent = extractNumber(cpu, 'percent', 'usage');
    }
    if (memory && defaults.memoryPercent === null) {
      defaults.memoryPercent = extractNumber(memory, 'percent', 'usage');
    }
    if (disk && defaults.diskPercent === null) {
      defaults.diskPercent = extractNumber(disk, 'percent', 'usage');
    }
  }
  
  // Extract WiFi data
  const wifi = sensors['wifi_scanner_1'] as Record<string, unknown> | undefined;
  if (wifi) {
    const networks = wifi['networks'] as unknown[] | undefined;
    if (networks) {
      defaults.wifiNetworks = networks.length;
      // Get best signal
      const signals = networks.map(n => extractNumber(n, 'signal', 'rssi', 'signal_strength')).filter(s => s !== null) as number[];
      if (signals.length > 0) {
        defaults.wifiSignal = Math.max(...signals);
      }
    }
  }
  
  // Extract Bluetooth data
  const bluetooth = sensors['bluetooth_scanner_1'] as Record<string, unknown> | undefined;
  if (bluetooth) {
    defaults.bluetoothDevices = extractNumber(bluetooth, 'devices_found', 'ble_devices_found');
    if (defaults.bluetoothDevices === null) {
      const devices = bluetooth['devices'] as unknown[] | undefined;
      if (devices) {
        defaults.bluetoothDevices = devices.length;
      }
    }
  }
  
  // Extract GPS data (might be in a separate sensor or nested)
  const gps = sensors['gps_1'] as Record<string, unknown> | undefined;
  if (gps) {
    defaults.latitude = extractNumber(gps, 'latitude', 'lat');
    defaults.longitude = extractNumber(gps, 'longitude', 'lng', 'lon');
    defaults.altitude = extractNumber(gps, 'altitude', 'alt');
    defaults.satellites = extractNumber(gps, 'satellites', 'sats', 'num_satellites');
  }
  
  return defaults;
}

export default function ClientSensorStats({ clientId }: ClientSensorStatsProps) {
  const effectiveClientId = clientId && clientId !== 'all' ? clientId : '';
  
  // Use client detail stats for aggregates (/api/stats/client/{id})
  const { data: clientStats, isLoading: clientStatsLoading } = useClientDetailStats(effectiveClientId || null, 24);
  
  // Use latest batch for real-time sensor values (/api/clients/{id}/latest-batch)
  const { data: latestBatch, isLoading: batchLoading } = useClientLatestBatch(effectiveClientId || null, true);

  // Extract real-time sensor values from latest batch
  const sensorValues = useMemo(() => {
    return extractSensorValuesFromBatch(latestBatch);
  }, [latestBatch]);

  // Get aggregate stats from client detail endpoint
  const totalReadings = clientStats?.overall?.total_readings || 0;
  const totalDevices = clientStats?.overall?.device_count || 0;
  const sensorTypesCount = clientStats?.overall?.sensor_type_count || 0;
  
  // Get sensor breakdown from by_sensor_type
  const sensorBreakdown = useMemo(() => {
    if (!clientStats?.by_sensor_type) return [];
    return clientStats.by_sensor_type.sort((a, b) => (b.reading_count || 0) - (a.reading_count || 0));
  }, [clientStats]);

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

  const isLoading = clientStatsLoading || batchLoading;

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
    <div className="space-y-6">
      {/* Overview Stats */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Database className="w-4 h-4 text-primary" />
              Client Overview (24h)
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
                value={sensorValues.thermalTemp?.toFixed(1)}
                unit="°C"
                color="orange-500"
              />
              
              <StatCard
                icon={Thermometer}
                label="Arduino Temp"
                value={sensorValues.arduinoTemp?.toFixed(1)}
                unit="°C"
                color="red-500"
              />
              
              <StatCard
                icon={Droplets}
                label="Humidity"
                value={sensorValues.humidity?.toFixed(1)}
                unit="%"
                color="blue-500"
              />
              
              <StatCard
                icon={Gauge}
                label="Pressure"
                value={sensorValues.pressure?.toFixed(0)}
                unit="hPa"
                color="purple-500"
              />
              
              <StatCard
                icon={Sun}
                label="Light Level"
                value={sensorValues.light}
                unit=""
                color="yellow-500"
              />
              
              <StatCard
                icon={Volume2}
                label="Sound Level"
                value={sensorValues.sound}
                unit=""
                color="green-500"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Power & Connectivity */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Zap className="w-4 h-4 text-chart-4" />
            Power & Connectivity (Latest)
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
                icon={Satellite}
                label="Starlink Power"
                value={sensorValues.starlinkPower?.toFixed(0)}
                unit="W"
                color="yellow-500"
              />
              
              <StatCard
                icon={Activity}
                label="Starlink Latency"
                value={sensorValues.starlinkLatency?.toFixed(0)}
                unit="ms"
                color="blue-500"
              />
              
              <StatCard
                icon={Wifi}
                label="WiFi Networks"
                value={sensorValues.wifiNetworks}
                unit=""
                color="green-500"
              />
              
              <StatCard
                icon={Wifi}
                label="Best WiFi Signal"
                value={sensorValues.wifiSignal}
                unit="dBm"
                color="green-500"
              />
              
              <StatCard
                icon={Radio}
                label="BT Devices"
                value={sensorValues.bluetoothDevices}
                unit=""
                color="purple-500"
              />
              
              <StatCard
                icon={Navigation}
                label="GPS Satellites"
                value={sensorValues.satellites}
                unit=""
                color="primary"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* System & Location */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Cpu className="w-4 h-4 text-primary" />
            System & Location (Latest)
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
                icon={Cpu}
                label="CPU Usage"
                value={sensorValues.cpuPercent?.toFixed(1)}
                unit="%"
                color="orange-500"
              />
              
              <StatCard
                icon={Activity}
                label="Memory"
                value={sensorValues.memoryPercent?.toFixed(1)}
                unit="%"
                color="blue-500"
              />
              
              <StatCard
                icon={HardDrive}
                label="Disk Usage"
                value={sensorValues.diskPercent?.toFixed(1)}
                unit="%"
                color="red-500"
              />
              
              <StatCard
                icon={Navigation}
                label="Latitude"
                value={sensorValues.latitude?.toFixed(4)}
                unit="°"
                color="green-500"
              />
              
              <StatCard
                icon={Compass}
                label="Longitude"
                value={sensorValues.longitude?.toFixed(4)}
                unit="°"
                color="green-500"
              />
              
              <StatCard
                icon={Satellite}
                label="Altitude"
                value={sensorValues.altitude?.toFixed(0)}
                unit="m"
                color="primary"
              />
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
                <div 
                  key={sensor.sensor_type} 
                  className="p-3 rounded-lg bg-muted/30 border border-border/50"
                >
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
      {clientStats?.recent_devices && clientStats.recent_devices.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Database className="w-4 h-4 text-primary" />
              Recent Devices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {clientStats.recent_devices.slice(0, 8).map((device) => (
                <div 
                  key={device.device_id} 
                  className="p-3 rounded-lg bg-muted/30 border border-border/50"
                >
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
                          try {
                            return format(parseISO(device.last_seen), 'HH:mm');
                          } catch {
                            return '';
                          }
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