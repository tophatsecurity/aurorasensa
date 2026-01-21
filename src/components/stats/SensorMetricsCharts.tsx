import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import type { SensorReading } from "./types";

interface SensorMetricsChartsProps {
  readings: SensorReading[];
  sensorType: string;
}

const COLORS = ["#8b5cf6", "#06b6d4", "#22c55e", "#f59e0b", "#ec4899"];

function getMetricUnit(key: string): string {
  const lower = key.toLowerCase();
  if (lower.includes('temp') || lower.includes('celsius')) return '°C';
  if (lower.includes('humidity') || lower.includes('percent') || lower.includes('obstruction')) return '%';
  if (lower.includes('power') || lower.includes('watt')) return 'W';
  if (lower.includes('voltage')) return 'V';
  if (lower.includes('current')) return 'A';
  if (lower.includes('latency') || lower.includes('ping')) return 'ms';
  if (lower.includes('throughput') || lower.includes('speed')) return 'bps';
  if (lower.includes('signal') || lower.includes('snr') || lower.includes('rssi')) return 'dB';
  return '';
}

function formatKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

function SensorMetricsCharts({ readings, sensorType }: SensorMetricsChartsProps) {
  const { chartData, numericKeys } = useMemo(() => {
    if (!readings || readings.length < 2) {
      return { chartData: [], numericKeys: [] };
    }

    // Find numeric keys from the readings
    const allKeys = new Set<string>();
    readings.forEach(r => {
      if (r.data) {
        Object.entries(r.data).forEach(([k, v]) => {
          if (typeof v === 'number' && !['device_id', 'client_id', 'timestamp', 'sensor_type', 'latitude', 'longitude'].includes(k)) {
            allKeys.add(k);
          }
        });
      }
    });

    const keys = Array.from(allKeys).slice(0, 5); // Limit to 5 metrics

    // Sort readings by timestamp
    const sortedReadings = [...readings].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Create chart data
    const data = sortedReadings.map(reading => {
      const point: Record<string, string | number> = {
        time: new Date(reading.timestamp).toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
      };

      keys.forEach(key => {
        const value = reading.data?.[key];
        if (typeof value === 'number') {
          // Normalize large values (throughput) for better visualization
          if (key.toLowerCase().includes('throughput') || key.toLowerCase().includes('speed')) {
            point[key] = value / 1e6; // Convert to Mbps
          } else {
            point[key] = Number(value.toFixed(2));
          }
        }
      });

      return point;
    });

    return { chartData: data, numericKeys: keys };
  }, [readings]);

  if (chartData.length < 2 || numericKeys.length === 0) {
    return null;
  }

  return (
    <Card className="glass-card border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Metrics Over Time
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis 
                dataKey="time" 
                tick={{ fontSize: 10 }} 
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis 
                tick={{ fontSize: 10 }} 
                stroke="hsl(var(--muted-foreground))"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Legend 
                wrapperStyle={{ fontSize: '12px' }}
                formatter={(value) => formatKey(value as string)}
              />
              {numericKeys.map((key, idx) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  name={`${formatKey(key)} ${getMetricUnit(key)}`}
                  stroke={COLORS[idx % COLORS.length]}
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export default SensorMetricsCharts;

// Legacy export for backward compatibility
export { SensorMetricsCharts as DeviceMetricsCharts };
