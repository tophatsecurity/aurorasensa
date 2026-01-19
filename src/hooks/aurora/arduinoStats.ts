// Aurora API - Arduino Stats Hooks for All 10 Measurements
import { useQuery } from "@tanstack/react-query";
import { callAuroraApi, hasAuroraSession, fastQueryOptions, defaultQueryOptions } from "./core";
import { STATS, DASHBOARD } from "./endpoints";

// =============================================
// TYPES - All 10 Arduino Measurements
// =============================================

export interface ArduinoHourlyStats {
  timestamp: string;
  period_start?: string;
  period_end?: string;
  // Environmental - TH sensor
  avg_temp_c?: number;
  avg_humidity?: number;
  // Environmental - BMP sensor
  avg_pressure_hpa?: number;
  avg_bmp_temp_c?: number;
  // Motion - Accelerometer
  avg_accel_x?: number;
  avg_accel_y?: number;
  avg_accel_z?: number;
  // Analog sensors
  avg_pot_raw?: number;
  avg_light_raw?: number;
  avg_sound_raw?: number;
  // Counts
  reading_count?: number;
  device_count?: number;
}

export interface ArduinoStatsResponse {
  stats: ArduinoHourlyStats[];
  period: string;
  total_readings?: number;
  date_range?: {
    start: string;
    end: string;
  };
}

export interface ArduinoCurrentMeasurements {
  // Environmental
  temp_c: number | null;
  humidity: number | null;
  pressure_hpa: number | null;
  bmp_temp_c: number | null;
  // Motion
  accel_x: number | null;
  accel_y: number | null;
  accel_z: number | null;
  accel_magnitude: number | null;
  // Analog
  pot_raw: number | null;
  light_raw: number | null;
  sound_raw: number | null;
}

export interface ArduinoStatsAggregated {
  current: ArduinoCurrentMeasurements;
  averages: ArduinoCurrentMeasurements;
  minimums: ArduinoCurrentMeasurements;
  maximums: ArduinoCurrentMeasurements;
  total_readings: number;
  device_count: number;
  date_range: { start: string; end: string } | null;
}

// =============================================
// HELPER FUNCTIONS
// =============================================

function extractArduinoFromStats(stats: Record<string, unknown>[]): ArduinoHourlyStats[] {
  return stats.map(s => ({
    timestamp: (s.timestamp || s.period_start || '') as string,
    period_start: s.period_start as string | undefined,
    period_end: s.period_end as string | undefined,
    avg_temp_c: s.avg_temp_c as number | undefined,
    avg_humidity: s.avg_humidity as number | undefined,
    avg_pressure_hpa: s.avg_pressure_hpa as number | undefined,
    avg_bmp_temp_c: s.avg_bmp_temp_c as number | undefined,
    avg_accel_x: s.avg_accel_x as number | undefined,
    avg_accel_y: s.avg_accel_y as number | undefined,
    avg_accel_z: s.avg_accel_z as number | undefined,
    avg_pot_raw: s.avg_pot_raw as number | undefined,
    avg_light_raw: s.avg_light_raw as number | undefined,
    avg_sound_raw: s.avg_sound_raw as number | undefined,
    reading_count: s.reading_count as number | undefined,
    device_count: s.device_count as number | undefined,
  }));
}

function calculateAggregates(stats: ArduinoHourlyStats[]): ArduinoStatsAggregated {
  if (stats.length === 0) {
    const nullMeasurements: ArduinoCurrentMeasurements = {
      temp_c: null, humidity: null, pressure_hpa: null, bmp_temp_c: null,
      accel_x: null, accel_y: null, accel_z: null, accel_magnitude: null,
      pot_raw: null, light_raw: null, sound_raw: null,
    };
    return {
      current: nullMeasurements,
      averages: nullMeasurements,
      minimums: nullMeasurements,
      maximums: nullMeasurements,
      total_readings: 0,
      device_count: 0,
      date_range: null,
    };
  }

  // Latest reading (most recent)
  const latest = stats[stats.length - 1];
  const accelMag = (x: number | undefined, y: number | undefined, z: number | undefined) => {
    if (x === undefined || y === undefined || z === undefined) return null;
    return Math.sqrt(x * x + y * y + z * z);
  };

  const current: ArduinoCurrentMeasurements = {
    temp_c: latest.avg_temp_c ?? null,
    humidity: latest.avg_humidity ?? null,
    pressure_hpa: latest.avg_pressure_hpa ?? null,
    bmp_temp_c: latest.avg_bmp_temp_c ?? null,
    accel_x: latest.avg_accel_x ?? null,
    accel_y: latest.avg_accel_y ?? null,
    accel_z: latest.avg_accel_z ?? null,
    accel_magnitude: accelMag(latest.avg_accel_x, latest.avg_accel_y, latest.avg_accel_z),
    pot_raw: latest.avg_pot_raw ?? null,
    light_raw: latest.avg_light_raw ?? null,
    sound_raw: latest.avg_sound_raw ?? null,
  };

  // Calculate averages, mins, maxs
  const avgCalc = (field: keyof ArduinoHourlyStats) => {
    const values = stats.map(s => s[field]).filter((v): v is number => typeof v === 'number');
    if (values.length === 0) return null;
    return values.reduce((a, b) => a + b, 0) / values.length;
  };
  const minCalc = (field: keyof ArduinoHourlyStats) => {
    const values = stats.map(s => s[field]).filter((v): v is number => typeof v === 'number');
    if (values.length === 0) return null;
    return Math.min(...values);
  };
  const maxCalc = (field: keyof ArduinoHourlyStats) => {
    const values = stats.map(s => s[field]).filter((v): v is number => typeof v === 'number');
    if (values.length === 0) return null;
    return Math.max(...values);
  };

  const buildMeasurements = (calcFn: (field: keyof ArduinoHourlyStats) => number | null): ArduinoCurrentMeasurements => ({
    temp_c: calcFn('avg_temp_c'),
    humidity: calcFn('avg_humidity'),
    pressure_hpa: calcFn('avg_pressure_hpa'),
    bmp_temp_c: calcFn('avg_bmp_temp_c'),
    accel_x: calcFn('avg_accel_x'),
    accel_y: calcFn('avg_accel_y'),
    accel_z: calcFn('avg_accel_z'),
    accel_magnitude: accelMag(
      calcFn('avg_accel_x') ?? undefined,
      calcFn('avg_accel_y') ?? undefined,
      calcFn('avg_accel_z') ?? undefined
    ),
    pot_raw: calcFn('avg_pot_raw'),
    light_raw: calcFn('avg_light_raw'),
    sound_raw: calcFn('avg_sound_raw'),
  });

  const totalReadings = stats.reduce((sum, s) => sum + (s.reading_count || 0), 0);
  const deviceCount = Math.max(...stats.map(s => s.device_count || 0), 0);

  return {
    current,
    averages: buildMeasurements(avgCalc),
    minimums: buildMeasurements(minCalc),
    maximums: buildMeasurements(maxCalc),
    total_readings: totalReadings,
    device_count: deviceCount,
    date_range: stats.length > 0 ? {
      start: stats[0].timestamp || stats[0].period_start || '',
      end: latest.timestamp || latest.period_end || '',
    } : null,
  };
}

// =============================================
// HOOKS
// =============================================

// Fetch 1-hour granularity stats with all 10 measurements
export function useArduino1hrStats() {
  return useQuery({
    queryKey: ["aurora", "arduino", "stats", "1hr"],
    queryFn: async () => {
      try {
        const response = await callAuroraApi<{ stats?: Record<string, unknown>[]; data?: Record<string, unknown>[] }>(STATS.HOUR_1);
        const rawStats = response?.stats || response?.data || [];
        const stats = extractArduinoFromStats(rawStats as Record<string, unknown>[]);
        return {
          stats,
          aggregated: calculateAggregates(stats),
        };
      } catch (error) {
        console.warn("Failed to fetch Arduino 1hr stats:", error);
        return { stats: [], aggregated: calculateAggregates([]) };
      }
    },
    enabled: hasAuroraSession(),
    ...fastQueryOptions,
    retry: 1,
  });
}

// Fetch 6-hour granularity stats
export function useArduino6hrStats() {
  return useQuery({
    queryKey: ["aurora", "arduino", "stats", "6hr"],
    queryFn: async () => {
      try {
        const response = await callAuroraApi<{ stats?: Record<string, unknown>[]; data?: Record<string, unknown>[] }>(STATS.HOUR_6);
        const rawStats = response?.stats || response?.data || [];
        const stats = extractArduinoFromStats(rawStats as Record<string, unknown>[]);
        return {
          stats,
          aggregated: calculateAggregates(stats),
        };
      } catch (error) {
        console.warn("Failed to fetch Arduino 6hr stats:", error);
        return { stats: [], aggregated: calculateAggregates([]) };
      }
    },
    enabled: hasAuroraSession(),
    ...defaultQueryOptions,
    retry: 1,
  });
}

// Fetch 24-hour (daily) granularity stats
export function useArduino24hrStats() {
  return useQuery({
    queryKey: ["aurora", "arduino", "stats", "24hr"],
    queryFn: async () => {
      try {
        const response = await callAuroraApi<{ stats?: Record<string, unknown>[]; data?: Record<string, unknown>[] }>(STATS.HOUR_24);
        const rawStats = response?.stats || response?.data || [];
        const stats = extractArduinoFromStats(rawStats as Record<string, unknown>[]);
        return {
          stats,
          aggregated: calculateAggregates(stats),
        };
      } catch (error) {
        console.warn("Failed to fetch Arduino 24hr stats:", error);
        return { stats: [], aggregated: calculateAggregates([]) };
      }
    },
    enabled: hasAuroraSession(),
    ...defaultQueryOptions,
    retry: 1,
  });
}

// Fetch dashboard sensor stats (includes Arduino)
export function useArduinoDashboardStats() {
  return useQuery({
    queryKey: ["aurora", "arduino", "dashboard-stats"],
    queryFn: async () => {
      try {
        const response = await callAuroraApi<{ 
          arduino?: Record<string, unknown>;
          sensors?: Record<string, unknown>[];
        }>(DASHBOARD.SENSOR_STATS);
        
        // Extract Arduino-specific data from dashboard stats
        const arduino = response?.arduino;
        if (arduino) {
          return {
            current: {
              temp_c: arduino.avg_temp_c as number | null ?? null,
              humidity: arduino.avg_humidity as number | null ?? null,
              pressure_hpa: arduino.avg_pressure_hpa as number | null ?? null,
              bmp_temp_c: arduino.avg_bmp_temp_c as number | null ?? null,
              accel_x: arduino.avg_accel_x as number | null ?? null,
              accel_y: arduino.avg_accel_y as number | null ?? null,
              accel_z: arduino.avg_accel_z as number | null ?? null,
              accel_magnitude: null,
              pot_raw: arduino.avg_pot_raw as number | null ?? null,
              light_raw: arduino.avg_light_raw as number | null ?? null,
              sound_raw: arduino.avg_sound_raw as number | null ?? null,
            } as ArduinoCurrentMeasurements,
            reading_count: arduino.reading_count as number | undefined,
            device_count: arduino.device_count as number | undefined,
          };
        }
        return null;
      } catch (error) {
        console.warn("Failed to fetch Arduino dashboard stats:", error);
        return null;
      }
    },
    enabled: hasAuroraSession(),
    ...fastQueryOptions,
    retry: 1,
  });
}

// Combined hook for all Arduino stats (prefer 1hr for real-time, 24hr for history)
export function useArduinoAllStats() {
  const hourly = useArduino1hrStats();
  const daily = useArduino24hrStats();
  const dashboard = useArduinoDashboardStats();

  return {
    hourly: hourly.data,
    daily: daily.data,
    dashboard: dashboard.data,
    isLoading: hourly.isLoading || daily.isLoading,
    isError: hourly.isError && daily.isError,
  };
}
