/**
 * Aurora API Map Hooks
 * Uses unified /api/map/markers endpoint for optimized map data
 */

import { useQuery } from "@tanstack/react-query";
import { callAuroraApi, hasAuroraSession } from "./core";
import { MAP, buildQueryString } from "./endpoints";

// =============================================
// TYPES
// =============================================

export interface MapClientMarker {
  client_id: string;
  hostname: string;
  latitude: number;
  longitude: number;
  altitude?: number;
  source: string;
  source_device?: string;
  last_seen: string;
  metadata?: Record<string, string>;
  gps_satellites?: number;
}

export interface MapStarlinkMarker {
  device_id: string;
  client_id: string;
  latitude: number;
  longitude: number;
  connected: boolean;
  state: string;
  signal_strength?: number | null;
  snr?: number | null;
  downlink_mbps?: number;
  uplink_mbps?: number;
  ping_ms?: number;
  obstruction_percent?: number;
  gps_satellites?: number;
  last_seen: string;
}

export interface MapAdsbMarker {
  hex: string;
  flight?: string;
  latitude: number;
  longitude: number;
  altitude?: number;
  speed?: number;
  track?: number;
  squawk?: string;
  category?: string;
  last_seen: string;
}

export interface MapMarkersResponse {
  status: string;
  timestamp: string;
  clients: MapClientMarker[];
  starlink_dishes: MapStarlinkMarker[];
  adsb_aircraft: MapAdsbMarker[];
  counts: {
    clients: number;
    starlink_dishes: number;
    adsb_aircraft: number;
    total_markers: number;
  };
}

export interface MapMarkersOptions {
  includeClients?: boolean;
  includeStarlink?: boolean;
  includeAircraft?: boolean;
  clientId?: string;
  hours?: number;
}

// =============================================
// HOOKS
// =============================================

/**
 * Fetch unified map markers from backend
 * This single endpoint replaces multiple API calls for client, Starlink, and ADS-B data
 */
export function useMapMarkers(options: MapMarkersOptions = {}) {
  const {
    includeClients = true,
    includeStarlink = true,
    includeAircraft = true,
    clientId,
    hours = 1,
  } = options;

  const queryParams = buildQueryString({
    include_clients: includeClients,
    include_starlink: includeStarlink,
    include_aircraft: includeAircraft,
    client_id: clientId,
    hours,
  });

  const sessionActive = hasAuroraSession();
  console.log('[useMapMarkers] Session active:', sessionActive, 'options:', options);
  
  return useQuery({
    queryKey: ["aurora", "map", "markers", options],
    queryFn: async () => {
      console.log('[useMapMarkers] Fetching map markers...');
      const response = await callAuroraApi<MapMarkersResponse>(`${MAP.MARKERS}${queryParams}`);
      console.log('[useMapMarkers] Response:', {
        clients: response?.clients?.length ?? 0,
        starlink: response?.starlink_dishes?.length ?? 0,
        aircraft: response?.adsb_aircraft?.length ?? 0,
      });
      return response;
    },
    enabled: sessionActive,
    staleTime: 30_000,
    refetchInterval: 30_000,
    retry: 2,
  });
}

/**
 * Fetch only client markers
 */
export function useMapClientMarkers(clientId?: string, hours: number = 1) {
  return useMapMarkers({
    includeClients: true,
    includeStarlink: false,
    includeAircraft: false,
    clientId,
    hours,
  });
}

/**
 * Fetch only Starlink markers
 */
export function useMapStarlinkMarkers(clientId?: string, hours: number = 24) {
  return useMapMarkers({
    includeClients: false,
    includeStarlink: true,
    includeAircraft: false,
    clientId,
    hours,
  });
}

/**
 * Fetch only aircraft markers
 */
export function useMapAircraftMarkers(hours: number = 1) {
  return useMapMarkers({
    includeClients: false,
    includeStarlink: false,
    includeAircraft: true,
    hours,
  });
}
