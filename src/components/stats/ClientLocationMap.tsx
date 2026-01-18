import { useMemo } from "react";
import { MapPin, Satellite, Navigation, Radio, Cpu, Plane, Thermometer, Wifi, Bluetooth, Monitor, Globe, HelpCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import { format } from "date-fns";
import "leaflet/dist/leaflet.css";
import { createMarkerIcon, getMarkerColor, calculateMapCenter } from "./utils";
import type { DeviceGroup, ClientInfo } from "./types";
import { 
  resolveClientLocation, 
  getAllDeviceLocations, 
  getSourceLabel, 
  getSourceColor,
  type LocationSource,
} from "./locationResolver";

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
  // Get all device locations (enriched)
  const devicesWithLocation = useMemo(() => {
    return devices.filter(d => d.location?.lat && d.location?.lng);
  }, [devices]);

  // Get the best resolved location
  const resolvedLocation = useMemo(() => {
    return resolveClientLocation(client, devices);
  }, [client, devices]);

  // Determine map center - prefer resolved location, fallback to device center
  const mapCenter = useMemo(() => {
    if (resolvedLocation.latitude && resolvedLocation.longitude) {
      return { lat: resolvedLocation.latitude, lng: resolvedLocation.longitude };
    }
    if (devicesWithLocation.length > 0) {
      return calculateMapCenter(devicesWithLocation);
    }
    return { lat: 0, lng: 0 };
  }, [resolvedLocation, devicesWithLocation]);

  const hasLocation = mapCenter.lat !== 0 || mapCenter.lng !== 0;

  const getSourceIcon = (source: LocationSource): LucideIcon => {
    const iconMap: Record<LocationSource, LucideIcon> = {
      starlink: Satellite,
      gps: Navigation,
      lora: Radio,
      arduino: Cpu,
      adsb: Plane,
      thermal: Thermometer,
      system: Monitor,
      wifi: Wifi,
      bluetooth: Bluetooth,
      geolocated: Globe,
      unknown: HelpCircle,
    };
    return iconMap[source] || HelpCircle;
  };

  const SourceIcon = getSourceIcon(resolvedLocation.source);

  return (
    <Card className="glass-card border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            <span>Location Map</span>
          </div>
          {hasLocation && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`text-xs font-normal ${getSourceColor(resolvedLocation.source)}`}>
                <SourceIcon className="w-3 h-3 mr-1" />
                {getSourceLabel(resolvedLocation.source)}
              </Badge>
              <span className="text-xs font-normal text-muted-foreground font-mono">
                {mapCenter.lat.toFixed(4)}, {mapCenter.lng.toFixed(4)}
              </span>
            </div>
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
                      <div className="text-sm min-w-48 p-1">
                        <p className="font-bold text-base mb-2">
                          {client.hostname || client.client_id}
                        </p>
                        <p className="text-xs"><strong>Client:</strong> {client.client_id}</p>
                        {client.location.city && (
                          <p className="text-xs"><strong>City:</strong> {client.location.city}</p>
                        )}
                        {client.location.country && (
                          <p className="text-xs"><strong>Country:</strong> {client.location.country}</p>
                        )}
                        <p className="text-xs">
                          <strong>Coords:</strong>{' '}
                          {typeof client.location.latitude === 'number' ? client.location.latitude.toFixed(4) : '—'}, {typeof client.location.longitude === 'number' ? client.location.longitude.toFixed(4) : '—'}
                        </p>
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
                    <div className="text-sm min-w-48 p-1">
                      <p className="font-bold text-base mb-2">{device.device_id}</p>
                      <p className="text-xs"><strong>Type:</strong> {device.device_type}</p>
                      <p className="text-xs"><strong>Readings:</strong> {device.readings.length}</p>
                      <p className="text-xs">
                        <strong>Last seen:</strong>{' '}
                        {format(new Date(device.latest.timestamp), 'PPp')}
                      </p>
                      <p className="text-xs">
                        <strong>Location:</strong>{' '}
                        {device.location?.lat?.toFixed(4) ?? '—'}, {device.location?.lng?.toFixed(4) ?? '—'}
                      </p>
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
