import { useMemo } from "react";
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  Legend
} from "recharts";
import { Thermometer, Loader2 } from "lucide-react";
import { useThermalProbeTimeseries } from "@/hooks/useAuroraApi";
import { format } from "date-fns";

// Helper to convert Celsius to Fahrenheit
const cToF = (celsius: number): number => {
  return (celsius * 9/5) + 32;
};

// Color palette for devices
const DEVICE_COLORS = [
  '#ef4444', // red
  '#f59e0b', // amber
  '#22c55e', // green
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
];

const ThermalProbeDeviceChart = () => {
  const { data: thermalData, isLoading } = useThermalProbeTimeseries(24);

  // Get unique devices and format time series data
  const { chartData, devices } = useMemo(() => {
    if (!thermalData?.readings || thermalData.readings.length === 0) {
      return { chartData: [], devices: [] };
    }

    // Get unique device IDs
    const deviceSet = new Set<string>();
    thermalData.readings.forEach(r => {
      if (r.device_id) deviceSet.add(r.device_id);
    });
    const devices = Array.from(deviceSet);

    // Group by timestamp and create data points
    const timeMap = new Map<string, Record<string, number | string>>();
    
    thermalData.readings.forEach(r => {
      const timestamp = r.timestamp ? new Date(r.timestamp).getTime() : null;
      if (!timestamp || !r.device_id) return;
      
      const temp = r.temp_c ?? r.probe_c ?? r.ambient_c;
      if (temp === undefined) return;

      const timeKey = String(timestamp);
      if (!timeMap.has(timeKey)) {
        timeMap.set(timeKey, { time: timestamp });
      }
      
      const entry = timeMap.get(timeKey)!;
      // Store both F and C for each device
      entry[`${r.device_id}_f`] = Number(cToF(temp).toFixed(1));
      entry[`${r.device_id}_c`] = Number(temp.toFixed(1));
    });

    // Convert to array and sort by time
    const chartData = Array.from(timeMap.values())
      .sort((a, b) => (a.time as number) - (b.time as number));

    return { chartData, devices };
  }, [thermalData?.readings]);

  // Calculate current stats
  const currentStats = useMemo(() => {
    if (chartData.length === 0 || devices.length === 0) return null;
    
    const latest = chartData[chartData.length - 1];
    const temps: number[] = [];
    
    devices.forEach(d => {
      const temp = latest[`${d}_f`];
      if (typeof temp === 'number') temps.push(temp);
    });
    
    if (temps.length === 0) return null;
    
    const avg = temps.reduce((a, b) => a + b, 0) / temps.length;
    return {
      avgF: Number(avg.toFixed(1)),
      avgC: Number(((avg - 32) * 5/9).toFixed(1)),
      deviceCount: devices.length,
    };
  }, [chartData, devices]);

  const formatDeviceName = (deviceId: string) => {
    return deviceId.replace(/_/g, ' ').replace(/thermal probe/i, '').trim() || deviceId;
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
              Thermal Probe Over Time
            </h4>
            <p className="text-xs text-muted-foreground">
              Temperature by device (°F / °C)
            </p>
          </div>
        </div>
        {!isLoading && currentStats && (
          <div className="text-right">
            <div className="text-lg font-bold text-red-400">
              {currentStats.avgF}°F / {currentStats.avgC}°C
            </div>
            <div className="text-xs text-muted-foreground">
              {currentStats.deviceCount} device{currentStats.deviceCount !== 1 ? 's' : ''}
            </div>
          </div>
        )}
      </div>

      <div className="h-[280px]">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
            No thermal probe data found
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart 
              data={chartData} 
              margin={{ top: 10, right: 10, left: -10, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis 
                dataKey="time"
                type="number"
                domain={['dataMin', 'dataMax']}
                tickFormatter={(v) => format(new Date(v), 'HH:mm')}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}°F`}
                label={{ 
                  value: 'Temp (°F)', 
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
                labelFormatter={(v) => format(new Date(v as number), 'MMM d, HH:mm:ss')}
                formatter={(value: number, name: string, props) => {
                  const deviceId = name.replace('_f', '');
                  const tempC = props.payload[`${deviceId}_c`];
                  return [`${value}°F / ${tempC}°C`, formatDeviceName(deviceId)];
                }}
              />
              <Legend 
                formatter={(value) => formatDeviceName(value.replace('_f', ''))}
                wrapperStyle={{ fontSize: '11px' }}
              />
              {devices.map((device, index) => (
                <Line
                  key={device}
                  type="monotone"
                  dataKey={`${device}_f`}
                  stroke={DEVICE_COLORS[index % DEVICE_COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default ThermalProbeDeviceChart;
