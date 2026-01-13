// Aurora API - System domain hooks
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { callAuroraApi, hasAuroraSession } from "./core";

// =============================================
// TYPES
// =============================================

export interface SystemInfo {
  hostname?: string;
  ip?: string;
  ip_address?: string;
  platform?: string;
  uptime?: string;
  uptime_seconds?: number;
  cpu_count?: number;
  memory_total?: number;
  memory_available?: number;
  disk_total?: number;
  disk_free?: number;
  version?: string;
}

export interface ArpEntry {
  ip: string;
  mac: string;
  interface?: string;
  type?: string;
}

export interface RoutingEntry {
  destination: string;
  gateway: string;
  genmask?: string;
  flags?: string;
  metric?: number;
  interface?: string;
}

export interface NetworkInterface {
  name: string;
  mac?: string;
  ip?: string;
  netmask?: string;
  broadcast?: string;
  state?: string;
  mtu?: number;
  rx_bytes?: number;
  tx_bytes?: number;
}

export interface UsbDevice {
  bus: string;
  device: string;
  id: string;
  description?: string;
  manufacturer?: string;
  product?: string;
}

export interface ServiceStatus {
  active: boolean;
  status: string;
  name: string;
}

export interface ServerConfig {
  server_address?: string;
  server_port?: number;
  data_directory?: string;
  log_level?: string;
  batch_size?: number;
  upload_interval?: number;
  sensors?: Record<string, unknown>;
  [key: string]: unknown;
}

// =============================================
// QUERY HOOKS
// =============================================

export function useSystemInfo() {
  return useQuery({
    queryKey: ["aurora", "system", "info"],
    queryFn: () => callAuroraApi<SystemInfo>("/api/system/all"),
    enabled: hasAuroraSession(),
    staleTime: 120000,
    refetchInterval: 300000,
    retry: 1,
  });
}

export function useSystemArp() {
  return useQuery({
    queryKey: ["aurora", "system", "arp"],
    queryFn: () => callAuroraApi<{ entries: ArpEntry[] }>("/api/system/arp"),
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 1,
  });
}

export function useSystemRouting() {
  return useQuery({
    queryKey: ["aurora", "system", "routing"],
    queryFn: () => callAuroraApi<{ routes: RoutingEntry[] }>("/api/system/routing"),
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 1,
  });
}

export function useSystemInterfaces() {
  return useQuery({
    queryKey: ["aurora", "system", "interfaces"],
    queryFn: () => callAuroraApi<{ interfaces: NetworkInterface[] }>("/api/system/interfaces"),
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 1,
  });
}

export function useSystemUsb() {
  return useQuery({
    queryKey: ["aurora", "system", "usb"],
    queryFn: () => callAuroraApi<{ devices: UsbDevice[] }>("/api/system/usb"),
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 1,
  });
}

export function useExternalIp() {
  return useQuery({
    queryKey: ["aurora", "system", "external-ip"],
    queryFn: () => callAuroraApi<{ ip: string }>("/api/system/external-ip"),
    enabled: hasAuroraSession(),
    staleTime: 300000,
    refetchInterval: 600000,
    retry: 1,
  });
}

export function useSystemHostname() {
  return useQuery({
    queryKey: ["aurora", "system", "hostname"],
    queryFn: () => callAuroraApi<{ hostname: string }>("/api/system/hostname"),
    enabled: hasAuroraSession(),
    staleTime: 300000,
    refetchInterval: 600000,
    retry: 1,
  });
}

export function useSystemIp() {
  return useQuery({
    queryKey: ["aurora", "system", "ip"],
    queryFn: () => callAuroraApi<{ ip: string }>("/api/system/ip"),
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 1,
  });
}

export function useSystemUptime() {
  return useQuery({
    queryKey: ["aurora", "system", "uptime"],
    queryFn: () => callAuroraApi<{ uptime: string; uptime_seconds: number }>("/api/system/uptime"),
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 1,
  });
}

export function useSystemCpuLoad() {
  return useQuery({
    queryKey: ["aurora", "system", "load"],
    queryFn: () => callAuroraApi<{ load: number[] }>("/api/system/load"),
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 1,
  });
}

export function useSystemMemory() {
  return useQuery({
    queryKey: ["aurora", "system", "memory"],
    queryFn: () => callAuroraApi<{ total: number; used: number; percent: number }>("/api/system/memory"),
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 1,
  });
}

export function useSystemDisk() {
  return useQuery({
    queryKey: ["aurora", "system", "disk"],
    queryFn: () => callAuroraApi<{ total: number; used: number; percent: number }>("/api/system/disk"),
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 1,
  });
}

export function useServiceStatus(serviceName: string) {
  return useQuery({
    queryKey: ["aurora", "systemctl", serviceName],
    queryFn: () => callAuroraApi<{ active: boolean; status: string }>(`/api/systemctl/${serviceName}`),
    enabled: !!serviceName && hasAuroraSession(),
    staleTime: 30000,
    refetchInterval: 60000,
    retry: 1,
  });
}

export function useAuroraServices() {
  return useQuery({
    queryKey: ["aurora", "services", "all"],
    queryFn: async () => {
      const coreServices = ['aurorasense-dataserver', 'aurorasense-datacollector'];
      const results: ServiceStatus[] = [];
      for (const service of coreServices) {
        try {
          const status = await callAuroraApi<{ active: boolean; status: string }>(`/api/systemctl/${service}`);
          results.push({ ...status, name: service });
        } catch {
          results.push({ active: false, status: 'unknown', name: service });
        }
      }
      return results;
    },
    enabled: hasAuroraSession(),
    staleTime: 120000,
    refetchInterval: 300000,
    retry: 1,
  });
}

export function useServerConfig() {
  return useQuery({
    queryKey: ["aurora", "config"],
    queryFn: () => callAuroraApi<ServerConfig>("/api/config"),
    enabled: hasAuroraSession(),
    staleTime: 120000,
    retry: 2,
  });
}

// =============================================
// MUTATION HOOKS
// =============================================

export function useUpdateServerConfig() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (config: ServerConfig) => {
      return callAuroraApi<{ success: boolean }>("/api/config", "POST", config);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aurora", "config"] });
    },
  });
}
