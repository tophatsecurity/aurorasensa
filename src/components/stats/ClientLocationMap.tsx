import { useMemo } from "react";
import { MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import { format } from "date-fns";
import "leaflet/dist/leaflet.css";
import { createMarkerIcon, getMarkerColor, calculateMapCenter } from "./utils";
import type { DeviceGroup, ClientInfo } from "./types";

interface ClientLocationMapProps {
  client?: ClientInfo | null;
  devices: DeviceGroup[];
  height?: string;
}

export function ClientLocationMap({ 
  client, 
  devices,
  height = "h-[350px]" 
}: ClientLocationMapProps) {
  const devicesWithLocation = useMemo(() => {
    return devices.filter(d => d.location);
  }, [devices]);

  // Determine map center - prefer client location, fallback to device center
  const mapCenter = useMemo(() => {
    if (client?.location?.latitude && client?.location?.longitude) {
      return { lat: client.location.latitude, lng: client.location.longitude };
    }
    if (devicesWithLocation.length > 0) {
      return calculateMapCenter(devicesWithLocation);
    }
    return { lat: 0, lng: 0 };
  }, [client, devicesWithLocation]);

  const hasLocation = mapCenter.lat !== 0 || mapCenter.lng !== 0;

  return (
    <Card className="glass-card border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            <span>Location Map</span>
          </div>
          {hasLocation && (
            <span className="text-xs font-normal text-muted-foreground font-mono">
              {mapCenter.lat.toFixed(4)}, {mapCenter.lng.toFixed(4)}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3">
        <div className={`${height} rounded-lg overflow-hidden`}>
          {hasLocation ? (
            <MapContainer
              center={[mapCenter.lat, mapCenter.lng]}
              zoom={12}
              className="h-full w-full"
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              />
              
              {/* Client location marker */}
              {client?.location?.latitude && client?.location?.longitude && (
                <>
                  <Circle
                    center={[client.location.latitude, client.location.longitude]}
                    radius={500}
                    pathOptions={{ 
                      color: 'hsl(var(--primary))', 
                      fillColor: 'hsl(var(--primary))',
                      fillOpacity: 0.15,
                      weight: 2,
                    }}
                  />
                  <Marker
                    position={[client.location.latitude, client.location.longitude]}
                    icon={createMarkerIcon('hsl(var(--primary))')}
                  >
                    <Popup>
                      <div className="text-sm min-w-48">
                        <p className="font-bold text-lg mb-2">
                          {client.hostname || client.client_id}
                        </p>
                        <div className="space-y-1 text-muted-foreground">
                          <p><span className="font-medium">Client:</span> {client.client_id}</p>
                          {client.location.city && (
                            <p><span className="font-medium">City:</span> {client.location.city}</p>
                          )}
                          {client.location.country && (
                            <p><span className="font-medium">Country:</span> {client.location.country}</p>
                          )}
                          <p>
                            <span className="font-medium">Coords:</span>{' '}
                            {client.location.latitude?.toFixed(4)}, {client.location.longitude?.toFixed(4)}
                          </p>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                </>
              )}
              
              {/* Device markers */}
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
                        <p><span className="font-medium">Readings:</span> {device.readings.length}</p>
                        <p>
                          <span className="font-medium">Last seen:</span>{' '}
                          {format(new Date(device.latest.timestamp), 'PPp')}
                        </p>
                        <p>
                          <span className="font-medium">Location:</span>{' '}
                          {device.location!.lat.toFixed(4)}, {device.location!.lng.toFixed(4)}
                        </p>
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
                <p className="text-sm">No location data available</p>
                <p className="text-xs mt-1">Location will appear when GPS data is received</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
