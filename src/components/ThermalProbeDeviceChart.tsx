import { useMemo } from "react";
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  Legend
} from "recharts";
import { Thermometer, Loader2 } from "lucide-react";
import { useThermalProbeTimeseries, useSensorTypeStats } from "@/hooks/useAuroraApi";

interface DeviceData {
  device_name: string;
  temp_c: number;
  temp_f: number;
  total_readings: number;
}

// Helper to convert Celsius to Fahrenheit
const cToF = (celsius: number): number => {
  return (celsius * 9/5) + 32;
};

const ThermalProbeDeviceChart = () => {
  const { data: thermalData, isLoading: thermalLoading } = useThermalProbeTimeseries(24);
  const { data: thermalStats, isLoading: statsLoading } = useSensorTypeStats("thermal_probe");

  const isLoading = thermalLoading || statsLoading;

  // Group readings by device and calculate stats
  const deviceData = useMemo<DeviceData[]>(() => {
    if (!thermalData?.readings || thermalData.readings.length === 0) return [];
    
    const deviceMap = new Map<string, { temps: number[]; count: number }>();
    
    thermalData.readings.forEach(r => {
      const deviceId = r.device_id || 'unknown';
      const temp = r.temp_c ?? r.probe_c ?? r.ambient_c;
      
      if (temp === undefined) return;
      
      if (!deviceMap.has(deviceId)) {
        deviceMap.set(deviceId, { temps: [], count: 0 });
      }
      
      const device = deviceMap.get(deviceId)!;
      device.temps.push(temp);
      device.count++;
    });
    
    return Array.from(deviceMap.entries()).map(([name, data]) => {
      const avgTemp = data.temps.reduce((a, b) => a + b, 0) / data.temps.length;
      return {
        device_name: name.replace(/_/g, ' ').replace(/thermal probe/i, '').trim() || name,
        temp_c: Number(avgTemp.toFixed(1)),
        temp_f: Number(cToF(avgTemp).toFixed(1)),
        total_readings: data.count,
      };
    }).sort((a, b) => b.total_readings - a.total_readings);
  }, [thermalData?.readings]);

  // Calculate overall stats
  const overallStats = useMemo(() => {
    if (deviceData.length === 0) return { avgC: null, avgF: null, totalReadings: 0 };
    const totalReadings = deviceData.reduce((sum, d) => sum + d.total_readings, 0);
    const avgC = deviceData.reduce((sum, d) => sum + d.temp_c * d.total_readings, 0) / totalReadings;
    return {
      avgC: Number(avgC.toFixed(1)),
      avgF: Number(cToF(avgC).toFixed(1)),
      totalReadings,
    };
  }, [deviceData]);

  // Color based on temperature
  const getBarColor = (temp_c: number) => {
    if (temp_c < 10) return '#3b82f6'; // blue - cold
    if (temp_c < 25) return '#22c55e'; // green - normal
    if (temp_c < 35) return '#f59e0b'; // amber - warm
    return '#ef4444'; // red - hot
  };

  return (
    <div className="glass-card rounded-xl p-5 border border-border/50">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
            <Thermometer className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground">
              Thermal Probe by Device
            </h4>
            <p className="text-xs text-muted-foreground">
              Temperature readings per device (°F / °C)
            </p>
          </div>
        </div>
        {!isLoading && overallStats.avgC !== null && (
          <div className="text-right">
            <div className="text-lg font-bold text-red-400">
              {overallStats.avgF}°F / {overallStats.avgC}°C
            </div>
            <div className="text-xs text-muted-foreground">
              {overallStats.totalReadings.toLocaleString()} total readings
            </div>
          </div>
        )}
      </div>

      <div className="h-[280px]">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : deviceData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
            No thermal probe devices found
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={deviceData} 
              margin={{ top: 10, right: 10, left: -10, bottom: 60 }}
              layout="horizontal"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} vertical={false} />
              <XAxis 
                dataKey="device_name" 
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                angle={-45}
                textAnchor="end"
                height={60}
                interval={0}
              />
              <YAxis 
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}`}
                label={{ 
                  value: 'Readings', 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { fontSize: 10, fill: 'hsl(var(--muted-foreground))' }
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold' }}
                formatter={(value: number, name: string, props: { payload: DeviceData }) => {
                  if (name === 'total_readings') {
                    return [
                      <span key="readings">
                        <div>{value.toLocaleString()} readings</div>
                        <div className="text-red-400 mt-1">
                          Avg: {props.payload.temp_f}°F / {props.payload.temp_c}°C
                        </div>
                      </span>,
                      'Data'
                    ];
                  }
                  return [value, name];
                }}
              />
              <Bar 
                dataKey="total_readings" 
                radius={[4, 4, 0, 0]}
                animationDuration={300}
              >
                {deviceData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(entry.temp_c)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Temperature Legend */}
      {!isLoading && deviceData.length > 0 && (
        <div className="mt-4 pt-3 border-t border-border/50">
          <div className="flex items-center justify-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-blue-500" />
              <span className="text-muted-foreground">&lt;50°F / 10°C (Cold)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-green-500" />
              <span className="text-muted-foreground">50-77°F / 10-25°C (Normal)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-amber-500" />
              <span className="text-muted-foreground">77-95°F / 25-35°C (Warm)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-red-500" />
              <span className="text-muted-foreground">&gt;95°F / 35°C (Hot)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThermalProbeDeviceChart;
