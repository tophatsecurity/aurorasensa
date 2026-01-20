// Aurora API - Client Hooks
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { callAuroraApi, hasAuroraSession, defaultQueryOptions, fastQueryOptions } from "./core";
import { CLIENTS } from "./endpoints";
import type { 
  Client, 
  ClientsListResponse, 
  ClientsByStateResponse, 
  ClientStatisticsResponse,
  ClientStateResponse,
  ClientStateHistoryResponse,
  StateTransitionResponse,
  SystemInfo,
  WifiMode,
  WifiConfig,
  WifiStatus,
  WifiNetwork,
  WifiClient,
  ServerConfig,
} from "./types";

// =============================================
// CLIENT QUERY HOOKS
// =============================================

// Response type for all clients system info
interface AllClientsSystemInfoResponse {
  clients: Record<string, SystemInfo>;
}

export function useClients() {
  return useQuery({
    queryKey: ["aurora", "clients"],
    queryFn: async () => {
      try {
        const response = await callAuroraApi<ClientsListResponse | Client[]>(CLIENTS.LIST);
        // Handle both array response and wrapped response
        if (Array.isArray(response)) {
          return response;
        }
        return response?.clients || [];
      } catch {
        return [];
      }
    },
    enabled: hasAuroraSession(),
    ...fastQueryOptions,
  });
}

export function useClientsWithHostnames() {
  return useQuery({
    queryKey: ["aurora", "clients", "with-hostnames"],
    queryFn: async () => {
      try {
        // Fetch from all-states endpoint (more reliable) and system info in parallel
        const [allStatesResponse, systemInfoResponse] = await Promise.all([
          callAuroraApi<ClientsByStateResponse | Client[]>(CLIENTS.ALL_STATES).catch(() => null),
          callAuroraApi<AllClientsSystemInfoResponse>(CLIENTS.SYSTEM_INFO_ALL).catch(() => null),
        ]);
        
        // Handle both array response and wrapped response from all-states
        let clients: Client[] = [];
        if (allStatesResponse) {
          if (Array.isArray(allStatesResponse)) {
            clients = allStatesResponse;
          } else if (typeof allStatesResponse === 'object') {
            // all-states returns { states: { adopted: [], pending: [], ... } } or { clients_by_state: {...} }
            const stateResponse = allStatesResponse as ClientsByStateResponse;
            const statesData = stateResponse.states || stateResponse.clients_by_state;
            if (statesData) {
              clients = [
                ...(statesData.adopted || []),
                ...(statesData.pending || []),
                ...(statesData.registered || []),
              ];
            }
          }
        }
        
        // Fallback to LIST endpoint if all-states returns empty
        if (clients.length === 0) {
          const listResponse = await callAuroraApi<ClientsListResponse | Client[]>(CLIENTS.LIST).catch(() => null);
          if (listResponse) {
            clients = Array.isArray(listResponse) ? listResponse : (listResponse?.clients || []);
          }
        }
        
        if (clients.length === 0) {
          return [];
        }
        
        // Build hostname map from system info (properly typed)
        const hostnameMap = new Map<string, string>();
        
        if (systemInfoResponse?.clients) {
          const clientsRecord = systemInfoResponse.clients as Record<string, SystemInfo>;
          for (const clientId of Object.keys(clientsRecord)) {
            const systemInfo = clientsRecord[clientId];
            if (systemInfo?.hostname && systemInfo.hostname !== 'unknown') {
              hostnameMap.set(clientId, systemInfo.hostname);
            }
          }
        }
        
        // Enrich clients with system info hostnames
        return clients.map(client => ({
          ...client,
          hostname: hostnameMap.get(client.client_id) || client.hostname || client.client_id,
        }));
      } catch {
        return [];
      }
    },
    enabled: hasAuroraSession(),
    ...fastQueryOptions,
    staleTime: 60000, // Cache for 1 minute
    refetchInterval: 120000, // Refetch every 2 minutes
  });
}

export function useClient(clientId: string) {
  return useQuery({
    queryKey: ["aurora", "clients", clientId],
    queryFn: () => callAuroraApi<Client>(CLIENTS.GET(clientId)),
    enabled: hasAuroraSession() && !!clientId,
    retry: 2,
  });
}

export function useClientsByState() {
  return useQuery({
    queryKey: ["aurora", "clients", "all-states"],
    queryFn: async () => {
      try {
        // Fetch clients by state and system info in parallel
        const [response, systemInfoResponse] = await Promise.all([
          callAuroraApi<ClientsByStateResponse>(CLIENTS.ALL_STATES),
          callAuroraApi<AllClientsSystemInfoResponse>(CLIENTS.SYSTEM_INFO_ALL).catch(() => null),
        ]);
        
        // API returns "states" but we normalize to "clients_by_state"
        const statesData = response.states || response.clients_by_state;
        
        // Build hostname map from system info
        const hostnameMap = new Map<string, string>();
        if (systemInfoResponse?.clients) {
          const clientsRecord = systemInfoResponse.clients as Record<string, SystemInfo>;
          for (const clientId of Object.keys(clientsRecord)) {
            const systemInfo = clientsRecord[clientId];
            if (systemInfo?.hostname && systemInfo.hostname !== 'unknown') {
              hostnameMap.set(clientId, systemInfo.hostname);
            }
          }
        }
        
        // Enrich clients with hostnames from system info
        const enrichClientsWithMap = (clients: Client[]) => 
          clients.map(client => ({
            ...client,
            hostname: hostnameMap.get(client.client_id) || client.hostname || client.client_id,
          }));
        
        // Normalize to clients_by_state structure
        return {
          clients_by_state: {
            pending: enrichClientsWithMap(statesData?.pending || []),
            registered: enrichClientsWithMap(statesData?.registered || []),
            adopted: enrichClientsWithMap(statesData?.adopted || []),
            disabled: enrichClientsWithMap(statesData?.disabled || []),
            suspended: enrichClientsWithMap(statesData?.suspended || []),
            deleted: enrichClientsWithMap(statesData?.deleted || []),
          },
        };
      } catch {
        // Return empty structure if main endpoint fails
        return {
          clients_by_state: {
            pending: [],
            registered: [],
            adopted: [],
            disabled: [],
            suspended: [],
            deleted: [],
          },
        };
      }
    },
    enabled: hasAuroraSession(),
    ...defaultQueryOptions,
    staleTime: 60000,
    refetchInterval: 120000,
  });
}

export function useClientStatistics() {
  return useQuery({
    queryKey: ["aurora", "clients", "statistics"],
    queryFn: () => callAuroraApi<ClientStatisticsResponse>(CLIENTS.STATISTICS),
    enabled: hasAuroraSession(),
    ...defaultQueryOptions,
  });
}

export function usePendingClients() {
  return useQuery({
    queryKey: ["aurora", "clients", "pending"],
    queryFn: async () => {
      const response = await callAuroraApi<ClientStateResponse>(CLIENTS.PENDING);
      return response.clients || [];
    },
    enabled: hasAuroraSession(),
    ...defaultQueryOptions,
  });
}

export function useAdoptedClients() {
  return useQuery({
    queryKey: ["aurora", "clients", "adopted"],
    queryFn: async () => {
      const response = await callAuroraApi<ClientStateResponse>(CLIENTS.ADOPTED);
      return response.clients || [];
    },
    enabled: hasAuroraSession(),
    ...defaultQueryOptions,
  });
}

export function useRegisteredClients() {
  return useQuery({
    queryKey: ["aurora", "clients", "registered"],
    queryFn: async () => {
      const response = await callAuroraApi<ClientStateResponse>(CLIENTS.REGISTERED);
      return response.clients || [];
    },
    enabled: hasAuroraSession(),
    ...defaultQueryOptions,
  });
}

export function useDisabledClients() {
  return useQuery({
    queryKey: ["aurora", "clients", "disabled"],
    queryFn: async () => {
      const response = await callAuroraApi<ClientStateResponse>(CLIENTS.DISABLED);
      return response.clients || [];
    },
    enabled: hasAuroraSession(),
    ...defaultQueryOptions,
  });
}

export function useSuspendedClients() {
  return useQuery({
    queryKey: ["aurora", "clients", "suspended"],
    queryFn: async () => {
      const response = await callAuroraApi<ClientStateResponse>(CLIENTS.SUSPENDED);
      return response.clients || [];
    },
    enabled: hasAuroraSession(),
    ...defaultQueryOptions,
  });
}

export function useDeletedClients() {
  return useQuery({
    queryKey: ["aurora", "clients", "deleted"],
    queryFn: async () => {
      const response = await callAuroraApi<ClientStateResponse>(CLIENTS.DELETED);
      return response.clients || [];
    },
    enabled: hasAuroraSession(),
    ...defaultQueryOptions,
  });
}

export function useClientStateHistory(clientId: string) {
  return useQuery({
    queryKey: ["aurora", "clients", clientId, "state-history"],
    queryFn: () => callAuroraApi<ClientStateHistoryResponse>(CLIENTS.STATE_HISTORY(clientId)),
    enabled: hasAuroraSession() && !!clientId,
    retry: 2,
  });
}

export function useClientSystemInfo(clientId: string) {
  return useQuery({
    queryKey: ["aurora", "clients", clientId, "system-info"],
    queryFn: async () => {
      try {
        return await callAuroraApi<SystemInfo>(CLIENTS.SYSTEM_INFO(clientId));
      } catch (error: any) {
        const isNotFound = error?.status === 404 || 
                          (error instanceof Error && (
                            error.message.toLowerCase().includes('not found') ||
                            error.message.toLowerCase().includes('no system info')
                          ));
        if (isNotFound) {
          return null;
        }
        throw error;
      }
    },
    enabled: hasAuroraSession() && !!clientId,
    ...defaultQueryOptions,
    retry: (failureCount, error: any) => {
      const isNotFound = error?.status === 404 || 
                        (error instanceof Error && (
                          error.message.toLowerCase().includes('not found') ||
                          error.message.toLowerCase().includes('no system info')
                        ));
      if (isNotFound) return false;
      return failureCount < 2;
    },
  });
}

export function useAllClientsSystemInfo() {
  return useQuery({
    queryKey: ["aurora", "clients", "system-info", "all"],
    queryFn: () => callAuroraApi<{ clients: Record<string, SystemInfo> }>(CLIENTS.SYSTEM_INFO_ALL),
    enabled: hasAuroraSession(),
    ...defaultQueryOptions,
  });
}

export function useClientConfig(clientId: string) {
  return useQuery({
    queryKey: ["aurora", "clients", clientId, "config"],
    queryFn: () => callAuroraApi<ServerConfig>(CLIENTS.CONFIG(clientId)),
    enabled: hasAuroraSession() && !!clientId,
    retry: 2,
  });
}

export function useClientConfigVersion(clientId: string) {
  return useQuery({
    queryKey: ["aurora", "clients", clientId, "config", "version"],
    queryFn: () => callAuroraApi<{ version: string }>(CLIENTS.CONFIG_VERSION(clientId)),
    enabled: hasAuroraSession() && !!clientId,
    retry: 2,
  });
}

export function useAllClientConfigs() {
  return useQuery({
    queryKey: ["aurora", "clients", "configs", "all"],
    queryFn: () => callAuroraApi<{ configs: Record<string, ServerConfig> }>(CLIENTS.CONFIGS_ALL),
    enabled: hasAuroraSession(),
    ...defaultQueryOptions,
  });
}

// =============================================
// CLIENT WIFI HOOKS
// =============================================

export function useWifiMode(clientId: string) {
  return useQuery({
    queryKey: ["aurora", "clients", clientId, "wifi", "mode"],
    queryFn: () => callAuroraApi<WifiMode>(CLIENTS.WIFI_MODE(clientId)),
    enabled: hasAuroraSession() && !!clientId,
    retry: 2,
  });
}

export function useWifiConfig(clientId: string) {
  return useQuery({
    queryKey: ["aurora", "clients", clientId, "wifi", "config"],
    queryFn: () => callAuroraApi<WifiConfig>(CLIENTS.WIFI_CONFIG(clientId)),
    enabled: hasAuroraSession() && !!clientId,
    retry: 2,
  });
}

export function useWifiStatus(clientId: string) {
  return useQuery({
    queryKey: ["aurora", "clients", clientId, "wifi", "status"],
    queryFn: () => callAuroraApi<WifiStatus>(CLIENTS.WIFI_STATUS(clientId)),
    enabled: hasAuroraSession() && !!clientId,
    ...fastQueryOptions,
  });
}

export function useWifiScan(clientId: string) {
  return useQuery({
    queryKey: ["aurora", "clients", clientId, "wifi", "scan"],
    queryFn: () => callAuroraApi<{ networks: WifiNetwork[] }>(CLIENTS.WIFI_SCAN(clientId)),
    enabled: hasAuroraSession() && !!clientId,
    staleTime: 30000,
    retry: 2,
  });
}

export function useWifiClients(clientId: string) {
  return useQuery({
    queryKey: ["aurora", "clients", clientId, "wifi", "clients"],
    queryFn: () => callAuroraApi<{ clients: WifiClient[] }>(CLIENTS.WIFI_CLIENTS(clientId)),
    enabled: hasAuroraSession() && !!clientId,
    ...fastQueryOptions,
  });
}

export function useWifiApiVersion(clientId: string) {
  return useQuery({
    queryKey: ["aurora", "clients", clientId, "wifi", "version"],
    queryFn: () => callAuroraApi<{ version: string }>(CLIENTS.WIFI_VERSION(clientId)),
    enabled: hasAuroraSession() && !!clientId,
    staleTime: 300000,
    retry: 2,
  });
}

// =============================================
// CLIENT MUTATION HOOKS
// =============================================

export function useAdoptClient() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (clientId: string) => {
      return callAuroraApi<StateTransitionResponse>(CLIENTS.ADOPT(clientId), "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aurora", "clients"] });
    },
  });
}

// Adopt a client directly, skipping the registered state
export function useAdoptClientDirect() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (clientId: string) => {
      return callAuroraApi<StateTransitionResponse>(CLIENTS.ADOPT_DIRECT(clientId), "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aurora", "clients"] });
    },
  });
}

export function useRegisterClient() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (clientId: string) => {
      return callAuroraApi<StateTransitionResponse>(CLIENTS.REGISTER(clientId), "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aurora", "clients"] });
    },
  });
}

export function useDisableClient() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ clientId, reason }: { clientId: string; reason?: string }) => {
      return callAuroraApi<StateTransitionResponse>(CLIENTS.DISABLE(clientId), "POST", { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aurora", "clients"] });
    },
  });
}

export function useEnableClient() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (clientId: string) => {
      return callAuroraApi<StateTransitionResponse>(CLIENTS.ENABLE(clientId), "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aurora", "clients"] });
    },
  });
}

export function useSuspendClient() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ clientId, reason }: { clientId: string; reason?: string }) => {
      return callAuroraApi<StateTransitionResponse>(CLIENTS.SUSPEND(clientId), "POST", { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aurora", "clients"] });
    },
  });
}

export function useSoftDeleteClient() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ clientId, reason }: { clientId: string; reason?: string }) => {
      return callAuroraApi<StateTransitionResponse>(CLIENTS.SOFT_DELETE(clientId), "POST", { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aurora", "clients"] });
    },
  });
}

export function useRestoreClient() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (clientId: string) => {
      return callAuroraApi<StateTransitionResponse>(CLIENTS.RESTORE(clientId), "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aurora", "clients"] });
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (clientId: string) => {
      return callAuroraApi<{ success: boolean }>(CLIENTS.DELETE(clientId), "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aurora", "clients"] });
    },
  });
}

export function useUpdateClientConfig() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ clientId, config }: { clientId: string; config: ServerConfig }) => {
      return callAuroraApi<{ success: boolean }>(CLIENTS.CONFIG(clientId), "PUT", config);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["aurora", "clients", variables.clientId, "config"] });
    },
  });
}

export function useSetWifiMode() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ clientId, mode }: { clientId: string; mode: string }) => {
      return callAuroraApi<{ success: boolean }>(CLIENTS.WIFI_MODE(clientId), "POST", { mode });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["aurora", "clients", variables.clientId, "wifi"] });
    },
  });
}

export function useUpdateWifiConfig() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ clientId, config }: { clientId: string; config: WifiConfig }) => {
      return callAuroraApi<{ success: boolean }>(CLIENTS.WIFI_CONFIG(clientId), "POST", config);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["aurora", "clients", variables.clientId, "wifi"] });
    },
  });
}

export function useDisconnectWifiClient() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ clientId, mac }: { clientId: string; mac: string }) => {
      return callAuroraApi<{ success: boolean }>(CLIENTS.WIFI_DISCONNECT(clientId, mac), "POST");
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["aurora", "clients", variables.clientId, "wifi", "clients"] });
    },
  });
}

// =============================================
// CLIENT LATEST BATCH
// =============================================

export interface LatestBatchReading {
  data?: Record<string, unknown>;
  device_id?: string;
  device_type?: string;
  sensors?: Record<string, {
    device_type?: string;
    device_timestamp?: string;
    [key: string]: unknown;
  }>;
}

export interface ClientLatestBatch {
  batch: {
    batch_id: string;
    batch_timestamp: string;
    client_id: string;
    created_at: string;
    json_content: {
      batch_id: string;
      batch_timestamp: string;
      client_id: string;
      reading_count: number;
      readings: LatestBatchReading[];
    };
    processing_time_ms?: number;
    reading_count: number;
  };
}

export function useClientLatestBatch(clientId: string | null, includeJson: boolean = true) {
  return useQuery({
    queryKey: ["aurora", "clients", clientId, "latest-batch", includeJson],
    queryFn: async () => {
      if (!clientId || clientId === "all") return null;
      const result = await callAuroraApi<ClientLatestBatch>(
        `/api/clients/${clientId}/latest-batch`,
        "GET",
        undefined,
        { params: { include_json: includeJson } }
      );
      return result;
    },
    enabled: hasAuroraSession() && !!clientId && clientId !== "all",
    staleTime: 30000,
    refetchInterval: 60000,
    retry: 1,
  });
}
