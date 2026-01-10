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
    queryFn: () => callAuroraApi<ClientsByStateResponse>("/api/clients/all-states"),
    enabled: hasAuroraSession(),
    ...defaultQueryOptions,
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
