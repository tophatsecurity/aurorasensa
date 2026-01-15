import { Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { getSensorIcon, getSensorColor, formatSensorType } from "./utils";
import type { SensorGroup } from "./types";

interface SensorListCardProps {
  sensors: SensorGroup[];
  onSensorSelect: (sensor: SensorGroup) => void;
}

export function SensorListCard({ sensors, onSensorSelect }: SensorListCardProps) {
  return (
    <Card className="glass-card border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Activity className="w-4 h-4" />
          Active Sensors ({sensors.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-80">
          <div className="space-y-2">
            {sensors.map(sensor => {
              const Icon = getSensorIcon(sensor.sensor_type);
              return (
                <div 
                  key={`${sensor.client_id}:${sensor.sensor_type}`}
                  className="p-3 rounded-lg border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer"
                  onClick={() => onSensorSelect(sensor)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded ${getSensorColor(sensor.sensor_type)}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{formatSensorType(sensor.sensor_type)}</p>
                        <p className="text-xs text-muted-foreground">
                          {sensor.readings.length} readings
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="text-xs">
                        {sensor.client_id}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(sensor.latest.timestamp), 'HH:mm:ss')}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// Legacy export for backward compatibility
export { SensorListCard as DeviceListCard };
