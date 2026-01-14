import { Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { getDeviceIcon, getDeviceColor } from "./utils";
import type { DeviceGroup } from "./types";

interface DeviceListCardProps {
  devices: DeviceGroup[];
  onDeviceSelect: (device: DeviceGroup) => void;
}

export function DeviceListCard({ devices, onDeviceSelect }: DeviceListCardProps) {
  return (
    <Card className="glass-card border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Activity className="w-4 h-4" />
          Active Clients ({devices.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-80">
          <div className="space-y-2">
            {devices.map(device => {
              const Icon = getDeviceIcon(device.device_type);
              return (
                <div 
                  key={`${device.client_id}:${device.device_id}`}
                  className="p-3 rounded-lg border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer"
                  onClick={() => onDeviceSelect(device)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded ${getDeviceColor(device.device_type)}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{device.device_id}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {device.device_type.replace(/_/g, ' ')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="text-xs">
                        {device.client_id}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(device.latest.timestamp), 'HH:mm:ss')}
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
