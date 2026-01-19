import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingUp } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useStatsAll } from "@/hooks/aurora";
import { format, parseISO } from "date-fns";

interface HourlyTrendChartProps {
  clientId?: string | null;
}

// Helper to format large numbers
const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

export default function HourlyTrendChart({ clientId }: HourlyTrendChartProps) {
  // Normalize clientId - "all" or empty means global view (no filter)
  const effectiveClientId = clientId && clientId !== "all" ? clientId : undefined;
  const { data: statsAll, isLoading, isError } = useStatsAll({ 
    clientId: effectiveClientId,
    limitHourly: 24 // Get last 24 hourly records
  });

  // Process hourly data for chart display
  const chartData = useMemo(() => {
    if (!statsAll) return [];

    // Get hourly data from the response
    const hourlyData = statsAll.hourly || [];
    
    if (hourlyData.length === 0) {
      return [];
    }

    // Sort by date and format for display
    const sortedRecords = [...hourlyData].sort((a, b) => {
      const dateA = a.start_time || a.period || '';
      const dateB = b.start_time || b.period || '';
      return new Date(dateA).getTime() - new Date(dateB).getTime();
    });

    return sortedRecords.map(record => {
      const dateStr = record.start_time || record.period || '';
      let hourLabel = 'Hour';
      let hourFull = dateStr;
      
      try {
        const date = parseISO(dateStr);
        hourLabel = format(date, 'HH:mm');
        hourFull = format(date, 'MMM d, HH:mm');
      } catch {
        hourLabel = dateStr.slice(11, 16) || dateStr.slice(0, 10);
      }

      return {
        hour: hourLabel,
        hourFull,
        readings: record.readings || 0,
        devices: record.devices || 0,
        clients: record.clients || 0,
      };
    });
  }, [statsAll]);

  // Calculate totals and trends
  const stats = useMemo(() => {
    if (chartData.length === 0) {
      return { totalReadings: 0, avgPerHour: 0, trend: 'stable', trendPercent: 0 };
    }

    const totalReadings = chartData.reduce((sum, d) => sum + (d.readings || 0), 0);
    const avgPerHour = Math.round(totalReadings / chartData.length);
    
    // Calculate trend from last 6 hours vs previous 6 hours
    const recentHours = chartData.slice(-6);
    const previousHours = chartData.slice(-12, -6);
    
    const recentTotal = recentHours.reduce((sum, d) => sum + (d.readings || 0), 0);
    const previousTotal = previousHours.reduce((sum, d) => sum + (d.readings || 0), 0);
    
    let trend: 'up' | 'down' | 'stable' = 'stable';
    let trendPercent = 0;
    
    if (previousTotal > 0) {
      trendPercent = Math.round(((recentTotal - previousTotal) / previousTotal) * 100);
      trend = trendPercent > 5 ? 'up' : trendPercent < -5 ? 'down' : 'stable';
    } else if (recentTotal > 0) {
      trend = 'up';
      trendPercent = 100;
    }

    return { totalReadings, avgPerHour, trend, trendPercent };
  }, [chartData]);

  if (isLoading) {
    return (
      <Card className="glass-card border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Hourly Readings Trend
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[280px] flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="glass-card border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Hourly Readings Trend
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[280px] flex items-center justify-center text-muted-foreground">
          Unable to load hourly stats
        </CardContent>
      </Card>
    );
  }

  // Show empty state when no data
  if (chartData.length === 0) {
    return (
      <Card className="glass-card border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Hourly Readings Trend
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[280px] flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No hourly data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Hourly Readings Trend (Last 24 Hours)
          </CardTitle>
          <div className="flex items-center gap-4 text-xs">
            <div className="text-muted-foreground">
              Total: <span className="font-semibold text-foreground">{formatNumber(stats.totalReadings)}</span>
            </div>
            <div className="text-muted-foreground">
              Avg/Hr: <span className="font-semibold text-foreground">{formatNumber(stats.avgPerHour)}</span>
            </div>
            {stats.trendPercent !== 0 && (
              <div className={`flex items-center gap-1 ${
                stats.trend === 'up' ? 'text-green-500' : 
                stats.trend === 'down' ? 'text-red-500' : 'text-muted-foreground'
              }`}>
                {stats.trend === 'up' ? '↑' : stats.trend === 'down' ? '↓' : '→'}
                {Math.abs(stats.trendPercent)}%
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="hourlyReadingsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis 
                dataKey="hour" 
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <YAxis 
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => formatNumber(value)}
                width={50}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
                itemStyle={{ color: 'hsl(var(--foreground))' }}
                formatter={(value: number) => [formatNumber(value), 'Readings']}
                labelFormatter={(label, payload) => {
                  if (payload && payload[0]?.payload?.hourFull) {
                    return payload[0].payload.hourFull;
                  }
                  return label;
                }}
              />
              <Area
                type="monotone"
                dataKey="readings"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#hourlyReadingsGradient)"
                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 3 }}
                activeDot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, stroke: 'hsl(var(--background))', r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
