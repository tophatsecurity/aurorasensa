// Aurora Export API Hooks
import { useQuery } from "@tanstack/react-query";
import { callAuroraApi, hasAuroraSession, defaultQueryOptions } from "./core";
import { EXPORT } from "./endpoints";

// Types for comprehensive export API
export interface ExportType {
  type: string;
  description: string;
  table: string;
  default_columns: string[];
  available_columns: string[];
  supports_client_filter: boolean;
  supports_device_filter: boolean;
  supports_sensor_filter: boolean;
}

export interface ExportTypesResponse {
  status: string;
  export_types: ExportType[];
  total_types: number;
}

export interface ExportStats {
  export_type: string;
  total_records: number;
  filtered_records: number;
  estimated_size_mb: number;
  time_range: {
    start: string;
    end: string;
  };
  columns: string[];
}

export interface ExportStatsResponse {
  status: string;
  stats: ExportStats;
}

export interface ExportOptions {
  exportType: string;
  format?: 'csv' | 'tsv';
  hours?: number;
  clientId?: string;
  deviceId?: string;
  sensorType?: string;
  columns?: string[];
  limit?: number;
}

// Hook to fetch available export types
export function useExportTypes() {
  return useQuery({
    queryKey: ["aurora", "export", "comprehensive", "types"],
    queryFn: async () => {
      if (!hasAuroraSession()) return { export_types: [], total_types: 0 };
      try {
        const response = await callAuroraApi<ExportTypesResponse>(EXPORT.COMPREHENSIVE_TYPES);
        return response;
      } catch (error) {
        console.warn("Failed to fetch export types:", error);
        return { export_types: [], total_types: 0 };
      }
    },
    ...defaultQueryOptions,
    staleTime: 300000, // 5 minutes
  });
}

// Hook to fetch export stats before downloading
export function useExportStats(options: ExportOptions | null) {
  const { exportType, hours, clientId, deviceId, sensorType, columns } = options || {};
  
  return useQuery({
    queryKey: ["aurora", "export", "comprehensive", "stats", exportType, hours, clientId, deviceId, sensorType, columns],
    queryFn: async () => {
      if (!hasAuroraSession() || !exportType) return null;
      try {
        const params = new URLSearchParams();
        params.append("export_type", exportType);
        if (hours) params.append("hours", hours.toString());
        if (clientId) params.append("client_id", clientId);
        if (deviceId) params.append("device_id", deviceId);
        if (sensorType) params.append("sensor_type", sensorType);
        if (columns?.length) params.append("columns", columns.join(","));
        
        const response = await callAuroraApi<ExportStatsResponse>(
          `${EXPORT.COMPREHENSIVE_STATS}?${params.toString()}`
        );
        return response.stats;
      } catch (error) {
        console.warn("Failed to fetch export stats:", error);
        return null;
      }
    },
    enabled: !!exportType,
    staleTime: 30000, // 30 seconds
  });
}

// Function to build export URL (for direct download)
export function buildExportUrl(options: ExportOptions): string {
  const { exportType, format = 'csv', hours, clientId, deviceId, sensorType, columns, limit } = options;
  
  const params = new URLSearchParams();
  params.append("export_type", exportType);
  if (hours) params.append("hours", hours.toString());
  if (clientId) params.append("client_id", clientId);
  if (deviceId) params.append("device_id", deviceId);
  if (sensorType) params.append("sensor_type", sensorType);
  if (columns?.length) params.append("columns", columns.join(","));
  if (limit) params.append("limit", limit.toString());
  if (format === 'tsv') params.append("delimiter", "tab");
  
  return `${EXPORT.COMPREHENSIVE_CSV}?${params.toString()}`;
}

// Function to trigger export download via the proxy
export async function downloadExport(options: ExportOptions): Promise<Blob> {
  const path = buildExportUrl(options);
  const response = await callAuroraApi<string>(path, 'GET', undefined, { timeout: 120000 });
  
  // Convert response to blob
  const blob = new Blob([response], { 
    type: options.format === 'tsv' ? 'text/tab-separated-values' : 'text/csv' 
  });
  return blob;
}
