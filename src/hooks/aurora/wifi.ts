// Aurora API - WiFi domain hooks
import { useQuery } from "@tanstack/react-query";
import { callAuroraApi, hasAuroraSession } from "./core";
import { WIFI } from "./endpoints";

// =============================================
// TYPES
// =============================================

export interface WifiScanner {
  device_id: string;
  client_id: string;
  status: string;
  last_seen?: string;
  scan_count?: number;
  networks_found?: number;
  metadata?: Record<string, unknown>;
}

export interface WifiNetwork {
  bssid: string;
  ssid?: string;
  rssi: number;
  channel?: number;
  frequency_mhz?: number;
  security?: string;
  encryption?: string;
  vendor?: string;
  first_seen?: string;
  last_seen?: string;
  seen_count?: number;
  scanner_id?: string;
  client_id?: string;
}

export interface WifiStats {
  total_scanners: number;
  active_scanners: number;
  total_networks_discovered: number;
  unique_networks_24h: number;
  scan_count_24h: number;
  avg_networks_per_scan: number;
  by_security?: Array<{
    security_type: string;
    count: number;
  }>;
  by_channel?: Array<{
    channel: number;
    count: number;
  }>;
}

export interface WifiHistoryPoint {
  timestamp: string;
  rssi: number;
  channel?: number;
  scanner_id?: string;
  client_id?: string;
}

// =============================================
// QUERY HOOKS - API responses are now flat
// =============================================

export function useWifiScanners(clientId?: string | null) {
  return useQuery({
    queryKey: ["aurora", "wifi", "devices", clientId],
    queryFn: async () => {
      const path = clientId ? `${WIFI.DEVICES}?client_id=${clientId}` : WIFI.DEVICES;
      const result = await callAuroraApi<WifiScanner[]>(path);
      return Array.isArray(result) ? result : [];
    },
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 1,
  });
}

export function useWifiScan(options?: {
  clientId?: string | null;
  deviceId?: string;
  hours?: number;
  limit?: number;
}) {
  const { clientId, deviceId, hours = 24, limit = 100 } = options || {};
  return useQuery({
    queryKey: ["aurora", "wifi", "scan", clientId, deviceId, hours, limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (clientId) params.set('client_id', clientId);
      if (deviceId) params.set('device_id', deviceId);
      params.set('hours', String(hours));
      params.set('limit', String(limit));
      const path = `${WIFI.SCAN}?${params.toString()}`;
      const result = await callAuroraApi<WifiNetwork[]>(path);
      return Array.isArray(result) ? result : [];
    },
    enabled: hasAuroraSession(),
    staleTime: 30000,
    refetchInterval: 60000,
    retry: 1,
  });
}

export function useWifiNetworks(options?: {
  clientId?: string | null;
  limit?: number;
  offset?: number;
}) {
  const { clientId, limit = 100, offset = 0 } = options || {};
  return useQuery({
    queryKey: ["aurora", "wifi", "networks", clientId, limit, offset],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (clientId) params.set('client_id', clientId);
      params.set('limit', String(limit));
      params.set('offset', String(offset));
      const path = `${WIFI.NETWORKS}?${params.toString()}`;
      const result = await callAuroraApi<{ networks: WifiNetwork[]; total?: number } | WifiNetwork[]>(path);
      if (Array.isArray(result)) return { networks: result, total: result.length };
      return { networks: result?.networks || [], total: result?.total || 0 };
    },
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 1,
  });
}

export function useWifiNearby(options?: {
  clientId?: string | null;
  rssiThreshold?: number;
  limit?: number;
}) {
  const { clientId, rssiThreshold = -70, limit = 50 } = options || {};
  return useQuery({
    queryKey: ["aurora", "wifi", "nearby", clientId, rssiThreshold, limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (clientId) params.set('client_id', clientId);
      params.set('rssi_threshold', String(rssiThreshold));
      params.set('limit', String(limit));
      const path = `${WIFI.NEARBY}?${params.toString()}`;
      const result = await callAuroraApi<WifiNetwork[]>(path);
      return Array.isArray(result) ? result : [];
    },
    enabled: hasAuroraSession(),
    staleTime: 30000,
    refetchInterval: 60000,
    retry: 1,
  });
}

export function useWifiStats(clientId?: string | null) {
  return useQuery({
    queryKey: ["aurora", "wifi", "stats", clientId],
    queryFn: async () => {
      const path = clientId ? `${WIFI.STATS}?client_id=${clientId}` : WIFI.STATS;
      return callAuroraApi<WifiStats>(path);
    },
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 1,
  });
}

export function useWifiHistory(bssid: string | null, options?: {
  clientId?: string | null;
  deviceId?: string;
  hours?: number;
  limit?: number;
}) {
  const { clientId, deviceId, hours = 24, limit = 100 } = options || {};
  return useQuery({
    queryKey: ["aurora", "wifi", "history", bssid, clientId, deviceId, hours, limit],
    queryFn: async () => {
      if (!bssid) return [];
      const params = new URLSearchParams();
      if (clientId) params.set('client_id', clientId);
      if (deviceId) params.set('device_id', deviceId);
      params.set('hours', String(hours));
      params.set('limit', String(limit));
      params.set('bssid', bssid);
      const path = `${WIFI.HISTORY}?${params.toString()}`;
      const result = await callAuroraApi<WifiHistoryPoint[]>(path);
      return Array.isArray(result) ? result : [];
    },
    enabled: hasAuroraSession() && !!bssid,
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 1,
  });
}
