// Aurora API - Alerts domain hooks
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { callAuroraApi, hasAuroraSession, type AuroraApiOptions } from "./core";
import { ALERTS } from "./endpoints";

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
  email_enabled?: boolean;
  email_notifications?: boolean;
  email_recipients?: string[];
  webhook_enabled?: boolean;
  webhook_url?: string;
  cooldown_seconds?: number;
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

export interface UpdateAlertRulePayload extends Partial<CreateAlertRulePayload> {}

// =============================================
// HELPERS
// =============================================

async function safeAlertApiCall<T>(endpoint: string, defaultValue: T, options?: AuroraApiOptions): Promise<T> {
  try {
    return await callAuroraApi<T>(endpoint, "GET", undefined, options);
  } catch (error) {
    console.warn(`Alert API endpoint ${endpoint} not available, using defaults`);
    return defaultValue;
  }
}

// =============================================
// QUERY HOOKS
// =============================================

export function useAlerts(limit: number = 100, clientId?: string | null) {
  return useQuery({
    queryKey: ["aurora", "alerts", limit, clientId],
    queryFn: async () => {
      const result = await safeAlertApiCall<{ alerts: Alert[] } | Alert[]>(
        ALERTS.LIST, 
        { alerts: [] }, 
        { clientId, params: { limit } }
      );
      // Handle array response (when auto-unwrapped)
      if (Array.isArray(result)) {
        return { alerts: result };
      }
      return result?.alerts ? result : { alerts: [] };
    },
    enabled: hasAuroraSession(),
    staleTime: 30000,
    refetchInterval: 60000,
    retry: 0,
  });
}

export function useAlertsList(params?: { 
  severity?: string; 
  acknowledged?: boolean; 
  resolved?: boolean; 
  limit?: number; 
  clientId?: string | null;
}) {
  return useQuery({
    queryKey: ["aurora", "alerts", "list", params],
    queryFn: () => safeAlertApiCall<{ alerts: Alert[]; count: number }>(
      ALERTS.LIST_FILTERED, 
      { alerts: [], count: 0 }, 
      { 
        clientId: params?.clientId, 
        params: {
          severity: params?.severity,
          acknowledged: params?.acknowledged,
          resolved: params?.resolved,
          limit: params?.limit,
        }
      }
    ),
    enabled: hasAuroraSession(),
    staleTime: 30000,
    refetchInterval: 60000,
    retry: 0,
  });
}

export function useAlertRules() {
  return useQuery({
    queryKey: ["aurora", "alerts", "rules"],
    queryFn: async () => {
      try {
        const result = await callAuroraApi<{ rules: AlertRule[] } | AlertRule[]>(ALERTS.RULES);
        // Handle array response (when auto-unwrapped)
        if (Array.isArray(result)) {
          return { rules: result };
        }
        return result?.rules ? result : { rules: [] };
      } catch (error) {
        console.warn("Alert rules endpoint unavailable, returning empty rules");
        return { rules: [] };
      }
    },
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 0,
  });
}

export function useAlertStats(clientId?: string | null) {
  return useQuery({
    queryKey: ["aurora", "alerts", "stats", clientId],
    queryFn: async () => {
      try {
        return await callAuroraApi<AlertStats>(ALERTS.STATS, "GET", undefined, { clientId });
      } catch (error) {
        console.warn("Alert stats endpoint unavailable, computing from alerts list");
        try {
          const response = await callAuroraApi<{ alerts: Alert[] }>(
            ALERTS.LIST_FILTERED, 
            "GET", 
            undefined, 
            { clientId, params: { limit: 1000 } }
          );
          const alerts = response.alerts || [];
          const now = new Date();
          const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          const lastHour = new Date(now.getTime() - 60 * 60 * 1000);
          
          return {
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
        } catch {
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
    queryFn: () => safeAlertApiCall<AlertSettings>(ALERTS.SETTINGS, {}),
    enabled: hasAuroraSession(),
    staleTime: 120000,
    retry: 0,
  });
}

export function useDeviceAlerts(deviceId: string) {
  return useQuery({
    queryKey: ["aurora", "alerts", "device", deviceId],
    queryFn: () => safeAlertApiCall<{ alerts: Alert[] }>(
      ALERTS.DEVICE_ALERTS, 
      { alerts: [] },
      { params: { device_id: deviceId } }
    ),
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
      return callAuroraApi<{ success: boolean; id?: number }>(ALERTS.RULES, "POST", rule);
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
      return callAuroraApi<{ success: boolean }>(ALERTS.RULE(ruleId), "PUT", updates);
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
      return callAuroraApi<{ success: boolean }>(ALERTS.RULE(ruleId), "DELETE");
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
      return callAuroraApi<{ success: boolean }>(ALERTS.ACKNOWLEDGE(alertId), "POST");
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
      return callAuroraApi<{ success: boolean }>(ALERTS.RESOLVE(alertId), "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aurora", "alerts"] });
    },
  });
}

export function useDeleteAlert() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (alertId: number) => {
      if (alertId === undefined || alertId === null || isNaN(alertId)) {
        throw new Error("Invalid alert ID");
      }
      return callAuroraApi<{ success: boolean }>(ALERTS.DELETE(alertId), "DELETE");
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
      return callAuroraApi<{ success: boolean }>(ALERTS.SETTINGS, "PUT", settings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aurora", "alerts", "settings"] });
    },
  });
}

export function useTestAlert() {
  return useMutation({
    mutationFn: async () => {
      return callAuroraApi<{ success: boolean; message: string }>(ALERTS.TEST, "POST");
    },
  });
}
