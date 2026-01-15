// Stats page type definitions
// Model: client_id → sensor → measurements

export interface Measurement {
  key: string;
  value: string | number | boolean;
  unit?: string;
  timestamp?: string;
}

export interface SensorReading {
  sensor_type: string;
  client_id: string;
  timestamp: string;
  data?: Record<string, unknown>;
  latitude?: number;
  longitude?: number;
  // Legacy fields for backward compatibility
  device_id?: string;
  device_type?: string;
}

export interface SensorGroup {
  sensor_type: string;
  client_id: string;
  readings: SensorReading[];
  latest: SensorReading;
  location?: { lat: number; lng: number };
  measurements: Measurement[];
}

export interface ClientInfo {
  client_id: string;
  hostname?: string;
  ip_address?: string;
  status?: string;
  state?: string;
  first_seen?: string;
  last_seen?: string;
  batches_received?: number;
  location?: {
    city?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
  };
}

export interface SystemInfo {
  cpu_percent?: number;
  memory_percent?: number;
  disk_percent?: number;
  uptime_seconds?: number;
  hostname?: string;
  os?: string;
  kernel?: string;
  ip_addresses?: string[];
}

// Legacy type aliases for backward compatibility during migration
/** @deprecated Use SensorReading instead */
export type DeviceReading = SensorReading;

/** @deprecated Use SensorGroup instead */
export interface DeviceGroup {
  device_id: string;
  device_type: string;
  client_id: string;
  readings: SensorReading[];
  latest: SensorReading;
  location?: { lat: number; lng: number };
}

// Helper to convert SensorGroup to legacy DeviceGroup format
export function sensorGroupToDeviceGroup(sensor: SensorGroup): DeviceGroup {
  return {
    device_id: sensor.sensor_type, // sensor_type becomes the identifier
    device_type: sensor.sensor_type,
    client_id: sensor.client_id,
    readings: sensor.readings,
    latest: sensor.latest,
    location: sensor.location,
  };
}

// Helper to convert DeviceGroup to SensorGroup format
export function deviceGroupToSensorGroup(device: DeviceGroup): SensorGroup {
  return {
    sensor_type: device.device_type,
    client_id: device.client_id,
    readings: device.readings,
    latest: device.latest,
    location: device.location,
    measurements: [],
  };
}
