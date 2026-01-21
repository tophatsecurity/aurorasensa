import { useMemo } from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { format } from "date-fns";

interface TimeseriesPoint {
  timestamp: string;
  value: number;
  device_id?: string;
}

interface DeviceData {
  device_id: string;
  device_type: string;
  color: string;
  reading_count: number;
  status: string;
}

interface StatCardWithChartProps {
  title: string;
  value?: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconBgColor?: string;
  devices?: DeviceData[];
  timeseries?: TimeseriesPoint[];
  unit?: string;
  isLoading?: boolean;
  className?: string;
}

// Color palette for devices/lines
const CHART_COLORS = [
  "#22c55e", // green
  "#3b82f6", // blue
  "#f59e0b", // amber
  "#ec4899", // pink
  "#8b5cf6", // violet
  "#06b6d4", // cyan
  "#ef4444", // red
  "#84cc16", // lime
];


const StatCardWithChart = ({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  iconBgColor = "bg-aurora-purple/20",
  devices = [],
  timeseries = [],
  unit = "",
  isLoading = false,
  className
}: StatCardWithChartProps) => {
  // Transform timeseries data for chart - group by timestamp and device if needed
  type ChartPoint = Record<string, string | number>;
  
  // Memoize chart data - ONLY use real timeseries data, no synthetic data
  const chartData = useMemo((): ChartPoint[] => {
    if (timeseries.length === 0) {
      return []; // No chart when no real data
    }
    
    const grouped: ChartPoint[] = [];
    timeseries.forEach((point) => {
      const timeKey = format(new Date(point.timestamp), "HH:mm");
      const deviceId = point.device_id || "value";
      
      // Find or create entry for this timestamp
      let entry = grouped.find(e => e.time === timeKey);
      if (!entry) {
        entry = { time: timeKey, timestamp: point.timestamp };
        grouped.push(entry);
      }
      entry[deviceId] = point.value;
    });
    return grouped.slice(-24);
  }, [timeseries]);

  // Get unique device IDs from timeseries for multi-line charts
  const uniqueDevices = timeseries.length > 0 
    ? [...new Set(timeseries.map(p => p.device_id || "value"))]
    : devices.map(d => d.device_id);

  const showLegend = devices.length > 0 && uniqueDevices.length > 1;

  return (
    <div className={cn(
      "glass-card rounded-xl p-5 border border-border/50 hover:border-primary/30 transition-all duration-300",
      className
    )}>
      <div className="flex items-start gap-4">
        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", iconBgColor)}>
          <Icon className="w-6 h-6 text-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            {title}
          </h4>
          <p className="text-2xl font-bold text-foreground">
            {isLoading ? "..." : (value === null || value === undefined ? "—" : `${value}${unit}`)}
          </p>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Sparkline chart */}
      {chartData.length > 0 && (
        <div className="mt-4 h-16">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <Tooltip 
                contentStyle={{ 
                  background: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
                formatter={(value: number) => [`${value.toFixed(1)}${unit}`, '']}
                labelFormatter={(label) => label}
              />
              {uniqueDevices.length > 0 ? (
                uniqueDevices.map((deviceId, idx) => (
                    <Area
                      key={deviceId}
                      type="monotone"
                      dataKey={deviceId}
                      stackId={uniqueDevices.length > 1 ? "1" : undefined}
                      stroke={devices.find(d => d.device_id === deviceId)?.color || CHART_COLORS[idx % CHART_COLORS.length]}
                      fill={devices.find(d => d.device_id === deviceId)?.color || CHART_COLORS[idx % CHART_COLORS.length]}
                      fillOpacity={0.4}
                      strokeWidth={2.5}
                    />
                ))
              ) : (
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={CHART_COLORS[0]}
                  fill={CHART_COLORS[0]}
                  fillOpacity={0.4}
                  strokeWidth={2.5}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Device legend */}
      {showLegend && (
        <div className="mt-3 flex flex-wrap gap-2">
          {devices.slice(0, 4).map((device, idx) => (
            <div key={device.device_id} className="flex items-center gap-1.5">
              <div 
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: device.color || CHART_COLORS[idx % CHART_COLORS.length] }}
              />
              <span className="text-[10px] text-muted-foreground truncate max-w-[60px]">
                {device.device_id.replace(/_/g, ' ').replace(/\d+$/, '').trim()}
              </span>
            </div>
          ))}
          {devices.length > 4 && (
            <span className="text-[10px] text-muted-foreground">+{devices.length - 4} more</span>
          )}
        </div>
      )}
    </div>
  );
};

export default StatCardWithChart;
