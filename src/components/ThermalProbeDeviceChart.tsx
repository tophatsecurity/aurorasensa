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
import { useThermalProbeTimeseries, useArduinoSensorTimeseries } from "@/hooks/useAuroraApi";
import { format } from "date-fns";

// Helper to convert Celsius to Fahrenheit
const cToF = (celsius: number): number => {
  return (celsius * 9/5) + 32;
};

// Color palette for different sources
const SOURCE_COLORS: Record<string, string> = {
  'thermal_probe': '#ef4444', // red
  'arduino_th': '#3b82f6', // blue - DHT/AHT sensor
  'arduino_bmp': '#22c55e', // green - BMP280 sensor
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

const ThermalDeviceChart = () => {
  const { data: thermalData, isLoading: thermalLoading } = useThermalProbeTimeseries(24);
  const { data: arduinoData, isLoading: arduinoLoading } = useArduinoSensorTimeseries(24);

  const isLoading = thermalLoading || arduinoLoading;

  // Combine all temperature sources and format for charting
  const { chartData, sources } = useMemo(() => {
    const timeMap = new Map<string, Record<string, number | string>>();
    const sourceSet = new Set<string>();

    // Process thermal probe data
    if (thermalData?.readings && thermalData.readings.length > 0) {
      thermalData.readings.forEach((r) => {
        const timestamp = r.timestamp ? new Date(r.timestamp).getTime() : null;
        if (!timestamp) return;
        
        const temp = r.temp_c ?? r.probe_c ?? r.ambient_c;
        if (temp === undefined || temp === null) return;

        const deviceId = r.device_id || 'thermal_probe';
        const sourceKey = `probe_${deviceId}`;
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

    // Process Arduino sensor kit data - both TH (DHT/AHT) and BMP sensors
    if (arduinoData?.readings && arduinoData.readings.length > 0) {
      arduinoData.readings.forEach((r) => {
        const timestamp = r.timestamp ? new Date(r.timestamp).getTime() : null;
        if (!timestamp) return;
        
        const deviceId = r.device_id || 'arduino_1';
        const timeKey = String(timestamp);
        
        if (!timeMap.has(timeKey)) {
          timeMap.set(timeKey, { time: timestamp });
        }
        const entry = timeMap.get(timeKey)!;

        // DHT/AHT temperature (th.temp_c)
        if (r.th_temp_c !== undefined && r.th_temp_c !== null) {
          const thSourceKey = `th_${deviceId}`;
          sourceSet.add(thSourceKey);
          entry[`${thSourceKey}_f`] = Number(cToF(r.th_temp_c).toFixed(1));
          entry[`${thSourceKey}_c`] = Number(r.th_temp_c.toFixed(1));
        }

        // BMP280 temperature (bmp.temp_c)
        if (r.bmp_temp_c !== undefined && r.bmp_temp_c !== null) {
          const bmpSourceKey = `bmp_${deviceId}`;
          sourceSet.add(bmpSourceKey);
          entry[`${bmpSourceKey}_f`] = Number(cToF(r.bmp_temp_c).toFixed(1));
          entry[`${bmpSourceKey}_c`] = Number(r.bmp_temp_c.toFixed(1));
        }
      });
    }

    // Convert to array and sort by time
    const chartData = Array.from(timeMap.values())
      .sort((a, b) => (a.time as number) - (b.time as number));

    return { chartData, sources: Array.from(sourceSet) };
  }, [thermalData?.readings, arduinoData?.readings]);

  // Calculate stats for each source and overall mean
  const sourceStats = useMemo(() => {
    if (chartData.length === 0 || sources.length === 0) return null;
    
    const stats: Record<string, { avgF: number; avgC: number; count: number }> = {};
    
    // Calculate average for each source
    sources.forEach(source => {
      const temps: number[] = [];
      chartData.forEach(entry => {
        const temp = entry[`${source}_f`];
        if (typeof temp === 'number') temps.push(temp);
      });
      
      if (temps.length > 0) {
        const avgF = temps.reduce((a, b) => a + b, 0) / temps.length;
        stats[source] = {
          avgF: Number(avgF.toFixed(1)),
          avgC: Number(((avgF - 32) * 5/9).toFixed(1)),
          count: temps.length,
        };
      }
    });
    
    // Calculate overall mean of all readings
    const allTemps: number[] = [];
    chartData.forEach(entry => {
      sources.forEach(source => {
        const temp = entry[`${source}_f`];
        if (typeof temp === 'number') allTemps.push(temp);
      });
    });
    
    const overallMeanF = allTemps.length > 0 
      ? allTemps.reduce((a, b) => a + b, 0) / allTemps.length 
      : 0;
    
    return {
      bySource: stats,
      meanF: Number(overallMeanF.toFixed(1)),
      meanC: Number(((overallMeanF - 32) * 5/9).toFixed(1)),
      totalReadings: allTemps.length,
      sourceCount: Object.keys(stats).length,
    };
  }, [chartData, sources]);

  const getSourceColor = (sourceKey: string, index: number): string => {
    if (sourceKey.startsWith('probe_')) return SOURCE_COLORS['thermal_probe'];
    if (sourceKey.startsWith('th_')) return SOURCE_COLORS['arduino_th'];
    if (sourceKey.startsWith('bmp_')) return SOURCE_COLORS['arduino_bmp'];
    return DEVICE_COLORS[index % DEVICE_COLORS.length];
  };

  const formatSourceName = (sourceKey: string): string => {
    if (sourceKey.startsWith('probe_')) {
      const deviceId = sourceKey.replace('probe_', '');
      return `Probe: ${deviceId.replace(/_/g, ' ')}`;
    }
    if (sourceKey.startsWith('th_')) {
      const deviceId = sourceKey.replace('th_', '');
      return `DHT: ${deviceId.replace(/_/g, ' ')}`;
    }
    if (sourceKey.startsWith('bmp_')) {
      const deviceId = sourceKey.replace('bmp_', '');
      return `BMP: ${deviceId.replace(/_/g, ' ')}`;
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
        {!isLoading && sourceStats && (
          <div className="text-right">
            <div className="text-lg font-bold text-red-400">
              Mean: {sourceStats.meanF}°F / {sourceStats.meanC}°C
            </div>
            <div className="text-xs text-muted-foreground">
              {sourceStats.sourceCount} source{sourceStats.sourceCount !== 1 ? 's' : ''} • {sourceStats.totalReadings} readings
            </div>
          </div>
        )}
      </div>

      {/* Averages by source */}
      {!isLoading && sourceStats && Object.keys(sourceStats.bySource).length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mb-4 p-3 rounded-lg bg-muted/30 border border-border/30">
          {Object.entries(sourceStats.bySource).map(([source, stats], index) => (
            <div key={source} className="flex items-center gap-2">
              <div 
                className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                style={{ backgroundColor: getSourceColor(source, index) }}
              />
              <div className="min-w-0">
                <div className="text-xs font-medium text-foreground truncate">
                  {formatSourceName(source)}
                </div>
                <div className="text-xs text-muted-foreground">
                  Avg: {stats.avgF}°F / {stats.avgC}°C
                </div>
              </div>
            </div>
          ))}
          <div className="flex items-center gap-2 col-span-full sm:col-span-1 border-t sm:border-t-0 sm:border-l border-border/50 pt-2 sm:pt-0 sm:pl-3 mt-1 sm:mt-0">
            <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-red-400 to-blue-400 flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-xs font-medium text-foreground">Overall Mean</div>
              <div className="text-xs text-muted-foreground font-semibold">
                {sourceStats.meanF}°F / {sourceStats.meanC}°C
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Legend showing all sources */}
      {!isLoading && sources.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-4">
          {sources.map((source, index) => (
            <div key={source} className="flex items-center gap-1.5">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: getSourceColor(source, index) }}
              />
              <span className="text-xs text-muted-foreground">
                {formatSourceName(source)}
              </span>
            </div>
          ))}
        </div>
      )}

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
