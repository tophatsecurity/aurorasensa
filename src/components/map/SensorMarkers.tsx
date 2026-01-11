import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { mapIcons, IconType } from "@/utils/mapIcons";
import type { SensorMarker, FilterType } from "@/types/map";

interface SensorMarkersProps {
  sensors: SensorMarker[];
  filter: FilterType;
}

function createSensorPopupContent(sensor: SensorMarker): string {
  const statusClass = sensor.status === 'active' 
    ? 'bg-green-500/20 text-green-400' 
    : 'bg-yellow-500/20 text-yellow-400';
  
  const lat = sensor.location.lat.toFixed(6);
  const lng = sensor.location.lng.toFixed(6);
  
  return `
    <div class="p-2 min-w-[200px]">
      <div class="flex items-center gap-2 mb-3 pb-2 border-b border-gray-600">
        <span class="font-bold">${sensor.name}</span>
      </div>
      <div class="space-y-2 text-sm">
        <div class="flex justify-between">
          <span class="text-gray-400">Type</span>
          <span class="px-2 py-0.5 bg-gray-700 rounded capitalize">${sensor.type}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-400">Latitude</span>
          <span class="font-mono text-xs">${lat}°</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-400">Longitude</span>
          <span class="font-mono text-xs">${lng}°</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-400">Value</span>
          <span class="font-medium">${sensor.value} ${sensor.unit}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-400">Status</span>
          <span class="px-2 py-0.5 rounded ${statusClass}">${sensor.status}</span>
        </div>
        <div class="flex justify-between text-xs">
          <span class="text-gray-400">Updated</span>
          <span>${new Date(sensor.lastUpdate).toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  `;
}

export function SensorMarkers({ sensors, filter }: SensorMarkersProps) {
  const map = useMap();
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Filter sensors based on current filter
    const filteredSensors = sensors.filter((sensor) => {
      const sensorType = sensor.type.toLowerCase();
      return filter === 'all' || sensorType === filter;
    });

    if (filteredSensors.length === 0) return;

    // Create new markers
    filteredSensors.forEach((sensor) => {
      const sensorType = sensor.type.toLowerCase();
      const icon = mapIcons[sensorType as IconType] || mapIcons.gps;
      
      const marker = L.marker([sensor.location.lat, sensor.location.lng], { icon })
        .bindPopup(createSensorPopupContent(sensor))
        .addTo(map);
      markersRef.current.push(marker);
    });

    return () => {
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
    };
  }, [map, sensors, filter]);

  return null;
}