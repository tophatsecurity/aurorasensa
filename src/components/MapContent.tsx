import { useState, useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle, Polyline } from "react-leaflet";
import { Icon, LatLngExpression, divIcon } from "leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { 
  RefreshCw, MapPin, Navigation, Plane, Radio, Wifi, Loader2, 
  Maximize2, ZoomIn, ZoomOut, Layers, Clock, Activity, Signal
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAdsbAircraft, useSensors, useClients } from "@/hooks/useAuroraApi";
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

// Custom icons with better styling
const createIcon = (color: string) => new Icon({
  iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Pulsing marker for aircraft
const createPulsingIcon = (color: string) => divIcon({
  className: 'custom-div-icon',
  html: `
    <div style="
      background-color: ${color};
      width: 12px;
      height: 12px;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 0 10px ${color}, 0 0 20px ${color}40;
      animation: pulse 2s infinite;
    "></div>
    <style>
      @keyframes pulse {
        0% { box-shadow: 0 0 10px ${color}, 0 0 20px ${color}40; transform: scale(1); }
        50% { box-shadow: 0 0 20px ${color}, 0 0 40px ${color}60; transform: scale(1.1); }
        100% { box-shadow: 0 0 10px ${color}, 0 0 20px ${color}40; transform: scale(1); }
      }
    </style>
  `,
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

const icons = {
  gps: createIcon('green'),
  adsb: createPulsingIcon('#06b6d4'),
  starlink: createIcon('violet'),
  client: createIcon('orange'),
  lora: createIcon('red'),
};

type FilterType = 'all' | 'gps' | 'adsb' | 'starlink' | 'clients' | 'lora';

// Custom cluster icon
const createClusterCustomIcon = (cluster: any) => {
  const count = cluster.getChildCount();
  let size = 'small';
  let bg = 'bg-primary';
  
  if (count >= 10) { size = 'medium'; bg = 'bg-cyan-500'; }
  if (count >= 50) { size = 'large'; bg = 'bg-purple-500'; }
  
  const sizeClass = size === 'small' ? 'w-8 h-8 text-xs' : size === 'medium' ? 'w-10 h-10 text-sm' : 'w-12 h-12 text-base';
  
  return divIcon({
    html: `<div class="${bg} ${sizeClass} rounded-full flex items-center justify-center text-white font-bold shadow-lg border-2 border-white/30">${count}</div>`,
    className: 'custom-cluster-icon',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
};

// Map Controls Component
function MapControls({ onRecenter }: { onRecenter: () => void }) {
  const map = useMap();
  
  return (
    <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2">
      <Button 
        variant="outline" 
        size="icon"
        className="bg-card/90 backdrop-blur border-border/50 hover:bg-card"
        onClick={() => map.zoomIn()}
      >
        <ZoomIn className="w-4 h-4" />
      </Button>
      <Button 
        variant="outline" 
        size="icon"
        className="bg-card/90 backdrop-blur border-border/50 hover:bg-card"
        onClick={() => map.zoomOut()}
      >
        <ZoomOut className="w-4 h-4" />
      </Button>
      <Button 
        variant="outline" 
        size="icon"
        className="bg-card/90 backdrop-blur border-border/50 hover:bg-card"
        onClick={onRecenter}
      >
        <Maximize2 className="w-4 h-4" />
      </Button>
    </div>
  );
}

// Auto-fit bounds component
function FitBounds({ markers }: { markers: LatLngExpression[] }) {
  const map = useMap();
  
  useEffect(() => {
    if (markers.length > 0) {
      const bounds = L.latLngBounds(markers);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
    }
  }, []);
  
  return null;
}

const MapContent = () => {
  const [filter, setFilter] = useState<FilterType>('all');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const { data: aircraft, isLoading: aircraftLoading, dataUpdatedAt: aircraftUpdated } = useAdsbAircraft();
  const { data: sensors, isLoading: sensorsLoading, dataUpdatedAt: sensorsUpdated } = useSensors();
  const { data: clients, isLoading: clientsLoading } = useClients();
  const queryClient = useQueryClient();

  const defaultCenter: LatLngExpression = [40.7128, -74.006];

  // Update last refresh time
  useEffect(() => {
    setLastUpdate(new Date());
  }, [aircraftUpdated, sensorsUpdated]);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["aurora"] });
  };

  // Filter and prepare markers
  const aircraftMarkers = useMemo(() => 
    aircraft?.filter(a => a.lat && a.lon) || [], 
    [aircraft]
  );
  
  const sensorMarkers = useMemo(() => 
    sensors?.filter(s => s.location?.lat && s.location?.lng) || [], 
    [sensors]
  );

  // Get client locations from metadata if available
  const clientMarkers = useMemo(() => {
    if (!clients) return [];
    return clients.filter(c => {
      const gps = c.metadata?.config?.sensors?.gps;
      return gps && typeof gps === 'object';
    }).map(c => ({
      ...c,
      location: { lat: 40.7128 + Math.random() * 0.1, lng: -74.006 + Math.random() * 0.1 } // Placeholder
    }));
  }, [clients]);

  // All marker positions for bounds fitting
  const allPositions: LatLngExpression[] = useMemo(() => {
    const positions: LatLngExpression[] = [];
    aircraftMarkers.forEach(a => positions.push([a.lat!, a.lon!]));
    sensorMarkers.forEach(s => positions.push([s.location!.lat, s.location!.lng]));
    return positions;
  }, [aircraftMarkers, sensorMarkers]);

  // Calculate statistics
  const stats = useMemo(() => ({
    total: aircraftMarkers.length + sensorMarkers.length + clientMarkers.length,
    gps: sensorMarkers.filter(s => s.type === 'gps').length,
    adsb: aircraftMarkers.length,
    starlink: sensorMarkers.filter(s => s.type === 'starlink').length,
    clients: clientMarkers.length,
    lora: sensorMarkers.filter(s => s.type === 'lora').length,
  }), [aircraftMarkers, sensorMarkers, clientMarkers]);

  const filterButtons: { id: FilterType; label: string; icon: React.ReactNode; color: string; count: number }[] = [
    { id: 'all', label: 'All', icon: <Layers className="w-3 h-3" />, color: 'bg-primary', count: stats.total },
    { id: 'gps', label: 'GPS', icon: <Navigation className="w-3 h-3" />, color: 'bg-green-500', count: stats.gps },
    { id: 'adsb', label: 'ADS-B', icon: <Plane className="w-3 h-3" />, color: 'bg-cyan-500', count: stats.adsb },
    { id: 'starlink', label: 'Starlink', icon: <Wifi className="w-3 h-3" />, color: 'bg-violet-500', count: stats.starlink },
    { id: 'clients', label: 'Clients', icon: <Radio className="w-3 h-3" />, color: 'bg-orange-500', count: stats.clients },
    { id: 'lora', label: 'LoRa', icon: <Radio className="w-3 h-3" />, color: 'bg-red-500', count: stats.lora },
  ];

  const isLoading = aircraftLoading || sensorsLoading || clientsLoading;

  // Format time ago
  const timeAgo = useMemo(() => {
    const seconds = Math.floor((new Date().getTime() - lastUpdate.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    return `${Math.floor(seconds / 60)}m ago`;
  }, [lastUpdate]);

  const recenterMap = () => {
    // Will be called from MapControls
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-6 pb-4 border-b border-border/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Sensor Map</h1>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Activity className="w-3 h-3 text-success animate-pulse" />
                Live tracking • Updated {timeAgo}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="gap-1 bg-card">
              <Signal className="w-3 h-3 text-success" />
              {stats.total} markers
            </Badge>
            <Button 
              variant="default" 
              size="sm" 
              className="gap-2"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {filterButtons.map((btn) => (
            <Badge
              key={btn.id}
              variant={filter === btn.id ? 'default' : 'outline'}
              className={`cursor-pointer gap-1.5 px-3 py-1.5 transition-all ${
                filter === btn.id ? btn.color + ' text-white shadow-lg' : 'hover:bg-muted'
              }`}
              onClick={() => setFilter(btn.id)}
            >
              {btn.icon}
              {btn.label}
              <span className={`ml-1 text-xs ${filter === btn.id ? 'opacity-80' : 'text-muted-foreground'}`}>
                ({btn.count})
              </span>
            </Badge>
          ))}
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 relative">
        <MapContainer
          center={defaultCenter}
          zoom={10}
          className="h-full w-full"
          style={{ background: '#0f172a' }}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />

          <MapControls onRecenter={recenterMap} />
          
          {allPositions.length > 0 && <FitBounds markers={allPositions} />}

          {/* Aircraft markers with clustering */}
          {(filter === 'all' || filter === 'adsb') && aircraftMarkers.length > 0 && (
            <MarkerClusterGroup
              chunkedLoading
              iconCreateFunction={createClusterCustomIcon}
              maxClusterRadius={60}
              spiderfyOnMaxZoom
              showCoverageOnHover={false}
            >
              {aircraftMarkers.map((ac) => (
                <Marker
                  key={ac.hex}
                  position={[ac.lat!, ac.lon!]}
                  icon={icons.adsb}
                >
                  <Popup className="custom-popup">
                    <div className="p-2 min-w-[200px]">
                      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border/50">
                        <Plane className="w-5 h-5 text-cyan-400" />
                        <span className="font-bold text-lg">{ac.flight?.trim() || ac.hex}</span>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Callsign</span>
                          <span className="font-mono">{ac.flight?.trim() || '—'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Hex Code</span>
                          <span className="font-mono uppercase">{ac.hex}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Altitude</span>
                          <span className="font-medium">{ac.alt_baro?.toLocaleString() || '—'} ft</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Ground Speed</span>
                          <span className="font-medium">{ac.gs?.toFixed(0) || '—'} kts</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Track</span>
                          <span className="font-medium">{ac.track?.toFixed(0) || '—'}°</span>
                        </div>
                        {ac.squawk && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Squawk</span>
                            <Badge variant="outline" className="font-mono">{ac.squawk}</Badge>
                          </div>
                        )}
                        {ac.rssi && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Signal</span>
                            <span className="font-medium">{ac.rssi.toFixed(1)} dBm</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MarkerClusterGroup>
          )}

          {/* Sensor markers with clustering */}
          <MarkerClusterGroup
            chunkedLoading
            iconCreateFunction={createClusterCustomIcon}
            maxClusterRadius={40}
          >
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
                  <Popup className="custom-popup">
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
                  </Popup>
                </Marker>
              );
            })}
          </MarkerClusterGroup>
        </MapContainer>

        {/* Sensor Types Legend */}
        <div className="absolute bottom-4 left-4 glass-card rounded-xl p-4 z-[1000] backdrop-blur-md border border-border/50">
          <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Legend</h3>
          <div className="space-y-2.5 text-sm">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-green-500 shadow-lg shadow-green-500/30" />
              <span>GPS Sensors</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-cyan-500 shadow-lg shadow-cyan-500/30 animate-pulse" />
              <span>ADS-B Aircraft</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-violet-500 shadow-lg shadow-violet-500/30" />
              <span>Starlink Dishes</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-orange-500 shadow-lg shadow-orange-500/30" />
              <span>Client Devices</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-red-500 shadow-lg shadow-red-500/30" />
              <span>LoRa Devices</span>
            </div>
          </div>
        </div>

        {/* Map Statistics */}
        <div className="absolute top-4 right-4 glass-card rounded-xl p-4 z-[1000] min-w-[200px] backdrop-blur-md border border-border/50">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Statistics</h3>
          </div>
          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Total Markers</span>
              <span className="font-bold text-lg text-primary">{stats.total}</span>
            </div>
            <div className="h-px bg-border/50 my-2" />
            <div className="flex justify-between">
              <span className="text-muted-foreground flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                GPS
              </span>
              <span className="font-medium">{stats.gps}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                ADS-B
              </span>
              <span className="font-medium">{stats.adsb}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-violet-500" />
                Starlink
              </span>
              <span className="font-medium">{stats.starlink}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-orange-500" />
                Clients
              </span>
              <span className="font-medium">{stats.clients}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                LoRa
              </span>
              <span className="font-medium">{stats.lora}</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-border/50 flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            Auto-refresh: 5s
          </div>
        </div>

        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center z-[1001]">
            <div className="glass-card rounded-xl p-6 flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Loading map data...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MapContent;
