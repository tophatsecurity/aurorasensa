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
  type LucideIcon
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
  useClientDetailStats,
  useStatsBySensor,
  useStarlinkPower,
  useArduino1hrStats,
  useClientSystemInfo,
  useThermalProbeTimeseries,
  useGpsReadings,
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

// Helper to safely extract numeric value
function extractNumber(data: unknown, ...keys: string[]): number | null {
  if (!data || typeof data !== 'object') return null;
  const obj = data as Record<string, unknown>;
  
  for (const key of keys) {
    if (typeof obj[key] === 'number' && !isNaN(obj[key] as number)) {
      return obj[key] as number;
    }
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

// Get sensor reading count from sensor stats
function getSensorReadingCount(
  sensorStats: { sensors: Array<{ sensor_type: string; reading_count: number }> } | null | undefined,
  ...sensorTypes: string[]
): number {
  if (!sensorStats?.sensors) return 0;
  let total = 0;
  for (const sensor of sensorStats.sensors) {
    const type = sensor.sensor_type?.toLowerCase() || '';
    for (const target of sensorTypes) {
      if (type.includes(target.toLowerCase())) {
        total += sensor.reading_count || 0;
        break;
      }
    }
  }
  return total;
}

export default function ClientSensorStats({ clientId, isGlobalView = true }: ClientSensorStatsProps) {
  const effectiveClientId = clientId && clientId !== 'all' ? clientId : '';
  
  // Use client detail stats for comprehensive data
  const { data: clientStats, isLoading: clientStatsLoading } = useClientDetailStats(effectiveClientId || null, 24);
  
  // Use stats by sensor filtered by client
  const { data: sensorStats, isLoading: sensorStatsLoading } = useStatsBySensor({ 
    clientId: effectiveClientId || null, 
    hours: 24 
  });
  
  // Arduino 1hr stats for latest measurements
  const { data: arduino1hrStats, isLoading: arduinoLoading } = useArduino1hrStats();
  
  // Starlink power data
  const { data: starlinkPower, isLoading: starlinkLoading } = useStarlinkPower();
  
  // System info for this client
  const { data: systemInfo, isLoading: systemLoading } = useClientSystemInfo(effectiveClientId);
  
  // GPS readings for location data
  const { data: gpsReadings, isLoading: gpsLoading } = useGpsReadings(24);
  
  // Thermal probe timeseries for chart
  const { data: thermalTimeseries, isLoading: thermalLoading } = useThermalProbeTimeseries(24, effectiveClientId);

  // Extract sensor type counts from by_sensor_type
  const sensorTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    if (clientStats?.by_sensor_type) {
      for (const st of clientStats.by_sensor_type) {
        counts[st.sensor_type?.toLowerCase() || ''] = st.reading_count || 0;
      }
    }
    return counts;
  }, [clientStats]);

  // Arduino stats
  const arduinoStats = useMemo(() => {
    if (arduino1hrStats?.aggregated) {
      const agg = arduino1hrStats.aggregated;
      return {
        temp: agg.current?.temp_c ?? agg.averages?.temp_c ?? null,
        humidity: agg.current?.humidity ?? agg.averages?.humidity ?? null,
        pressure: agg.current?.pressure_hpa ? agg.current.pressure_hpa * 100 : (agg.averages?.pressure_hpa ? agg.averages.pressure_hpa * 100 : null),
        light: extractNumber(agg.current, 'light', 'light_level') ?? extractNumber(agg.averages, 'light', 'light_level'),
      };
    }
    return { temp: null, humidity: null, pressure: null, light: null };
  }, [arduino1hrStats]);

  // Starlink stats
  const starlinkStats = useMemo(() => {
    if (!starlinkPower?.device_summaries || starlinkPower.device_summaries.length === 0) {
      return { power: null, chartData: [] };
    }
    
    const power = starlinkPower.device_summaries.reduce(
      (sum, d) => sum + (d.overall?.avg_watts || 0), 0
    );
    
    const chartData: { time: string; power: number }[] = [];
    if (starlinkPower.power_data && starlinkPower.power_data.length > 0) {
      const hourlyData = new Map<string, number[]>();
      starlinkPower.power_data.forEach((point) => {
        try {
          const hour = format(parseISO(point.timestamp), 'HH:00');
          if (!hourlyData.has(hour)) hourlyData.set(hour, []);
          hourlyData.get(hour)!.push(point.power_watts);
        } catch { /* skip */ }
      });
      
      Array.from(hourlyData.entries())
        .map(([time, powers]) => ({
          time,
          power: powers.reduce((a, b) => a + b, 0) / powers.length,
        }))
        .sort((a, b) => a.time.localeCompare(b.time))
        .forEach(d => chartData.push(d));
    }
    
    return { power, chartData };
  }, [starlinkPower]);

  // System stats
  const systemStats = useMemo(() => {
    if (!systemInfo) {
      return { cpu: null, memory: null, disk: null };
    }
    return {
      cpu: extractNumber(systemInfo, 'cpu_percent', 'cpu_usage', 'cpu'),
      memory: extractNumber(systemInfo, 'memory_percent', 'mem_percent', 'memory_usage', 'memory'),
      disk: extractNumber(systemInfo, 'disk_percent', 'disk_usage', 'disk'),
    };
  }, [systemInfo]);

  // GPS stats
  const gpsStats = useMemo(() => {
    const readings = gpsReadings?.readings;
    if (!readings || readings.length === 0) {
      return { lat: null, lng: null, alt: null, satellites: null };
    }
    const latest = readings[0];
    return {
      lat: extractNumber(latest, 'latitude', 'lat'),
      lng: extractNumber(latest, 'longitude', 'lng', 'lon'),
      alt: extractNumber(latest, 'altitude', 'alt', 'altitude_m'),
      satellites: extractNumber(latest, 'satellites', 'sats'),
    };
  }, [gpsReadings]);

  // Thermal chart data
  const thermalChartData = useMemo(() => {
    if (!thermalTimeseries?.readings || thermalTimeseries.readings.length === 0) return [];
    
    const hourlyData = new Map<string, number[]>();
    thermalTimeseries.readings.forEach((reading) => {
      try {
        const hour = format(parseISO(reading.timestamp), 'HH:00');
        const temp = extractNumber(reading, 'temp_c', 'probe_c', 'ambient_c', 'temperature');
        if (temp !== null) {
          if (!hourlyData.has(hour)) hourlyData.set(hour, []);
          hourlyData.get(hour)!.push(temp);
        }
      } catch { /* skip */ }
    });
    
    return Array.from(hourlyData.entries())
      .map(([time, temps]) => ({
        time,
        temperature: temps.reduce((a, b) => a + b, 0) / temps.length,
      }))
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [thermalTimeseries]);

  // Current thermal value
  const currentThermal = useMemo(() => {
    if (!thermalTimeseries?.readings || thermalTimeseries.readings.length === 0) return null;
    return extractNumber(thermalTimeseries.readings[0], 'temp_c', 'probe_c', 'ambient_c', 'temperature');
  }, [thermalTimeseries]);

  const totalReadings = clientStats?.overall?.total_readings || 0;
  const totalDevices = clientStats?.overall?.total_devices || 0;
  const sensorTypesCount = clientStats?.overall?.sensor_types_count || 0;
  
  const isLoading = clientStatsLoading || sensorStatsLoading || arduinoLoading || 
                    starlinkLoading || systemLoading || gpsLoading || thermalLoading;

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
              Client Overview
            </CardTitle>
            <div className="flex gap-2">
              <Badge variant="outline" className="text-xs">
                {totalReadings.toLocaleString()} readings
              </Badge>
              <Badge variant="outline" className="text-xs">
                {totalDevices} devices
              </Badge>
              <Badge variant="outline" className="text-xs">
                {sensorTypesCount} sensor types
              </Badge>
            </div>
          </div>
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
                value={currentThermal?.toFixed(1)}
                unit="°C"
                color="orange-500"
              />
              
              <StatCard
                icon={Thermometer}
                label="Arduino Temp"
                value={arduinoStats.temp?.toFixed(1)}
                unit="°C"
                color="red-500"
              />
              
              <StatCard
                icon={Droplets}
                label="Humidity"
                value={arduinoStats.humidity?.toFixed(1)}
                unit="%"
                color="blue-500"
              />
              
              <StatCard
                icon={Gauge}
                label="Pressure"
                value={arduinoStats.pressure ? (arduinoStats.pressure / 100).toFixed(0) : null}
                unit="hPa"
                color="purple-500"
              />
              
              <StatCard
                icon={Satellite}
                label="Starlink Power"
                value={starlinkStats.power?.toFixed(0)}
                unit="W"
                color="yellow-500"
              />
              
              <StatCard
                icon={Navigation}
                label="GPS Satellites"
                value={gpsStats.satellites}
                unit=""
                color="green-500"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sensor Breakdown */}
      {sensorStats?.sensors && sensorStats.sensors.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Sensor Breakdown (24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
              {sensorStats.sensors.slice(0, 12).map((sensor) => (
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
            <StatCard
              icon={Cpu}
              label="CPU Usage"
              value={systemStats.cpu?.toFixed(1)}
              unit="%"
              color="orange-500"
            />
            
            <StatCard
              icon={Activity}
              label="Memory"
              value={systemStats.memory?.toFixed(1)}
              unit="%"
              color="blue-500"
            />
            
            <StatCard
              icon={HardDrive}
              label="Disk Usage"
              value={systemStats.disk?.toFixed(1)}
              unit="%"
              color="red-500"
            />
            
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
            
            <StatCard
              icon={Satellite}
              label="Altitude"
              value={gpsStats.alt?.toFixed(0)}
              unit="m"
              color="primary"
            />
          </div>
        </CardContent>
      </Card>

      {/* Timeseries Charts */}
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
            ) : thermalChartData.length > 0 ? (
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={thermalChartData}>
                    <defs>
                      <linearGradient id="thermalGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                    <XAxis dataKey="time" tick={{ fontSize: 10 }} className="text-muted-foreground" />
                    <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" domain={['auto', 'auto']} tickFormatter={(v) => `${v}°C`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                      formatter={(value: number) => [`${value.toFixed(1)}°C`, 'Temperature']}
                    />
                    <Area type="monotone" dataKey="temperature" stroke="hsl(var(--chart-1))" fill="url(#thermalGradient)" strokeWidth={2} />
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
              Starlink Power (24h)
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
                    <XAxis dataKey="time" tick={{ fontSize: 10 }} className="text-muted-foreground" />
                    <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" domain={['auto', 'auto']} tickFormatter={(v) => `${v}W`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                      formatter={(value: number) => [`${value.toFixed(1)}W`, 'Power']}
                    />
                    <Area type="monotone" dataKey="power" stroke="hsl(var(--chart-4))" fill="url(#powerGradient)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : starlinkStats.power !== null ? (
              <div className="h-[200px] flex flex-col items-center justify-center">
                <div className="text-4xl font-bold text-chart-4">{starlinkStats.power?.toFixed(0) ?? '--'}W</div>
                <p className="text-sm text-muted-foreground mt-2">Current Starlink power consumption</p>
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
