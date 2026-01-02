import { memo } from "react";
import { Marker, Popup } from "react-leaflet";
import { Plane } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { mapIcons } from "@/utils/mapIcons";
import type { AircraftMarker } from "@/types/map";

interface AircraftMarkersProps {
  aircraft: AircraftMarker[];
  visible: boolean;
}

const AircraftPopup = memo(function AircraftPopup({ ac }: { ac: AircraftMarker }) {
  return (
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
  );
});

export const AircraftMarkers = memo(function AircraftMarkers({ 
  aircraft, 
  visible 
}: AircraftMarkersProps) {
  if (!visible) return null;

  return (
    <>
      {aircraft.map((ac) => (
        <Marker
          key={ac.hex}
          position={[ac.lat, ac.lon]}
          icon={mapIcons.adsb}
        >
          <Popup className="custom-popup">
            <AircraftPopup ac={ac} />
          </Popup>
        </Marker>
      ))}
    </>
  );
});
