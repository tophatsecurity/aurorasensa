// Aurora API - Real-Time Streams Hooks
// Based on API documentation at http://aurora.tophatsecurity.com:9151/docs
// Real-Time Stream endpoints (SSE):
// GET /api/stream/readings - Stream Readings Endpoint
// GET /api/stream/commands/{command_id}/status - Stream Command Status
// GET /api/stream/clients - Stream Clients Endpoint
// GET /api/stream/alerts - Stream Alerts Endpoint
// GET /api/stream/dashboard/stats - Stream Dashboard Stats
// GET /api/stream/readings/starlink - Stream Starlink Readings
// GET /api/stream/readings/thermal_probe - Stream Thermal Probe Readings
// GET /api/stream/readings/adsb - Stream ADSB Readings
// GET /api/stream/readings/arduino - Stream Arduino Readings
// GET /api/stream/readings/gps - Stream GPS Readings
// GET /api/stream/readings/power - Stream Power Readings
// GET /api/stream/readings/system_monitor - Stream System Monitor Readings
// GET /api/stream/readings/radio - Stream Radio Readings

// NOTE: These are SSE (Server-Sent Events) endpoints, not regular REST endpoints.
// Use the useSSE hook from useSSE.ts for connecting to these streams.

// Re-export STREAMS from centralized endpoints for backward compatibility
export { STREAMS as STREAM_ENDPOINTS } from "./endpoints";

// Type definitions for stream messages
export interface StreamReadingMessage {
  type: 'reading';
  timestamp: string;
  device_id: string;
  device_type: string;
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

// Export helper to build SSE URL for Aurora streams
export function getStreamUrl(endpoint: string, sessionCookie?: string): string {
  // In production, this would be proxied through the edge function
  // For now, return the relative path that will be handled by the SSE hook
  return endpoint;
}
