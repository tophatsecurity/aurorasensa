import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingUp, BarChart3 } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { useWeeklyStats } from "@/hooks/aurora";
import { format, parseISO } from "date-fns";

interface WeeklyTrendChartProps {
  clientId?: string | null;
}

// Helper to format large numbers
const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

export default function WeeklyTrendChart({ clientId }: WeeklyTrendChartProps) {
  const { data: weeklyStats, isLoading, isError } = useWeeklyStats(clientId);

  // Process weekly data for chart display
  const chartData = useMemo(() => {
    if (!weeklyStats) return [];

    // Handle different response formats
    // Could be: array directly, or { data: [...] }, or { weekly: [...] }
    let records: Array<{
      week_start?: string;
      period_start?: string;
      timestamp?: string;
      reading_count?: number;
      readings?: number;
      device_count?: number;
      devices?: number;
      client_count?: number;
      clients?: number;
      sensor_type?: string;
    }> = [];

    if (Array.isArray(weeklyStats)) {
      records = weeklyStats;
    } else if (typeof weeklyStats === 'object') {
      if ('data' in weeklyStats && Array.isArray((weeklyStats as { data?: unknown[] }).data)) {
        records = (weeklyStats as { data: typeof records }).data;
      } else if ('weekly' in weeklyStats && Array.isArray((weeklyStats as { weekly?: unknown[] }).weekly)) {
        records = (weeklyStats as { weekly: typeof records }).weekly;
      }
    }

    if (records.length === 0) {
      // No data available - return empty array (no placeholder/demo data)
      return [];
    }

    // Sort by date and format for display
    const sortedRecords = [...records].sort((a, b) => {
      const dateA = a.week_start || a.period_start || a.timestamp || '';
      const dateB = b.week_start || b.period_start || b.timestamp || '';
      return new Date(dateA).getTime() - new Date(dateB).getTime();
    });

    return sortedRecords.map(record => {
      const dateStr = record.week_start || record.period_start || record.timestamp || '';
      let weekLabel = 'Week';
      let weekFull = dateStr;
      
      try {
        const date = parseISO(dateStr);
        weekLabel = format(date, 'MMM d');
        weekFull = format(date, 'MMM d, yyyy');
      } catch {
        weekLabel = dateStr.slice(0, 10);
      }

      return {
        week: weekLabel,
        weekFull,
        readings: record.reading_count || record.readings || 0,
        devices: record.device_count || record.devices || 0,
        clients: record.client_count || record.clients || 0,
        sensorType: record.sensor_type,
      };
    });
  }, [weeklyStats]);

  // Calculate totals and trends
  const stats = useMemo(() => {
    if (chartData.length === 0) {
      return { totalReadings: 0, avgPerWeek: 0, trend: 'stable', trendPercent: 0 };
    }

    const totalReadings = chartData.reduce((sum, d) => sum + (d.readings || 0), 0);
    const avgPerWeek = Math.round(totalReadings / chartData.length);
    
    // Calculate trend from last 4 weeks vs previous 4 weeks
    const recentWeeks = chartData.slice(-4);
    const previousWeeks = chartData.slice(-8, -4);
    
    const recentTotal = recentWeeks.reduce((sum, d) => sum + (d.readings || 0), 0);
    const previousTotal = previousWeeks.reduce((sum, d) => sum + (d.readings || 0), 0);
    
    let trend: 'up' | 'down' | 'stable' = 'stable';
    let trendPercent = 0;
    
    if (previousTotal > 0) {
      trendPercent = Math.round(((recentTotal - previousTotal) / previousTotal) * 100);
      trend = trendPercent > 5 ? 'up' : trendPercent < -5 ? 'down' : 'stable';
    } else if (recentTotal > 0) {
      trend = 'up';
      trendPercent = 100;
    }

    return { totalReadings, avgPerWeek, trend, trendPercent };
  }, [chartData]);

  if (isLoading) {
    return (
      <Card className="glass-card border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Weekly Readings Trend
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
            Weekly Readings Trend
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[280px] flex items-center justify-center text-muted-foreground">
          Unable to load weekly stats
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
            Weekly Readings Trend
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[280px] flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No weekly data available</p>
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
            Weekly Readings Trend (Last 12 Weeks)
          </CardTitle>
          <div className="flex items-center gap-4 text-xs">
            <div className="text-muted-foreground">
              Total: <span className="font-semibold text-foreground">{formatNumber(stats.totalReadings)}</span>
            </div>
            <div className="text-muted-foreground">
              Avg/Week: <span className="font-semibold text-foreground">{formatNumber(stats.avgPerWeek)}</span>
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
                <linearGradient id="weeklyReadingsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis 
                dataKey="week" 
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
                  if (payload && payload[0]?.payload?.weekFull) {
                    return `Week of ${payload[0].payload.weekFull}`;
                  }
                  return label;
                }}
              />
              <Area
                type="monotone"
                dataKey="readings"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#weeklyReadingsGradient)"
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
