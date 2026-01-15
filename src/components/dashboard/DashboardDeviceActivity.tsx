import { useMemo } from "react";
import { Activity, Clock, Database, Loader2, TrendingUp, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useComprehensiveStats,
  useStatsByClient,
  use1hrStats,
  use24hrStats,
  useStatsOverview,
} from "@/hooks/aurora";

interface DashboardDeviceActivityProps {
  periodHours?: number;
}

const formatNumber = (num: number | undefined | null): string => {
  if (num === undefined || num === null) return '—';
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString();
};

const DashboardDeviceActivity = ({ periodHours = 24 }: DashboardDeviceActivityProps) => {
  const { data: stats, isLoading: statsLoading } = useComprehensiveStats();
  const { data: clientStats, isLoading: clientStatsLoading } = useStatsByClient({ hours: periodHours });
  const { data: stats1h, isLoading: stats1hLoading } = use1hrStats();
  const { data: stats24h, isLoading: stats24hLoading } = use24hrStats();
  const { data: statsOverview, isLoading: overviewLoading } = useStatsOverview();

  const global = stats?.global;
  
  // Activity metrics from various sources
  const activeDevices1h = global?.activity?.last_1_hour?.active_devices_1h ?? stats1h?.devices ?? 0;
  const readings1h = global?.activity?.last_1_hour?.readings_1h ?? stats1h?.readings ?? 0;
  const activeDevices24h = global?.active_clients_24h ?? global?.activity?.last_24_hours?.active_devices_24h ?? stats24h?.devices ?? 0;
  const readings24h = global?.activity?.last_24_hours?.readings_24h ?? stats24h?.readings ?? 0;
  const avgReadingsPerHour = global?.activity?.avg_readings_per_hour ?? 0;

  // Client activity summary
  const totalActiveClients = clientStats?.total ?? 0;
  const totalReadingsFromClients = useMemo(() => {
    if (!clientStats?.clients) return 0;
    return clientStats.clients.reduce((sum, c) => sum + c.reading_count, 0);
  }, [clientStats?.clients]);

  const isLoading = statsLoading || clientStatsLoading || stats1hLoading || stats24hLoading || overviewLoading;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
      {/* Device Activity Card */}
      <Card className="glass-card border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-500" />
            DEVICE ACTIVITY
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between items-center p-2 rounded-lg bg-success/10">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Active (1h)
                </span>
                <span className="font-bold text-success">{activeDevices1h} devices</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded-lg bg-primary/10">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Active (24h)
                </span>
                <span className="font-bold text-primary">{activeDevices24h} devices</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  Readings (1h)
                </span>
                <span className="font-medium">{formatNumber(readings1h)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  Readings (24h)
                </span>
                <span className="font-medium">{formatNumber(readings24h)}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-border/50">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Avg/Hour
                </span>
                <span className="font-medium text-primary">
                  {avgReadingsPerHour > 0 ? avgReadingsPerHour.toFixed(1) : '—'}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Client Activity Card */}
      <Card className="glass-card border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="w-4 h-4 text-green-500" />
            CLIENT ACTIVITY ({periodHours}h)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {clientStatsLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between items-center p-2 rounded-lg bg-green-500/10">
                <span className="text-sm text-muted-foreground">Active Clients</span>
                <span className="font-bold text-green-500">{totalActiveClients}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Readings</span>
                <span className="font-medium">{formatNumber(totalReadingsFromClients)}</span>
              </div>
              
              {/* Top 3 clients by reading count */}
              {clientStats?.clients && clientStats.clients.length > 0 && (
                <div className="pt-2 border-t border-border/50">
                  <span className="text-xs text-muted-foreground mb-2 block">Top Clients</span>
                  <div className="space-y-2">
                    {clientStats.clients.slice(0, 3).map((client, idx) => (
                      <div key={client.client_id} className="flex justify-between items-center text-sm">
                        <span className="flex items-center gap-2">
                          <span className={`w-5 h-5 rounded text-xs flex items-center justify-center ${
                            idx === 0 ? 'bg-amber-500/20 text-amber-500' :
                            idx === 1 ? 'bg-slate-400/20 text-slate-400' :
                            'bg-orange-700/20 text-orange-700'
                          }`}>
                            {idx + 1}
                          </span>
                          <span className="truncate max-w-[120px]" title={client.hostname || client.client_id}>
                            {client.hostname || client.client_id.slice(0, 8)}
                          </span>
                        </span>
                        <span className="font-medium text-muted-foreground">
                          {formatNumber(client.reading_count)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardDeviceActivity;
