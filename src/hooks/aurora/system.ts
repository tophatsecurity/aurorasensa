// Aurora API - System domain hooks
// Updated to match actual available endpoints on Aurora server
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
  load?: number[];
  memory?: { total: number; used: number; percent: number };
  disk?: { total: number; used: number; percent: number };
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

// Aggregate system info from individual endpoints since /api/system/all may not exist
export function useSystemInfo() {
  return useQuery({
    queryKey: ["aurora", "system", "info"],
    queryFn: async () => {
      // Try /api/system/all first
      try {
        const allInfo = await callAuroraApi<SystemInfo>("/api/system/all");
        if (allInfo && Object.keys(allInfo).length > 0) {
          return allInfo;
        }
      } catch (e) {
        // Fall through to aggregate individual endpoints
      }
      
      // Aggregate from individual endpoints
      const [hostname, ip, uptime, load, memory, disk] = await Promise.all([
        callAuroraApi<{ hostname: string }>("/api/system/hostname").catch(() => ({ hostname: undefined })),
        callAuroraApi<{ ip: string }>("/api/system/ip").catch(() => ({ ip: undefined })),
        callAuroraApi<{ uptime: string; uptime_seconds: number }>("/api/system/uptime").catch(() => ({ uptime: undefined, uptime_seconds: undefined })),
        callAuroraApi<{ load: number[] }>("/api/system/load").catch(() => ({ load: undefined })),
        callAuroraApi<{ total: number; used: number; percent: number }>("/api/system/memory").catch(() => null),
        callAuroraApi<{ total: number; used: number; percent: number }>("/api/system/disk").catch(() => null),
      ]);
      
      return {
        hostname: hostname.hostname,
        ip: ip.ip,
        uptime: uptime.uptime,
        uptime_seconds: uptime.uptime_seconds,
        load: load.load,
        memory,
        disk,
      } as SystemInfo;
    },
    enabled: hasAuroraSession(),
    staleTime: 120000,
    refetchInterval: 300000,
    retry: 1,
  });
}

export function useSystemArp() {
  return useQuery({
    queryKey: ["aurora", "system", "arp"],
    queryFn: async () => {
      try {
        const response = await callAuroraApi<{ entries: ArpEntry[] } | ArpEntry[]>("/api/system/arp");
        // Handle both response formats
        if (Array.isArray(response)) {
          return { entries: response };
        }
        return response;
      } catch {
        return { entries: [] };
      }
    },
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 1,
  });
}

export function useSystemRouting() {
  return useQuery({
    queryKey: ["aurora", "system", "routing"],
    queryFn: async () => {
      try {
        const response = await callAuroraApi<{ routes: RoutingEntry[] } | RoutingEntry[]>("/api/system/routing");
        if (Array.isArray(response)) {
          return { routes: response };
        }
        return response;
      } catch {
        return { routes: [] };
      }
    },
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 1,
  });
}

export function useSystemInterfaces() {
  return useQuery({
    queryKey: ["aurora", "system", "interfaces"],
    queryFn: async () => {
      try {
        const response = await callAuroraApi<{ interfaces: NetworkInterface[] } | NetworkInterface[]>("/api/system/interfaces");
        if (Array.isArray(response)) {
          return { interfaces: response };
        }
        return response;
      } catch {
        return { interfaces: [] };
      }
    },
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 1,
  });
}

export function useSystemUsb() {
  return useQuery({
    queryKey: ["aurora", "system", "usb"],
    queryFn: async () => {
      try {
        const response = await callAuroraApi<{ devices: UsbDevice[] } | UsbDevice[]>("/api/system/usb");
        if (Array.isArray(response)) {
          return { devices: response };
        }
        return response;
      } catch {
        return { devices: [] };
      }
    },
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 1,
  });
}

export function useExternalIp() {
  return useQuery({
    queryKey: ["aurora", "system", "external-ip"],
    queryFn: async () => {
      try {
        return await callAuroraApi<{ ip: string }>("/api/system/external-ip");
      } catch {
        return { ip: '' };
      }
    },
    enabled: hasAuroraSession(),
    staleTime: 300000,
    refetchInterval: 600000,
    retry: 1,
  });
}

export function useSystemHostname() {
  return useQuery({
    queryKey: ["aurora", "system", "hostname"],
    queryFn: async () => {
      try {
        return await callAuroraApi<{ hostname: string }>("/api/system/hostname");
      } catch {
        return { hostname: '' };
      }
    },
    enabled: hasAuroraSession(),
    staleTime: 300000,
    refetchInterval: 600000,
    retry: 1,
  });
}

export function useSystemIp() {
  return useQuery({
    queryKey: ["aurora", "system", "ip"],
    queryFn: async () => {
      try {
        return await callAuroraApi<{ ip: string }>("/api/system/ip");
      } catch {
        return { ip: '' };
      }
    },
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 1,
  });
}

export function useSystemUptime() {
  return useQuery({
    queryKey: ["aurora", "system", "uptime"],
    queryFn: async () => {
      try {
        return await callAuroraApi<{ uptime: string; uptime_seconds: number }>("/api/system/uptime");
      } catch {
        return { uptime: '', uptime_seconds: 0 };
      }
    },
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 1,
  });
}

export function useSystemCpuLoad() {
  return useQuery({
    queryKey: ["aurora", "system", "load"],
    queryFn: async () => {
      try {
        return await callAuroraApi<{ load: number[] }>("/api/system/load");
      } catch {
        return { load: [] };
      }
    },
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 1,
  });
}

export function useSystemMemory() {
  return useQuery({
    queryKey: ["aurora", "system", "memory"],
    queryFn: async () => {
      try {
        return await callAuroraApi<{ total: number; used: number; percent: number }>("/api/system/memory");
      } catch {
        return { total: 0, used: 0, percent: 0 };
      }
    },
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 1,
  });
}

export function useSystemDisk() {
  return useQuery({
    queryKey: ["aurora", "system", "disk"],
    queryFn: async () => {
      try {
        return await callAuroraApi<{ total: number; used: number; percent: number }>("/api/system/disk");
      } catch {
        return { total: 0, used: 0, percent: 0 };
      }
    },
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 1,
  });
}

export function useServiceStatus(serviceName: string) {
  return useQuery({
    queryKey: ["aurora", "systemctl", serviceName],
    queryFn: async () => {
      try {
        return await callAuroraApi<{ active: boolean; status: string }>(`/api/systemctl/${serviceName}`);
      } catch {
        return { active: false, status: 'unknown' };
      }
    },
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
    queryFn: async () => {
      try {
        return await callAuroraApi<ServerConfig>("/api/config");
      } catch {
        return {};
      }
    },
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
