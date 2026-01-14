// Stats page type definitions

export interface SensorReading {
  device_id: string;
  device_type: string;
  client_id?: string;
  timestamp: string;
  data?: Record<string, unknown>;
  latitude?: number;
  longitude?: number;
}

export interface DeviceGroup {
  device_id: string;
  device_type: string;
  client_id: string;
  readings: SensorReading[];
  latest: SensorReading;
  location?: { lat: number; lng: number };
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
