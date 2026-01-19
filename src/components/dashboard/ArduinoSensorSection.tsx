import { useMemo } from "react";
import { 
  Thermometer, 
  Droplets, 
  Gauge, 
  Activity, 
  Sun, 
  Volume2,
  Sliders,
  Cpu,
  TrendingUp,
  ArrowUp,
  ArrowDown,
  Minus
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useArduino1hrStats, useArduino24hrStats, ArduinoHourlyStats } from "@/hooks/aurora/arduinoStats";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
  LineChart,
  Line,
  Legend
} from "recharts";

interface MeasurementCardProps {
  title: string;
  value: number | null;
  unit: string;
  icon: React.ReactNode;
  color: string;
  min?: number | null;
  max?: number | null;
  avg?: number | null;
}

function MeasurementCard({ title, value, unit, icon, color, min, max, avg }: MeasurementCardProps) {
  const hasStats = min !== undefined || max !== undefined || avg !== undefined;
  
  return (
    <Card className="glass-card border-border/50">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center`}>
            {icon}
          </div>
          <span className="text-xs text-muted-foreground font-medium">{title}</span>
        </div>
        <p className="text-2xl font-bold font-mono">
          {value !== null ? (
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
                {min.toFixed(1)}
              </span>
            )}
            {max !== null && max !== undefined && (
              <span className="flex items-center gap-0.5">
                <ArrowUp className="w-2.5 h-2.5 text-red-400" />
                {max.toFixed(1)}
              </span>
            )}
            {avg !== null && avg !== undefined && (
              <span className="flex items-center gap-0.5">
                <Minus className="w-2.5 h-2.5" />
                {avg.toFixed(1)}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ArduinoSensorSection() {
  const { data: hourlyData, isLoading: hourlyLoading } = useArduino1hrStats();
  const { data: dailyData, isLoading: dailyLoading } = useArduino24hrStats();

  const isLoading = hourlyLoading || dailyLoading;
  const aggregated = hourlyData?.aggregated || dailyData?.aggregated;
  const stats = hourlyData?.stats || [];

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!stats.length) return [];
    return stats
      .slice()
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .map((s: ArduinoHourlyStats) => ({
        time: new Date(s.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        temp: s.avg_temp_c,
        humidity: s.avg_humidity,
        pressure: s.avg_pressure_hpa ? s.avg_pressure_hpa / 10 : undefined, // Scale for chart
        light: s.avg_light_raw ? s.avg_light_raw / 10 : undefined, // Scale for chart
        sound: s.avg_sound_raw ? s.avg_sound_raw / 10 : undefined, // Scale for chart
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

  if (isLoading) {
    return (
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Cpu className="w-5 h-5 text-green-400" />
          Arduino Sensor Kit
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 animate-pulse">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="h-24 bg-muted/20 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!aggregated || aggregated.total_readings === 0) {
    return (
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Cpu className="w-5 h-5 text-green-400" />
          Arduino Sensor Kit
        </h2>
        <Card className="glass-card border-border/50">
          <CardContent className="p-8 text-center">
            <Cpu className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-muted-foreground">No Arduino sensor data available</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { current, averages, minimums, maximums } = aggregated;

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Cpu className="w-5 h-5 text-green-400" />
          Arduino Sensor Kit
        </h2>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {aggregated.total_readings.toLocaleString()} readings
          </Badge>
          <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
            {aggregated.device_count} device{aggregated.device_count !== 1 ? 's' : ''}
          </Badge>
        </div>
      </div>

      {/* Environmental Sensors Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <MeasurementCard
          title="Temperature (TH)"
          value={current.temp_c}
          unit="°C"
          icon={<Thermometer className="w-4 h-4 text-red-400" />}
          color="bg-red-500/20"
          min={minimums.temp_c}
          max={maximums.temp_c}
          avg={averages.temp_c}
        />
        <MeasurementCard
          title="Humidity"
          value={current.humidity}
          unit="%"
          icon={<Droplets className="w-4 h-4 text-blue-400" />}
          color="bg-blue-500/20"
          min={minimums.humidity}
          max={maximums.humidity}
          avg={averages.humidity}
        />
        <MeasurementCard
          title="Pressure (BMP)"
          value={current.pressure_hpa}
          unit="hPa"
          icon={<Gauge className="w-4 h-4 text-purple-400" />}
          color="bg-purple-500/20"
          min={minimums.pressure_hpa}
          max={maximums.pressure_hpa}
          avg={averages.pressure_hpa}
        />
        <MeasurementCard
          title="BMP Temp"
          value={current.bmp_temp_c}
          unit="°C"
          icon={<Thermometer className="w-4 h-4 text-orange-400" />}
          color="bg-orange-500/20"
          min={minimums.bmp_temp_c}
          max={maximums.bmp_temp_c}
          avg={averages.bmp_temp_c}
        />
      </div>

      {/* Analog Sensors Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        <MeasurementCard
          title="Light Level"
          value={current.light_raw}
          unit=""
          icon={<Sun className="w-4 h-4 text-yellow-400" />}
          color="bg-yellow-500/20"
          min={minimums.light_raw}
          max={maximums.light_raw}
          avg={averages.light_raw}
        />
        <MeasurementCard
          title="Sound Level"
          value={current.sound_raw}
          unit=""
          icon={<Volume2 className="w-4 h-4 text-cyan-400" />}
          color="bg-cyan-500/20"
          min={minimums.sound_raw}
          max={maximums.sound_raw}
          avg={averages.sound_raw}
        />
        <MeasurementCard
          title="Potentiometer"
          value={current.pot_raw}
          unit=""
          icon={<Sliders className="w-4 h-4 text-pink-400" />}
          color="bg-pink-500/20"
          min={minimums.pot_raw}
          max={maximums.pot_raw}
          avg={averages.pot_raw}
        />
      </div>

      {/* Accelerometer Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <MeasurementCard
          title="Accel X"
          value={current.accel_x}
          unit="m/s²"
          icon={<Activity className="w-4 h-4 text-emerald-400" />}
          color="bg-emerald-500/20"
          min={minimums.accel_x}
          max={maximums.accel_x}
          avg={averages.accel_x}
        />
        <MeasurementCard
          title="Accel Y"
          value={current.accel_y}
          unit="m/s²"
          icon={<Activity className="w-4 h-4 text-teal-400" />}
          color="bg-teal-500/20"
          min={minimums.accel_y}
          max={maximums.accel_y}
          avg={averages.accel_y}
        />
        <MeasurementCard
          title="Accel Z"
          value={current.accel_z}
          unit="m/s²"
          icon={<Activity className="w-4 h-4 text-sky-400" />}
          color="bg-sky-500/20"
          min={minimums.accel_z}
          max={maximums.accel_z}
          avg={averages.accel_z}
        />
        <MeasurementCard
          title="Magnitude"
          value={current.accel_magnitude}
          unit="m/s²"
          icon={<TrendingUp className="w-4 h-4 text-indigo-400" />}
          color="bg-indigo-500/20"
          min={minimums.accel_magnitude}
          max={maximums.accel_magnitude}
          avg={averages.accel_magnitude}
        />
      </div>

      {/* Charts */}
      {chartData.length > 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Environmental Chart */}
          <Card className="glass-card border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-red-400" />
                Environmental Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis 
                      dataKey="time" 
                      tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis 
                      tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '11px',
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="temp" 
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
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={accelChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis 
                        dataKey="time" 
                        tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                        tickLine={false}
                        interval="preserveStartEnd"
                      />
                      <YAxis 
                        tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '11px',
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
        </div>
      )}
    </div>
  );
}
