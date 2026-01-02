import { 
  Thermometer, 
  Radio, 
  Zap, 
  BarChart3, 
  MapPin,
  Loader2,
  TrendingUp,
  Activity,
  Database,
  Clock,
  ExternalLink
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import SensorCard from "./SensorCard";
import SensorCharts from "./SensorCharts";
import { useComprehensiveStats, useAlerts } from "@/hooks/useAuroraApi";

const DashboardContent = () => {
  const { data: stats, isLoading: statsLoading } = useComprehensiveStats();
  const { data: alerts } = useAlerts();

  // Extract key metrics from comprehensive stats
  const global = stats?.global;
  const devicesSummary = stats?.devices_summary;
  const sensorsSummary = stats?.sensors_summary;

  const totalReadings = global?.database?.total_readings ?? 0;
  const totalClients = global?.database?.total_clients ?? 0;
  const activeDevices1h = global?.activity?.last_1_hour?.active_devices_1h ?? 0;
  const readings1h = global?.activity?.last_1_hour?.readings_1h ?? 0;
  const totalSensorTypes = sensorsSummary?.total_sensor_types ?? 0;

  return (
    <div className="flex-1 overflow-y-auto p-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <h1 className="text-3xl font-bold text-foreground">AURORASENSE Server</h1>
        <Badge className="bg-success/20 text-success border-success/30 px-3 py-1">
          LIVE
        </Badge>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <SensorCard
          title="CONNECTED CLIENTS"
          value={statsLoading ? "..." : totalClients.toString()}
          subtitle={`${activeDevices1h} sensor types active`}
          icon={Activity}
          iconBgColor="bg-green-500/20"
        />
        <SensorCard
          title="TOTAL READINGS"
          value={statsLoading ? "..." : totalReadings.toLocaleString()}
          subtitle={`${readings1h.toLocaleString()} last hour`}
          icon={Database}
          iconBgColor="bg-blue-500/20"
        />
        <SensorCard
          title="SENSOR TYPES"
          value={statsLoading ? "..." : totalSensorTypes.toString()}
          subtitle="Unique device types"
          icon={Radio}
          iconBgColor="bg-purple-500/20"
        />
        <SensorCard
          title="DATA BATCHES"
          value={statsLoading ? "..." : (global?.database?.total_batches ?? 0).toLocaleString()}
          subtitle={`${global?.activity?.last_24_hours?.batches_24h ?? 0} last 24h`}
          icon={BarChart3}
          iconBgColor="bg-cyan-500/20"
        />
      </div>

      {/* Realtime Sensor Charts */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Sensor Trends (Realtime)
        </h2>
        <SensorCharts />
      </div>

      {/* GPS Position & Device Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        <SensorCard
          title="DATA TIME RANGE"
          icon={Clock}
          iconBgColor="bg-green-500/20"
          className="min-h-[200px]"
        >
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Data Span:</span>
              <span className="font-medium">{global?.time_ranges?.data_span_days?.toFixed(1) ?? "—"} days</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Earliest Reading:</span>
              <span className="font-medium text-xs">
                {global?.time_ranges?.earliest_reading 
                  ? new Date(global.time_ranges.earliest_reading).toLocaleDateString() 
                  : "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Latest Reading:</span>
              <span className="font-medium text-xs">
                {global?.time_ranges?.latest_reading 
                  ? new Date(global.time_ranges.latest_reading).toLocaleString() 
                  : "—"}
              </span>
            </div>
          </div>
        </SensorCard>

        {/* Device Activity */}
        <SensorCard
          title="DEVICE ACTIVITY"
          icon={Activity}
          iconBgColor="bg-cyan-500/20"
          className="min-h-[200px]"
        >
          {statsLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Active (1h):</span>
                <span className="font-medium text-success">{activeDevices1h} devices</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Active (24h):</span>
                <span className="font-medium">{global?.activity?.last_24_hours?.active_devices_24h ?? "—"} devices</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Readings (24h):</span>
                <span className="font-medium">{global?.activity?.last_24_hours?.readings_24h?.toLocaleString() ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Avg/Hour:</span>
                <span className="font-medium">{global?.activity?.avg_readings_per_hour?.toFixed(1) ?? "—"}</span>
              </div>
            </div>
          )}
        </SensorCard>
      </div>

      {/* Sensor Map Preview */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary" />
          Sensor Map (Live Locations)
        </h2>
        <div className="glass-card rounded-xl p-6 border border-border/50">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-muted-foreground">Showing:</span>
            <Badge variant="outline" className="border-green-500 text-green-500">🛰 GPS</Badge>
            <Badge variant="outline" className="border-cyan-500 text-cyan-500">✈ ADS-B</Badge>
            <Badge variant="outline" className="border-violet-500 text-violet-500">📡 Starlink</Badge>
            <Badge variant="outline" className="border-red-500 text-red-500">📻 LoRa</Badge>
          </div>
          <div 
            className="h-64 rounded-lg overflow-hidden relative bg-slate-900 flex items-center justify-center cursor-pointer group"
            style={{
              backgroundImage: 'url(https://a.basemaps.cartocdn.com/dark_all/8/75/96.png)',
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="text-center z-10">
              <MapPin className="w-12 h-12 text-primary mx-auto mb-2 opacity-80" />
              <p className="text-white/80 text-sm mb-3">View interactive sensor & aircraft map</p>
              <Badge className="bg-primary/90 text-primary-foreground gap-1">
                <ExternalLink className="w-3 h-3" />
                Open Full Map
              </Badge>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3 text-center">
            Click "Map" in the sidebar to view the full interactive map with real-time tracking
          </p>
        </div>
      </div>

      {/* Recent Alerts */}
      {alerts && alerts.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="text-warning">⚠</span>
            Recent Alerts
          </h2>
          <div className="space-y-2">
            {alerts.slice(0, 5).map((alert) => (
              <div 
                key={alert.id} 
                className="glass-card rounded-lg p-4 border border-border/50 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <Badge 
                    variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}
                    className="uppercase text-xs"
                  >
                    {alert.severity}
                  </Badge>
                  <span className="text-sm">{alert.message}</span>
                </div>
                <span className="text-xs text-muted-foreground">{alert.timestamp}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardContent;
