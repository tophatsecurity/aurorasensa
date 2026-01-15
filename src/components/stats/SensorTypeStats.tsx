import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { getSensorIcon, getSensorColor, formatSensorType } from "./utils";
import type { SensorGroup } from "./types";

interface SensorTypeStatsProps {
  sensors: SensorGroup[];
}

export function SensorTypeStats({ sensors }: SensorTypeStatsProps) {
  const sensorTypeStats = useMemo(() => {
    const stats = new Map<string, { count: number; readings: number; icon: React.ElementType; color: string }>();
    
    sensors.forEach(s => {
      const type = s.sensor_type;
      if (!stats.has(type)) {
        stats.set(type, { 
          count: 0,
          readings: 0,
          icon: getSensorIcon(type),
          color: getSensorColor(type)
        });
      }
      const stat = stats.get(type)!;
      stat.count++;
      stat.readings += s.readings.length;
    });
    
    return Array.from(stats.entries());
  }, [sensors]);

  if (sensorTypeStats.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {sensorTypeStats.map(([type, { count, readings, icon: Icon, color }]) => (
        <Card key={type} className="glass-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-xs text-muted-foreground">{formatSensorType(type)}</p>
                <p className="text-[10px] text-muted-foreground/70">{readings} readings</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Legacy export for backward compatibility
export { SensorTypeStats as DeviceTypeStats };
