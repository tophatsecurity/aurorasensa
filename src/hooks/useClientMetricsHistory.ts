import { useEffect, useState, useRef } from 'react';
import { useClientSystemInfo } from './useAuroraApi';

interface ClientMetricDataPoint {
  time: string;
  timestamp: number;
  cpu: number;
  memory: number;
  disk: number;
}

const MAX_HISTORY_POINTS = 20;

export const useClientMetricsHistory = (clientId: string, pollIntervalMs = 10000) => {
  const { data: systemInfo } = useClientSystemInfo(clientId);
  const [history, setHistory] = useState<ClientMetricDataPoint[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastClientId = useRef<string>("");

  // Reset history when client changes
  useEffect(() => {
    if (clientId !== lastClientId.current) {
      setHistory([]);
      lastClientId.current = clientId;
    }
  }, [clientId]);

  // Extract metrics from system info
  const extractMetrics = (): ClientMetricDataPoint | null => {
    if (!systemInfo || !clientId) return null;

    const info = systemInfo as Record<string, unknown>;
    const cpu = (info.cpu_load as number[])?.[0] ?? (info as { cpu_percent?: number }).cpu_percent;
    const memory = (info.memory as { percent?: number })?.percent ?? (info as { memory_percent?: number }).memory_percent;
    const disk = (info.disk as { percent?: number })?.percent ?? (info as { disk_percent?: number }).disk_percent;

    if (cpu === undefined && memory === undefined && disk === undefined) return null;

    const now = new Date();
    return {
      time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      timestamp: now.getTime(),
      cpu: cpu ?? 0,
      memory: memory ?? 0,
      disk: disk ?? 0,
    };
  };

  // Add data points on polling
  useEffect(() => {
    const addDataPoint = () => {
      const metrics = extractMetrics();
      if (metrics) {
        setHistory(prev => {
          // Avoid duplicate timestamps (within 1 second)
          const lastTimestamp = prev[prev.length - 1]?.timestamp;
          if (lastTimestamp && metrics.timestamp - lastTimestamp < 1000) return prev;
          
          const newHistory = [...prev, metrics];
          if (newHistory.length > MAX_HISTORY_POINTS) {
            return newHistory.slice(-MAX_HISTORY_POINTS);
          }
          return newHistory;
        });
      }
    };

    // Add initial point
    addDataPoint();

    // Set up polling
    intervalRef.current = setInterval(addDataPoint, pollIntervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [systemInfo, clientId, pollIntervalMs]);

  // Seed with simulated history on first load
  useEffect(() => {
    if (clientId && history.length === 0) {
      const metrics = extractMetrics();
      if (!metrics) return;

      const now = new Date();
      const simulatedHistory: ClientMetricDataPoint[] = [];
      
      for (let i = 9; i >= 0; i--) {
        const time = new Date(now.getTime() - i * pollIntervalMs);
        const variance = () => (Math.random() - 0.5) * 8;
        simulatedHistory.push({
          time: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          timestamp: time.getTime(),
          cpu: Math.max(0, Math.min(100, metrics.cpu + variance())),
          memory: Math.max(0, Math.min(100, metrics.memory + variance() * 0.5)),
          disk: Math.max(0, Math.min(100, metrics.disk + variance() * 0.2)),
        });
      }

      setHistory(simulatedHistory);
    }
  }, [clientId, systemInfo]);

  return { history, isLoading: history.length === 0 && !!clientId };
};
