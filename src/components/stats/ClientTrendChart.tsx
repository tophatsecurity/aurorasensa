import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { Users } from "lucide-react";

interface ClientStats {
  client_id: string;
  hostname?: string;
  reading_count: number;
  device_count?: number;
}

interface ClientTrendChartProps {
  clientStats?: ClientStats[];
  isLoading?: boolean;
}

// Color palette for clients
const CLIENT_COLORS = [
  "hsl(var(--primary))",
  "hsl(210, 80%, 55%)",
  "hsl(170, 70%, 45%)",
  "hsl(280, 65%, 55%)",
  "hsl(35, 85%, 55%)",
  "hsl(340, 75%, 55%)",
  "hsl(195, 75%, 50%)",
  "hsl(140, 60%, 45%)",
];

export default function ClientTrendChart({ 
  clientStats = [], 
  isLoading 
}: ClientTrendChartProps) {
  // Process data for the chart - top 8 clients by reading count
  const chartData = useMemo(() => {
    if (!clientStats || clientStats.length === 0) return [];

    return [...clientStats]
      .sort((a, b) => (b.reading_count || 0) - (a.reading_count || 0))
      .slice(0, 8)
      .map((client, idx) => ({
        name: client.hostname || client.client_id.slice(0, 8),
        fullName: client.hostname || client.client_id,
        readings: client.reading_count || 0,
        devices: client.device_count || 0,
        color: CLIENT_COLORS[idx % CLIENT_COLORS.length],
      }));
  }, [clientStats]);

  // Calculate total readings
  const totalReadings = useMemo(() => {
    return chartData.reduce((sum, d) => sum + d.readings, 0);
  }, [chartData]);

  const chartConfig = useMemo(() => {
    const config: Record<string, { label: string; color: string }> = {};
    chartData.forEach((client, idx) => {
      config[client.name] = {
        label: client.fullName,
        color: CLIENT_COLORS[idx % CLIENT_COLORS.length],
      };
    });
    return config;
  }, [chartData]);

  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Readings by Client (Last 24 Hours)
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

  if (chartData.length === 0) {
    return (
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Readings by Client (Last 24 Hours)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            No client data available
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
            <Users className="w-4 h-4 text-primary" />
            Readings by Client (Last 24 Hours)
          </CardTitle>
          <div className="text-sm text-right">
            <span className="text-muted-foreground">Total: </span>
            <span className="font-semibold">{totalReadings.toLocaleString()}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" vertical={false} />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                className="fill-muted-foreground"
                angle={-25}
                textAnchor="end"
                height={50}
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
                formatter={(value: number, name: string, props: any) => [
                  `${value.toLocaleString()} readings (${props.payload.devices} devices)`,
                  props.payload.fullName
                ]}
              />
              <Bar 
                dataKey="readings" 
                radius={[4, 4, 0, 0]}
                name="Readings"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
