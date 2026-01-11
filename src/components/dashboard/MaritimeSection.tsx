import { Ship, Radio, AlertTriangle, Activity, Anchor, Signal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  useAisStats,
  useAprsStats,
  useEpirbStats,
} from "@/hooks/aurora/maritime";

interface StatItemProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  isLoading?: boolean;
}

const StatItem = ({ label, value, icon, color, isLoading }: StatItemProps) => (
  <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-border/30">
    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
      {icon}
    </div>
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-bold">{isLoading ? "..." : value}</p>
    </div>
  </div>
);

export const MaritimeSection = () => {
  const { data: aisStats, isLoading: aisLoading } = useAisStats();
  const { data: aprsStats, isLoading: aprsLoading } = useAprsStats();
  const { data: epirbStats, isLoading: epirbLoading } = useEpirbStats();

  const hasActiveAlert = (epirbStats?.active_alerts ?? 0) > 0;

  return (
    <div className="glass-card rounded-xl p-6 border border-border/50">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Ship className="w-5 h-5 text-cyan-400" />
          <h2 className="text-lg font-semibold">Maritime & RF</h2>
        </div>
        {hasActiveAlert && (
          <Badge className="bg-red-500/20 text-red-400 border-red-500/30 animate-pulse">
            <AlertTriangle className="w-3 h-3 mr-1" />
            EPIRB Alert
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* AIS Stats */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Ship className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-medium text-cyan-400">AIS Vessels</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <StatItem
              label="Total"
              value={aisStats?.total_vessels ?? 0}
              icon={<Ship className="w-4 h-4 text-cyan-400" />}
              color="bg-cyan-500/20"
              isLoading={aisLoading}
            />
            <StatItem
              label="Active"
              value={aisStats?.active_vessels ?? 0}
              icon={<Activity className="w-4 h-4 text-green-400" />}
              color="bg-green-500/20"
              isLoading={aisLoading}
            />
          </div>
          <div className="text-xs text-muted-foreground">
            {aisLoading ? "..." : `${aisStats?.vessels_last_hour ?? 0} vessels in last hour`}
          </div>
        </div>

        {/* APRS Stats */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Radio className="w-4 h-4 text-orange-400" />
            <span className="text-sm font-medium text-orange-400">APRS Stations</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <StatItem
              label="Stations"
              value={aprsStats?.total_stations ?? 0}
              icon={<Radio className="w-4 h-4 text-orange-400" />}
              color="bg-orange-500/20"
              isLoading={aprsLoading}
            />
            <StatItem
              label="Digipeaters"
              value={aprsStats?.digipeaters ?? 0}
              icon={<Signal className="w-4 h-4 text-purple-400" />}
              color="bg-purple-500/20"
              isLoading={aprsLoading}
            />
          </div>
          <div className="text-xs text-muted-foreground">
            {aprsLoading ? "..." : `${(aprsStats?.packets_last_hour ?? 0).toLocaleString()} packets/hr`}
          </div>
        </div>

        {/* EPIRB Stats */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Anchor className="w-4 h-4 text-red-400" />
            <span className="text-sm font-medium text-red-400">EPIRB Beacons</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <StatItem
              label="Beacons"
              value={epirbStats?.total_beacons ?? 0}
              icon={<Anchor className="w-4 h-4 text-red-400" />}
              color="bg-red-500/20"
              isLoading={epirbLoading}
            />
            <StatItem
              label="Alerts"
              value={epirbStats?.active_alerts ?? 0}
              icon={<AlertTriangle className="w-4 h-4 text-yellow-400" />}
              color={hasActiveAlert ? "bg-red-500/30" : "bg-yellow-500/20"}
              isLoading={epirbLoading}
            />
          </div>
          <div className="text-xs text-muted-foreground">
            {epirbLoading ? "..." : `${epirbStats?.resolved_last_24h ?? 0} resolved in 24h`}
          </div>
        </div>
      </div>

      {/* Summary Row */}
      <div className="flex items-center justify-between pt-3 border-t border-border/30 text-sm">
        <div className="flex items-center gap-4">
          <span className="text-muted-foreground">
            Coverage: <span className="text-foreground font-medium">{aisStats?.coverage_area_nm ?? "—"} nm²</span>
          </span>
          <span className="text-muted-foreground">
            Avg Speed: <span className="text-foreground font-medium">{aisStats?.avg_speed?.toFixed(1) ?? "—"} kn</span>
          </span>
          <span className="text-muted-foreground">
            Weather Stations: <span className="text-foreground font-medium">{aprsStats?.weather_stations ?? 0}</span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default MaritimeSection;
