import { useMemo } from "react";
import { 
  Thermometer, 
  Radio, 
  Zap, 
  BarChart3, 
  MapPin,
  Loader2,
  TrendingUp,
  TrendingDown,
  Activity,
  Database,
  Clock,
  ExternalLink,
  Server,
  Cpu,
  Wifi,
  Droplets,
  Signal,
  UserPlus,
  CheckCircle,
  AlertCircle,
  Satellite,
  Plane,
  Navigation,
  ArrowUp,
  ArrowDown,
  Minus
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import SensorCard from "./SensorCard";
import SensorCharts from "./SensorCharts";
import { useComprehensiveStats, useAlerts, useClients, useDashboardStats, useDashboardTimeseries, Client } from "@/hooks/useAuroraApi";
import { formatLastSeen, formatDate, formatDateTime, getDeviceStatusFromLastSeen } from "@/utils/dateUtils";

interface SensorStats {
  min: number | null;
  max: number | null;
  avg: number | null;
  current: number | null;
  trend: 'up' | 'down' | 'stable';
}

const calcStats = (data: { value: number }[] | undefined): SensorStats => {
  if (!data || data.length === 0) {
    return { min: null, max: null, avg: null, current: null, trend: 'stable' };
  }
  const values = data.map(d => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const current = values[values.length - 1];
  const previous = values.length > 1 ? values[values.length - 2] : current;
  const trend = current > previous + 0.1 ? 'up' : current < previous - 0.1 ? 'down' : 'stable';
  return { min, max, avg, current, trend };
};

const DashboardContent = () => {
  const { data: stats, isLoading: statsLoading } = useComprehensiveStats();
  const { data: dashboardStats, isLoading: dashboardStatsLoading } = useDashboardStats();
  const { data: timeseries, isLoading: timeseriesLoading } = useDashboardTimeseries(24);
  const { data: alerts } = useAlerts();
  const { data: clients, isLoading: clientsLoading } = useClients();

  // Extract key metrics from comprehensive stats
  const global = stats?.global;
  const devicesSummary = stats?.devices_summary;
  const sensorsSummary = stats?.sensors_summary;

  const totalReadings = global?.database?.total_readings ?? 0;
  const totalClients = global?.database?.total_clients ?? 0;
  const activeDevices1h = global?.activity?.last_1_hour?.active_devices_1h ?? 0;
  const readings1h = global?.activity?.last_1_hour?.readings_1h ?? 0;
  const totalSensorTypes = sensorsSummary?.total_sensor_types ?? 0;
  const totalDevices = devicesSummary?.total_devices ?? 0;
  const activeAlerts = global?.database?.active_alerts ?? 0;

  // Sensor averages from dashboard stats
  const avgTemp = dashboardStats?.avg_temp_c ?? dashboardStats?.avg_temp_aht;
  const avgHumidity = dashboardStats?.avg_humidity;
  const avgSignal = dashboardStats?.avg_signal_dbm;
  const avgPower = dashboardStats?.avg_power_w;

  // 24h sensor statistics
  const tempStats = useMemo(() => calcStats(timeseries?.temperature), [timeseries?.temperature]);
  const humidityStats = useMemo(() => calcStats(timeseries?.humidity), [timeseries?.humidity]);
  const signalStats = useMemo(() => calcStats(timeseries?.signal), [timeseries?.signal]);
  const powerStats = useMemo(() => calcStats(timeseries?.power), [timeseries?.power]);

  // Devices pending adoption (auto-registered but not manually adopted)
  const pendingDevices = clients?.filter((c: Client) => c.auto_registered && !c.adopted_at) || [];
  const adoptedDevices = clients?.filter((c: Client) => c.adopted_at) || [];
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
          subtitle={`${activeDevices1h} active in last hour`}
          icon={Server}
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
          subtitle={`${totalDevices} unique devices`}
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

      {/* Live Sensor Values */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          Live Sensor Values
          {!dashboardStatsLoading && (
            <Badge variant="outline" className="ml-2 text-xs bg-success/10 text-success border-success/30">
              Real-time
            </Badge>
          )}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-card rounded-xl p-4 border border-border/50 hover:border-red-500/30 transition-colors">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                <Thermometer className="w-5 h-5 text-red-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Temperature</p>
                <p className="text-2xl font-bold text-red-400">
                  {dashboardStatsLoading ? "..." : avgTemp !== null && avgTemp !== undefined ? `${avgTemp.toFixed(1)}°C` : "—"}
                </p>
              </div>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {avgTemp !== null && avgTemp !== undefined && (
                <span className="text-red-400/70">{((avgTemp * 9/5) + 32).toFixed(1)}°F</span>
              )}
            </div>
          </div>
          <div className="glass-card rounded-xl p-4 border border-border/50 hover:border-blue-500/30 transition-colors">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Droplets className="w-5 h-5 text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Humidity</p>
                <p className="text-2xl font-bold text-blue-400">
                  {dashboardStatsLoading ? "..." : avgHumidity !== null && avgHumidity !== undefined ? `${avgHumidity.toFixed(1)}%` : "—"}
                </p>
              </div>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {avgHumidity !== null && avgHumidity !== undefined && (
                <span className={avgHumidity > 60 ? "text-warning" : avgHumidity < 30 ? "text-warning" : "text-success"}>
                  {avgHumidity > 60 ? "High" : avgHumidity < 30 ? "Low" : "Normal"}
                </span>
              )}
            </div>
          </div>
          <div className="glass-card rounded-xl p-4 border border-border/50 hover:border-purple-500/30 transition-colors">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Signal className="w-5 h-5 text-purple-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Signal Strength</p>
                <p className="text-2xl font-bold text-purple-400">
                  {dashboardStatsLoading ? "..." : avgSignal !== null && avgSignal !== undefined ? `${avgSignal.toFixed(0)} dBm` : "—"}
                </p>
              </div>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {avgSignal !== null && avgSignal !== undefined && (
                <span className={avgSignal > -50 ? "text-success" : avgSignal > -70 ? "text-warning" : "text-destructive"}>
                  {avgSignal > -50 ? "Excellent" : avgSignal > -70 ? "Good" : "Weak"}
                </span>
              )}
            </div>
          </div>
          <div className="glass-card rounded-xl p-4 border border-border/50 hover:border-orange-500/30 transition-colors">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                <Zap className="w-5 h-5 text-orange-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Power Draw</p>
                <p className="text-2xl font-bold text-orange-400">
                  {dashboardStatsLoading ? "..." : avgPower !== null && avgPower !== undefined ? `${avgPower.toFixed(1)}W` : "—"}
                </p>
              </div>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {avgPower !== null && avgPower !== undefined && (
                <span className="text-orange-400/70">{(avgPower / 1000).toFixed(3)} kW</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sensor Types Summary */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Radio className="w-5 h-5 text-primary" />
          Active Sensor Types ({sensorsSummary?.total_sensor_types ?? 0})
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {sensorsSummary?.sensor_types?.slice(0, 6).map((sensor) => (
            <div 
              key={sensor.device_type}
              className="glass-card rounded-lg p-3 border border-border/50 hover:border-primary/30 transition-colors"
            >
              <div className="text-xs text-muted-foreground capitalize truncate">
                {sensor.device_type.replace(/_/g, ' ')}
              </div>
              <div className="text-lg font-bold text-foreground">
                {sensor.device_count}
              </div>
              <div className="text-xs text-muted-foreground">
                {sensor.total_readings.toLocaleString()} readings
              </div>
              {sensor.active_last_hour && (
                <Badge variant="outline" className="mt-1 text-[10px] px-1.5 py-0 bg-success/10 text-success border-success/30">
                  Active
                </Badge>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 24h Sensor Comparison */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          24-Hour Sensor Comparison
          {timeseriesLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Temperature */}
          <div className="glass-card rounded-xl p-4 border border-border/50">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                <Thermometer className="w-4 h-4 text-red-400" />
              </div>
              <span className="font-medium text-sm">Temperature</span>
              {tempStats.trend === 'up' && <TrendingUp className="w-4 h-4 text-success ml-auto" />}
              {tempStats.trend === 'down' && <TrendingDown className="w-4 h-4 text-destructive ml-auto" />}
              {tempStats.trend === 'stable' && <Minus className="w-4 h-4 text-muted-foreground ml-auto" />}
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <ArrowDown className="w-3 h-3 text-blue-400" /> Min
                </span>
                <span className="font-mono text-sm">{tempStats.min !== null ? `${tempStats.min.toFixed(1)}°C` : '—'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <ArrowUp className="w-3 h-3 text-red-400" /> Max
                </span>
                <span className="font-mono text-sm">{tempStats.max !== null ? `${tempStats.max.toFixed(1)}°C` : '—'}</span>
              </div>
              <div className="flex justify-between items-center border-t border-border/50 pt-2">
                <span className="text-xs text-muted-foreground">Avg</span>
                <span className="font-mono text-sm font-bold text-red-400">{tempStats.avg !== null ? `${tempStats.avg.toFixed(1)}°C` : '—'}</span>
              </div>
            </div>
          </div>

          {/* Humidity */}
          <div className="glass-card rounded-xl p-4 border border-border/50">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Droplets className="w-4 h-4 text-blue-400" />
              </div>
              <span className="font-medium text-sm">Humidity</span>
              {humidityStats.trend === 'up' && <TrendingUp className="w-4 h-4 text-success ml-auto" />}
              {humidityStats.trend === 'down' && <TrendingDown className="w-4 h-4 text-destructive ml-auto" />}
              {humidityStats.trend === 'stable' && <Minus className="w-4 h-4 text-muted-foreground ml-auto" />}
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <ArrowDown className="w-3 h-3 text-blue-400" /> Min
                </span>
                <span className="font-mono text-sm">{humidityStats.min !== null ? `${humidityStats.min.toFixed(1)}%` : '—'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <ArrowUp className="w-3 h-3 text-red-400" /> Max
                </span>
                <span className="font-mono text-sm">{humidityStats.max !== null ? `${humidityStats.max.toFixed(1)}%` : '—'}</span>
              </div>
              <div className="flex justify-between items-center border-t border-border/50 pt-2">
                <span className="text-xs text-muted-foreground">Avg</span>
                <span className="font-mono text-sm font-bold text-blue-400">{humidityStats.avg !== null ? `${humidityStats.avg.toFixed(1)}%` : '—'}</span>
              </div>
            </div>
          </div>

          {/* Signal */}
          <div className="glass-card rounded-xl p-4 border border-border/50">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Signal className="w-4 h-4 text-purple-400" />
              </div>
              <span className="font-medium text-sm">Signal</span>
              {signalStats.trend === 'up' && <TrendingUp className="w-4 h-4 text-success ml-auto" />}
              {signalStats.trend === 'down' && <TrendingDown className="w-4 h-4 text-destructive ml-auto" />}
              {signalStats.trend === 'stable' && <Minus className="w-4 h-4 text-muted-foreground ml-auto" />}
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <ArrowDown className="w-3 h-3 text-blue-400" /> Min
                </span>
                <span className="font-mono text-sm">{signalStats.min !== null ? `${signalStats.min.toFixed(0)} dBm` : '—'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <ArrowUp className="w-3 h-3 text-red-400" /> Max
                </span>
                <span className="font-mono text-sm">{signalStats.max !== null ? `${signalStats.max.toFixed(0)} dBm` : '—'}</span>
              </div>
              <div className="flex justify-between items-center border-t border-border/50 pt-2">
                <span className="text-xs text-muted-foreground">Avg</span>
                <span className="font-mono text-sm font-bold text-purple-400">{signalStats.avg !== null ? `${signalStats.avg.toFixed(0)} dBm` : '—'}</span>
              </div>
            </div>
          </div>

          {/* Power */}
          <div className="glass-card rounded-xl p-4 border border-border/50">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
                <Zap className="w-4 h-4 text-orange-400" />
              </div>
              <span className="font-medium text-sm">Power</span>
              {powerStats.trend === 'up' && <TrendingUp className="w-4 h-4 text-success ml-auto" />}
              {powerStats.trend === 'down' && <TrendingDown className="w-4 h-4 text-destructive ml-auto" />}
              {powerStats.trend === 'stable' && <Minus className="w-4 h-4 text-muted-foreground ml-auto" />}
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <ArrowDown className="w-3 h-3 text-blue-400" /> Min
                </span>
                <span className="font-mono text-sm">{powerStats.min !== null ? `${powerStats.min.toFixed(1)}W` : '—'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <ArrowUp className="w-3 h-3 text-red-400" /> Max
                </span>
                <span className="font-mono text-sm">{powerStats.max !== null ? `${powerStats.max.toFixed(1)}W` : '—'}</span>
              </div>
              <div className="flex justify-between items-center border-t border-border/50 pt-2">
                <span className="text-xs text-muted-foreground">Avg</span>
                <span className="font-mono text-sm font-bold text-orange-400">{powerStats.avg !== null ? `${powerStats.avg.toFixed(1)}W` : '—'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Realtime Sensor Charts */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Sensor Trends (Realtime)
        </h2>
        <SensorCharts />
      </div>

      {/* Devices to Adopt Section */}
      {pendingDevices.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-warning" />
            Devices to Adopt ({pendingDevices.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingDevices.slice(0, 6).map((device: Client) => (
              <div key={device.client_id} className="glass-card rounded-xl p-4 border border-warning/30 bg-warning/5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center">
                      <Server className="w-5 h-5 text-warning" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">{device.hostname || device.client_id.slice(0, 8)}</h3>
                      <p className="text-xs text-muted-foreground">{device.ip_address}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-warning/20 text-warning border-warning/30 text-xs">
                    Pending
                  </Badge>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last seen:</span>
                    <span>{formatLastSeen(device.last_seen)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Batches:</span>
                    <span>{device.batches_received}</span>
                  </div>
                  {device.sensors && device.sensors.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sensors:</span>
                      <span>{device.sensors.length} detected</span>
                    </div>
                  )}
                </div>
                <Button size="sm" className="w-full mt-3 gap-2 bg-warning/20 text-warning hover:bg-warning/30 border border-warning/30">
                  <CheckCircle className="w-4 h-4" />
                  Adopt Device
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Connected Devices */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Cpu className="w-5 h-5 text-primary" />
          Connected Devices ({adoptedDevices.length})
        </h2>
        {clientsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : adoptedDevices.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {adoptedDevices.slice(0, 6).map((client: Client) => {
              const status = getDeviceStatusFromLastSeen(client.last_seen);
              const system = client.metadata?.system;
              
              return (
                <div key={client.client_id} className="glass-card rounded-xl p-4 border border-border/50">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                        <Server className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm">{client.hostname || client.client_id.slice(0, 8)}</h3>
                        <p className="text-xs text-muted-foreground">{client.ip_address}</p>
                      </div>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${
                        status === 'online' 
                          ? 'bg-success/20 text-success border-success/30' 
                          : status === 'stale'
                          ? 'bg-warning/20 text-warning border-warning/30'
                          : 'bg-destructive/20 text-destructive border-destructive/30'
                      }`}
                    >
                      {status === 'online' ? <CheckCircle className="w-3 h-3 mr-1" /> : <AlertCircle className="w-3 h-3 mr-1" />}
                      {status}
                    </Badge>
                  </div>
                  
                  {/* Sensors */}
                  {client.sensors && client.sensors.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {client.sensors.slice(0, 5).map((sensorId) => (
                        <Badge key={sensorId} variant="outline" className="text-[10px] px-1.5 py-0">
                          {sensorId.includes('adsb') && <Plane className="w-2.5 h-2.5 mr-1" />}
                          {sensorId.includes('gps') && <Navigation className="w-2.5 h-2.5 mr-1" />}
                          {sensorId.includes('starlink') && <Satellite className="w-2.5 h-2.5 mr-1" />}
                          {sensorId.includes('lora') && <Radio className="w-2.5 h-2.5 mr-1" />}
                          {sensorId.includes('wifi') && <Wifi className="w-2.5 h-2.5 mr-1" />}
                          {sensorId.replace(/_/g, ' ').replace(/\d+$/, '').trim().slice(0, 10)}
                        </Badge>
                      ))}
                      {client.sensors.length > 5 && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          +{client.sensors.length - 5} more
                        </Badge>
                      )}
                    </div>
                  )}

                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Batches:</span>
                      <span>{client.batches_received.toLocaleString()}</span>
                    </div>
                    {system?.cpu_percent !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">CPU:</span>
                        <span>{system.cpu_percent.toFixed(1)}%</span>
                      </div>
                    )}
                    {system?.memory_percent !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Memory:</span>
                        <span>{system.memory_percent.toFixed(1)}%</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last seen:</span>
                      <span>{formatLastSeen(client.last_seen)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="glass-card rounded-xl p-8 text-center border border-border/50">
            <Server className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-muted-foreground">No adopted devices yet</p>
          </div>
        )}
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
                {formatDate(global?.time_ranges?.earliest_reading)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Latest Reading:</span>
              <span className="font-medium text-xs">
                {formatDateTime(global?.time_ranges?.latest_reading)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Active Alerts:</span>
              <span className="font-medium">{activeAlerts}</span>
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
            Recent Alerts ({alerts.length})
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
