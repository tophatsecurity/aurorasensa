import { Icon, divIcon } from "leaflet";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Fix Leaflet default marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Custom icons with better styling
export const createIcon = (color: string) => new Icon({
  iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Pulsing marker for aircraft
export const createPulsingIcon = (color: string) => divIcon({
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

// Pre-created icons for performance (singleton pattern)
export const mapIcons = {
  gps: createIcon('green'),
  adsb: createPulsingIcon('#06b6d4'),
  starlink: createIcon('violet'),
  client: createIcon('orange'),
  lora: createIcon('red'),
} as const;

export type IconType = keyof typeof mapIcons;
