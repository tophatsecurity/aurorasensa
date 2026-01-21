import { LatLngExpression } from "leaflet";
import type { LucideIcon } from "lucide-react";

export type FilterType = 'all' | 'gps' | 'starlink' | 'clients' | 'lora' | 'adsb' | 'wifi' | 'bluetooth' | 'aprs' | 'ais' | 'epirb';

export type ActiveFilters = Set<Exclude<FilterType, 'all'>>;

export interface MapStats {
  total: number;
  gps: number;
  starlink: number;
  clients: number;
  lora: number;
  adsb: number;
  wifi: number;
  bluetooth: number;
  aprs: number;
  ais: number;
  epirb: number;
  wifiDetections?: number;
  bluetoothDetections?: number;
}

export interface FilterButton {
  id: Exclude<FilterType, 'all'>;
  label: string;
  icon: React.ReactNode;
  color: string;
  count: number;
}

export interface StarlinkMetrics {
  connected?: boolean;
  signalStrength?: number;
  snr?: number;
  obstructionPercent?: number;
  uptimeSeconds?: number;
  downlinkThroughputBps?: number;
  uplinkThroughputBps?: number;
  latencyMs?: number;
  powerWatts?: number;
  altitude?: number;
  deviceId?: string;
}

export interface SensorMarker {
  id: string;
  name: string;
  type: string;
  value: number;
  unit: string;
  status: string;
  lastUpdate: string;
  location: {
    lat: number;
    lng: number;
  };
  starlinkData?: StarlinkMetrics;
}

export interface AdsbMarker extends SensorMarker {
  hex: string;
  speed?: number;
  track?: number;
  squawk?: string;
  rssi?: number;
  category?: string;
  // Extended fields
  registration?: string;
  operator?: string;
  aircraftType?: string;
  country?: string;
  military?: boolean;
  altGeom?: number;
  baroRate?: number;
  ias?: number;
  tas?: number;
  emergency?: string;
  messages?: number;
}

export type LocationSourceType = 'starlink' | 'gps' | 'sensor' | 'ip-geo' | 'unknown';

export interface ClientMarker {
  client_id: string;
  hostname: string;
  location: {
    lat: number;
    lng: number;
  };
  locationSource: LocationSourceType;
  city?: string;
  country?: string;
}

// Wireless detection marker (WiFi/Bluetooth devices detected by clients)
export interface WirelessDetectionMarker {
  id: string;
  type: 'wifi' | 'bluetooth';
  name: string; // SSID for WiFi, device name for Bluetooth
  client_id: string; // The client that detected this device
  location: {
    lat: number;
    lng: number;
  };
  rssi?: number;
  lastSeen: string;
  // WiFi specific
  bssid?: string;
  channel?: number;
  security?: string;
  // Bluetooth specific
  mac_address?: string;
  device_class?: string;
  manufacturer?: string;
}

export const MAP_CONFIG = {
  defaultCenter: [40.7128, -74.006] as LatLngExpression,
  defaultZoom: 10,
  tileUrl: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  backgroundColor: '#0f172a',
  autoRefreshInterval: 5000,
} as const;
