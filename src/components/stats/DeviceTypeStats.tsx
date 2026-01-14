import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { getDeviceIcon, getDeviceColor } from "./utils";
import type { DeviceGroup } from "./types";

interface DeviceTypeStatsProps {
  devices: DeviceGroup[];
}

export function DeviceTypeStats({ devices }: DeviceTypeStatsProps) {
  const deviceTypeStats = useMemo(() => {
    const stats = new Map<string, { count: number; icon: React.ElementType; color: string }>();
    
    devices.forEach(d => {
      const type = d.device_type;
      if (!stats.has(type)) {
        stats.set(type, { 
          count: 0, 
          icon: getDeviceIcon(type),
          color: getDeviceColor(type)
        });
      }
      stats.get(type)!.count++;
    });
    
    return Array.from(stats.entries());
  }, [devices]);

  if (deviceTypeStats.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {deviceTypeStats.map(([type, { count, icon: Icon, color }]) => (
        <Card key={type} className="glass-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-xs text-muted-foreground capitalize">{type.replace(/_/g, ' ')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
