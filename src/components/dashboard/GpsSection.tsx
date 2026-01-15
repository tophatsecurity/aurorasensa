import { memo, useMemo } from "react";
import { Navigation, MapPin, Satellite, Clock, Loader2, Compass } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { 
  useGpsReadings,
  useGpsdStatus,
  useVisibleSatellites,
} from "@/hooks/aurora";
import { formatLastSeen } from "@/utils/dateUtils";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { format } from "date-fns";

interface GpsSectionProps {
  hours?: number;
}

export const GpsSection = memo(function GpsSection({ hours = 24 }: GpsSectionProps) {
  const { data: readings, isLoading: readingsLoading } = useGpsReadings(hours);
  const { data: gpsdStatus } = useGpsdStatus();
  const { data: satellites } = useVisibleSatellites();

  const latestReading = useMemo(() => {
    if (!readings?.readings?.length) return null;
    return readings.readings[readings.readings.length - 1];
  }, [readings?.readings]);

  const chartData = useMemo(() => {
    if (!readings?.readings) return [];
    return readings.readings.map(r => ({
      time: format(new Date(r.timestamp), "HH:mm"),
      altitude: r.altitude,
      speed: r.speed,
      satellites: r.satellites,
    })).slice(-50);
  }, [readings?.readings]);

  const getFixQuality = (mode?: number) => {
    switch (mode) {
      case 3: return { label: '3D Fix', color: 'bg-success/20 text-success' };
      case 2: return { label: '2D Fix', color: 'bg-warning/20 text-warning' };
      default: return { label: 'No Fix', color: 'bg-destructive/20 text-destructive' };
    }
  };

  const fixQuality = getFixQuality(gpsdStatus?.mode);
  const satsUsed = satellites?.satellites_used ?? gpsdStatus?.satellites_used ?? 0;
  const satsVisible = satellites?.satellites_visible ?? gpsdStatus?.satellites_visible ?? 0;

  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Navigation className="w-5 h-5 text-green-500" />
        GPS Tracking
        <Badge variant="outline" className={fixQuality.color}>
          {fixQuality.label}
        </Badge>
      </h2>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="glass-card rounded-lg p-4 border border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-green-400" />
            </div>
            <span className="text-xs text-muted-foreground">Position</span>
          </div>
          <div className="text-sm font-bold text-green-400">
            {gpsdStatus?.latitude?.toFixed(6) ?? latestReading?.latitude?.toFixed(6) ?? "—"}
          </div>
          <div className="text-sm font-bold text-green-400">
            {gpsdStatus?.longitude?.toFixed(6) ?? latestReading?.longitude?.toFixed(6) ?? "—"}
          </div>
        </div>

        <div className="glass-card rounded-lg p-4 border border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Navigation className="w-4 h-4 text-blue-400" />
            </div>
            <span className="text-xs text-muted-foreground">Altitude</span>
          </div>
          <div className="text-2xl font-bold text-blue-400">
            {gpsdStatus?.altitude?.toFixed(0) ?? latestReading?.altitude?.toFixed(0) ?? "—"}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            meters
          </div>
        </div>

        <div className="glass-card rounded-lg p-4 border border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
              <Compass className="w-4 h-4 text-violet-400" />
            </div>
            <span className="text-xs text-muted-foreground">Speed</span>
          </div>
          <div className="text-2xl font-bold text-violet-400">
            {((gpsdStatus?.speed ?? latestReading?.speed ?? 0) * 3.6).toFixed(1)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            km/h
          </div>
        </div>

        <div className="glass-card rounded-lg p-4 border border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <Satellite className="w-4 h-4 text-amber-400" />
            </div>
            <span className="text-xs text-muted-foreground">Satellites</span>
          </div>
          <div className="text-2xl font-bold text-amber-400">
            {satsUsed}/{satsVisible}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            used/visible
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Altitude Chart */}
        {chartData.length > 0 && (
          <div className="glass-card rounded-xl p-4 border border-border/50">
            <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
              <Navigation className="w-4 h-4 text-blue-400" />
              Altitude Over Time
            </h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
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
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="altitude"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                    name="Altitude (m)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Satellite View */}
        <div className="glass-card rounded-xl p-4 border border-border/50">
          <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
            <Satellite className="w-4 h-4 text-amber-400" />
            Visible Satellites ({satsVisible})
          </h3>
          {satellites?.satellites && satellites.satellites.length > 0 ? (
            <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
              {satellites.satellites.map((sat, i) => (
                <div 
                  key={sat.PRN || i} 
                  className={`p-2 rounded-lg text-center text-xs ${
                    sat.used ? 'bg-success/20 border border-success/30' : 'bg-muted/30'
                  }`}
                >
                  <div className="font-bold">{sat.PRN || sat.svid || i + 1}</div>
                  <div className="text-muted-foreground">{sat.ss?.toFixed(0) ?? "—"} dB</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-muted-foreground">
              No satellite data available
            </div>
          )}
        </div>
      </div>

      {/* GPS Details */}
      {gpsdStatus && (
        <div className="mt-4 glass-card rounded-xl p-4 border border-border/50">
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            GPS Details
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Heading:</span>
              <span className="ml-2 font-medium">{gpsdStatus.track?.toFixed(1) ?? "—"}°</span>
            </div>
            <div>
              <span className="text-muted-foreground">HDOP:</span>
              <span className="ml-2 font-medium">{gpsdStatus.hdop?.toFixed(2) ?? "—"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">VDOP:</span>
              <span className="ml-2 font-medium">{gpsdStatus.vdop?.toFixed(2) ?? "—"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Device:</span>
              <span className="ml-2 font-medium">{gpsdStatus.device ?? "—"}</span>
            </div>
          </div>
        </div>
      )}

      {readingsLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!readingsLoading && !gpsdStatus && !readings?.readings?.length && (
        <div className="glass-card rounded-xl p-8 text-center border border-border/50">
          <Navigation className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-muted-foreground">No GPS data available</p>
        </div>
      )}
    </div>
  );
});

export default GpsSection;
