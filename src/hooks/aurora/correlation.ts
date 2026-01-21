// Aurora API - Correlation Timeseries Hooks
// Dedicated hooks for fetching and processing timeseries data for correlation analysis

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { callAuroraApi, hasAuroraSession } from "./core";
import { READINGS } from "./endpoints";

// =============================================
// TYPES
// =============================================

export interface TimeseriesReading {
  timestamp: string;
  client_id?: string;
  device_id?: string;
  [key: string]: unknown;
}

export interface ParsedTimeseriesPoint {
  timestamp: string;
  time: string; // Formatted time bucket key
  client_id?: string;
  device_id?: string;
  values: Record<string, number | undefined>;
}

export interface CorrelationDataPoint {
  time: string;
  timestamp: string;
  x?: number;
  y?: number;
}

export interface CorrelationStats {
  avgX: number;
  avgY: number;
  correlation: number;
  dataPoints: number;
  pairedPoints: number;
  xCount: number;
  yCount: number;
}

interface RawReadingsResponse {
  count?: number;
  readings?: Array<{
    timestamp: string;
    sensor?: string;
    measurement?: string;
    batch_id?: string;
    client_id?: string;
    device_id?: string;
    device_type?: string;
    data?: Record<string, unknown>;
  }>;
  sensor_type?: string;
}

// =============================================
// PARSING UTILITIES
// =============================================

/**
 * Parse measurement JSON string or return data object
 */
function parseMeasurement(reading: RawReadingsResponse['readings'][0]): Record<string, unknown> {
  if (reading.measurement && typeof reading.measurement === 'string') {
    try {
      return JSON.parse(reading.measurement);
    } catch {
      console.warn('Failed to parse measurement JSON');
      return {};
    }
  }
  return (reading.data || {}) as Record<string, unknown>;
}

/**
 * Safely extract numeric value from nested object paths
 */
function extractNumber(data: Record<string, unknown>, ...paths: string[]): number | undefined {
  for (const path of paths) {
    const keys = path.split('.');
    let value: unknown = data;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = (value as Record<string, unknown>)[key];
      } else {
        value = undefined;
        break;
      }
    }
    
    if (typeof value === 'number' && !isNaN(value) && isFinite(value)) {
      return value;
    }
  }
  return undefined;
}

/**
 * Format timestamp to time bucket key based on time range
 */
function formatTimeBucket(timestamp: string, hours: number): string {
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return '';
  
  // Adaptive bucket size based on time range
  let bucketMinutes: number;
  let includeDate = false;
  
  if (hours <= 1) {
    bucketMinutes = 5;
  } else if (hours <= 6) {
    bucketMinutes = 10;
  } else if (hours <= 24) {
    bucketMinutes = 15;
    includeDate = true;
  } else {
    bucketMinutes = 60;
    includeDate = true;
  }
  
  const minutes = Math.floor(date.getMinutes() / bucketMinutes) * bucketMinutes;
  const timeStr = `${date.getHours().toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  
  if (includeDate) {
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${month}-${day} ${timeStr}`;
  }
  
  return timeStr;
}

// =============================================
// STARLINK METRICS EXTRACTION
// =============================================

export interface StarlinkMetrics {
  power_w?: number;
  pop_ping_latency_ms?: number;
  downlink_throughput_bps?: number;
  uplink_throughput_bps?: number;
  obstruction_percent?: number;
  snr?: number;
}

function extractStarlinkMetrics(data: Record<string, unknown>): StarlinkMetrics {
  const starlink = (data.starlink || data) as Record<string, unknown>;
  const pingLatency = (starlink?.ping_latency || data?.ping_latency) as Record<string, number> | undefined;
  const powerStats = data?.power_stats as Record<string, number> | undefined;
  
  return {
    power_w: extractNumber(starlink, 'power_watts') ?? 
             extractNumber(powerStats || {}, 'latest_power', 'mean_power') ??
             extractNumber(data, 'power_watts', 'power_w'),
    pop_ping_latency_ms: extractNumber(starlink, 'pop_ping_latency_ms') ?? 
                          pingLatency?.['Mean RTT, drop == 0'] ?? 
                          pingLatency?.['Mean RTT, drop < 1'] ??
                          extractNumber(data, 'pop_ping_latency_ms'),
    downlink_throughput_bps: extractNumber(starlink, 'downlink_throughput_bps') ??
                              extractNumber(data, 'downlink_throughput_bps'),
    uplink_throughput_bps: extractNumber(starlink, 'uplink_throughput_bps') ??
                            extractNumber(data, 'uplink_throughput_bps'),
    obstruction_percent: extractNumber(starlink, 'obstruction_percent') ??
                          extractNumber(data, 'obstruction_percent'),
    snr: extractNumber(starlink, 'snr') ?? extractNumber(data, 'snr'),
  };
}

// =============================================
// THERMAL METRICS EXTRACTION
// =============================================

export interface ThermalMetrics {
  temp_c?: number;
  temp_f?: number;
  ambient_c?: number;
  probe_c?: number;
}

function extractThermalMetrics(data: Record<string, unknown>): ThermalMetrics {
  return {
    temp_c: extractNumber(data, 'temperature_c', 'temp_c', 'probe_c', 'ambient_c'),
    temp_f: extractNumber(data, 'temperature_f', 'temp_f'),
    ambient_c: extractNumber(data, 'ambient_c'),
    probe_c: extractNumber(data, 'probe_c'),
  };
}

// =============================================
// ARDUINO METRICS EXTRACTION
// =============================================

export interface ArduinoMetrics {
  th_temp_c?: number;
  th_humidity?: number;
  bmp_temp_c?: number;
  bmp_pressure_hpa?: number;
  light_raw?: number;
  sound_raw?: number;
}

function extractArduinoMetrics(data: Record<string, unknown>): ArduinoMetrics {
  const th = data.th as Record<string, unknown> | undefined;
  const bmp = data.bmp as Record<string, unknown> | undefined;
  const analog = data.analog as Record<string, unknown> | undefined;
  
  return {
    th_temp_c: extractNumber(th || {}, 'temp_c') ?? 
               extractNumber(data, 'aht_temp_c', 'temp_c'),
    th_humidity: extractNumber(th || {}, 'hum_pct') ?? 
                 extractNumber(data, 'aht_humidity', 'humidity'),
    bmp_temp_c: extractNumber(bmp || {}, 'temp_c') ?? 
                extractNumber(data, 'bme280_temp_c', 'bmp_temp_c'),
    bmp_pressure_hpa: extractNumber(bmp || {}, 'press_hpa') ?? 
                      extractNumber(data, 'bme280_pressure_hpa', 'pressure_hpa'),
    light_raw: extractNumber(analog || {}, 'light_raw') ?? 
               extractNumber(data, 'light_raw'),
    sound_raw: extractNumber(analog || {}, 'sound_raw') ?? 
               extractNumber(data, 'sound_raw'),
  };
}

// =============================================
// CORRELATION DATA HOOKS
// =============================================

export function useCorrelationStarlinkData(hours: number = 24, clientId?: string) {
  return useQuery({
    queryKey: ["aurora", "correlation", "starlink", hours, clientId],
    queryFn: async () => {
      const params = new URLSearchParams({ hours: hours.toString() });
      if (clientId && clientId !== 'all') {
        params.append('client_id', clientId);
      }
      
      const response = await callAuroraApi<RawReadingsResponse>(
        `${READINGS.BY_SENSOR_TYPE('starlink')}?${params.toString()}`
      );
      
      const readings = (response.readings || []).map(r => {
        const data = parseMeasurement(r);
        const metrics = extractStarlinkMetrics(data);
        return {
          timestamp: r.timestamp,
          time: formatTimeBucket(r.timestamp, hours),
          client_id: r.client_id,
          ...metrics,
        };
      }).filter(r => r.time);
      
      return { count: readings.length, readings };
    },
    enabled: hasAuroraSession(),
    staleTime: 30000,
    retry: 1,
  });
}

export function useCorrelationThermalData(hours: number = 24, clientId?: string) {
  return useQuery({
    queryKey: ["aurora", "correlation", "thermal", hours, clientId],
    queryFn: async () => {
      const params = new URLSearchParams({ hours: hours.toString() });
      if (clientId && clientId !== 'all') {
        params.append('client_id', clientId);
      }
      
      const response = await callAuroraApi<RawReadingsResponse>(
        `${READINGS.BY_SENSOR_TYPE('thermal_probe')}?${params.toString()}`
      );
      
      const readings = (response.readings || []).map(r => {
        const data = parseMeasurement(r);
        const metrics = extractThermalMetrics(data);
        return {
          timestamp: r.timestamp,
          time: formatTimeBucket(r.timestamp, hours),
          client_id: r.client_id,
          ...metrics,
        };
      }).filter(r => r.time);
      
      return { count: readings.length, readings };
    },
    enabled: hasAuroraSession(),
    staleTime: 30000,
    retry: 1,
  });
}

export function useCorrelationArduinoData(hours: number = 24, clientId?: string) {
  return useQuery({
    queryKey: ["aurora", "correlation", "arduino", hours, clientId],
    queryFn: async () => {
      const params = new URLSearchParams({ hours: hours.toString() });
      if (clientId && clientId !== 'all') {
        params.append('client_id', clientId);
      }
      
      // Try arduino_sensor_kit first, fallback to aht_sensor
      let response: RawReadingsResponse;
      try {
        response = await callAuroraApi<RawReadingsResponse>(
          `${READINGS.BY_SENSOR_TYPE('arduino_sensor_kit')}?${params.toString()}`
        );
      } catch {
        response = await callAuroraApi<RawReadingsResponse>(
          `${READINGS.BY_SENSOR_TYPE('aht_sensor')}?${params.toString()}`
        );
      }
      
      const readings = (response.readings || []).map(r => {
        const data = parseMeasurement(r);
        const metrics = extractArduinoMetrics(data);
        return {
          timestamp: r.timestamp,
          time: formatTimeBucket(r.timestamp, hours),
          client_id: r.client_id,
          ...metrics,
        };
      }).filter(r => r.time);
      
      return { count: readings.length, readings };
    },
    enabled: hasAuroraSession(),
    staleTime: 30000,
    retry: 1,
  });
}

// =============================================
// CORRELATION CALCULATION
// =============================================

export function calculateCorrelation(
  data: Array<{ x?: number; y?: number }>
): CorrelationStats {
  const allPoints = data.length;
  const xPoints = data.filter(d => d.x !== undefined && !isNaN(d.x!) && isFinite(d.x!));
  const yPoints = data.filter(d => d.y !== undefined && !isNaN(d.y!) && isFinite(d.y!));
  const validPoints = data.filter(d => 
    d.x !== undefined && d.y !== undefined && 
    !isNaN(d.x) && !isNaN(d.y) &&
    isFinite(d.x) && isFinite(d.y)
  );
  
  if (validPoints.length < 2) {
    return { 
      avgX: 0, avgY: 0, correlation: 0, 
      dataPoints: allPoints, 
      pairedPoints: validPoints.length,
      xCount: xPoints.length,
      yCount: yPoints.length,
    };
  }

  const avgX = validPoints.reduce((sum, d) => sum + (d.x || 0), 0) / validPoints.length;
  const avgY = validPoints.reduce((sum, d) => sum + (d.y || 0), 0) / validPoints.length;

  const n = validPoints.length;
  const sumXY = validPoints.reduce((sum, d) => sum + (d.x || 0) * (d.y || 0), 0);
  const sumX = validPoints.reduce((sum, d) => sum + (d.x || 0), 0);
  const sumY = validPoints.reduce((sum, d) => sum + (d.y || 0), 0);
  const sumX2 = validPoints.reduce((sum, d) => sum + (d.x || 0) ** 2, 0);
  const sumY2 = validPoints.reduce((sum, d) => sum + (d.y || 0) ** 2, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX ** 2) * (n * sumY2 - sumY ** 2));
  const correlation = denominator !== 0 ? numerator / denominator : 0;

  return { 
    avgX, avgY, 
    correlation: isNaN(correlation) ? 0 : correlation, 
    dataPoints: allPoints,
    pairedPoints: validPoints.length,
    xCount: xPoints.length,
    yCount: yPoints.length,
  };
}

// =============================================
// CORRELATION PAIR BUILDER
// =============================================

export type CorrelationPairType = 
  | 'power-thermal' 
  | 'power-arduino' 
  | 'thermal-arduino' 
  | 'latency-throughput';

export interface CorrelationPairConfig {
  id: CorrelationPairType;
  label: string;
  xLabel: string;
  yLabel: string;
  xUnit: string;
  yUnit: string;
  xColor: string;
  yColor: string;
  xIcon: string;
  yIcon: string;
}

export const CORRELATION_PAIRS: CorrelationPairConfig[] = [
  {
    id: 'power-thermal',
    label: 'Power vs Temperature',
    xLabel: 'Starlink Power',
    yLabel: 'Temperature',
    xUnit: 'W',
    yUnit: '°C',
    xColor: 'hsl(var(--chart-1))',
    yColor: 'hsl(var(--destructive))',
    xIcon: 'Zap',
    yIcon: 'Thermometer',
  },
  {
    id: 'power-arduino',
    label: 'Power vs Arduino',
    xLabel: 'Starlink Power',
    yLabel: 'Arduino Temp',
    xUnit: 'W',
    yUnit: '°C',
    xColor: 'hsl(var(--chart-1))',
    yColor: 'hsl(var(--chart-2))',
    xIcon: 'Zap',
    yIcon: 'Cpu',
  },
  {
    id: 'thermal-arduino',
    label: 'Thermal vs Arduino',
    xLabel: 'Thermal Probe',
    yLabel: 'Arduino Temp',
    xUnit: '°C',
    yUnit: '°C',
    xColor: 'hsl(var(--destructive))',
    yColor: 'hsl(var(--chart-2))',
    xIcon: 'Thermometer',
    yIcon: 'Cpu',
  },
  {
    id: 'latency-throughput',
    label: 'Latency vs Throughput',
    xLabel: 'Latency',
    yLabel: 'Download',
    xUnit: 'ms',
    yUnit: 'Mbps',
    xColor: 'hsl(var(--chart-4))',
    yColor: 'hsl(var(--chart-3))',
    xIcon: 'Activity',
    yIcon: 'Wifi',
  },
];

/**
 * Hook to refresh all correlation data
 */
export function useRefreshCorrelationData() {
  const queryClient = useQueryClient();
  
  return () => {
    queryClient.invalidateQueries({ queryKey: ["aurora", "correlation"] });
  };
}
