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

// Satellite icon for GPS/Starlink
export const createSatelliteIcon = (color: string, size: number = 24) => divIcon({
  className: 'custom-satellite-icon',
  html: `
    <div style="
      width: ${size}px;
      height: ${size}px;
      display: flex;
      align-items: center;
      justify-content: center;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
    ">
      <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M13 7 9 3 5 7l4 4"/>
        <path d="m17 11 4 4-4 4-4-4"/>
        <path d="m8 12 4 4 6-6-4-4Z"/>
        <path d="m16 8 3-3"/>
        <path d="M9 21a6 6 0 0 0-6-6"/>
      </svg>
    </div>
  `,
  iconSize: [size, size],
  iconAnchor: [size / 2, size / 2],
});

// Aircraft icon with direction line
export const createAircraftIcon = (
  type: 'large' | 'small' | 'helicopter' | 'drone' = 'small',
  heading: number = 0,
  color: string = '#06b6d4'
) => {
  const size = type === 'large' ? 32 : type === 'helicopter' ? 28 : type === 'drone' ? 22 : 24;
  
  // Different SVG paths for different aircraft types
  const getAircraftSvg = () => {
    switch (type) {
      case 'large':
        // Large commercial aircraft
        return `
          <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}" stroke="white" stroke-width="0.5">
            <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
          </svg>
        `;
      case 'helicopter':
        // Helicopter
        return `
          <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}" stroke="white" stroke-width="0.5">
            <path d="M4 10h16M12 2v8M12 10v10M4 21h16M8 14h8v4H8z"/>
            <circle cx="12" cy="12" r="2" fill="white"/>
          </svg>
        `;
      case 'drone':
        // Drone/UAV
        return `
          <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}" stroke="white" stroke-width="0.5">
            <rect x="9" y="9" width="6" height="6" rx="1"/>
            <circle cx="5" cy="5" r="2"/>
            <circle cx="19" cy="5" r="2"/>
            <circle cx="5" cy="19" r="2"/>
            <circle cx="19" cy="19" r="2"/>
            <line x1="7" y1="7" x2="9" y2="9" stroke="white" stroke-width="1.5"/>
            <line x1="17" y1="7" x2="15" y2="9" stroke="white" stroke-width="1.5"/>
            <line x1="7" y1="17" x2="9" y2="15" stroke="white" stroke-width="1.5"/>
            <line x1="17" y1="17" x2="15" y2="15" stroke="white" stroke-width="1.5"/>
          </svg>
        `;
      default:
        // Small aircraft (default)
        return `
          <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}" stroke="white" stroke-width="0.5">
            <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
          </svg>
        `;
    }
  };

  // Direction line length
  const lineLength = 20;

  return divIcon({
    className: 'custom-aircraft-icon',
    html: `
      <div style="
        position: relative;
        width: ${size + lineLength * 2}px;
        height: ${size + lineLength * 2}px;
      ">
        <!-- Direction line -->
        <div style="
          position: absolute;
          left: 50%;
          top: 50%;
          width: 2px;
          height: ${lineLength}px;
          background: linear-gradient(to top, transparent, ${color});
          transform-origin: bottom center;
          transform: translate(-50%, -100%) rotate(${heading}deg);
        "></div>
        <!-- Aircraft icon -->
        <div style="
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%) rotate(${heading}deg);
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
        ">
          ${getAircraftSvg()}
        </div>
      </div>
    `,
    iconSize: [size + lineLength * 2, size + lineLength * 2],
    iconAnchor: [(size + lineLength * 2) / 2, (size + lineLength * 2) / 2],
  });
};

// Determine aircraft type from category
export const getAircraftType = (category?: string): 'large' | 'small' | 'helicopter' | 'drone' => {
  if (!category) return 'small';
  
  const cat = category.toUpperCase();
  
  // Helicopters
  if (cat.includes('ROTORCRAFT') || cat.includes('HELICOPTER') || cat === 'A7') {
    return 'helicopter';
  }
  
  // Large aircraft
  if (cat.includes('HEAVY') || cat.includes('LARGE') || cat === 'A5' || cat === 'A4') {
    return 'large';
  }
  
  // Drones/UAVs
  if (cat.includes('UAV') || cat.includes('DRONE') || cat.includes('UNMANNED') || cat === 'B6' || cat === 'B7') {
    return 'drone';
  }
  
  // Light/small aircraft (default)
  return 'small';
};

// Get aircraft color based on status/attributes
export const getAircraftColor = (aircraft: { military?: boolean; emergency?: string; status?: string }) => {
  if (aircraft.emergency) return '#ef4444'; // Red for emergency
  if (aircraft.military) return '#f97316'; // Orange for military
  if (aircraft.status === 'historical') return '#8b5cf6'; // Purple for historical
  return '#06b6d4'; // Cyan for normal
};

// Pulsing marker for aircraft (legacy, kept for compatibility)
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

// Ship icon for AIS vessels
export const createShipIcon = (color: string = '#14b8a6', size: number = 28, heading: number = 0) => divIcon({
  className: 'custom-ship-icon',
  html: `
    <div style="
      width: ${size}px;
      height: ${size}px;
      display: flex;
      align-items: center;
      justify-content: center;
      transform: rotate(${heading}deg);
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
    ">
      <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}" stroke="white" stroke-width="1">
        <path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1 .6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>
        <path d="M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.9.94 5.34 2.81 7.76"/>
        <path d="M19 13V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6"/>
        <path d="M12 10v4"/>
        <path d="M12 2v3"/>
      </svg>
    </div>
  `,
  iconSize: [size, size],
  iconAnchor: [size / 2, size / 2],
});

// EPIRB emergency beacon icon with pulsing effect
export const createEpirbIcon = (color: string = '#f43f5e', size: number = 28) => divIcon({
  className: 'custom-epirb-icon',
  html: `
    <div style="
      width: ${size}px;
      height: ${size}px;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <!-- Pulsing rings for emergency effect -->
      <div style="
        position: absolute;
        width: ${size * 1.5}px;
        height: ${size * 1.5}px;
        border: 2px solid ${color};
        border-radius: 50%;
        opacity: 0.6;
        animation: epirb-pulse 1.5s ease-out infinite;
      "></div>
      <div style="
        position: absolute;
        width: ${size * 1.2}px;
        height: ${size * 1.2}px;
        border: 2px solid ${color};
        border-radius: 50%;
        opacity: 0.4;
        animation: epirb-pulse 1.5s ease-out infinite 0.3s;
      "></div>
      <!-- Icon -->
      <div style="
        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
        z-index: 1;
      ">
        <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}" stroke="white" stroke-width="1">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 8v4" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
          <circle cx="12" cy="16" r="1.5" fill="white"/>
        </svg>
      </div>
    </div>
    <style>
      @keyframes epirb-pulse {
        0% { transform: scale(0.8); opacity: 0.8; }
        100% { transform: scale(1.8); opacity: 0; }
      }
    </style>
  `,
  iconSize: [size * 2, size * 2],
  iconAnchor: [size, size],
});

// Antenna icon for APRS
export const createAprsIcon = (color: string = '#f59e0b', size: number = 26) => divIcon({
  className: 'custom-aprs-icon',
  html: `
    <div style="
      width: ${size}px;
      height: ${size}px;
      display: flex;
      align-items: center;
      justify-content: center;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
    ">
      <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M2 12 7 2"/>
        <path d="m7 12 5-10"/>
        <path d="m12 12 5-10"/>
        <path d="m17 12 5-10"/>
        <path d="M4.5 7h15"/>
        <path d="M12 16v6"/>
      </svg>
    </div>
  `,
  iconSize: [size, size],
  iconAnchor: [size / 2, size / 2],
});

// WiFi icon
export const createWifiIcon = (color: string = '#3b82f6', size: number = 26) => divIcon({
  className: 'custom-wifi-icon',
  html: `
    <div style="
      width: ${size}px;
      height: ${size}px;
      display: flex;
      align-items: center;
      justify-content: center;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
    ">
      <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 20h.01"/>
        <path d="M2 8.82a15 15 0 0 1 20 0"/>
        <path d="M5 12.859a10 10 0 0 1 14 0"/>
        <path d="M8.5 16.429a5 5 0 0 1 7 0"/>
      </svg>
    </div>
  `,
  iconSize: [size, size],
  iconAnchor: [size / 2, size / 2],
});

// Bluetooth icon
export const createBluetoothIcon = (color: string = '#6366f1', size: number = 26) => divIcon({
  className: 'custom-bluetooth-icon',
  html: `
    <div style="
      width: ${size}px;
      height: ${size}px;
      display: flex;
      align-items: center;
      justify-content: center;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
    ">
      <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}" stroke="white" stroke-width="0.5">
        <path d="m7 7 10 10-5 5V2l5 5L7 17"/>
      </svg>
    </div>
  `,
  iconSize: [size, size],
  iconAnchor: [size / 2, size / 2],
});

// LoRa radio icon
export const createLoraIcon = (color: string = '#ef4444', size: number = 26) => divIcon({
  className: 'custom-lora-icon',
  html: `
    <div style="
      width: ${size}px;
      height: ${size}px;
      display: flex;
      align-items: center;
      justify-content: center;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
    ">
      <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/>
        <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/>
        <circle cx="12" cy="12" r="2" fill="${color}"/>
        <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/>
        <path d="M19.1 4.9C23 8.8 23 15.1 19.1 19"/>
      </svg>
    </div>
  `,
  iconSize: [size, size],
  iconAnchor: [size / 2, size / 2],
});

// Pre-created icons for performance (singleton pattern) - for non-aircraft markers
export const mapIcons = {
  gps: createSatelliteIcon('#22c55e', 28),
  starlink: createSatelliteIcon('#8b5cf6', 28),
  client: createIcon('orange'),
  lora: createLoraIcon('#ef4444', 26),
  wifi: createWifiIcon('#3b82f6', 26),
  bluetooth: createBluetoothIcon('#6366f1', 26),
  aprs: createAprsIcon('#f59e0b', 26),
  ais: createShipIcon('#14b8a6', 28),
  epirb: createEpirbIcon('#f43f5e', 28),
  // Legacy adsb icon - use createAircraftIcon for dynamic icons
  adsb: createPulsingIcon('#06b6d4'),
} as const;

export type IconType = keyof typeof mapIcons;
