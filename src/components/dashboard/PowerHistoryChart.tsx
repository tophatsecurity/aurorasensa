import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Zap, TrendingUp } from "lucide-react";
import { usePowerHistory } from "@/hooks/aurora";
import { format, parseISO } from "date-fns";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

interface PowerHistoryChartProps {
  hours?: number;
  clientId?: string | null;
}

const PowerHistoryChart = ({ hours = 24, clientId }: PowerHistoryChartProps) => {
  const effectiveClientId = clientId === "all" ? undefined : clientId;
  
  const { data: powerHistory, isLoading } = usePowerHistory({
    clientId: effectiveClientId,
    hours,
    limit: 200,
  });

  // Process power history data for charting
  const chartData = useMemo(() => {
    if (!powerHistory || powerHistory.length === 0) return [];

    // Group by hour for cleaner visualization
    const hourlyData: Record<string, { power: number[]; voltage: number[] }> = {};

    powerHistory.forEach((point) => {
      try {
        const timestamp = parseISO(point.timestamp);
        const hourKey = format(timestamp, 'HH:00');
        
        if (!hourlyData[hourKey]) {
          hourlyData[hourKey] = { power: [], voltage: [] };
        }
        
        if (point.power_watts !== undefined && point.power_watts !== null) {
          hourlyData[hourKey].power.push(point.power_watts);
        }
        if (point.voltage_v !== undefined && point.voltage_v !== null) {
          hourlyData[hourKey].voltage.push(point.voltage_v);
        }
      } catch { /* ignore invalid timestamps */ }
    });

    return Object.entries(hourlyData).map(([hour, data]) => ({
      time: hour,
      power: data.power.length > 0 
        ? data.power.reduce((a, b) => a + b, 0) / data.power.length 
        : 0,
      voltage: data.voltage.length > 0
        ? data.voltage.reduce((a, b) => a + b, 0) / data.voltage.length
        : 0,
    })).sort((a, b) => a.time.localeCompare(b.time));
  }, [powerHistory]);

  // Calculate stats
  const stats = useMemo(() => {
    if (chartData.length === 0) return { avg: 0, max: 0, min: 0 };
    const powerValues = chartData.map(d => d.power).filter(p => p > 0);
    if (powerValues.length === 0) return { avg: 0, max: 0, min: 0 };
    return {
      avg: powerValues.reduce((a, b) => a + b, 0) / powerValues.length,
      max: Math.max(...powerValues),
      min: Math.min(...powerValues),
    };
  }, [chartData]);

  if (isLoading) {
    return (
      <Card className="glass-card border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-500" />
            Power History ({hours}h)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card className="glass-card border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-500" />
            Power History ({hours}h)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 text-muted-foreground">
            No power history data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-500" />
            Power History ({hours}h)
          </CardTitle>
          <div className="flex gap-4 text-xs">
            <span className="text-muted-foreground">
              Avg: <span className="text-foreground font-medium">{stats.avg.toFixed(1)}W</span>
            </span>
            <span className="text-muted-foreground">
              Range: <span className="text-foreground font-medium">{stats.min.toFixed(1)} - {stats.max.toFixed(1)}W</span>
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="powerGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-4))" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="hsl(var(--chart-4))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
              <XAxis 
                dataKey="time" 
                tick={{ fontSize: 10 }}
                className="text-muted-foreground"
              />
              <YAxis 
                tick={{ fontSize: 10 }}
                className="text-muted-foreground"
                tickFormatter={(v) => `${v}W`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
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
        </div>
      </CardContent>
    </Card>
  );
};

export default PowerHistoryChart;
