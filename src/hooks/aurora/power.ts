// Aurora API - Power domain hooks
import { useQuery } from "@tanstack/react-query";
import { callAuroraApi, hasAuroraSession } from "./core";
import { POWER } from "./endpoints";

// =============================================
// TYPES
// =============================================

export interface PowerDevice {
  device_id: string;
  device_type: string;
  client_id: string;
  status: string;
  last_seen?: string;
  metadata?: Record<string, unknown>;
}

export interface CurrentPowerStatus {
  device_id: string;
  client_id: string;
  power_watts: number;
  voltage_v?: number;
  current_a?: number;
  timestamp: string;
}

export interface PowerSummary {
  total_power_watts: number;
  total_devices: number;
  avg_power_watts: number;
  max_power_watts: number;
  min_power_watts: number;
  by_device_type?: Array<{
    device_type: string;
    power_watts: number;
    device_count: number;
  }>;
  battery_status?: {
    total_batteries: number;
    avg_charge_percent: number;
    charging_count: number;
    discharging_count: number;
  };
  voltage_health?: {
    normal_count: number;
    warning_count: number;
    critical_count: number;
  };
}

export interface PowerHistoryPoint {
  timestamp: string;
  device_id?: string;
  power_watts: number;
  voltage_v?: number;
  current_a?: number;
}

export interface BatteryStats {
  device_id: string;
  client_id: string;
  charge_percent: number;
  status: 'charging' | 'discharging' | 'full' | 'unknown';
  voltage_v?: number;
  current_a?: number;
  temperature_c?: number;
  health_percent?: number;
  cycles?: number;
  time_to_full_min?: number;
  time_to_empty_min?: number;
  timestamp: string;
}

export interface VoltageStats {
  device_id: string;
  client_id: string;
  voltage_v: number;
  status: 'normal' | 'warning' | 'critical';
  min_v?: number;
  max_v?: number;
  nominal_v?: number;
  timestamp: string;
}

export interface UsbPowerStats {
  device_id: string;
  client_id: string;
  port: string;
  power_watts: number;
  voltage_v: number;
  current_a: number;
  connected_device?: string;
  timestamp: string;
}

// =============================================
// QUERY HOOKS - API responses are now flat
// =============================================

export function usePowerCurrent(clientId?: string | null, deviceId?: string) {
  return useQuery({
    queryKey: ["aurora", "power", "current", clientId, deviceId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (clientId) params.set('client_id', clientId);
      if (deviceId) params.set('device_id', deviceId);
      const query = params.toString();
      const path = query ? `${POWER.CURRENT}?${query}` : POWER.CURRENT;
      const result = await callAuroraApi<CurrentPowerStatus[]>(path);
      return Array.isArray(result) ? result : [];
    },
    enabled: hasAuroraSession(),
    staleTime: 30000,
    refetchInterval: 60000,
    retry: 1,
  });
}

export function usePowerSummary(clientId?: string | null) {
  return useQuery({
    queryKey: ["aurora", "power", "summary", clientId],
    queryFn: async () => {
      const path = clientId ? `${POWER.SUMMARY}?client_id=${clientId}` : POWER.SUMMARY;
      return callAuroraApi<PowerSummary>(path);
    },
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 1,
  });
}

export function usePowerHistory(options?: {
  clientId?: string | null;
  deviceId?: string;
  hours?: number;
  limit?: number;
}) {
  const { clientId, deviceId, hours = 24, limit = 100 } = options || {};
  return useQuery({
    queryKey: ["aurora", "power", "history", clientId, deviceId, hours, limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (clientId) params.set('client_id', clientId);
      if (deviceId) params.set('device_id', deviceId);
      params.set('hours', String(hours));
      params.set('limit', String(limit));
      const path = `${POWER.HISTORY}?${params.toString()}`;
      const result = await callAuroraApi<PowerHistoryPoint[]>(path);
      return Array.isArray(result) ? result : [];
    },
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 1,
  });
}

export function usePowerDevices(clientId?: string | null, type?: string) {
  return useQuery({
    queryKey: ["aurora", "power", "devices", clientId, type],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (clientId) params.set('client_id', clientId);
      if (type) params.set('type', type);
      const query = params.toString();
      const path = query ? `${POWER.DEVICES}?${query}` : POWER.DEVICES;
      const result = await callAuroraApi<PowerDevice[]>(path);
      return Array.isArray(result) ? result : [];
    },
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 1,
  });
}

export function useBatteryStats(clientId?: string | null, deviceId?: string) {
  return useQuery({
    queryKey: ["aurora", "power", "battery", clientId, deviceId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (clientId) params.set('client_id', clientId);
      if (deviceId) params.set('device_id', deviceId);
      const query = params.toString();
      const path = query ? `${POWER.BATTERY}?${query}` : POWER.BATTERY;
      const result = await callAuroraApi<BatteryStats[]>(path);
      return Array.isArray(result) ? result : [];
    },
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 1,
  });
}

export function useVoltageStats(clientId?: string | null, deviceId?: string) {
  return useQuery({
    queryKey: ["aurora", "power", "voltage", clientId, deviceId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (clientId) params.set('client_id', clientId);
      if (deviceId) params.set('device_id', deviceId);
      const query = params.toString();
      const path = query ? `${POWER.VOLTAGE}?${query}` : POWER.VOLTAGE;
      const result = await callAuroraApi<VoltageStats[]>(path);
      return Array.isArray(result) ? result : [];
    },
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 1,
  });
}

export function useUsbPower(clientId?: string | null, deviceId?: string) {
  return useQuery({
    queryKey: ["aurora", "power", "usb", clientId, deviceId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (clientId) params.set('client_id', clientId);
      if (deviceId) params.set('device_id', deviceId);
      const query = params.toString();
      const path = query ? `${POWER.USB}?${query}` : POWER.USB;
      const result = await callAuroraApi<UsbPowerStats[]>(path);
      return Array.isArray(result) ? result : [];
    },
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 1,
  });
}
