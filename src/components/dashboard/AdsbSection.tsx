import { memo, useMemo } from "react";
import { Plane, Radio, AlertTriangle, Activity, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { 
  useAdsbAircraft, 
  useAdsbStats, 
  useAdsbEmergencies,
  useAdsbCoverage,
  useAdsbHistorical,
} from "@/hooks/aurora";
import { Loader2 } from "lucide-react";
import { formatLastSeen } from "@/utils/dateUtils";
import { format } from "date-fns";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface AdsbSectionProps {
  hours?: number;
}

export const AdsbSection = memo(function AdsbSection({ hours = 24 }: AdsbSectionProps) {
  const { data: aircraft, isLoading: aircraftLoading } = useAdsbAircraft();
  const { data: stats } = useAdsbStats();
  const { data: emergencies } = useAdsbEmergencies();
  const { data: coverage } = useAdsbCoverage();
  const { data: historicalData } = useAdsbHistorical(hours * 60);

  // Build chart data from historical readings
  const chartData = useMemo(() => {
    if (!historicalData?.readings || historicalData.readings.length === 0) return [];
    
    // Group readings by time and count aircraft
    const buckets: Record<string, number> = {};
    
    historicalData.readings.forEach(r => {
      if (r.timestamp) {
        const time = format(new Date(r.timestamp), "HH:mm");
        const data = r.data as { aircraft_list?: Array<unknown> };
        const count = data?.aircraft_list?.length ?? 1;
        buckets[time] = (buckets[time] ?? 0) + count;
      }
    });
    
    return Object.entries(buckets)
      .map(([time, count]) => ({ time, aircraft: count }))
      .slice(-24);
  }, [historicalData]);

  const activeAircraft = useMemo(() => {
    if (!aircraft) return [];
    return aircraft.filter(a => a.lat && a.lon).slice(0, 10);
  }, [aircraft]);

  const totalAircraft = aircraft?.length ?? 0;
  const activeEmergencies = emergencies?.length ?? 0;

  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Plane className="w-5 h-5 text-cyan-500" />
        ADS-B Air Traffic
        {activeEmergencies > 0 && (
          <Badge variant="destructive" className="ml-2">
            {activeEmergencies} Emergency
          </Badge>
        )}
      </h2>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="glass-card rounded-lg p-4 border border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
              <Plane className="w-4 h-4 text-cyan-400" />
            </div>
            <span className="text-xs text-muted-foreground">Aircraft Tracked</span>
          </div>
          <div className="text-2xl font-bold text-cyan-400">
            {aircraftLoading ? "..." : totalAircraft}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {activeAircraft.length} with position
          </div>
        </div>

        <div className="glass-card rounded-lg p-4 border border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
              <Activity className="w-4 h-4 text-green-400" />
            </div>
            <span className="text-xs text-muted-foreground">Messages Decoded</span>
          </div>
          <div className="text-2xl font-bold text-green-400">
            {stats?.messages_decoded?.toLocaleString() ?? "—"}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {stats?.messages_per_second?.toFixed(1) ?? "—"}/sec
          </div>
        </div>

        <div className="glass-card rounded-lg p-4 border border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-violet-400" />
            </div>
            <span className="text-xs text-muted-foreground">Max Range</span>
          </div>
          <div className="text-2xl font-bold text-violet-400">
            {coverage?.max_range_km?.toFixed(0) ?? stats?.max_range_nm?.toFixed(0) ?? "—"}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            km coverage radius
          </div>
        </div>

        <div className="glass-card rounded-lg p-4 border border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
              <Radio className="w-4 h-4 text-orange-400" />
            </div>
            <span className="text-xs text-muted-foreground">Positions</span>
          </div>
          <div className="text-2xl font-bold text-orange-400">
            {coverage?.total_positions?.toLocaleString() ?? stats?.positions_received?.toLocaleString() ?? "—"}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {coverage?.unique_aircraft ?? "—"} unique aircraft
          </div>
        </div>
      </div>

      {/* Aircraft Activity Chart */}
      {chartData.length > 0 && (
        <div className="glass-card rounded-xl p-4 border border-border/50 mb-4">
          <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            Aircraft Activity Over Time
          </h3>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="adsbAircraftGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
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
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [value, 'Aircraft']}
                />
                <Area
                  type="monotone"
                  dataKey="aircraft"
                  stroke="hsl(var(--primary))"
                  fill="url(#adsbAircraftGradient)"
                  strokeWidth={2}
                  name="Aircraft"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Aircraft List */}
      {aircraftLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : activeAircraft.length > 0 ? (
        <div className="glass-card rounded-xl border border-border/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-muted/30">
                  <th className="text-left p-3 font-medium text-muted-foreground">Flight</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Hex</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Altitude</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Speed</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Heading</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Signal</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">Category</th>
                </tr>
              </thead>
              <tbody>
                {activeAircraft.map((a) => (
                  <tr key={a.hex} className="border-b border-border/30 hover:bg-muted/20">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Plane className="w-4 h-4 text-cyan-400" />
                        <span className="font-medium">{a.flight?.trim() || "—"}</span>
                        {a.emergency && a.emergency !== "none" && (
                          <AlertTriangle className="w-4 h-4 text-destructive" />
                        )}
                      </div>
                    </td>
                    <td className="p-3 font-mono text-xs text-muted-foreground">{a.hex}</td>
                    <td className="p-3 text-right">
                      {a.alt_baro?.toLocaleString() ?? a.alt_geom?.toLocaleString() ?? "—"} ft
                    </td>
                    <td className="p-3 text-right">
                      {a.gs?.toFixed(0) ?? "—"} kts
                    </td>
                    <td className="p-3 text-right">
                      {a.track?.toFixed(0) ?? "—"}°
                    </td>
                    <td className="p-3 text-right">
                      {a.rssi?.toFixed(1) ?? "—"} dB
                    </td>
                    <td className="p-3 text-center">
                      <Badge variant="outline" className="text-xs">
                        {a.category ?? "—"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="glass-card rounded-xl p-8 text-center border border-border/50">
          <Plane className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-muted-foreground">No aircraft currently tracked</p>
        </div>
      )}

      {/* Emergencies */}
      {activeEmergencies > 0 && emergencies && (
        <div className="mt-4 p-4 rounded-lg bg-destructive/10 border border-destructive/30">
          <h3 className="font-semibold text-destructive flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4" />
            Active Emergencies
          </h3>
          <div className="space-y-2">
            {emergencies.slice(0, 3).map((e, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span>{e.flight || e.hex} - {e.emergency_type || e.squawk}</span>
                <span className="text-muted-foreground">
                  Alt: {e.alt_baro?.toLocaleString() ?? "—"} ft
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

export default AdsbSection;
