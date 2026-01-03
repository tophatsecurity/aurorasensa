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
import { useThermalProbeTimeseries, useAhtSensorTimeseries, useBmtSensorTimeseries } from "@/hooks/useAuroraApi";
import { format } from "date-fns";

// Helper to convert Celsius to Fahrenheit
const cToF = (celsius: number): number => {
  return (celsius * 9/5) + 32;
};

// Color palette for different sources
const SOURCE_COLORS: Record<string, string> = {
  'thermal_probe': '#ef4444', // red
  'aht_sensor': '#3b82f6', // blue
  'bmt_sensor': '#22c55e', // green
};

// Device-specific colors within each source type
const DEVICE_COLORS = [
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
  '#06b6d4', // cyan
];

interface ThermalReading {
  timestamp: string;
  device_id?: string;
  temp_c?: number;
  probe_c?: number;
  ambient_c?: number;
  aht_temp_c?: number;
  bme280_temp_c?: number;
}

const ThermalDeviceChart = () => {
  const { data: thermalData, isLoading: thermalLoading } = useThermalProbeTimeseries(24);
  const { data: ahtData, isLoading: ahtLoading } = useAhtSensorTimeseries(24);
  const { data: bmtData, isLoading: bmtLoading } = useBmtSensorTimeseries(24);

  const isLoading = thermalLoading || ahtLoading || bmtLoading;

  // Combine all temperature sources and format for charting
  const { chartData, sources } = useMemo(() => {
    const timeMap = new Map<string, Record<string, number | string>>();
    const sourceSet = new Set<string>();

    // Process thermal probe data
    if (thermalData?.readings && thermalData.readings.length > 0) {
      thermalData.readings.forEach((r: ThermalReading) => {
        const timestamp = r.timestamp ? new Date(r.timestamp).getTime() : null;
        if (!timestamp) return;
        
        const temp = r.temp_c ?? r.probe_c ?? r.ambient_c;
        if (temp === undefined || temp === null) return;

        const deviceId = r.device_id || 'thermal_probe';
        const sourceKey = `thermal_${deviceId}`;
        sourceSet.add(sourceKey);

        const timeKey = String(timestamp);
        if (!timeMap.has(timeKey)) {
          timeMap.set(timeKey, { time: timestamp });
        }
        
        const entry = timeMap.get(timeKey)!;
        entry[`${sourceKey}_f`] = Number(cToF(temp).toFixed(1));
        entry[`${sourceKey}_c`] = Number(temp.toFixed(1));
      });
    }

    // Process AHT sensor data
    if (ahtData?.readings && ahtData.readings.length > 0) {
      ahtData.readings.forEach((r: ThermalReading) => {
        const timestamp = r.timestamp ? new Date(r.timestamp).getTime() : null;
        if (!timestamp) return;
        
        const temp = r.aht_temp_c ?? r.temp_c;
        if (temp === undefined || temp === null) return;

        const deviceId = r.device_id || 'aht_sensor';
        const sourceKey = `aht_${deviceId}`;
        sourceSet.add(sourceKey);

        const timeKey = String(timestamp);
        if (!timeMap.has(timeKey)) {
          timeMap.set(timeKey, { time: timestamp });
        }
        
        const entry = timeMap.get(timeKey)!;
        entry[`${sourceKey}_f`] = Number(cToF(temp).toFixed(1));
        entry[`${sourceKey}_c`] = Number(temp.toFixed(1));
      });
    }

    // Process BMT/BME280 sensor data
    if (bmtData?.readings && bmtData.readings.length > 0) {
      bmtData.readings.forEach((r: ThermalReading & { bme280_temp_c?: number }) => {
        const timestamp = r.timestamp ? new Date(r.timestamp).getTime() : null;
        if (!timestamp) return;
        
        const temp = r.bme280_temp_c ?? r.temp_c;
        if (temp === undefined || temp === null) return;

        const deviceId = r.device_id || 'bmt_sensor';
        const sourceKey = `bmt_${deviceId}`;
        sourceSet.add(sourceKey);

        const timeKey = String(timestamp);
        if (!timeMap.has(timeKey)) {
          timeMap.set(timeKey, { time: timestamp });
        }
        
        const entry = timeMap.get(timeKey)!;
        entry[`${sourceKey}_f`] = Number(cToF(temp).toFixed(1));
        entry[`${sourceKey}_c`] = Number(temp.toFixed(1));
      });
    }

    // Convert to array and sort by time
    const chartData = Array.from(timeMap.values())
      .sort((a, b) => (a.time as number) - (b.time as number));

    return { chartData, sources: Array.from(sourceSet) };
  }, [thermalData?.readings, ahtData?.readings, bmtData?.readings]);

  // Calculate current stats
  const currentStats = useMemo(() => {
    if (chartData.length === 0 || sources.length === 0) return null;
    
    const latest = chartData[chartData.length - 1];
    const temps: number[] = [];
    
    sources.forEach(s => {
      const temp = latest[`${s}_f`];
      if (typeof temp === 'number') temps.push(temp);
    });
    
    if (temps.length === 0) return null;
    
    const avg = temps.reduce((a, b) => a + b, 0) / temps.length;
    return {
      avgF: Number(avg.toFixed(1)),
      avgC: Number(((avg - 32) * 5/9).toFixed(1)),
      sourceCount: sources.length,
    };
  }, [chartData, sources]);

  const getSourceColor = (sourceKey: string, index: number): string => {
    if (sourceKey.startsWith('thermal_')) return SOURCE_COLORS['thermal_probe'];
    if (sourceKey.startsWith('aht_')) return SOURCE_COLORS['aht_sensor'];
    if (sourceKey.startsWith('bmt_')) return SOURCE_COLORS['bmt_sensor'];
    return DEVICE_COLORS[index % DEVICE_COLORS.length];
  };

  const formatSourceName = (sourceKey: string): string => {
    if (sourceKey.startsWith('thermal_')) {
      const deviceId = sourceKey.replace('thermal_', '');
      return `Probe: ${deviceId.replace(/_/g, ' ')}`;
    }
    if (sourceKey.startsWith('aht_')) {
      const deviceId = sourceKey.replace('aht_', '');
      return `AHT: ${deviceId.replace(/_/g, ' ')}`;
    }
    if (sourceKey.startsWith('bmt_')) {
      const deviceId = sourceKey.replace('bmt_', '');
      return `BME: ${deviceId.replace(/_/g, ' ')}`;
    }
    return sourceKey.replace(/_/g, ' ');
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
              All Temperatures Over Time
            </h4>
            <p className="text-xs text-muted-foreground">
              Thermal Probe + Arduino Sensors (°F / °C)
            </p>
          </div>
        </div>
        {!isLoading && currentStats && (
          <div className="text-right">
            <div className="text-lg font-bold text-red-400">
              {currentStats.avgF}°F / {currentStats.avgC}°C
            </div>
            <div className="text-xs text-muted-foreground">
              {currentStats.sourceCount} source{currentStats.sourceCount !== 1 ? 's' : ''}
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
            No thermal data found
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
                  const sourceKey = name.replace('_f', '');
                  const tempC = props.payload[`${sourceKey}_c`];
                  return [`${value}°F / ${tempC}°C`, formatSourceName(sourceKey)];
                }}
              />
              <Legend 
                formatter={(value) => formatSourceName(value.replace('_f', ''))}
                wrapperStyle={{ fontSize: '11px' }}
              />
              {sources.map((source, index) => (
                <Line
                  key={source}
                  type="monotone"
                  dataKey={`${source}_f`}
                  stroke={getSourceColor(source, index)}
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

export default ThermalDeviceChart;
