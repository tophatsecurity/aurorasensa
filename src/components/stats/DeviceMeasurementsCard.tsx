import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { getDeviceIcon, extractMeasurements } from "./utils";
import type { DeviceGroup } from "./types";

interface DeviceMeasurementsCardProps {
  device: DeviceGroup;
}

export function DeviceMeasurementsCard({ device }: DeviceMeasurementsCardProps) {
  const measurements = extractMeasurements(device.latest);
  const Icon = getDeviceIcon(device.device_type);
  
  return (
    <Card className="glass-card border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Icon className="w-4 h-4" />
            {device.device_id}
          </CardTitle>
          <Badge variant="outline" className="text-xs">{device.device_type}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {measurements.slice(0, 6).map(({ key, value, unit }) => (
            <div key={key} className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</span>
              <span className="font-mono">{value} {unit}</span>
            </div>
          ))}
          {measurements.length === 0 && (
            <p className="text-muted-foreground text-sm text-center py-4">No data available</p>
          )}
        </div>
        <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
          <span>{device.client_id}</span>
          <span>{format(new Date(device.latest.timestamp), 'HH:mm:ss')}</span>
        </div>
      </CardContent>
    </Card>
  );
}
