import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from "recharts";
import { Radio, Loader2, Database, Activity, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useStatsBySensor, useGlobalStats } from "@/hooks/aurora";

interface SensorTypeStatsSectionProps {
  periodHours?: number;
}

const SENSOR_COLORS: Record<string, string> = {
  arduino_sensor_kit: '#f97316',
  arduino: '#f97316',
  arduino_1: '#f97316',
  thermal_probe: '#f59e0b',
  thermal_probe_1: '#f59e0b',
  wifi_scanner: '#3b82f6',
  wifi_scanner_1: '#3b82f6',
  bluetooth_scanner: '#6366f1',
  bluetooth_scanner_1: '#6366f1',
  adsb_detector: '#06b6d4',
  adsb_rtlsdr_1: '#06b6d4',
  lora_detector: '#ef4444',
  starlink_dish_comprehensive: '#8b5cf6',
  starlink_dish: '#a78bfa',
  starlink_dish_1: '#a78bfa',
  system_monitor: '#64748b',
  system_monitor_1: '#64748b',
  aht_sensor: '#ec4899',
  bmt_sensor: '#14b8a6',
  power_monitor: '#10b981',
  gps_tracker: '#0ea5e9',
  maritime_ais: '#84cc16',
  default: '#a855f7',
};

const getSensorColor = (sensorType: string): string => {
  // Normalize the sensor type for matching
  const normalized = sensorType.toLowerCase().replace(/_\d+$/, '');
  return SENSOR_COLORS[sensorType] || SENSOR_COLORS[normalized] || SENSOR_COLORS.default;
};

const formatSensorName = (sensorType: string): string => {
  // Remove trailing _1, _2 etc for display
  const cleaned = sensorType.replace(/_\d+$/, '');
  return cleaned.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};

const formatNumber = (num: number | undefined | null): string => {
  if (num === undefined || num === null) return '0';
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

const SensorTypeStatsSection = ({ periodHours = 24 }: SensorTypeStatsSectionProps) => {
  const { data: sensorStats, isLoading: sensorStatsLoading } = useStatsBySensor({ hours: periodHours });
  const { data: globalStats, isLoading: globalStatsLoading } = useGlobalStats();

  const isLoading = sensorStatsLoading && globalStatsLoading;

  // Build chart data from primary endpoint or fallback to global stats device_breakdown
  const chartData = useMemo(() => {
    // Primary: use by-sensor endpoint
    if (sensorStats?.sensors && sensorStats.sensors.length > 0) {
      return sensorStats.sensors
        .sort((a, b) => b.reading_count - a.reading_count)
        .slice(0, 10)
        .map(sensor => ({
          name: formatSensorName(sensor.sensor_type),
          rawName: sensor.sensor_type,
          readings: sensor.reading_count,
          devices: sensor.device_count,
          clients: sensor.client_count,
          color: getSensorColor(sensor.sensor_type),
        }));
    }
    
    // Fallback: use global stats device_breakdown
    const deviceBreakdown = globalStats?.device_breakdown;
    if (deviceBreakdown && deviceBreakdown.length > 0) {
      return deviceBreakdown
        .sort((a, b) => (b.count || 0) - (a.count || 0))
        .slice(0, 10)
        .map(device => ({
          name: formatSensorName(device.device_type),
          rawName: device.device_type,
          readings: device.count || 0,
          devices: 1, // Each device_type entry is one device
          clients: 1, // From context we know there's 1 client
          color: getSensorColor(device.device_type),
        }));
    }
    
    return [];
  }, [sensorStats?.sensors, globalStats?.device_breakdown]);

  const pieData = useMemo(() => {
    if (chartData.length === 0) return [];
    const totalReadings = chartData.reduce((sum, s) => sum + s.readings, 0);
    return chartData
      .slice(0, 8)
      .map(sensor => ({
        name: sensor.name,
        value: sensor.readings,
        percent: totalReadings > 0 ? ((sensor.readings / totalReadings) * 100).toFixed(1) : '0',
        color: sensor.color,
      }));
  }, [chartData]);

  const totalStats = useMemo(() => {
    if (chartData.length === 0) return { readings: 0, devices: 0, clients: 0 };
    return chartData.reduce((acc, s) => ({
      readings: acc.readings + s.readings,
      devices: acc.devices + s.devices,
      clients: Math.max(acc.clients, s.clients),
    }), { readings: 0, devices: 0, clients: 0 });
  }, [chartData]);

  if (isLoading) {
    return (
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Sensor Type Statistics
        </h2>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!chartData.length) {
    return (
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Sensor Type Statistics
        </h2>
        <div className="glass-card rounded-xl p-8 text-center border border-border/50">
          <Radio className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-muted-foreground">No sensor statistics available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-primary" />
        Sensor Type Statistics ({periodHours}h)
        <Badge variant="outline" className="ml-2 text-xs">
          {chartData.length} types
        </Badge>
      </h2>


      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart - Readings by Sensor Type */}
        <div className="glass-card rounded-xl p-4 border border-border/50">
          <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
            <Database className="w-4 h-4 text-muted-foreground" />
            Readings by Sensor Type
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={chartData} 
                layout="vertical"
                margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
              >
                <XAxis type="number" tickFormatter={(v) => formatNumber(v)} />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  tick={{ fontSize: 11 }}
                  width={75}
                />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const data = payload[0].payload;
                    return (
                      <div className="bg-popover/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-lg">
                        <p className="font-medium text-sm mb-1">{data.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Readings: <span className="font-medium text-foreground">{data.readings.toLocaleString()}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Devices: <span className="font-medium text-foreground">{data.devices}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Clients: <span className="font-medium text-foreground">{data.clients}</span>
                        </p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="readings" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart - Reading Distribution */}
        <div className="glass-card rounded-xl p-4 border border-border/50">
          <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
            <Radio className="w-4 h-4 text-muted-foreground" />
            Reading Distribution
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const data = payload[0].payload;
                    return (
                      <div className="bg-popover/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-lg">
                        <p className="font-medium text-sm mb-1">{data.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Readings: <span className="font-medium text-foreground">{data.value.toLocaleString()}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Share: <span className="font-medium text-foreground">{data.percent}%</span>
                        </p>
                      </div>
                    );
                  }}
                />
                <Legend 
                  formatter={(value) => <span className="text-xs">{value}</span>}
                  iconType="circle"
                  iconSize={8}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SensorTypeStatsSection;
