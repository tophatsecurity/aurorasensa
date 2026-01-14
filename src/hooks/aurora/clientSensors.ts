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

// WiFi Network interface
export interface WifiNetwork {
  ssid?: string;
  bssid?: string;
  signal?: number;
  channel?: number;
  frequency?: number;
  security?: string;
  band?: string;
  last_seen?: string;
}

// Bluetooth Device interface
export interface BluetoothDevice {
  address?: string;
  name?: string;
  rssi?: number;
  type?: string;
  manufacturer?: string;
  last_seen?: string;
  uuid?: string;
  connectable?: boolean;
}

// GPS Data interface
export interface GpsData {
  latitude?: number;
  longitude?: number;
  altitude?: number;
  speed?: number;
  heading?: number;
  satellites?: number;
  fix_quality?: number;
  hdop?: number;
  timestamp?: string;
}

// Arduino Metrics interface
export interface ArduinoMetrics {
  temperature_c?: number;
  temperature_f?: number;
  humidity?: number;
  pressure?: number;
  light_level?: number;
  soil_moisture?: number;
  co2_ppm?: number;
  tvoc_ppb?: number;
  voltage?: number;
  current?: number;
  power_w?: number;
  [key: string]: number | string | undefined;
}

// Fetch batches for a specific client
export function useBatchesByClient(clientId: string, limit: number = 10) {
  return useQuery({
    queryKey: ["aurora", "batches", "by-client", clientId, limit],
    queryFn: async () => {
      if (!clientId) return { batches: [], count: 0 };
      try {
        // Use the client-specific endpoint for accurate filtering
        const response = await callAuroraApi<{ 
          batches: BatchWithSensors[]; 
          client_id?: string;
          count?: number;
          total?: number;
        }>(
          `/api/batches/by-client/${clientId}?limit=${limit}`
        );
        return {
          batches: response.batches || [],
          count: response.count || response.total || (response.batches?.length || 0),
        };
      } catch (error) {
        console.warn(`Failed to fetch batches for client ${clientId}:`, error);
        return { batches: [], count: 0 };
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
  
  const extractedClientId = batch.client_id !== 'unknown' 
    ? batch.client_id 
    : extractClientIdFromBatchId(batch.batch_id) || clientId;
  
  if (batch.readings && Array.isArray(batch.readings)) {
    for (const reading of batch.readings) {
      const timestamp = reading.timestamp || batch.timestamp;
      const sensors = reading.sensors;
      
      if (sensors && typeof sensors === 'object') {
        for (const [sensorId, sensorData] of Object.entries(sensors)) {
          if (!sensorData) continue;
          
          // Extract device type from sensor data OR from sensorId (e.g., "adsb_rtlsdr_1" -> "adsb_detector")
          const deviceType = sensorData.device_type || inferDeviceTypeFromSensorId(sensorId);
          
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

function extractClientIdFromBatchId(batchId: string): string | null {
  const match = batchId.match(/batch_client_([a-f0-9]+)_/i);
  if (match) {
    return `client_${match[1]}`;
  }
  return null;
}

// Infer device type from sensor ID patterns
function inferDeviceTypeFromSensorId(sensorId: string): string {
  const id = sensorId.toLowerCase();
  
  // Match common sensor ID patterns to device types
  if (id.includes('adsb') || id.includes('rtlsdr') || id.includes('aircraft')) return 'adsb_detector';
  if (id.includes('starlink')) return 'starlink';
  if (id.includes('system') || id.includes('monitor')) return 'system_monitor';
  if (id.includes('wifi')) return 'wifi_scanner';
  if (id.includes('bluetooth') || id.includes('ble') || id.includes('bt_')) return 'bluetooth_scanner';
  if (id.includes('gps') || id.includes('gnss')) return 'gps';
  if (id.includes('thermal') || id.includes('probe') || id.includes('temp')) return 'thermal_probe';
  if (id.includes('arduino')) return 'arduino';
  if (id.includes('lora')) return 'lora';
  
  // Fallback: strip trailing numbers and underscores
  const stripped = sensorId.replace(/_\d+$/, '').replace(/\d+$/, '');
  return stripped || sensorId;
}

// Comprehensive hook to fetch all sensor data for a client
export function useClientSensorData(clientId: string) {
  return useQuery({
    queryKey: ["aurora", "client", clientId, "sensor-data"],
    queryFn: async () => {
      if (!clientId) return { readings: [], byType: {} as SensorDataByType };
      
      try {
        // Use the client-specific batches endpoint for accurate filtering
        const batchesResponse = await callAuroraApi<{ 
          batches: BatchWithSensors[]; 
          client_id?: string;
          count?: number;
        }>(
          `/api/batches/by-client/${clientId}?limit=10`
        );
        
        const clientBatches = batchesResponse.batches || [];
        const allReadings: ClientSensorReading[] = [];
        
        // Fetch full batch data for each batch
        await Promise.all(
          clientBatches.slice(0, 10).map(async (batch) => {
            try {
              const fullBatch = await callAuroraApi<BatchWithSensors>(`/api/batches/${batch.batch_id}`);
              const readings = extractSensorReadings(fullBatch, clientId);
              allReadings.push(...readings);
            } catch (error) {
              console.debug(`Failed to fetch batch ${batch.batch_id}:`, error);
            }
          })
        );
        
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
        const response = await callAuroraApi<{ readings: ClientSensorReading[]; count?: number }>(
          `/api/readings/sensor/${sensorType}?hours=${hours}`
        );
        
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
        const stats = await callAuroraApi<Record<string, unknown>>(`/api/stats/sensors/starlink?hours=1`);
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

// Hook for WiFi Scanner data with networks extraction
export function useClientWifiData(clientId: string) {
  return useQuery({
    queryKey: ["aurora", "client", clientId, "wifi"],
    queryFn: async () => {
      if (!clientId) return null;
      
      try {
        // Try WiFi scan endpoint first
        let networks: WifiNetwork[] = [];
        try {
          const scanResponse = await callAuroraApi<{ networks?: WifiNetwork[] }>(
            `/api/clients/${clientId}/wifi/scan`
          );
          networks = scanResponse.networks || [];
        } catch {
          // Fallback to readings
        }
        
        // Get WiFi status
        let status: Record<string, unknown> | null = null;
        try {
          status = await callAuroraApi<Record<string, unknown>>(
            `/api/clients/${clientId}/wifi/status`
          );
        } catch {
          // Ignore
        }
        
        // Get readings as backup
        const readingsResponse = await callAuroraApi<{ readings: ClientSensorReading[] }>(
          `/api/readings/sensor/wifi_scanner?hours=24`
        );
        
        const clientReadings = (readingsResponse.readings || []).filter(r =>
          r.client_id === clientId ||
          r.device_id?.includes(clientId.replace('client_', ''))
        );
        
        // Extract networks from readings if not from scan
        if (networks.length === 0 && clientReadings.length > 0) {
          const latestData = clientReadings[0]?.data || {};
          const wifiData = (latestData.wifi_scanner as Record<string, unknown>) || 
                          (latestData.wifi as Record<string, unknown>) || 
                          latestData;
          if (Array.isArray(wifiData.networks)) {
            networks = wifiData.networks as WifiNetwork[];
          }
        }
        
        return {
          status,
          networks,
          readings: clientReadings,
          latest: clientReadings[0] || null,
          networkCount: networks.length,
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

// Hook for Bluetooth Scanner data with device extraction
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
        
        // Extract devices from latest reading
        let devices: BluetoothDevice[] = [];
        if (clientReadings.length > 0) {
          const latestData = clientReadings[0]?.data || {};
          const btData = (latestData.bluetooth_scanner as Record<string, unknown>) || 
                        (latestData.bluetooth as Record<string, unknown>) || 
                        latestData;
          if (Array.isArray(btData.devices)) {
            devices = btData.devices as BluetoothDevice[];
          }
        }
        
        return {
          devices,
          readings: clientReadings,
          latest: clientReadings[0] || null,
          deviceCount: devices.length,
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
        // Fetch stats and aircraft in parallel
        const [stats, aircraftResp] = await Promise.all([
          callAuroraApi<Record<string, unknown>>(`/api/adsb/stats`).catch(() => null),
          callAuroraApi<{ aircraft?: unknown[] } | unknown[]>(`/api/adsb/aircraft`).catch(() => ({ aircraft: [] })),
        ]);
        
        // Extract aircraft array from response
        const aircraft = Array.isArray(aircraftResp) 
          ? aircraftResp 
          : (aircraftResp as { aircraft?: unknown[] }).aircraft || [];
        
        // Fetch devices to get device_id for coverage endpoint
        let coverage: Record<string, unknown> | null = null;
        try {
          const devicesResp = await callAuroraApi<{ devices?: Array<{ device_id: string }> } | Array<{ device_id: string }>>(`/api/adsb/devices`);
          const devices = Array.isArray(devicesResp) ? devicesResp : devicesResp.devices || [];
          
          if (devices.length > 0 && devices[0]?.device_id) {
            coverage = await callAuroraApi<Record<string, unknown>>(
              `/api/adsb/coverage?device_id=${devices[0].device_id}`
            );
          }
        } catch {
          // Coverage is optional, ignore errors
        }
        
        // Try emergencies
        let emergencies: unknown[] = [];
        try {
          const emergencyResp = await callAuroraApi<{ aircraft?: unknown[] }>(`/api/adsb/emergencies`);
          emergencies = emergencyResp.aircraft || [];
        } catch {
          // Ignore
        }
        
        return {
          stats,
          aircraft,
          coverage,
          emergencies,
          count: aircraft.length,
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
        // Try GPSD status file
        let gpsdStatus: GpsData | null = null;
        try {
          gpsdStatus = await callAuroraApi<GpsData>(`/gpsd_status.jsonl`);
        } catch {
          // Ignore
        }
        
        // Get GPS readings
        const readingsResponse = await callAuroraApi<{ readings: ClientSensorReading[] }>(
          `/api/readings/sensor/gps?hours=24`
        );
        
        const clientReadings = (readingsResponse.readings || []).filter(r =>
          r.client_id === clientId ||
          r.device_id?.includes(clientId.replace('client_', ''))
        );
        
        // Extract GPS data from latest reading
        let latestGps: GpsData | null = null;
        if (clientReadings.length > 0) {
          const data = clientReadings[0]?.data || {};
          const gpsData = (data.gps as GpsData) || (data.gnss as GpsData) || data;
          latestGps = {
            latitude: gpsData.latitude as number,
            longitude: gpsData.longitude as number,
            altitude: gpsData.altitude as number,
            speed: gpsData.speed as number,
            heading: gpsData.heading as number,
            satellites: gpsData.satellites as number,
            fix_quality: gpsData.fix_quality as number,
            hdop: gpsData.hdop as number,
          };
        }
        
        return {
          gpsdStatus,
          readings: clientReadings,
          latest: clientReadings[0] || null,
          gpsData: latestGps || gpsdStatus,
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
        // Use client-specific batch endpoint for accurate data
        const batchResponse = await callAuroraApi<{ 
          batches: BatchWithSensors[]; 
          client_id?: string;
          count?: number;
        }>(`/api/batches/by-client/${clientId}?limit=20`);
        
        const batches = batchResponse.batches || [];
        
        // Extract Thermal readings from batches
        const clientReadings: ClientSensorReading[] = [];
        
        for (const batch of batches) {
          if (batch.readings && Array.isArray(batch.readings)) {
            for (const reading of batch.readings) {
              const sensors = reading.sensors;
              if (sensors && typeof sensors === 'object') {
                for (const [sensorId, sensorData] of Object.entries(sensors)) {
                  if (!sensorData) continue;
                  
                  const deviceType = (sensorData.device_type as string)?.toLowerCase() || sensorId.toLowerCase();
                  
                  // Check if this is a Thermal sensor
                  if (deviceType.includes('thermal') || deviceType.includes('temp') || deviceType.includes('probe') ||
                      sensorId.toLowerCase().includes('thermal') || sensorId.toLowerCase().includes('temp')) {
                    clientReadings.push({
                      device_id: (sensorData.device_id as string) || sensorId,
                      device_type: 'thermal_probe',
                      timestamp: reading.timestamp || batch.timestamp,
                      data: sensorData as Record<string, unknown>,
                      client_id: clientId,
                    });
                  }
                }
              }
            }
          }
        }
        
        // Sort by timestamp descending
        clientReadings.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        
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

// Hook for Arduino data with all metrics
export function useClientArduinoData(clientId: string) {
  return useQuery({
    queryKey: ["aurora", "client", clientId, "arduino"],
    queryFn: async () => {
      if (!clientId) return null;
      
      try {
        // Use client-specific batch endpoint for accurate data
        const batchResponse = await callAuroraApi<{ 
          batches: BatchWithSensors[]; 
          client_id?: string;
          count?: number;
        }>(`/api/batches/by-client/${clientId}?limit=20`);
        
        const batches = batchResponse.batches || [];
        
        // Extract Arduino readings from batches
        const clientReadings: ClientSensorReading[] = [];
        
        for (const batch of batches) {
          if (batch.readings && Array.isArray(batch.readings)) {
            for (const reading of batch.readings) {
              const sensors = reading.sensors;
              if (sensors && typeof sensors === 'object') {
                for (const [sensorId, sensorData] of Object.entries(sensors)) {
                  if (!sensorData) continue;
                  
                  const deviceType = (sensorData.device_type as string)?.toLowerCase() || sensorId.toLowerCase();
                  
                  // Check if this is an Arduino sensor
                  if (deviceType.includes('arduino') || sensorId.toLowerCase().includes('arduino')) {
                    clientReadings.push({
                      device_id: (sensorData.device_id as string) || sensorId,
                      device_type: 'arduino',
                      timestamp: reading.timestamp || batch.timestamp,
                      data: sensorData as Record<string, unknown>,
                      client_id: clientId,
                    });
                  }
                }
              }
            }
          }
        }
        
        // Sort by timestamp descending
        clientReadings.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        
        // Try Arduino stats
        let stats: Record<string, unknown> | null = null;
        try {
          stats = await callAuroraApi<Record<string, unknown>>(`/api/stats/sensors/arduino`);
        } catch {
          // Ignore
        }
        
        // Try Arduino JSONL file
        let jsonlData: ArduinoMetrics | null = null;
        try {
          jsonlData = await callAuroraApi<ArduinoMetrics>(`/arduino_data.jsonl`);
        } catch {
          // Ignore
        }
        
        // Extract metrics from latest reading
        let metrics: ArduinoMetrics | null = null;
        if (clientReadings.length > 0) {
          const data = clientReadings[0]?.data || {};
          const arduinoData = (data.arduino as Record<string, unknown>) || data as Record<string, unknown>;
          metrics = {
            temperature_c: arduinoData.temperature_c as number | undefined,
            temperature_f: arduinoData.temperature_f as number | undefined,
            humidity: arduinoData.humidity as number | undefined,
            pressure: arduinoData.pressure as number | undefined,
            light_level: arduinoData.light_level as number | undefined,
            soil_moisture: arduinoData.soil_moisture as number | undefined,
            co2_ppm: arduinoData.co2_ppm as number | undefined,
            tvoc_ppb: arduinoData.tvoc_ppb as number | undefined,
            voltage: arduinoData.voltage as number | undefined,
            current: arduinoData.current as number | undefined,
            power_w: arduinoData.power_w as number | undefined,
          };
        }
        
        return {
          stats,
          jsonlData,
          readings: clientReadings,
          latest: clientReadings[0] || null,
          metrics: metrics || jsonlData,
        };
      } catch (error) {
        console.warn(`Failed to fetch Arduino data for ${clientId}:`, error);
        return null;
      }
    },
    enabled: hasAuroraSession() && !!clientId,
    ...fastQueryOptions,
  });
}

// Hook for LoRa data
export function useClientLoraData(clientId: string) {
  return useQuery({
    queryKey: ["aurora", "client", clientId, "lora"],
    queryFn: async () => {
      if (!clientId) return null;
      
      try {
        // Get LoRa devices
        let devices: unknown[] = [];
        try {
          const devResp = await callAuroraApi<{ devices?: unknown[] }>(`/api/lora/devices`);
          devices = devResp.devices || [];
        } catch {
          // Ignore
        }
        
        // Get LoRa detections
        let detections: unknown[] = [];
        try {
          const detResp = await callAuroraApi<{ detections?: unknown[] }>(`/api/lora/detections/recent`);
          detections = detResp.detections || [];
        } catch {
          // Ignore
        }
        
        // Get global stats
        let stats: Record<string, unknown> | null = null;
        try {
          stats = await callAuroraApi<Record<string, unknown>>(`/api/lora/stats/global`);
        } catch {
          // Ignore
        }
        
        return {
          devices,
          detections,
          stats,
        };
      } catch (error) {
        console.warn(`Failed to fetch LoRa data for ${clientId}:`, error);
        return null;
      }
    },
    enabled: hasAuroraSession() && !!clientId,
    ...fastQueryOptions,
  });
}
