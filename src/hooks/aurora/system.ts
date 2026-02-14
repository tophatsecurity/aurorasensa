// Aurora API - System domain hooks
// Updated to match actual available endpoints on Aurora server
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { callAuroraApi, hasAuroraSession } from "./core";
import { SYSTEM, CONFIG, GEO, IP_GEO, LOCATION } from "./endpoints";

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
        const allInfo = await callAuroraApi<SystemInfo>(SYSTEM.ALL);
        if (allInfo && Object.keys(allInfo).length > 0) {
          return allInfo;
        }
      } catch (e) {
        // Fall through to aggregate individual endpoints
      }
      
      // Aggregate from individual endpoints
      const [hostname, ip, uptime, load, memory, disk] = await Promise.all([
        callAuroraApi<{ hostname: string }>(SYSTEM.HOSTNAME).catch(() => ({ hostname: undefined })),
        callAuroraApi<{ ip: string }>(SYSTEM.IP).catch(() => ({ ip: undefined })),
        callAuroraApi<{ uptime: string; uptime_seconds: number }>(SYSTEM.UPTIME).catch(() => ({ uptime: undefined, uptime_seconds: undefined })),
        callAuroraApi<{ load: number[] }>(SYSTEM.LOAD).catch(() => ({ load: undefined })),
        callAuroraApi<{ total: number; used: number; percent: number }>(SYSTEM.MEMORY).catch(() => null),
        callAuroraApi<{ total: number; used: number; percent: number }>(SYSTEM.DISK).catch(() => null),
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
        const response = await callAuroraApi<{ entries: ArpEntry[] } | ArpEntry[]>(SYSTEM.ARP);
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
        const response = await callAuroraApi<{ routes: RoutingEntry[] } | RoutingEntry[]>(SYSTEM.ROUTING);
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
        const response = await callAuroraApi<{ interfaces: NetworkInterface[] } | NetworkInterface[]>(SYSTEM.INTERFACES);
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
        const response = await callAuroraApi<{ devices: UsbDevice[] } | UsbDevice[]>(SYSTEM.USB);
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
        return await callAuroraApi<{ ip: string }>(SYSTEM.EXTERNAL_IP);
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
        return await callAuroraApi<{ hostname: string }>(SYSTEM.HOSTNAME);
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
        return await callAuroraApi<{ ip: string }>(SYSTEM.IP);
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
        return await callAuroraApi<{ uptime: string; uptime_seconds: number }>(SYSTEM.UPTIME);
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
        return await callAuroraApi<{ load: number[] }>(SYSTEM.LOAD);
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
        return await callAuroraApi<{ total: number; used: number; percent: number }>(SYSTEM.MEMORY);
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
        return await callAuroraApi<{ total: number; used: number; percent: number }>(SYSTEM.DISK);
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
        return await callAuroraApi<{ active: boolean; status: string }>(SYSTEM.SERVICE(serviceName));
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
          const status = await callAuroraApi<{ active: boolean; status: string }>(SYSTEM.SERVICE(service));
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
        return await callAuroraApi<ServerConfig>(CONFIG.GET);
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
      return callAuroraApi<{ success: boolean }>(CONFIG.UPDATE, "POST", config);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aurora", "config"] });
    },
  });
}

// =============================================
// IP GEOLOCATION HOOKS
// =============================================

export interface IpGeolocation {
  ip?: string;
  city?: string;
  region?: string;
  country?: string;
  country_code?: string;
  latitude?: number;
  longitude?: number;
  isp?: string;
  org?: string;
  timezone?: string;
  source?: string;
}

/**
 * Get geolocation for the current external IP
 */
export function useIpGeolocation() {
  return useQuery({
    queryKey: ["aurora", "geo", "ip-location"],
    queryFn: async (): Promise<IpGeolocation> => {
      try {
        // API now returns flat response
        const result = await callAuroraApi<IpGeolocation>(IP_GEO.LOCATE);
        if (result?.latitude && result?.longitude) {
          return result;
        }
      } catch {
        // Fall through to geo/lookup
      }
      
      try {
        // Try geo/lookup endpoint
        const result = await callAuroraApi<IpGeolocation>(GEO.LOOKUP);
        if (result?.latitude && result?.longitude) {
          return result;
        }
      } catch {
        // Fall through to external-ip with geo
      }
      
      try {
        // Fall back to external-ip which may include geo data
        const ipResult = await callAuroraApi<{ 
          ip: string; 
          city?: string; 
          country?: string;
          latitude?: number;
          longitude?: number;
        }>(SYSTEM.EXTERNAL_IP);
        if (ipResult?.latitude && ipResult?.longitude) {
          return {
            ip: ipResult.ip,
            city: ipResult.city,
            country: ipResult.country,
            latitude: ipResult.latitude,
            longitude: ipResult.longitude,
            source: 'external-ip',
          };
        }
      } catch {
        // All fallbacks failed
      }
      
      return {};
    },
    enabled: hasAuroraSession(),
    staleTime: 600000, // 10 minutes
    refetchInterval: 1800000, // 30 minutes
    retry: 1,
  });
}

/**
 * Get geolocation for a specific IP address
 */
export function useIpGeolocationByIp(ip: string | null) {
  return useQuery({
    queryKey: ["aurora", "geo", "ip-location", ip],
    queryFn: async (): Promise<IpGeolocation> => {
      if (!ip) return {};
      
      try {
        const result = await callAuroraApi<IpGeolocation>(IP_GEO.LOCATE_IP(ip));
        if (result) return result;
      } catch {
        // Try geo lookup endpoint
      }
      
      try {
        const result = await callAuroraApi<IpGeolocation>(GEO.LOOKUP_IP(ip));
        if (result) return result;
      } catch {
        // All fallbacks failed
      }
      
      return {};
    },
    enabled: hasAuroraSession() && !!ip,
    staleTime: 3600000, // 1 hour
    retry: 1,
  });
}

/**
 * Get geolocation for a specific client
 */
export function useClientGeolocation(clientId: string | null) {
  return useQuery({
    queryKey: ["aurora", "client", clientId, "location"],
    queryFn: async (): Promise<IpGeolocation> => {
      if (!clientId) return {};
      
      try {
        const result = await callAuroraApi<IpGeolocation | { data: IpGeolocation; location?: IpGeolocation }>(
          IP_GEO.CLIENT(clientId)
        );
        if (result && typeof result === 'object') {
          // Handle nested data structure
          if ('location' in result && result.location) {
            return result.location;
          }
          const data = 'data' in result ? result.data : result;
          return data;
        }
      } catch {
        // Client location endpoint not available
      }
      
      return {};
    },
    enabled: hasAuroraSession() && !!clientId,
    staleTime: 300000, // 5 minutes
    refetchInterval: 600000, // 10 minutes
    retry: 1,
  });
}

// =============================================
// LOCATION API HOOKS (New unified location endpoints)
// =============================================

export interface ClientLocation {
  client_id: string;
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy?: number;
  source?: string;
  timestamp?: string;
  // Location metadata
  city?: string;
  country?: string;
  region?: string;
  isp?: string;
  // Additional metadata
  speed?: number;
  heading?: number;
  satellites?: number;
  hdop?: number;
  vdop?: number;
  pdop?: number;
  // Source-specific data
  starlink_device_id?: string;
  gps_device?: string;
}

export interface LocationHistoryPoint {
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy?: number;
  source?: string;
  timestamp: string;
  speed?: number;
  heading?: number;
}

export interface LocationSummary {
  total_clients: number;
  clients_with_location: number;
  total_location_points: number;
  sources: {
    starlink: number;
    gps: number;
    lora: number;
    ip_geolocation: number;
  };
  last_updated?: string;
}

export interface GeoJsonTrack {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    geometry: {
      type: 'LineString' | 'Point';
      coordinates: number[][] | number[];
    };
    properties: {
      client_id: string;
      start_time?: string;
      end_time?: string;
      point_count?: number;
      source?: string;
    };
  }>;
}

/**
 * Get the latest location for a specific client
 * Prioritizes: Starlink GPS > Hardware GPS > LoRa > IP Geolocation
 */
export function useClientLatestLocation(clientId: string | null) {
  return useQuery({
    queryKey: ["aurora", "location", "client", clientId, "latest"],
    queryFn: async (): Promise<ClientLocation | null> => {
      if (!clientId) return null;
      
      try {
        const result = await callAuroraApi<ClientLocation | { data: ClientLocation; location?: ClientLocation }>(
          LOCATION.CLIENT_LATEST(clientId)
        );
        if (result && typeof result === 'object') {
          // Handle nested data structure
          if ('location' in result && result.location) {
            return result.location;
          }
          if ('data' in result && result.data) {
            return result.data;
          }
          // Direct response
          if ('latitude' in result && 'longitude' in result) {
            return result as ClientLocation;
          }
        }
      } catch (e) {
        console.warn(`[useClientLatestLocation] Failed to get location for ${clientId}:`, e);
      }
      
      return null;
    },
    enabled: hasAuroraSession() && !!clientId,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // 1 minute
    retry: 1,
  });
}

/**
 * Get location history for a specific client
 */
export function useClientLocationHistory(clientId: string | null, hours: number = 24) {
  return useQuery({
    queryKey: ["aurora", "location", "client", clientId, "history", hours],
    queryFn: async (): Promise<LocationHistoryPoint[]> => {
      if (!clientId) return [];
      
      try {
        const result = await callAuroraApi<
          LocationHistoryPoint[] | 
          { history?: LocationHistoryPoint[]; points?: LocationHistoryPoint[] }
        >(`${LOCATION.CLIENT_HISTORY(clientId)}?hours=${hours}`);
        
        if (Array.isArray(result)) {
          return result;
        }
        if (result && typeof result === 'object') {
          if ('history' in result && Array.isArray(result.history)) {
            return result.history;
          }
          if ('points' in result && Array.isArray(result.points)) {
            return result.points;
          }
        }
      } catch (e) {
        console.warn(`[useClientLocationHistory] Failed to get history for ${clientId}:`, e);
      }
      
      return [];
    },
    enabled: hasAuroraSession() && !!clientId,
    staleTime: 60000, // 1 minute
    refetchInterval: 300000, // 5 minutes
    retry: 1,
  });
}

/**
 * Get location summary stats across all clients
 */
export function useLocationSummary(hours: number = 48) {
  return useQuery({
    queryKey: ["aurora", "location", "summary", hours],
    queryFn: async (): Promise<LocationSummary | null> => {
      try {
        const result = await callAuroraApi<LocationSummary | { summary?: LocationSummary }>(
          `${LOCATION.SUMMARY}?hours=${hours}`
        );
        
        if (result && typeof result === 'object') {
          if ('summary' in result && result.summary) {
            return result.summary;
          }
          // Direct response
          if ('total_clients' in result || 'clients_with_location' in result) {
            return result as LocationSummary;
          }
        }
      } catch (e) {
        console.warn('[useLocationSummary] Failed to get summary:', e);
      }
      
      return null;
    },
    enabled: hasAuroraSession(),
    staleTime: 60000, // 1 minute
    refetchInterval: 300000, // 5 minutes
    retry: 1,
  });
}

/**
 * Fetch locations for multiple clients in bulk
 * Makes parallel requests to get latest location for each client
 */
export interface AllClientsLocations {
  locations: Map<string, ClientLocation>;
  loading: boolean;
  error: Error | null;
}

export function useAllClientsLocations(clientIds: string[]) {
  return useQuery({
    queryKey: ["aurora", "location", "clients", "bulk", clientIds.sort().join(",")],
    queryFn: async (): Promise<Map<string, ClientLocation>> => {
      if (!clientIds.length) return new Map();
      
      const locations = new Map<string, ClientLocation>();
      
      // Try batch endpoint first: /api/location/clients/latest
      try {
        const result = await callAuroraApi<
          ClientLocation[] | 
          { locations?: ClientLocation[]; clients?: Record<string, ClientLocation> }
        >(LOCATION.CLIENTS_LATEST);
        
        if (Array.isArray(result)) {
          result.forEach(loc => {
            if (loc.client_id && typeof loc.latitude === 'number' && typeof loc.longitude === 'number') {
              locations.set(loc.client_id, loc);
            }
          });
          return locations;
        }
        
        if (result && typeof result === 'object') {
          if ('locations' in result && Array.isArray(result.locations)) {
            result.locations.forEach(loc => {
              if (loc.client_id && typeof loc.latitude === 'number' && typeof loc.longitude === 'number') {
                locations.set(loc.client_id, loc);
              }
            });
            return locations;
          }
          if ('clients' in result && result.clients) {
            for (const [clientId, loc] of Object.entries(result.clients)) {
              if (typeof loc.latitude === 'number' && typeof loc.longitude === 'number') {
                locations.set(clientId, { ...loc, client_id: clientId });
              }
            }
            return locations;
          }
        }
      } catch {
        // Fallback to individual requests
      }
      
      // Fallback: fetch locations in parallel batches of 10
      const batchSize = 10;
      for (let i = 0; i < clientIds.length; i += batchSize) {
        const batch = clientIds.slice(i, i + batchSize);
        const results = await Promise.allSettled(
          batch.map(async (clientId) => {
            try {
              const result = await callAuroraApi<ClientLocation | { data: ClientLocation; location?: ClientLocation }>(
                LOCATION.CLIENT_LATEST(clientId)
              );
              if (result && typeof result === 'object') {
                let loc: ClientLocation | null = null;
                if ('location' in result && result.location) loc = result.location;
                else if ('data' in result && result.data) loc = result.data;
                else if ('latitude' in result && 'longitude' in result) loc = result as ClientLocation;
                if (loc && typeof loc.latitude === 'number' && typeof loc.longitude === 'number') {
                  return { clientId, location: loc };
                }
              }
            } catch {
              // Skip failed client
            }
            return null;
          })
        );
        results.forEach((result) => {
          if (result.status === 'fulfilled' && result.value) {
            locations.set(result.value.clientId, result.value.location);
          }
        });
      }
      
      return locations;
    },
    enabled: hasAuroraSession() && clientIds.length > 0,
    staleTime: 30000,
    refetchInterval: 60000,
    retry: 1,
  });
}

/**
 * Get GeoJSON track for a client (for map visualization)
 */
export function useClientLocationTrack(clientId: string | null, hours: number = 24) {
  return useQuery({
    queryKey: ["aurora", "location", "track", clientId, hours],
    queryFn: async (): Promise<GeoJsonTrack | null> => {
      if (!clientId) return null;
      
      try {
        const result = await callAuroraApi<GeoJsonTrack | { track?: GeoJsonTrack }>(
          `${LOCATION.TRACK(clientId)}?hours=${hours}`
        );
        
        if (result && typeof result === 'object') {
          if ('track' in result && result.track) {
            return result.track;
          }
          // Direct GeoJSON response
          if ('type' in result && result.type === 'FeatureCollection') {
            return result as GeoJsonTrack;
          }
        }
      } catch (e) {
        console.warn(`[useClientLocationTrack] Failed to get track for ${clientId}:`, e);
      }
      
      return null;
    },
    enabled: hasAuroraSession() && !!clientId,
    staleTime: 60000, // 1 minute
    refetchInterval: 300000, // 5 minutes
    retry: 1,
  });
}
