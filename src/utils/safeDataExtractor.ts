/**
 * Safe data extraction utilities to prevent "undefined property access" errors.
 * All functions handle null/undefined gracefully with fallback values.
 */

/**
 * Safely extract data object from a reading, always returns a record (never undefined)
 */
export function safeGetData(reading: unknown): Record<string, unknown> {
  if (!reading || typeof reading !== 'object') return {};
  const r = reading as Record<string, unknown>;
  const data = r.data;
  if (!data || typeof data !== 'object') return {};
  return data as Record<string, unknown>;
}

/**
 * Safely extract nested object from data with fallback to empty object
 */
export function safeGetNestedObject(
  data: Record<string, unknown>, 
  ...keys: string[]
): Record<string, unknown> {
  for (const key of keys) {
    const value = data[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
  }
  return {};
}

/**
 * Safely get a number value from data with optional fallback
 */
export function safeGetNumber(
  data: Record<string, unknown>, 
  key: string, 
  fallback?: number
): number | undefined {
  const value = data?.[key];
  if (typeof value === 'number' && !isNaN(value)) {
    return value;
  }
  return fallback;
}

/**
 * Safely get a number from multiple possible keys (first match wins)
 */
export function safeGetNumberFromKeys(
  data: Record<string, unknown>, 
  keys: string[], 
  fallback?: number
): number | undefined {
  for (const key of keys) {
    const value = data?.[key];
    if (typeof value === 'number' && !isNaN(value)) {
      return value;
    }
  }
  return fallback;
}

/**
 * Safely get a string value from data with optional fallback
 */
export function safeGetString(
  data: Record<string, unknown>, 
  key: string, 
  fallback: string = ''
): string {
  const value = data?.[key];
  if (typeof value === 'string') {
    return value;
  }
  if (value !== null && value !== undefined) {
    return String(value);
  }
  return fallback;
}

/**
 * Safely get an array from data with fallback to empty array
 */
export function safeGetArray<T = unknown>(
  data: Record<string, unknown>, 
  key: string
): T[] {
  const value = data?.[key];
  if (Array.isArray(value)) {
    return value as T[];
  }
  return [];
}

/**
 * Safely check if a property exists and is truthy
 */
export function safeHasValue(data: Record<string, unknown>, key: string): boolean {
  return data?.[key] !== undefined && data?.[key] !== null;
}

/**
 * Safely extract location coordinates from data object
 */
export function safeExtractLocation(data: Record<string, unknown>): { lat: number; lng: number; alt?: number } | undefined {
  if (!data || typeof data !== 'object') return undefined;

  // Check direct lat/lng
  if (typeof data.latitude === 'number' && typeof data.longitude === 'number') {
    return { 
      lat: data.latitude, 
      lng: data.longitude,
      alt: typeof data.altitude === 'number' ? data.altitude : undefined
    };
  }
  
  // Check nested starlink location
  const starlink = data.starlink as Record<string, unknown> | undefined;
  if (starlink && typeof starlink === 'object') {
    if (typeof starlink.latitude === 'number' && typeof starlink.longitude === 'number') {
      return { 
        lat: starlink.latitude, 
        lng: starlink.longitude,
        alt: typeof starlink.altitude === 'number' ? starlink.altitude : undefined
      };
    }
    
    const locationDetail = starlink.location_detail as Record<string, number> | undefined;
    if (locationDetail?.latitude && locationDetail?.longitude) {
      return { lat: locationDetail.latitude, lng: locationDetail.longitude, alt: locationDetail.altitude };
    }
  }
  
  // Check GPS data
  const gps = data.gps as Record<string, unknown> | undefined;
  if (gps && typeof gps === 'object') {
    if (typeof gps.latitude === 'number' && typeof gps.longitude === 'number') {
      return { 
        lat: gps.latitude, 
        lng: gps.longitude,
        alt: typeof gps.altitude === 'number' ? gps.altitude : undefined
      };
    }
  }
  
  return undefined;
}

/**
 * Safely merge two data objects, with the second taking precedence
 */
export function safeMergeData(
  base: Record<string, unknown>, 
  override: Record<string, unknown> | undefined
): Record<string, unknown> {
  if (!override || typeof override !== 'object') return base;
  return { ...base, ...override };
}

/**
 * Safely iterate over object entries, filtering out null/undefined values
 */
export function safeObjectEntries(
  data: Record<string, unknown> | null | undefined
): [string, unknown][] {
  if (!data || typeof data !== 'object') return [];
  return Object.entries(data).filter(([, v]) => v !== null && v !== undefined);
}

/**
 * Safely flatten nested data object into a flat key-value structure
 */
export function safeFlattenData(data: Record<string, unknown> | null | undefined): Record<string, unknown> {
  if (!data || typeof data !== 'object') return {};
  
  const flatData: Record<string, unknown> = {};
  
  Object.entries(data).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      if (typeof value === 'object' && !Array.isArray(value)) {
        Object.entries(value as Record<string, unknown>).forEach(([subKey, subValue]) => {
          if (subValue !== null && subValue !== undefined) {
            flatData[`${key}_${subKey}`] = subValue;
          }
        });
      } else {
        flatData[key] = value;
      }
    }
  });
  
  return flatData;
}

/**
 * Extract Starlink metrics safely from reading data
 */
export function extractStarlinkMetrics(data: Record<string, unknown>): {
  power_w?: number;
  latency_ms?: number;
  downlink_bps?: number;
  uplink_bps?: number;
  obstruction?: number;
  snr?: number;
  uptime?: number;
  temperature_c?: number;
} {
  const starlinkData = safeGetNestedObject(data, 'starlink') || data;
  
  return {
    power_w: safeGetNumberFromKeys(starlinkData, ['power_watts', 'power_w', 'power']),
    latency_ms: safeGetNumberFromKeys(starlinkData, ['pop_ping_latency_ms', 'latency_ms', 'ping_ms']),
    downlink_bps: safeGetNumberFromKeys(starlinkData, ['downlink_throughput_bps', 'downlink_bps']),
    uplink_bps: safeGetNumberFromKeys(starlinkData, ['uplink_throughput_bps', 'uplink_bps']),
    obstruction: safeGetNumberFromKeys(starlinkData, ['obstruction_percent', 'obstruction_percent_time']),
    snr: safeGetNumber(starlinkData, 'snr'),
    uptime: safeGetNumberFromKeys(starlinkData, ['uptime_seconds', 'uptime']),
    temperature_c: safeGetNumber(starlinkData, 'temperature_c'),
  };
}

/**
 * Extract thermal/temperature metrics safely from reading data
 */
export function extractThermalMetrics(data: Record<string, unknown>): {
  temperature?: number;
  humidity?: number;
  pressure?: number;
} {
  const thermalData = safeGetNestedObject(data, 'thermal_probe', 'thermal', 'arduino') || data;
  
  return {
    temperature: safeGetNumberFromKeys(thermalData, [
      'temperature_c', 'temp_c', 'aht_temp_c', 'bmp_temp_c', 'th_temp_c', 'probe_c', 'ambient_c'
    ]),
    humidity: safeGetNumberFromKeys(thermalData, [
      'humidity', 'aht_humidity', 'th_humidity', 'bme280_humidity'
    ]),
    pressure: safeGetNumber(thermalData, 'pressure'),
  };
}
