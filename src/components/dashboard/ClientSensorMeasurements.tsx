import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Cpu, Wifi, Radio, Plane, Navigation, Thermometer, Bluetooth, Monitor, Satellite, Activity, Zap, Droplets, Signal, Clock } from "lucide-react";
import { useClientSensorData, useClient, useClientSystemInfo } from "@/hooks/aurora";
import { formatDistanceToNow } from "date-fns";

interface ClientSensorMeasurementsProps {
  clientId?: string | null;
}

// Sensor type icons and colors
const SENSOR_CONFIG: Record<string, { icon: React.ElementType; color: string; bgColor: string }> = {
  starlink: { icon: Satellite, color: 'text-violet-400', bgColor: 'bg-violet-500/20' },
  system_monitor: { icon: Monitor, color: 'text-slate-400', bgColor: 'bg-slate-500/20' },
  wifi_scanner: { icon: Wifi, color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  bluetooth_scanner: { icon: Bluetooth, color: 'text-indigo-400', bgColor: 'bg-indigo-500/20' },
  adsb_detector: { icon: Plane, color: 'text-cyan-400', bgColor: 'bg-cyan-500/20' },
  gps: { icon: Navigation, color: 'text-green-400', bgColor: 'bg-green-500/20' },
  thermal_probe: { icon: Thermometer, color: 'text-amber-400', bgColor: 'bg-amber-500/20' },
  arduino: { icon: Cpu, color: 'text-orange-400', bgColor: 'bg-orange-500/20' },
  lora: { icon: Radio, color: 'text-red-400', bgColor: 'bg-red-500/20' },
  aht_sensor: { icon: Droplets, color: 'text-teal-400', bgColor: 'bg-teal-500/20' },
  bmt_sensor: { icon: Thermometer, color: 'text-pink-400', bgColor: 'bg-pink-500/20' },
  power: { icon: Zap, color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' },
  default: { icon: Activity, color: 'text-primary', bgColor: 'bg-primary/20' },
};

const getSensorConfig = (sensorType: string) => {
  const type = sensorType.toLowerCase();
  for (const [key, config] of Object.entries(SENSOR_CONFIG)) {
    if (key === 'default') continue;
    if (type.includes(key.replace('_', ''))) return config;
    if (type.includes(key)) return config;
  }
  return SENSOR_CONFIG.default;
};

// Helper to extract key measurements from sensor data
const extractMeasurements = (sensorType: string, data: Record<string, unknown>): Array<{ label: string; value: string; icon?: React.ElementType }> => {
  const measurements: Array<{ label: string; value: string; icon?: React.ElementType }> = [];
  const type = sensorType.toLowerCase();

  // Flatten nested data
  const flatData: Record<string, unknown> = {};
  const flatten = (obj: Record<string, unknown>, prefix = '') => {
    for (const [key, val] of Object.entries(obj)) {
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        flatten(val as Record<string, unknown>, prefix ? `${prefix}_${key}` : key);
      } else {
        flatData[prefix ? `${prefix}_${key}` : key] = val;
      }
    }
  };
  flatten(data);

  // Extract based on sensor type
  if (type.includes('starlink')) {
    if (typeof flatData.downlink_throughput_bps === 'number') {
      measurements.push({ label: 'Downlink', value: `${(flatData.downlink_throughput_bps as number / 1e6).toFixed(1)} Mbps`, icon: Signal });
    }
    if (typeof flatData.uplink_throughput_bps === 'number') {
      measurements.push({ label: 'Uplink', value: `${(flatData.uplink_throughput_bps as number / 1e6).toFixed(1)} Mbps`, icon: Signal });
    }
    if (typeof flatData.pop_ping_latency_ms === 'number') {
      measurements.push({ label: 'Latency', value: `${(flatData.pop_ping_latency_ms as number).toFixed(1)} ms`, icon: Clock });
    }
    if (typeof flatData.power_watts === 'number') {
      measurements.push({ label: 'Power', value: `${(flatData.power_watts as number).toFixed(1)} W`, icon: Zap });
    }
  } else if (type.includes('thermal') || type.includes('temp')) {
    if (typeof flatData.temp_c === 'number') {
      measurements.push({ label: 'Temperature', value: `${(flatData.temp_c as number).toFixed(1)}°C`, icon: Thermometer });
    }
    if (typeof flatData.probe_c === 'number') {
      measurements.push({ label: 'Probe', value: `${(flatData.probe_c as number).toFixed(1)}°C`, icon: Thermometer });
    }
    if (typeof flatData.ambient_c === 'number') {
      measurements.push({ label: 'Ambient', value: `${(flatData.ambient_c as number).toFixed(1)}°C`, icon: Thermometer });
    }
  } else if (type.includes('aht') || type.includes('humidity')) {
    if (typeof flatData.aht_temp_c === 'number') {
      measurements.push({ label: 'Temperature', value: `${(flatData.aht_temp_c as number).toFixed(1)}°C`, icon: Thermometer });
    }
    if (typeof flatData.aht_humidity === 'number') {
      measurements.push({ label: 'Humidity', value: `${(flatData.aht_humidity as number).toFixed(1)}%`, icon: Droplets });
    }
  } else if (type.includes('arduino')) {
    if (typeof flatData.bmp_temp_c === 'number') {
      measurements.push({ label: 'BMP Temp', value: `${(flatData.bmp_temp_c as number).toFixed(1)}°C`, icon: Thermometer });
    }
    if (typeof flatData.bmp_pressure === 'number') {
      measurements.push({ label: 'Pressure', value: `${(flatData.bmp_pressure as number).toFixed(0)} hPa` });
    }
  } else if (type.includes('system') || type.includes('monitor')) {
    if (typeof flatData.cpu_percent === 'number') {
      measurements.push({ label: 'CPU', value: `${(flatData.cpu_percent as number).toFixed(1)}%`, icon: Cpu });
    }
    if (typeof flatData.memory_percent === 'number') {
      measurements.push({ label: 'Memory', value: `${(flatData.memory_percent as number).toFixed(1)}%` });
    }
    if (typeof flatData.disk_percent === 'number') {
      measurements.push({ label: 'Disk', value: `${(flatData.disk_percent as number).toFixed(1)}%` });
    }
  } else if (type.includes('gps')) {
    if (typeof flatData.latitude === 'number') {
      measurements.push({ label: 'Lat', value: `${(flatData.latitude as number).toFixed(6)}°`, icon: Navigation });
    }
    if (typeof flatData.longitude === 'number') {
      measurements.push({ label: 'Lng', value: `${(flatData.longitude as number).toFixed(6)}°` });
    }
    if (typeof flatData.altitude === 'number') {
      measurements.push({ label: 'Alt', value: `${(flatData.altitude as number).toFixed(0)} m` });
    }
  } else if (type.includes('wifi')) {
    if (typeof flatData.networks_count === 'number') {
      measurements.push({ label: 'Networks', value: String(flatData.networks_count), icon: Wifi });
    }
    if (typeof flatData.active_count === 'number') {
      measurements.push({ label: 'Active', value: String(flatData.active_count) });
    }
  } else if (type.includes('bluetooth')) {
    if (typeof flatData.devices_count === 'number') {
      measurements.push({ label: 'Devices', value: String(flatData.devices_count), icon: Bluetooth });
    }
  } else if (type.includes('power')) {
    if (typeof flatData.power_w === 'number') {
      measurements.push({ label: 'Power', value: `${(flatData.power_w as number).toFixed(1)} W`, icon: Zap });
    }
    if (typeof flatData.voltage_v === 'number') {
      measurements.push({ label: 'Voltage', value: `${(flatData.voltage_v as number).toFixed(2)} V` });
    }
  }

  // If no specific measurements found, show generic numeric values
  if (measurements.length === 0) {
    for (const [key, val] of Object.entries(flatData)) {
      if (typeof val === 'number' && !key.includes('timestamp') && measurements.length < 4) {
        const label = key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim();
        measurements.push({ label: label.charAt(0).toUpperCase() + label.slice(1), value: val.toFixed(2) });
      }
    }
  }

  return measurements.slice(0, 4);
};

export default function ClientSensorMeasurements({ clientId }: ClientSensorMeasurementsProps) {
  const effectiveClientId = clientId && clientId !== "all" ? clientId : undefined;
  
  const { data: clientData } = useClient(effectiveClientId || '');
  const { data: systemInfo } = useClientSystemInfo(effectiveClientId || '');
  const { data: sensorData, isLoading } = useClientSensorData(effectiveClientId || '');

  // Group readings by sensor type
  const sensorGroups = useMemo(() => {
    if (!sensorData?.readings || sensorData.readings.length === 0) return [];

    const groups = new Map<string, { sensorType: string; readings: Array<{ timestamp: string; data: Record<string, unknown> }>; latest: { timestamp: string; data: Record<string, unknown> } }>();

    sensorData.readings.forEach((reading: { sensor_type?: string; device_type?: string; timestamp: string; data?: Record<string, unknown> }) => {
      const sensorType = reading.sensor_type || reading.device_type || 'unknown';
      
      if (!groups.has(sensorType)) {
        groups.set(sensorType, {
          sensorType,
          readings: [],
          latest: { timestamp: reading.timestamp, data: reading.data || {} },
        });
      }
      
      const group = groups.get(sensorType)!;
      group.readings.push({ timestamp: reading.timestamp, data: reading.data || {} });
      
      // Update latest if this is newer
      if (new Date(reading.timestamp) > new Date(group.latest.timestamp)) {
        group.latest = { timestamp: reading.timestamp, data: reading.data || {} };
      }
    });

    return Array.from(groups.values()).sort((a, b) => 
      new Date(b.latest.timestamp).getTime() - new Date(a.latest.timestamp).getTime()
    );
  }, [sensorData?.readings]);

  // Don't render if no client selected
  if (!effectiveClientId) return null;

  const clientName = clientData?.hostname || systemInfo?.hostname || effectiveClientId;

  return (
    <Card className="glass-card border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Cpu className="w-4 h-4 text-primary" />
            Sensors & Measurements: {clientName}
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {sensorGroups.length} sensor type{sensorGroups.length !== 1 ? 's' : ''}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : sensorGroups.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>No sensor data available for this client</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sensorGroups.map((group) => {
              const config = getSensorConfig(group.sensorType);
              const Icon = config.icon;
              const measurements = extractMeasurements(group.sensorType, group.latest.data);
              
              return (
                <div 
                  key={group.sensorType}
                  className="p-4 rounded-lg border border-border/50 bg-card/50 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-lg ${config.bgColor} flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${config.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate capitalize">
                        {group.sensorType.replace(/_/g, ' ')}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(group.latest.timestamp), { addSuffix: true })}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">
                      {group.readings.length} readings
                    </Badge>
                  </div>
                  
                  {measurements.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {measurements.map((m, idx) => {
                        const MIcon = m.icon;
                        return (
                          <div key={idx} className="p-2 rounded bg-muted/30">
                            <div className="flex items-center gap-1 mb-0.5">
                              {MIcon && <MIcon className="w-3 h-3 text-muted-foreground" />}
                              <span className="text-[10px] text-muted-foreground truncate">{m.label}</span>
                            </div>
                            <p className="font-mono text-sm font-semibold truncate">{m.value}</p>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground text-center py-2">
                      No measurements available
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
