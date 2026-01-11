// Aurora API - Sensor Hooks
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { callAuroraApi, hasAuroraSession, defaultQueryOptions, fastQueryOptions } from "./core";
import type { 
  SensorData, 
  SensorTypeStats, 
  LatestReading, 
  LatestReadingsResponse 
} from "./types";

// Response types
interface SensorsListResponse {
  count: number;
  sensors: SensorData[];
}

// =============================================
// QUERY HOOKS
// =============================================

export function useSensors() {
  return useQuery({
    queryKey: ["aurora", "sensors"],
    queryFn: async () => {
      const response = await callAuroraApi<SensorsListResponse>("/api/sensors/list");
      return response.sensors || [];
    },
    enabled: hasAuroraSession(),
    ...fastQueryOptions,
  });
}

export function useRecentSensors() {
  return useQuery({
    queryKey: ["aurora", "sensors", "recent"],
    queryFn: async () => {
      const response = await callAuroraApi<SensorsListResponse>("/api/sensors/recent");
      return response.sensors || [];
    },
    enabled: hasAuroraSession(),
    ...fastQueryOptions,
  });
}

export function useSensorById(sensorId: string) {
  return useQuery({
    queryKey: ["aurora", "sensors", sensorId],
    queryFn: () => callAuroraApi<SensorData>(`/api/sensors/${sensorId}`),
    enabled: hasAuroraSession() && !!sensorId,
    retry: 2,
  });
}

export function useLatestReadings() {
  return useQuery({
    queryKey: ["aurora", "readings", "latest"],
    queryFn: async () => {
      try {
        // API may return { data: [...] } or { readings: [...] }
        const response = await callAuroraApi<{ data?: LatestReading[]; readings?: LatestReading[]; count?: number }>("/api/readings/latest");
        return response.data || response.readings || [];
      } catch (error) {
        console.warn("Failed to fetch latest readings, returning empty array:", error);
        return [];
      }
    },
    enabled: hasAuroraSession(),
    ...fastQueryOptions,
    retry: 1,
  });
}

export function useSensorReadings(sensorType: string, hours: number = 24) {
  return useQuery({
    queryKey: ["aurora", "readings", "sensor", sensorType, hours],
    queryFn: () => callAuroraApi<{ count: number; readings: LatestReading[] }>(
      `/api/readings/sensor/${sensorType}?hours=${hours}`
    ),
    enabled: hasAuroraSession() && !!sensorType,
    ...defaultQueryOptions,
  });
}

export function useAllSensorStats() {
  return useQuery({
    queryKey: ["aurora", "stats", "sensors"],
    queryFn: () => callAuroraApi<{ sensor_types: SensorTypeStats[] }>("/api/stats/sensors"),
    enabled: hasAuroraSession(),
    ...defaultQueryOptions,
  });
}

export function useSensorTypeStats(sensorType: string) {
  return useQuery({
    queryKey: ["aurora", "stats", "sensors", sensorType],
    queryFn: async () => {
      try {
        const response = await callAuroraApi<SensorTypeStats>(`/api/stats/sensors/${sensorType}`);
        return response;
      } catch (error) {
        console.warn(`Failed to fetch sensor type stats for ${sensorType}:`, error);
        return null;
      }
    },
    enabled: hasAuroraSession() && !!sensorType,
    ...defaultQueryOptions,
    retry: 1,
  });
}

export function useSensorTypeStatsWithPeriod(sensorType: string, hours: number = 24) {
  return useQuery({
    queryKey: ["aurora", "stats", "sensors", sensorType, hours],
    queryFn: async () => {
      try {
        const response = await callAuroraApi<SensorTypeStats>(`/api/stats/sensors/${sensorType}?hours=${hours}`);
        return response;
      } catch (error) {
        console.warn(`Period stats for ${sensorType} not available, using 24h default`);
        return callAuroraApi<SensorTypeStats>(`/api/stats/sensors/${sensorType}`);
      }
    },
    enabled: hasAuroraSession() && !!sensorType,
    ...defaultQueryOptions,
    retry: 1,
  });
}

// =============================================
// MUTATION HOOKS
// =============================================

export function useAddSensor() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (sensor: { sensor_id: string; sensor_type: string; name?: string }) => {
      return callAuroraApi<{ success: boolean; sensor_id: string }>("/api/sensors/add", "POST", sensor);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aurora", "sensors"] });
    },
  });
}

export function useUpdateSensor() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ sensorId, data }: { sensorId: string; data: { name?: string; enabled?: boolean } }) => {
      return callAuroraApi<{ success: boolean }>(`/api/sensors/${sensorId}`, "PUT", data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["aurora", "sensors", variables.sensorId] });
      queryClient.invalidateQueries({ queryKey: ["aurora", "sensors"] });
    },
  });
}

export function useDeleteSensor() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (sensorId: string) => {
      return callAuroraApi<{ success: boolean }>(`/api/sensors/${sensorId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aurora", "sensors"] });
    },
  });
}
