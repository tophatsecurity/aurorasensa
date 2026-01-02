import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { mapIcons } from "@/utils/mapIcons";
import type { AircraftMarker } from "@/types/map";

interface AircraftMarkersProps {
  aircraft: AircraftMarker[];
  visible: boolean;
}

function createAircraftPopupContent(ac: AircraftMarker): string {
  return `
    <div class="p-2 min-w-[200px]">
      <div class="flex items-center gap-2 mb-3 pb-2 border-b border-gray-600">
        <span class="font-bold text-lg">${ac.flight?.trim() || ac.hex}</span>
      </div>
      <div class="space-y-2 text-sm">
        <div class="flex justify-between">
          <span class="text-gray-400">Callsign</span>
          <span class="font-mono">${ac.flight?.trim() || '—'}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-400">Hex Code</span>
          <span class="font-mono uppercase">${ac.hex}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-400">Altitude</span>
          <span class="font-medium">${ac.alt_baro?.toLocaleString() || '—'} ft</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-400">Ground Speed</span>
          <span class="font-medium">${ac.gs?.toFixed(0) || '—'} kts</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-400">Track</span>
          <span class="font-medium">${ac.track?.toFixed(0) || '—'}°</span>
        </div>
        ${ac.squawk ? `
        <div class="flex justify-between">
          <span class="text-gray-400">Squawk</span>
          <span class="font-mono px-2 py-0.5 bg-gray-700 rounded">${ac.squawk}</span>
        </div>` : ''}
        ${ac.rssi ? `
        <div class="flex justify-between">
          <span class="text-gray-400">Signal</span>
          <span class="font-medium">${ac.rssi.toFixed(1)} dBm</span>
        </div>` : ''}
      </div>
    </div>
  `;
}

export function AircraftMarkers({ aircraft, visible }: AircraftMarkersProps) {
  const map = useMap();
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    if (!visible || aircraft.length === 0) return;

    // Create new markers
    aircraft.forEach((ac) => {
      const marker = L.marker([ac.lat, ac.lon], { icon: mapIcons.adsb })
        .bindPopup(createAircraftPopupContent(ac))
        .addTo(map);
      markersRef.current.push(marker);
    });

    return () => {
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
    };
  }, [map, aircraft, visible]);

  return null;
}