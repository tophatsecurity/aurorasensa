import { useMemo } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import { Icon, LatLngExpression, divIcon } from "leaflet";
import { Loader2 } from "lucide-react";
import { useAdsbAircraft, useSensors } from "@/hooks/useAuroraApi";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Custom icons
const createIcon = (color: string) => new Icon({
  iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
  shadowUrl: markerShadow,
  iconSize: [20, 33],
  iconAnchor: [10, 33],
  popupAnchor: [1, -28],
  shadowSize: [33, 33]
});

const createPulsingIcon = (color: string) => divIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color: ${color}; width: 8px; height: 8px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 8px ${color};"></div>`,
  iconSize: [8, 8],
  iconAnchor: [4, 4],
});

const icons = {
  gps: createIcon('green'),
  adsb: createPulsingIcon('#06b6d4'),
  starlink: createIcon('violet'),
  lora: createIcon('red'),
};

// Auto-fit bounds component
function FitBounds({ markers }: { markers: LatLngExpression[] }) {
  const map = useMap();
  
  useMemo(() => {
    if (markers.length > 0) {
      const bounds = L.latLngBounds(markers);
      map.fitBounds(bounds, { padding: [20, 20], maxZoom: 10 });
    }
  }, [markers, map]);
  
  return null;
}

interface MiniMapPreviewProps {
  onNavigateToMap?: () => void;
}

const MiniMapPreview = ({ onNavigateToMap }: MiniMapPreviewProps) => {
  const { data: aircraft, isLoading: aircraftLoading } = useAdsbAircraft();
  const { data: sensors, isLoading: sensorsLoading } = useSensors();

  const defaultCenter: LatLngExpression = [40.7128, -74.006];

  const aircraftMarkers = useMemo(() => 
    aircraft?.filter(a => a.lat && a.lon) || [], 
    [aircraft]
  );
  
  const sensorMarkers = useMemo(() => 
    sensors?.filter(s => s.location?.lat && s.location?.lng) || [], 
    [sensors]
  );

  const allPositions: LatLngExpression[] = useMemo(() => {
    const positions: LatLngExpression[] = [];
    aircraftMarkers.forEach(a => positions.push([a.lat!, a.lon!]));
    sensorMarkers.forEach(s => positions.push([s.location!.lat, s.location!.lng]));
    return positions;
  }, [aircraftMarkers, sensorMarkers]);

  const isLoading = aircraftLoading || sensorsLoading;

  return (
    <div 
      className="h-64 rounded-lg overflow-hidden relative cursor-pointer group"
      onClick={onNavigateToMap}
    >
      {isLoading ? (
        <div className="absolute inset-0 bg-muted/20 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <MapContainer
            center={defaultCenter}
            zoom={8}
            className="h-full w-full"
            style={{ background: '#0f172a' }}
            zoomControl={false}
            dragging={false}
            scrollWheelZoom={false}
            doubleClickZoom={false}
            touchZoom={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />

            {allPositions.length > 0 && <FitBounds markers={allPositions} />}

            {/* Aircraft markers */}
            {aircraftMarkers.slice(0, 50).map((ac) => (
              <Marker
                key={ac.hex}
                position={[ac.lat!, ac.lon!]}
                icon={icons.adsb}
              />
            ))}

            {/* Sensor markers */}
            {sensorMarkers.slice(0, 50).map((sensor) => {
              const sensorType = sensor.type.toLowerCase();
              const icon = icons[sensorType as keyof typeof icons] || icons.gps;
              return (
                <Marker
                  key={sensor.id}
                  position={[sensor.location!.lat, sensor.location!.lng]}
                  icon={icon}
                />
              );
            })}
          </MapContainer>

          {/* Overlay for click-to-expand */}
          <div className="absolute inset-0 bg-transparent group-hover:bg-black/20 transition-colors flex items-center justify-center">
            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-sm font-medium bg-black/50 px-3 py-1.5 rounded-full">
              Click to expand map
            </span>
          </div>

          {/* Stats overlay */}
          <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm rounded-md px-2 py-1 text-xs text-white">
            {aircraftMarkers.length} aircraft • {sensorMarkers.length} sensors
          </div>
        </>
      )}
    </div>
  );
};

export default MiniMapPreview;
