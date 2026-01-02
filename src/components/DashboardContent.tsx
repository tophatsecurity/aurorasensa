import { 
  Thermometer, 
  Radio, 
  Zap, 
  BarChart3, 
  Droplets, 
  Signal,
  MapPin,
  Loader2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import SensorCard from "./SensorCard";
import { useSensors, useAlerts, useAdsbStats } from "@/hooks/useAuroraApi";

const DashboardContent = () => {
  const { data: sensors, isLoading: sensorsLoading } = useSensors();
  const { data: alerts, isLoading: alertsLoading } = useAlerts();
  const { data: adsbStats, isLoading: adsbLoading } = useAdsbStats();

  // Calculate averages from sensor data
  const tempSensors = sensors?.filter(s => s.type === 'temperature') || [];
  const avgTemp = tempSensors.length 
    ? (tempSensors.reduce((acc, s) => acc + s.value, 0) / tempSensors.length).toFixed(1)
    : null;

  const signalSensors = sensors?.filter(s => s.type === 'signal' || s.type === 'rssi') || [];
  const avgSignal = signalSensors.length
    ? Math.round(signalSensors.reduce((acc, s) => acc + s.value, 0) / signalSensors.length)
    : null;

  const powerSensors = sensors?.filter(s => s.type === 'power') || [];
  const avgPower = powerSensors.length
    ? Math.round(powerSensors.reduce((acc, s) => acc + s.value, 0) / powerSensors.length)
    : null;

  const totalSensors = sensors?.length || 0;

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
          title="AVG TEMPERATURE"
          value={avgTemp !== null ? `${avgTemp}°C` : "—"}
          subtitle="Last hour average"
          icon={Thermometer}
          iconBgColor="bg-orange-500/20"
        />
        <SensorCard
          title="AVG SIGNAL"
          value={avgSignal !== null ? `${avgSignal}` : "—"}
          subtitle="RSSI (dBm)"
          icon={Radio}
          iconBgColor="bg-blue-500/20"
        />
        <SensorCard
          title="AVG POWER"
          value={avgPower !== null ? `${avgPower}` : "—"}
          subtitle="Watts (W)"
          icon={Zap}
          iconBgColor="bg-purple-500/20"
        />
        <SensorCard
          title="TOTAL SENSORS"
          value={sensorsLoading ? "..." : totalSensors.toString()}
          subtitle="Active sensors"
          icon={BarChart3}
          iconBgColor="bg-cyan-500/20"
        />
      </div>

      {/* Sensor Trends */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          Sensor Trends (Last Hour)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <SensorCard
            title="TEMPERATURE"
            value={avgTemp !== null ? `${avgTemp}°C` : "—"}
            icon={Thermometer}
            iconBgColor="bg-red-500/20"
            className="min-h-[180px]"
          />
          <SensorCard
            title="HUMIDITY"
            value="—"
            icon={Droplets}
            iconBgColor="bg-blue-400/20"
            className="min-h-[180px]"
          />
          <SensorCard
            title="SIGNAL STRENGTH"
            value={avgSignal !== null ? `${avgSignal} dBm` : "—"}
            icon={Signal}
            iconBgColor="bg-purple-400/20"
            className="min-h-[180px]"
          />
          <SensorCard
            title="POWER"
            value={avgPower !== null ? `${avgPower}W` : "—"}
            icon={Zap}
            iconBgColor="bg-orange-400/20"
            className="min-h-[180px]"
          />
        </div>
      </div>

      {/* GPS Position */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        <SensorCard
          title="GPS POSITION"
          icon={MapPin}
          iconBgColor="bg-green-500/20"
          className="min-h-[200px]"
        >
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Satellites:</span>
              <span className="font-medium">—</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Altitude:</span>
              <span className="font-medium">— m</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Speed:</span>
              <span className="font-medium">— km/h</span>
            </div>
          </div>
        </SensorCard>

        {/* ADS-B Stats */}
        <SensorCard
          title="ADS-B TRACKING"
          icon={Radio}
          iconBgColor="bg-cyan-500/20"
          className="min-h-[200px]"
        >
          {adsbLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Aircraft:</span>
                <span className="font-medium">{adsbStats?.total ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tracked:</span>
                <span className="font-medium">{adsbStats?.tracked ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Messages:</span>
                <span className="font-medium">{adsbStats?.messages?.toLocaleString() ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Positions:</span>
                <span className="font-medium">{adsbStats?.positions?.toLocaleString() ?? "—"}</span>
              </div>
            </div>
          )}
        </SensorCard>
      </div>

      {/* Sensor Map Placeholder */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary" />
          Sensor Map (Live Locations)
        </h2>
        <div className="glass-card rounded-xl p-6 border border-border/50">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-muted-foreground">Show:</span>
            <Badge variant="default" className="bg-primary text-primary-foreground">All</Badge>
            <Badge variant="outline" className="border-green-500 text-green-500">🛰 GPS</Badge>
            <Badge variant="outline" className="border-cyan-500 text-cyan-500">✈ ADS-B</Badge>
            <Badge variant="outline" className="border-blue-500 text-blue-500">📡 Starlink</Badge>
            <Badge variant="outline" className="border-orange-500 text-orange-500">📻 LoRa</Badge>
          </div>
          <div className="h-64 bg-muted/20 rounded-lg flex items-center justify-center text-muted-foreground">
            Map visualization coming soon...
          </div>
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
