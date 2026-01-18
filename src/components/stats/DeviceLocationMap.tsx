import { useMemo } from "react";
import { MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { format } from "date-fns";
import "leaflet/dist/leaflet.css";
import { createMarkerIcon, getMarkerColor, calculateMapCenter } from "./utils";
import type { DeviceGroup } from "./types";

interface DeviceLocationMapProps {
  devices: DeviceGroup[];
  height?: string;
  showHeader?: boolean;
  zoom?: number;
}

export function DeviceLocationMap({ 
  devices, 
  height = "h-80", 
  showHeader = true,
  zoom = 10 
}: DeviceLocationMapProps) {
  const devicesWithLocation = useMemo(() => {
    return devices.filter(d => 
      d.location && 
      typeof d.location.lat === 'number' && 
      typeof d.location.lng === 'number' &&
      !isNaN(d.location.lat) && 
      !isNaN(d.location.lng)
    );
  }, [devices]);

  const mapCenter = useMemo(() => {
    return calculateMapCenter(devicesWithLocation);
  }, [devicesWithLocation]);

  const mapContent = devicesWithLocation.length > 0 ? (
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
      {devicesWithLocation.map(device => (
        <Marker
          key={device.device_id}
          position={[device.location!.lat, device.location!.lng]}
          icon={createMarkerIcon(getMarkerColor(device.device_type))}
        >
          <Popup>
            <div className="text-sm min-w-48">
              <p className="font-bold text-lg mb-2">{device.device_id}</p>
              <div className="space-y-1 text-muted-foreground">
                <p><span className="font-medium">Type:</span> {device.device_type}</p>
                <p><span className="font-medium">Client:</span> {device.client_id}</p>
                <p><span className="font-medium">Last seen:</span> {format(new Date(device.latest.timestamp), 'PPp')}</p>
                <p><span className="font-medium">Location:</span> {device.location?.lat?.toFixed(4) ?? '—'}, {device.location?.lng?.toFixed(4) ?? '—'}</p>
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
          Device Locations ({devicesWithLocation.length})
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
