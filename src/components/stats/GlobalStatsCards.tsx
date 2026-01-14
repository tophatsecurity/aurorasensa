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

interface GlobalStatsCardsProps {
  comprehensiveStats?: {
    global?: {
      database?: {
        total_readings?: number;
        total_batches?: number;
        total_clients?: number;
        active_alerts?: number;
      };
      devices?: {
        total_unique_devices?: number;
        total_device_types?: number;
      };
      activity?: {
        avg_readings_per_hour?: number;
        last_1_hour?: {
          readings_1h?: number;
          batches_1h?: number;
          active_devices_1h?: number;
        };
        last_24_hours?: {
          readings_24h?: number;
          batches_24h?: number;
          active_devices_24h?: number;
        };
      };
      time_ranges?: {
        latest_reading?: string;
        data_span_days?: number;
      };
    };
  } | null;
  stats1hr?: {
    readings?: number;
    devices?: number;
    clients?: number;
  } | null;
  stats24hr?: {
    readings?: number;
    devices?: number;
    clients?: number;
  } | null;
}

function formatNumber(num?: number): string {
  if (num === undefined || num === null) return "N/A";
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString();
}

export default function GlobalStatsCards({ comprehensiveStats, stats1hr, stats24hr }: GlobalStatsCardsProps) {
  const global = comprehensiveStats?.global;
  const database = global?.database;
  const devices = global?.devices;
  const activity = global?.activity;
  const timeRanges = global?.time_ranges;

  const stats = [
    {
      title: "Total Readings",
      value: formatNumber(database?.total_readings),
      icon: Database,
      color: "text-cyan-400",
      bgColor: "bg-cyan-500/20",
    },
    {
      title: "Total Devices",
      value: formatNumber(devices?.total_unique_devices),
      subtitle: devices?.total_device_types ? `${devices.total_device_types} types` : undefined,
      icon: Cpu,
      color: "text-violet-400",
      bgColor: "bg-violet-500/20",
    },
    {
      title: "Active Clients",
      value: formatNumber(database?.total_clients),
      icon: Users,
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/20",
    },
    {
      title: "Data Batches",
      value: formatNumber(database?.total_batches),
      icon: Layers,
      color: "text-blue-400",
      bgColor: "bg-blue-500/20",
    },
    {
      title: "Active Alerts",
      value: formatNumber(database?.active_alerts),
      icon: AlertTriangle,
      color: database?.active_alerts && database.active_alerts > 0 ? "text-amber-400" : "text-green-400",
      bgColor: database?.active_alerts && database.active_alerts > 0 ? "bg-amber-500/20" : "bg-green-500/20",
    },
    {
      title: "Readings/Hour",
      value: formatNumber(activity?.avg_readings_per_hour),
      subtitle: stats1hr?.readings ? `${formatNumber(stats1hr.readings)} last hr` : undefined,
      icon: BarChart3,
      color: "text-orange-400",
      bgColor: "bg-orange-500/20",
    },
    {
      title: "Active (1h)",
      value: formatNumber(activity?.last_1_hour?.active_devices_1h),
      subtitle: "devices",
      icon: Activity,
      color: "text-pink-400",
      bgColor: "bg-pink-500/20",
    },
    {
      title: "Last Update",
      value: timeRanges?.latest_reading 
        ? formatDistanceToNow(new Date(timeRanges.latest_reading), { addSuffix: true })
        : "N/A",
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
