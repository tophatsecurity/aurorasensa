import { useMemo } from "react";
import { 
  Activity, Database, Users, AlertTriangle, Clock, Cpu, BarChart3, Layers
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { useGlobalStats } from "@/hooks/aurora";

interface GlobalStatsCardsProps {
  periodHours?: number;
  clientId?: string | null;
}

function formatNumber(num?: number): string {
  if (num === undefined || num === null) return "—";
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString();
}

export default function GlobalStatsCards({ periodHours = 24, clientId }: GlobalStatsCardsProps) {
  const effectiveClientId = clientId === "all" ? undefined : clientId;
  
  // Single data source - useGlobalStats handles comprehensive fallback
  const { data: globalStats, isLoading } = useGlobalStats(effectiveClientId);

  const stats = useMemo(() => {
    const totalReadings = globalStats?.total_readings ?? 0;
    const totalDevices = globalStats?.total_devices ?? 0;
    const totalClients = globalStats?.total_clients ?? 0;
    const totalBatches = globalStats?.total_batches ?? 0;
    const activeAlerts = globalStats?.active_alerts ?? 0;
    const sensorTypesCount = globalStats?.sensor_types_count ?? globalStats?.device_breakdown?.length ?? 0;
    const readingsLastHour = globalStats?.readings_last_hour ?? 0;
    const readingsLast24h = globalStats?.readings_last_24h ?? 0;
    const timeRanges = globalStats?.time_ranges;

    return [
      { title: "Total Readings", value: formatNumber(totalReadings), icon: Database, color: "text-cyan-400", bgColor: "bg-cyan-500/20" },
      { title: "Total Devices", value: formatNumber(totalDevices), subtitle: sensorTypesCount > 0 ? `${sensorTypesCount} types` : undefined, icon: Cpu, color: "text-violet-400", bgColor: "bg-violet-500/20" },
      { title: "Active Clients", value: formatNumber(totalClients), icon: Users, color: "text-emerald-400", bgColor: "bg-emerald-500/20" },
      { title: "Data Batches", value: formatNumber(totalBatches), icon: Layers, color: "text-blue-400", bgColor: "bg-blue-500/20" },
      { title: "Active Alerts", value: formatNumber(activeAlerts), icon: AlertTriangle, color: activeAlerts > 0 ? "text-amber-400" : "text-green-400", bgColor: activeAlerts > 0 ? "bg-amber-500/20" : "bg-green-500/20" },
      { title: "Readings/Hour", value: formatNumber(readingsLastHour || Math.round(totalReadings / Math.max(1, (timeRanges?.data_span_days ?? 1) * 24))), subtitle: readingsLast24h > 0 ? `${formatNumber(readingsLast24h)} last 24h` : undefined, icon: BarChart3, color: "text-orange-400", bgColor: "bg-orange-500/20" },
      { title: "Active (1h)", value: formatNumber(readingsLastHour > 0 ? totalDevices : 0), subtitle: "devices", icon: Activity, color: "text-pink-400", bgColor: "bg-pink-500/20" },
      { title: "Last Update", value: timeRanges?.latest_reading ? formatDistanceToNow(new Date(timeRanges.latest_reading), { addSuffix: true }) : "—", subtitle: timeRanges?.data_span_days ? `${timeRanges.data_span_days} days of data` : undefined, icon: Clock, color: "text-teal-400", bgColor: "bg-teal-500/20" },
    ];
  }, [globalStats]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
      {stats.map((stat) => (
        <Card key={stat.title} className="glass-card border-border/50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className={`p-1.5 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`w-3.5 h-3.5 ${stat.color}`} />
              </div>
              <span className="text-xs text-muted-foreground truncate">{stat.title}</span>
            </div>
            <p className="text-lg font-bold">{isLoading ? "..." : stat.value}</p>
            {stat.subtitle && <p className="text-xs text-muted-foreground">{stat.subtitle}</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
