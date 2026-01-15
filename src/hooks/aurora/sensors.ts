// Aurora API - Sensor Hooks
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { callAuroraApi, hasAuroraSession, defaultQueryOptions, fastQueryOptions, AuroraApiOptions } from "./core";
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

export function useSensors(clientId?: string | null) {
  return useQuery({
    queryKey: ["aurora", "sensors", clientId],
    queryFn: async () => {
      const response = await callAuroraApi<SensorsListResponse>("/api/sensors/list", "GET", undefined, { clientId });
      return response.sensors || [];
    },
    enabled: hasAuroraSession(),
    ...fastQueryOptions,
  });
}

export function useRecentSensors(clientId?: string | null) {
  return useQuery({
    queryKey: ["aurora", "sensors", "recent", clientId],
    queryFn: async () => {
      const response = await callAuroraApi<SensorsListResponse>("/api/sensors/recent", "GET", undefined, { clientId });
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

export function useLatestReadings(clientId?: string | null) {
  return useQuery({
    queryKey: ["aurora", "readings", "latest", clientId],
    queryFn: async () => {
      try {
        // API may return { data: [...] } or { readings: [...] }
        const response = await callAuroraApi<{ data?: LatestReading[]; readings?: LatestReading[]; count?: number }>("/api/readings/latest", "GET", undefined, { clientId });
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

export function useSensorReadings(sensorType: string, hours: number = 24, clientId?: string | null) {
  return useQuery({
    queryKey: ["aurora", "readings", "sensor", sensorType, hours, clientId],
    queryFn: () => callAuroraApi<{ count: number; readings: LatestReading[] }>(
      `/api/readings/sensor/${sensorType}?hours=${hours}`, "GET", undefined, { clientId }
    ),
    enabled: hasAuroraSession() && !!sensorType,
    ...defaultQueryOptions,
  });
}

export function useAllSensorStats(clientId?: string | null) {
  return useQuery({
    queryKey: ["aurora", "stats", "sensors", clientId],
    queryFn: async () => {
      try {
        const response = await callAuroraApi<{ sensor_types: SensorTypeStats[] }>("/api/stats/sensors", "GET", undefined, { clientId });
        return response;
      } catch {
        return { sensor_types: [] };
      }
    },
    enabled: hasAuroraSession(),
    ...defaultQueryOptions,
  });
}

export function useSensorTypeStats(sensorType: string, clientId?: string | null) {
  return useQuery({
    queryKey: ["aurora", "stats", "sensors", sensorType, clientId],
    queryFn: async () => {
      try {
        // Try the specific sensor type endpoint
        const response = await callAuroraApi<SensorTypeStats>(`/api/stats/sensors/${sensorType}`, "GET", undefined, { clientId });
        if (response && Object.keys(response).length > 0) {
          return response;
        }
      } catch {
        // Endpoint may not exist for this sensor type
      }
      
      // Return null to indicate no stats available
      return null;
    },
    enabled: hasAuroraSession() && !!sensorType,
    ...defaultQueryOptions,
    retry: 0, // Don't retry - endpoint may just not exist
  });
}

export function useSensorTypeStatsWithPeriod(sensorType: string, hours: number = 24, clientId?: string | null) {
  return useQuery({
    queryKey: ["aurora", "stats", "sensors", sensorType, hours, clientId],
    queryFn: async () => {
      // Skip if sensor type is empty
      if (!sensorType) return null;
      
      try {
        const response = await callAuroraApi<SensorTypeStats>(`/api/stats/sensors/${sensorType}?hours=${hours}`, "GET", undefined, { clientId });
        if (response && Object.keys(response).length > 0) {
          return response;
        }
      } catch {
        // Endpoint may not exist - that's okay
      }
      
      return null;
    },
    enabled: hasAuroraSession() && !!sensorType,
    ...defaultQueryOptions,
    retry: 0, // Don't retry - endpoint may just not exist
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
