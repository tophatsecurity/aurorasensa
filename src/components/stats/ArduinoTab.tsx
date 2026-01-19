import { useMemo } from "react";
import { 
  Cpu, 
  Thermometer, 
  Droplets, 
  Sun, 
  Gauge,
  Activity,
  Volume2,
  Sliders,
  TrendingUp,
  ArrowUp,
  ArrowDown,
  Minus
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  useArduinoDevicesFromReadings,
  useArduinoReadings,
} from "@/hooks/aurora/arduino";
import { 
  useArduino1hrStats,
  useArduino24hrStats,
  type ArduinoHourlyStats,
} from "@/hooks/aurora/arduinoStats";
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend,
  CartesianGrid,
  AreaChart,
  Area
} from "recharts";

interface StatCardProps {
  title: string;
  value: number | null | undefined;
  unit: string;
  icon: React.ReactNode;
  color: string;
  min?: number | null;
  max?: number | null;
  avg?: number | null;
}

function ArduinoStatCard({ title, value, unit, icon, color, min, max, avg }: StatCardProps) {
  const hasStats = min !== undefined || max !== undefined || avg !== undefined;
  
  return (
    <Card className="glass-card border-border/50">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          <div className={`w-6 h-6 rounded-md ${color} flex items-center justify-center`}>
            {icon}
          </div>
          <span className="text-xs">{title}</span>
        </div>
        <p className="text-2xl font-bold font-mono">
          {value !== undefined && value !== null ? (
            typeof value === 'number' && !Number.isInteger(value) 
              ? value.toFixed(1) 
              : value
          ) : '—'}
          <span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span>
        </p>
        {hasStats && (
          <div className="flex gap-3 mt-2 text-[10px] text-muted-foreground">
            {min !== null && min !== undefined && (
              <span className="flex items-center gap-0.5">
                <ArrowDown className="w-2.5 h-2.5 text-blue-400" />
                {typeof min === 'number' ? min.toFixed(1) : min}
              </span>
            )}
            {max !== null && max !== undefined && (
              <span className="flex items-center gap-0.5">
                <ArrowUp className="w-2.5 h-2.5 text-red-400" />
                {typeof max === 'number' ? max.toFixed(1) : max}
              </span>
            )}
            {avg !== null && avg !== undefined && (
              <span className="flex items-center gap-0.5">
                <Minus className="w-2.5 h-2.5" />
                {typeof avg === 'number' ? avg.toFixed(1) : avg}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ArduinoTab() {
  const { data: arduinoDevices } = useArduinoDevicesFromReadings();
  const { data: hourlyData, isLoading: hourlyLoading } = useArduino1hrStats();
  const { data: dailyData, isLoading: dailyLoading } = useArduino24hrStats();
  const { data: arduinoTimeseries } = useArduinoReadings(24);

  const isLoading = hourlyLoading || dailyLoading;
  const aggregated = hourlyData?.aggregated || dailyData?.aggregated;
  const stats = hourlyData?.stats || dailyData?.stats || [];

  // Environmental chart data
  const envChartData = useMemo(() => {
    if (!stats.length) return [];
    return stats
      .slice()
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .map((s: ArduinoHourlyStats) => ({
        time: new Date(s.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        temperature: s.avg_temp_c,
        humidity: s.avg_humidity,
        pressure: s.avg_pressure_hpa,
        bmpTemp: s.avg_bmp_temp_c,
      }));
  }, [stats]);

  // Accelerometer chart data
  const accelChartData = useMemo(() => {
    if (!stats.length) return [];
    return stats
      .slice()
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .map((s: ArduinoHourlyStats) => ({
        time: new Date(s.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        x: s.avg_accel_x,
        y: s.avg_accel_y,
        z: s.avg_accel_z,
      }));
  }, [stats]);

  // Analog sensors chart data
  const analogChartData = useMemo(() => {
    if (!stats.length) return [];
    return stats
      .slice()
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .map((s: ArduinoHourlyStats) => ({
        time: new Date(s.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        light: s.avg_light_raw,
        sound: s.avg_sound_raw,
        pot: s.avg_pot_raw,
      }));
  }, [stats]);

  // Legacy timeseries for backward compatibility
  const legacyChartData = useMemo(() => {
    if (!arduinoTimeseries?.readings?.length) return [];
    return arduinoTimeseries.readings
      .slice()
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .map(r => ({
        time: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        temperature: r.temperature_c,
        humidity: r.humidity,
        pressure: r.pressure,
        light: r.light_level,
      }));
  }, [arduinoTimeseries]);

  // Use new stats data if available, otherwise fall back to legacy
  const chartData = envChartData.length > 0 ? envChartData : legacyChartData;

  return (
    <div className="space-y-6">
      {/* Header with device count */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Cpu className="w-6 h-6 text-green-400" />
          <div>
            <h2 className="text-lg font-semibold">Arduino Sensor Kit</h2>
            <p className="text-sm text-muted-foreground">All 10 measurements from stats API</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {aggregated && (
            <Badge variant="outline" className="text-xs">
              {aggregated.total_readings.toLocaleString()} readings
            </Badge>
          )}
          <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30">
            {arduinoDevices?.length || aggregated?.device_count || 0} device(s)
          </Badge>
        </div>
      </div>

      {/* All 10 Measurements Grid */}
      {aggregated && (
        <div className="space-y-4">
          {/* Environmental Sensors (4) */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <Thermometer className="w-4 h-4" />
              Environmental Sensors
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <ArduinoStatCard 
                title="Temperature (TH)"
                value={aggregated.current.temp_c}
                unit="°C"
                icon={<Thermometer className="w-3.5 h-3.5 text-red-400" />}
                color="bg-red-500/20"
                min={aggregated.minimums.temp_c}
                max={aggregated.maximums.temp_c}
                avg={aggregated.averages.temp_c}
              />
              <ArduinoStatCard 
                title="Humidity"
                value={aggregated.current.humidity}
                unit="%"
                icon={<Droplets className="w-3.5 h-3.5 text-blue-400" />}
                color="bg-blue-500/20"
                min={aggregated.minimums.humidity}
                max={aggregated.maximums.humidity}
                avg={aggregated.averages.humidity}
              />
              <ArduinoStatCard 
                title="Pressure (BMP)"
                value={aggregated.current.pressure_hpa}
                unit="hPa"
                icon={<Gauge className="w-3.5 h-3.5 text-purple-400" />}
                color="bg-purple-500/20"
                min={aggregated.minimums.pressure_hpa}
                max={aggregated.maximums.pressure_hpa}
                avg={aggregated.averages.pressure_hpa}
              />
              <ArduinoStatCard 
                title="BMP Temperature"
                value={aggregated.current.bmp_temp_c}
                unit="°C"
                icon={<Thermometer className="w-3.5 h-3.5 text-orange-400" />}
                color="bg-orange-500/20"
                min={aggregated.minimums.bmp_temp_c}
                max={aggregated.maximums.bmp_temp_c}
                avg={aggregated.averages.bmp_temp_c}
              />
            </div>
          </div>

          {/* Motion Sensors (4) */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Motion Sensors (Accelerometer)
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <ArduinoStatCard 
                title="Accel X"
                value={aggregated.current.accel_x}
                unit="m/s²"
                icon={<Activity className="w-3.5 h-3.5 text-emerald-400" />}
                color="bg-emerald-500/20"
                min={aggregated.minimums.accel_x}
                max={aggregated.maximums.accel_x}
                avg={aggregated.averages.accel_x}
              />
              <ArduinoStatCard 
                title="Accel Y"
                value={aggregated.current.accel_y}
                unit="m/s²"
                icon={<Activity className="w-3.5 h-3.5 text-teal-400" />}
                color="bg-teal-500/20"
                min={aggregated.minimums.accel_y}
                max={aggregated.maximums.accel_y}
                avg={aggregated.averages.accel_y}
              />
              <ArduinoStatCard 
                title="Accel Z"
                value={aggregated.current.accel_z}
                unit="m/s²"
                icon={<Activity className="w-3.5 h-3.5 text-sky-400" />}
                color="bg-sky-500/20"
                min={aggregated.minimums.accel_z}
                max={aggregated.maximums.accel_z}
                avg={aggregated.averages.accel_z}
              />
              <ArduinoStatCard 
                title="Magnitude"
                value={aggregated.current.accel_magnitude}
                unit="m/s²"
                icon={<TrendingUp className="w-3.5 h-3.5 text-indigo-400" />}
                color="bg-indigo-500/20"
                min={aggregated.minimums.accel_magnitude}
                max={aggregated.maximums.accel_magnitude}
                avg={aggregated.averages.accel_magnitude}
              />
            </div>
          </div>

          {/* Analog Sensors (3) */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <Sliders className="w-4 h-4" />
              Analog Sensors
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <ArduinoStatCard 
                title="Light Level"
                value={aggregated.current.light_raw}
                unit=""
                icon={<Sun className="w-3.5 h-3.5 text-yellow-400" />}
                color="bg-yellow-500/20"
                min={aggregated.minimums.light_raw}
                max={aggregated.maximums.light_raw}
                avg={aggregated.averages.light_raw}
              />
              <ArduinoStatCard 
                title="Sound Level"
                value={aggregated.current.sound_raw}
                unit=""
                icon={<Volume2 className="w-3.5 h-3.5 text-cyan-400" />}
                color="bg-cyan-500/20"
                min={aggregated.minimums.sound_raw}
                max={aggregated.maximums.sound_raw}
                avg={aggregated.averages.sound_raw}
              />
              <ArduinoStatCard 
                title="Potentiometer"
                value={aggregated.current.pot_raw}
                unit=""
                icon={<Sliders className="w-3.5 h-3.5 text-pink-400" />}
                color="bg-pink-500/20"
                min={aggregated.minimums.pot_raw}
                max={aggregated.maximums.pot_raw}
                avg={aggregated.averages.pot_raw}
              />
            </div>
          </div>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Device List */}
        <Card className="glass-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Cpu className="w-4 h-4 text-green-400" />
              Arduino Devices ({arduinoDevices?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {arduinoDevices?.map(device => (
                  <div 
                    key={device.composite_key}
                    className="p-3 rounded-lg border border-border/50 hover:border-green-500/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-sm truncate">{device.device_id}</p>
                      <Badge variant="default" className="bg-green-500/20 text-green-400 border-green-500/30">
                        Active
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Temp:</span>
                        <span className="ml-1 font-mono">
                          {device.metrics.temperature_c !== undefined
                            ? `${device.metrics.temperature_c.toFixed(1)}°C`
                            : 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Humidity:</span>
                        <span className="ml-1 font-mono">
                          {device.metrics.humidity !== undefined
                            ? `${device.metrics.humidity.toFixed(0)}%`
                            : 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Pressure:</span>
                        <span className="ml-1 font-mono">
                          {device.metrics.pressure !== undefined
                            ? `${device.metrics.pressure.toFixed(0)} hPa`
                            : 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Light:</span>
                        <span className="ml-1 font-mono">
                          {device.metrics.light_level !== undefined
                            ? `${device.metrics.light_level.toFixed(0)} lux`
                            : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                {(!arduinoDevices || arduinoDevices.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Cpu className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No Arduino devices found</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Environmental Chart */}
        <Card className="glass-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-red-400" />
              Environmental Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 1 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis 
                      dataKey="time" 
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis 
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                    <Area 
                      type="monotone" 
                      dataKey="temperature" 
                      stroke="#ef4444" 
                      fill="#ef4444"
                      fillOpacity={0.2}
                      name="Temp (°C)"
                      dot={false}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="humidity" 
                      stroke="#3b82f6" 
                      fill="#3b82f6"
                      fillOpacity={0.2}
                      name="Humidity (%)"
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Thermometer className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No environmental data available</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Accelerometer Chart */}
        {accelChartData.length > 1 && (
          <Card className="glass-card border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                Accelerometer (X, Y, Z)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={accelChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis 
                      dataKey="time" 
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis 
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                    <Line 
                      type="monotone" 
                      dataKey="x" 
                      stroke="#10b981" 
                      name="X"
                      dot={false}
                      strokeWidth={1.5}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="y" 
                      stroke="#14b8a6" 
                      name="Y"
                      dot={false}
                      strokeWidth={1.5}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="z" 
                      stroke="#0ea5e9" 
                      name="Z"
                      dot={false}
                      strokeWidth={1.5}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Analog Sensors Chart */}
        {analogChartData.length > 1 && (
          <Card className="glass-card border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sliders className="w-4 h-4 text-pink-400" />
                Analog Sensors (Light, Sound, Pot)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analogChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis 
                      dataKey="time" 
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis 
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                    <Line 
                      type="monotone" 
                      dataKey="light" 
                      stroke="#eab308" 
                      name="Light"
                      dot={false}
                      strokeWidth={1.5}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="sound" 
                      stroke="#06b6d4" 
                      name="Sound"
                      dot={false}
                      strokeWidth={1.5}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="pot" 
                      stroke="#ec4899" 
                      name="Pot"
                      dot={false}
                      strokeWidth={1.5}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Loading State */}
      {isLoading && !aggregated && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Cpu className="w-12 h-12 mx-auto mb-3 animate-pulse text-green-400" />
            <p className="text-muted-foreground">Loading Arduino stats...</p>
          </div>
        </div>
      )}
    </div>
  );
}
