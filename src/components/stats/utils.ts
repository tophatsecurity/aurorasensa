import { 
  Activity, 
  Satellite, 
  Thermometer, 
  Navigation, 
  Zap, 
  Wifi, 
  Radio 
} from "lucide-react";
import L from "leaflet";
import type { SensorReading, SensorGroup, Measurement, DeviceGroup } from "./types";

// Custom marker icon creator
export const createMarkerIcon = (color: string) => L.divIcon({
  className: 'custom-marker',
  html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

export function getSensorIcon(type: string) {
  switch (type.toLowerCase()) {
    case 'starlink':
    case 'starlink_dish_comprehensive':
      return Satellite;
    case 'thermal_probe':
    case 'temperature':
    case 'arduino_sensor_kit':
      return Thermometer;
    case 'gps':
      return Navigation;
    case 'power':
    case 'system_monitor':
      return Zap;
    case 'wifi':
    case 'wifi_scanner':
    case 'bluetooth':
    case 'bluetooth_scanner':
      return Wifi;
    case 'lora':
    case 'lora_detector':
    case 'radio':
      return Radio;
    default:
      return Activity;
  }
}

// Alias for backward compatibility
export const getDeviceIcon = getSensorIcon;

export function getSensorColor(type: string): string {
  switch (type.toLowerCase()) {
    case 'starlink':
    case 'starlink_dish_comprehensive':
      return 'bg-violet-500/20 text-violet-400';
    case 'thermal_probe':
    case 'temperature':
    case 'arduino_sensor_kit':
      return 'bg-orange-500/20 text-orange-400';
    case 'gps':
      return 'bg-emerald-500/20 text-emerald-400';
    case 'power':
    case 'system_monitor':
      return 'bg-yellow-500/20 text-yellow-400';
    case 'wifi':
    case 'wifi_scanner':
    case 'bluetooth':
    case 'bluetooth_scanner':
      return 'bg-blue-500/20 text-blue-400';
    case 'lora':
    case 'lora_detector':
    case 'radio':
      return 'bg-pink-500/20 text-pink-400';
    default:
      return 'bg-cyan-500/20 text-cyan-400';
  }
}

// Alias for backward compatibility
export const getDeviceColor = getSensorColor;

export function getMarkerColor(type: string): string {
  switch (type.toLowerCase()) {
    case 'starlink': 
    case 'starlink_dish_comprehensive': 
      return '#8b5cf6';
    case 'thermal_probe': 
    case 'temperature': 
    case 'arduino_sensor_kit':
      return '#f97316';
    case 'gps': 
      return '#10b981';
    case 'power': 
    case 'system_monitor':
      return '#eab308';
    case 'wifi': 
    case 'wifi_scanner':
    case 'bluetooth': 
    case 'bluetooth_scanner':
      return '#3b82f6';
    case 'lora': 
    case 'lora_detector':
    case 'radio': 
      return '#ec4899';
    default: 
      return '#06b6d4';
  }
}

export function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export function extractMeasurements(reading: SensorReading): Measurement[] {
  const measurements: Measurement[] = [];
  const data = reading.data || {};
  
  // Flatten nested data
  const flatData: Record<string, unknown> = {};
  
  Object.entries(data).forEach(([key, value]) => {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.entries(value as Record<string, unknown>).forEach(([subKey, subValue]) => {
        flatData[`${key}_${subKey}`] = subValue;
      });
    } else {
      flatData[key] = value;
    }
  });
  
  Object.entries(flatData).forEach(([key, value]) => {
    if (typeof value === 'number') {
      const unit = getUnit(key);
      measurements.push({ 
        key, 
        value: formatValue(value, key),
        unit 
      });
    } else if (typeof value === 'boolean') {
      measurements.push({ key, value: value ? 'Yes' : 'No', unit: '' });
    } else if (typeof value === 'string' && value.length < 20) {
      measurements.push({ key, value, unit: '' });
    }
  });
  
  return measurements;
}

function getUnit(key: string): string {
  const lower = key.toLowerCase();
  if (lower.includes('temp') || lower.includes('celsius')) return '°C';
  if (lower.includes('fahrenheit')) return '°F';
  if (lower.includes('humidity')) return '%';
  if (lower.includes('pressure')) return 'hPa';
  if (lower.includes('voltage')) return 'V';
  if (lower.includes('current')) return 'A';
  if (lower.includes('power') || lower.includes('watt')) return 'W';
  if (lower.includes('throughput') || lower.includes('bps')) return 'bps';
  if (lower.includes('latency') || lower.includes('ping')) return 'ms';
  if (lower.includes('percent') || lower.includes('obstruction')) return '%';
  if (lower.includes('snr') || lower.includes('signal')) return 'dB';
  if (lower.includes('altitude')) return 'm';
  if (lower.includes('speed')) return 'm/s';
  return '';
}

function formatValue(value: number, key: string): string {
  const lower = key.toLowerCase();
  
  // Format large numbers
  if (lower.includes('throughput') || lower.includes('bps')) {
    if (value > 1e9) return `${(value / 1e9).toFixed(2)} G`;
    if (value > 1e6) return `${(value / 1e6).toFixed(2)} M`;
    if (value > 1e3) return `${(value / 1e3).toFixed(2)} K`;
  }
  
  // Format percentages and small values
  if (Math.abs(value) < 0.01) return value.toExponential(2);
  if (Number.isInteger(value)) return value.toString();
  return value.toFixed(2);
}

// Extract location from reading data (handles nested Starlink location)
function extractLocationFromReading(reading: SensorReading): { lat: number; lng: number } | undefined {
  // First check top-level latitude/longitude
  if (reading.latitude && reading.longitude) {
    return { lat: reading.latitude, lng: reading.longitude };
  }
  
  const data = reading.data as Record<string, unknown> | undefined;
  if (!data) return undefined;
  
  // Check for Starlink location (nested in starlink object)
  const starlinkData = data.starlink as Record<string, unknown> | undefined;
  if (starlinkData) {
    // Check starlink.latitude/longitude directly
    if (typeof starlinkData.latitude === 'number' && typeof starlinkData.longitude === 'number') {
      return { lat: starlinkData.latitude, lng: starlinkData.longitude };
    }
    
    // Check starlink.location_detail
    const locationDetail = starlinkData.location_detail as Record<string, number> | undefined;
    if (locationDetail?.latitude && locationDetail?.longitude) {
      return { lat: locationDetail.latitude, lng: locationDetail.longitude };
    }
    
    // Check starlink.gps_location
    const gpsLocation = starlinkData.gps_location as Record<string, number> | undefined;
    if (gpsLocation?.latitude && gpsLocation?.longitude) {
      return { lat: gpsLocation.latitude, lng: gpsLocation.longitude };
    }
  }
  
  // Check for GPS data
  const gpsData = data.gps as Record<string, unknown> | undefined;
  if (gpsData) {
    if (typeof gpsData.latitude === 'number' && typeof gpsData.longitude === 'number') {
      return { lat: gpsData.latitude, lng: gpsData.longitude };
    }
  }
  
  // Check top-level data for lat/lng
  if (typeof data.latitude === 'number' && typeof data.longitude === 'number') {
    return { lat: data.latitude as number, lng: data.longitude as number };
  }
  
  return undefined;
}

// Process readings into sensor groups (new model: client_id → sensor → measurements)
export function processReadingsToSensorGroups(readings: SensorReading[]): SensorGroup[] {
  if (!readings) return [];
  
  const groups = new Map<string, SensorGroup>();
  
  readings.forEach((reading: SensorReading) => {
    // Key by client_id and sensor_type (not device_id)
    const sensorType = (reading as unknown as { device_type?: string }).device_type || reading.sensor_type || 'unknown';
    const clientId = reading.client_id || 'unknown';
    const key = `${clientId}:${sensorType}`;
    const location = extractLocationFromReading(reading);
    
    if (!groups.has(key)) {
      groups.set(key, {
        sensor_type: sensorType,
        client_id: clientId,
        readings: [],
        latest: reading,
        location,
        measurements: [],
      });
    }
    
    const group = groups.get(key)!;
    group.readings.push(reading);
    
    // Update latest if this reading is newer
    if (new Date(reading.timestamp) > new Date(group.latest.timestamp)) {
      group.latest = reading;
    }
    
    // Update location if available (prefer newer readings with location)
    if (location) {
      group.location = location;
    }
  });
  
  // Extract measurements from latest reading for each group
  groups.forEach(group => {
    group.measurements = extractMeasurements(group.latest);
  });
  
  return Array.from(groups.values());
}

// Legacy function - converts to DeviceGroup for backward compatibility
export function processReadingsToGroups(readings: SensorReading[]): DeviceGroup[] {
  if (!readings) return [];
  
  const groups = new Map<string, DeviceGroup>();
  
  readings.forEach((reading: SensorReading) => {
    // Handle both old format (device_id/device_type) and new format (sensor_type)
    const legacyReading = reading as unknown as { device_id?: string; device_type?: string };
    const deviceId = legacyReading.device_id || reading.sensor_type || 'unknown';
    const deviceType = legacyReading.device_type || reading.sensor_type || 'unknown';
    const clientId = reading.client_id || 'unknown';
    const key = `${clientId}:${deviceType}`;
    const location = extractLocationFromReading(reading);
    
    if (!groups.has(key)) {
      groups.set(key, {
        device_id: deviceId,
        device_type: deviceType,
        client_id: clientId,
        readings: [],
        latest: reading,
        location
      });
    }
    
    const group = groups.get(key)!;
    group.readings.push(reading);
    
    // Update latest if this reading is newer
    if (new Date(reading.timestamp) > new Date(group.latest.timestamp)) {
      group.latest = reading;
    }
    
    // Update location if available (prefer newer readings with location)
    if (location) {
      group.location = location;
    }
  });
  
  return Array.from(groups.values());
}

// Calculate map center from sensor groups
export function calculateMapCenter(sensorsWithLocation: Array<{ location?: { lat: number; lng: number } }>): { lat: number; lng: number } {
  const withLocation = sensorsWithLocation.filter(s => s.location);
  if (withLocation.length === 0) return { lat: 0, lng: 0 };
  const lats = withLocation.map(s => s.location!.lat);
  const lngs = withLocation.map(s => s.location!.lng);
  return {
    lat: lats.reduce((a, b) => a + b, 0) / lats.length,
    lng: lngs.reduce((a, b) => a + b, 0) / lngs.length
  };
}

// Helper to format sensor type for display
export function formatSensorType(type: string): string {
  return type
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}
