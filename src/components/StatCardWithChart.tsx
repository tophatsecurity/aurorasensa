import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { AreaChart, Area, ResponsiveContainer, Tooltip } from "recharts";

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
  isLoading?: boolean;
  className?: string;
}

// Color palette for devices
const DEVICE_COLORS = [
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
  isLoading = false,
  className
}: StatCardWithChartProps) => {
  // Generate mock activity data for the mini chart based on device counts
  const chartData = devices.length > 0 
    ? Array.from({ length: 12 }, (_, i) => {
        const point: Record<string, number> = { time: i };
        devices.forEach((device, idx) => {
          // Create varied activity based on reading count
          const baseValue = device.reading_count / 1000;
          const variance = Math.sin((i + idx) * 0.5) * baseValue * 0.3;
          point[device.device_id] = Math.max(0, baseValue + variance + Math.random() * baseValue * 0.2);
        });
        return point;
      })
    : [];

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
            {isLoading ? "..." : (value === null || value === undefined ? "—" : value)}
          </p>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Mini chart */}
      {devices.length > 0 && (
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
                labelFormatter={() => ''}
              />
              {devices.map((device, idx) => (
                <Area
                  key={device.device_id}
                  type="monotone"
                  dataKey={device.device_id}
                  stackId="1"
                  stroke={device.color || DEVICE_COLORS[idx % DEVICE_COLORS.length]}
                  fill={device.color || DEVICE_COLORS[idx % DEVICE_COLORS.length]}
                  fillOpacity={0.4}
                  strokeWidth={1.5}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Device legend */}
      {devices.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {devices.slice(0, 4).map((device, idx) => (
            <div key={device.device_id} className="flex items-center gap-1.5">
              <div 
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: device.color || DEVICE_COLORS[idx % DEVICE_COLORS.length] }}
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
