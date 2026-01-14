// Aurora API - Client-specific Sensor Hooks
// Fetches real sensor data for a specific client

import { useQuery } from "@tanstack/react-query";
import { callAuroraApi, hasAuroraSession, fastQueryOptions, defaultQueryOptions } from "./core";

// Types for sensor readings
export interface ClientSensorReading {
  device_id: string;
  device_type: string;
  timestamp: string;
  data: Record<string, unknown>;
  client_id?: string;
}

export interface BatchWithSensors {
  batch_id: string;
  client_id: string;
  timestamp: string;
  received_at?: string;
  reading_count?: number;
  readings?: Array<{
    timestamp: string;
    sensors: Record<string, {
      device_id: string;
      device_type: string;
      data?: Record<string, unknown>;
      [key: string]: unknown;
    }>;
  }>;
}

export interface SensorDataByType {
  starlink?: ClientSensorReading[];
  system_monitor?: ClientSensorReading[];
  wifi_scanner?: ClientSensorReading[];
  bluetooth_scanner?: ClientSensorReading[];
  adsb_detector?: ClientSensorReading[];
  gps?: ClientSensorReading[];
  thermal_probe?: ClientSensorReading[];
  arduino?: ClientSensorReading[];
  lora?: ClientSensorReading[];
  [key: string]: ClientSensorReading[] | undefined;
}

// Fetch batches for a specific client
export function useBatchesByClient(clientId: string, limit: number = 10) {
  return useQuery({
    queryKey: ["aurora", "batches", "client", clientId, limit],
    queryFn: async () => {
      if (!clientId) return [];
      try {
        const response = await callAuroraApi<{ batches: BatchWithSensors[] }>(
          `/api/batches/list?client_id=${clientId}&limit=${limit}`
        );
        return response.batches || [];
      } catch (error) {
        console.warn(`Failed to fetch batches for client ${clientId}:`, error);
        return [];
      }
    },
    enabled: hasAuroraSession() && !!clientId,
    ...fastQueryOptions,
  });
}

// Fetch full batch data with sensor readings
export function useBatchWithReadings(batchId: string) {
  return useQuery({
    queryKey: ["aurora", "batches", batchId, "full"],
    queryFn: async () => {
      if (!batchId) return null;
      try {
        const response = await callAuroraApi<BatchWithSensors>(`/api/batches/${batchId}`);
        return response;
      } catch (error) {
        console.warn(`Failed to fetch batch ${batchId}:`, error);
        return null;
      }
    },
    enabled: hasAuroraSession() && !!batchId,
    ...defaultQueryOptions,
  });
}

// Extract sensor readings from batch data
function extractSensorReadings(batch: BatchWithSensors | null, clientId: string): ClientSensorReading[] {
  if (!batch) return [];
  
  const readings: ClientSensorReading[] = [];
  
  // Extract client_id from batch_id if not set (format: batch_client_XXXX_timestamp_id)
  const extractedClientId = batch.client_id !== 'unknown' 
    ? batch.client_id 
    : extractClientIdFromBatchId(batch.batch_id) || clientId;
  
  // Handle readings array with sensors object
  if (batch.readings && Array.isArray(batch.readings)) {
    for (const reading of batch.readings) {
      const timestamp = reading.timestamp || batch.timestamp;
      const sensors = reading.sensors;
      
      if (sensors && typeof sensors === 'object') {
        for (const [sensorId, sensorData] of Object.entries(sensors)) {
          if (!sensorData) continue;
          
          // Determine device type from sensor ID (e.g., bluetooth_scanner_1 -> bluetooth_scanner)
          const deviceType = sensorData.device_type || extractDeviceType(sensorId);
          
          readings.push({
            device_id: sensorData.device_id || sensorId,
            device_type: deviceType,
            timestamp,
            data: sensorData as Record<string, unknown>,
            client_id: extractedClientId,
          });
        }
      }
    }
  }
  
  return readings;
}

// Extract client ID from batch ID (format: batch_client_XXXX_timestamp_id)
function extractClientIdFromBatchId(batchId: string): string | null {
  const match = batchId.match(/batch_client_([a-f0-9]+)_/i);
  if (match) {
    return `client_${match[1]}`;
  }
  return null;
}

// Extract device type from sensor ID (e.g., bluetooth_scanner_1 -> bluetooth_scanner)
function extractDeviceType(sensorId: string): string {
  // Remove trailing numbers and underscores
  const match = sensorId.match(/^(.+?)_?\d*$/);
  if (match) {
    return match[1].replace(/_\d+$/, '');
  }
  return sensorId;
}

// Comprehensive hook to fetch all sensor data for a client
export function useClientSensorData(clientId: string) {
  return useQuery({
    queryKey: ["aurora", "client", clientId, "sensor-data"],
    queryFn: async () => {
      if (!clientId) return { readings: [], byType: {} as SensorDataByType };
      
      try {
        // Fetch recent batches
        const batchesResponse = await callAuroraApi<{ batches: BatchWithSensors[] }>(
          `/api/batches/list?limit=50`
        );
        
        // Extract client identifier from clientId (e.g., client_e45f01ac9b5f -> e45f01ac9b5f)
        const clientIdentifier = clientId.replace('client_', '');
        
        // Filter batches for this client by checking batch_id pattern
        const clientBatches = (batchesResponse.batches || []).filter(b => {
          // Match by client_id field
          if (b.client_id === clientId) return true;
          // Match by batch_id containing client identifier
          if (b.batch_id.includes(clientIdentifier)) return true;
          // Match extracted client_id from batch_id
          const extractedClient = extractClientIdFromBatchId(b.batch_id);
          if (extractedClient === clientId) return true;
          return false;
        });
        
        console.debug(`Found ${clientBatches.length} batches for client ${clientId}`);
        
        // Get the most recent batches (up to 10)
        const recentBatches = clientBatches.slice(0, 10);
        
        // Fetch full data for each batch
        const allReadings: ClientSensorReading[] = [];
        
        await Promise.all(
          recentBatches.map(async (batch) => {
            try {
              const fullBatch = await callAuroraApi<BatchWithSensors>(`/api/batches/${batch.batch_id}`);
              const readings = extractSensorReadings(fullBatch, clientId);
              console.debug(`Extracted ${readings.length} sensors from batch ${batch.batch_id}`);
              allReadings.push(...readings);
            } catch (error) {
              console.debug(`Failed to fetch batch ${batch.batch_id}:`, error);
            }
          })
        );
        
        console.debug(`Total sensor readings for ${clientId}: ${allReadings.length}`);
        
        // Group readings by sensor type
        const byType: SensorDataByType = {};
        
        for (const reading of allReadings) {
          const type = reading.device_type.toLowerCase();
          const key = type.includes('starlink') ? 'starlink' :
                     type.includes('system') || type.includes('monitor') ? 'system_monitor' :
                     type.includes('wifi') ? 'wifi_scanner' :
                     type.includes('bluetooth') || type.includes('ble') ? 'bluetooth_scanner' :
                     type.includes('adsb') || type.includes('aircraft') ? 'adsb_detector' :
                     type.includes('gps') || type.includes('gnss') ? 'gps' :
                     type.includes('thermal') || type.includes('probe') || type.includes('temp') ? 'thermal_probe' :
                     type.includes('arduino') ? 'arduino' :
                     type.includes('lora') ? 'lora' : type;
          
          if (!byType[key]) {
            byType[key] = [];
          }
          byType[key]!.push(reading);
        }
        
        // Sort each type by timestamp (newest first)
        for (const key of Object.keys(byType)) {
          byType[key]!.sort((a, b) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
        }
        
        return { readings: allReadings, byType };
      } catch (error) {
        console.warn(`Failed to fetch sensor data for client ${clientId}:`, error);
        return { readings: [], byType: {} as SensorDataByType };
      }
    },
    enabled: hasAuroraSession() && !!clientId,
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 1,
  });
}

// Hook for specific sensor type readings
export function useClientSensorTypeData(clientId: string, sensorType: string, hours: number = 24) {
  return useQuery({
    queryKey: ["aurora", "readings", "client", clientId, "sensor", sensorType, hours],
    queryFn: async () => {
      if (!clientId || !sensorType) return [];
      
      try {
        // Try the readings endpoint with client filter
        const response = await callAuroraApi<{ readings: ClientSensorReading[]; count?: number }>(
          `/api/readings/sensor/${sensorType}?hours=${hours}`
        );
        
        // Filter for this client
        const readings = (response.readings || []).filter(r => 
          r.client_id === clientId || 
          r.device_id?.includes(clientId.replace('client_', ''))
        );
        
        return readings;
      } catch (error) {
        console.warn(`Failed to fetch ${sensorType} readings for ${clientId}:`, error);
        return [];
      }
    },
    enabled: hasAuroraSession() && !!clientId && !!sensorType,
    ...fastQueryOptions,
  });
}

// Hook for Starlink-specific data
export function useClientStarlinkData(clientId: string) {
  return useQuery({
    queryKey: ["aurora", "client", clientId, "starlink"],
    queryFn: async () => {
      if (!clientId) return null;
      
      try {
        // Try direct starlink stats endpoint
        const stats = await callAuroraApi<Record<string, unknown>>(`/api/stats/sensors/starlink?hours=1`);
        
        // Also try to get readings
        const readingsResponse = await callAuroraApi<{ readings: ClientSensorReading[] }>(
          `/api/readings/sensor/starlink?hours=24`
        );
        
        const clientReadings = (readingsResponse.readings || []).filter(r =>
          r.client_id === clientId || 
          r.device_id?.includes(clientId.replace('client_', ''))
        );
        
        return {
          stats,
          readings: clientReadings,
          latest: clientReadings[0] || null,
        };
      } catch (error) {
        console.warn(`Failed to fetch Starlink data for ${clientId}:`, error);
        return null;
      }
    },
    enabled: hasAuroraSession() && !!clientId,
    ...fastQueryOptions,
  });
}

// Hook for System Monitor data
export function useClientSystemMonitorData(clientId: string) {
  return useQuery({
    queryKey: ["aurora", "client", clientId, "system-monitor"],
    queryFn: async () => {
      if (!clientId) return null;
      
      try {
        const readingsResponse = await callAuroraApi<{ readings: ClientSensorReading[] }>(
          `/api/readings/sensor/system_monitor?hours=24`
        );
        
        const clientReadings = (readingsResponse.readings || []).filter(r =>
          r.client_id === clientId ||
          r.device_id?.includes(clientId.replace('client_', ''))
        );
        
        return {
          readings: clientReadings,
          latest: clientReadings[0] || null,
        };
      } catch (error) {
        console.warn(`Failed to fetch System Monitor data for ${clientId}:`, error);
        return null;
      }
    },
    enabled: hasAuroraSession() && !!clientId,
    ...fastQueryOptions,
  });
}

// Hook for WiFi Scanner data
export function useClientWifiData(clientId: string) {
  return useQuery({
    queryKey: ["aurora", "client", clientId, "wifi"],
    queryFn: async () => {
      if (!clientId) return null;
      
      try {
        const readingsResponse = await callAuroraApi<{ readings: ClientSensorReading[] }>(
          `/api/readings/sensor/wifi_scanner?hours=24`
        );
        
        const clientReadings = (readingsResponse.readings || []).filter(r =>
          r.client_id === clientId ||
          r.device_id?.includes(clientId.replace('client_', ''))
        );
        
        return {
          readings: clientReadings,
          latest: clientReadings[0] || null,
        };
      } catch (error) {
        console.warn(`Failed to fetch WiFi data for ${clientId}:`, error);
        return null;
      }
    },
    enabled: hasAuroraSession() && !!clientId,
    ...fastQueryOptions,
  });
}

// Hook for Bluetooth Scanner data
export function useClientBluetoothData(clientId: string) {
  return useQuery({
    queryKey: ["aurora", "client", clientId, "bluetooth"],
    queryFn: async () => {
      if (!clientId) return null;
      
      try {
        const readingsResponse = await callAuroraApi<{ readings: ClientSensorReading[] }>(
          `/api/readings/sensor/bluetooth_scanner?hours=24`
        );
        
        const clientReadings = (readingsResponse.readings || []).filter(r =>
          r.client_id === clientId ||
          r.device_id?.includes(clientId.replace('client_', ''))
        );
        
        return {
          readings: clientReadings,
          latest: clientReadings[0] || null,
        };
      } catch (error) {
        console.warn(`Failed to fetch Bluetooth data for ${clientId}:`, error);
        return null;
      }
    },
    enabled: hasAuroraSession() && !!clientId,
    ...fastQueryOptions,
  });
}

// Hook for ADS-B data
export function useClientAdsbData(clientId: string) {
  return useQuery({
    queryKey: ["aurora", "client", clientId, "adsb"],
    queryFn: async () => {
      if (!clientId) return null;
      
      try {
        // Get ADS-B stats
        const stats = await callAuroraApi<Record<string, unknown>>(`/api/adsb/stats`);
        
        // Get aircraft data
        const aircraft = await callAuroraApi<{ aircraft: unknown[] }>(`/api/adsb/aircraft`);
        
        return {
          stats,
          aircraft: aircraft.aircraft || [],
          count: (aircraft.aircraft || []).length,
        };
      } catch (error) {
        console.warn(`Failed to fetch ADS-B data for ${clientId}:`, error);
        return null;
      }
    },
    enabled: hasAuroraSession() && !!clientId,
    ...fastQueryOptions,
  });
}

// Hook for GPS data
export function useClientGpsData(clientId: string) {
  return useQuery({
    queryKey: ["aurora", "client", clientId, "gps"],
    queryFn: async () => {
      if (!clientId) return null;
      
      try {
        // Try GPSD status
        const gpsdStatus = await callAuroraApi<Record<string, unknown>>(`/gpsd_status.jsonl`);
        
        // Try GPS readings
        const readingsResponse = await callAuroraApi<{ readings: ClientSensorReading[] }>(
          `/api/readings/sensor/gps?hours=24`
        );
        
        const clientReadings = (readingsResponse.readings || []).filter(r =>
          r.client_id === clientId ||
          r.device_id?.includes(clientId.replace('client_', ''))
        );
        
        return {
          gpsdStatus,
          readings: clientReadings,
          latest: clientReadings[0] || null,
        };
      } catch (error) {
        console.warn(`Failed to fetch GPS data for ${clientId}:`, error);
        return null;
      }
    },
    enabled: hasAuroraSession() && !!clientId,
    ...fastQueryOptions,
  });
}

// Hook for Thermal Probe data
export function useClientThermalData(clientId: string) {
  return useQuery({
    queryKey: ["aurora", "client", clientId, "thermal"],
    queryFn: async () => {
      if (!clientId) return null;
      
      try {
        const readingsResponse = await callAuroraApi<{ readings: ClientSensorReading[] }>(
          `/api/readings/sensor/thermal_probe?hours=24`
        );
        
        const clientReadings = (readingsResponse.readings || []).filter(r =>
          r.client_id === clientId ||
          r.device_id?.includes(clientId.replace('client_', ''))
        );
        
        return {
          readings: clientReadings,
          latest: clientReadings[0] || null,
        };
      } catch (error) {
        console.warn(`Failed to fetch Thermal data for ${clientId}:`, error);
        return null;
      }
    },
    enabled: hasAuroraSession() && !!clientId,
    ...fastQueryOptions,
  });
}
