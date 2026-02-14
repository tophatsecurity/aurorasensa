// Aurora API - Thermal Probe dedicated hooks
// Uses /api/thermal/* endpoints
import { useQuery } from "@tanstack/react-query";
import { callAuroraApi, hasAuroraSession, defaultQueryOptions, fastQueryOptions } from "./core";
import { THERMAL, withQuery } from "./endpoints";

// =============================================
// TYPES
// =============================================

export interface ThermalDevice {
  device_id: string;
  client_id: string;
  status?: string;
  last_seen?: string;
  metadata?: Record<string, unknown>;
}

export interface ThermalReading {
  timestamp: string;
  device_id?: string;
  client_id?: string;
  temperature_c?: number;
  temperature_f?: number;
  probe_id?: string;
  status?: string;
}

export interface ThermalStats {
  device_count?: number;
  total_readings?: number;
  avg_temperature_c?: number;
  min_temperature_c?: number;
  max_temperature_c?: number;
  readings_last_hour?: number;
  readings_last_24h?: number;
}

export interface ThermalStatus {
  devices: Array<{
    device_id: string;
    client_id: string;
    status: string;
    last_temperature_c?: number;
    last_seen?: string;
  }>;
}

// =============================================
// HOOKS
// =============================================

/** List thermal probe devices from /api/thermal/devices */
export function useThermalDevices(clientId?: string) {
  return useQuery({
    queryKey: ["aurora", "thermal", "devices", clientId],
    queryFn: async () => {
      const path = clientId ? `${THERMAL.DEVICES}?client_id=${clientId}` : THERMAL.DEVICES;
      const result = await callAuroraApi<ThermalDevice[] | { devices: ThermalDevice[] }>(path);
      if (Array.isArray(result)) return result;
      return result?.devices || [];
    },
    enabled: hasAuroraSession(),
    ...fastQueryOptions,
    retry: 1,
  });
}

/** Get latest thermal readings from /api/thermal/latest */
export function useThermalLatest(clientId?: string) {
  return useQuery({
    queryKey: ["aurora", "thermal", "latest", clientId],
    queryFn: async () => {
      const path = clientId ? `${THERMAL.LATEST}?client_id=${clientId}` : THERMAL.LATEST;
      const result = await callAuroraApi<ThermalReading[] | ThermalReading>(path);
      return Array.isArray(result) ? result : result ? [result] : [];
    },
    enabled: hasAuroraSession(),
    ...fastQueryOptions,
    retry: 1,
  });
}

/** Get Celsius readings from /api/thermal/celsius */
export function useThermalCelsius(hours: number = 24, clientId?: string) {
  return useQuery({
    queryKey: ["aurora", "thermal", "celsius", hours, clientId],
    queryFn: async () => {
      const params: Record<string, string | number | undefined> = { hours };
      if (clientId) params.client_id = clientId;
      const result = await callAuroraApi<ThermalReading[]>(withQuery(THERMAL.CELSIUS, params));
      return Array.isArray(result) ? result : [];
    },
    enabled: hasAuroraSession(),
    ...defaultQueryOptions,
    retry: 1,
  });
}

/** Get Fahrenheit readings from /api/thermal/fahrenheit */
export function useThermalFahrenheit(hours: number = 24, clientId?: string) {
  return useQuery({
    queryKey: ["aurora", "thermal", "fahrenheit", hours, clientId],
    queryFn: async () => {
      const params: Record<string, string | number | undefined> = { hours };
      if (clientId) params.client_id = clientId;
      const result = await callAuroraApi<ThermalReading[]>(withQuery(THERMAL.FAHRENHEIT, params));
      return Array.isArray(result) ? result : [];
    },
    enabled: hasAuroraSession(),
    ...defaultQueryOptions,
    retry: 1,
  });
}

/** Get thermal history from /api/thermal/history */
export function useThermalHistory(hours: number = 24, clientId?: string, deviceId?: string) {
  return useQuery({
    queryKey: ["aurora", "thermal", "history", hours, clientId, deviceId],
    queryFn: async () => {
      const params: Record<string, string | number | undefined> = { hours };
      if (clientId) params.client_id = clientId;
      if (deviceId) params.device_id = deviceId;
      const result = await callAuroraApi<ThermalReading[]>(withQuery(THERMAL.HISTORY, params));
      return Array.isArray(result) ? result : [];
    },
    enabled: hasAuroraSession(),
    ...defaultQueryOptions,
    retry: 1,
  });
}

/** Get thermal stats from /api/thermal/stats */
export function useThermalStats(clientId?: string) {
  return useQuery({
    queryKey: ["aurora", "thermal", "stats", clientId],
    queryFn: async () => {
      const path = clientId ? `${THERMAL.STATS}?client_id=${clientId}` : THERMAL.STATS;
      return callAuroraApi<ThermalStats>(path);
    },
    enabled: hasAuroraSession(),
    ...defaultQueryOptions,
    retry: 1,
  });
}

/** Get thermal probe status from /api/thermal/status */
export function useThermalStatus() {
  return useQuery({
    queryKey: ["aurora", "thermal", "status"],
    queryFn: async () => {
      const result = await callAuroraApi<ThermalStatus | ThermalStatus['devices']>(THERMAL.STATUS);
      if (Array.isArray(result)) return { devices: result };
      return result;
    },
    enabled: hasAuroraSession(),
    ...fastQueryOptions,
    retry: 1,
  });
}
