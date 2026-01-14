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
import type { DeviceGroup } from "./types";
import { extractMeasurements, getDeviceColor } from "./utils";

interface MeasurementsSectionProps {
  devices: DeviceGroup[];
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
    types: ["arduino", "thermal_probe", "thermal", "temperature", "probe", "sensor"],
    color: "text-orange-400",
  },
  {
    title: "BLE / WiFi",
    icon: Wifi,
    types: ["wifi", "bluetooth", "ble", "wireless"],
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

function formatMeasurementValue(value: string, unit: string): string {
  if (!unit) return value;
  return `${value} ${unit}`;
}

function formatKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

export function MeasurementsSection({ devices }: MeasurementsSectionProps) {
  // Group devices by category
  const categorizedDevices = useMemo(() => {
    const result: Record<string, DeviceGroup[]> = {};
    
    CATEGORIES.forEach(cat => {
      result[cat.title] = devices.filter(d => 
        cat.types.some(t => d.device_type.toLowerCase().includes(t))
      );
    });
    
    // Add "Other" category for unmatched devices
    const matchedDeviceIds = new Set(
      Object.values(result).flat().map(d => d.device_id)
    );
    const otherDevices = devices.filter(d => !matchedDeviceIds.has(d.device_id));
    if (otherDevices.length > 0) {
      result["Other"] = otherDevices;
    }
    
    return result;
  }, [devices]);

  const hasAnyData = Object.values(categorizedDevices).some(arr => arr.length > 0);

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
        const categoryDevices = categorizedDevices[category.title] || [];
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
                  {categoryDevices.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              {categoryDevices.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-xs">
                  No devices
                </div>
              ) : (
                <ScrollArea className="h-[280px]">
                  <div className="space-y-3 pr-2">
                    {categoryDevices.map(device => (
                      <DeviceMeasurementItem key={device.device_id} device={device} />
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

function DeviceMeasurementItem({ device }: { device: DeviceGroup }) {
  const Icon = getCategoryIcon(device.device_type);
  const measurements = extractMeasurements(device.latest);
  const colorClass = getDeviceColor(device.device_type);
  
  return (
    <div className="p-2 rounded-lg bg-muted/20 border border-border/30">
      <div className="flex items-center gap-2 mb-2">
        <div className={`p-1.5 rounded ${colorClass}`}>
          <Icon className="w-3 h-3" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate">{device.device_id}</p>
          <p className="text-[10px] text-muted-foreground capitalize">
            {device.device_type.replace(/_/g, ' ')}
          </p>
        </div>
        <Badge variant="outline" className="text-[9px] px-1.5 py-0">
          {device.readings.length}
        </Badge>
      </div>
      
      {measurements.length > 0 ? (
        <div className="grid grid-cols-2 gap-1.5">
          {measurements.slice(0, 6).map(({ key, value, unit }) => (
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
