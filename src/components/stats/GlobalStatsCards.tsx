import { useMemo } from "react";
import { 
  Activity, 
  Database, 
  Users, 
  AlertTriangle, 
  Clock, 
  Cpu,
  BarChart3,
  Layers
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import {
  useGlobalStats,
  useComprehensiveStats,
  use1hrStats,
  use24hrStats,
  useClients,
  useAlertStats,
  useDashboardSensorStats,
} from "@/hooks/aurora";

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
  
  // Fetch real data from multiple endpoints
  const { data: globalStats, isLoading: globalLoading } = useGlobalStats(effectiveClientId);
  const { data: comprehensiveStats, isLoading: comprehensiveLoading } = useComprehensiveStats(effectiveClientId);
  const { data: stats1hr, isLoading: stats1hrLoading } = use1hrStats(effectiveClientId);
  const { data: stats24hr } = use24hrStats(effectiveClientId);
  const { data: clients } = useClients();
  const { data: alertStats } = useAlertStats();
  const { data: dashboardSensorStats } = useDashboardSensorStats(effectiveClientId);
  
  const global = comprehensiveStats?.global;
  
  // Derive values with multiple fallbacks for real data
  const totalReadings = useMemo(() => {
    return globalStats?.total_readings ?? 
           (dashboardSensorStats as { readings_last_24h?: number })?.readings_last_24h ?? 
           global?.total_readings ?? 
           global?.database?.total_readings ?? 
           0;
  }, [globalStats, dashboardSensorStats, global]);

  const totalBatches = useMemo(() => {
    return globalStats?.total_batches ?? 
           global?.total_batches ?? 
           global?.database?.total_batches ?? 
           0;
  }, [globalStats, global]);

  const totalClients = useMemo(() => {
    return globalStats?.total_clients ?? 
           global?.total_clients ?? 
           clients?.length ?? 
           0;
  }, [globalStats, global, clients]);

  const totalDevices = useMemo(() => {
    return globalStats?.total_devices ?? 
           (dashboardSensorStats as { total_devices?: number })?.total_devices ?? 
           global?.total_devices ?? 
           0;
  }, [globalStats, dashboardSensorStats, global]);

  const sensorTypesCount = useMemo(() => {
    return globalStats?.sensor_types_count ?? 
           (dashboardSensorStats as { total_sensors?: number })?.total_sensors ?? 
           global?.sensor_types_count ?? 
           globalStats?.device_breakdown?.length ?? 
           0;
  }, [globalStats, dashboardSensorStats, global]);

  const activeDevices1h = stats1hr?.devices ?? global?.activity?.last_1_hour?.active_devices_1h ?? 0;
  const readings1h = stats1hr?.readings ?? global?.activity?.last_1_hour?.readings_1h ?? 0;
  const avgReadingsPerHour = global?.activity?.avg_readings_per_hour;
  const activeAlerts = alertStats?.active ?? global?.database?.active_alerts ?? 0;
  const timeRanges = global?.time_ranges;

  const isLoading = globalLoading || comprehensiveLoading || stats1hrLoading;

  const stats = [
    {
      title: "Total Readings",
      value: isLoading ? "..." : formatNumber(totalReadings),
      icon: Database,
      color: "text-cyan-400",
      bgColor: "bg-cyan-500/20",
    },
    {
      title: "Total Devices",
      value: isLoading ? "..." : formatNumber(totalDevices),
      subtitle: sensorTypesCount > 0 ? `${sensorTypesCount} types` : undefined,
      icon: Cpu,
      color: "text-violet-400",
      bgColor: "bg-violet-500/20",
    },
    {
      title: "Active Clients",
      value: isLoading ? "..." : formatNumber(totalClients),
      icon: Users,
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/20",
    },
    {
      title: "Data Batches",
      value: isLoading ? "..." : formatNumber(totalBatches),
      icon: Layers,
      color: "text-blue-400",
      bgColor: "bg-blue-500/20",
    },
    {
      title: "Active Alerts",
      value: formatNumber(activeAlerts),
      icon: AlertTriangle,
      color: activeAlerts > 0 ? "text-amber-400" : "text-green-400",
      bgColor: activeAlerts > 0 ? "bg-amber-500/20" : "bg-green-500/20",
    },
    {
      title: "Readings/Hour",
      value: formatNumber(avgReadingsPerHour ?? Math.round(readings1h)),
      subtitle: readings1h > 0 ? `${formatNumber(readings1h)} last hr` : undefined,
      icon: BarChart3,
      color: "text-orange-400",
      bgColor: "bg-orange-500/20",
    },
    {
      title: "Active (1h)",
      value: formatNumber(activeDevices1h),
      subtitle: "devices",
      icon: Activity,
      color: "text-pink-400",
      bgColor: "bg-pink-500/20",
    },
    {
      title: "Last Update",
      value: timeRanges?.latest_reading 
        ? formatDistanceToNow(new Date(timeRanges.latest_reading), { addSuffix: true })
        : "Now",
      subtitle: timeRanges?.data_span_days ? `${timeRanges.data_span_days.toFixed(0)} days of data` : undefined,
      icon: Clock,
      color: "text-teal-400",
      bgColor: "bg-teal-500/20",
    },
  ];

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
            <p className="text-lg font-bold">{stat.value}</p>
            {stat.subtitle && (
              <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
