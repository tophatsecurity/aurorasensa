import { useEffect } from "react";
import { useMap } from "react-leaflet";
import { LatLngExpression } from "leaflet";
import L from "leaflet";

interface FitBoundsProps {
  markers: LatLngExpression[];
}

export function FitBounds({ markers }: FitBoundsProps) {
  const map = useMap();
  
  useEffect(() => {
    if (markers.length > 0) {
      const bounds = L.latLngBounds(markers);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
    }
  }, []);
  
  return null;
}
