// Aurora API - Real-Time Streams Hooks
// Based on API documentation at http://aurora.tophatsecurity.com:9151/docs
// Last synced: 2026-02-13
//
// SSE Streaming Endpoints:
//
// General Streams:
//   GET /api/stream/readings              - Stream all readings
//   GET /api/stream/clients               - Stream all client updates
//   GET /api/stream/clients/{client_id}   - Stream specific client data
//   GET /api/stream/alerts                - Stream alerts
//   GET /api/stream/dashboard/stats       - Stream dashboard statistics
//   GET /api/stream/dashboard/clients     - Stream client status for dashboard
//   GET /api/stream/commands/{command_id}/status - Stream command execution status
//
// Sensor-Specific Streams:
//   GET /api/stream/readings/{sensor_type} - Stream readings for any sensor type
//   GET /api/stream/readings/starlink      - Stream Starlink readings
//   GET /api/stream/readings/thermal_probe - Stream Thermal Probe readings
//   GET /api/stream/readings/adsb          - Stream ADS-B readings
//   GET /api/stream/readings/arduino       - Stream Arduino readings
//   GET /api/stream/readings/gps           - Stream GPS readings
//   GET /api/stream/readings/power         - Stream Power readings
//   GET /api/stream/readings/system_monitor - Stream System Monitor readings
//   GET /api/stream/readings/radio         - Stream Radio readings
//
// Dedicated Streams:
//   GET /api/stream/starlink              - Stream Starlink telemetry (dedicated)
//   GET /api/stream/map/positions         - Stream map position updates
//   GET /api/stream/system/health         - Stream system health metrics
//
// Real-Time Statistics Streams:
//   GET /api/realtime/stream              - Stream real-time statistics
//   GET /api/realtime/stream/full         - Stream full real-time statistics

// Re-export STREAMS from centralized endpoints for backward compatibility
export { STREAMS as STREAM_ENDPOINTS } from "./endpoints";

// Type definitions for stream messages
export interface StreamReadingMessage {
  type: 'reading';
  timestamp: string;
  device_id: string;
  device_type: string;
  sensor_type?: string;
  client_id?: string;
  data: Record<string, unknown>;
}

export interface StreamClientMessage {
  type: 'client_update';
  client_id: string;
  status: string;
  last_seen: string;
  hostname?: string;
}

export interface StreamAlertMessage {
  type: 'alert';
  alert_id: string;
  severity: string;
  message: string;
  timestamp: string;
  device_id?: string;
  rule_id?: number;
}

export interface StreamDashboardStatsMessage {
  type: 'dashboard_stats';
  timestamp: string;
  total_clients: number;
  total_sensors: number;
  total_readings: number;
  active_alerts: number;
}

export interface StreamCommandStatusMessage {
  type: 'command_status';
  command_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress?: number;
  output?: string;
  error?: string;
}

export interface StreamMapPositionMessage {
  type: 'map_position';
  client_id: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  source?: string;
}

export interface StreamSystemHealthMessage {
  type: 'system_health';
  timestamp: string;
  cpu_percent?: number;
  memory_percent?: number;
  disk_percent?: number;
  uptime?: number;
}

export interface StreamRealtimeStatsMessage {
  type: 'realtime_stats';
  timestamp: string;
  readings_per_second?: number;
  active_clients?: number;
  active_sensors?: number;
  ingestion_rate?: number;
}

// Union type for all stream messages
export type StreamMessage = 
  | StreamReadingMessage
  | StreamClientMessage
  | StreamAlertMessage
  | StreamDashboardStatsMessage
  | StreamCommandStatusMessage
  | StreamMapPositionMessage
  | StreamSystemHealthMessage
  | StreamRealtimeStatsMessage;

// Export helper to build SSE URL for Aurora streams
export function getStreamUrl(endpoint: string, sessionCookie?: string): string {
  return endpoint;
}

// Stream type identifiers for the aurora-stream edge function proxy
export type StreamType = 
  | 'readings'
  | 'clients'
  | 'alerts'
  | 'dashboard'
  | 'dashboard_clients'
  | 'starlink'
  | 'starlink_readings'
  | 'thermal'
  | 'gps'
  | 'adsb'
  | 'arduino'
  | 'power'
  | 'system'
  | 'radio'
  | 'map_positions'
  | 'system_health'
  | 'realtime'
  | 'realtime_full'
  | 'command';
