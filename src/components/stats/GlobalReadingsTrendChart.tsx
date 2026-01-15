import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, CartesianGrid } from "recharts";
import { TrendingUp, TrendingDown, Minus, Activity } from "lucide-react";
import { format, parseISO, subDays } from "date-fns";

interface ReadingsByDay {
  date: string;
  count: number;
}

interface GlobalReadingsTrendChartProps {
  readingsByDay?: ReadingsByDay[];
  isLoading?: boolean;
}

const chartConfig = {
  readings: {
    label: "Readings",
    color: "hsl(var(--primary))",
  },
};

export default function GlobalReadingsTrendChart({ 
  readingsByDay = [], 
  isLoading 
}: GlobalReadingsTrendChartProps) {
  // Process and sort data by date
  const chartData = useMemo(() => {
    if (!readingsByDay || readingsByDay.length === 0) {
      // Generate placeholder data for last 14 days
      const placeholderData = [];
      for (let i = 13; i >= 0; i--) {
        const date = subDays(new Date(), i);
        placeholderData.push({
          date: format(date, "yyyy-MM-dd"),
          count: 0,
          formattedDate: format(date, "MMM d"),
        });
      }
      return placeholderData;
    }

    return [...readingsByDay]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-14) // Last 14 days
      .map((item) => ({
        ...item,
        formattedDate: format(parseISO(item.date), "MMM d"),
      }));
  }, [readingsByDay]);

  // Calculate trend
  const trend = useMemo(() => {
    if (chartData.length < 2) return { direction: "neutral", percentage: 0 };
    
    const midpoint = Math.floor(chartData.length / 2);
    const firstHalf = chartData.slice(0, midpoint);
    const secondHalf = chartData.slice(midpoint);
    
    const firstSum = firstHalf.reduce((sum, d) => sum + d.count, 0);
    const secondSum = secondHalf.reduce((sum, d) => sum + d.count, 0);
    
    if (firstSum === 0) {
      return { direction: secondSum > 0 ? "up" : "neutral", percentage: 100 };
    }
    
    const change = ((secondSum - firstSum) / firstSum) * 100;
    return {
      direction: change > 5 ? "up" : change < -5 ? "down" : "neutral",
      percentage: Math.abs(change),
    };
  }, [chartData]);

  // Calculate totals
  const totalReadings = useMemo(() => {
    return chartData.reduce((sum, d) => sum + d.count, 0);
  }, [chartData]);

  const avgPerDay = useMemo(() => {
    if (chartData.length === 0) return 0;
    return Math.round(totalReadings / chartData.length);
  }, [chartData, totalReadings]);

  const TrendIcon = trend.direction === "up" ? TrendingUp : trend.direction === "down" ? TrendingDown : Minus;
  const trendColor = trend.direction === "up" ? "text-green-500" : trend.direction === "down" ? "text-red-500" : "text-muted-foreground";

  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Readings Trend (Last 14 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            Loading chart data...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Readings Trend (Last 14 Days)
          </CardTitle>
          <div className="flex items-center gap-4 text-sm">
            <div className="text-right">
              <span className="text-muted-foreground">Total: </span>
              <span className="font-semibold">{totalReadings.toLocaleString()}</span>
            </div>
            <div className="text-right">
              <span className="text-muted-foreground">Avg/Day: </span>
              <span className="font-semibold">{avgPerDay.toLocaleString()}</span>
            </div>
            <div className={`flex items-center gap-1 ${trendColor}`}>
              <TrendIcon className="w-4 h-4" />
              <span className="font-medium">{trend.percentage.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="fillReadings" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
              <XAxis 
                dataKey="formattedDate" 
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                className="fill-muted-foreground"
              />
              <YAxis 
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(0)}K` : value}
                className="fill-muted-foreground"
              />
              <ChartTooltip 
                content={<ChartTooltipContent />}
                formatter={(value: number) => [value.toLocaleString(), "Readings"]}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#fillReadings)"
                name="Readings"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
