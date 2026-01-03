import { LatLngExpression } from "leaflet";
import type { LucideIcon } from "lucide-react";

export type FilterType = 'all' | 'gps' | 'starlink' | 'clients' | 'lora' | 'adsb';

export interface MapStats {
  total: number;
  gps: number;
  starlink: number;
  clients: number;
  lora: number;
  adsb: number;
}

export interface FilterButton {
  id: FilterType;
  label: string;
  icon: React.ReactNode;
  color: string;
  count: number;
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
}

export interface AdsbMarker extends SensorMarker {
  hex: string;
  speed?: number;
  track?: number;
  squawk?: string;
  rssi?: number;
  category?: string;
}

export interface ClientMarker {
  client_id: string;
  hostname: string;
  location: {
    lat: number;
    lng: number;
  };
}

export const MAP_CONFIG = {
  defaultCenter: [40.7128, -74.006] as LatLngExpression,
  defaultZoom: 10,
  tileUrl: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  backgroundColor: '#0f172a',
  autoRefreshInterval: 5000,
} as const;
