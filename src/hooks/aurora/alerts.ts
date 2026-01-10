// Aurora API - Alerts domain hooks
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { callAuroraApi, hasAuroraSession } from "./core";

// =============================================
// TYPES
// =============================================

export interface Alert {
  id: string;
  type: string;
  message: string;
  severity: string;
  timestamp: string;
  acknowledged?: boolean;
  resolved?: boolean;
  device_id?: string;
  rule_id?: number;
  client_id?: string;
  sensor_type?: string;
  details?: Record<string, unknown>;
}

export interface AlertRule {
  id: number;
  name: string;
  description?: string;
  enabled: boolean;
  severity: string;
  sensor_type_filter?: string;
  conditions?: {
    field: string;
    operator?: string | null;
    value?: number | string | null;
  }[];
  notification_channels?: string[];
  cooldown_minutes?: number;
  created_at?: string;
  updated_at?: string;
}

export interface AlertStats {
  total: number;
  active: number;
  acknowledged: number;
  resolved: number;
  by_severity: Record<string, number>;
  by_type: Record<string, number>;
  last_24h: number;
  last_hour: number;
}

export interface AlertSettings {
  email_notifications?: boolean;
  webhook_url?: string;
  default_severity?: string;
  auto_acknowledge_minutes?: number;
  retention_days?: number;
}

export interface CreateAlertRulePayload {
  name: string;
  description?: string;
  enabled?: boolean;
  severity?: string;
  sensor_type_filter?: string;
  conditions?: {
    field: string;
    operator?: string | null;
    value?: number | string | null;
  }[];
  notification_channels?: string[];
  cooldown_minutes?: number;
}

export interface UpdateAlertRulePayload {
  name?: string;
  description?: string;
  enabled?: boolean;
  severity?: string;
  sensor_type_filter?: string;
  conditions?: {
    field: string;
    operator?: string | null;
    value?: number | string | null;
  }[];
  notification_channels?: string[];
  cooldown_minutes?: number;
}

// =============================================
// QUERY HOOKS
// =============================================

export function useAlerts(limit: number = 100) {
  return useQuery({
    queryKey: ["aurora", "alerts", limit],
    queryFn: () => callAuroraApi<{ alerts: Alert[] }>(`/api/alerts?limit=${limit}`),
    enabled: hasAuroraSession(),
    staleTime: 30000,
    refetchInterval: 60000,
    retry: 1,
  });
}

export function useAlertsList(params?: { severity?: string; acknowledged?: boolean; resolved?: boolean; limit?: number }) {
  const queryParams = new URLSearchParams();
  if (params?.severity) queryParams.append("severity", params.severity);
  if (params?.acknowledged !== undefined) queryParams.append("acknowledged", String(params.acknowledged));
  if (params?.resolved !== undefined) queryParams.append("resolved", String(params.resolved));
  if (params?.limit) queryParams.append("limit", String(params.limit));
  
  return useQuery({
    queryKey: ["aurora", "alerts", "list", params],
    queryFn: () => callAuroraApi<{ alerts: Alert[]; count: number }>(`/api/alerts/list?${queryParams}`),
    enabled: hasAuroraSession(),
    staleTime: 30000,
    refetchInterval: 60000,
    retry: 1,
  });
}

export function useAlertRules() {
  return useQuery({
    queryKey: ["aurora", "alerts", "rules"],
    queryFn: () => callAuroraApi<{ rules: AlertRule[] }>("/api/alerts/rules"),
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 1,
  });
}

export function useAlertStats() {
  return useQuery({
    queryKey: ["aurora", "alerts", "stats"],
    queryFn: () => callAuroraApi<AlertStats>("/api/alerts/stats"),
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 1,
  });
}

export function useAlertSettings() {
  return useQuery({
    queryKey: ["aurora", "alerts", "settings"],
    queryFn: () => callAuroraApi<AlertSettings>("/api/alerts/settings"),
    enabled: hasAuroraSession(),
    staleTime: 120000,
    retry: 2,
  });
}

export function useDeviceAlerts(deviceId: string) {
  return useQuery({
    queryKey: ["aurora", "alerts", "device", deviceId],
    queryFn: () => callAuroraApi<{ alerts: Alert[] }>(`/api/alerts/device/${deviceId}`),
    enabled: !!deviceId && hasAuroraSession(),
    staleTime: 30000,
    refetchInterval: 60000,
    retry: 1,
  });
}

// =============================================
// MUTATION HOOKS
// =============================================

export function useCreateAlertRule() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (rule: CreateAlertRulePayload) => {
      return callAuroraApi<{ success: boolean; id?: number }>("/api/alerts/rules", "POST", rule);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aurora", "alerts", "rules"] });
    },
  });
}

export function useUpdateAlertRule() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ ruleId, updates }: { ruleId: number; updates: UpdateAlertRulePayload }) => {
      return callAuroraApi<{ success: boolean }>(`/api/alerts/rules/${ruleId}`, "PUT", updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aurora", "alerts", "rules"] });
    },
  });
}

export function useDeleteAlertRule() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (ruleId: number) => {
      return callAuroraApi<{ success: boolean }>(`/api/alerts/rules/${ruleId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aurora", "alerts", "rules"] });
    },
  });
}

export function useAcknowledgeAlert() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (alertId: string) => {
      return callAuroraApi<{ success: boolean }>(`/api/alerts/${alertId}/acknowledge`, "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aurora", "alerts"] });
    },
  });
}

export function useResolveAlert() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (alertId: string) => {
      return callAuroraApi<{ success: boolean }>(`/api/alerts/${alertId}/resolve`, "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aurora", "alerts"] });
    },
  });
}

export function useUpdateAlertSettings() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (settings: AlertSettings) => {
      return callAuroraApi<{ success: boolean }>("/api/alerts/settings", "PUT", settings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aurora", "alerts", "settings"] });
    },
  });
}

export function useTestAlert() {
  return useMutation({
    mutationFn: async () => {
      return callAuroraApi<{ success: boolean; message: string }>("/api/alerts/test", "POST");
    },
  });
}
