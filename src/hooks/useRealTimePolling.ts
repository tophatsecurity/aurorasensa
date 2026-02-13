import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Polling intervals in milliseconds
export const POLLING_INTERVALS = {
  FAST: 5000,      // 5 seconds - for critical real-time data
  NORMAL: 10000,   // 10 seconds - for dashboard updates
  SLOW: 30000,     // 30 seconds - for less critical data
  VERY_SLOW: 60000, // 1 minute - for background data
} as const;

type PollingInterval = typeof POLLING_INTERVALS[keyof typeof POLLING_INTERVALS];

interface PollingConfig {
  enabled?: boolean;
  interval?: PollingInterval | number;
  onSuccess?: (data: unknown) => void;
  onError?: (error: Error) => void;
}

interface PollingState {
  isPolling: boolean;
  isPaused: boolean;
  lastUpdate: Date | null;
  errorCount: number;
  pollCount: number;
}

// Helper to check if user has a valid Supabase session
function hasSupabaseSession(): boolean {
  const storageKey = `sb-hewwtgcrupegpcwfujln-auth-token`;
  const stored = localStorage.getItem(storageKey);
  return !!stored;
}

// Helper to get current session token for API calls
async function getSessionToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

// Helper to call Aurora API through proxy
async function callAuroraApi<T>(path: string): Promise<T> {
  const sessionToken = await getSessionToken();
  
  const { data, error } = await supabase.functions.invoke("aurora-proxy", {
    body: { path, method: "GET", sessionToken },
  });

  if (error) {
    throw new Error(`Aurora API error: ${error.message}`);
  }

  if (data?.detail) {
    throw new Error(String(data.detail));
  }

  return data as T;
}

/**
 * Generic hook for real-time polling of Aurora API endpoints
 */
export function useRealTimePolling<T>(
  queryKey: string[],
  endpoint: string,
  config: PollingConfig = {}
) {
  const {
    enabled = true,
    interval = POLLING_INTERVALS.NORMAL,
    onSuccess,
    onError,
  } = config;

  const [state, setState] = useState<PollingState>({
    isPolling: false,
    isPaused: false,
    lastUpdate: null,
    errorCount: 0,
    pollCount: 0,
  });

  const hasSession = hasSupabaseSession();
  const effectiveEnabled = enabled && hasSession && !state.isPaused;

  const query = useQuery({
    queryKey: ["aurora", ...queryKey],
    queryFn: async () => {
      setState(prev => ({ ...prev, isPolling: true }));
      try {
        const data = await callAuroraApi<T>(endpoint);
        setState(prev => ({
          ...prev,
          isPolling: false,
          lastUpdate: new Date(),
          errorCount: 0,
          pollCount: prev.pollCount + 1,
        }));
        onSuccess?.(data);
        return data;
      } catch (error) {
        setState(prev => ({
          ...prev,
          isPolling: false,
          errorCount: prev.errorCount + 1,
        }));
        onError?.(error as Error);
        throw error;
      }
    },
    enabled: effectiveEnabled,
    refetchInterval: effectiveEnabled ? interval : false,
    staleTime: Math.floor(interval * 0.8), // Data is stale after 80% of interval
    retry: 2,
    refetchOnWindowFocus: true,
  });

  const pause = useCallback(() => {
    setState(prev => ({ ...prev, isPaused: true }));
  }, []);

  const resume = useCallback(() => {
    setState(prev => ({ ...prev, isPaused: false }));
  }, []);

  const togglePause = useCallback(() => {
    setState(prev => ({ ...prev, isPaused: !prev.isPaused }));
  }, []);

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    dataUpdatedAt: query.dataUpdatedAt,
    ...state,
    pause,
    resume,
    togglePause,
    isConnected: effectiveEnabled && !query.isError,
    isConnecting: query.isLoading && state.pollCount === 0,
  };
}

// =============================================
// SPECIALIZED POLLING HOOKS
// =============================================

interface LatestReadingsResponse {
  count: number;
  readings: Array<{
    device_id: string;
    device_type: string;
    timestamp: string;
    data: Record<string, unknown>;
  }>;
}

/**
 * Poll latest readings for all sensors
 */
export function useLatestReadingsPolling(config: PollingConfig = {}) {
  return useRealTimePolling<LatestReadingsResponse>(
    ["readings", "latest", "polling"],
    "/api/readings/latest",
    {
      interval: POLLING_INTERVALS.NORMAL,
      ...config,
    }
  );
}

/**
 * Poll readings for a specific sensor type
 */
export function useSensorTypePolling(
  sensorType: string,
  config: PollingConfig = {}
) {
  return useRealTimePolling<{ count: number; readings: unknown[] }>(
    ["readings", "sensor", sensorType, "polling"],
    `/api/readings/sensor/${sensorType}`,
    {
      interval: POLLING_INTERVALS.NORMAL,
      ...config,
      enabled: config.enabled !== false && !!sensorType,
    }
  );
}

/**
 * Poll Starlink data
 */
export function useStarlinkPolling(config: PollingConfig = {}) {
  return useRealTimePolling<{ count: number; readings: unknown[] }>(
    ["starlink", "polling"],
    "/api/starlink/stats",
    {
      interval: POLLING_INTERVALS.NORMAL,
      ...config,
    }
  );
}

/**
 * Poll thermal probe data
 */
export function useThermalProbePolling(config: PollingConfig = {}) {
  return useRealTimePolling<{ count: number; readings: unknown[] }>(
    ["thermal", "polling"],
    "/api/thermal/latest",
    {
      interval: POLLING_INTERVALS.NORMAL,
      ...config,
    }
  );
}

/**
 * Poll Arduino sensor data (AHT, humidity, etc.)
 */
export function useArduinoPolling(config: PollingConfig = {}) {
  return useRealTimePolling<{ count: number; readings: unknown[] }>(
    ["arduino", "polling"],
    "/api/arduino/current",
    {
      interval: POLLING_INTERVALS.NORMAL,
      ...config,
    }
  );
}

/**
 * Poll GPS data
 */
export function useGpsPolling(config: PollingConfig = {}) {
  return useRealTimePolling<{ count: number; readings: unknown[] }>(
    ["gps", "polling"],
    "/api/readings/sensor/gps",
    {
      interval: POLLING_INTERVALS.FAST,
      ...config,
    }
  );
}

/**
 * Poll ADS-B aircraft data
 */
export function useAdsbPolling(config: PollingConfig = {}) {
  return useRealTimePolling<unknown[]>(
    ["adsb", "aircraft", "polling"],
    "/api/adsb/aircraft",
    {
      interval: POLLING_INTERVALS.FAST,
      ...config,
    }
  );
}

/**
 * Poll system monitor data
 */
export function useSystemMonitorPolling(config: PollingConfig = {}) {
  return useRealTimePolling<{ count: number; readings: unknown[] }>(
    ["system-monitor", "polling"],
    "/api/readings/sensor/system_monitor",
    {
      interval: POLLING_INTERVALS.NORMAL,
      ...config,
    }
  );
}

/**
 * Poll power data
 */
export function usePowerPolling(config: PollingConfig = {}) {
  return useRealTimePolling<{ count: number; readings: unknown[] }>(
    ["power", "polling"],
    "/api/power/current",
    {
      interval: POLLING_INTERVALS.NORMAL,
      ...config,
    }
  );
}

/**
 * Poll dashboard stats
 */
export function useDashboardStatsPolling(config: PollingConfig = {}) {
  return useRealTimePolling<Record<string, unknown>>(
    ["dashboard", "stats", "polling"],
    "/api/dashboard/sensor-stats",
    {
      interval: POLLING_INTERVALS.NORMAL,
      ...config,
    }
  );
}

/**
 * Poll alerts
 */
export function useAlertsPolling(config: PollingConfig = {}) {
  return useRealTimePolling<{ count: number; alerts: unknown[] }>(
    ["alerts", "polling"],
    "/api/alerts",
    {
      interval: POLLING_INTERVALS.NORMAL,
      ...config,
    }
  );
}

// =============================================
// COMBINED REAL-TIME HOOK
// =============================================

type RealTimeDataType = 
  | 'starlink' 
  | 'thermal' 
  | 'arduino' 
  | 'gps' 
  | 'adsb' 
  | 'system' 
  | 'power' 
  | 'alerts'
  | 'dashboard';

interface UseRealTimeDataOptions {
  enabled?: boolean;
  interval?: PollingInterval | number;
  clientId?: string;
}

/**
 * Unified hook for real-time data with polling
 * This replaces SSE hooks when SSE is not available
 */
export function useRealTimeData(
  dataType: RealTimeDataType,
  options: UseRealTimeDataOptions = {}
) {
  const { enabled = true, interval, clientId } = options;
  const queryClient = useQueryClient();

  const endpointMap: Record<RealTimeDataType, string> = {
    starlink: "/api/starlink/stats",
    thermal: "/api/thermal/latest",
    arduino: "/api/arduino/current",
    gps: "/api/readings/sensor/gps",
    adsb: "/api/adsb/aircraft",
    system: "/api/readings/sensor/system_monitor",
    power: "/api/power/current",
    alerts: "/api/alerts",
    dashboard: "/api/dashboard/sensor-stats",
  };

  const intervalMap: Record<RealTimeDataType, number> = {
    starlink: POLLING_INTERVALS.NORMAL,
    thermal: POLLING_INTERVALS.NORMAL,
    arduino: POLLING_INTERVALS.NORMAL,
    gps: POLLING_INTERVALS.FAST,
    adsb: POLLING_INTERVALS.FAST,
    system: POLLING_INTERVALS.NORMAL,
    power: POLLING_INTERVALS.NORMAL,
    alerts: POLLING_INTERVALS.SLOW,
    dashboard: POLLING_INTERVALS.NORMAL,
  };

  const queryKeyMap: Record<RealTimeDataType, string[][]> = {
    starlink: [["aurora", "starlink"], ["aurora", "starlink-timeseries"]],
    thermal: [["aurora", "thermal"], ["aurora", "thermal-timeseries"]],
    arduino: [["aurora", "arduino"], ["aurora", "aht-sensor"]],
    gps: [["aurora", "gps"], ["aurora", "gps-history"]],
    adsb: [["aurora", "adsb"], ["aurora", "adsb", "aircraft"]],
    system: [["aurora", "system-monitor"], ["aurora", "system-info"]],
    power: [["aurora", "power"], ["aurora", "starlink-power"]],
    alerts: [["aurora", "alerts"]],
    dashboard: [["aurora", "dashboard", "stats"]],
  };

  let endpoint = endpointMap[dataType];
  if (clientId && clientId !== "all") {
    endpoint += `${endpoint.includes('?') ? '&' : '?'}client_id=${clientId}`;
  }

  const polling = useRealTimePolling(
    [dataType, "realtime", clientId || "all"],
    endpoint,
    {
      enabled,
      interval: interval || intervalMap[dataType],
      onSuccess: () => {
        // Invalidate related queries to keep UI in sync
        queryKeyMap[dataType].forEach(keys => {
          queryClient.invalidateQueries({ queryKey: keys });
        });
      },
    }
  );

  return {
    ...polling,
    // Alias to match SSE hook interface
    reconnect: polling.refetch,
    reconnectCount: polling.errorCount,
  };
}
