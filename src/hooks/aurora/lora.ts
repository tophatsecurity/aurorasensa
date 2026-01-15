// Aurora API - LoRa domain hooks
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { callAuroraApi, hasAuroraSession } from "./core";
import { LORA, withQuery } from "./endpoints";

// =============================================
// TYPES
// =============================================

export interface LoRaDevice {
  device_id: string;
  client_id?: string;
  status?: string;
  last_seen?: string;
  first_seen?: string;
  rssi?: number;
  snr?: number;
  frequency?: number;
  spreading_factor?: number;
  bandwidth?: number;
  packet_count?: number;
}

export interface LoRaDeviceConfig {
  device_id: string;
  device_name?: string;
  description?: string;
  main_channel_mhz?: number;
  bandwidth_khz?: number;
  spreading_factor?: number;
  is_active?: boolean;
  location?: string;
  metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  last_configured_at?: string;
}

export interface LoRaDetection {
  id: string;
  timestamp: string;
  device_id?: string;
  client_id?: string;
  rssi?: number;
  snr?: number;
  frequency?: number;
  payload?: string;
  spreading_factor?: number;
  bandwidth?: number;
  coding_rate?: string;
}

export interface LoRaStats {
  total_devices?: number;
  total_detections?: number;
  active_devices?: number;
  avg_rssi?: number;
  avg_snr?: number;
  packets_per_hour?: number;
  unique_frequencies?: number;
}

export interface LoRaChannelStats {
  channel: number;
  frequency_mhz: number;
  packet_count: number;
  avg_rssi: number;
  avg_snr: number;
  bandwidth_khz?: number;
  spreading_factor?: number;
}

export interface LoRaSpectrumAnalysis {
  frequencies: number[];
  power_levels: number[];
  noise_floor: number;
  peak_frequency?: number;
  peak_power?: number;
  channel_activity: { channel: number; activity_percent: number }[];
}

// =============================================
// QUERY HOOKS
// =============================================

export function useLoraDevices() {
  return useQuery({
    queryKey: ["aurora", "lora", "devices"],
    queryFn: async () => {
      // Core now auto-unwraps { data: [...], status: 'success' } responses
      const result = await callAuroraApi<{ devices: LoRaDevice[] } | LoRaDevice[]>(LORA.DEVICES);
      if (Array.isArray(result)) {
        return { devices: result };
      }
      return result?.devices ? result : { devices: [] };
    },
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 1,
  });
}

export function useLoraDevice(deviceId: string) {
  return useQuery({
    queryKey: ["aurora", "lora", "devices", deviceId],
    queryFn: () => callAuroraApi<LoRaDevice>(LORA.DEVICE(deviceId)),
    enabled: !!deviceId && hasAuroraSession(),
    retry: 2,
  });
}

export function useLoraDetections(limit: number = 100) {
  return useQuery({
    queryKey: ["aurora", "lora", "detections", limit],
    queryFn: async () => {
      const result = await callAuroraApi<{ detections: LoRaDetection[] } | LoRaDetection[]>(
        withQuery(LORA.DETECTIONS, { limit })
      );
      if (Array.isArray(result)) {
        return { detections: result };
      }
      return result?.detections ? result : { detections: [] };
    },
    enabled: hasAuroraSession(),
    staleTime: 30000,
    refetchInterval: 60000,
    retry: 1,
  });
}

export function useLoraRecentDetections(minutes: number = 60) {
  return useQuery({
    queryKey: ["aurora", "lora", "detections", "recent", minutes],
    queryFn: async () => {
      const result = await callAuroraApi<{ detections: LoRaDetection[] } | LoRaDetection[]>(
        withQuery(LORA.DETECTIONS_RECENT, { minutes })
      );
      if (Array.isArray(result)) {
        return { detections: result };
      }
      return result?.detections ? result : { detections: [] };
    },
    enabled: hasAuroraSession(),
    staleTime: 30000,
    refetchInterval: 60000,
    retry: 1,
  });
}

export function useLoraGlobalStats() {
  return useQuery({
    queryKey: ["aurora", "lora", "stats", "global"],
    queryFn: () => callAuroraApi<LoRaStats>(LORA.STATS_GLOBAL),
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 1,
  });
}

export function useLoraDeviceStats(deviceId: string) {
  return useQuery({
    queryKey: ["aurora", "lora", "stats", "device", deviceId],
    queryFn: () => callAuroraApi<LoRaStats>(LORA.STATS_DEVICE(deviceId)),
    enabled: !!deviceId && hasAuroraSession(),
    retry: 2,
  });
}

export function useLoraChannelStats() {
  return useQuery({
    queryKey: ["aurora", "lora", "channels"],
    queryFn: () => callAuroraApi<LoRaChannelStats[]>(LORA.CHANNELS),
    enabled: hasAuroraSession(),
    staleTime: 30000,
    refetchInterval: 60000,
    retry: 1,
  });
}

export function useLoraSpectrumAnalysis() {
  return useQuery({
    queryKey: ["aurora", "lora", "spectrum"],
    queryFn: () => callAuroraApi<LoRaSpectrumAnalysis>(LORA.SPECTRUM),
    enabled: hasAuroraSession(),
    staleTime: 30000,
    refetchInterval: 60000,
    retry: 1,
  });
}

// =============================================
// DEVICE CONFIG QUERY HOOKS
// =============================================

export function useLoraConfigDevices() {
  return useQuery({
    queryKey: ["aurora", "lora", "config", "devices"],
    queryFn: async () => {
      const result = await callAuroraApi<{ devices: LoRaDeviceConfig[] } | LoRaDeviceConfig[]>(LORA.CONFIG_DEVICES);
      if (Array.isArray(result)) {
        return { devices: result };
      }
      return result?.devices ? result : { devices: [] };
    },
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 1,
  });
}

export function useLoraConfigDevice(deviceId: string) {
  return useQuery({
    queryKey: ["aurora", "lora", "config", "devices", deviceId],
    queryFn: () => callAuroraApi<LoRaDeviceConfig>(LORA.CONFIG_DEVICE(deviceId)),
    enabled: !!deviceId && hasAuroraSession(),
    retry: 2,
  });
}

// =============================================
// MUTATION HOOKS
// =============================================

export function useCreateLoraDevice() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (device: {
      device_id: string;
      device_name?: string;
      description?: string;
      main_channel_mhz?: number;
      bandwidth_khz?: number;
      spreading_factor?: number;
      location?: string;
      metadata?: Record<string, unknown>;
    }) => {
      return callAuroraApi<{ success: boolean; device_id: string }>(LORA.DEVICES, "POST", device);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aurora", "lora", "devices"] });
      queryClient.invalidateQueries({ queryKey: ["aurora", "lora", "config", "devices"] });
    },
  });
}

export function useUpdateLoraDevice() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ deviceId, data }: { 
      deviceId: string; 
      data: Partial<LoRaDeviceConfig>;
    }) => {
      return callAuroraApi<{ success: boolean }>(LORA.DEVICE(deviceId), "PUT", data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["aurora", "lora", "devices", variables.deviceId] });
      queryClient.invalidateQueries({ queryKey: ["aurora", "lora", "devices"] });
      queryClient.invalidateQueries({ queryKey: ["aurora", "lora", "config", "devices", variables.deviceId] });
      queryClient.invalidateQueries({ queryKey: ["aurora", "lora", "config", "devices"] });
    },
  });
}

export function usePatchLoraDevice() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ deviceId, data }: { 
      deviceId: string; 
      data: Partial<LoRaDeviceConfig>;
    }) => {
      return callAuroraApi<{ success: boolean }>(LORA.DEVICE(deviceId), "PATCH", data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["aurora", "lora", "devices", variables.deviceId] });
      queryClient.invalidateQueries({ queryKey: ["aurora", "lora", "devices"] });
      queryClient.invalidateQueries({ queryKey: ["aurora", "lora", "config", "devices", variables.deviceId] });
      queryClient.invalidateQueries({ queryKey: ["aurora", "lora", "config", "devices"] });
    },
  });
}

export function useDeleteLoraDevice() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (deviceId: string) => {
      return callAuroraApi<{ success: boolean }>(LORA.DEVICE(deviceId), "DELETE");
    },
    onSuccess: (_, deviceId) => {
      queryClient.invalidateQueries({ queryKey: ["aurora", "lora", "devices", deviceId] });
      queryClient.invalidateQueries({ queryKey: ["aurora", "lora", "devices"] });
      queryClient.invalidateQueries({ queryKey: ["aurora", "lora", "config", "devices", deviceId] });
      queryClient.invalidateQueries({ queryKey: ["aurora", "lora", "config", "devices"] });
    },
  });
}

export function useActivateLoraDevice() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (deviceId: string) => {
      return callAuroraApi<{ success: boolean; message: string }>(LORA.ACTIVATE(deviceId), "POST");
    },
    onSuccess: (_, deviceId) => {
      queryClient.invalidateQueries({ queryKey: ["aurora", "lora", "devices", deviceId] });
      queryClient.invalidateQueries({ queryKey: ["aurora", "lora", "devices"] });
      queryClient.invalidateQueries({ queryKey: ["aurora", "lora", "config", "devices", deviceId] });
      queryClient.invalidateQueries({ queryKey: ["aurora", "lora", "config", "devices"] });
    },
  });
}

export function useDeactivateLoraDevice() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (deviceId: string) => {
      return callAuroraApi<{ success: boolean; message: string }>(LORA.DEACTIVATE(deviceId), "POST");
    },
    onSuccess: (_, deviceId) => {
      queryClient.invalidateQueries({ queryKey: ["aurora", "lora", "devices", deviceId] });
      queryClient.invalidateQueries({ queryKey: ["aurora", "lora", "devices"] });
      queryClient.invalidateQueries({ queryKey: ["aurora", "lora", "config", "devices", deviceId] });
      queryClient.invalidateQueries({ queryKey: ["aurora", "lora", "config", "devices"] });
    },
  });
}
