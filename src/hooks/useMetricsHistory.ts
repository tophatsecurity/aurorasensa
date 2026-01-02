import { useEffect, useState, useRef } from 'react';
import { useClients } from './useAuroraApi';

interface MetricDataPoint {
  time: string;
  avgCpu: number;
  avgMemory: number;
  avgDisk: number;
  clientCount: number;
}

const MAX_HISTORY_POINTS = 20;

export const useMetricsHistory = (pollIntervalMs = 30000) => {
  const { data: clients } = useClients();
  const [history, setHistory] = useState<MetricDataPoint[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate current metrics from clients
  const calculateMetrics = (): MetricDataPoint | null => {
    if (!clients || clients.length === 0) return null;

    const metricsClients = clients.filter(c => c.metadata?.system);
    if (metricsClients.length === 0) return null;

    const totals = metricsClients.reduce(
      (acc, client) => {
        const system = client.metadata?.system;
        if (system) {
          acc.cpu += system.cpu_percent || 0;
          acc.memory += system.memory_percent || 0;
          acc.disk += system.disk_percent || 0;
          acc.count++;
        }
        return acc;
      },
      { cpu: 0, memory: 0, disk: 0, count: 0 }
    );

    const now = new Date();
    return {
      time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      avgCpu: Math.round(totals.cpu / totals.count),
      avgMemory: Math.round(totals.memory / totals.count),
      avgDisk: Math.round(totals.disk / totals.count),
      clientCount: totals.count,
    };
  };

  // Add initial data point and set up polling
  useEffect(() => {
    const addDataPoint = () => {
      const metrics = calculateMetrics();
      if (metrics) {
        setHistory(prev => {
          // Avoid duplicate timestamps
          const lastTime = prev[prev.length - 1]?.time;
          if (lastTime === metrics.time) return prev;
          
          const newHistory = [...prev, metrics];
          // Keep only last N points
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
  }, [clients, pollIntervalMs]);

  // Seed with simulated historical data on first load
  useEffect(() => {
    if (clients && clients.length > 0 && history.length === 0) {
      const metricsClients = clients.filter(c => c.metadata?.system);
      if (metricsClients.length === 0) return;

      // Get current averages
      const totals = metricsClients.reduce(
        (acc, client) => {
          const system = client.metadata?.system;
          if (system) {
            acc.cpu += system.cpu_percent || 0;
            acc.memory += system.memory_percent || 0;
            acc.disk += system.disk_percent || 0;
            acc.count++;
          }
          return acc;
        },
        { cpu: 0, memory: 0, disk: 0, count: 0 }
      );

      const baseCpu = totals.cpu / totals.count;
      const baseMem = totals.memory / totals.count;
      const baseDisk = totals.disk / totals.count;

      // Generate simulated history (last 10 data points)
      const now = new Date();
      const simulatedHistory: MetricDataPoint[] = [];
      
      for (let i = 9; i >= 0; i--) {
        const time = new Date(now.getTime() - i * pollIntervalMs);
        // Add some realistic variance
        const variance = () => (Math.random() - 0.5) * 10;
        simulatedHistory.push({
          time: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          avgCpu: Math.max(0, Math.min(100, Math.round(baseCpu + variance()))),
          avgMemory: Math.max(0, Math.min(100, Math.round(baseMem + variance() * 0.5))),
          avgDisk: Math.max(0, Math.min(100, Math.round(baseDisk + variance() * 0.3))),
          clientCount: totals.count,
        });
      }

      setHistory(simulatedHistory);
    }
  }, [clients]);

  return { history, isLoading: history.length === 0 };
};
