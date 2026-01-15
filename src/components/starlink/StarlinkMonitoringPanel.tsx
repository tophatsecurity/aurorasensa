import { memo } from "react";
import { 
  Wifi, 
  WifiOff, 
  Zap, 
  Signal, 
  Clock, 
  Activity,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Gauge,
  Radio
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useStarlinkSignalStrength,
  useStarlinkPerformance,
  useStarlinkPower,
  useStarlinkConnectivity,
} from "@/hooks/aurora";

interface StatusIndicatorProps {
  status: 'good' | 'warning' | 'critical' | 'unknown';
  label: string;
}

const StatusIndicator = ({ status, label }: StatusIndicatorProps) => {
  const colors = {
    good: 'bg-emerald-500',
    warning: 'bg-amber-500',
    critical: 'bg-red-500',
    unknown: 'bg-zinc-500',
  };

  return (
    <div className="flex items-center gap-2">
      <div className={`w-2.5 h-2.5 rounded-full ${colors[status]} animate-pulse`} />
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
};

interface MetricItemProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down' | null;
  status?: 'good' | 'warning' | 'critical';
  isLoading?: boolean;
}

const MetricItem = memo(({ icon, label, value, unit, trend, status, isLoading }: MetricItemProps) => {
  const statusColors = {
    good: 'text-emerald-400',
    warning: 'text-amber-400',
    critical: 'text-red-400',
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
        <Skeleton className="w-8 h-8 rounded-lg" />
        <div className="flex-1">
          <Skeleton className="h-3 w-16 mb-1" />
          <Skeleton className="h-5 w-20" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
      <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <div className="flex items-center gap-1">
          <span className={`text-lg font-semibold ${status ? statusColors[status] : 'text-foreground'}`}>
            {value}
          </span>
          {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
          {trend === 'up' && <TrendingUp className="w-3 h-3 text-emerald-400 ml-1" />}
          {trend === 'down' && <TrendingDown className="w-3 h-3 text-red-400 ml-1" />}
        </div>
      </div>
    </div>
  );
});

MetricItem.displayName = 'MetricItem';

const StarlinkMonitoringPanel = memo(() => {
  const { data: signalStrength, isLoading: signalLoading } = useStarlinkSignalStrength();
  const { data: performance, isLoading: perfLoading } = useStarlinkPerformance();
  const { data: power, isLoading: powerLoading } = useStarlinkPower();
  const { data: connectivity, isLoading: connLoading } = useStarlinkConnectivity();

  const isLoading = signalLoading || perfLoading || powerLoading || connLoading;
  const isConnected = connectivity?.connected ?? false;
  const obstructionPercent = connectivity?.obstruction_percent ?? 0;

  // Format throughput values
  const formatThroughput = (bps?: number) => {
    if (!bps) return '—';
    if (bps >= 1e9) return `${(bps / 1e9).toFixed(1)} Gbps`;
    if (bps >= 1e6) return `${(bps / 1e6).toFixed(1)} Mbps`;
    if (bps >= 1e3) return `${(bps / 1e3).toFixed(1)} Kbps`;
    return `${bps} bps`;
  };

  // Format uptime
  const formatUptime = (seconds?: number) => {
    if (!seconds) return '—';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  // Determine status levels
  const getLatencyStatus = (ms?: number): 'good' | 'warning' | 'critical' => {
    if (!ms) return 'good';
    if (ms < 40) return 'good';
    if (ms < 100) return 'warning';
    return 'critical';
  };

  const getSnrStatus = (snr?: number): 'good' | 'warning' | 'critical' => {
    if (!snr) return 'good';
    if (snr > 9) return 'good';
    if (snr > 5) return 'warning';
    return 'critical';
  };

  const getObstructionStatus = (percent?: number): 'good' | 'warning' | 'critical' => {
    if (!percent) return 'good';
    if (percent < 1) return 'good';
    if (percent < 5) return 'warning';
    return 'critical';
  };

  // Get power consumption (handle both new and legacy formats)
  const getPowerValue = () => {
    if (!power) return '—';
    // New format with device_summaries
    if (power.device_summaries && power.device_summaries.length > 0) {
      const avgWatts = power.device_summaries[0].overall?.avg_watts;
      return avgWatts?.toFixed(1) ?? '—';
    }
    // Legacy format
    return power.power_w?.toFixed(1) ?? '—';
  };

  return (
    <div className="glass-card rounded-xl border border-border/50 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border/50 bg-gradient-to-r from-violet-500/10 to-cyan-500/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
              {isConnected ? (
                <Wifi className="w-5 h-5 text-white" />
              ) : (
                <WifiOff className="w-5 h-5 text-white" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Real-time Monitoring</h3>
              <p className="text-xs text-muted-foreground">Live Starlink metrics</p>
            </div>
          </div>
          <Badge 
            variant={isConnected ? "default" : "destructive"}
            className={isConnected ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : ""}
          >
            {isLoading ? 'Loading...' : isConnected ? 'Connected' : 'Disconnected'}
          </Badge>
        </div>
      </div>

      {/* Status Bar */}
      <div className="px-4 py-2 bg-muted/20 border-b border-border/30 flex items-center gap-4 flex-wrap">
        <StatusIndicator 
          status={isConnected ? 'good' : 'critical'} 
          label="Connection" 
        />
        <StatusIndicator 
          status={getLatencyStatus(performance?.pop_ping_latency_ms)} 
          label="Latency" 
        />
        <StatusIndicator 
          status={getSnrStatus(signalStrength?.snr)} 
          label="Signal" 
        />
        <StatusIndicator 
          status={getObstructionStatus(obstructionPercent)} 
          label="Sky View" 
        />
      </div>

      {/* Metrics Grid */}
      <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-3">
        <MetricItem
          icon={<TrendingDown className="w-4 h-4 text-cyan-400" />}
          label="Download"
          value={formatThroughput(performance?.downlink_throughput_bps)}
          isLoading={perfLoading}
        />
        <MetricItem
          icon={<TrendingUp className="w-4 h-4 text-emerald-400" />}
          label="Upload"
          value={formatThroughput(performance?.uplink_throughput_bps)}
          isLoading={perfLoading}
        />
        <MetricItem
          icon={<Activity className="w-4 h-4 text-amber-400" />}
          label="Latency"
          value={performance?.pop_ping_latency_ms?.toFixed(0) ?? '—'}
          unit="ms"
          status={getLatencyStatus(performance?.pop_ping_latency_ms)}
          isLoading={perfLoading}
        />
        <MetricItem
          icon={<Signal className="w-4 h-4 text-violet-400" />}
          label="Signal"
          value={signalStrength?.signal_strength_dbm?.toFixed(1) ?? signalStrength?.snr?.toFixed(1) ?? '—'}
          unit="dB"
          status={getSnrStatus(signalStrength?.snr)}
          isLoading={signalLoading}
        />
        <MetricItem
          icon={<Zap className="w-4 h-4 text-orange-400" />}
          label="Power"
          value={getPowerValue()}
          unit="W"
          isLoading={powerLoading}
        />
        <MetricItem
          icon={<Clock className="w-4 h-4 text-blue-400" />}
          label="Uptime"
          value={formatUptime(connectivity?.uptime_seconds)}
          isLoading={connLoading}
        />
      </div>

      {/* Obstruction Progress */}
      <div className="px-4 pb-4">
        <div className="p-3 rounded-lg bg-muted/30">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {obstructionPercent < 1 ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              )}
              <span className="text-sm font-medium">Sky Visibility</span>
            </div>
            <span className={`text-sm font-semibold ${
              obstructionPercent < 1 ? 'text-emerald-400' : 
              obstructionPercent < 5 ? 'text-amber-400' : 'text-red-400'
            }`}>
              {(100 - obstructionPercent).toFixed(1)}% Clear
            </span>
          </div>
          <Progress 
            value={100 - obstructionPercent} 
            className="h-2"
          />
          <p className="text-xs text-muted-foreground mt-2">
            {obstructionPercent < 1 
              ? '✓ Excellent sky view with minimal obstruction'
              : obstructionPercent < 5 
              ? '⚠ Minor obstructions detected' 
              : '⚠ Significant obstructions - consider repositioning'}
          </p>
        </div>
      </div>
    </div>
  );
});

StarlinkMonitoringPanel.displayName = 'StarlinkMonitoringPanel';

export default StarlinkMonitoringPanel;
