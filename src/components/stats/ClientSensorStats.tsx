import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Thermometer, Droplets, Zap, Gauge, Activity } from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from "recharts";
import { format, parseISO } from "date-fns";
import { 
  useThermalProbeStats, 
  useThermalProbeTimeseries,
  useAhtSensorTimeseries,
} from "@/hooks/useAuroraApi";
import { 
  useStarlinkDevicesFromReadings, 
  useStarlinkPower 
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

export default function ClientSensorStats({ clientId, isGlobalView = true }: ClientSensorStatsProps) {
  // Fetch thermal probe data
  const { data: thermalStats, isLoading: thermalStatsLoading } = useThermalProbeStats();
  const { data: thermalTimeseries, isLoading: thermalTimeseriesLoading } = useThermalProbeTimeseries(24, clientId !== 'all' ? clientId : undefined);
  
  // Fetch AHT/BHT sensor data (temperature/humidity)
  const { data: ahtTimeseries, isLoading: ahtLoading } = useAhtSensorTimeseries(24, clientId !== 'all' ? clientId : undefined);
  
  // Fetch Starlink power data
  const { data: starlinkDevices, isLoading: starlinkDevicesLoading } = useStarlinkDevicesFromReadings();
  const { data: starlinkPower, isLoading: starlinkPowerLoading } = useStarlinkPower();

  // Process thermal timeseries data for charts
  const thermalChartData = useMemo(() => {
    if (!thermalTimeseries?.readings) return [];
    
    // Group by hour for cleaner visualization
    const hourlyData = new Map<string, { temps: number[]; count: number }>();
    
    thermalTimeseries.readings.forEach((reading: any) => {
      const hour = format(parseISO(reading.timestamp), 'HH:00');
      const temp = reading.temp_c ?? reading.temperature ?? reading.data?.temp_c;
      
      if (typeof temp === 'number') {
        if (!hourlyData.has(hour)) {
          hourlyData.set(hour, { temps: [], count: 0 });
        }
        hourlyData.get(hour)!.temps.push(temp);
        hourlyData.get(hour)!.count++;
      }
    });
    
    return Array.from(hourlyData.entries())
      .map(([hour, data]) => ({
        time: hour,
        temperature: data.temps.reduce((a, b) => a + b, 0) / data.temps.length,
        readings: data.count,
      }))
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [thermalTimeseries]);

  // Process Starlink power timeseries
  const starlinkPowerChartData = useMemo(() => {
    if (!starlinkDevices || starlinkDevices.length === 0) return [];
    
    // Get power readings from all devices and aggregate
    const powerByTime = new Map<string, number[]>();
    
    starlinkDevices.forEach((device: any) => {
      if (device.power_watts) {
        const time = device.last_seen ? format(parseISO(device.last_seen), 'HH:mm') : 'now';
        if (!powerByTime.has(time)) {
          powerByTime.set(time, []);
        }
        powerByTime.get(time)!.push(device.power_watts);
      }
    });
    
    return Array.from(powerByTime.entries())
      .map(([time, powers]) => ({
        time,
        power: powers.reduce((a, b) => a + b, 0) / powers.length,
      }));
  }, [starlinkDevices]);

  // Extract current values
  const currentThermal = useMemo(() => {
    if (thermalTimeseries?.readings?.length > 0) {
      const latest = thermalTimeseries.readings[0];
      return {
        temp: latest.temp_c ?? latest.probe_c ?? latest.ambient_c,
      };
    }
    // Fallback to stats
    return {
      temp: thermalStats?.avg_temp_c ?? thermalStats?.latest_reading?.temp_c as number | undefined,
    };
  }, [thermalTimeseries, thermalStats]);

  const currentAht = useMemo(() => {
    if (ahtTimeseries?.readings?.length > 0) {
      const latest = ahtTimeseries.readings[0];
      return {
        temp: latest.aht_temp_c ?? latest.temp_c,
        humidity: latest.aht_humidity ?? latest.humidity,
      };
    }
    return { temp: null, humidity: null };
  }, [ahtTimeseries]);

  const currentStarlinkPower = useMemo(() => {
    // Try dedicated power endpoint - use device_summaries for current power
    if (starlinkPower?.device_summaries && starlinkPower.device_summaries.length > 0) {
      const totalPower = starlinkPower.device_summaries.reduce(
        (sum, d) => sum + (d.overall?.avg_watts || 0), 0
      );
      return {
        power: totalPower,
        deviceCount: starlinkPower.device_summaries.length,
      };
    }
    // Fallback to calculating from devices
    if (starlinkDevices && starlinkDevices.length > 0) {
      const totalPower = starlinkDevices.reduce((sum: number, d: any) => sum + (d.power_watts || 0), 0);
      return {
        power: totalPower,
        deviceCount: starlinkDevices.length,
      };
    }
    return { power: null, deviceCount: 0 };
  }, [starlinkPower, starlinkDevices]);

  const totalReadings = thermalStats?.count ?? thermalTimeseries?.readings?.length ?? 0;

  const isLoading = thermalStatsLoading || thermalTimeseriesLoading || ahtLoading || starlinkDevicesLoading || starlinkPowerLoading;

  return (
    <div className="space-y-6">
      {/* Current Stats Row */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Current Sensor Readings
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 bg-muted/30 animate-pulse rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {/* Thermal Probe */}
              <StatCard
                icon={Thermometer}
                label="Thermal Probe"
                value={currentThermal.temp?.toFixed(1)}
                unit="°C"
                color="orange-500"
              />
              
              {/* AHT/BHT Temperature */}
              <StatCard
                icon={Thermometer}
                label="AHT Temperature"
                value={currentAht.temp?.toFixed(1)}
                unit="°C"
                color="red-500"
              />
              
              {/* AHT/BHT Humidity */}
              <StatCard
                icon={Droplets}
                label="AHT Humidity"
                value={currentAht.humidity?.toFixed(1)}
                unit="%"
                color="blue-500"
              />
              
              {/* Starlink Power */}
              <StatCard
                icon={Zap}
                label="Starlink Power"
                value={currentStarlinkPower.power?.toFixed(0)}
                unit="W"
                color="yellow-500"
                subValue={currentStarlinkPower.deviceCount}
                subLabel="Terminals"
              />
              
              {/* Total Readings */}
              <StatCard
                icon={Gauge}
                label="24h Readings"
                value={totalReadings}
                unit=""
                color="primary"
              />
            </div>
          )}
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
            {thermalTimeseriesLoading ? (
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
            {starlinkDevicesLoading ? (
              <div className="h-[200px] bg-muted/30 animate-pulse rounded-lg" />
            ) : starlinkPowerChartData.length > 0 || currentStarlinkPower.power ? (
              <div className="h-[200px]">
                {starlinkPowerChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={starlinkPowerChartData}>
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
                ) : (
                  <div className="h-full flex flex-col items-center justify-center">
                    <div className="text-4xl font-bold text-chart-4">
                      {currentStarlinkPower.power?.toFixed(0) ?? '--'}W
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Current power across {currentStarlinkPower.deviceCount} terminal(s)
                    </p>
                  </div>
                )}
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