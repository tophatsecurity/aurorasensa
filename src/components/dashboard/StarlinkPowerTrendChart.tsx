import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Area, AreaChart, XAxis, YAxis, ResponsiveContainer, CartesianGrid } from "recharts";
import { Loader2, TrendingUp, Zap } from "lucide-react";
import { useStarlinkDeviceMetrics, StarlinkDeviceWithMetrics } from "@/hooks/aurora/starlink";
import { format, parseISO } from "date-fns";

interface StarlinkPowerTrendChartProps {
  device: StarlinkDeviceWithMetrics;
  hours?: number;
}

const StarlinkPowerTrendChart = ({ device, hours = 24 }: StarlinkPowerTrendChartProps) => {
  const { data, isLoading } = useStarlinkDeviceMetrics(device.client_id, device.device_id, hours);

  const chartData = useMemo(() => {
    if (!data?.readings || data.readings.length === 0) return [];
    
    return data.readings
      .filter(r => r.power_w !== undefined && r.power_w !== null)
      .map(reading => ({
        time: reading.timestamp,
        power: reading.power_w || 0,
        formattedTime: format(parseISO(reading.timestamp), 'HH:mm'),
        formattedDate: format(parseISO(reading.timestamp), 'MMM d, HH:mm'),
      }))
      .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
  }, [data]);

  const stats = useMemo(() => {
    if (chartData.length === 0) return { min: 0, max: 0, avg: 0 };
    const powers = chartData.map(d => d.power);
    return {
      min: Math.min(...powers),
      max: Math.max(...powers),
      avg: powers.reduce((sum, p) => sum + p, 0) / powers.length,
    };
  }, [chartData]);

  const chartConfig = {
    power: {
      label: "Power (W)",
      color: "hsl(var(--chart-1))",
    },
  };

  if (isLoading) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardContent className="h-[200px] flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Zap className="w-4 h-4 text-orange-500" />
            <span className="truncate">{device.device_id}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[150px] flex items-center justify-center">
          <p className="text-sm text-muted-foreground">No historical power data</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Zap className="w-4 h-4 text-orange-500" />
            <span className="truncate max-w-[150px]">{device.device_id}</span>
          </CardTitle>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>Min: {stats.min.toFixed(1)}W</span>
            <span>Avg: {stats.avg.toFixed(1)}W</span>
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-red-500" />
              {stats.max.toFixed(1)}W
            </span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Client: {device.client_id}</p>
      </CardHeader>
      <CardContent className="pb-4">
        <ChartContainer config={chartConfig} className="h-[150px] w-full">
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`powerGradient-${device.composite_key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.4} />
                <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
            <XAxis 
              dataKey="formattedTime" 
              tick={{ fontSize: 10 }}
              className="text-muted-foreground"
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              tick={{ fontSize: 10 }}
              className="text-muted-foreground"
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value}W`}
              width={45}
            />
            <ChartTooltip 
              content={
                <ChartTooltipContent 
                  labelFormatter={(_, payload) => {
                    if (payload?.[0]?.payload?.formattedDate) {
                      return payload[0].payload.formattedDate;
                    }
                    return "";
                  }}
                  formatter={(value) => [`${Number(value).toFixed(1)}W`, "Power"]}
                />
              }
            />
            <Area
              type="monotone"
              dataKey="power"
              stroke="hsl(var(--chart-1))"
              strokeWidth={2}
              fill={`url(#powerGradient-${device.composite_key})`}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

export default StarlinkPowerTrendChart;
