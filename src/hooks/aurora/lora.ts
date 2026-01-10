// Aurora API - LoRa domain hooks
import { useQuery } from "@tanstack/react-query";
import { callAuroraApi, hasAuroraSession } from "./core";

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
