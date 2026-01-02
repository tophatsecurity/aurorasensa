import { memo } from "react";
import { Marker, Popup } from "react-leaflet";
import { Navigation } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { mapIcons, IconType } from "@/utils/mapIcons";
import type { SensorMarker, FilterType } from "@/types/map";

interface SensorMarkersProps {
  sensors: SensorMarker[];
  filter: FilterType;
}

const SensorPopup = memo(function SensorPopup({ sensor }: { sensor: SensorMarker }) {
  return (
    <div className="p-2 min-w-[180px]">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border/50">
        <Navigation className="w-5 h-5 text-green-400" />
        <span className="font-bold">{sensor.name}</span>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Type</span>
          <Badge variant="secondary" className="capitalize">{sensor.type}</Badge>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Value</span>
          <span className="font-medium">{sensor.value} {sensor.unit}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Status</span>
          <Badge 
            variant="outline" 
            className={sensor.status === 'active' ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'}
          >
            {sensor.status}
          </Badge>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Updated</span>
          <span>{new Date(sensor.lastUpdate).toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
});

export const SensorMarkers = memo(function SensorMarkers({ 
  sensors, 
  filter 
}: SensorMarkersProps) {
  return (
    <>
      {sensors.map((sensor) => {
        const sensorType = sensor.type.toLowerCase();
        if (filter !== 'all' && sensorType !== filter) return null;
        
        const icon = mapIcons[sensorType as IconType] || mapIcons.gps;
        
        return (
          <Marker
            key={sensor.id}
            position={[sensor.location.lat, sensor.location.lng]}
            icon={icon}
          >
            <Popup className="custom-popup">
              <SensorPopup sensor={sensor} />
            </Popup>
          </Marker>
        );
      })}
    </>
  );
});
