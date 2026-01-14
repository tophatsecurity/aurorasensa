import { Cpu, Thermometer, Droplets, Sun, Wind } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  useArduinoDevicesFromReadings,
  useArduinoReadings,
  useArduinoStats,
} from "@/hooks/aurora/arduino";
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend,
  CartesianGrid 
} from "recharts";
import { useMemo } from "react";

export function ArduinoTab() {
  const { data: arduinoDevices } = useArduinoDevicesFromReadings();
  const { data: arduinoStats } = useArduinoStats();
  const { data: arduinoTimeseries } = useArduinoReadings(24);

  // Transform timeseries for charts
  const chartData = useMemo(() => {
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Arduino Device List */}
      <Card className="glass-card border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Cpu className="w-4 h-4 text-green-400" />
            Arduino Devices ({arduinoDevices?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
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

      {/* Arduino Stats & Charts */}
      <div className="lg:col-span-2 space-y-4">
        {/* Global Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ArduinoStatCard 
            title="Avg Temp"
            value={arduinoStats?.avg_temperature_c}
            unit="°C"
            icon={<Thermometer className="w-4 h-4" />}
          />
          <ArduinoStatCard 
            title="Avg Humidity"
            value={arduinoStats?.avg_humidity}
            unit="%"
            icon={<Droplets className="w-4 h-4" />}
          />
          <ArduinoStatCard 
            title="Readings/24h"
            value={arduinoStats?.readings_last_24h}
            unit=""
            icon={<Wind className="w-4 h-4" />}
          />
          <ArduinoStatCard 
            title="Devices"
            value={arduinoDevices?.length || arduinoStats?.device_count}
            unit=""
            icon={<Cpu className="w-4 h-4" />}
          />
        </div>

        {/* Performance Charts */}
        {chartData.length > 1 && (
          <Card className="glass-card border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                Sensor History (24h)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis 
                      dataKey="time" 
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      tickLine={false}
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
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="temperature" 
                      stroke="#10b981" 
                      name="Temperature (°C)"
                      dot={false}
                      strokeWidth={2}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="humidity" 
                      stroke="#3b82f6" 
                      name="Humidity (%)"
                      dot={false}
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {chartData.length <= 1 && (
          <Card className="glass-card border-border/50">
            <CardContent className="p-8 text-center">
              <Sun className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">
                No historical data available for Arduino sensors
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function ArduinoStatCard({ title, value, unit, icon }: { 
  title: string; 
  value?: number | null; 
  unit: string;
  icon: React.ReactNode;
}) {
  return (
    <Card className="glass-card border-border/50">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          {icon}
          <span className="text-xs">{title}</span>
        </div>
        <p className="text-2xl font-bold font-mono">
          {value !== undefined && value !== null ? (
            typeof value === 'number' && !Number.isInteger(value) 
              ? value.toFixed(1) 
              : value
          ) : 'N/A'}
          <span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span>
        </p>
      </CardContent>
    </Card>
  );
}
