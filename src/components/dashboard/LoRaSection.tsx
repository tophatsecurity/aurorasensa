import { memo, useMemo } from "react";
import { Radio, Activity, Signal, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { 
  useLoraDevices,
  useSensorTypeStats,
} from "@/hooks/useAuroraApi";
import { formatLastSeen } from "@/utils/dateUtils";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface LoRaSectionProps {
  hours?: number;
}

export const LoRaSection = memo(function LoRaSection({ hours = 24 }: LoRaSectionProps) {
  const { data: stats, isLoading: statsLoading } = useSensorTypeStats("lora");
  const { data: devices } = useLoraDevices();

  const chartData: { time: string; rssi: number }[] = [];

  const totalPackets = stats?.total_readings ?? 0;
  const activeDevices = devices?.length ?? stats?.device_count ?? 0;
  const avgRssi = stats?.avg_value ?? null;

  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Radio className="w-5 h-5 text-red-500" />
        LoRa Network
      </h2>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="glass-card rounded-lg p-4 border border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
              <Radio className="w-4 h-4 text-red-400" />
            </div>
            <span className="text-xs text-muted-foreground">Devices</span>
          </div>
          <div className="text-2xl font-bold text-red-400">
            {statsLoading ? "..." : activeDevices}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Active nodes
          </div>
        </div>

        <div className="glass-card rounded-lg p-4 border border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
              <Activity className="w-4 h-4 text-green-400" />
            </div>
            <span className="text-xs text-muted-foreground">Packets</span>
          </div>
          <div className="text-2xl font-bold text-green-400">
            {totalPackets.toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Total received
          </div>
        </div>

        <div className="glass-card rounded-lg p-4 border border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
              <Signal className="w-4 h-4 text-violet-400" />
            </div>
            <span className="text-xs text-muted-foreground">Avg RSSI</span>
          </div>
          <div className="text-2xl font-bold text-violet-400">
            {avgRssi?.toFixed(0) ?? "—"}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            dBm signal
          </div>
        </div>

        <div className="glass-card rounded-lg p-4 border border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <Activity className="w-4 h-4 text-amber-400" />
            </div>
            <span className="text-xs text-muted-foreground">Frequency</span>
          </div>
          <div className="text-2xl font-bold text-amber-400">
            915.0
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            MHz band
          </div>
        </div>
      </div>

      {/* Signal Chart */}
      {chartData.length > 0 && (
        <div className="glass-card rounded-xl p-4 border border-border/50">
          <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
            <Signal className="w-4 h-4 text-red-400" />
            Signal Strength Over Time
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="loraRssiGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis 
                  dataKey="time" 
                  tick={{ fontSize: 10 }} 
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis 
                  tick={{ fontSize: 10 }} 
                  stroke="hsl(var(--muted-foreground))"
                  domain={['auto', 'auto']}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="rssi"
                  stroke="#ef4444"
                  fill="url(#loraRssiGradient)"
                  strokeWidth={2}
                  name="RSSI (dBm)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Devices List */}
      {devices && devices.length > 0 && (
        <div className="mt-4 glass-card rounded-xl border border-border/50 overflow-hidden">
          <div className="p-3 border-b border-border/50 bg-muted/30">
            <h3 className="text-sm font-medium">Active LoRa Devices</h3>
          </div>
          <div className="divide-y divide-border/30">
            {devices.slice(0, 5).map((device, i) => (
              <div key={device.device_id || i} className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                    <Radio className="w-4 h-4 text-red-400" />
                  </div>
                  <div>
                    <div className="font-medium text-sm">{device.device_id}</div>
                    <div className="text-xs text-muted-foreground">
                      Last seen: {formatLastSeen(device.last_seen)}
                    </div>
                  </div>
                </div>
                <Badge variant="outline" className={device.status === 'active' ? 'bg-success/20 text-success' : ''}>
                  {device.status || 'unknown'}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {!statsLoading && activeDevices === 0 && chartData.length === 0 && (
        <div className="glass-card rounded-xl p-8 text-center border border-border/50">
          <Radio className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-muted-foreground">No LoRa data available</p>
        </div>
      )}
    </div>
  );
});

export default LoRaSection;
