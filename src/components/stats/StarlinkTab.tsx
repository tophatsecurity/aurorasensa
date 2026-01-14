import { Satellite, ArrowUpDown, Clock, Signal } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import StarlinkCharts from "@/components/StarlinkCharts";
import { 
  useStarlinkDevicesFromReadings,
  useStarlinkTimeseries,
  useStarlinkStats,
} from "@/hooks/aurora";

export function StarlinkTab() {
  const { data: starlinkDevices } = useStarlinkDevicesFromReadings();
  const { data: starlinkStats } = useStarlinkStats();
  const { data: starlinkTimeseries } = useStarlinkTimeseries(24);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Starlink Device List */}
      <Card className="glass-card border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Satellite className="w-4 h-4 text-violet-400" />
            Starlink Devices ({starlinkDevices?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <div className="space-y-2">
              {starlinkDevices?.map(device => (
                <div 
                  key={device.composite_key}
                  className="p-3 rounded-lg border border-border/50 hover:border-violet-500/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-sm">{device.device_id}</p>
                    <Badge variant={device.metrics.connected ? "default" : "secondary"}>
                      {device.metrics.connected ? "Connected" : "Offline"}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Downlink:</span>
                      <span className="ml-1 font-mono">
                        {device.metrics.downlink_throughput_bps 
                          ? `${(device.metrics.downlink_throughput_bps / 1e6).toFixed(1)} Mbps`
                          : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Latency:</span>
                      <span className="ml-1 font-mono">
                        {device.metrics.pop_ping_latency_ms 
                          ? `${device.metrics.pop_ping_latency_ms.toFixed(0)} ms`
                          : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Power:</span>
                      <span className="ml-1 font-mono">
                        {device.metrics.power_watts 
                          ? `${device.metrics.power_watts.toFixed(0)} W`
                          : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Obstruction:</span>
                      <span className="ml-1 font-mono">
                        {device.metrics.obstruction_percent !== undefined
                          ? `${device.metrics.obstruction_percent.toFixed(1)}%`
                          : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {(!starlinkDevices || starlinkDevices.length === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  <Satellite className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No Starlink devices found</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Starlink Stats */}
      <div className="lg:col-span-2 space-y-4">
        {/* Global Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StarlinkStatCard 
            title="Downlink"
            value={starlinkStats?.downlink_throughput_bps 
              ? starlinkStats.downlink_throughput_bps / 1e6 
              : undefined}
            unit="Mbps"
            icon={<ArrowUpDown className="w-4 h-4" />}
          />
          <StarlinkStatCard 
            title="Latency"
            value={starlinkStats?.pop_ping_latency_ms}
            unit="ms"
            icon={<Clock className="w-4 h-4" />}
          />
          <StarlinkStatCard 
            title="SNR"
            value={starlinkStats?.snr}
            unit="dB"
            icon={<Signal className="w-4 h-4" />}
          />
          <StarlinkStatCard 
            title="Devices Online"
            value={starlinkDevices?.filter(d => d.metrics.connected).length}
            unit=""
            icon={<Satellite className="w-4 h-4" />}
          />
        </div>

        {/* Performance Charts */}
        {starlinkTimeseries && starlinkTimeseries.readings.length > 0 && (
          <Card className="glass-card border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                Performance History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <StarlinkCharts />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function StarlinkStatCard({ title, value, unit, icon }: { 
  title: string; 
  value?: number | null; 
  unit: string;
  icon: React.ReactNode;
}) {
  return (
    <Card className="glass-card border-border/50">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          {icon}
          <span className="text-xs">{title}</span>
        </div>
        <p className="text-2xl font-bold font-mono">
          {value !== undefined && value !== null ? value.toFixed(1) : 'N/A'}
          <span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span>
        </p>
      </CardContent>
    </Card>
  );
}
