import { useMemo } from "react";
import { 
  Satellite, 
  Cpu, 
  Thermometer, 
  Wifi, 
  Bluetooth, 
  Plane, 
  Ship,
  Radio,
  Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { SensorGroup } from "./types";
import { getSensorColor, formatSensorType } from "./utils";

interface MeasurementsSectionProps {
  sensors: SensorGroup[];
}

interface CategoryConfig {
  title: string;
  icon: React.ElementType;
  types: string[];
  color: string;
}

const CATEGORIES: CategoryConfig[] = [
  {
    title: "Starlink",
    icon: Satellite,
    types: ["starlink"],
    color: "text-violet-400",
  },
  {
    title: "Arduino / Probe",
    icon: Cpu,
    types: ["arduino", "thermal_probe", "thermal", "temperature", "probe", "sensor", "arduino_sensor_kit"],
    color: "text-orange-400",
  },
  {
    title: "BLE / WiFi",
    icon: Wifi,
    types: ["wifi", "bluetooth", "ble", "wireless", "wifi_scanner", "bluetooth_scanner"],
    color: "text-blue-400",
  },
  {
    title: "ADSB / AIS",
    icon: Plane,
    types: ["adsb", "ais", "maritime", "aircraft", "vessel"],
    color: "text-cyan-400",
  },
];

function getCategoryIcon(type: string): React.ElementType {
  const lower = type.toLowerCase();
  if (lower.includes('starlink')) return Satellite;
  if (lower.includes('arduino') || lower.includes('probe') || lower.includes('thermal')) return Thermometer;
  if (lower.includes('wifi')) return Wifi;
  if (lower.includes('bluetooth') || lower.includes('ble')) return Bluetooth;
  if (lower.includes('adsb') || lower.includes('aircraft')) return Plane;
  if (lower.includes('ais') || lower.includes('maritime') || lower.includes('vessel')) return Ship;
  if (lower.includes('lora') || lower.includes('radio')) return Radio;
  return Activity;
}

function formatMeasurementValue(value: string | number | boolean, unit?: string): string {
  const strValue = String(value);
  if (!unit) return strValue;
  return `${strValue} ${unit}`;
}

function formatKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

export function MeasurementsSection({ sensors }: MeasurementsSectionProps) {
  // Group sensors by category
  const categorizedSensors = useMemo(() => {
    const result: Record<string, SensorGroup[]> = {};
    
    CATEGORIES.forEach(cat => {
      result[cat.title] = sensors.filter(s => 
        cat.types.some(t => s.sensor_type.toLowerCase().includes(t))
      );
    });
    
    // Add "Other" category for unmatched sensors
    const matchedSensorKeys = new Set(
      Object.values(result).flat().map(s => `${s.client_id}:${s.sensor_type}`)
    );
    const otherSensors = sensors.filter(s => !matchedSensorKeys.has(`${s.client_id}:${s.sensor_type}`));
    if (otherSensors.length > 0) {
      result["Other"] = otherSensors;
    }
    
    return result;
  }, [sensors]);

  const hasAnyData = Object.values(categorizedSensors).some(arr => arr.length > 0);

  if (!hasAnyData) {
    return (
      <Card className="glass-card border-border/50">
        <CardContent className="p-8 text-center">
          <Activity className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">No measurements available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {CATEGORIES.map(category => {
        const categorySensors = categorizedSensors[category.title] || [];
        const Icon = category.icon;
        
        return (
          <Card key={category.title} className="glass-card border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${category.color}`} />
                  <span>{category.title}</span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {categorySensors.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              {categorySensors.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-xs">
                  No sensors
                </div>
              ) : (
                <ScrollArea className="h-[280px]">
                  <div className="space-y-3 pr-2">
                    {categorySensors.map(sensor => (
                      <SensorMeasurementItem key={`${sensor.client_id}:${sensor.sensor_type}`} sensor={sensor} />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function SensorMeasurementItem({ sensor }: { sensor: SensorGroup }) {
  const Icon = getCategoryIcon(sensor.sensor_type);
  const colorClass = getSensorColor(sensor.sensor_type);
  
  return (
    <div className="p-2 rounded-lg bg-muted/20 border border-border/30">
      <div className="flex items-center gap-2 mb-2">
        <div className={`p-1.5 rounded ${colorClass}`}>
          <Icon className="w-3 h-3" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate">{formatSensorType(sensor.sensor_type)}</p>
          <p className="text-[10px] text-muted-foreground">
            {sensor.client_id}
          </p>
        </div>
        <Badge variant="outline" className="text-[9px] px-1.5 py-0">
          {sensor.readings.length}
        </Badge>
      </div>
      
      {sensor.measurements.length > 0 ? (
        <div className="grid grid-cols-2 gap-1.5">
          {sensor.measurements.slice(0, 6).map(({ key, value, unit }) => (
            <div key={key} className="text-[10px] bg-background/50 rounded px-1.5 py-1">
              <span className="text-muted-foreground truncate block">
                {formatKey(key)}
              </span>
              <span className="font-mono font-medium">
                {formatMeasurementValue(value, unit)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[10px] text-muted-foreground">No measurements</p>
      )}
    </div>
  );
}
