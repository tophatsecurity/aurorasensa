// Aurora API - Bluetooth domain hooks
// Updated to use all /api/bluetooth/* dedicated endpoints
import { useQuery } from "@tanstack/react-query";
import { callAuroraApi, hasAuroraSession } from "./core";
import { BLUETOOTH } from "./endpoints";

// =============================================
// TYPES
// =============================================

export interface BluetoothScanner {
  device_id: string;
  client_id: string;
  status: string;
  last_seen?: string;
  scan_count?: number;
  devices_found?: number;
  metadata?: Record<string, unknown>;
}

export interface BluetoothDevice {
  mac_address: string;
  name?: string;
  rssi: number;
  device_class?: string;
  device_type?: string;
  manufacturer?: string;
  services?: string[];
  is_connectable?: boolean;
  first_seen?: string;
  last_seen?: string;
  seen_count?: number;
  scanner_id?: string;
  client_id?: string;
}

export interface BluetoothStats {
  total_scanners: number;
  active_scanners: number;
  total_devices_discovered: number;
  unique_devices_24h: number;
  scan_count_24h: number;
  avg_devices_per_scan: number;
  by_device_type?: Array<{
    device_type: string;
    count: number;
  }>;
}

export interface BluetoothHistoryPoint {
  timestamp: string;
  rssi: number;
  scanner_id?: string;
  client_id?: string;
}

export interface BluetoothSummary {
  total_scanners: number;
  active_scanners: number;
  total_devices: number;
  unique_devices: number;
  avg_signal_strength: number;
  by_type?: Array<{ device_type: string; count: number }>;
}

export interface BluetoothByTypeResult {
  device_type: string;
  count: number;
  devices: BluetoothDevice[];
}

// =============================================
// QUERY HOOKS
// =============================================

export function useBluetoothScanners(clientId?: string | null) {
  return useQuery({
    queryKey: ["aurora", "bluetooth", "devices", clientId],
    queryFn: async () => {
      const path = clientId ? `${BLUETOOTH.DEVICES}?client_id=${clientId}` : BLUETOOTH.DEVICES;
      const result = await callAuroraApi<BluetoothScanner[]>(path);
      return Array.isArray(result) ? result : [];
    },
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 1,
  });
}

export function useBluetoothScan(options?: {
  clientId?: string | null;
  deviceId?: string;
  hours?: number;
  limit?: number;
}) {
  const { clientId, deviceId, hours = 24, limit = 100 } = options || {};
  return useQuery({
    queryKey: ["aurora", "bluetooth", "scan", clientId, deviceId, hours, limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (clientId) params.set('client_id', clientId);
      if (deviceId) params.set('device_id', deviceId);
      params.set('hours', String(hours));
      params.set('limit', String(limit));
      const path = `${BLUETOOTH.SCAN}?${params.toString()}`;
      const result = await callAuroraApi<BluetoothDevice[]>(path);
      return Array.isArray(result) ? result : [];
    },
    enabled: hasAuroraSession(),
    staleTime: 30000,
    refetchInterval: 60000,
    retry: 1,
  });
}

export function useBluetoothNearby(options?: {
  clientId?: string | null;
  rssiThreshold?: number;
  limit?: number;
}) {
  const { clientId, rssiThreshold = -60, limit = 50 } = options || {};
  return useQuery({
    queryKey: ["aurora", "bluetooth", "nearby", clientId, rssiThreshold, limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (clientId) params.set('client_id', clientId);
      params.set('rssi_threshold', String(rssiThreshold));
      params.set('limit', String(limit));
      const path = `${BLUETOOTH.NEARBY}?${params.toString()}`;
      const result = await callAuroraApi<BluetoothDevice[]>(path);
      return Array.isArray(result) ? result : [];
    },
    enabled: hasAuroraSession(),
    staleTime: 30000,
    refetchInterval: 60000,
    retry: 1,
  });
}

export function useBluetoothStats(clientId?: string | null) {
  return useQuery({
    queryKey: ["aurora", "bluetooth", "stats", clientId],
    queryFn: async () => {
      const path = clientId ? `${BLUETOOTH.STATS}?client_id=${clientId}` : BLUETOOTH.STATS;
      return callAuroraApi<BluetoothStats>(path);
    },
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 1,
  });
}

export function useBluetoothHistory(macAddress: string | null, options?: {
  clientId?: string | null;
  deviceId?: string;
  hours?: number;
  limit?: number;
}) {
  const { clientId, deviceId, hours = 24, limit = 100 } = options || {};
  return useQuery({
    queryKey: ["aurora", "bluetooth", "history", macAddress, clientId, deviceId, hours, limit],
    queryFn: async () => {
      if (!macAddress) return [];
      const params = new URLSearchParams();
      if (clientId) params.set('client_id', clientId);
      if (deviceId) params.set('device_id', deviceId);
      params.set('hours', String(hours));
      params.set('limit', String(limit));
      params.set('mac_address', macAddress);
      const path = `${BLUETOOTH.HISTORY}?${params.toString()}`;
      const result = await callAuroraApi<BluetoothHistoryPoint[]>(path);
      return Array.isArray(result) ? result : [];
    },
    enabled: hasAuroraSession() && !!macAddress,
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 1,
  });
}

/** Get Bluetooth summary from /api/bluetooth/summary */
export function useBluetoothSummary(clientId?: string | null) {
  return useQuery({
    queryKey: ["aurora", "bluetooth", "summary", clientId],
    queryFn: async () => {
      const path = clientId ? `${BLUETOOTH.SUMMARY}?client_id=${clientId}` : BLUETOOTH.SUMMARY;
      return callAuroraApi<BluetoothSummary>(path);
    },
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 1,
  });
}

/** Get Bluetooth devices grouped by type from /api/bluetooth/by-type */
export function useBluetoothByType(clientId?: string | null) {
  return useQuery({
    queryKey: ["aurora", "bluetooth", "by-type", clientId],
    queryFn: async () => {
      const path = clientId ? `${BLUETOOTH.BY_TYPE}?client_id=${clientId}` : BLUETOOTH.BY_TYPE;
      const result = await callAuroraApi<BluetoothByTypeResult[]>(path);
      return Array.isArray(result) ? result : [];
    },
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 1,
  });
}

/** Get Bluetooth scanner devices from /api/bluetooth/scanners */
export function useBluetoothScannerDevices() {
  return useQuery({
    queryKey: ["aurora", "bluetooth", "scanners"],
    queryFn: async () => {
      const result = await callAuroraApi<BluetoothScanner[]>(BLUETOOTH.SCANNERS);
      return Array.isArray(result) ? result : [];
    },
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 1,
  });
}

/** Get Bluetooth devices for a specific client from /api/bluetooth/clients/{clientId}/devices */
export function useBluetoothClientDevices(clientId: string | null) {
  return useQuery({
    queryKey: ["aurora", "bluetooth", "client-devices", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const result = await callAuroraApi<BluetoothDevice[]>(BLUETOOTH.CLIENT_DEVICES(clientId));
      return Array.isArray(result) ? result : [];
    },
    enabled: hasAuroraSession() && !!clientId,
    staleTime: 30000,
    refetchInterval: 60000,
    retry: 1,
  });
}
