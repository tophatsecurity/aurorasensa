import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { mapIcons, IconType } from "@/utils/mapIcons";
import type { SensorMarker, FilterType, StarlinkMetrics } from "@/types/map";

interface SensorMarkersProps {
  sensors: SensorMarker[];
  filter: FilterType;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(2)} Gbps`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(2)} Mbps`;
  if (bytes >= 1e3) return `${(bytes / 1e3).toFixed(2)} Kbps`;
  return `${bytes.toFixed(0)} bps`;
}

function formatUptime(seconds?: number): string {
  if (!seconds) return 'N/A';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function createStarlinkPopupContent(sensor: SensorMarker): string {
  const data = sensor.starlinkData;
  const statusClass = sensor.status === 'active' 
    ? 'bg-green-500/20 text-green-400' 
    : 'bg-yellow-500/20 text-yellow-400';
  
  const lat = sensor.location.lat.toFixed(6);
  const lng = sensor.location.lng.toFixed(6);
  
  // Build metrics rows
  const metricsRows: string[] = [];
  
  if (data?.signalStrength !== undefined) {
    const signalColor = data.signalStrength > -70 ? 'text-green-400' : data.signalStrength > -85 ? 'text-yellow-400' : 'text-red-400';
    metricsRows.push(`
      <div class="flex justify-between">
        <span class="text-gray-400">Signal</span>
        <span class="font-medium ${signalColor}">${data.signalStrength.toFixed(1)} dBm</span>
      </div>
    `);
  }
  
  if (data?.snr !== undefined) {
    metricsRows.push(`
      <div class="flex justify-between">
        <span class="text-gray-400">SNR</span>
        <span class="font-medium">${data.snr.toFixed(1)} dB</span>
      </div>
    `);
  }
  
  if (data?.latencyMs !== undefined) {
    const latencyColor = data.latencyMs < 50 ? 'text-green-400' : data.latencyMs < 100 ? 'text-yellow-400' : 'text-red-400';
    metricsRows.push(`
      <div class="flex justify-between">
        <span class="text-gray-400">Latency</span>
        <span class="font-medium ${latencyColor}">${data.latencyMs.toFixed(0)} ms</span>
      </div>
    `);
  }
  
  if (data?.downlinkThroughputBps !== undefined) {
    metricsRows.push(`
      <div class="flex justify-between">
        <span class="text-gray-400">Downlink</span>
        <span class="font-medium text-blue-400">${formatBytes(data.downlinkThroughputBps)}</span>
      </div>
    `);
  }
  
  if (data?.uplinkThroughputBps !== undefined) {
    metricsRows.push(`
      <div class="flex justify-between">
        <span class="text-gray-400">Uplink</span>
        <span class="font-medium text-purple-400">${formatBytes(data.uplinkThroughputBps)}</span>
      </div>
    `);
  }
  
  if (data?.obstructionPercent !== undefined) {
    const obstructColor = data.obstructionPercent < 5 ? 'text-green-400' : data.obstructionPercent < 15 ? 'text-yellow-400' : 'text-red-400';
    metricsRows.push(`
      <div class="flex justify-between">
        <span class="text-gray-400">Obstruction</span>
        <span class="font-medium ${obstructColor}">${data.obstructionPercent.toFixed(1)}%</span>
      </div>
    `);
  }
  
  if (data?.powerWatts !== undefined) {
    metricsRows.push(`
      <div class="flex justify-between">
        <span class="text-gray-400">Power</span>
        <span class="font-medium">${data.powerWatts.toFixed(1)} W</span>
      </div>
    `);
  }
  
  if (data?.uptimeSeconds !== undefined) {
    metricsRows.push(`
      <div class="flex justify-between">
        <span class="text-gray-400">Uptime</span>
        <span class="font-medium">${formatUptime(data.uptimeSeconds)}</span>
      </div>
    `);
  }
  
  // Show device ID if different from generic name
  const deviceIdRow = data?.deviceId && data.deviceId !== 'starlink_dish_1' ? `
    <div class="flex justify-between text-xs mt-2 pt-2 border-t border-gray-600">
      <span class="text-gray-400">Device ID</span>
      <span class="font-mono text-xs text-gray-300 truncate max-w-[150px]" title="${data.deviceId}">${data.deviceId.length > 20 ? data.deviceId.substring(0, 20) + '...' : data.deviceId}</span>
    </div>
  ` : '';
  
  return `
    <div class="p-2 min-w-[220px]">
      <div class="flex items-center gap-2 mb-3 pb-2 border-b border-gray-600">
        <span class="font-bold text-blue-300">${sensor.name}</span>
        <span class="px-2 py-0.5 rounded ${statusClass} text-xs">${data?.connected ? 'Online' : sensor.status}</span>
      </div>
      
      <div class="space-y-1.5 text-sm mb-3">
        <div class="text-gray-400 text-xs uppercase tracking-wide mb-1">GPS Location</div>
        <div class="flex justify-between">
          <span class="text-gray-400">Latitude</span>
          <span class="font-mono text-xs">${lat}°</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-400">Longitude</span>
          <span class="font-mono text-xs">${lng}°</span>
        </div>
        ${data?.altitude !== undefined ? `
        <div class="flex justify-between">
          <span class="text-gray-400">Altitude</span>
          <span class="font-mono text-xs">${data.altitude.toFixed(1)} m</span>
        </div>
        ` : ''}
      </div>
      
      ${metricsRows.length > 0 ? `
      <div class="space-y-1.5 text-sm pt-2 border-t border-gray-600">
        <div class="text-gray-400 text-xs uppercase tracking-wide mb-1">Metrics</div>
        ${metricsRows.join('')}
      </div>
      ` : ''}
      
      ${deviceIdRow}
      
      <div class="flex justify-between text-xs mt-2 pt-2 border-t border-gray-600">
        <span class="text-gray-400">Updated</span>
        <span>${new Date(sensor.lastUpdate).toLocaleTimeString()}</span>
      </div>
    </div>
  `;
}

function createSensorPopupContent(sensor: SensorMarker): string {
  // Use special popup for Starlink sensors
  if (sensor.type.toLowerCase() === 'starlink') {
    return createStarlinkPopupContent(sensor);
  }
  
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