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
  MemoryStick,
  Wifi,
  Radio,
  Satellite,
  Navigation,
  Compass
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
} from "recharts";
import { format, parseISO } from "date-fns";
import { 
  useClientStarlinkData,
  useClientSystemMonitorData,
  useClientThermalData,
  useClientArduinoData,
  useClientGpsData,
  useClientWifiData,
  useClientSensorData,
} from "@/hooks/aurora";

interface ClientSensorStatsProps {
  clientId?: string;
  isGlobalView?: boolean;
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

// Stat card component for current values
function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  unit, 
  color = "primary",
  subValue,
  subLabel 
}: { 
  icon: React.ElementType; 
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

// Helper to safely extract numeric value from nested data
function extractNumber(data: Record<string, unknown> | null | undefined, ...keys: string[]): number | null {
  if (!data) return null;
  
  for (const key of keys) {
    // Direct key
    if (typeof data[key] === 'number' && !isNaN(data[key] as number)) {
      return data[key] as number;
    }
    // Check nested objects
    for (const nestedKey of Object.keys(data)) {
      const nested = data[nestedKey];
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

export default function ClientSensorStats({ clientId, isGlobalView = true }: ClientSensorStatsProps) {
  const effectiveClientId = clientId && clientId !== 'all' ? clientId : '';
  
  // Fetch client-specific sensor data
  const { data: sensorData, isLoading: sensorDataLoading } = useClientSensorData(effectiveClientId);
  const { data: starlinkData, isLoading: starlinkLoading } = useClientStarlinkData(effectiveClientId);
  const { data: systemData, isLoading: systemLoading } = useClientSystemMonitorData(effectiveClientId);
  const { data: thermalData, isLoading: thermalLoading } = useClientThermalData(effectiveClientId);
  const { data: arduinoData, isLoading: arduinoLoading } = useClientArduinoData(effectiveClientId);
  const { data: gpsData, isLoading: gpsLoading } = useClientGpsData(effectiveClientId);
  const { data: wifiData, isLoading: wifiLoading } = useClientWifiData(effectiveClientId);

  // Process thermal data
  const thermalStats = useMemo(() => {
    if (!thermalData?.readings || thermalData.readings.length === 0) {
      return { current: null, chartData: [] };
    }
    
    const latest = thermalData.readings[0];
    const latestData = latest?.data || {};
    
    const current = extractNumber(latestData, 'temp_c', 'probe_c', 'ambient_c', 'temperature');
    
    // Build chart data (grouped by hour)
    const hourlyData = new Map<string, number[]>();
    thermalData.readings.forEach((reading) => {
      try {
        const hour = format(parseISO(reading.timestamp), 'HH:00');
        const temp = extractNumber(reading.data, 'temp_c', 'probe_c', 'ambient_c', 'temperature');
        if (temp !== null) {
          if (!hourlyData.has(hour)) hourlyData.set(hour, []);
          hourlyData.get(hour)!.push(temp);
        }
      } catch { /* skip */ }
    });
    
    const chartData = Array.from(hourlyData.entries())
      .map(([time, temps]) => ({
        time,
        temperature: temps.reduce((a, b) => a + b, 0) / temps.length,
      }))
      .sort((a, b) => a.time.localeCompare(b.time));
    
    return { current, chartData };
  }, [thermalData]);

  // Process Arduino data
  const arduinoStats = useMemo(() => {
    if (!arduinoData?.readings || arduinoData.readings.length === 0) {
      return { temp: null, humidity: null, pressure: null, light: null };
    }
    
    const latest = arduinoData.readings[0];
    const data = latest?.data || {};
    
    return {
      temp: extractNumber(data, 'th_temp_c', 'aht_temp_c', 'bmp_temp_c', 'temp_c', 'temperature'),
      humidity: extractNumber(data, 'th_humidity', 'aht_humidity', 'humidity'),
      pressure: extractNumber(data, 'bmp_pressure_pa', 'pressure', 'pressure_pa'),
      light: extractNumber(data, 'light', 'light_level', 'lux'),
    };
  }, [arduinoData]);

  // Process Starlink data
  const starlinkStats = useMemo(() => {
    if (!starlinkData?.readings || starlinkData.readings.length === 0) {
      return { power: null, latency: null, uplink: null, downlink: null, chartData: [] };
    }
    
    const latest = starlinkData.readings[0];
    const data = latest?.data || {};
    
    // Extract from nested starlink object if present
    const starlinkNested = (data.starlink as Record<string, unknown>) || data;
    
    const power = extractNumber(starlinkNested, 'power_watts', 'power_w', 'power');
    const latency = extractNumber(starlinkNested, 'pop_ping_latency_ms', 'latency_ms', 'ping_latency_ms');
    const uplink = extractNumber(starlinkNested, 'uplink_throughput_bps', 'uplink_bps');
    const downlink = extractNumber(starlinkNested, 'downlink_throughput_bps', 'downlink_bps');
    
    // Build power chart data
    const hourlyData = new Map<string, number[]>();
    starlinkData.readings.forEach((reading) => {
      try {
        const hour = format(parseISO(reading.timestamp), 'HH:00');
        const nested = (reading.data?.starlink as Record<string, unknown>) || reading.data || {};
        const p = extractNumber(nested, 'power_watts', 'power_w', 'power');
        if (p !== null) {
          if (!hourlyData.has(hour)) hourlyData.set(hour, []);
          hourlyData.get(hour)!.push(p);
        }
      } catch { /* skip */ }
    });
    
    const chartData = Array.from(hourlyData.entries())
      .map(([time, powers]) => ({
        time,
        power: powers.reduce((a, b) => a + b, 0) / powers.length,
      }))
      .sort((a, b) => a.time.localeCompare(b.time));
    
    return { power, latency, uplink, downlink, chartData };
  }, [starlinkData]);

  // Process System Monitor data
  const systemStats = useMemo(() => {
    if (!systemData?.latest) {
      return { cpu: null, memory: null, disk: null };
    }
    
    const data = systemData.latest.data || {};
    
    return {
      cpu: extractNumber(data, 'cpu_percent', 'cpu_usage', 'cpu'),
      memory: extractNumber(data, 'memory_percent', 'mem_percent', 'memory_usage', 'memory'),
      disk: extractNumber(data, 'disk_percent', 'disk_usage', 'disk'),
    };
  }, [systemData]);

  // Process GPS data
  const gpsStats = useMemo(() => {
    if (!gpsData?.readings || gpsData.readings.length === 0) {
      return { lat: null, lng: null, alt: null, speed: null, satellites: null };
    }
    
    const latest = gpsData.readings[0];
    const data = latest?.data || {};
    const gpsNested = (data.gps as Record<string, unknown>) || data;
    
    return {
      lat: extractNumber(gpsNested, 'latitude', 'lat'),
      lng: extractNumber(gpsNested, 'longitude', 'lng', 'lon'),
      alt: extractNumber(gpsNested, 'altitude', 'alt', 'altitude_m'),
      speed: extractNumber(gpsNested, 'speed', 'speed_kmh', 'ground_speed'),
      satellites: extractNumber(gpsNested, 'satellites', 'sats', 'satellites_visible'),
    };
  }, [gpsData]);

  // Process WiFi data
  const wifiStats = useMemo(() => {
    const networkCount = wifiData?.networks?.length || 0;
    const status = wifiData?.status as Record<string, unknown> | null;
    const connectedNetwork = status?.ssid as string | null;
    const signalStrength = typeof status?.signal === 'number' ? status.signal : null;
    
    return {
      networkCount,
      connectedNetwork,
      signalStrength,
    };
  }, [wifiData]);

  // Calculate total readings
  const totalReadings = sensorData?.readings?.length || 0;
  const sensorTypes = Object.keys(sensorData?.byType || {}).length;
  
  const isLoading = sensorDataLoading || starlinkLoading || systemLoading || 
                    thermalLoading || arduinoLoading || gpsLoading || wifiLoading;

  // Check if we have any real data
  const hasData = thermalStats.current !== null || 
                  arduinoStats.temp !== null || 
                  starlinkStats.power !== null ||
                  systemStats.cpu !== null ||
                  gpsStats.lat !== null;

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
      {/* Environmental Stats Row */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Environmental Sensors
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              {totalReadings} readings
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-20 bg-muted/30 animate-pulse rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* Thermal Probe */}
              <StatCard
                icon={Thermometer}
                label="Thermal Probe"
                value={thermalStats.current?.toFixed(1)}
                unit="°C"
                color="orange-500"
              />
              
              {/* Arduino Temperature */}
              <StatCard
                icon={Thermometer}
                label="Arduino Temp"
                value={arduinoStats.temp?.toFixed(1)}
                unit="°C"
                color="red-500"
              />
              
              {/* Humidity */}
              <StatCard
                icon={Droplets}
                label="Humidity"
                value={arduinoStats.humidity?.toFixed(1)}
                unit="%"
                color="blue-500"
              />
              
              {/* Pressure */}
              <StatCard
                icon={Gauge}
                label="Pressure"
                value={arduinoStats.pressure ? (arduinoStats.pressure / 100).toFixed(0) : null}
                unit="hPa"
                color="purple-500"
              />
              
              {/* Light Level */}
              <StatCard
                icon={Activity}
                label="Light Level"
                value={arduinoStats.light?.toFixed(0)}
                unit="lux"
                color="yellow-500"
              />
              
              {/* Sensor Types */}
              <StatCard
                icon={Gauge}
                label="Sensor Types"
                value={sensorTypes}
                unit=""
                color="primary"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Power & Connectivity Row */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Zap className="w-4 h-4 text-chart-4" />
            Power & Connectivity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Starlink Power */}
            <StatCard
              icon={Satellite}
              label="Starlink Power"
              value={starlinkStats.power?.toFixed(0)}
              unit="W"
              color="yellow-500"
            />
            
            {/* Starlink Latency */}
            <StatCard
              icon={Activity}
              label="Latency"
              value={starlinkStats.latency?.toFixed(0)}
              unit="ms"
              color="green-500"
            />
            
            {/* Uplink */}
            <StatCard
              icon={Zap}
              label="Uplink"
              value={starlinkStats.uplink ? (starlinkStats.uplink / 1000000).toFixed(1) : null}
              unit="Mbps"
              color="blue-500"
            />
            
            {/* Downlink */}
            <StatCard
              icon={Zap}
              label="Downlink"
              value={starlinkStats.downlink ? (starlinkStats.downlink / 1000000).toFixed(1) : null}
              unit="Mbps"
              color="primary"
            />
            
            {/* WiFi Networks */}
            <StatCard
              icon={Wifi}
              label="WiFi Networks"
              value={wifiStats.networkCount}
              unit=""
              color="purple-500"
            />
            
            {/* WiFi Signal */}
            <StatCard
              icon={Radio}
              label="WiFi Signal"
              value={wifiStats.signalStrength}
              unit="dBm"
              color="green-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* System & Location Row */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Cpu className="w-4 h-4 text-primary" />
            System & Location
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* CPU */}
            <StatCard
              icon={Cpu}
              label="CPU Usage"
              value={systemStats.cpu?.toFixed(1)}
              unit="%"
              color="orange-500"
            />
            
            {/* Memory */}
            <StatCard
              icon={MemoryStick}
              label="Memory"
              value={systemStats.memory?.toFixed(1)}
              unit="%"
              color="blue-500"
            />
            
            {/* Disk */}
            <StatCard
              icon={HardDrive}
              label="Disk Usage"
              value={systemStats.disk?.toFixed(1)}
              unit="%"
              color="red-500"
            />
            
            {/* GPS Coordinates */}
            <StatCard
              icon={Navigation}
              label="Latitude"
              value={gpsStats.lat?.toFixed(4)}
              unit="°"
              color="green-500"
            />
            
            <StatCard
              icon={Compass}
              label="Longitude"
              value={gpsStats.lng?.toFixed(4)}
              unit="°"
              color="green-500"
            />
            
            {/* GPS Satellites */}
            <StatCard
              icon={Satellite}
              label="GPS Sats"
              value={gpsStats.satellites}
              unit=""
              color="primary"
              subValue={gpsStats.alt?.toFixed(0)}
              subLabel="Alt (m)"
            />
          </div>
        </CardContent>
      </Card>

      {/* Timeseries Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Thermal Probe Chart */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-chart-1" />
              Thermal Probe (24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {thermalLoading ? (
              <div className="h-[200px] bg-muted/30 animate-pulse rounded-lg" />
            ) : thermalStats.chartData.length > 0 ? (
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={thermalStats.chartData}>
                    <defs>
                      <linearGradient id="thermalGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                    <XAxis 
                      dataKey="time" 
                      tick={{ fontSize: 10 }}
                      className="text-muted-foreground"
                    />
                    <YAxis 
                      tick={{ fontSize: 10 }}
                      className="text-muted-foreground"
                      domain={['auto', 'auto']}
                      tickFormatter={(v) => `${v}°C`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => [`${value.toFixed(1)}°C`, 'Temperature']}
                    />
                    <Area
                      type="monotone"
                      dataKey="temperature"
                      stroke="hsl(var(--chart-1))"
                      fill="url(#thermalGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                No thermal probe data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Starlink Power Chart */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="w-4 h-4 text-chart-4" />
              Starlink Power Usage (24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {starlinkLoading ? (
              <div className="h-[200px] bg-muted/30 animate-pulse rounded-lg" />
            ) : starlinkStats.chartData.length > 0 ? (
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={starlinkStats.chartData}>
                    <defs>
                      <linearGradient id="powerGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--chart-4))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--chart-4))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                    <XAxis 
                      dataKey="time" 
                      tick={{ fontSize: 10 }}
                      className="text-muted-foreground"
                    />
                    <YAxis 
                      tick={{ fontSize: 10 }}
                      className="text-muted-foreground"
                      domain={['auto', 'auto']}
                      tickFormatter={(v) => `${v}W`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => [`${value.toFixed(1)}W`, 'Power']}
                    />
                    <Area
                      type="monotone"
                      dataKey="power"
                      stroke="hsl(var(--chart-4))"
                      fill="url(#powerGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : starlinkStats.power !== null ? (
              <div className="h-[200px] flex flex-col items-center justify-center">
                <div className="text-4xl font-bold text-chart-4">
                  {starlinkStats.power?.toFixed(0) ?? '--'}W
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Current Starlink power consumption
                </p>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                No Starlink power data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
