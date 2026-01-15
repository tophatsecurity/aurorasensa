import { useMemo } from "react";
import { Radio, Loader2, Activity, Database, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useStatsBySensor, useComprehensiveStats } from "@/hooks/aurora";

interface DashboardSensorSummaryProps {
  periodHours?: number;
}

const SENSOR_COLORS: Record<string, string> = {
  arduino_sensor_kit: '#f97316',
  thermal_probe: '#f59e0b',
  wifi_scanner: '#3b82f6',
  bluetooth_scanner: '#6366f1',
  adsb_detector: '#06b6d4',
  lora_detector: '#ef4444',
  starlink_dish_comprehensive: '#8b5cf6',
  system_monitor: '#64748b',
  aht_sensor: '#ec4899',
  bmt_sensor: '#14b8a6',
  power_monitor: '#10b981',
  gps_tracker: '#0ea5e9',
  maritime_ais: '#84cc16',
  default: '#a855f7',
};

const getSensorColor = (sensorType: string): string => {
  return SENSOR_COLORS[sensorType] || SENSOR_COLORS.default;
};

const formatNumber = (num: number | undefined | null): string => {
  if (num === undefined || num === null) return '—';
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

const formatSensorName = (sensorType: string): string => {
  return sensorType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};

const DashboardSensorSummary = ({ periodHours = 24 }: DashboardSensorSummaryProps) => {
  const { data: sensorStats, isLoading: sensorStatsLoading } = useStatsBySensor({ hours: periodHours });
  const { data: stats, isLoading: statsLoading } = useComprehensiveStats();

  const sensorsSummary = stats?.sensors_summary;

  // Merge new API data with legacy data for display
  const sensors = useMemo(() => {
    // Prefer new useStatsBySensor data
    if (sensorStats?.sensors && sensorStats.sensors.length > 0) {
      return sensorStats.sensors.map(s => ({
        device_type: s.sensor_type,
        reading_count: s.reading_count,
        device_count: s.device_count,
        client_count: s.client_count,
        first_seen: s.first_reading,
        last_seen: s.last_reading,
        active: true, // New API doesn't have active flag, assume active
      }));
    }
    
    // Fallback to legacy sensor summary
    return (sensorsSummary?.sensor_types || []).map(s => ({
      device_type: s.device_type,
      reading_count: s.total_readings,
      device_count: s.device_count,
      client_count: 1, // Legacy doesn't have client count
      first_seen: s.first_seen,
      last_seen: s.last_seen,
      active: s.active_last_hour,
    }));
  }, [sensorStats?.sensors, sensorsSummary?.sensor_types]);

  const isLoading = sensorStatsLoading || statsLoading;
  const totalSensorTypes = sensorStats?.total ?? sensorsSummary?.total_sensor_types ?? sensors.length;

  if (isLoading) {
    return (
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Radio className="w-5 h-5 text-primary" />
          Active Sensor Types
        </h2>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (sensors.length === 0) {
    return (
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Radio className="w-5 h-5 text-primary" />
          Active Sensor Types (0)
        </h2>
        <div className="glass-card rounded-xl p-8 text-center border border-border/50">
          <Radio className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-muted-foreground">No sensor data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Radio className="w-5 h-5 text-primary" />
        Active Sensor Types ({totalSensorTypes})
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {sensors.slice(0, 12).map((sensor) => {
          const color = getSensorColor(sensor.device_type);
          return (
            <div 
              key={sensor.device_type}
              className="glass-card rounded-lg p-4 border border-border/50 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-center gap-2 mb-3">
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${color}20` }}
                >
                  <Radio className="w-4 h-4" style={{ color }} />
                </div>
                {sensor.active && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-success/50 text-success">
                    Active
                  </Badge>
                )}
              </div>
              <h4 className="text-xs font-medium capitalize truncate" title={formatSensorName(sensor.device_type)}>
                {formatSensorName(sensor.device_type)}
              </h4>
              <div className="mt-2 space-y-1 text-xs">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Database className="w-3 h-3" />
                    Readings
                  </span>
                  <span className="font-medium" style={{ color }}>
                    {formatNumber(sensor.reading_count)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Activity className="w-3 h-3" />
                    Devices
                  </span>
                  <span className="font-medium">{sensor.device_count}</span>
                </div>
                {sensor.client_count > 1 && (
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Clients</span>
                    <span className="font-medium">{sensor.client_count}</span>
                  </div>
                )}
              </div>
              {sensor.last_seen && (
                <div className="mt-2 pt-2 border-t border-border/30 flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {new Date(sensor.last_seen).toLocaleTimeString()}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DashboardSensorSummary;
