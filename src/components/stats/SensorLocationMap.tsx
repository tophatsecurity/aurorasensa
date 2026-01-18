import { useMemo } from "react";
import { MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { format } from "date-fns";
import "leaflet/dist/leaflet.css";
import { createMarkerIcon, getMarkerColor, calculateMapCenter, formatSensorType } from "./utils";
import type { SensorGroup } from "./types";

interface SensorLocationMapProps {
  sensors: SensorGroup[];
  height?: string;
  showHeader?: boolean;
  zoom?: number;
}

export function SensorLocationMap({ 
  sensors, 
  height = "h-80", 
  showHeader = true,
  zoom = 10 
}: SensorLocationMapProps) {
  const sensorsWithLocation = useMemo(() => {
    return sensors.filter(s => 
      s.location && 
      typeof s.location.lat === 'number' && 
      typeof s.location.lng === 'number' &&
      !isNaN(s.location.lat) && 
      !isNaN(s.location.lng)
    );
  }, [sensors]);

  const mapCenter = useMemo(() => {
    return calculateMapCenter(sensorsWithLocation);
  }, [sensorsWithLocation]);

  const mapContent = sensorsWithLocation.length > 0 ? (
    <MapContainer
      center={[mapCenter.lat, mapCenter.lng]}
      zoom={zoom}
      className="h-full w-full"
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      {sensorsWithLocation.map(sensor => (
        <Marker
          key={`${sensor.client_id}:${sensor.sensor_type}`}
          position={[sensor.location!.lat, sensor.location!.lng]}
          icon={createMarkerIcon(getMarkerColor(sensor.sensor_type))}
        >
          <Popup>
            <div className="text-sm min-w-48">
              <p className="font-bold text-lg mb-2">{formatSensorType(sensor.sensor_type)}</p>
              <div className="space-y-1 text-muted-foreground">
                <p><span className="font-medium">Client:</span> {sensor.client_id}</p>
                <p><span className="font-medium">Readings:</span> {sensor.readings.length}</p>
                <p><span className="font-medium">Last seen:</span> {format(new Date(sensor.latest.timestamp), 'PPp')}</p>
                <p><span className="font-medium">Location:</span> {sensor.location?.lat?.toFixed(4) ?? '—'}, {sensor.location?.lng?.toFixed(4) ?? '—'}</p>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  ) : (
    <div className="h-full flex items-center justify-center bg-muted/20 rounded-lg">
      <div className="text-center text-muted-foreground">
        <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No location data available</p>
      </div>
    </div>
  );

  if (!showHeader) {
    return (
      <div className={`${height} rounded-lg overflow-hidden`}>
        {mapContent}
      </div>
    );
  }

  return (
    <Card className="glass-card border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          Sensor Locations ({sensorsWithLocation.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`${height} rounded-lg overflow-hidden`}>
          {mapContent}
        </div>
      </CardContent>
    </Card>
  );
}

// Legacy export for backward compatibility
export { SensorLocationMap as DeviceLocationMap };
