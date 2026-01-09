import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const AURORA_ENDPOINT = "http://aurora.tophatsecurity.com:9151";

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

  const connect = useCallback(() => {
    if (!enabled) return;

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

    // Build URL with session cookie as query param (since EventSource doesn't support headers)
    const url = new URL(`${AURORA_ENDPOINT}${endpoint}`);
    url.searchParams.set("session", encodeURIComponent(sessionCookie));

    try {
      const eventSource = new EventSource(url.toString());
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log(`SSE connected: ${endpoint}`);
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
        console.error(`SSE error: ${endpoint}`, error);
        eventSource.close();
        eventSourceRef.current = null;

        setState(prev => ({
          ...prev,
          isConnected: false,
          isConnecting: false,
          error: "Connection lost",
        }));

        onError?.(error);

        // Attempt reconnection
        if (reconnectCountRef.current < maxReconnectAttempts) {
          reconnectCountRef.current++;
          setState(prev => ({ ...prev, reconnectCount: reconnectCountRef.current }));

          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(`SSE reconnecting (${reconnectCountRef.current}/${maxReconnectAttempts}): ${endpoint}`);
            connect();
          }, reconnectInterval);
        } else {
          setState(prev => ({
            ...prev,
            error: `Failed to connect after ${maxReconnectAttempts} attempts`,
          }));
        }
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
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkAvailability = useCallback(async () => {
    setIsChecking(true);
    try {
      const response = await fetch(`${AURORA_ENDPOINT}/api/stream/health`, {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      });
      setIsAvailable(response.ok);
    } catch {
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
