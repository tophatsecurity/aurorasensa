import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { getSensorIcon, formatSensorType } from "./utils";
import type { SensorGroup } from "./types";

interface SensorMeasurementsCardProps {
  sensor: SensorGroup;
}

export function SensorMeasurementsCard({ sensor }: SensorMeasurementsCardProps) {
  const Icon = getSensorIcon(sensor.sensor_type);
  
  return (
    <Card className="glass-card border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Icon className="w-4 h-4" />
            {formatSensorType(sensor.sensor_type)}
          </CardTitle>
          <Badge variant="outline" className="text-xs">{sensor.client_id}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {sensor.measurements.slice(0, 6).map(({ key, value, unit }) => (
            <div key={key} className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</span>
              <span className="font-mono">{String(value)} {unit || ''}</span>
            </div>
          ))}
          {sensor.measurements.length === 0 && (
            <p className="text-muted-foreground text-sm text-center py-4">No measurements available</p>
          )}
        </div>
        <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
          <span>{sensor.readings.length} readings</span>
          <span>{format(new Date(sensor.latest.timestamp), 'HH:mm:ss')}</span>
        </div>
      </CardContent>
    </Card>
  );
}

// Legacy export for backward compatibility
export { SensorMeasurementsCard as DeviceMeasurementsCard };
