import { useMemo } from "react";
import { Satellite, Zap, Activity, TrendingUp, TrendingDown, Minus, Loader2, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useStarlinkDevicesFromReadings } from "@/hooks/aurora/starlink";
import { formatLastSeen } from "@/utils/dateUtils";

interface StarlinkPowerSectionProps {
  hours?: number;
}

const StarlinkPowerSection = ({ hours = 24 }: StarlinkPowerSectionProps) => {
  const { data: starlinkDevices, isLoading, refetch, isRefetching } = useStarlinkDevicesFromReadings();

  // Calculate total power and stats
  const powerStats = useMemo(() => {
    if (!starlinkDevices || starlinkDevices.length === 0) {
      return { totalPower: 0, avgPower: 0, maxPower: 0, devices: [] };
    }

    const devicesWithPower = starlinkDevices
      .filter(d => d.metrics.power_watts !== undefined && d.metrics.power_watts > 0)
      .map(d => ({
        ...d,
        power: d.metrics.power_watts || 0,
      }))
      .sort((a, b) => b.power - a.power); // Sort by power descending

    const powers = devicesWithPower.map(d => d.power);
    const totalPower = powers.reduce((sum, p) => sum + p, 0);
    const avgPower = powers.length > 0 ? totalPower / powers.length : 0;
    const maxPower = powers.length > 0 ? Math.max(...powers) : 0;

    return { totalPower, avgPower, maxPower, devices: devicesWithPower };
  }, [starlinkDevices]);

  // Get power status color
  const getPowerStatusColor = (watts: number): string => {
    if (watts >= 150) return "text-red-500";
    if (watts >= 100) return "text-yellow-500";
    return "text-green-500";
  };

  // Get power progress percentage (assuming max 200W for Starlink)
  const getPowerProgress = (watts: number): number => {
    return Math.min((watts / 200) * 100, 100);
  };

  // Get connection status badge
  const getConnectionBadge = (connected: boolean | undefined) => {
    if (connected) {
      return <Badge variant="default" className="bg-green-500/20 text-green-400 border-green-500/30">Connected</Badge>;
    }
    return <Badge variant="secondary" className="bg-muted text-muted-foreground">Offline</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasDevices = powerStats.devices.length > 0;

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Power</p>
                <p className="text-2xl font-bold text-foreground">{powerStats.totalPower.toFixed(1)}W</p>
              </div>
              <Zap className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Avg per Device</p>
                <p className="text-2xl font-bold text-foreground">{powerStats.avgPower.toFixed(1)}W</p>
              </div>
              <Activity className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Peak Usage</p>
                <p className="text-2xl font-bold text-foreground">{powerStats.maxPower.toFixed(1)}W</p>
              </div>
              <TrendingUp className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Devices</p>
                <p className="text-2xl font-bold text-foreground">{starlinkDevices?.length || 0}</p>
              </div>
              <div className="flex items-center gap-1">
                <Satellite className="w-8 h-8 text-purple-500" />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => refetch()}
                  disabled={isRefetching}
                >
                  <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Device List */}
      {!hasDevices ? (
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-8 text-center">
            <Satellite className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No Starlink devices with power data found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {powerStats.devices.map((device) => (
            <Card key={device.composite_key} className="bg-card/50 border-border/50 hover:border-primary/30 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Satellite className="w-5 h-5 text-purple-500" />
                    <CardTitle className="text-sm font-medium truncate max-w-[150px]">
                      {device.device_id}
                    </CardTitle>
                  </div>
                  {getConnectionBadge(device.metrics.connected)}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  Client: {device.client_id}
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Power Reading */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Power</span>
                    <span className={`text-lg font-bold ${getPowerStatusColor(device.power)}`}>
                      {device.power.toFixed(1)}W
                    </span>
                  </div>
                  <Progress 
                    value={getPowerProgress(device.power)} 
                    className="h-2"
                  />
                </div>

                {/* Additional Metrics */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {device.metrics.downlink_throughput_bps !== undefined && (
                    <div className="flex flex-col">
                      <span className="text-muted-foreground">Downlink</span>
                      <span className="font-medium text-foreground">
                        {(device.metrics.downlink_throughput_bps / 1e6).toFixed(1)} Mbps
                      </span>
                    </div>
                  )}
                  {device.metrics.uplink_throughput_bps !== undefined && (
                    <div className="flex flex-col">
                      <span className="text-muted-foreground">Uplink</span>
                      <span className="font-medium text-foreground">
                        {(device.metrics.uplink_throughput_bps / 1e6).toFixed(1)} Mbps
                      </span>
                    </div>
                  )}
                  {device.metrics.pop_ping_latency_ms !== undefined && (
                    <div className="flex flex-col">
                      <span className="text-muted-foreground">Latency</span>
                      <span className="font-medium text-foreground">
                        {device.metrics.pop_ping_latency_ms.toFixed(0)} ms
                      </span>
                    </div>
                  )}
                  {device.metrics.obstruction_percent !== undefined && (
                    <div className="flex flex-col">
                      <span className="text-muted-foreground">Obstruction</span>
                      <span className="font-medium text-foreground">
                        {device.metrics.obstruction_percent.toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>

                {/* Last Seen */}
                {device.last_seen && (
                  <p className="text-xs text-muted-foreground pt-1 border-t border-border/50">
                    Last seen: {formatLastSeen(device.last_seen)}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default StarlinkPowerSection;
