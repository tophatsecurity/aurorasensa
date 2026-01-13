import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { 
  useRealTimeData, 
  POLLING_INTERVALS,
  useLatestReadingsPolling,
  useSensorTypePolling,
} from "./useRealTimePolling";

// SSE can go directly to Aurora for browsers that support it
// Falls back through proxy if CORS issues occur
const AURORA_ENDPOINT = "http://aurora.tophatsecurity.com:9151";

// Supabase SSE proxy endpoint for CORS-protected environments
const SUPABASE_SSE_PROXY = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/aurora-stream`;

// SSE availability state - starts as unknown, then checked on first use
let sseAvailabilityChecked = false;
let sseIsAvailable = false;

interface SSEConfig {
  endpoint: string;
  queryKeys?: string[][];
  onMessage?: (data: unknown) => void;
  onError?: (error: Event) => void;
  enabled?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

interface SSEState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  lastMessage: unknown | null;
  reconnectCount: number;
}

export function useSSE({
  endpoint,
  queryKeys = [],
  onMessage,
  onError,
  enabled = true,
  reconnectInterval = 5000,
  maxReconnectAttempts = 5,
}: SSEConfig) {
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectCountRef = useRef(0);

  const [state, setState] = useState<SSEState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    lastMessage: null,
    reconnectCount: 0,
  });

  const getSessionCookie = useCallback(() => {
    return sessionStorage.getItem("aurora_cookie");
  }, []);

  const connect = useCallback(async () => {
    if (!enabled) return;

    // Check if SSE is available first - if not, don't even try to connect
    if (sseAvailabilityChecked && !sseIsAvailable) {
      console.log('SSE not available, skipping EventSource connection');
      setState(prev => ({
        ...prev,
        isConnected: false,
        isConnecting: false,
        error: null, // Not an error, just using polling instead
      }));
      return;
    }

    const sessionCookie = getSessionCookie();
    if (!sessionCookie) {
      setState(prev => ({
        ...prev,
        error: "No session - please log in",
        isConnecting: false,
      }));
      return;
    }

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    // Determine stream type from endpoint
    const getStreamType = (ep: string): string => {
      if (ep.includes('/starlink')) return 'starlink';
      if (ep.includes('/thermal_probe')) return 'thermal';
      if (ep.includes('/gps')) return 'gps';
      if (ep.includes('/adsb')) return 'adsb';
      if (ep.includes('/arduino')) return 'arduino';
      if (ep.includes('/power')) return 'power';
      if (ep.includes('/system_monitor')) return 'system';
      if (ep.includes('/radio')) return 'radio';
      if (ep.includes('/alerts')) return 'alerts';
      if (ep.includes('/dashboard')) return 'dashboard';
      if (ep.includes('/clients')) return 'clients';
      if (ep.includes('/commands/') && ep.includes('/status')) return 'command';
      return 'readings';
    };

    // Extract client_id and command_id from endpoint query params
    const parseEndpoint = (ep: string) => {
      const urlParams = new URLSearchParams(ep.split('?')[1] || '');
      const pathMatch = ep.match(/\/commands\/([^/]+)\/status/);
      return {
        clientId: urlParams.get('client_id'),
        commandId: pathMatch?.[1],
      };
    };

    const streamType = getStreamType(endpoint);
    const { clientId, commandId } = parseEndpoint(endpoint);

    // Build proxy URL
    const proxyUrl = new URL(SUPABASE_SSE_PROXY);
    proxyUrl.searchParams.set('type', streamType);
    proxyUrl.searchParams.set('session', sessionCookie);
    if (clientId && clientId !== 'all') {
      proxyUrl.searchParams.set('client_id', clientId);
    }
    if (commandId) {
      proxyUrl.searchParams.set('command_id', commandId);
    }

    console.log(`SSE connecting via proxy: ${streamType}${clientId ? ` (client: ${clientId})` : ''}`);

    try {
      const eventSource = new EventSource(proxyUrl.toString());
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log(`SSE connected: ${streamType}`);
        reconnectCountRef.current = 0;
        setState(prev => ({
          ...prev,
          isConnected: true,
          isConnecting: false,
          error: null,
          reconnectCount: 0,
        }));
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          setState(prev => ({ ...prev, lastMessage: data }));

          // Invalidate related queries to refresh data
          queryKeys.forEach(keys => {
            queryClient.invalidateQueries({ queryKey: keys });
          });

          // Call custom handler
          onMessage?.(data);
        } catch (e) {
          console.warn("Failed to parse SSE message:", event.data);
        }
      };

      eventSource.onerror = (error) => {
        console.log(`SSE error: ${streamType}`, error);
        eventSource.close();
        eventSourceRef.current = null;

        // Mark SSE as unavailable to prevent further attempts
        // The unified hook will automatically fall back to polling
        sseIsAvailable = false;
        sseAvailabilityChecked = true;

        setState(prev => ({
          ...prev,
          isConnected: false,
          isConnecting: false,
          error: null, // Not a user-facing error - polling will take over
        }));

        onError?.(error);

        // Don't retry SSE connections - let the unified hook use polling instead
        // This prevents the blank screen caused by repeated SSE failures
        console.log(`SSE connection failed for ${streamType}, polling will be used instead`);
      };
    } catch (e) {
      console.error("Failed to create EventSource:", e);
      setState(prev => ({
        ...prev,
        isConnecting: false,
        error: e instanceof Error ? e.message : "Failed to connect",
      }));
    }
  }, [enabled, endpoint, getSessionCookie, maxReconnectAttempts, onError, onMessage, queryClient, queryKeys, reconnectInterval]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    reconnectCountRef.current = 0;
    setState({
      isConnected: false,
      isConnecting: false,
      error: null,
      lastMessage: null,
      reconnectCount: 0,
    });
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    reconnectCountRef.current = 0;
    connect();
  }, [connect, disconnect]);

  useEffect(() => {
    if (enabled) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  return {
    ...state,
    connect,
    disconnect,
    reconnect,
  };
}

// Specialized hook for command status updates
export function useCommandStatusSSE(commandId: string | null, enabled = true) {
  const queryClient = useQueryClient();
  
  return useSSE({
    endpoint: `/api/stream/commands/${commandId}/status`,
    queryKeys: [
      ["aurora", "admin", "commands"],
      ["aurora", "admin", "commands", commandId || "", "results"],
    ],
    enabled: enabled && !!commandId,
    onMessage: (data) => {
      const message = data as { status?: string; command_id?: string };
      if (message.status === "completed" || message.status === "failed") {
        toast.info(`Command ${message.status}: ${commandId?.slice(0, 8)}...`);
      }
    },
  });
}

// Specialized hook for alerts stream
export function useAlertsSSE(enabled = true) {
  const queryClient = useQueryClient();

  return useSSE({
    endpoint: "/api/stream/alerts",
    queryKeys: [["aurora", "alerts"]],
    enabled,
    onMessage: (data) => {
      const alert = data as { severity?: string; message?: string; type?: string };
      if (alert.severity === "critical") {
        toast.error(`Critical Alert: ${alert.message || alert.type}`);
      } else if (alert.severity === "warning") {
        toast.warning(`Warning: ${alert.message || alert.type}`);
      }
    },
  });
}

// Specialized hook for all commands stream
export function useCommandsStreamSSE(enabled = true) {
  return useSSE({
    endpoint: "/api/stream/commands",
    queryKeys: [["aurora", "admin", "commands"]],
    enabled,
    onMessage: (data) => {
      const update = data as { type?: string; command_id?: string; status?: string };
      if (update.type === "status_update" && update.status === "completed") {
        toast.success(`Command completed: ${update.command_id?.slice(0, 8) || ""}...`);
      }
    },
  });
}

// Specialized hook for sensor readings stream
export interface SensorReadingEvent {
  device_id?: string;
  device_type?: string;
  client_id?: string;
  timestamp?: string;
  data?: Record<string, unknown>;
}

export function useSensorReadingsSSE(options?: {
  enabled?: boolean;
  clientId?: string;
  deviceType?: string;
}) {
  const { enabled = true, clientId, deviceType } = options || {};
  
  const endpoint = useMemo(() => {
    const params = new URLSearchParams();
    if (clientId && clientId !== "all") params.set("client_id", clientId);
    if (deviceType) params.set("device_type", deviceType);
    const queryString = params.toString();
    return `/api/stream/readings${queryString ? `?${queryString}` : ""}`;
  }, [clientId, deviceType]);

  return useSSE({
    endpoint,
    queryKeys: [
      ["aurora", "dashboard"],
      ["aurora", "readings"],
      ["aurora", "comprehensive-stats"],
      ["aurora", "sensor-type-stats"],
    ],
    enabled,
  });
}

// Specialized hook for dashboard stats stream (aggregated data)
export function useDashboardStatsSSE(enabled = true) {
  return useSSE({
    endpoint: "/api/stream/dashboard/stats",
    queryKeys: [
      ["aurora", "dashboard", "stats"],
      ["aurora", "dashboard", "sensor-stats"],
      ["aurora", "comprehensive-stats"],
    ],
    enabled,
  });
}

// Specialized hook for Starlink data stream
export function useStarlinkSSE(enabled = true, clientId?: string) {
  const endpoint = useMemo(() => {
    const params = new URLSearchParams();
    if (clientId && clientId !== "all") params.set("client_id", clientId);
    const queryString = params.toString();
    return `/api/stream/readings/starlink${queryString ? `?${queryString}` : ""}`;
  }, [clientId]);

  return useSSE({
    endpoint,
    queryKeys: [
      ["aurora", "starlink"],
      ["aurora", "sensor-type-stats", "starlink"],
    ],
    enabled,
  });
}

// Specialized hook for thermal probe data stream
export function useThermalProbeSSE(enabled = true, clientId?: string) {
  const endpoint = useMemo(() => {
    const params = new URLSearchParams();
    if (clientId && clientId !== "all") params.set("client_id", clientId);
    const queryString = params.toString();
    return `/api/stream/readings/thermal_probe${queryString ? `?${queryString}` : ""}`;
  }, [clientId]);

  return useSSE({
    endpoint,
    queryKeys: [
      ["aurora", "thermal"],
      ["aurora", "sensor-type-stats", "thermal_probe"],
    ],
    enabled,
  });
}

// Specialized hook for Arduino sensor data stream (AHT, BME280, etc.)
export function useArduinoSSE(enabled = true, clientId?: string) {
  const endpoint = useMemo(() => {
    const params = new URLSearchParams();
    if (clientId && clientId !== "all") params.set("client_id", clientId);
    const queryString = params.toString();
    return `/api/stream/readings/arduino${queryString ? `?${queryString}` : ""}`;
  }, [clientId]);

  return useSSE({
    endpoint,
    queryKeys: [
      ["aurora", "arduino"],
      ["aurora", "aht-sensor"],
      ["aurora", "sensor-type-stats", "aht_sensor"],
      ["aurora", "sensor-type-stats", "bmt_sensor"],
    ],
    enabled,
    onMessage: (data) => {
      const reading = data as { device_type?: string; temp_c?: number; humidity?: number };
      // Log high-volume readings for debugging
      console.debug(`Arduino SSE: ${reading.device_type} - Temp: ${reading.temp_c}°C, Humidity: ${reading.humidity}%`);
    },
  });
}

// Specialized hook for GPS/Location data stream
export function useGpsSSE(enabled = true, clientId?: string) {
  const endpoint = useMemo(() => {
    const params = new URLSearchParams();
    if (clientId && clientId !== "all") params.set("client_id", clientId);
    const queryString = params.toString();
    return `/api/stream/readings/gps${queryString ? `?${queryString}` : ""}`;
  }, [clientId]);

  return useSSE({
    endpoint,
    queryKeys: [
      ["aurora", "gps"],
      ["aurora", "gps-history"],
      ["aurora", "sensor-type-stats", "gps"],
    ],
    enabled,
  });
}

// Specialized hook for Power/Energy data stream
export function usePowerSSE(enabled = true, clientId?: string) {
  const endpoint = useMemo(() => {
    const params = new URLSearchParams();
    if (clientId && clientId !== "all") params.set("client_id", clientId);
    const queryString = params.toString();
    return `/api/stream/readings/power${queryString ? `?${queryString}` : ""}`;
  }, [clientId]);

  return useSSE({
    endpoint,
    queryKeys: [
      ["aurora", "power"],
      ["aurora", "starlink-power"],
      ["aurora", "sensor-type-stats", "power"],
    ],
    enabled,
  });
}

// Specialized hook for ADS-B aircraft data stream
export function useAdsbSSE(enabled = true, clientId?: string) {
  const endpoint = useMemo(() => {
    const params = new URLSearchParams();
    if (clientId && clientId !== "all") params.set("client_id", clientId);
    const queryString = params.toString();
    return `/api/stream/readings/adsb${queryString ? `?${queryString}` : ""}`;
  }, [clientId]);

  return useSSE({
    endpoint,
    queryKeys: [
      ["aurora", "adsb"],
      ["aurora", "adsb-history"],
      ["aurora", "sensor-type-stats", "adsb"],
    ],
    enabled,
  });
}

// Specialized hook for System Monitor data stream
export function useSystemMonitorSSE(enabled = true, clientId?: string) {
  const endpoint = useMemo(() => {
    const params = new URLSearchParams();
    if (clientId && clientId !== "all") params.set("client_id", clientId);
    const queryString = params.toString();
    return `/api/stream/readings/system_monitor${queryString ? `?${queryString}` : ""}`;
  }, [clientId]);

  return useSSE({
    endpoint,
    queryKeys: [
      ["aurora", "system-monitor"],
      ["aurora", "system-info"],
      ["aurora", "sensor-type-stats", "system_monitor"],
    ],
    enabled,
  });
}

// Specialized hook for WiFi/Bluetooth radio data stream
export function useRadioSSE(enabled = true, clientId?: string, radioType?: "wifi" | "bluetooth" | "lora") {
  const endpoint = useMemo(() => {
    const params = new URLSearchParams();
    if (clientId && clientId !== "all") params.set("client_id", clientId);
    if (radioType) params.set("type", radioType);
    const queryString = params.toString();
    return `/api/stream/readings/radio${queryString ? `?${queryString}` : ""}`;
  }, [clientId, radioType]);

  return useSSE({
    endpoint,
    queryKeys: [
      ["aurora", "radio"],
      ["aurora", "wifi-networks"],
      ["aurora", "bluetooth-devices"],
      ["aurora", "sensor-type-stats", "wifi_scanner"],
      ["aurora", "sensor-type-stats", "bluetooth_scanner"],
    ],
    enabled,
  });
}

// Hook to check if SSE is supported by the backend
export function useSSEAvailability() {
  const [isAvailable, setIsAvailable] = useState<boolean | null>(
    sseAvailabilityChecked ? sseIsAvailable : null
  );
  const [isChecking, setIsChecking] = useState(false);

  const checkAvailability = useCallback(async () => {
    if (sseAvailabilityChecked) {
      setIsAvailable(sseIsAvailable);
      return;
    }
    
    setIsChecking(true);
    try {
      // Check SSE availability via the proxy health endpoint
      const sessionCookie = sessionStorage.getItem("aurora_cookie");
      if (!sessionCookie) {
        // No session, SSE won't work anyway
        sseIsAvailable = false;
        sseAvailabilityChecked = true;
        setIsAvailable(false);
        return;
      }

      // Try connecting to a simple stream type to verify SSE works
      const proxyUrl = new URL(SUPABASE_SSE_PROXY);
      proxyUrl.searchParams.set('type', 'dashboard');
      proxyUrl.searchParams.set('session', sessionCookie);
      
      const response = await fetch(proxyUrl.toString(), {
        method: "GET",
        signal: AbortSignal.timeout(5000),
        headers: { 'Accept': 'text/event-stream' },
      });
      
      // If we get any error status (4xx or 5xx), it means SSE is not available - fall back to polling
      // This includes 404 (not found), 500 (server error), 503 (unavailable), etc.
      if (!response.ok) {
        console.log(`SSE not available on Aurora server (status: ${response.status}), using polling fallback`);
        sseIsAvailable = false;
        sseAvailabilityChecked = true;
        setIsAvailable(false);
        setIsChecking(false);
        return;
      }
      
      // Check if it returned SSE content type
      const contentType = response.headers.get('content-type');
      const isSSE = contentType?.includes('text/event-stream') ?? false;
      
      sseIsAvailable = isSSE && response.ok;
      sseAvailabilityChecked = true;
      setIsAvailable(sseIsAvailable);
    } catch (err) {
      // Any error (timeout, network, etc.) means SSE is not available
      console.log('SSE availability check failed, using polling fallback:', err);
      sseIsAvailable = false;
      sseAvailabilityChecked = true;
      setIsAvailable(false);
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    checkAvailability();
  }, [checkAvailability]);

  return { isAvailable, isChecking, checkAvailability };
}

// =============================================
// UNIFIED REAL-TIME HOOKS (SSE PRIMARY, POLLING FALLBACK)
// These prefer SSE when available, fall back to polling otherwise
// =============================================

interface RealTimeHookResult {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  reconnectCount: number;
  lastMessage: unknown | null;
  data: unknown | null;
  isPolling: boolean;
  isSSE: boolean;
  reconnect: () => void;
}

/**
 * Creates a unified real-time hook that tries SSE first, then falls back to polling
 */
function useUnifiedRealTime(
  sseHook: (enabled: boolean, clientId?: string) => ReturnType<typeof useSSE>,
  pollingType: Parameters<typeof useRealTimeData>[0],
  enabled: boolean,
  clientId?: string,
  pollingInterval?: number
): RealTimeHookResult {
  const { isAvailable: sseAvailable } = useSSEAvailability();
  
  // Use SSE when available
  const useSSEData = sseAvailable === true && enabled;
  const sseResult = sseHook(useSSEData, clientId);
  
  // Fallback to polling when SSE not available
  const usePollingData = sseAvailable === false && enabled;
  const pollingResult = useRealTimeData(pollingType, { 
    enabled: usePollingData, 
    clientId,
    interval: pollingInterval 
  });

  // Return unified interface
  if (sseAvailable === true) {
    return {
      isConnected: sseResult.isConnected,
      isConnecting: sseResult.isConnecting,
      error: sseResult.error,
      reconnectCount: sseResult.reconnectCount,
      lastMessage: sseResult.lastMessage,
      data: sseResult.lastMessage,
      isPolling: false,
      isSSE: true,
      reconnect: sseResult.reconnect,
    };
  }

  // Get error message as string
  const errorMessage = pollingResult.error 
    ? (typeof pollingResult.error === 'string' ? pollingResult.error : pollingResult.error.message)
    : null;

  return {
    isConnected: pollingResult.isPolling && !pollingResult.error,
    isConnecting: pollingResult.isPolling && pollingResult.pollCount === 0,
    error: errorMessage,
    reconnectCount: pollingResult.errorCount,
    lastMessage: pollingResult.data,
    data: pollingResult.data,
    isPolling: true,
    isSSE: false,
    reconnect: () => pollingResult.refetch?.(),
  };
}

/**
 * Starlink real-time data - SSE primary with polling fallback
 */
export function useStarlinkRealTime(enabled = true, clientId?: string) {
  return useUnifiedRealTime(useStarlinkSSE, 'starlink', enabled, clientId);
}

/**
 * Thermal probe real-time data - SSE primary with polling fallback
 */
export function useThermalProbeRealTime(enabled = true, clientId?: string) {
  return useUnifiedRealTime(useThermalProbeSSE, 'thermal', enabled, clientId);
}

/**
 * Arduino sensor real-time data - SSE primary with polling fallback
 */
export function useArduinoRealTime(enabled = true, clientId?: string) {
  return useUnifiedRealTime(useArduinoSSE, 'arduino', enabled, clientId);
}

/**
 * GPS real-time data - SSE primary with polling fallback
 */
export function useGpsRealTime(enabled = true, clientId?: string) {
  return useUnifiedRealTime(useGpsSSE, 'gps', enabled, clientId, POLLING_INTERVALS.FAST);
}

/**
 * ADS-B real-time data - SSE primary with polling fallback
 */
export function useAdsbRealTime(enabled = true, clientId?: string) {
  return useUnifiedRealTime(useAdsbSSE, 'adsb', enabled, clientId, POLLING_INTERVALS.FAST);
}

/**
 * System monitor real-time data - SSE primary with polling fallback
 */
export function useSystemMonitorRealTime(enabled = true, clientId?: string) {
  return useUnifiedRealTime(useSystemMonitorSSE, 'system', enabled, clientId);
}

/**
 * Power real-time data - SSE primary with polling fallback
 */
export function usePowerRealTime(enabled = true, clientId?: string) {
  return useUnifiedRealTime(usePowerSSE, 'power', enabled, clientId);
}

/**
 * Radio real-time data - SSE primary with polling fallback
 */
export function useRadioRealTime(enabled = true, clientId?: string, radioType?: "wifi" | "bluetooth" | "lora") {
  const { isAvailable: sseAvailable } = useSSEAvailability();
  const sseResult = useRadioSSE(sseAvailable === true && enabled, clientId, radioType);
  const pollingResult = useRealTimeData('starlink', { 
    enabled: sseAvailable === false && enabled, 
    clientId 
  });

  if (sseAvailable === true) {
    return {
      isConnected: sseResult.isConnected,
      isConnecting: sseResult.isConnecting,
      error: sseResult.error,
      reconnectCount: sseResult.reconnectCount,
      lastMessage: sseResult.lastMessage,
      data: sseResult.lastMessage,
      isPolling: false,
      isSSE: true,
      reconnect: sseResult.reconnect,
    };
  }

  const errorMessage = pollingResult.error 
    ? (typeof pollingResult.error === 'string' ? pollingResult.error : pollingResult.error.message)
    : null;

  return {
    isConnected: pollingResult.isPolling && !pollingResult.error,
    isConnecting: pollingResult.isPolling && pollingResult.pollCount === 0,
    error: errorMessage,
    reconnectCount: pollingResult.errorCount,
    lastMessage: pollingResult.data,
    data: pollingResult.data,
    isPolling: true,
    isSSE: false,
    reconnect: () => pollingResult.refetch?.(),
  };
}

/**
 * Alerts real-time data - SSE primary with polling fallback
 */
export function useAlertsRealTime(enabled = true) {
  const { isAvailable: sseAvailable } = useSSEAvailability();
  const sseResult = useAlertsSSE(sseAvailable === true && enabled);
  const pollingResult = useRealTimeData('alerts', { 
    enabled: sseAvailable === false && enabled 
  });

  if (sseAvailable === true) {
    return {
      isConnected: sseResult.isConnected,
      isConnecting: sseResult.isConnecting,
      error: sseResult.error,
      reconnectCount: sseResult.reconnectCount,
      lastMessage: sseResult.lastMessage,
      data: sseResult.lastMessage,
      isPolling: false,
      isSSE: true,
      reconnect: sseResult.reconnect,
    };
  }

  const errorMessage = pollingResult.error 
    ? (typeof pollingResult.error === 'string' ? pollingResult.error : pollingResult.error.message)
    : null;

  return {
    isConnected: pollingResult.isPolling && !pollingResult.error,
    isConnecting: pollingResult.isPolling && pollingResult.pollCount === 0,
    error: errorMessage,
    reconnectCount: pollingResult.errorCount,
    lastMessage: pollingResult.data,
    data: pollingResult.data,
    isPolling: true,
    isSSE: false,
    reconnect: () => pollingResult.refetch?.(),
  };
}

/**
 * Dashboard stats real-time data - SSE primary with polling fallback
 */
export function useDashboardRealTime(enabled = true) {
  const { isAvailable: sseAvailable } = useSSEAvailability();
  const sseResult = useDashboardStatsSSE(sseAvailable === true && enabled);
  const pollingResult = useRealTimeData('dashboard', { 
    enabled: sseAvailable === false && enabled 
  });

  if (sseAvailable === true) {
    return {
      isConnected: sseResult.isConnected,
      isConnecting: sseResult.isConnecting,
      error: sseResult.error,
      reconnectCount: sseResult.reconnectCount,
      lastMessage: sseResult.lastMessage,
      data: sseResult.lastMessage,
      isPolling: false,
      isSSE: true,
      reconnect: sseResult.reconnect,
    };
  }

  const errorMessage = pollingResult.error 
    ? (typeof pollingResult.error === 'string' ? pollingResult.error : pollingResult.error.message)
    : null;

  return {
    isConnected: pollingResult.isPolling && !pollingResult.error,
    isConnecting: pollingResult.isPolling && pollingResult.pollCount === 0,
    error: errorMessage,
    reconnectCount: pollingResult.errorCount,
    lastMessage: pollingResult.data,
    data: pollingResult.data,
    isPolling: true,
    isSSE: false,
    reconnect: () => pollingResult.refetch?.(),
  };
}

// Re-export polling utilities for direct use
export { 
  useRealTimeData, 
  POLLING_INTERVALS,
  useLatestReadingsPolling,
  useSensorTypePolling,
} from "./useRealTimePolling";
