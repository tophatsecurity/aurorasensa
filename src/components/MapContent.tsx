import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { Icon, LatLngExpression } from "leaflet";
import { RefreshCw, MapPin, Navigation, Plane, Radio, Wifi, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAdsbAircraft, useSensors } from "@/hooks/useAuroraApi";
import { useQueryClient } from "@tanstack/react-query";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default marker icon issue
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Custom icons
const createIcon = (color: string) => new Icon({
  iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const icons = {
  gps: createIcon('green'),
  adsb: createIcon('blue'),
  starlink: createIcon('violet'),
  client: createIcon('orange'),
  lora: createIcon('red'),
};

type FilterType = 'all' | 'gps' | 'adsb' | 'starlink' | 'clients' | 'lora';

// Component to recenter map
function RecenterMap({ center }: { center: LatLngExpression }) {
  const map = useMap();
  const recenter = () => {
    map.setView(center, 10);
  };
  return (
    <Button 
      variant="outline" 
      size="sm" 
      className="gap-2 bg-card/80 backdrop-blur"
      onClick={recenter}
    >
      <MapPin className="w-4 h-4 text-destructive" />
      Center
    </Button>
  );
}

const MapContent = () => {
  const [filter, setFilter] = useState<FilterType>('all');
  const { data: aircraft, isLoading: aircraftLoading } = useAdsbAircraft();
  const { data: sensors, isLoading: sensorsLoading } = useSensors();
  const queryClient = useQueryClient();

  const defaultCenter: LatLngExpression = [40.7128, -74.006]; // NYC

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["aurora"] });
  };

  // Filter and prepare markers
  const aircraftMarkers = aircraft?.filter(a => a.lat && a.lon) || [];
  const sensorMarkers = sensors?.filter(s => s.location?.lat && s.location?.lng) || [];

  // Calculate statistics
  const stats = {
    total: aircraftMarkers.length + sensorMarkers.length,
    gps: sensorMarkers.filter(s => s.type === 'gps').length,
    adsb: aircraftMarkers.length,
    starlink: sensorMarkers.filter(s => s.type === 'starlink').length,
    clients: sensorMarkers.filter(s => s.type === 'client').length,
    lora: sensorMarkers.filter(s => s.type === 'lora').length,
  };

  const filterButtons: { id: FilterType; label: string; icon: React.ReactNode; color: string }[] = [
    { id: 'all', label: 'All', icon: null, color: 'bg-primary' },
    { id: 'gps', label: 'GPS', icon: <Navigation className="w-3 h-3" />, color: 'bg-green-500' },
    { id: 'adsb', label: 'ADS-B', icon: <Plane className="w-3 h-3" />, color: 'bg-cyan-500' },
    { id: 'starlink', label: 'Starlink', icon: <Wifi className="w-3 h-3" />, color: 'bg-blue-500' },
    { id: 'clients', label: 'Clients', icon: <Radio className="w-3 h-3" />, color: 'bg-purple-500' },
    { id: 'lora', label: 'LoRa', icon: <Radio className="w-3 h-3" />, color: 'bg-orange-500' },
  ];

  const isLoading = aircraftLoading || sensorsLoading;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-6 pb-4 border-b border-border/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <MapPin className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Sensor Map</h1>
          </div>
          <Button 
            variant="link" 
            className="text-primary"
            onClick={() => window.location.hash = '#dashboard'}
          >
            ← Dashboard
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground mr-2">Show:</span>
            {filterButtons.map((btn) => (
              <Badge
                key={btn.id}
                variant={filter === btn.id ? 'default' : 'outline'}
                className={`cursor-pointer gap-1 ${filter === btn.id ? btn.color + ' text-white' : ''}`}
                onClick={() => setFilter(btn.id)}
              >
                {btn.icon}
                {btn.label}
              </Badge>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="default" 
              size="sm" 
              className="gap-2 bg-primary"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 relative">
        <MapContainer
          center={defaultCenter}
          zoom={10}
          className="h-full w-full"
          style={{ background: '#1a1a2e' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />

          {/* Aircraft markers */}
          {(filter === 'all' || filter === 'adsb') && aircraftMarkers.map((ac) => (
            <Marker
              key={ac.hex}
              position={[ac.lat!, ac.lon!]}
              icon={icons.adsb}
            >
              <Popup>
                <div className="text-sm">
                  <strong>{ac.flight?.trim() || ac.hex}</strong>
                  <br />
                  Altitude: {ac.alt_baro?.toLocaleString() || '—'} ft
                  <br />
                  Speed: {ac.gs?.toFixed(0) || '—'} kts
                  <br />
                  Track: {ac.track?.toFixed(0) || '—'}°
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Sensor markers */}
          {sensorMarkers.map((sensor) => {
            const sensorType = sensor.type.toLowerCase();
            if (filter !== 'all' && sensorType !== filter) return null;
            
            const icon = icons[sensorType as keyof typeof icons] || icons.gps;
            
            return (
              <Marker
                key={sensor.id}
                position={[sensor.location!.lat, sensor.location!.lng]}
                icon={icon}
              >
                <Popup>
                  <div className="text-sm">
                    <strong>{sensor.name}</strong>
                    <br />
                    Type: {sensor.type}
                    <br />
                    Value: {sensor.value} {sensor.unit}
                    <br />
                    Status: {sensor.status}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>

        {/* Sensor Types Legend */}
        <div className="absolute bottom-4 left-4 glass-card rounded-lg p-4 z-[1000]">
          <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase">Sensor Types</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Navigation className="w-4 h-4 text-green-500" />
              <span>GPS Sensors</span>
            </div>
            <div className="flex items-center gap-2">
              <Plane className="w-4 h-4 text-cyan-500" />
              <span>ADS-B Aircraft</span>
            </div>
            <div className="flex items-center gap-2">
              <Wifi className="w-4 h-4 text-violet-500" />
              <span>Starlink Dishes</span>
            </div>
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-orange-500" />
              <span>Client Devices</span>
            </div>
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-red-500" />
              <span>LoRa Devices</span>
            </div>
          </div>
        </div>

        {/* Map Statistics */}
        <div className="absolute top-4 right-4 glass-card rounded-lg p-4 z-[1000] min-w-[180px]">
          <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase">Map Statistics</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Markers</span>
              <span className="font-medium">{stats.total}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">GPS Sensors</span>
              <span className="font-medium">{stats.gps}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">ADS-B Aircraft</span>
              <span className="font-medium">{stats.adsb}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Starlink</span>
              <span className="font-medium">{stats.starlink}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Clients</span>
              <span className="font-medium">{stats.clients}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">LoRa Devices</span>
              <span className="font-medium">{stats.lora}</span>
            </div>
          </div>
        </div>

        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-[1001]">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}
      </div>
    </div>
  );
};

export default MapContent;
