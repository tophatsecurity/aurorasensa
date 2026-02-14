// Aurora API - Arduino Sensor Hooks
// Updated to use dedicated /api/arduino/* endpoints
import { useQuery } from "@tanstack/react-query";
import { callAuroraApi, hasAuroraSession, fastQueryOptions, defaultQueryOptions } from "./core";
import { ARDUINO, READINGS, STATS, withQuery } from "./endpoints";
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

export interface ArduinoCurrentReading {
  device_id?: string;
  client_id?: string;
  timestamp?: string;
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

export interface ArduinoSummary {
  device_count?: number;
  total_readings?: number;
  active_devices?: number;
  avg_temperature_c?: number;
  avg_humidity?: number;
  avg_pressure?: number;
  min_temperature_c?: number;
  max_temperature_c?: number;
}

// =============================================
// DEDICATED ARDUINO ENDPOINT HOOKS
// =============================================

/** List Arduino devices from /api/arduino/devices */
export function useArduinoDevices() {
  return useQuery({
    queryKey: ["aurora", "arduino", "devices"],
    queryFn: async () => {
      try {
        const result = await callAuroraApi<ArduinoDeviceWithMetrics[] | { devices: ArduinoDeviceWithMetrics[] }>(ARDUINO.DEVICES);
        if (Array.isArray(result)) return result;
        return result?.devices || [];
      } catch {
        return [];
      }
    },
    enabled: hasAuroraSession(),
    ...fastQueryOptions,
    retry: 1,
  });
}

/** Get current Arduino readings from /api/arduino/current */
export function useArduinoCurrent(clientId?: string) {
  return useQuery({
    queryKey: ["aurora", "arduino", "current", clientId],
    queryFn: async () => {
      const path = clientId ? `${ARDUINO.CURRENT}?client_id=${clientId}` : ARDUINO.CURRENT;
      return callAuroraApi<ArduinoCurrentReading | ArduinoCurrentReading[]>(path);
    },
    enabled: hasAuroraSession(),
    ...fastQueryOptions,
    retry: 1,
  });
}

/** Get Arduino temperature data from /api/arduino/temperature */
export function useArduinoTemperature(hours: number = 24, clientId?: string) {
  return useQuery({
    queryKey: ["aurora", "arduino", "temperature", hours, clientId],
    queryFn: async () => {
      const params: Record<string, string | number | undefined> = { hours };
      if (clientId) params.client_id = clientId;
      const result = await callAuroraApi<ArduinoTimeseriesPoint[]>(withQuery(ARDUINO.TEMPERATURE, params));
      return Array.isArray(result) ? result : [];
    },
    enabled: hasAuroraSession(),
    ...defaultQueryOptions,
    retry: 1,
  });
}

/** Get Arduino humidity data from /api/arduino/humidity */
export function useArduinoHumidity(hours: number = 24, clientId?: string) {
  return useQuery({
    queryKey: ["aurora", "arduino", "humidity", hours, clientId],
    queryFn: async () => {
      const params: Record<string, string | number | undefined> = { hours };
      if (clientId) params.client_id = clientId;
      const result = await callAuroraApi<ArduinoTimeseriesPoint[]>(withQuery(ARDUINO.HUMIDITY, params));
      return Array.isArray(result) ? result : [];
    },
    enabled: hasAuroraSession(),
    ...defaultQueryOptions,
    retry: 1,
  });
}

/** Get Arduino pressure data from /api/arduino/pressure */
export function useArduinoPressure(hours: number = 24, clientId?: string) {
  return useQuery({
    queryKey: ["aurora", "arduino", "pressure", hours, clientId],
    queryFn: async () => {
      const params: Record<string, string | number | undefined> = { hours };
      if (clientId) params.client_id = clientId;
      const result = await callAuroraApi<ArduinoTimeseriesPoint[]>(withQuery(ARDUINO.PRESSURE, params));
      return Array.isArray(result) ? result : [];
    },
    enabled: hasAuroraSession(),
    ...defaultQueryOptions,
    retry: 1,
  });
}

/** Get Arduino light data from /api/arduino/light */
export function useArduinoLight(hours: number = 24, clientId?: string) {
  return useQuery({
    queryKey: ["aurora", "arduino", "light", hours, clientId],
    queryFn: async () => {
      const params: Record<string, string | number | undefined> = { hours };
      if (clientId) params.client_id = clientId;
      const result = await callAuroraApi<ArduinoTimeseriesPoint[]>(withQuery(ARDUINO.LIGHT, params));
      return Array.isArray(result) ? result : [];
    },
    enabled: hasAuroraSession(),
    ...defaultQueryOptions,
    retry: 1,
  });
}

/** Get Arduino sound data from /api/arduino/sound */
export function useArduinoSound(hours: number = 24, clientId?: string) {
  return useQuery({
    queryKey: ["aurora", "arduino", "sound", hours, clientId],
    queryFn: async () => {
      const params: Record<string, string | number | undefined> = { hours };
      if (clientId) params.client_id = clientId;
      const result = await callAuroraApi<ArduinoTimeseriesPoint[]>(withQuery(ARDUINO.SOUND, params));
      return Array.isArray(result) ? result : [];
    },
    enabled: hasAuroraSession(),
    ...defaultQueryOptions,
    retry: 1,
  });
}

/** Get Arduino accelerometer data from /api/arduino/accelerometer */
export function useArduinoAccelerometer(hours: number = 24, clientId?: string) {
  return useQuery({
    queryKey: ["aurora", "arduino", "accelerometer", hours, clientId],
    queryFn: async () => {
      const params: Record<string, string | number | undefined> = { hours };
      if (clientId) params.client_id = clientId;
      const result = await callAuroraApi<ArduinoTimeseriesPoint[]>(withQuery(ARDUINO.ACCELEROMETER, params));
      return Array.isArray(result) ? result : [];
    },
    enabled: hasAuroraSession(),
    ...defaultQueryOptions,
    retry: 1,
  });
}

/** Get Arduino history from /api/arduino/history */
export function useArduinoHistory(hours: number = 24, clientId?: string, deviceId?: string) {
  return useQuery({
    queryKey: ["aurora", "arduino", "history", hours, clientId, deviceId],
    queryFn: async () => {
      const params: Record<string, string | number | undefined> = { hours };
      if (clientId) params.client_id = clientId;
      if (deviceId) params.device_id = deviceId;
      const result = await callAuroraApi<ArduinoTimeseriesPoint[]>(withQuery(ARDUINO.HISTORY, params));
      return Array.isArray(result) ? result : [];
    },
    enabled: hasAuroraSession(),
    ...defaultQueryOptions,
    retry: 1,
  });
}

/** Get Arduino summary from /api/arduino/summary */
export function useArduinoSummary(clientId?: string) {
  return useQuery({
    queryKey: ["aurora", "arduino", "summary", clientId],
    queryFn: async () => {
      const path = clientId ? `${ARDUINO.SUMMARY}?client_id=${clientId}` : ARDUINO.SUMMARY;
      return callAuroraApi<ArduinoSummary>(path);
    },
    enabled: hasAuroraSession(),
    ...defaultQueryOptions,
    retry: 1,
  });
}

// =============================================
// LEGACY HOOKS (kept for backward compat, now use dedicated endpoints with fallback)
// =============================================

export function useArduinoDevicesFromReadings() {
  return useQuery({
    queryKey: ["aurora", "arduino", "devices-from-readings"],
    queryFn: async () => {
      // Try dedicated endpoint first
      try {
        const devices = await callAuroraApi<ArduinoDeviceWithMetrics[] | { devices: ArduinoDeviceWithMetrics[] }>(ARDUINO.DEVICES);
        const list = Array.isArray(devices) ? devices : devices?.devices || [];
        if (list.length > 0) return list;
      } catch {
        // Fallback to readings-based extraction
      }

      try {
        const response = await callAuroraApi<{ count: number; readings: LatestReading[] }>(READINGS.LATEST);
        const readings = response?.readings || [];
        const arduinoReadings = readings.filter(r => 
          r.device_type === 'arduino' || 
          r.device_type?.toLowerCase().includes('arduino') ||
          r.device_id?.toLowerCase().includes('arduino')
        );
        const devicesMap = new Map<string, ArduinoDeviceWithMetrics>();
        arduinoReadings.forEach(reading => {
          const clientId = reading.client_id || 'unknown';
          const deviceId = reading.device_id || 'unknown';
          const compositeKey = `${clientId}:${deviceId}`;
          const data = (reading.data || {}) as Record<string, unknown>;
          const arduinoData = ((data?.arduino as Record<string, unknown>) || data || {}) as Record<string, unknown>;
          let lat: number | undefined;
          let lng: number | undefined;
          if (data && typeof data.latitude === 'number') {
            lat = data.latitude as number;
            lng = typeof data.longitude === 'number' ? data.longitude as number : undefined;
          }
          devicesMap.set(compositeKey, {
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
          });
        });
        return Array.from(devicesMap.values());
      } catch {
        return [];
      }
    },
    enabled: hasAuroraSession(),
    ...fastQueryOptions,
    retry: 1,
  });
}

export function useArduinoReadings(hours: number = 24, clientId?: string, deviceId?: string) {
  return useQuery({
    queryKey: ["aurora", "arduino", "readings", hours, clientId, deviceId],
    queryFn: async () => {
      // Try dedicated history endpoint first
      try {
        const params: Record<string, string | number | undefined> = { hours };
        if (clientId && clientId !== 'all') params.client_id = clientId;
        if (deviceId) params.device_id = deviceId;
        const result = await callAuroraApi<ArduinoTimeseriesPoint[] | { readings: ArduinoTimeseriesPoint[]; count?: number }>(
          withQuery(ARDUINO.HISTORY, params)
        );
        if (Array.isArray(result)) return { count: result.length, readings: result };
        if (result?.readings) return { count: result.count ?? result.readings.length, readings: result.readings };
      } catch {
        // Fallback to generic readings endpoint
      }

      try {
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
        const params: Record<string, string | number | undefined> = { hours };
        if (clientId && clientId !== 'all') params.client_id = clientId;
        if (deviceId) params.device_id = deviceId;
        const response = await callAuroraApi<RawResponse>(withQuery(READINGS.BY_SENSOR_TYPE('arduino'), params));
        const transformedReadings: ArduinoTimeseriesPoint[] = (response.readings || []).map(r => {
          const arduinoData = (r.data?.arduino as Record<string, unknown>) || r.data || {};
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
        return { count: transformedReadings.length, readings: transformedReadings };
      } catch {
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
      // Try dedicated endpoint first
      try {
        const result = await callAuroraApi<ArduinoStats>(ARDUINO.STATS);
        if (result && Object.keys(result).length > 0) return result;
      } catch {
        // Fallback
      }
      try {
        return await callAuroraApi<ArduinoStats>(STATS.SENSOR_TYPE('arduino'));
      } catch {
        return null;
      }
    },
    enabled: hasAuroraSession(),
    ...defaultQueryOptions,
    retry: 1,
  });
}

export function useArduinoDeviceMetrics(clientId: string | null, deviceId: string | null, hours: number = 24) {
  return useQuery({
    queryKey: ["aurora", "arduino", "device-metrics", clientId, deviceId, hours],
    queryFn: async () => {
      if (!clientId || !deviceId) return { count: 0, readings: [] };
      
      // Try dedicated history endpoint
      try {
        const result = await callAuroraApi<ArduinoTimeseriesPoint[] | { readings: ArduinoTimeseriesPoint[]; count?: number }>(
          withQuery(ARDUINO.HISTORY, { hours, client_id: clientId, device_id: deviceId })
        );
        if (Array.isArray(result)) return { count: result.length, readings: result };
        if (result?.readings) return { count: result.count ?? result.readings.length, readings: result.readings };
      } catch {
        // Fallback
      }

      try {
        interface RawResponse { count?: number; readings?: Array<{ timestamp: string; device_id?: string; client_id?: string; data?: Record<string, unknown> }> }
        const response = await callAuroraApi<RawResponse>(
          withQuery(READINGS.BY_SENSOR_TYPE('arduino'), { hours, client_id: clientId, device_id: deviceId })
        );
        const transformedReadings: ArduinoTimeseriesPoint[] = (response.readings || []).map(r => {
          const arduinoData = (r.data?.arduino as Record<string, number | undefined>) || r.data || {};
          return {
            timestamp: r.timestamp, client_id: r.client_id, device_id: r.device_id,
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
        return { count: transformedReadings.length, readings: transformedReadings };
      } catch {
        return { count: 0, readings: [] };
      }
    },
    enabled: hasAuroraSession() && !!clientId && !!deviceId,
    ...fastQueryOptions,
    retry: 1,
  });
}
