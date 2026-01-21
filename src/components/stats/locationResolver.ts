/**
 * Location Resolver Utility
 * 
 * Resolves client location by checking all sensor data sources with priority:
 * 
 * PRIMARY SOURCES (Hardware GPS):
 * 1. Starlink - GPS from Starlink dish (most accurate for remote/maritime)
 * 2. GPS/GNSS - Dedicated GPS hardware (precise coordinates)
 * 3. LoRa - GPS-enabled LoRa devices
 * 4. Arduino - GPS-equipped Arduino sensors
 * 
 * SECONDARY SOURCES (Embedded location):
 * 5. Thermal/System/WiFi/Bluetooth - If location embedded in sensor data
 * 
 * FALLBACK SOURCES:
 * 6. IP Geolocation - Lookup based on client's external IP address
 * 
 * EXCLUDED:
 * - ADS-B: Reports aircraft positions, NOT receiver location
 */

import type { DeviceGroup, ClientInfo } from "./types";

export type LocationSource = 
  | 'starlink' 
  | 'gps' 
  | 'lora' 
  | 'arduino' 
  | 'adsb' 
  | 'thermal' 
  | 'system' 
  | 'wifi' 
  | 'bluetooth' 
  | 'geolocated' 
  | 'unknown';

export interface ResolvedLocation {
  city?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  altitude?: number;
  accuracy?: number;
  source: LocationSource;
  deviceId?: string;
  timestamp?: string;
  raw?: Record<string, unknown>;
}

interface LocationData {
  lat: number;
  lng: number;
  altitude?: number;
  accuracy?: number;
  city?: string;
  country?: string;
  timestamp?: string;
}

// Location source priorities (lower = higher priority)
// Note: ADS-B is excluded from location resolution (receivers report aircraft positions, not their own)
const SOURCE_PRIORITY: Record<LocationSource, number> = {
  starlink: 1,
  gps: 2,
  lora: 3,
  arduino: 4,
  thermal: 5,
  system: 6,
  wifi: 7,
  bluetooth: 8,
  geolocated: 9,
  adsb: 99,  // ADS-B should NOT be used for client location (it reports aircraft, not receiver position)
  unknown: 100,
};

/**
 * Extract location from nested data structures
 */
function extractLocationFromData(data: Record<string, unknown>): LocationData | null {
  // Direct lat/lng fields
  if (typeof data.latitude === 'number' && typeof data.longitude === 'number') {
    return {
      lat: data.latitude,
      lng: data.longitude,
      altitude: typeof data.altitude === 'number' ? data.altitude : undefined,
      accuracy: typeof data.accuracy === 'number' ? data.accuracy : undefined,
      city: typeof data.city === 'string' ? data.city : undefined,
      country: typeof data.country === 'string' ? data.country : undefined,
    };
  }

  // Check lat/lon variation
  if (typeof data.lat === 'number' && (typeof data.lon === 'number' || typeof data.lng === 'number')) {
    const lng = typeof data.lng === 'number' ? data.lng : data.lon as number;
    return {
      lat: data.lat,
      lng,
      altitude: typeof data.altitude === 'number' ? data.altitude : undefined,
    };
  }

  // Check location object
  const locationObj = data.location as Record<string, unknown> | undefined;
  if (locationObj) {
    if (typeof locationObj.latitude === 'number' && typeof locationObj.longitude === 'number') {
      return {
        lat: locationObj.latitude,
        lng: locationObj.longitude,
        altitude: typeof locationObj.altitude === 'number' ? locationObj.altitude : undefined,
        city: typeof locationObj.city === 'string' ? locationObj.city : undefined,
        country: typeof locationObj.country === 'string' ? locationObj.country : undefined,
      };
    }
    if (typeof locationObj.lat === 'number' && typeof locationObj.lng === 'number') {
      return {
        lat: locationObj.lat,
        lng: locationObj.lng,
      };
    }
  }

  // Check gps_location object
  const gpsLocation = data.gps_location as Record<string, unknown> | undefined;
  if (gpsLocation) {
    if (typeof gpsLocation.latitude === 'number' && typeof gpsLocation.longitude === 'number') {
      return {
        lat: gpsLocation.latitude,
        lng: gpsLocation.longitude,
        altitude: typeof gpsLocation.altitude === 'number' ? gpsLocation.altitude : undefined,
        accuracy: typeof gpsLocation.accuracy === 'number' ? gpsLocation.accuracy : undefined,
      };
    }
  }

  // Check location_detail object
  const locationDetail = data.location_detail as Record<string, unknown> | undefined;
  if (locationDetail) {
    if (typeof locationDetail.latitude === 'number' && typeof locationDetail.longitude === 'number') {
      return {
        lat: locationDetail.latitude,
        lng: locationDetail.longitude,
        altitude: typeof locationDetail.altitude === 'number' ? locationDetail.altitude : undefined,
        city: typeof locationDetail.city === 'string' ? locationDetail.city : undefined,
        country: typeof locationDetail.country === 'string' ? locationDetail.country : undefined,
      };
    }
  }

  // Check coordinates object
  const coords = data.coordinates as Record<string, unknown> | undefined;
  if (coords) {
    if (typeof coords.latitude === 'number' && typeof coords.longitude === 'number') {
      return {
        lat: coords.latitude,
        lng: coords.longitude,
      };
    }
    if (typeof coords.lat === 'number' && typeof coords.lng === 'number') {
      return {
        lat: coords.lat,
        lng: coords.lng,
      };
    }
  }

  // Check position object
  const position = data.position as Record<string, unknown> | undefined;
  if (position) {
    if (typeof position.latitude === 'number' && typeof position.longitude === 'number') {
      return {
        lat: position.latitude,
        lng: position.longitude,
        altitude: typeof position.altitude === 'number' ? position.altitude : undefined,
      };
    }
  }

  return null;
}

/**
 * Extract location from Starlink-specific data structures
 * Starlink dishes report GPS coordinates in various nested structures
 */
function extractStarlinkLocation(data: Record<string, unknown>): LocationData | null {
  // Check starlink nested object first
  const starlinkData = data.starlink as Record<string, unknown> | undefined;
  if (starlinkData) {
    // Direct coordinates in starlink object
    if (typeof starlinkData.latitude === 'number' && typeof starlinkData.longitude === 'number') {
      return {
        lat: starlinkData.latitude,
        lng: starlinkData.longitude,
        altitude: typeof starlinkData.altitude === 'number' ? starlinkData.altitude : undefined,
        city: typeof starlinkData.city === 'string' ? starlinkData.city : undefined,
        country: typeof starlinkData.country === 'string' ? starlinkData.country : undefined,
      };
    }
    
    // Check gps_* fields (common in Starlink data)
    if (typeof starlinkData.gps_latitude === 'number' && typeof starlinkData.gps_longitude === 'number') {
      return {
        lat: starlinkData.gps_latitude,
        lng: starlinkData.gps_longitude,
        altitude: typeof starlinkData.gps_altitude === 'number' ? starlinkData.gps_altitude : undefined,
      };
    }
    
    // Check dish_gps or device_gps nested object
    const dishGps = starlinkData.dish_gps as Record<string, unknown> | undefined;
    if (dishGps) {
      const loc = extractLocationFromData(dishGps);
      if (loc) return loc;
    }
    
    // Check nested structures
    const nestedLocation = extractLocationFromData(starlinkData);
    if (nestedLocation) return nestedLocation;
  }
  
  // Check for starlink_dish_* patterns at top level
  if (typeof data.starlink_latitude === 'number' && typeof data.starlink_longitude === 'number') {
    return {
      lat: data.starlink_latitude,
      lng: data.starlink_longitude,
    };
  }
  
  // Check gps_* fields at top level (Starlink often reports this way)
  if (typeof data.gps_latitude === 'number' && typeof data.gps_longitude === 'number') {
    return {
      lat: data.gps_latitude,
      lng: data.gps_longitude,
      altitude: typeof data.gps_altitude === 'number' ? data.gps_altitude : undefined,
    };
  }
  
  // Check dish_location object
  const dishLocation = data.dish_location as Record<string, unknown> | undefined;
  if (dishLocation) {
    const loc = extractLocationFromData(dishLocation);
    if (loc) return loc;
  }
  
  // Check device_info for location
  const deviceInfo = data.device_info as Record<string, unknown> | undefined;
  if (deviceInfo) {
    const loc = extractLocationFromData(deviceInfo);
    if (loc) return loc;
  }

  // Check top-level starlink fields
  return extractLocationFromData(data);
}

/**
 * Extract location from GPS-specific data structures
 */
function extractGpsLocation(data: Record<string, unknown>): LocationData | null {
  // Check gps nested object
  const gpsData = data.gps as Record<string, unknown> | undefined;
  if (gpsData) {
    const loc = extractLocationFromData(gpsData);
    if (loc) return loc;
  }

  // Check gnss nested object
  const gnssData = data.gnss as Record<string, unknown> | undefined;
  if (gnssData) {
    const loc = extractLocationFromData(gnssData);
    if (loc) return loc;
  }

  return extractLocationFromData(data);
}

/**
 * Extract location from Arduino data (may have GPS module)
 */
function extractArduinoLocation(data: Record<string, unknown>): LocationData | null {
  // Check arduino nested object
  const arduinoData = data.arduino as Record<string, unknown> | undefined;
  if (arduinoData) {
    const loc = extractLocationFromData(arduinoData);
    if (loc) return loc;
  }

  // Check sensors object (Arduino often has nested sensor data)
  const sensorsData = data.sensors as Record<string, unknown> | undefined;
  if (sensorsData) {
    // Check for GPS sensor in sensors
    const gpsSensor = sensorsData.gps as Record<string, unknown> | undefined;
    if (gpsSensor) {
      const loc = extractLocationFromData(gpsSensor);
      if (loc) return loc;
    }
  }

  return extractLocationFromData(data);
}

/**
 * Extract location from LoRa data
 */
function extractLoraLocation(data: Record<string, unknown>): LocationData | null {
  // Check lora nested object
  const loraData = data.lora as Record<string, unknown> | undefined;
  if (loraData) {
    const loc = extractLocationFromData(loraData);
    if (loc) return loc;
  }

  // Check for gateway location
  const gatewayData = data.gateway as Record<string, unknown> | undefined;
  if (gatewayData) {
    const loc = extractLocationFromData(gatewayData);
    if (loc) return loc;
  }

  return extractLocationFromData(data);
}

/**
 * Extract location from ADS-B data (receiver location)
 */
function extractAdsbLocation(data: Record<string, unknown>): LocationData | null {
  // Check receiver_location field
  const receiverLoc = data.receiver_location as Record<string, unknown> | undefined;
  if (receiverLoc) {
    const loc = extractLocationFromData(receiverLoc);
    if (loc) return loc;
  }

  // Check adsb nested object
  const adsbData = data.adsb as Record<string, unknown> | undefined;
  if (adsbData) {
    const loc = extractLocationFromData(adsbData);
    if (loc) return loc;
  }

  // Check for station location
  const stationLoc = data.station_location as Record<string, unknown> | undefined;
  if (stationLoc) {
    const loc = extractLocationFromData(stationLoc);
    if (loc) return loc;
  }

  return extractLocationFromData(data);
}

/**
 * Determine device type category from device_type string
 */
function getDeviceCategory(deviceType: string): LocationSource {
  const type = deviceType.toLowerCase();
  if (type.includes('starlink')) return 'starlink';
  if (type.includes('gps') || type.includes('gnss')) return 'gps';
  if (type.includes('lora')) return 'lora';
  if (type.includes('arduino')) return 'arduino';
  if (type.includes('adsb') || type.includes('aircraft')) return 'adsb';
  if (type.includes('thermal') || type.includes('probe')) return 'thermal';
  if (type.includes('system') || type.includes('monitor')) return 'system';
  if (type.includes('wifi')) return 'wifi';
  if (type.includes('bluetooth') || type.includes('ble')) return 'bluetooth';
  return 'geolocated';
}

/**
 * Extract location from a device based on its type
 */
function extractDeviceLocation(device: DeviceGroup): ResolvedLocation | null {
  const category = getDeviceCategory(device.device_type);
  
  // First check pre-extracted location with type safety
  if (device.location && 
      typeof device.location.lat === 'number' && 
      typeof device.location.lng === 'number' &&
      !isNaN(device.location.lat) && 
      !isNaN(device.location.lng)) {
    const data = device.latest?.data || {};
    return {
      latitude: device.location.lat,
      longitude: device.location.lng,
      source: category,
      deviceId: device.device_id,
      timestamp: device.latest?.timestamp,
      city: (data as Record<string, unknown>).city as string | undefined,
      country: (data as Record<string, unknown>).country as string | undefined,
    };
  }

  // Check latest reading data
  const data = device.latest?.data as Record<string, unknown> | undefined;
  if (!data) return null;

  let locationData: LocationData | null = null;

  switch (category) {
    case 'starlink':
      locationData = extractStarlinkLocation(data);
      break;
    case 'gps':
      locationData = extractGpsLocation(data);
      break;
    case 'arduino':
      locationData = extractArduinoLocation(data);
      break;
    case 'lora':
      locationData = extractLoraLocation(data);
      break;
    case 'adsb':
      locationData = extractAdsbLocation(data);
      break;
    default:
      locationData = extractLocationFromData(data);
  }

  if (locationData) {
    return {
      latitude: locationData.lat,
      longitude: locationData.lng,
      altitude: locationData.altitude,
      accuracy: locationData.accuracy,
      city: locationData.city,
      country: locationData.country,
      source: category,
      deviceId: device.device_id,
      timestamp: device.latest?.timestamp,
      raw: data,
    };
  }

  return null;
}

/**
 * Resolve the best location from all available sensor data
 */
export function resolveClientLocation(
  client?: ClientInfo | null,
  devices: DeviceGroup[] = []
): ResolvedLocation {
  const candidateLocations: ResolvedLocation[] = [];

  // Extract locations from all devices with validation
  for (const device of devices) {
    if (!device) continue;
    const location = extractDeviceLocation(device);
    if (location && 
        typeof location.latitude === 'number' && 
        typeof location.longitude === 'number' &&
        !isNaN(location.latitude) && 
        !isNaN(location.longitude)) {
      candidateLocations.push(location);
    }
  }

  // Sort by source priority
  candidateLocations.sort((a, b) => 
    SOURCE_PRIORITY[a.source] - SOURCE_PRIORITY[b.source]
  );

  // Return best location if found
  if (candidateLocations.length > 0) {
    return candidateLocations[0];
  }

  // Fallback: Client IP geolocation
  if (client?.location?.latitude && client?.location?.longitude) {
    return {
      latitude: client.location.latitude,
      longitude: client.location.longitude,
      city: client.location.city,
      country: client.location.country,
      source: 'geolocated',
    };
  }

  return { source: 'unknown' };
}

/**
 * Get all locations from all devices (for map display)
 */
export function getAllDeviceLocations(devices: DeviceGroup[]): ResolvedLocation[] {
  const locations: ResolvedLocation[] = [];

  for (const device of devices) {
    const location = extractDeviceLocation(device);
    if (location && location.latitude && location.longitude) {
      locations.push(location);
    }
  }

  return locations;
}

/**
 * Update device groups with extracted location data
 */
export function enrichDevicesWithLocations(devices: DeviceGroup[]): DeviceGroup[] {
  return devices.map(device => {
    // If device already has location, keep it
    if (device.location?.lat && device.location?.lng) {
      return device;
    }

    // Try to extract location from data
    const data = device.latest?.data as Record<string, unknown> | undefined;
    if (!data) return device;

    const category = getDeviceCategory(device.device_type);
    let locationData: LocationData | null = null;

    switch (category) {
      case 'starlink':
        locationData = extractStarlinkLocation(data);
        break;
      case 'gps':
        locationData = extractGpsLocation(data);
        break;
      case 'arduino':
        locationData = extractArduinoLocation(data);
        break;
      case 'lora':
        locationData = extractLoraLocation(data);
        break;
      case 'adsb':
        locationData = extractAdsbLocation(data);
        break;
      default:
        locationData = extractLocationFromData(data);
    }

    if (locationData) {
      return {
        ...device,
        location: { lat: locationData.lat, lng: locationData.lng },
      };
    }

    return device;
  });
}

// Source display helpers
export function getSourceIcon(source: LocationSource): string {
  switch (source) {
    case 'starlink': return 'Satellite';
    case 'gps': return 'Navigation';
    case 'lora': return 'Radio';
    case 'arduino': return 'Cpu';
    case 'adsb': return 'Plane';
    case 'thermal': return 'Thermometer';
    case 'system': return 'Monitor';
    case 'wifi': return 'Wifi';
    case 'bluetooth': return 'Bluetooth';
    case 'geolocated': return 'Globe';
    default: return 'HelpCircle';
  }
}

export function getSourceLabel(source: LocationSource): string {
  switch (source) {
    case 'starlink': return 'Starlink';
    case 'gps': return 'GPS';
    case 'lora': return 'LoRa';
    case 'arduino': return 'Arduino GPS';
    case 'adsb': return 'ADS-B Receiver';
    case 'thermal': return 'Thermal Probe';
    case 'system': return 'System';
    case 'wifi': return 'WiFi';
    case 'bluetooth': return 'Bluetooth';
    case 'geolocated': return 'IP Geolocation';
    default: return 'Unknown';
  }
}

export function getSourceColor(source: LocationSource): string {
  switch (source) {
    case 'starlink': return 'text-violet-400';
    case 'gps': return 'text-green-400';
    case 'lora': return 'text-red-400';
    case 'arduino': return 'text-orange-400';
    case 'adsb': return 'text-cyan-400';
    case 'thermal': return 'text-amber-400';
    case 'system': return 'text-slate-400';
    case 'wifi': return 'text-blue-400';
    case 'bluetooth': return 'text-indigo-400';
    case 'geolocated': return 'text-blue-400';
    default: return 'text-muted-foreground';
  }
}
