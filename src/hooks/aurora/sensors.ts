// Aurora API - Sensor Hooks
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { callAuroraApi, hasAuroraSession, defaultQueryOptions, fastQueryOptions, type AuroraApiOptions } from "./core";
import { SENSORS, READINGS, STATS } from "./endpoints";
import type { 
  SensorData, 
  SensorTypeStats, 
  LatestReading, 
} from "./types";

// =============================================
// RESPONSE TYPES
// =============================================

interface SensorsListResponse {
  count: number;
  sensors: SensorData[];
}

interface LatestReadingsResponse {
  data?: LatestReading[];
  readings?: LatestReading[];
  count?: number;
}

interface SensorReadingsResponse {
  count: number;
  readings: LatestReading[];
}

interface SensorStatsResponse {
  sensor_types: SensorTypeStats[];
}

// =============================================
// QUERY HOOKS
// =============================================

export function useSensors(clientId?: string | null) {
  return useQuery({
    queryKey: ["aurora", "sensors", clientId],
    queryFn: async () => {
      // Core now auto-unwraps { data: [...], status: 'success' } responses
      const response = await callAuroraApi<SensorsListResponse | SensorData[]>(SENSORS.LIST, "GET", undefined, { clientId });
      if (Array.isArray(response)) {
        return response;
      }
      return response?.sensors || [];
    },
    enabled: hasAuroraSession(),
    ...fastQueryOptions,
  });
}

export function useRecentSensors(clientId?: string | null) {
  return useQuery({
    queryKey: ["aurora", "sensors", "recent", clientId],
    queryFn: async () => {
      // Core now auto-unwraps { data: [...], status: 'success' } responses
      const response = await callAuroraApi<SensorsListResponse | SensorData[]>(SENSORS.RECENT, "GET", undefined, { clientId });
      if (Array.isArray(response)) {
        return response;
      }
      return response?.sensors || [];
    },
    enabled: hasAuroraSession(),
    ...fastQueryOptions,
  });
}

export function useSensorById(sensorId: string) {
  return useQuery({
    queryKey: ["aurora", "sensors", sensorId],
    queryFn: () => callAuroraApi<SensorData>(SENSORS.GET(sensorId)),
    enabled: hasAuroraSession() && !!sensorId,
    retry: 2,
  });
}

export function useLatestReadings(clientId?: string | null) {
  return useQuery({
    queryKey: ["aurora", "readings", "latest", clientId],
    queryFn: async () => {
      try {
        // Core now auto-unwraps { data: [...], status: 'success' } responses
        const response = await callAuroraApi<LatestReadingsResponse | LatestReading[]>(READINGS.LATEST, "GET", undefined, { clientId });
        if (Array.isArray(response)) {
          return response;
        }
        return response?.data || response?.readings || [];
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
    queryFn: () => callAuroraApi<SensorReadingsResponse>(
      READINGS.BY_SENSOR_TYPE(sensorType), 
      "GET", 
      undefined, 
      { clientId, params: { hours } }
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
        // Core now auto-unwraps { data: {...}, status: 'success' } responses
        const result = await callAuroraApi<SensorStatsResponse | SensorTypeStats[]>(STATS.SENSORS, "GET", undefined, { clientId });
        if (Array.isArray(result)) {
          return { sensor_types: result };
        }
        return result?.sensor_types ? result : { sensor_types: [] };
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
        const response = await callAuroraApi<SensorTypeStats>(STATS.SENSOR_TYPE(sensorType), "GET", undefined, { clientId });
        if (response && Object.keys(response).length > 0) {
          return response;
        }
      } catch {
        // Endpoint may not exist for this sensor type
      }
      return null;
    },
    enabled: hasAuroraSession() && !!sensorType,
    ...defaultQueryOptions,
    retry: 0,
  });
}

export function useSensorTypeStatsWithPeriod(sensorType: string, hours: number = 24, clientId?: string | null) {
  return useQuery({
    queryKey: ["aurora", "stats", "sensors", sensorType, hours, clientId],
    queryFn: async () => {
      if (!sensorType) return null;
      
      try {
        const response = await callAuroraApi<SensorTypeStats>(
          STATS.SENSOR_TYPE(sensorType), 
          "GET", 
          undefined, 
          { clientId, params: { hours } }
        );
        if (response && Object.keys(response).length > 0) {
          return response;
        }
      } catch {
        // Endpoint may not exist
      }
      return null;
    },
    enabled: hasAuroraSession() && !!sensorType,
    ...defaultQueryOptions,
    retry: 0,
  });
}

// =============================================
// MUTATION HOOKS
// =============================================

export function useAddSensor() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (sensor: { sensor_id: string; sensor_type: string; name?: string }) => {
      return callAuroraApi<{ success: boolean; sensor_id: string }>(SENSORS.ADD, "POST", sensor);
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
      return callAuroraApi<{ success: boolean }>(SENSORS.UPDATE(sensorId), "PUT", data);
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
      return callAuroraApi<{ success: boolean }>(SENSORS.DELETE(sensorId), "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aurora", "sensors"] });
    },
  });
}
