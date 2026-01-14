// Aurora API - Arduino Sensor Hooks
import { useQuery } from "@tanstack/react-query";
import { callAuroraApi, hasAuroraSession, fastQueryOptions, defaultQueryOptions } from "./core";
import type { LatestReading } from "./types";

// =============================================
// TYPES
// =============================================

export interface ArduinoDeviceWithMetrics {
  device_id: string;
  client_id: string;
  composite_key: string;
  last_seen?: string;
  latitude?: number;
  longitude?: number;
  metrics: {
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
    [key: string]: number | undefined;
  };
}

export interface ArduinoStats {
  device_count?: number;
  total_readings?: number;
  avg_temperature_c?: number;
  avg_humidity?: number;
  avg_pressure?: number;
  readings_last_hour?: number;
  readings_last_24h?: number;
}

export interface ArduinoTimeseriesPoint {
  timestamp: string;
  client_id?: string;
  device_id?: string;
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
}

// =============================================
// DEVICE EXTRACTION FROM LATEST READINGS
// =============================================

export function useArduinoDevicesFromReadings() {
  return useQuery({
    queryKey: ["aurora", "arduino", "devices-from-readings"],
    queryFn: async () => {
      try {
        const response = await callAuroraApi<{ count: number; readings: LatestReading[] }>("/api/readings/latest");
        const readings = response?.readings || [];
        
        // Filter for arduino readings
        const arduinoReadings = readings.filter(r => 
          r.device_type === 'arduino' || 
          r.device_type?.toLowerCase().includes('arduino') ||
          r.device_id?.toLowerCase().includes('arduino')
        );
        
        // Create a map using composite key (client_id + device_id)
        const devicesMap = new Map<string, ArduinoDeviceWithMetrics>();
        
        arduinoReadings.forEach(reading => {
          const clientId = reading.client_id || 'unknown';
          const deviceId = reading.device_id || 'unknown';
          const compositeKey = `${clientId}:${deviceId}`;
          
          // Extract metrics from the reading data
          const data = reading.data || {};
          const arduinoData = (data.arduino as Record<string, unknown>) || data;
          
          // Extract coordinates from data
          let lat: number | undefined;
          let lng: number | undefined;
          
          if (typeof data.latitude === 'number') {
            lat = data.latitude as number;
            lng = data.longitude as number;
          }
          
          const device: ArduinoDeviceWithMetrics = {
            device_id: deviceId,
            client_id: clientId,
            composite_key: compositeKey,
            last_seen: reading.timestamp,
            latitude: lat,
            longitude: lng,
            metrics: {
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
            },
          };
          
          devicesMap.set(compositeKey, device);
        });
        
        return Array.from(devicesMap.values());
      } catch (error) {
        console.warn("Failed to extract Arduino devices from readings:", error);
        return [];
      }
    },
    enabled: hasAuroraSession(),
    ...fastQueryOptions,
    retry: 1,
  });
}

// =============================================
// SENSOR READINGS HOOKS
// =============================================

export function useArduinoReadings(hours: number = 24, clientId?: string, deviceId?: string) {
  return useQuery({
    queryKey: ["aurora", "arduino", "readings", hours, clientId, deviceId],
    queryFn: async () => {
      try {
        interface RawReading {
          timestamp: string;
          device_id?: string;
          device_type?: string;
          client_id?: string;
          data?: {
            arduino?: {
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
            };
            temperature_c?: number;
            temperature_f?: number;
            humidity?: number;
            pressure?: number;
            light_level?: number;
          };
        }
        
        interface RawResponse {
          count?: number;
          readings?: RawReading[];
          sensor_type?: string;
        }
        
        const params = new URLSearchParams();
        params.append('hours', hours.toString());
        if (clientId && clientId !== 'all') {
          params.append('client_id', clientId);
        }
        if (deviceId) {
          params.append('device_id', deviceId);
        }
        
        const response = await callAuroraApi<RawResponse>(`/api/readings/sensor/arduino?${params.toString()}`);
        
        const transformedReadings: ArduinoTimeseriesPoint[] = (response.readings || []).map(r => {
          const arduinoData = r.data?.arduino || r.data || {};
          
          return {
            timestamp: r.timestamp,
            client_id: r.client_id,
            device_id: r.device_id,
            temperature_c: arduinoData.temperature_c,
            temperature_f: arduinoData.temperature_f,
            humidity: arduinoData.humidity,
            pressure: arduinoData.pressure,
            light_level: arduinoData.light_level,
            soil_moisture: (arduinoData as Record<string, unknown>).soil_moisture as number | undefined,
            co2_ppm: (arduinoData as Record<string, unknown>).co2_ppm as number | undefined,
            tvoc_ppb: (arduinoData as Record<string, unknown>).tvoc_ppb as number | undefined,
            voltage: (arduinoData as Record<string, unknown>).voltage as number | undefined,
            current: (arduinoData as Record<string, unknown>).current as number | undefined,
            power_w: (arduinoData as Record<string, unknown>).power_w as number | undefined,
          };
        });
        
        return { 
          count: transformedReadings.length, 
          readings: transformedReadings 
        };
      } catch (error) {
        console.warn(`Failed to fetch Arduino readings:`, error);
        return { count: 0, readings: [] };
      }
    },
    enabled: hasAuroraSession(),
    ...fastQueryOptions,
    retry: 1,
  });
}

export function useArduinoStats() {
  return useQuery({
    queryKey: ["aurora", "arduino", "stats"],
    queryFn: async () => {
      try {
        return await callAuroraApi<ArduinoStats>("/api/stats/sensors/arduino");
      } catch (error) {
        console.warn("Failed to fetch Arduino stats:", error);
        return null;
      }
    },
    enabled: hasAuroraSession(),
    ...defaultQueryOptions,
    retry: 1,
  });
}

// Hook to fetch device metrics for a specific Arduino device
export function useArduinoDeviceMetrics(clientId: string | null, deviceId: string | null, hours: number = 24) {
  return useQuery({
    queryKey: ["aurora", "arduino", "device-metrics", clientId, deviceId, hours],
    queryFn: async () => {
      if (!clientId || !deviceId) return { count: 0, readings: [] };
      
      try {
        const params = new URLSearchParams();
        params.append('hours', hours.toString());
        params.append('client_id', clientId);
        params.append('device_id', deviceId);
        
        interface RawReading {
          timestamp: string;
          device_id?: string;
          client_id?: string;
          data?: Record<string, unknown>;
        }
        
        interface RawResponse {
          count?: number;
          readings?: RawReading[];
        }
        
        const response = await callAuroraApi<RawResponse>(`/api/readings/sensor/arduino?${params.toString()}`);
        
        const transformedReadings: ArduinoTimeseriesPoint[] = (response.readings || []).map(r => {
          const arduinoData = (r.data?.arduino as Record<string, number | undefined>) || r.data || {};
          
          return {
            timestamp: r.timestamp,
            client_id: r.client_id,
            device_id: r.device_id,
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
        });
        
        return { 
          count: transformedReadings.length, 
          readings: transformedReadings 
        };
      } catch (error) {
        console.warn(`Failed to fetch metrics for device ${clientId}:${deviceId}:`, error);
        return { count: 0, readings: [] };
      }
    },
    enabled: hasAuroraSession() && !!clientId && !!deviceId,
    ...fastQueryOptions,
    retry: 1,
  });
}
