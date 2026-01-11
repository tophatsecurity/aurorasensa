// Aurora API - Maritime & Radio Hooks (AIS, APRS, EPIRB)
// NOTE: These endpoints are NOT YET IMPLEMENTED on the Aurora server.
// All hooks are disabled (enabled: false) to prevent 404 errors.
// Re-enable when the Aurora API adds maritime endpoints.

import { useQuery } from "@tanstack/react-query";
import { callAuroraApi, hasAuroraSession, fastQueryOptions, defaultQueryOptions } from "./core";

// Flag to enable/disable maritime API calls (set to true when Aurora adds these endpoints)
const MARITIME_API_ENABLED = false;

// =============================================
// TYPE DEFINITIONS
// =============================================
export interface AisVessel {
  mmsi: string;
  name?: string;
  callsign?: string;
  imo?: string;
  ship_type?: number;
  ship_type_name?: string;
  lat: number;
  lon: number;
  course?: number;
  speed?: number;
  heading?: number;
  destination?: string;
  eta?: string;
  draught?: number;
  length?: number;
  width?: number;
  nav_status?: number;
  nav_status_name?: string;
  last_seen?: string;
  timestamp?: string;
  country?: string;
  flag?: string;
}

export interface AisStats {
  total_vessels: number;
  active_vessels: number;
  vessels_last_hour: number;
  vessels_last_24h: number;
  avg_speed?: number;
  coverage_area_nm?: number;
}

export interface AprsStation {
  callsign: string;
  ssid?: string;
  lat: number;
  lon: number;
  altitude?: number;
  course?: number;
  speed?: number;
  symbol?: string;
  symbol_table?: string;
  comment?: string;
  path?: string;
  timestamp?: string;
  last_seen?: string;
  weather?: {
    temperature?: number;
    humidity?: number;
    pressure?: number;
    wind_speed?: number;
    wind_direction?: number;
    rain_1h?: number;
  };
  telemetry?: Record<string, number>;
}

export interface AprsStats {
  total_stations: number;
  active_stations: number;
  packets_last_hour: number;
  packets_last_24h: number;
  digipeaters: number;
  igates: number;
  weather_stations: number;
}

export interface AprsPacket {
  id: string;
  raw: string;
  from_callsign: string;
  to_callsign: string;
  path?: string;
  packet_type: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

export interface EpirbBeacon {
  beacon_id: string;
  hex_id: string;
  lat: number;
  lon: number;
  altitude?: number;
  activation_time?: string;
  last_seen?: string;
  beacon_type?: string;
  country_code?: string;
  protocol?: string;
  status: 'active' | 'test' | 'resolved' | 'unknown';
  owner_info?: {
    name?: string;
    vessel_name?: string;
    contact?: string;
  };
  signal_strength?: number;
}

export interface EpirbStats {
  total_beacons: number;
  active_alerts: number;
  test_alerts: number;
  resolved_last_24h: number;
}

// =============================================
// AIS HOOKS
// =============================================

export function useAisVessels() {
  return useQuery({
    queryKey: ["aurora", "ais", "vessels"],
    queryFn: () => callAuroraApi<AisVessel[]>("/api/ais/vessels"),
    enabled: MARITIME_API_ENABLED && hasAuroraSession(),
    ...fastQueryOptions,
  });
}

export function useAisVessel(mmsi: string) {
  return useQuery({
    queryKey: ["aurora", "ais", "vessel", mmsi],
    queryFn: () => callAuroraApi<AisVessel>(`/api/ais/vessels/${mmsi}`),
    enabled: MARITIME_API_ENABLED && hasAuroraSession() && !!mmsi,
    retry: 2,
  });
}

export function useAisStats() {
  return useQuery({
    queryKey: ["aurora", "ais", "stats"],
    queryFn: () => callAuroraApi<AisStats>("/api/ais/stats"),
    enabled: MARITIME_API_ENABLED && hasAuroraSession(),
    ...defaultQueryOptions,
  });
}

export function useAisNearby(lat?: number, lon?: number, radiusNm: number = 25) {
  return useQuery({
    queryKey: ["aurora", "ais", "nearby", lat, lon, radiusNm],
    queryFn: () => callAuroraApi<AisVessel[]>(`/api/ais/nearby?lat=${lat}&lon=${lon}&radius_nm=${radiusNm}`),
    enabled: MARITIME_API_ENABLED && hasAuroraSession() && lat !== undefined && lon !== undefined,
    ...fastQueryOptions,
  });
}

export function useAisVesselHistory(mmsi: string, hours: number = 24) {
  return useQuery({
    queryKey: ["aurora", "ais", "history", mmsi, hours],
    queryFn: () => callAuroraApi<Array<{ lat: number; lon: number; course?: number; speed?: number; timestamp: string }>>(`/api/ais/history/${mmsi}?hours=${hours}`),
    enabled: MARITIME_API_ENABLED && hasAuroraSession() && !!mmsi,
    retry: 2,
  });
}

export function useAisHistorical(minutes: number = 60) {
  return useQuery({
    queryKey: ["aurora", "ais", "historical", minutes],
    queryFn: () => callAuroraApi<{ readings: Array<{ device_id: string; timestamp: string; data: Record<string, unknown> }>; count: number }>(
      `/api/readings/sensor/ais?hours=${Math.ceil(minutes / 60)}`
    ),
    enabled: MARITIME_API_ENABLED && hasAuroraSession(),
    ...fastQueryOptions,
  });
}

// =============================================
// APRS HOOKS
// =============================================

export function useAprsStations() {
  return useQuery({
    queryKey: ["aurora", "aprs", "stations"],
    queryFn: () => callAuroraApi<AprsStation[]>("/api/aprs/stations"),
    enabled: MARITIME_API_ENABLED && hasAuroraSession(),
    ...fastQueryOptions,
  });
}

export function useAprsStation(callsign: string) {
  return useQuery({
    queryKey: ["aurora", "aprs", "station", callsign],
    queryFn: () => callAuroraApi<AprsStation>(`/api/aprs/stations/${callsign}`),
    enabled: MARITIME_API_ENABLED && hasAuroraSession() && !!callsign,
    retry: 2,
  });
}

export function useAprsStats() {
  return useQuery({
    queryKey: ["aurora", "aprs", "stats"],
    queryFn: () => callAuroraApi<AprsStats>("/api/aprs/stats"),
    enabled: MARITIME_API_ENABLED && hasAuroraSession(),
    ...defaultQueryOptions,
  });
}

export function useAprsPackets(limit: number = 100) {
  return useQuery({
    queryKey: ["aurora", "aprs", "packets", limit],
    queryFn: () => callAuroraApi<AprsPacket[]>(`/api/aprs/packets?limit=${limit}`),
    enabled: MARITIME_API_ENABLED && hasAuroraSession(),
    ...fastQueryOptions,
  });
}

export function useAprsNearby(lat?: number, lon?: number, radiusKm: number = 50) {
  return useQuery({
    queryKey: ["aurora", "aprs", "nearby", lat, lon, radiusKm],
    queryFn: () => callAuroraApi<AprsStation[]>(`/api/aprs/nearby?lat=${lat}&lon=${lon}&radius_km=${radiusKm}`),
    enabled: MARITIME_API_ENABLED && hasAuroraSession() && lat !== undefined && lon !== undefined,
    ...fastQueryOptions,
  });
}

export function useAprsStationHistory(callsign: string, hours: number = 24) {
  return useQuery({
    queryKey: ["aurora", "aprs", "history", callsign, hours],
    queryFn: () => callAuroraApi<Array<{ lat: number; lon: number; altitude?: number; timestamp: string }>>(`/api/aprs/history/${callsign}?hours=${hours}`),
    enabled: MARITIME_API_ENABLED && hasAuroraSession() && !!callsign,
    retry: 2,
  });
}

export function useAprsHistorical(minutes: number = 60) {
  return useQuery({
    queryKey: ["aurora", "aprs", "historical", minutes],
    queryFn: () => callAuroraApi<{ readings: Array<{ device_id: string; timestamp: string; data: Record<string, unknown> }>; count: number }>(
      `/api/readings/sensor/aprs?hours=${Math.ceil(minutes / 60)}`
    ),
    enabled: MARITIME_API_ENABLED && hasAuroraSession(),
    ...fastQueryOptions,
  });
}

export function useAprsWeatherStations() {
  return useQuery({
    queryKey: ["aurora", "aprs", "weather"],
    queryFn: () => callAuroraApi<AprsStation[]>("/api/aprs/weather"),
    enabled: MARITIME_API_ENABLED && hasAuroraSession(),
    ...defaultQueryOptions,
  });
}

// =============================================
// EPIRB HOOKS
// =============================================

export function useEpirbBeacons() {
  return useQuery({
    queryKey: ["aurora", "epirb", "beacons"],
    queryFn: () => callAuroraApi<EpirbBeacon[]>("/api/epirb/beacons"),
    enabled: MARITIME_API_ENABLED && hasAuroraSession(),
    ...fastQueryOptions,
  });
}

export function useEpirbBeacon(beaconId: string) {
  return useQuery({
    queryKey: ["aurora", "epirb", "beacon", beaconId],
    queryFn: () => callAuroraApi<EpirbBeacon>(`/api/epirb/beacons/${beaconId}`),
    enabled: MARITIME_API_ENABLED && hasAuroraSession() && !!beaconId,
    retry: 2,
  });
}

export function useEpirbStats() {
  return useQuery({
    queryKey: ["aurora", "epirb", "stats"],
    queryFn: () => callAuroraApi<EpirbStats>("/api/epirb/stats"),
    enabled: MARITIME_API_ENABLED && hasAuroraSession(),
    ...defaultQueryOptions,
  });
}

export function useEpirbActiveAlerts() {
  return useQuery({
    queryKey: ["aurora", "epirb", "active"],
    queryFn: () => callAuroraApi<EpirbBeacon[]>("/api/epirb/active"),
    enabled: MARITIME_API_ENABLED && hasAuroraSession(),
    ...fastQueryOptions,
  });
}

export function useEpirbHistory(beaconId: string, hours: number = 24) {
  return useQuery({
    queryKey: ["aurora", "epirb", "history", beaconId, hours],
    queryFn: () => callAuroraApi<Array<{ lat: number; lon: number; signal_strength?: number; timestamp: string }>>(`/api/epirb/history/${beaconId}?hours=${hours}`),
    enabled: MARITIME_API_ENABLED && hasAuroraSession() && !!beaconId,
    retry: 2,
  });
}

export function useEpirbHistorical(minutes: number = 60) {
  return useQuery({
    queryKey: ["aurora", "epirb", "historical", minutes],
    queryFn: () => callAuroraApi<{ readings: Array<{ device_id: string; timestamp: string; data: Record<string, unknown> }>; count: number }>(
      `/api/readings/sensor/epirb?hours=${Math.ceil(minutes / 60)}`
    ),
    enabled: MARITIME_API_ENABLED && hasAuroraSession(),
    ...fastQueryOptions,
  });
}
