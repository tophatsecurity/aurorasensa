import { useMemo } from "react";
import { format } from "date-fns";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

interface SensorReading {
  device_id: string;
  device_type: string;
  client_id?: string;
  timestamp: string;
  data?: Record<string, unknown>;
  latitude?: number;
  longitude?: number;
}

interface DeviceMetricsChartsProps {
  readings: SensorReading[];
  deviceType: string;
}

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

function getMetricUnit(key: string): string {
  if (key.includes('temp') || key.includes('temperature')) return '°';
  if (key.includes('power') || key.includes('watt')) return ' W';
  if (key.includes('voltage')) return ' V';
  if (key.includes('current')) return ' A';
  if (key.includes('humidity')) return '%';
  if (key.includes('signal') || key.includes('rssi') || key.includes('dbm')) return ' dBm';
  if (key.includes('latency') || key.includes('ping')) return ' ms';
  if (key.includes('speed') || key.includes('throughput')) return ' Mbps';
  return '';
}

function formatKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

export default function DeviceMetricsCharts({ readings, deviceType }: DeviceMetricsChartsProps) {
  const { chartData, numericKeys } = useMemo(() => {
    if (!readings || readings.length === 0) {
      return { chartData: [], numericKeys: [] };
    }

    // Find all numeric keys from readings data
    const allKeys = new Set<string>();
    readings.forEach(reading => {
      if (reading.data) {
        Object.entries(reading.data).forEach(([key, value]) => {
          if (typeof value === 'number' && !['device_id', 'client_id', 'timestamp', 'lat', 'lon', 'latitude', 'longitude'].includes(key)) {
            allKeys.add(key);
          }
        });
      }
    });

    const numericKeys = Array.from(allKeys).slice(0, 5); // Limit to 5 metrics for readability

    // Process readings into chart data, sorted by timestamp
    const sortedReadings = [...readings].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const chartData = sortedReadings.map(reading => {
      const point: Record<string, unknown> = {
        timestamp: reading.timestamp,
        time: format(new Date(reading.timestamp), 'HH:mm'),
        fullTime: format(new Date(reading.timestamp), 'MMM dd, HH:mm:ss'),
      };

      numericKeys.forEach(key => {
        const value = reading.data?.[key];
        if (typeof value === 'number') {
          // Normalize speed values to Mbps for display
          if ((key.includes('speed') || key.includes('throughput')) && value > 1e6) {
            point[key] = Number((value / 1e6).toFixed(2));
          } else if ((key.includes('speed') || key.includes('throughput')) && value > 1e3) {
            point[key] = Number((value / 1e3).toFixed(2));
          } else {
            point[key] = Number(value.toFixed(2));
          }
        }
      });

      return point;
    });

    return { chartData, numericKeys };
  }, [readings]);

  if (numericKeys.length === 0 || chartData.length < 2) {
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
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis 
                dataKey="time" 
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={{ stroke: 'hsl(var(--border))' }}
              />
              <YAxis 
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={{ stroke: 'hsl(var(--border))' }}
                width={50}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                labelFormatter={(_, payload) => {
                  if (payload?.[0]?.payload?.fullTime) {
                    return payload[0].payload.fullTime;
                  }
                  return '';
                }}
                formatter={(value: number, name: string) => [
                  `${value}${getMetricUnit(name)}`,
                  formatKey(name)
                ]}
              />
              <Legend 
                wrapperStyle={{ fontSize: '11px' }}
                formatter={(value) => formatKey(value)}
              />
              {numericKeys.map((key, index) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={CHART_COLORS[index % CHART_COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: CHART_COLORS[index % CHART_COLORS.length] }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
