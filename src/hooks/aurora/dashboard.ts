// Aurora API - Dashboard domain hooks
import { useQuery } from "@tanstack/react-query";
import { callAuroraApi, hasAuroraSession, type AuroraApiOptions } from "./core";
import { STATS, DASHBOARD, SYSTEM, CLIENTS } from "./endpoints";

// =============================================
// TYPES
// =============================================

export interface DashboardStats {
  avg_humidity: number | null;
  avg_power_w: number | null;
  avg_signal_dbm: number | null;
  avg_temp_aht: number | null;
  avg_temp_bmt: number | null;
  avg_temp_c: number | null;
  avg_temp_f: number | null;
  total_clients: number;
  total_sensors: number;
  total_readings?: number;
  total_devices?: number;
  active_alerts?: number;
}

export interface DashboardSystemStats {
  cpu_percent?: number;
  memory_percent?: number;
  disk_percent?: number;
  uptime_seconds?: number;
  load_average?: number[];
  network_rx_bytes?: number;
  network_tx_bytes?: number;
}

export interface TimeseriesPoint {
  timestamp: string;
  value: number;
}

export interface DashboardTimeseries {
  humidity: TimeseriesPoint[];
  power: TimeseriesPoint[];
  signal: TimeseriesPoint[];
  temperature: TimeseriesPoint[];
}

// New types matching actual API response from /api/dashboard/sensor-stats
export interface DashboardSensorStatsItem {
  sensor_type: string;
  reading_count: number;
  client_count: number;
  device_count: number;
  avg_data_size?: number;
  first_reading?: string;
  last_reading?: string;
}

export interface DashboardSensorStatsResponse {
  data: DashboardSensorStatsItem[];
  status: string;
  summary: {
    total_readings: number;
    total_sensor_types: number;
  };
  time_window_hours: number;
  timestamp: string;
}

// New types matching actual API response from /api/stats/by-client
export interface ClientStatsItem {
  client_id: string;
  device_count: number;
  sensor_type_count: number;
  sensor_types: string[];
  reading_count: number;
  first_reading?: string;
  last_reading?: string;
}

export interface ClientStatsResponse {
  data: ClientStatsItem[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    returned: number;
  };
  status: string;
  time_window_hours: number;
  timestamp: string;
}

export interface DashboardSensorStats {
  avg_humidity?: number | null;
  avg_power_w?: number | null;
  avg_signal_dbm?: number | null;
  avg_temp_aht?: number | null;
  avg_temp_bmt?: number | null;
  avg_temp_c?: number | null;
  avg_temp_f?: number | null;
  total_clients?: number;
  total_sensors?: number;
  total_devices?: number;
  active_devices?: number;
  readings_last_hour?: number;
  readings_last_24h?: number;
}

export interface DashboardSensorTimeseries {
  humidity?: TimeseriesPoint[];
  power?: TimeseriesPoint[];
  signal?: TimeseriesPoint[];
  temperature?: TimeseriesPoint[];
  [key: string]: TimeseriesPoint[] | undefined;
}

// =============================================
// QUERY HOOKS
// =============================================

export function useDashboardStats(clientId?: string | null) {
  return useQuery({
    queryKey: ["aurora", "dashboard", "stats", clientId],
    queryFn: async () => {
      const options: AuroraApiOptions = { clientId };
      
      // Try stats/by-client first (now returns rich data)
      try {
        const byClientResult = await callAuroraApi<ClientStatsItem[]>(
          STATS.BY_CLIENT, "GET", undefined, options
        );
        
        // API now returns flat array
        const clients = Array.isArray(byClientResult) ? byClientResult : [];
        
        if (clients.length > 0) {
          // Aggregate stats from all clients
          const totalReadings = clients.reduce((sum, c) => sum + (c.reading_count || 0), 0);
          const totalDevices = clients.reduce((sum, c) => sum + (c.device_count || 0), 0);
          const allSensorTypes = new Set(clients.flatMap(c => c.sensor_types || []));
          
          return {
            avg_humidity: null,
            avg_power_w: null,
            avg_signal_dbm: null,
            avg_temp_aht: null,
            avg_temp_bmt: null,
            avg_temp_c: null,
            avg_temp_f: null,
            total_clients: clients.length,
            total_sensors: allSensorTypes.size,
            total_readings: totalReadings,
            total_devices: totalDevices,
          };
        }
      } catch {
        // Fall through to other endpoints
      }
      
      // Fallback to other endpoints
      const endpoints = [
        STATS.OVERVIEW,
        STATS.GLOBAL, 
        STATS.SUMMARY,
        DASHBOARD.SENSOR_STATS,
      ];
      
      for (const endpoint of endpoints) {
        try {
          const result = await callAuroraApi<DashboardStats>(endpoint, "GET", undefined, options);
          if (result && Object.keys(result).length > 0) {
            return result;
          }
        } catch {
          // Try next endpoint
        }
      }
      
      return {
        avg_humidity: null,
        avg_power_w: null,
        avg_signal_dbm: null,
        avg_temp_aht: null,
        avg_temp_bmt: null,
        avg_temp_c: null,
        avg_temp_f: null,
        total_clients: 0,
        total_sensors: 0,
      };
    },
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 1,
  });
}

export function useDashboardTimeseries(hours: number = 24, clientId?: string | null) {
  return useQuery({
    queryKey: ["aurora", "dashboard", "timeseries", hours, clientId],
    queryFn: async () => {
      try {
        return await callAuroraApi<DashboardTimeseries>(
          DASHBOARD.SENSOR_TIMESERIES, 
          "GET", 
          undefined, 
          { clientId, params: { hours } }
        );
      } catch {
        return {
          humidity: [],
          power: [],
          signal: [],
          temperature: [],
        };
      }
    },
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 1,
  });
}

export function useDashboardSystemStats(clientId?: string | null) {
  return useQuery({
    queryKey: ["aurora", "dashboard", "system", clientId],
    queryFn: async () => {
      const options: AuroraApiOptions = { clientId };
      
      // Try dashboard endpoint first
      try {
        const result = await callAuroraApi<DashboardSystemStats>(DASHBOARD.SYSTEM_STATS, "GET", undefined, options);
        if (result && Object.keys(result).length > 0) {
          return result;
        }
      } catch {
        // Fall through to aggregation
      }
      
      // Try individual system endpoints
      const [cpu, memory, disk, load, uptime] = await Promise.all([
        callAuroraApi<{ cpu_usage_percent?: number; cpu_temp_celsius?: number }>(
          SYSTEM.ALL, "GET", undefined, options
        ).catch(() => null),
        callAuroraApi<{ total: number; used: number; percent: number }>(
          SYSTEM.MEMORY, "GET", undefined, options
        ).catch(() => null),
        callAuroraApi<{ total: number; used: number; percent: number }>(
          SYSTEM.DISK, "GET", undefined, options
        ).catch(() => null),
        callAuroraApi<{ load: number[] }>(
          SYSTEM.LOAD, "GET", undefined, options
        ).catch(() => null),
        callAuroraApi<{ uptime_seconds: number }>(
          SYSTEM.UPTIME, "GET", undefined, options
        ).catch(() => null),
      ]);
      
      return {
        cpu_percent: cpu?.cpu_usage_percent,
        memory_percent: memory?.percent,
        disk_percent: disk?.percent,
        load_average: load?.load,
        uptime_seconds: uptime?.uptime_seconds,
      };
    },
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 1,
  });
}

// NEW: Fetch sensor stats from /api/dashboard/sensor-stats with proper fallback chain
export function useDashboardSensorStats(clientId?: string | null) {
  return useQuery({
    queryKey: ["aurora", "dashboard", "sensor-stats", clientId],
    queryFn: async () => {
      const options: AuroraApiOptions = { clientId };
      
      // Try the dashboard/sensor-stats endpoint first
      try {
        const result = await callAuroraApi<DashboardSensorStatsResponse | DashboardSensorStatsItem[]>(
          DASHBOARD.SENSOR_STATS, "GET", undefined, options
        );
        
        // Handle both wrapped and unwrapped responses
        if (result) {
          const items = Array.isArray(result) ? result : result.data || [];
          const summary = !Array.isArray(result) ? result.summary : null;
          
          if (items.length > 0 || (summary && summary.total_readings > 0)) {
            const totalReadings = summary?.total_readings || items.reduce((sum, s) => sum + (s.reading_count || 0), 0);
            const totalSensorTypes = summary?.total_sensor_types || items.length;
            const totalClients = Math.max(...items.map(s => s.client_count || 0), 0);
            const totalDevices = items.reduce((sum, s) => sum + (s.device_count || 0), 0);
            
            return {
              total_sensors: totalSensorTypes,
              total_clients: totalClients,
              total_devices: totalDevices,
              readings_last_24h: totalReadings,
              sensorItems: items,
            };
          }
        }
      } catch {
        // Fall through to other endpoints
      }
      
      // Fallback 1: Try /api/stats/overview (returns flat object with total_readings)
      try {
        const overviewResult = await callAuroraApi<{
          total_readings?: number;
          total_batches?: number;
          total_clients?: number;
          total_devices?: number;
          timestamp?: string;
        }>(STATS.OVERVIEW, "GET", undefined, options);
        
        if (overviewResult && (overviewResult.total_readings || overviewResult.total_devices)) {
          console.log('[useDashboardSensorStats] Using /api/stats/overview fallback:', overviewResult);
          return {
            total_sensors: 0,
            total_clients: overviewResult.total_clients || 0,
            total_devices: overviewResult.total_devices || 0,
            readings_last_24h: overviewResult.total_readings || 0,
            sensorItems: [],
          };
        }
      } catch {
        // Fall through to global stats
      }
      
      // Fallback 2: Try /api/stats/global (returns wrapped object with device_breakdown)
      try {
        interface GlobalStatsResponse {
          total_readings?: number;
          total_batches?: number;
          total_clients?: number;
          total_devices?: number;
          sensor_types_count?: number;
          active_clients_24h?: number;
          device_breakdown?: Array<{ device_type: string; count: number }>;
        }
        
        const globalResult = await callAuroraApi<GlobalStatsResponse>(STATS.GLOBAL, "GET", undefined, options);
        
        console.log('[useDashboardSensorStats] /api/stats/global result:', globalResult);
        
        if (globalResult && (globalResult.total_readings || globalResult.total_devices || globalResult.device_breakdown)) {
          // Build sensorItems from device_breakdown if available
          const sensorItems: DashboardSensorStatsItem[] = (globalResult.device_breakdown || []).map(d => ({
            sensor_type: d.device_type,
            reading_count: d.count,
            client_count: globalResult.total_clients || 1,
            device_count: 1,
          }));
          
          return {
            total_sensors: globalResult.sensor_types_count || globalResult.device_breakdown?.length || 0,
            total_clients: globalResult.total_clients || 0,
            total_devices: globalResult.total_devices || 0,
            readings_last_24h: globalResult.total_readings || 0,
            sensorItems,
          };
        }
      } catch (err) {
        console.warn('[useDashboardSensorStats] /api/stats/global fallback failed:', err);
        // Fall through to all-states
      }
      
      // Fallback 3: Try /api/clients/all-states to derive sensor types from clients
      try {
        // The all-states response has sensors as config objects, not simple arrays
        // We need to parse the metadata.config.sensors or just look at known sensor patterns
        interface AllStatesClient {
          client_id: string;
          hostname?: string;
          sensors?: string[] | Record<string, unknown>; // Can be array or object
          batches_received?: number;
          metadata?: {
            config?: {
              sensors?: Record<string, unknown>;
            };
          };
        }
        interface AllStatesResponse {
          states?: {
            adopted?: AllStatesClient[];
            registered?: AllStatesClient[];
            pending?: AllStatesClient[];
          };
        }
        
        const allStatesResult = await callAuroraApi<AllStatesResponse>(
          CLIENTS.ALL_STATES, "GET", undefined, options
        );
        
        if (allStatesResult?.states) {
          const adoptedClients = allStatesResult.states.adopted || [];
          const registeredClients = allStatesResult.states.registered || [];
          const allClients = [...adoptedClients, ...registeredClients];
          
          if (allClients.length > 0) {
            // Parse sensor types from client metadata.config.sensors
            const sensorTypeCounts = new Map<string, { count: number; clientCount: number; readingsEstimate: number }>();
            
            // Known sensor type keys that appear in the config
            const KNOWN_SENSOR_KEYS = [
              'adsb_devices', 'arduino_devices', 'bluetooth', 'gps', 'lora',
              'starlink', 'system_monitor', 'thermal_probe', 'wifi', 'rf_sensors',
              'aprs', 'ais', 'epirb', 'aircrack_wifi', 'sdr'
            ];
            
            // Map config keys to display names
            const SENSOR_TYPE_NAMES: Record<string, string> = {
              'adsb_devices': 'adsb',
              'arduino_devices': 'arduino',
              'bluetooth': 'bluetooth',
              'gps': 'gps',
              'lora': 'lora',
              'starlink': 'starlink',
              'system_monitor': 'system_monitor',
              'thermal_probe': 'thermal_probe',
              'wifi': 'wifi',
              'rf_sensors': 'rf_sensors',
              'aprs': 'aprs',
              'ais': 'ais',
              'epirb': 'epirb',
              'aircrack_wifi': 'aircrack',
              'sdr': 'sdr'
            };
            
            for (const client of allClients) {
              const batchesReceived = client.batches_received || 0;
              const sensorsConfig = client.metadata?.config?.sensors;
              
              // Handle if sensors is a simple array of strings (some endpoints return this format)
              if (Array.isArray(client.sensors)) {
                for (const sensor of client.sensors) {
                  const sensorType = String(sensor).replace(/_\d+$/, '').split('_')[0];
                  const existing = sensorTypeCounts.get(sensorType) || { count: 0, clientCount: 0, readingsEstimate: 0 };
                  existing.count += 1;
                  existing.clientCount += 1;
                  existing.readingsEstimate += Math.max(100, Math.floor(batchesReceived / 10));
                  sensorTypeCounts.set(sensorType, existing);
                }
              }
              // Handle if sensors is a config object
              else if (sensorsConfig && typeof sensorsConfig === 'object') {
                for (const key of KNOWN_SENSOR_KEYS) {
                  const sensorConfig = sensorsConfig[key as keyof typeof sensorsConfig];
                  if (!sensorConfig) continue;
                  
                  // Check if sensor is enabled (array of devices or single config)
                  let isEnabled = false;
                  let deviceCount = 1;
                  
                  if (Array.isArray(sensorConfig)) {
                    // Array of devices (e.g., adsb_devices, arduino_devices)
                    const enabledDevices = sensorConfig.filter((d: { enabled?: boolean }) => d?.enabled !== false);
                    isEnabled = enabledDevices.length > 0;
                    deviceCount = enabledDevices.length;
                  } else if (typeof sensorConfig === 'object' && sensorConfig !== null) {
                    // Single device config
                    isEnabled = (sensorConfig as { enabled?: boolean }).enabled !== false;
                  }
                  
                  if (isEnabled) {
                    const sensorType = SENSOR_TYPE_NAMES[key] || key;
                    const existing = sensorTypeCounts.get(sensorType) || { count: 0, clientCount: 0, readingsEstimate: 0 };
                    existing.count += deviceCount;
                    existing.clientCount += 1;
                    // Estimate readings based on batches received and sensor count
                    existing.readingsEstimate += Math.max(50, Math.floor(batchesReceived / (allClients.length * 2)));
                    sensorTypeCounts.set(sensorType, existing);
                  }
                }
                
                // Also check rf_sensors which has nested sensor types
                const rfSensors = sensorsConfig['rf_sensors' as keyof typeof sensorsConfig];
                if (rfSensors && typeof rfSensors === 'object') {
                  const rfConfig = rfSensors as Record<string, { enabled?: boolean; device_id?: string }>;
                  const rfSubTypes = ['ais', 'aprs', 'epirb', 'globalstar', 'iridium', 'rtl433'];
                  for (const subType of rfSubTypes) {
                    const subConfig = rfConfig[subType];
                    if (subConfig?.enabled) {
                      const existing = sensorTypeCounts.get(subType) || { count: 0, clientCount: 0, readingsEstimate: 0 };
                      existing.count += 1;
                      existing.clientCount += 1;
                      existing.readingsEstimate += Math.max(25, Math.floor(batchesReceived / (allClients.length * 4)));
                      sensorTypeCounts.set(subType, existing);
                    }
                  }
                }
              }
            }
            
            // Convert to sensorItems format
            const sensorItems: DashboardSensorStatsItem[] = Array.from(sensorTypeCounts.entries()).map(
              ([sensorType, stats]) => ({
                sensor_type: sensorType,
                reading_count: stats.readingsEstimate,
                client_count: stats.clientCount,
                device_count: stats.count,
              })
            );
            
            // Sort by reading count descending
            sensorItems.sort((a, b) => b.reading_count - a.reading_count);
            
            console.log('[useDashboardSensorStats] Using /api/clients/all-states fallback with parsed config:', sensorItems);
            
            return {
              total_sensors: sensorItems.length,
              total_clients: allClients.length,
              total_devices: sensorItems.reduce((sum, s) => sum + s.device_count, 0),
              readings_last_24h: sensorItems.reduce((sum, s) => sum + s.reading_count, 0),
              sensorItems,
            };
          }
        }
      } catch (err) {
        console.warn('[useDashboardSensorStats] all-states fallback failed:', err);
        // Return empty
      }
      
      return {};
    },
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 1,
  });
}

// NEW: Fetch client stats from /api/stats/by-client (now returns rich data)
export function useDashboardClientStats(clientId?: string | null, hours: number = 24) {
  return useQuery({
    queryKey: ["aurora", "dashboard", "client-stats", clientId, hours],
    queryFn: async () => {
      const options: AuroraApiOptions = { clientId, params: { hours } };
      
      try {
        const result = await callAuroraApi<ClientStatsResponse | ClientStatsItem[]>(
          STATS.BY_CLIENT, "GET", undefined, options
        );
        
        // Handle both wrapped and unwrapped responses
        const clients = Array.isArray(result) ? result : result?.data || [];
        const pagination = !Array.isArray(result) ? result?.pagination : null;
        
        return {
          clients,
          total: pagination?.total || clients.length,
          timeWindowHours: !Array.isArray(result) ? result?.time_window_hours : hours,
        };
      } catch {
        return { clients: [], total: 0, timeWindowHours: hours };
      }
    },
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 1,
  });
}

export function useDashboardSensorTimeseries(hours: number = 24, clientId?: string | null) {
  return useQuery({
    queryKey: ["aurora", "dashboard", "sensor-timeseries", hours, clientId],
    queryFn: async () => {
      try {
        return await callAuroraApi<DashboardSensorTimeseries>(
          DASHBOARD.SENSOR_TIMESERIES, 
          "GET", 
          undefined, 
          { clientId, params: { hours } }
        );
      } catch {
        return {};
      }
    },
    enabled: hasAuroraSession(),
    staleTime: 60000,
    refetchInterval: 120000,
    retry: 1,
  });
}
