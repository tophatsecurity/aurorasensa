import { useMemo } from "react";
import { 
  Cpu, 
  Wifi, 
  Radio, 
  Plane, 
  Navigation, 
  Thermometer, 
  Bluetooth, 
  Monitor,
  Satellite,
  Activity,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface SensorReading {
  device_id: string;
  device_type: string;
  timestamp: string;
  data: Record<string, unknown>;
}

interface ClientSensorTabProps {
  sensorType: string;
  readings: SensorReading[];
  isLoading?: boolean;
}

const getSensorIcon = (sensorType: string) => {
  const iconClass = "w-5 h-5";
  switch (sensorType) {
    case 'arduino': return <Cpu className={iconClass} />;
    case 'lora': return <Radio className={iconClass} />;
    case 'starlink': return <Satellite className={iconClass} />;
    case 'wifi': return <Wifi className={iconClass} />;
    case 'bluetooth': return <Bluetooth className={iconClass} />;
    case 'adsb': return <Plane className={iconClass} />;
    case 'gps': return <Navigation className={iconClass} />;
    case 'thermal': case 'thermal_probe': return <Thermometer className={iconClass} />;
    case 'system_monitor': case 'system': return <Monitor className={iconClass} />;
    default: return <Cpu className={iconClass} />;
  }
};

const getSensorColor = (sensorType: string) => {
  switch (sensorType) {
    case 'arduino': return '#f97316';
    case 'lora': return '#ef4444';
    case 'starlink': return '#8b5cf6';
    case 'wifi': return '#3b82f6';
    case 'bluetooth': return '#6366f1';
    case 'adsb': return '#06b6d4';
    case 'gps': return '#22c55e';
    case 'thermal': case 'thermal_probe': return '#f59e0b';
    case 'system_monitor': case 'system': return '#64748b';
    default: return '#8b5cf6';
  }
};

const formatValue = (key: string, value: unknown): string => {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') {
    if (key.includes('temp')) return `${value.toFixed(1)}°`;
    if (key.includes('humidity')) return `${value.toFixed(1)}%`;
    if (key.includes('power') || key.includes('watt')) return `${value.toFixed(1)}W`;
    if (key.includes('voltage')) return `${value.toFixed(2)}V`;
    if (key.includes('current')) return `${value.toFixed(2)}A`;
    if (key.includes('signal') || key.includes('rssi')) return `${value.toFixed(1)} dBm`;
    if (key.includes('percent') || key.includes('cpu') || key.includes('memory') || key.includes('disk')) return `${value.toFixed(1)}%`;
    if (key.includes('speed') || key.includes('throughput')) return `${(value / 1000000).toFixed(2)} Mbps`;
    if (key.includes('latency')) return `${value.toFixed(1)} ms`;
    if (key.includes('altitude') || key.includes('alt')) return `${value.toFixed(0)} ft`;
    return value.toFixed(2);
  }
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const formatLabel = (key: string): string => {
  return key
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
};

const CHART_COLORS = ['#8b5cf6', '#f97316', '#22c55e', '#3b82f6', '#ef4444'];

export function ClientSensorTab({ sensorType, readings, isLoading }: ClientSensorTabProps) {
  const color = getSensorColor(sensorType);
  
  // Get latest reading
  const latestReading = readings[0];
  
  // Extract numeric keys for charting
  const { chartData, numericKeys } = useMemo(() => {
    if (!readings.length) return { chartData: [], numericKeys: [] };
    
    // Find numeric keys from first reading
    const sample = readings[0]?.data || {};
    const keys = Object.entries(sample)
      .filter(([k, v]) => typeof v === 'number' && !k.includes('timestamp') && !k.includes('_id'))
      .map(([k]) => k)
      .slice(0, 5);
    
    // Transform readings for chart
    const data = [...readings]
      .reverse()
      .slice(-50) // Last 50 readings
      .map((r) => {
        const entry: Record<string, unknown> = {
          time: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        keys.forEach((k) => {
          let val = r.data[k];
          // Normalize speed/throughput to Mbps
          if (typeof val === 'number' && (k.includes('speed') || k.includes('throughput'))) {
            val = val / 1000000;
          }
          entry[k] = val;
        });
        return entry;
      });
    
    return { chartData: data, numericKeys: keys };
  }, [readings]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading sensor data...</span>
      </div>
    );
  }

  if (!readings.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No readings found for this sensor type</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div 
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${color}20` }}
        >
          <span style={{ color }}>{getSensorIcon(sensorType)}</span>
        </div>
        <div>
          <h3 className="font-semibold capitalize">{sensorType.replace(/_/g, ' ')} Sensor</h3>
          <p className="text-xs text-muted-foreground">
            {readings.length} readings • Last: {new Date(latestReading.timestamp).toLocaleString()}
          </p>
        </div>
        <Badge variant="outline" className="ml-auto bg-success/20 text-success border-success/30">
          <Activity className="w-3 h-3 mr-1" />
          Active
        </Badge>
      </div>

      {/* Latest Values Grid */}
      <Card className="p-4">
        <h4 className="text-sm font-medium text-muted-foreground mb-3">Latest Values</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(latestReading.data || {})
            .filter(([k, v]) => v !== null && v !== undefined && !k.includes('_id'))
            .slice(0, 12)
            .map(([key, value]) => (
              <div key={key} className="p-2 rounded-lg bg-muted/30 border border-border/30">
                <p className="text-xs text-muted-foreground truncate">{formatLabel(key)}</p>
                <p className="font-mono text-sm font-medium truncate">{formatValue(key, value)}</p>
              </div>
            ))}
        </div>
      </Card>

      {/* Chart */}
      {chartData.length > 1 && numericKeys.length > 0 && (
        <Card className="p-4">
          <h4 className="text-sm font-medium text-muted-foreground mb-3">Trend (Last {chartData.length} readings)</h4>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis 
                  dataKey="time" 
                  tick={{ fontSize: 10 }} 
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis 
                  tick={{ fontSize: 10 }} 
                  stroke="hsl(var(--muted-foreground))"
                  width={50}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                {numericKeys.map((key, idx) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    name={formatLabel(key)}
                    stroke={CHART_COLORS[idx % CHART_COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* All Readings Table */}
      <Card className="p-4">
        <h4 className="text-sm font-medium text-muted-foreground mb-3">Recent Readings</h4>
        <div className="overflow-auto max-h-[300px]">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-card">
              <tr className="border-b border-border">
                <th className="text-left py-2 px-2 font-medium text-muted-foreground">Timestamp</th>
                <th className="text-left py-2 px-2 font-medium text-muted-foreground">Device</th>
                {Object.keys(latestReading.data || {})
                  .filter(k => !k.includes('_id'))
                  .slice(0, 4)
                  .map(k => (
                    <th key={k} className="text-left py-2 px-2 font-medium text-muted-foreground">
                      {formatLabel(k)}
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {readings.slice(0, 20).map((reading, idx) => (
                <tr key={idx} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="py-2 px-2 font-mono">{new Date(reading.timestamp).toLocaleString()}</td>
                  <td className="py-2 px-2">{reading.device_id}</td>
                  {Object.entries(reading.data || {})
                    .filter(([k]) => !k.includes('_id'))
                    .slice(0, 4)
                    .map(([k, v]) => (
                      <td key={k} className="py-2 px-2 font-mono">{formatValue(k, v)}</td>
                    ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
