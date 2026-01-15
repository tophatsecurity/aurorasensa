// Aurora API - LoRa domain hooks
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { callAuroraApi, hasAuroraSession, AuroraApiOptions } from "./core";

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
    queryFn: () => callAuroraApi<{ devices: LoRaDevice[] }>("/api/lora/devices"),
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 1,
  });
}

export function useLoraDevice(deviceId: string) {
  return useQuery({
    queryKey: ["aurora", "lora", "devices", deviceId],
    queryFn: () => callAuroraApi<LoRaDevice>(`/api/lora/devices/${deviceId}`),
    enabled: !!deviceId && hasAuroraSession(),
    retry: 2,
  });
}

export function useLoraDetections(limit: number = 100) {
  return useQuery({
    queryKey: ["aurora", "lora", "detections", limit],
    queryFn: () => callAuroraApi<{ detections: LoRaDetection[] }>(`/api/lora/detections?limit=${limit}`),
    enabled: hasAuroraSession(),
    staleTime: 30000,
    refetchInterval: 60000,
    retry: 1,
  });
}

export function useLoraRecentDetections(minutes: number = 60) {
  return useQuery({
    queryKey: ["aurora", "lora", "detections", "recent", minutes],
    queryFn: () => callAuroraApi<{ detections: LoRaDetection[] }>(`/api/lora/detections/recent?minutes=${minutes}`),
    enabled: hasAuroraSession(),
    staleTime: 30000,
    refetchInterval: 60000,
    retry: 1,
  });
}

export function useLoraGlobalStats() {
  return useQuery({
    queryKey: ["aurora", "lora", "stats", "global"],
    queryFn: () => callAuroraApi<LoRaStats>("/api/lora/stats/global"),
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 1,
  });
}

export function useLoraDeviceStats(deviceId: string) {
  return useQuery({
    queryKey: ["aurora", "lora", "stats", "device", deviceId],
    queryFn: () => callAuroraApi<LoRaStats>(`/api/lora/stats/device/${deviceId}`),
    enabled: !!deviceId && hasAuroraSession(),
    retry: 2,
  });
}

export function useLoraChannelStats() {
  return useQuery({
    queryKey: ["aurora", "lora", "channels"],
    queryFn: () => callAuroraApi<LoRaChannelStats[]>("/api/lora/channels"),
    enabled: hasAuroraSession(),
    staleTime: 30000,
    refetchInterval: 60000,
    retry: 1,
  });
}

export function useLoraSpectrumAnalysis() {
  return useQuery({
    queryKey: ["aurora", "lora", "spectrum"],
    queryFn: () => callAuroraApi<LoRaSpectrumAnalysis>("/api/lora/spectrum"),
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
    queryFn: () => callAuroraApi<{ devices: LoRaDeviceConfig[] }>("/api/lora/config/devices"),
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 1,
  });
}

export function useLoraConfigDevice(deviceId: string) {
  return useQuery({
    queryKey: ["aurora", "lora", "config", "devices", deviceId],
    queryFn: () => callAuroraApi<LoRaDeviceConfig>(`/api/lora/config/devices/${deviceId}`),
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
      return callAuroraApi<{ success: boolean; device_id: string }>("/api/lora/devices", "POST", device);
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
      return callAuroraApi<{ success: boolean }>(`/api/lora/devices/${deviceId}`, "PUT", data);
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
      return callAuroraApi<{ success: boolean }>(`/api/lora/devices/${deviceId}`, "PATCH", data);
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
      return callAuroraApi<{ success: boolean }>(`/api/lora/devices/${deviceId}`, "DELETE");
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
      return callAuroraApi<{ success: boolean; message: string }>(`/api/lora/devices/${deviceId}/activate`, "POST");
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
      return callAuroraApi<{ success: boolean; message: string }>(`/api/lora/devices/${deviceId}/deactivate`, "POST");
    },
    onSuccess: (_, deviceId) => {
      queryClient.invalidateQueries({ queryKey: ["aurora", "lora", "devices", deviceId] });
      queryClient.invalidateQueries({ queryKey: ["aurora", "lora", "devices"] });
      queryClient.invalidateQueries({ queryKey: ["aurora", "lora", "config", "devices", deviceId] });
      queryClient.invalidateQueries({ queryKey: ["aurora", "lora", "config", "devices"] });
    },
  });
}
