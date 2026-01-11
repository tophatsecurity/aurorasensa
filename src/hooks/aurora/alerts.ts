// Aurora API - Alerts domain hooks
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { callAuroraApi, hasAuroraSession } from "./core";

// =============================================
// TYPES
// =============================================

export interface Alert {
  alert_id: number;
  rule_id?: number;
  client_id?: string | null;
  sensor_id?: string;
  sensor_type?: string;
  severity: string;
  message: string;
  value?: string;
  threshold?: string;
  status: string;
  triggered_at: string;
  acknowledged_at?: string | null;
  resolved_at?: string | null;
  rule_name?: string;
  details?: Record<string, unknown>;
  // Legacy compatibility fields
  type?: string;
  device_id?: string;
  timestamp?: string;
  acknowledged?: boolean;
  resolved?: boolean;
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

// Safe wrapper that returns default empty data on API errors (404, etc.)
async function safeAlertApiCall<T>(endpoint: string, defaultValue: T): Promise<T> {
  try {
    return await callAuroraApi<T>(endpoint);
  } catch (error) {
    // Return default value for 404s or other API errors
    console.warn(`Alert API endpoint ${endpoint} not available, using defaults`);
    return defaultValue;
  }
}

export function useAlerts(limit: number = 100) {
  return useQuery({
    queryKey: ["aurora", "alerts", limit],
    queryFn: () => safeAlertApiCall<{ alerts: Alert[] }>(`/api/alerts?limit=${limit}`, { alerts: [] }),
    enabled: hasAuroraSession(),
    staleTime: 30000,
    refetchInterval: 60000,
    retry: 0,
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
    queryFn: () => safeAlertApiCall<{ alerts: Alert[]; count: number }>(`/api/alerts/list?${queryParams}`, { alerts: [], count: 0 }),
    enabled: hasAuroraSession(),
    staleTime: 30000,
    refetchInterval: 60000,
    retry: 0,
  });
}

export function useAlertRules() {
  return useQuery({
    queryKey: ["aurora", "alerts", "rules"],
    queryFn: () => safeAlertApiCall<{ rules: AlertRule[] }>("/api/alerts/rules", { rules: [] }),
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 0,
  });
}

export function useAlertStats() {
  return useQuery({
    queryKey: ["aurora", "alerts", "stats"],
    queryFn: async () => {
      try {
        return await callAuroraApi<AlertStats>("/api/alerts/stats");
      } catch (error) {
        // Fallback: compute stats from alerts list if /api/alerts/stats endpoint fails
        console.warn("Alert stats endpoint unavailable, computing from alerts list");
        try {
          const response = await callAuroraApi<{ alerts: Alert[] }>("/api/alerts/list?limit=1000");
          const alerts = response.alerts || [];
          const now = new Date();
          const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          const lastHour = new Date(now.getTime() - 60 * 60 * 1000);
          
          const stats: AlertStats = {
            total: alerts.length,
            active: alerts.filter(a => a.status === 'active' && !a.resolved_at).length,
            acknowledged: alerts.filter(a => a.acknowledged_at).length,
            resolved: alerts.filter(a => a.resolved_at).length,
            by_severity: alerts.reduce((acc, a) => {
              acc[a.severity] = (acc[a.severity] || 0) + 1;
              return acc;
            }, {} as Record<string, number>),
            by_type: alerts.reduce((acc, a) => {
              const type = a.sensor_type || a.type || 'unknown';
              acc[type] = (acc[type] || 0) + 1;
              return acc;
            }, {} as Record<string, number>),
            last_24h: alerts.filter(a => new Date(a.triggered_at) >= last24h).length,
            last_hour: alerts.filter(a => new Date(a.triggered_at) >= lastHour).length,
          };
          return stats;
        } catch {
          // Return empty stats if both fail
          return {
            total: 0,
            active: 0,
            acknowledged: 0,
            resolved: 0,
            by_severity: {},
            by_type: {},
            last_24h: 0,
            last_hour: 0
          };
        }
      }
    },
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 0,
  });
}

export function useAlertSettings() {
  return useQuery({
    queryKey: ["aurora", "alerts", "settings"],
    queryFn: () => safeAlertApiCall<AlertSettings>("/api/alerts/settings", {}),
    enabled: hasAuroraSession(),
    staleTime: 120000,
    retry: 0,
  });
}

export function useDeviceAlerts(deviceId: string) {
  return useQuery({
    queryKey: ["aurora", "alerts", "device", deviceId],
    queryFn: () => safeAlertApiCall<{ alerts: Alert[] }>(`/api/alerts/device/${deviceId}`, { alerts: [] }),
    enabled: !!deviceId && hasAuroraSession(),
    staleTime: 30000,
    refetchInterval: 60000,
    retry: 0,
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
    mutationFn: async (alertId: number) => {
      if (alertId === undefined || alertId === null || isNaN(alertId)) {
        throw new Error("Invalid alert ID");
      }
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
    mutationFn: async (alertId: number) => {
      if (alertId === undefined || alertId === null || isNaN(alertId)) {
        throw new Error("Invalid alert ID");
      }
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
