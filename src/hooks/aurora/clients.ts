// Aurora API - Client Hooks
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { callAuroraApi, hasAuroraSession, defaultQueryOptions, fastQueryOptions } from "./core";
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

// Interface for batch with readings containing hostname
interface BatchWithReadings {
  batch_id: string;
  client_id: string;
  readings?: Array<{
    sensors?: Record<string, {
      device_type?: string;
      system?: {
        hostname?: string;
      };
    }>;
  }>;
}

// Helper to extract hostname from batch readings
function extractHostnameFromBatch(batch: BatchWithReadings | null): string | null {
  if (!batch?.readings?.[0]?.sensors) return null;
  
  const sensors = batch.readings[0].sensors;
  
  // Look for system_monitor sensor which contains the system hostname
  for (const [sensorId, sensorData] of Object.entries(sensors)) {
    if (sensorData?.device_type === 'system_monitor' && sensorData?.system?.hostname) {
      return sensorData.system.hostname;
    }
  }
  
  return null;
}

export function useClients() {
  return useQuery({
    queryKey: ["aurora", "clients"],
    queryFn: async () => {
      const response = await callAuroraApi<ClientsListResponse>("/api/clients/list");
      return response.clients || [];
    },
    enabled: hasAuroraSession(),
    ...fastQueryOptions,
  });
}

// Fetch clients with enriched hostname from their latest batch
export function useClientsWithHostnames() {
  return useQuery({
    queryKey: ["aurora", "clients", "with-hostnames"],
    queryFn: async () => {
      // Fetch clients list
      const clientsResponse = await callAuroraApi<ClientsListResponse>("/api/clients/list");
      const clients = clientsResponse.clients || [];
      
      // Fetch batches to get hostnames
      const batchesResponse = await callAuroraApi<{ batches: Array<{ batch_id: string; client_id: string }> }>("/api/batches/list?limit=100");
      const batches = batchesResponse.batches || [];
      
      // Group batches by client_id and get the latest for each
      const clientBatchMap = new Map<string, string>();
      for (const batch of batches) {
        // Extract client_id from batch_id if client_id is "unknown"
        let clientId = batch.client_id;
        if (clientId === "unknown" && batch.batch_id.includes("client_")) {
          const match = batch.batch_id.match(/client_([a-f0-9]+)/);
          if (match) {
            clientId = `client_${match[1]}`;
          }
        }
        
        // Only keep the first (most recent) batch per client
        if (!clientBatchMap.has(clientId)) {
          clientBatchMap.set(clientId, batch.batch_id);
        }
      }
      
      // Fetch batch details to get hostnames
      const hostnameMap = new Map<string, string>();
      
      await Promise.all(
        Array.from(clientBatchMap.entries()).map(async ([clientId, batchId]) => {
          try {
            const batchData = await callAuroraApi<BatchWithReadings>(`/api/batches/${batchId}`);
            const hostname = extractHostnameFromBatch(batchData);
            if (hostname) {
              hostnameMap.set(clientId, hostname);
            }
          } catch (e) {
            // Ignore errors fetching individual batches
            console.debug(`Failed to fetch batch ${batchId} for hostname:`, e);
          }
        })
      );
      
      // Enrich clients with batch hostnames
      return clients.map(client => ({
        ...client,
        hostname: hostnameMap.get(client.client_id) || client.hostname || client.client_id,
      }));
    },
    enabled: hasAuroraSession(),
    ...fastQueryOptions,
    staleTime: 60000, // Cache for 1 minute since this is an expensive operation
    refetchInterval: 120000, // Refetch every 2 minutes
  });
}

export function useClient(clientId: string) {
  return useQuery({
    queryKey: ["aurora", "clients", clientId],
    queryFn: () => callAuroraApi<Client>(`/api/clients/${clientId}`),
    enabled: hasAuroraSession() && !!clientId,
    retry: 2,
  });
}

export function useClientsByState() {
  return useQuery({
    queryKey: ["aurora", "clients", "all-states"],
    queryFn: async () => {
      // Fetch clients by state
      const response = await callAuroraApi<ClientsByStateResponse>("/api/clients/all-states");
      
      // Fetch batches to get hostnames
      const batchesResponse = await callAuroraApi<{ batches: Array<{ batch_id: string; client_id: string }> }>("/api/batches/list?limit=100");
      const batches = batchesResponse.batches || [];
      
      // Group batches by client_id and get the latest for each
      const clientBatchMap = new Map<string, string>();
      for (const batch of batches) {
        let clientId = batch.client_id;
        if (clientId === "unknown" && batch.batch_id.includes("client_")) {
          const match = batch.batch_id.match(/client_([a-f0-9]+)/);
          if (match) {
            clientId = `client_${match[1]}`;
          }
        }
        if (!clientBatchMap.has(clientId)) {
          clientBatchMap.set(clientId, batch.batch_id);
        }
      }
      
      // Fetch batch details to get hostnames
      const hostnameMap = new Map<string, string>();
      
      await Promise.all(
        Array.from(clientBatchMap.entries()).map(async ([clientId, batchId]) => {
          try {
            const batchData = await callAuroraApi<BatchWithReadings>(`/api/batches/${batchId}`);
            const hostname = extractHostnameFromBatch(batchData);
            if (hostname) {
              hostnameMap.set(clientId, hostname);
            }
          } catch (e) {
            console.debug(`Failed to fetch batch ${batchId} for hostname:`, e);
          }
        })
      );
      
      // Helper to enrich client array with hostnames
      const enrichClients = (clients: Client[]) => 
        clients.map(client => ({
          ...client,
          hostname: hostnameMap.get(client.client_id) || client.hostname || client.client_id,
        }));
      
      // Enrich all client arrays
      return {
        ...response,
        clients_by_state: {
          pending: enrichClients(response.clients_by_state?.pending || []),
          registered: enrichClients(response.clients_by_state?.registered || []),
          adopted: enrichClients(response.clients_by_state?.adopted || []),
          disabled: enrichClients(response.clients_by_state?.disabled || []),
          suspended: enrichClients(response.clients_by_state?.suspended || []),
          deleted: enrichClients(response.clients_by_state?.deleted || []),
        },
      };
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
    queryFn: () => callAuroraApi<ClientStatisticsResponse>("/api/clients/statistics"),
    enabled: hasAuroraSession(),
    ...defaultQueryOptions,
  });
}

export function usePendingClients() {
  return useQuery({
    queryKey: ["aurora", "clients", "pending"],
    queryFn: async () => {
      const response = await callAuroraApi<ClientStateResponse>("/api/clients/pending");
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
      const response = await callAuroraApi<ClientStateResponse>("/api/clients/adopted");
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
      const response = await callAuroraApi<ClientStateResponse>("/api/clients/registered");
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
      const response = await callAuroraApi<ClientStateResponse>("/api/clients/disabled");
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
      const response = await callAuroraApi<ClientStateResponse>("/api/clients/suspended");
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
      const response = await callAuroraApi<ClientStateResponse>("/api/clients/deleted");
      return response.clients || [];
    },
    enabled: hasAuroraSession(),
    ...defaultQueryOptions,
  });
}

export function useClientStateHistory(clientId: string) {
  return useQuery({
    queryKey: ["aurora", "clients", clientId, "state-history"],
    queryFn: () => callAuroraApi<ClientStateHistoryResponse>(`/api/clients/${clientId}/state-history`),
    enabled: hasAuroraSession() && !!clientId,
    retry: 2,
  });
}

export function useClientSystemInfo(clientId: string) {
  return useQuery({
    queryKey: ["aurora", "clients", clientId, "system-info"],
    queryFn: async () => {
      try {
        return await callAuroraApi<SystemInfo>(`/api/clients/${clientId}/system-info`);
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
    queryFn: () => callAuroraApi<{ clients: Record<string, SystemInfo> }>("/api/clients/system-info/all"),
    enabled: hasAuroraSession(),
    ...defaultQueryOptions,
  });
}

export function useClientConfig(clientId: string) {
  return useQuery({
    queryKey: ["aurora", "clients", clientId, "config"],
    queryFn: () => callAuroraApi<ServerConfig>(`/api/clients/${clientId}/config`),
    enabled: hasAuroraSession() && !!clientId,
    retry: 2,
  });
}

export function useClientConfigVersion(clientId: string) {
  return useQuery({
    queryKey: ["aurora", "clients", clientId, "config", "version"],
    queryFn: () => callAuroraApi<{ version: string }>(`/api/clients/${clientId}/config/version`),
    enabled: hasAuroraSession() && !!clientId,
    retry: 2,
  });
}

export function useAllClientConfigs() {
  return useQuery({
    queryKey: ["aurora", "clients", "configs", "all"],
    queryFn: () => callAuroraApi<{ configs: Record<string, ServerConfig> }>("/api/clients/configs/all"),
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
    queryFn: () => callAuroraApi<WifiMode>(`/api/clients/${clientId}/wifi/mode`),
    enabled: hasAuroraSession() && !!clientId,
    retry: 2,
  });
}

export function useWifiConfig(clientId: string) {
  return useQuery({
    queryKey: ["aurora", "clients", clientId, "wifi", "config"],
    queryFn: () => callAuroraApi<WifiConfig>(`/api/clients/${clientId}/wifi/config`),
    enabled: hasAuroraSession() && !!clientId,
    retry: 2,
  });
}

export function useWifiStatus(clientId: string) {
  return useQuery({
    queryKey: ["aurora", "clients", clientId, "wifi", "status"],
    queryFn: () => callAuroraApi<WifiStatus>(`/api/clients/${clientId}/wifi/status`),
    enabled: hasAuroraSession() && !!clientId,
    ...fastQueryOptions,
  });
}

export function useWifiScan(clientId: string) {
  return useQuery({
    queryKey: ["aurora", "clients", clientId, "wifi", "scan"],
    queryFn: () => callAuroraApi<{ networks: WifiNetwork[] }>(`/api/clients/${clientId}/wifi/scan`),
    enabled: hasAuroraSession() && !!clientId,
    staleTime: 30000,
    retry: 2,
  });
}

export function useWifiClients(clientId: string) {
  return useQuery({
    queryKey: ["aurora", "clients", clientId, "wifi", "clients"],
    queryFn: () => callAuroraApi<{ clients: WifiClient[] }>(`/api/clients/${clientId}/wifi/clients`),
    enabled: hasAuroraSession() && !!clientId,
    ...fastQueryOptions,
  });
}

export function useWifiApiVersion(clientId: string) {
  return useQuery({
    queryKey: ["aurora", "clients", clientId, "wifi", "version"],
    queryFn: () => callAuroraApi<{ version: string }>(`/api/clients/${clientId}/wifi/version`),
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
      return callAuroraApi<StateTransitionResponse>(`/api/clients/${clientId}/adopt`, "POST");
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
      return callAuroraApi<StateTransitionResponse>(`/api/clients/${clientId}/register`, "POST");
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
      return callAuroraApi<StateTransitionResponse>(`/api/clients/${clientId}/disable`, "POST", { reason });
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
      return callAuroraApi<StateTransitionResponse>(`/api/clients/${clientId}/enable`, "POST");
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
      return callAuroraApi<StateTransitionResponse>(`/api/clients/${clientId}/suspend`, "POST", { reason });
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
      return callAuroraApi<StateTransitionResponse>(`/api/clients/${clientId}/delete-soft`, "POST", { reason });
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
      return callAuroraApi<StateTransitionResponse>(`/api/clients/${clientId}/restore`, "POST");
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
      return callAuroraApi<{ success: boolean }>(`/api/clients/${clientId}`, "DELETE");
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
      return callAuroraApi<{ success: boolean }>(`/api/clients/${clientId}/config`, "PUT", config);
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
      return callAuroraApi<{ success: boolean }>(`/api/clients/${clientId}/wifi/mode`, "POST", { mode });
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
      return callAuroraApi<{ success: boolean }>(`/api/clients/${clientId}/wifi/config`, "POST", config);
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
      return callAuroraApi<{ success: boolean }>(`/api/clients/${clientId}/wifi/clients/${mac}/disconnect`, "POST");
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["aurora", "clients", variables.clientId, "wifi", "clients"] });
    },
  });
}
