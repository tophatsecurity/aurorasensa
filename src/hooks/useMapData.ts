import { useMemo, useState, useEffect, useCallback } from "react";
import { LatLngExpression } from "leaflet";
import { 
  useSensors, 
  useClients, 
  useLatestReadings,
  useGeoLocations,
  useDeviceLatest,
  useSensorTypeStats,
  useAdsbAircraftWithHistory,
  useAdsbHistorical,
  useGpsdStatus,
  useGpsReadings,
  useStarlinkStatusData,
  useStarlinkDevices,
  useStarlinkSensorReadings,
  useStarlinkSignalStrength,
  useStarlinkPerformance,
  useStarlinkPower,
  useStarlinkConnectivity,
  GeoLocation,
  AdsbAircraft
} from "@/hooks/useAuroraApi";
import type { StarlinkMetrics } from "@/types/map";
import { useQueryClient } from "@tanstack/react-query";
import type { MapStats, SensorMarker, ClientMarker, AdsbMarker } from "@/types/map";

export interface UseMapDataOptions {
  adsbHistoryMinutes?: number;
  /** Set to false to disable auto-refetch, or a number in ms for custom interval */
  refetchInterval?: number | false;
  /** Filter markers by client ID. "all" or undefined means no filtering */
  clientId?: string;
}

// Trail type for aircraft history
export interface AircraftTrailData {
  icao: string;
  flight?: string;
  coordinates: [number, number][];
  altitudes: (number | undefined)[];
  timestamps: string[];
}

// Helper to extract GPS coordinates from various data sources
function extractGpsFromReadings(readings: Array<{ device_id: string; device_type: string; data: Record<string, unknown> }>) {
  const gpsData: Record<string, { lat: number; lng: number; altitude?: number; timestamp?: string }> = {};
  
  readings.forEach(reading => {
    const data = reading.data;
    
    // Check for GPS coordinates in the data
    let lat: number | null = null;
    let lng: number | null = null;
    let altitude: number | undefined;
    let timestamp: string | undefined;
    
    // Try various GPS coordinate field names
    if (typeof data.latitude === 'number' && typeof data.longitude === 'number') {
      lat = data.latitude;
      lng = data.longitude;
      altitude = typeof data.altitude === 'number' ? data.altitude : undefined;
    } else if (typeof data.lat === 'number' && typeof data.lon === 'number') {
      lat = data.lat;
      lng = data.lon;
      altitude = typeof data.alt === 'number' ? data.alt : undefined;
    } else if (typeof data.lat === 'number' && typeof data.lng === 'number') {
      lat = data.lat;
      lng = data.lng;
      altitude = typeof data.altitude === 'number' ? data.altitude : undefined;
    } else if (typeof data.gps_lat === 'number' && typeof data.gps_lon === 'number') {
      lat = data.gps_lat;
      lng = data.gps_lon;
      altitude = typeof data.gps_alt === 'number' ? data.gps_alt : undefined;
    } else if (typeof data.gps_latitude === 'number' && typeof data.gps_longitude === 'number') {
      lat = data.gps_latitude;
      lng = data.gps_longitude;
      altitude = typeof data.gps_altitude === 'number' ? data.gps_altitude : undefined;
    } else if (data.location && typeof data.location === 'object') {
      const loc = data.location as Record<string, unknown>;
      if (typeof loc.lat === 'number' && typeof loc.lng === 'number') {
        lat = loc.lat;
        lng = loc.lng;
        altitude = typeof loc.altitude === 'number' ? loc.altitude : undefined;
      } else if (typeof loc.latitude === 'number' && typeof loc.longitude === 'number') {
        lat = loc.latitude;
        lng = loc.longitude;
        altitude = typeof loc.altitude === 'number' ? loc.altitude : undefined;
      }
    } else if (data.position && typeof data.position === 'object') {
      const pos = data.position as Record<string, unknown>;
      if (typeof pos.lat === 'number' && typeof pos.lng === 'number') {
        lat = pos.lat;
        lng = pos.lng;
        altitude = typeof pos.altitude === 'number' ? pos.altitude : undefined;
      } else if (typeof pos.latitude === 'number' && typeof pos.longitude === 'number') {
        lat = pos.latitude;
        lng = pos.longitude;
        altitude = typeof pos.altitude === 'number' ? pos.altitude : undefined;
      }
    }

    // Get timestamp if available
    if (typeof data.timestamp === 'string') {
      timestamp = data.timestamp;
    } else if (typeof data.time === 'string') {
      timestamp = data.time;
    }
    
    // Validate coordinates are within valid ranges
    if (lat !== null && lng !== null && 
        lat >= -90 && lat <= 90 && 
        lng >= -180 && lng <= 180 &&
        !(lat === 0 && lng === 0)) { // Exclude 0,0 as it's often a default/invalid value
      gpsData[reading.device_id] = { lat, lng, altitude, timestamp };
    }
  });
  
  return gpsData;
}

// Helper to convert geoLocations to array format (API may return object or array)
function normalizeGeoLocations(geoLocations: unknown): GeoLocation[] {
  if (!geoLocations) return [];
  if (Array.isArray(geoLocations)) return geoLocations;
  if (typeof geoLocations === 'object') {
    // Handle object format where keys are device_ids
    return Object.entries(geoLocations as Record<string, unknown>).map(([key, value]) => {
      if (value && typeof value === 'object') {
        const v = value as Record<string, unknown>;
        return {
          device_id: (v.device_id as string) || key,
          lat: (v.lat ?? v.latitude) as number,
          lng: (v.lng ?? v.longitude ?? v.lon) as number,
          altitude: v.altitude as number | undefined,
          timestamp: v.timestamp as string | undefined,
        } as GeoLocation;
      }
      return null;
    }).filter((g): g is GeoLocation => g !== null && typeof g.lat === 'number' && typeof g.lng === 'number');
  }
  return [];
}

// Merge geo locations with readings data, prioritizing geo locations (more accurate)
function mergeGpsData(
  geoLocations: unknown,
  readingsGps: Record<string, { lat: number; lng: number; altitude?: number; timestamp?: string }>
): Record<string, { lat: number; lng: number; altitude?: number; timestamp?: string }> {
  const merged = { ...readingsGps };
  
  const geoArray = normalizeGeoLocations(geoLocations);
  geoArray.forEach(geo => {
    // Validate coordinates
    if (geo.lat >= -90 && geo.lat <= 90 && 
        geo.lng >= -180 && geo.lng <= 180 &&
        !(geo.lat === 0 && geo.lng === 0)) {
      merged[geo.device_id] = {
        lat: geo.lat,
        lng: geo.lng,
        altitude: geo.altitude,
        timestamp: geo.timestamp,
      };
    }
  });
  
  return merged;
}

export function useMapData(options: UseMapDataOptions = {}) {
  const { adsbHistoryMinutes = 60, refetchInterval, clientId } = options;
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const queryClient = useQueryClient();
  
  // When refetchInterval is false (manual mode), we disable all aurora query auto-refetching
  // by setting their individual refetchInterval to false in the cache
  useEffect(() => {
    const auroraQueries = queryClient.getQueryCache().findAll({ queryKey: ["aurora"] });
    
    if (refetchInterval === false) {
      // Disable auto-refetch for all aurora queries
      auroraQueries.forEach(query => {
        queryClient.setQueryDefaults(query.queryKey, {
          refetchInterval: false,
          refetchOnWindowFocus: false,
        });
      });
    } else if (typeof refetchInterval === 'number') {
      // Use custom interval for all aurora queries
      auroraQueries.forEach(query => {
        queryClient.setQueryDefaults(query.queryKey, {
          refetchInterval: refetchInterval,
          refetchOnWindowFocus: false,
        });
      });
    }
    
    return () => {
      // Reset to undefined (use individual hook defaults) when component unmounts
      auroraQueries.forEach(query => {
        queryClient.setQueryDefaults(query.queryKey, {
          refetchInterval: undefined,
          refetchOnWindowFocus: undefined,
        });
      });
    };
  }, [refetchInterval, queryClient]);
  
  const { 
    data: sensors, 
    isLoading: sensorsLoading, 
    dataUpdatedAt: sensorsUpdated 
  } = useSensors();
  
  const { 
    data: clients, 
    isLoading: clientsLoading 
  } = useClients();

  const {
    data: latestReadings,
    isLoading: readingsLoading
  } = useLatestReadings();

  const {
    data: geoLocations,
    isLoading: geoLoading,
    dataUpdatedAt: geoUpdated
  } = useGeoLocations();

  // Get Starlink sensor stats which contains GPS coordinates
  const { data: starlinkStats } = useSensorTypeStats('starlink');

  // Get the Starlink device latest reading for real-time GPS
  const { data: starlinkLatest } = useDeviceLatest('starlink_dish_1');

  // Get GPSD status for real-time GPS location
  const { data: gpsdStatus } = useGpsdStatus();

  // Get GPS readings history for trails
  const { data: gpsReadings } = useGpsReadings(24);

  // Get Starlink status data which often contains GPS
  const { data: starlinkStatusData } = useStarlinkStatusData();

  // Get all Starlink devices from the dedicated endpoint
  const { data: starlinkDevicesApi } = useStarlinkDevices();

  // Get Starlink sensor readings with GPS data
  const { data: starlinkSensorReadings } = useStarlinkSensorReadings();

  // Get Starlink metrics for detailed popup
  const { data: starlinkSignal } = useStarlinkSignalStrength();
  const { data: starlinkPerformance } = useStarlinkPerformance();
  const { data: starlinkPower } = useStarlinkPower();
  const { data: starlinkConnectivity } = useStarlinkConnectivity();

  // Get ADS-B aircraft data with historical fallback based on timeframe
  const { 
    aircraft: adsbAircraft, 
    isLoading: adsbLoading,
    isHistorical: adsbIsHistorical,
    source: adsbSource
  } = useAdsbAircraftWithHistory(adsbHistoryMinutes);

  // Get raw historical readings for trail extraction
  const { data: adsbHistoricalData } = useAdsbHistorical(adsbHistoryMinutes);

  // Update last refresh time
  useEffect(() => {
    setLastUpdate(new Date());
  }, [sensorsUpdated, geoUpdated]);

  // Debug logging for map data sources
  useEffect(() => {
    console.log('[MapData] Data sources:', {
      sensors: sensors?.length || 0,
      clients: clients?.length || 0,
      latestReadings: latestReadings?.length || 0,
      geoLocations: geoLocations?.length || 0,
      adsbAircraft: adsbAircraft?.length || 0,
      starlinkStats: !!starlinkStats,
      starlinkLatest: !!starlinkLatest?.data,
      gpsdStatus: !!gpsdStatus,
      gpsReadings: gpsReadings?.count || 0,
      starlinkStatusData: starlinkStatusData?.length || 0,
      starlinkSensorReadings: starlinkSensorReadings?.length || 0,
      starlinkDevicesApi: starlinkDevicesApi?.length || 0,
    });
  }, [sensors, clients, latestReadings, geoLocations, adsbAircraft, starlinkStats, starlinkLatest, gpsdStatus, gpsReadings, starlinkStatusData, starlinkSensorReadings, starlinkDevicesApi]);


  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["aurora"] });
  }, [queryClient]);

  // Extract GPS coordinates from latest readings
  const readingsGps = useMemo(() => {
    if (!latestReadings) return {};
    const gps = extractGpsFromReadings(latestReadings);
    if (Object.keys(gps).length > 0) {
      console.log('[MapData] Extracted GPS from readings:', Object.keys(gps));
    }
    return gps;
  }, [latestReadings]);

  // Helper to extract lat/lng and unique device_id from various field formats
  const extractStarlinkCoordsWithId = (data: Record<string, unknown>, fallbackId: string): { device_id: string; lat: number; lng: number; altitude?: number } | null => {
    let lat: number | undefined;
    let lng: number | undefined;
    let alt: number | undefined;
    let uniqueDeviceId: string = fallbackId;

    // Check for nested starlink object first (contains the unique device_id)
    if (data.starlink && typeof data.starlink === 'object') {
      const starlink = data.starlink as Record<string, unknown>;
      // Extract the unique device_id from inside the starlink object
      if (typeof starlink.device_id === 'string' && starlink.device_id) {
        uniqueDeviceId = starlink.device_id;
      }
      if (typeof starlink.latitude === 'number' && starlink.latitude !== null && 
          typeof starlink.longitude === 'number' && starlink.longitude !== null) {
        lat = starlink.latitude;
        lng = starlink.longitude;
        alt = typeof starlink.altitude === 'number' ? starlink.altitude : undefined;
      } else if (starlink.location_detail && typeof starlink.location_detail === 'object') {
        const loc = starlink.location_detail as Record<string, unknown>;
        if (typeof loc.latitude === 'number' && loc.latitude !== null && 
            typeof loc.longitude === 'number' && loc.longitude !== null) {
          lat = loc.latitude;
          lng = loc.longitude;
          alt = typeof loc.altitude === 'number' ? loc.altitude : undefined;
        }
      }
    }

    // If no coords from starlink object, try other field formats
    if (lat === undefined || lng === undefined) {
      if (typeof data.latitude === 'number' && data.latitude !== null && 
          typeof data.longitude === 'number' && data.longitude !== null) {
        lat = data.latitude;
        lng = data.longitude;
        alt = typeof data.altitude === 'number' ? data.altitude : undefined;
      } else if (typeof data.lat === 'number' && typeof data.lon === 'number') {
        lat = data.lat;
        lng = data.lon;
        alt = typeof data.alt === 'number' ? data.alt : undefined;
      } else if (typeof data.lat === 'number' && typeof data.lng === 'number') {
        lat = data.lat;
        lng = data.lng;
        alt = typeof data.altitude === 'number' ? data.altitude : undefined;
      } else if (data.location_detail && typeof data.location_detail === 'object') {
        const loc = data.location_detail as Record<string, unknown>;
        if (typeof loc.latitude === 'number' && loc.latitude !== null && 
            typeof loc.longitude === 'number' && loc.longitude !== null) {
          lat = loc.latitude;
          lng = loc.longitude;
          alt = typeof loc.altitude === 'number' ? loc.altitude : undefined;
        }
      }
    }

    // Also check for device_id at the top level if not found in starlink object
    if (uniqueDeviceId === fallbackId && typeof data.device_id === 'string' && data.device_id) {
      uniqueDeviceId = data.device_id;
    }

    if (lat !== undefined && lng !== undefined && 
        lat >= -90 && lat <= 90 && 
        lng >= -180 && lng <= 180 &&
        !(lat === 0 && lng === 0)) {
      return { device_id: uniqueDeviceId, lat, lng, altitude: alt };
    }
    return null;
  };

  // Extract GPS from Starlink stats (avg lat/lng from 24h data)
  const starlinkGps = useMemo<{ lat: number; lng: number; altitude?: number } | null>(() => {
    // Helper to extract lat/lng from various field formats (without device_id tracking)
    const extractCoords = (data: Record<string, unknown>): { lat: number; lng: number; altitude?: number } | null => {
      let lat: number | undefined;
      let lng: number | undefined;
      let alt: number | undefined;

      // Try various field names
      if (typeof data.latitude === 'number' && data.latitude !== null && 
          typeof data.longitude === 'number' && data.longitude !== null) {
        lat = data.latitude;
        lng = data.longitude;
        alt = typeof data.altitude === 'number' ? data.altitude : undefined;
      } else if (typeof data.lat === 'number' && typeof data.lon === 'number') {
        lat = data.lat;
        lng = data.lon;
        alt = typeof data.alt === 'number' ? data.alt : undefined;
      } else if (typeof data.lat === 'number' && typeof data.lng === 'number') {
        lat = data.lat;
        lng = data.lng;
        alt = typeof data.altitude === 'number' ? data.altitude : undefined;
      } else if (typeof data.gps_latitude === 'number' && typeof data.gps_longitude === 'number') {
        lat = data.gps_latitude;
        lng = data.gps_longitude;
        alt = typeof data.gps_altitude === 'number' ? data.gps_altitude : undefined;
      } else if (data.location && typeof data.location === 'object') {
        const loc = data.location as Record<string, unknown>;
        if (typeof loc.lat === 'number' && (typeof loc.lng === 'number' || typeof loc.lon === 'number')) {
          lat = loc.lat;
          lng = (loc.lng ?? loc.lon) as number;
          alt = typeof loc.altitude === 'number' ? loc.altitude : undefined;
        } else if (typeof loc.latitude === 'number' && loc.latitude !== null && 
                   typeof loc.longitude === 'number' && loc.longitude !== null) {
          lat = loc.latitude;
          lng = loc.longitude;
          alt = typeof loc.altitude === 'number' ? loc.altitude : undefined;
        }
      } else if (data.gps && typeof data.gps === 'object') {
        const gps = data.gps as Record<string, unknown>;
        if (typeof gps.latitude === 'number' && gps.latitude !== null && 
            typeof gps.longitude === 'number' && gps.longitude !== null) {
          lat = gps.latitude;
          lng = gps.longitude;
          alt = typeof gps.altitude === 'number' ? gps.altitude : undefined;
        }
      } else if (data.position && typeof data.position === 'object') {
        const pos = data.position as Record<string, unknown>;
        if (typeof pos.lat === 'number' && (typeof pos.lng === 'number' || typeof pos.lon === 'number')) {
          lat = pos.lat;
          lng = (pos.lng ?? pos.lon) as number;
          alt = typeof pos.altitude === 'number' ? pos.altitude : undefined;
        }
      } else if (data.location_detail && typeof data.location_detail === 'object') {
        // Starlink location_detail format
        const loc = data.location_detail as Record<string, unknown>;
        if (typeof loc.latitude === 'number' && loc.latitude !== null && 
            typeof loc.longitude === 'number' && loc.longitude !== null) {
          lat = loc.latitude;
          lng = loc.longitude;
          alt = typeof loc.altitude === 'number' ? loc.altitude : undefined;
        }
      } else if (data.starlink && typeof data.starlink === 'object') {
        // Nested starlink object
        const starlink = data.starlink as Record<string, unknown>;
        if (typeof starlink.latitude === 'number' && starlink.latitude !== null && 
            typeof starlink.longitude === 'number' && starlink.longitude !== null) {
          lat = starlink.latitude;
          lng = starlink.longitude;
          alt = typeof starlink.altitude === 'number' ? starlink.altitude : undefined;
        } else if (starlink.location_detail && typeof starlink.location_detail === 'object') {
          const loc = starlink.location_detail as Record<string, unknown>;
          if (typeof loc.latitude === 'number' && loc.latitude !== null && 
              typeof loc.longitude === 'number' && loc.longitude !== null) {
            lat = loc.latitude;
            lng = loc.longitude;
            alt = typeof loc.altitude === 'number' ? loc.altitude : undefined;
          }
        }
      }

      if (lat !== undefined && lng !== undefined && 
          lat >= -90 && lat <= 90 && 
          lng >= -180 && lng <= 180 &&
          !(lat === 0 && lng === 0)) {
        return { lat, lng, altitude: alt };
      }
      return null;
    };

    // Try Starlink stats numeric fields
    if (starlinkStats?.numeric_field_stats_24h) {
      const stats = starlinkStats.numeric_field_stats_24h as Record<string, { avg?: number }>;
      const lat = stats.latitude?.avg;
      const lng = stats.longitude?.avg;
      const alt = stats.altitude?.avg;
      
      if (lat !== undefined && lng !== undefined && 
          lat >= -90 && lat <= 90 && 
          lng >= -180 && lng <= 180 &&
          !(lat === 0 && lng === 0)) {
        console.log('[MapData] Found Starlink GPS from stats:', { lat, lng, alt });
        return { lat, lng, altitude: alt };
      }
    }
    
    // Try Starlink latest reading with flexible field detection
    if (starlinkLatest?.data) {
      const data = starlinkLatest.data as Record<string, unknown>;
      const coords = extractCoords(data);
      if (coords) {
        console.log('[MapData] Found Starlink GPS from latest:', coords);
        return coords;
      }
    }

    // Try latest readings for starlink devices
    if (latestReadings) {
      for (const reading of latestReadings) {
        if (reading.device_type?.toLowerCase().includes('starlink') || 
            reading.device_id?.toLowerCase().includes('starlink')) {
          const coords = extractCoords(reading.data);
          if (coords) {
            console.log('[MapData] Found Starlink GPS from readings:', coords);
            return coords;
          }
        }
      }
    }
    
    return null;
  }, [starlinkStats, starlinkLatest, latestReadings]);

  // Debug starlinkGps
  useEffect(() => {
    if (starlinkGps) {
      console.log('[MapData] Starlink GPS found:', starlinkGps);
    }
  }, [starlinkGps]);

  // Extract GPS from GPSD status (real-time GPS daemon)
  const gpsdGps = useMemo<{ lat: number; lng: number; altitude?: number } | null>(() => {
    if (gpsdStatus && gpsdStatus.mode && gpsdStatus.mode >= 2) {
      const lat = gpsdStatus.latitude;
      const lng = gpsdStatus.longitude;
      if (lat !== undefined && lng !== undefined &&
          lat >= -90 && lat <= 90 && 
          lng >= -180 && lng <= 180 &&
          !(lat === 0 && lng === 0)) {
        console.log('[MapData] Found GPSD GPS:', { lat, lng, altitude: gpsdStatus.altitude });
        return { lat, lng, altitude: gpsdStatus.altitude };
      }
    }
    return null;
  }, [gpsdStatus]);

  // Helper to extract device_id from sensor reading data without requiring valid GPS
  const extractStarlinkDeviceId = (data: Record<string, unknown>, fallbackId: string): string => {
    // Check for nested starlink object first (contains the unique device_id)
    if (data.starlink && typeof data.starlink === 'object') {
      const starlink = data.starlink as Record<string, unknown>;
      if (typeof starlink.device_id === 'string' && starlink.device_id) {
        return starlink.device_id;
      }
      // Check nested status object for id
      if (starlink.status && typeof starlink.status === 'object') {
        const status = starlink.status as Record<string, unknown>;
        if (typeof status.id === 'string' && status.id) {
          return status.id;
        }
      }
    }
    // Check top-level device_id
    if (typeof data.device_id === 'string' && data.device_id) {
      return data.device_id;
    }
    return fallbackId;
  };

  // Extract GPS from all Starlink devices - combine geo locations, API devices, and status data
  // Also track devices without GPS for fallback
  const { starlinkDevices, starlinkDevicesWithoutGps } = useMemo<{
    starlinkDevices: Array<{ device_id: string; lat: number; lng: number; altitude?: number; timestamp?: string }>;
    starlinkDevicesWithoutGps: Array<{ device_id: string; timestamp?: string; metrics?: Record<string, unknown> }>;
  }>(() => {
    const devices: Array<{ device_id: string; lat: number; lng: number; altitude?: number; timestamp?: string }> = [];
    const devicesWithoutGps: Array<{ device_id: string; timestamp?: string; metrics?: Record<string, unknown> }> = [];
    const addedIds = new Set<string>();
    const noGpsIds = new Set<string>();
    
    // First, check geo locations for Starlink devices (most reliable for GPS)
    const geoArray = normalizeGeoLocations(geoLocations);
    geoArray.forEach(geo => {
      // Match Starlink devices by device_id containing 'starlink'
      if (geo.device_id?.toLowerCase().includes('starlink')) {
        if (geo.lat >= -90 && geo.lat <= 90 && 
            geo.lng >= -180 && geo.lng <= 180 &&
            !(geo.lat === 0 && geo.lng === 0)) {
          devices.push({
            device_id: geo.device_id,
            lat: geo.lat,
            lng: geo.lng,
            altitude: geo.altitude,
            timestamp: geo.timestamp
          });
          addedIds.add(geo.device_id);
        }
      }
    });
    
    if (devices.length > 0) {
      console.log('[MapData] Found Starlink devices from geo locations:', devices.map(d => d.device_id));
    }
    
    // Second, add devices from the dedicated API endpoint
    if (starlinkDevicesApi && starlinkDevicesApi.length > 0) {
      starlinkDevicesApi.forEach(device => {
        if (addedIds.has(device.device_id)) return;
        
        // Try various GPS field locations
        let lat: number | undefined = device.latitude ?? device.gps_latitude ?? device.lat;
        let lng: number | undefined = device.longitude ?? device.gps_longitude ?? device.lng ?? device.lon;
        let alt: number | undefined = device.altitude ?? device.gps_altitude ?? device.alt;
        
        // Try nested location object
        if ((lat === undefined || lng === undefined) && device.location) {
          lat = lat ?? device.location.latitude ?? device.location.lat;
          lng = lng ?? device.location.longitude ?? device.location.lng ?? device.location.lon;
          alt = alt ?? device.location.altitude;
        }
        
        // Try location_detail object (Starlink specific)
        if ((lat === undefined || lng === undefined) && device.location_detail) {
          lat = lat ?? device.location_detail.latitude;
          lng = lng ?? device.location_detail.longitude;
          alt = alt ?? device.location_detail.altitude;
        }
        
        if (lat !== undefined && lng !== undefined &&
            lat >= -90 && lat <= 90 && 
            lng >= -180 && lng <= 180 &&
            !(lat === 0 && lng === 0)) {
          devices.push({
            device_id: device.device_id,
            lat,
            lng,
            altitude: alt,
            timestamp: device.last_seen
          });
          addedIds.add(device.device_id);
          console.log('[MapData] Added Starlink device from API:', device.device_id, { lat, lng });
        } else if (!noGpsIds.has(device.device_id)) {
          // Track devices without GPS
          devicesWithoutGps.push({
            device_id: device.device_id,
            timestamp: device.last_seen
          });
          noGpsIds.add(device.device_id);
        }
      });
    }
    
    // Third, add from status data (real-time updates)
    if (starlinkStatusData && starlinkStatusData.length > 0) {
      // Group by device_id and get the latest entry for each
      const deviceMap = new Map<string, typeof starlinkStatusData[0]>();
      
      starlinkStatusData.forEach(entry => {
        const deviceId = entry.device_id || 'starlink_dish_1';
        const existing = deviceMap.get(deviceId);
        
        // Keep the latest entry for each device
        if (!existing || (entry.timestamp && existing.timestamp && new Date(entry.timestamp) > new Date(existing.timestamp))) {
          deviceMap.set(deviceId, entry);
        }
      });
      
      // Add or update devices with GPS from status data
      deviceMap.forEach((entry, deviceId) => {
        const lat = entry.latitude;
        const lng = entry.longitude;
        if (lat !== undefined && lng !== undefined &&
            lat >= -90 && lat <= 90 && 
            lng >= -180 && lng <= 180 &&
            !(lat === 0 && lng === 0)) {
          
          // If already added, update with newer GPS if available
          if (addedIds.has(deviceId)) {
            const existingIdx = devices.findIndex(d => d.device_id === deviceId);
            if (existingIdx >= 0 && entry.timestamp) {
              // Only update if status data is newer
              const existingTimestamp = devices[existingIdx].timestamp;
              if (!existingTimestamp || new Date(entry.timestamp) > new Date(existingTimestamp)) {
                devices[existingIdx] = {
                  device_id: deviceId,
                  lat,
                  lng,
                  altitude: entry.altitude,
                  timestamp: entry.timestamp
                };
              }
            }
          } else {
            devices.push({
              device_id: deviceId,
              lat,
              lng,
              altitude: entry.altitude,
              timestamp: entry.timestamp
            });
            addedIds.add(deviceId);
          }
          // Remove from noGps if we now have GPS
          noGpsIds.delete(deviceId);
          const noGpsIdx = devicesWithoutGps.findIndex(d => d.device_id === deviceId);
          if (noGpsIdx >= 0) {
            devicesWithoutGps.splice(noGpsIdx, 1);
          }
        }
      });
    }
    
    // Fourth, add from Starlink sensor readings (/api/readings/sensor/starlink)
    if (starlinkSensorReadings && starlinkSensorReadings.length > 0) {
      // Group by unique device_id (extracted from nested starlink object) and get the latest entry for each
      const sensorMap = new Map<string, { reading: typeof starlinkSensorReadings[0]; uniqueId: string; coords: { lat: number; lng: number; altitude?: number } | null }>();
      
      starlinkSensorReadings.forEach(reading => {
        const data = reading.data as Record<string, unknown>;
        const result = extractStarlinkCoordsWithId(data, reading.device_id);
        const uniqueId = result?.device_id || extractStarlinkDeviceId(data, reading.device_id);
        
        const existing = sensorMap.get(uniqueId);
        
        // Keep the latest reading for each unique device
        if (!existing || (reading.timestamp && existing.reading.timestamp && new Date(reading.timestamp) > new Date(existing.reading.timestamp))) {
          sensorMap.set(uniqueId, { reading, uniqueId, coords: result });
        }
      });
      
      // Add or update devices with GPS from sensor readings
      sensorMap.forEach(({ reading, uniqueId, coords }) => {
        if (coords) {
          // Device has GPS coordinates
          if (addedIds.has(uniqueId)) {
            const existingIdx = devices.findIndex(d => d.device_id === uniqueId);
            if (existingIdx >= 0 && reading.timestamp) {
              // Only update if sensor data is newer
              const existingTimestamp = devices[existingIdx].timestamp;
              if (!existingTimestamp || new Date(reading.timestamp) > new Date(existingTimestamp)) {
                devices[existingIdx] = {
                  device_id: uniqueId,
                  lat: coords.lat,
                  lng: coords.lng,
                  altitude: coords.altitude,
                  timestamp: reading.timestamp
                };
              }
            }
          } else {
            devices.push({
              device_id: uniqueId,
              lat: coords.lat,
              lng: coords.lng,
              altitude: coords.altitude,
              timestamp: reading.timestamp
            });
            addedIds.add(uniqueId);
            console.log('[MapData] Added Starlink device from sensor readings with unique ID:', uniqueId);
          }
          // Remove from noGps if we now have GPS
          noGpsIds.delete(uniqueId);
          const noGpsIdx = devicesWithoutGps.findIndex(d => d.device_id === uniqueId);
          if (noGpsIdx >= 0) {
            devicesWithoutGps.splice(noGpsIdx, 1);
          }
        } else if (!addedIds.has(uniqueId) && !noGpsIds.has(uniqueId)) {
          // Device exists but has no GPS - track for fallback
          const data = reading.data as Record<string, unknown>;
          devicesWithoutGps.push({
            device_id: uniqueId,
            timestamp: reading.timestamp,
            metrics: data.starlink as Record<string, unknown> | undefined
          });
          noGpsIds.add(uniqueId);
          console.log('[MapData] Starlink device without GPS, will use client fallback:', uniqueId);
        }
      });
    }
    
    // Fifth, add from starlinkLatest which contains the unique device_id inside the starlink object
    if (starlinkLatest?.data) {
      const data = starlinkLatest.data as Record<string, unknown>;
      const result = extractStarlinkCoordsWithId(data, 'starlink_dish_1');
      if (result) {
        // Use the unique device_id from inside the starlink object
        const uniqueId = result.device_id;
        
        if (!addedIds.has(uniqueId)) {
          devices.push({
            device_id: uniqueId,
            lat: result.lat,
            lng: result.lng,
            altitude: result.altitude,
            timestamp: starlinkLatest.timestamp
          });
          addedIds.add(uniqueId);
          console.log('[MapData] Added Starlink device from latest with unique ID:', uniqueId, { lat: result.lat, lng: result.lng });
        } else {
          // Update if newer
          const existingIdx = devices.findIndex(d => d.device_id === uniqueId);
          if (existingIdx >= 0) {
            const existingTimestamp = devices[existingIdx].timestamp;
            if (!existingTimestamp || (starlinkLatest.timestamp && new Date(starlinkLatest.timestamp) > new Date(existingTimestamp))) {
              devices[existingIdx] = {
                device_id: uniqueId,
                lat: result.lat,
                lng: result.lng,
                altitude: result.altitude,
                timestamp: starlinkLatest.timestamp
              };
            }
          }
        }
      }
    }
    
    if (devices.length > 0) {
      console.log('[MapData] Total Starlink devices with GPS:', devices.length, devices.map(d => d.device_id));
    }
    if (devicesWithoutGps.length > 0) {
      console.log('[MapData] Starlink devices without GPS (will use client fallback):', devicesWithoutGps.length, devicesWithoutGps.map(d => d.device_id));
    }
    
    return { starlinkDevices: devices, starlinkDevicesWithoutGps: devicesWithoutGps };
  }, [geoLocations, starlinkDevicesApi, starlinkStatusData, starlinkSensorReadings, starlinkLatest]);

  // Keep backward compatibility - get first device GPS
  const starlinkStatusGps = useMemo<{ lat: number; lng: number; altitude?: number } | null>(() => {
    return starlinkDevices.length > 0 ? starlinkDevices[0] : null;
  }, [starlinkDevices]);

  // Merge geo locations API with readings GPS, Starlink GPS, GPSD GPS
  const gpsCoordinates = useMemo(() => {
    const merged = mergeGpsData(geoLocations, readingsGps);
    
    // Add ALL Starlink devices with GPS coordinates
    starlinkDevices.forEach(device => {
      merged[device.device_id] = {
        lat: device.lat,
        lng: device.lng,
        altitude: device.altitude,
        timestamp: device.timestamp,
      };
    });
    
    // Fallback: Add legacy single Starlink GPS if no devices found
    if (starlinkDevices.length === 0) {
      const effectiveStarlinkGps = starlinkStatusGps || starlinkGps;
      if (effectiveStarlinkGps) {
        merged['starlink_dish_1'] = {
          lat: effectiveStarlinkGps.lat,
          lng: effectiveStarlinkGps.lng,
          altitude: effectiveStarlinkGps.altitude,
        };
      }
    }

    // Add GPSD GPS if available
    if (gpsdGps) {
      merged['gpsd_device'] = {
        lat: gpsdGps.lat,
        lng: gpsdGps.lng,
        altitude: gpsdGps.altitude,
      };
    }

    // Add GPS readings from GPS sensor
    if (gpsReadings?.readings) {
      gpsReadings.readings.forEach(reading => {
        if (reading.latitude !== undefined && reading.longitude !== undefined &&
            reading.latitude >= -90 && reading.latitude <= 90 &&
            reading.longitude >= -180 && reading.longitude <= 180 &&
            !(reading.latitude === 0 && reading.longitude === 0)) {
          const deviceId = reading.device_id || 'gps_device';
          merged[deviceId] = {
            lat: reading.latitude,
            lng: reading.longitude,
            altitude: reading.altitude,
            timestamp: reading.timestamp,
          };
        }
      });
    }
    
    if (Object.keys(merged).length > 0) {
      console.log('[MapData] GPS coordinates merged:', Object.keys(merged));
    }
    
    return merged;
  }, [geoLocations, readingsGps, starlinkGps, starlinkStatusGps, gpsdGps, gpsReadings, starlinkDevices]);

  // Build sensor markers from sensors API, geo locations, and clients with GPS
  const sensorMarkers = useMemo<SensorMarker[]>(() => {
    const markers: SensorMarker[] = [];
    const addedIds = new Set<string>();
    
    // Add sensors that have location data directly
    if (sensors) {
      sensors.forEach(s => {
        if (s.location?.lat && s.location?.lng) {
          // Validate coordinates
          if (s.location.lat >= -90 && s.location.lat <= 90 &&
              s.location.lng >= -180 && s.location.lng <= 180 &&
              !(s.location.lat === 0 && s.location.lng === 0)) {
            markers.push(s as SensorMarker);
            addedIds.add(s.id);
          }
        }
      });
    }

    // Add geo locations as GPS markers
    const geoArray = normalizeGeoLocations(geoLocations);
    geoArray.forEach(geo => {
      const id = `geo-${geo.device_id}`;
      if (addedIds.has(id)) return;
      
      // Validate coordinates
      if (geo.lat >= -90 && geo.lat <= 90 &&
          geo.lng >= -180 && geo.lng <= 180 &&
          !(geo.lat === 0 && geo.lng === 0)) {
        markers.push({
          id,
          name: geo.device_id,
          type: 'gps',
          value: geo.altitude || 0,
          unit: 'm',
          status: 'active',
          lastUpdate: geo.timestamp || new Date().toISOString(),
          location: { lat: geo.lat, lng: geo.lng }
        });
        addedIds.add(id);
      }
    });

    // Build Starlink metrics from the various hooks
    const starlinkMetrics: StarlinkMetrics = {
      connected: starlinkConnectivity?.connected,
      signalStrength: starlinkSignal?.signal_strength_dbm,
      snr: starlinkSignal?.snr,
      obstructionPercent: starlinkConnectivity?.obstruction_percent,
      uptimeSeconds: starlinkConnectivity?.uptime_seconds,
      downlinkThroughputBps: starlinkPerformance?.downlink_throughput_bps,
      uplinkThroughputBps: starlinkPerformance?.uplink_throughput_bps,
      latencyMs: starlinkPerformance?.pop_ping_latency_ms,
      powerWatts: starlinkPower?.device_summaries?.[0]?.overall?.avg_watts,
    };

    // Add all Starlink devices as markers
    if (starlinkDevices.length > 0) {
      starlinkDevices.forEach(device => {
        if (!addedIds.has(device.device_id)) {
          // Format the unique device_id for display
          // e.g., "ut00c80094-00f2641c-191db305" -> "Starlink ut00c...db305"
          let displayName: string;
          if (device.device_id === 'starlink_dish_1') {
            displayName = 'Starlink Dish';
          } else if (device.device_id.toLowerCase().startsWith('ut')) {
            // Starlink unique terminal ID format - show abbreviated version
            const parts = device.device_id.split('-');
            if (parts.length >= 1) {
              const firstPart = parts[0].substring(0, 8);
              const lastPart = parts[parts.length - 1]?.slice(-6) || '';
              displayName = `Starlink ${firstPart}...${lastPart}`;
            } else {
              displayName = `Starlink ${device.device_id.substring(0, 12)}...`;
            }
          } else {
            displayName = `Starlink ${device.device_id.replace(/_/g, ' ').replace(/starlink/i, '').trim() || 'Dish'}`;
          }
          
          markers.push({
            id: device.device_id,
            name: displayName,
            type: 'starlink',
            value: device.altitude || 0,
            unit: 'm',
            status: starlinkMetrics.connected ? 'active' : 'warning',
            lastUpdate: device.timestamp || new Date().toISOString(),
            location: { lat: device.lat, lng: device.lng },
            starlinkData: {
              ...starlinkMetrics,
              altitude: device.altitude,
              deviceId: device.device_id,
            }
          });
          addedIds.add(device.device_id);
        }
      });
    }
    
    // Add Starlink devices without GPS using first available client GPS as fallback
    if (starlinkDevicesWithoutGps.length > 0) {
      // Find a client GPS to use as fallback
      let fallbackGps: { lat: number; lng: number } | null = null;
      
      // Try to get GPS from any client via gpsCoordinates
      if (clients) {
        for (const client of clients) {
          // Check gpsCoordinates for this client
          const clientGpsFromMap = gpsCoordinates[client.client_id];
          if (clientGpsFromMap) {
            fallbackGps = { lat: clientGpsFromMap.lat, lng: clientGpsFromMap.lng };
            break;
          }
        }
      }
      
      // If still no GPS, try from existing Starlink devices
      if (!fallbackGps && starlinkDevices.length > 0) {
        fallbackGps = { lat: starlinkDevices[0].lat, lng: starlinkDevices[0].lng };
      }
      
      // If still no GPS, try starlinkGps
      if (!fallbackGps && starlinkGps) {
        fallbackGps = { lat: starlinkGps.lat, lng: starlinkGps.lng };
      }
      
      if (fallbackGps) {
        starlinkDevicesWithoutGps.forEach(device => {
          if (!addedIds.has(device.device_id)) {
            // Format the unique device_id for display
            let displayName: string;
            if (device.device_id.toLowerCase().startsWith('ut')) {
              const parts = device.device_id.split('-');
              if (parts.length >= 1) {
                const firstPart = parts[0].substring(0, 8);
                const lastPart = parts[parts.length - 1]?.slice(-6) || '';
                displayName = `Starlink ${firstPart}...${lastPart}`;
              } else {
                displayName = `Starlink ${device.device_id.substring(0, 12)}...`;
              }
            } else {
              displayName = `Starlink ${device.device_id.replace(/_/g, ' ').replace(/starlink/i, '').trim() || 'Dish'}`;
            }
            
            markers.push({
              id: device.device_id,
              name: displayName,
              type: 'starlink',
              value: 0,
              unit: 'm',
              status: starlinkMetrics.connected ? 'active' : 'warning',
              lastUpdate: device.timestamp || new Date().toISOString(),
              location: fallbackGps,
              starlinkData: {
                ...starlinkMetrics,
                deviceId: device.device_id,
              }
            });
            addedIds.add(device.device_id);
            console.log('[MapData] Added Starlink device without GPS using fallback:', device.device_id);
          }
        });
      }
    }
    
    if (starlinkDevices.length === 0 && starlinkDevicesWithoutGps.length === 0 && starlinkGps && !addedIds.has('starlink_dish_1')) {
      // Fallback to stats GPS if no devices from status data
      markers.push({
        id: 'starlink_dish_1',
        name: 'Starlink Dish',
        type: 'starlink',
        value: starlinkGps.altitude || 0,
        unit: 'm',
        status: starlinkMetrics.connected ? 'active' : 'warning',
        lastUpdate: new Date().toISOString(),
        location: { lat: starlinkGps.lat, lng: starlinkGps.lng },
        starlinkData: {
          ...starlinkMetrics,
          altitude: starlinkGps.altitude,
          deviceId: 'starlink_dish_1',
        }
      });
      addedIds.add('starlink_dish_1');
    }

    // Add GPSD marker if we have GPS daemon data
    if (gpsdGps && !addedIds.has('gpsd_device')) {
      markers.push({
        id: 'gpsd_device',
        name: 'GPS Device',
        type: 'gps',
        value: gpsdGps.altitude || 0,
        unit: 'm',
        status: gpsdStatus?.mode === 3 ? 'active' : 'warning',
        lastUpdate: gpsdStatus?.timestamp || new Date().toISOString(),
        location: { lat: gpsdGps.lat, lng: gpsdGps.lng }
      });
      addedIds.add('gpsd_device');
    }

    // Add GPS readings markers
    if (gpsReadings?.readings) {
      // Get the latest reading for each device
      const latestByDevice = new Map<string, typeof gpsReadings.readings[0]>();
      gpsReadings.readings.forEach(reading => {
        const deviceId = reading.device_id || 'gps_device';
        const existing = latestByDevice.get(deviceId);
        if (!existing || new Date(reading.timestamp) > new Date(existing.timestamp)) {
          latestByDevice.set(deviceId, reading);
        }
      });
      
      latestByDevice.forEach((reading, deviceId) => {
        if (addedIds.has(deviceId)) return;
        if (reading.latitude !== undefined && reading.longitude !== undefined &&
            reading.latitude >= -90 && reading.latitude <= 90 &&
            reading.longitude >= -180 && reading.longitude <= 180 &&
            !(reading.latitude === 0 && reading.longitude === 0)) {
          markers.push({
            id: deviceId,
            name: deviceId.replace(/_/g, ' '),
            type: 'gps',
            value: reading.altitude || 0,
            unit: 'm',
            status: 'active',
            lastUpdate: reading.timestamp,
            location: { lat: reading.latitude, lng: reading.longitude }
          });
          addedIds.add(deviceId);
        }
      });
    }
    
    // Add clients as sensors based on their enabled sensor types
    if (clients) {
      clients.forEach(client => {
        const config = client.metadata?.config?.sensors;
        const baseStatus = client.status || 'active';
        
        // Try to find GPS coordinates for this client
        let clientGps: { lat: number; lng: number } | null = null;
        
        // 1. Check if there's a geo location for this client directly
        if (gpsCoordinates[client.client_id]) {
          clientGps = gpsCoordinates[client.client_id];
        }
        
        // 2. Look for GPS coordinates in any of the client's sensor readings
        if (!clientGps) {
          const clientSensors = client.sensors || [];
          for (const sensorId of clientSensors) {
            if (gpsCoordinates[sensorId]) {
              clientGps = gpsCoordinates[sensorId];
              break;
            }
          }
        }
        
        // 3. Check for GPS device ID patterns
        if (!clientGps) {
          const gpsDeviceId = `${client.hostname}_gps` || `gps_${client.client_id}`;
          if (gpsCoordinates[gpsDeviceId]) {
            clientGps = gpsCoordinates[gpsDeviceId];
          }
        }

        // 4. Check for starlink GPS data which often includes location
        if (!clientGps) {
          const starlinkId = client.sensors?.find(s => s.toLowerCase().includes('starlink'));
          if (starlinkId && gpsCoordinates[starlinkId]) {
            clientGps = gpsCoordinates[starlinkId];
          }
        }
        
        // If no GPS found, skip this client for map markers
        if (!clientGps) return;
        
        // Only add if we have config sensors defined
        if (!config) {
          // Add generic client marker if no config
          const id = `${client.client_id}-device`;
          if (!addedIds.has(id)) {
            markers.push({
              id,
              name: `${client.hostname}`,
              type: 'client',
              value: 0,
              unit: '',
              status: baseStatus,
              lastUpdate: client.last_seen,
              location: clientGps
            });
            addedIds.add(id);
          }
          return;
        }
        
        // Check for GPS-enabled client and create marker
        const gps = config.gps;
        if (gps?.enabled) {
          const id = `${client.client_id}-gps`;
          if (!addedIds.has(id)) {
            markers.push({
              id,
              name: `${client.hostname} GPS`,
              type: 'gps',
              value: gpsCoordinates[client.client_id]?.altitude || 0,
              unit: 'm',
              status: baseStatus,
              lastUpdate: client.last_seen,
              location: clientGps
            });
            addedIds.add(id);
          }
        }
        
        // Add LoRa sensors
        const lora = config.lora;
        if (lora?.enabled) {
          const id = `${client.client_id}-lora`;
          if (!addedIds.has(id)) {
            markers.push({
              id,
              name: `${client.hostname} LoRa`,
              type: 'lora',
              value: 0,
              unit: 'dBm',
              status: baseStatus,
              lastUpdate: client.last_seen,
              location: clientGps
            });
            addedIds.add(id);
          }
        }
        
        // Add Starlink sensors - but only one marker per client pointing to actual Starlink device
        // Skip adding starlink markers here as they're handled separately via starlinkDevices or starlinkDevicesWithoutGps
        // This prevents duplicate markers with identical GPS coordinates
        const starlink = config.starlink;
        const hasStarlinkDeviceData = starlinkDevices.length > 0 || starlinkDevicesWithoutGps.length > 0 || starlinkGps !== null;
        if (starlink?.enabled && !hasStarlinkDeviceData) {
          // Only add client-based Starlink marker if no actual Starlink device data available
          const id = `${client.client_id}-starlink`;
          if (!addedIds.has(id)) {
            markers.push({
              id,
              name: `${client.hostname} Starlink`,
              type: 'starlink',
              value: 0,
              unit: 'Mbps',
              status: baseStatus,
              lastUpdate: client.last_seen,
              location: clientGps
            });
            addedIds.add(id);
          }
        }
        
        // Add WiFi sensors
        const wifi = config.wifi;
        if (wifi?.enabled) {
          const id = `${client.client_id}-wifi`;
          if (!addedIds.has(id)) {
            markers.push({
              id,
              name: `${client.hostname} WiFi`,
              type: 'client',
              value: 0,
              unit: 'devices',
              status: baseStatus,
              lastUpdate: client.last_seen,
              location: clientGps
            });
            addedIds.add(id);
          }
        }
        
        // Add Bluetooth sensors
        const bluetooth = config.bluetooth;
        if (bluetooth?.enabled) {
          const id = `${client.client_id}-bluetooth`;
          if (!addedIds.has(id)) {
            markers.push({
              id,
              name: `${client.hostname} Bluetooth`,
              type: 'client',
              value: 0,
              unit: 'devices',
              status: baseStatus,
              lastUpdate: client.last_seen,
              location: clientGps
            });
            addedIds.add(id);
          }
        }
        
        // Add Thermal Probe sensors
        const thermal = config.thermal_probe;
        if (thermal?.enabled) {
          const id = `${client.client_id}-thermal`;
          if (!addedIds.has(id)) {
            markers.push({
              id,
              name: `${client.hostname} Thermal`,
              type: 'gps',
              value: 0,
              unit: '°C',
              status: baseStatus,
              lastUpdate: client.last_seen,
              location: clientGps
            });
            addedIds.add(id);
          }
        }

        // Add Arduino devices
        const arduinoDevices = config.arduino_devices;
        if (arduinoDevices && Array.isArray(arduinoDevices)) {
          arduinoDevices.forEach((arduino, idx) => {
            if (arduino.enabled) {
              const id = `${client.client_id}-arduino-${idx}`;
              if (!addedIds.has(id)) {
                markers.push({
                  id,
                  name: `${client.hostname} Arduino ${arduino.device_id || idx + 1}`,
                  type: 'client',
                  value: 0,
                  unit: '',
                  status: baseStatus,
                  lastUpdate: client.last_seen,
                  location: clientGps!
                });
                addedIds.add(id);
              }
            }
          });
        }
      });
    }
    
    return markers;
  }, [sensors, clients, gpsCoordinates, geoLocations, starlinkGps, starlinkDevices, gpsdGps, gpsdStatus, gpsReadings, starlinkSignal, starlinkPerformance, starlinkPower, starlinkConnectivity]);

  // Get client markers for the clients filter
  const clientMarkers = useMemo<ClientMarker[]>(() => {
    if (!clients) return [];
    
    return clients
      .map(c => {
        // Try to find GPS coordinates for this client
        let clientGps: { lat: number; lng: number } | null = null;
        
        // Check geo locations API first
        if (gpsCoordinates[c.client_id]) {
          clientGps = gpsCoordinates[c.client_id];
        }
        
        // Look for GPS coordinates in any of the client's sensor readings
        if (!clientGps) {
          const clientSensors = c.sensors || [];
          for (const sensorId of clientSensors) {
            if (gpsCoordinates[sensorId]) {
              clientGps = gpsCoordinates[sensorId];
              break;
            }
          }
        }
        
        // Only include clients with actual GPS coordinates
        if (!clientGps) return null;
        
        return {
          client_id: c.client_id,
          hostname: c.hostname,
          location: clientGps
        };
      })
      .filter((c): c is ClientMarker => c !== null);
  }, [clients, gpsCoordinates]);

  // Build ADS-B aircraft markers
  const adsbMarkers = useMemo<AdsbMarker[]>(() => {
    if (!adsbAircraft || !Array.isArray(adsbAircraft)) return [];
    
    return adsbAircraft
      .filter((aircraft: AdsbAircraft) => 
        aircraft.lat !== undefined && 
        aircraft.lon !== undefined &&
        aircraft.lat >= -90 && aircraft.lat <= 90 &&
        aircraft.lon >= -180 && aircraft.lon <= 180
      )
      .map((aircraft: AdsbAircraft) => {
        // For historical data, mark as 'historical' status; for live, use seen time
        let status = 'active';
        if (adsbIsHistorical) {
          status = 'historical';
        } else if (aircraft.seen !== undefined && aircraft.seen >= 60) {
          status = 'stale';
        }
        
        return {
          id: `adsb-${aircraft.hex}`,
          hex: aircraft.hex,
          name: aircraft.flight?.trim() || aircraft.hex,
          type: 'adsb',
          value: aircraft.alt_baro || aircraft.alt_geom || 0,
          unit: 'ft',
          status,
          lastUpdate: new Date().toISOString(),
          location: {
            lat: aircraft.lat!,
            lng: aircraft.lon!
          },
          speed: aircraft.gs,
          track: aircraft.track,
          squawk: aircraft.squawk,
          rssi: aircraft.rssi,
          category: aircraft.category,
          // Extended fields
          registration: aircraft.registration,
          operator: aircraft.operator || aircraft.operator_callsign,
          aircraftType: aircraft.type,
          country: aircraft.country,
          military: aircraft.military,
          altGeom: aircraft.alt_geom,
          baroRate: aircraft.baro_rate,
          ias: aircraft.ias,
          tas: aircraft.tas,
          emergency: aircraft.emergency,
          messages: aircraft.messages,
        };
      });
  }, [adsbAircraft, adsbIsHistorical]);

  // Extract aircraft trails from historical data
  const adsbTrails = useMemo<AircraftTrailData[]>(() => {
    if (!adsbHistoricalData?.readings || adsbHistoricalData.readings.length === 0) {
      return [];
    }

    // Map of icao -> trail data with all positions
    const trailMap = new Map<string, { 
      flight?: string; 
      positions: { lat: number; lng: number; alt?: number; timestamp: string }[] 
    }>();

    adsbHistoricalData.readings.forEach(reading => {
      const data = reading.data;
      const timestamp = reading.timestamp;
      
      // Check if aircraft_list exists (new format)
      const aircraftList = (data as { aircraft_list?: Array<Record<string, unknown>> }).aircraft_list;
      
      if (aircraftList && Array.isArray(aircraftList)) {
        aircraftList.forEach(ac => {
          const hex = String(ac.icao || ac.hex || '');
          if (!hex) return;
          
          const lat = ac.latitude as number || ac.lat as number;
          const lon = ac.longitude as number || ac.lon as number;
          const alt = ac.altitude_ft as number || ac.alt_baro as number;
          const flight = ac.callsign as string || ac.flight as string;
          
          if (lat !== undefined && lon !== undefined && 
              lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
            const existing = trailMap.get(hex) || { flight, positions: [] };
            existing.positions.push({ lat, lng: lon, alt, timestamp });
            if (flight && !existing.flight) existing.flight = flight;
            trailMap.set(hex, existing);
          }
        });
      } else {
        // Old format: aircraft data directly in data object
        const hex = String(data.hex || data.flight || '');
        if (!hex) return;
        
        const lat = data.lat as number;
        const lon = data.lon as number;
        const alt = data.alt_baro as number;
        const flight = data.flight as string;
        
        if (lat !== undefined && lon !== undefined && 
            lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
          const existing = trailMap.get(hex) || { flight, positions: [] };
          existing.positions.push({ lat, lng: lon, alt, timestamp });
          if (flight && !existing.flight) existing.flight = flight;
          trailMap.set(hex, existing);
        }
      }
    });

    // Convert to trail format, sorted by timestamp
    return Array.from(trailMap.entries())
      .filter(([, trail]) => trail.positions.length >= 2) // Only include if we have at least 2 points
      .map(([icao, trail]) => {
        // Sort positions by timestamp
        const sortedPositions = [...trail.positions].sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        
        return {
          icao,
          flight: trail.flight,
          coordinates: sortedPositions.map(p => [p.lat, p.lng] as [number, number]),
          altitudes: sortedPositions.map(p => p.alt),
          timestamps: sortedPositions.map(p => p.timestamp),
        };
      });
  }, [adsbHistoricalData]);

  // Filter markers by selected client
  const filteredSensorMarkers = useMemo<SensorMarker[]>(() => {
    if (!clientId || clientId === 'all') return sensorMarkers;
    
    // Get the selected client's hostname for matching
    const selectedClient = clients?.find(c => c.client_id === clientId);
    if (!selectedClient) return sensorMarkers;
    
    // Filter sensors that belong to this client (by ID pattern or sensor association)
    return sensorMarkers.filter(marker => {
      // Check if marker ID contains client_id
      if (marker.id.includes(clientId)) return true;
      
      // Check if marker ID contains client hostname
      if (selectedClient.hostname && marker.id.toLowerCase().includes(selectedClient.hostname.toLowerCase())) return true;
      
      // Check if marker name contains client hostname
      if (selectedClient.hostname && marker.name.toLowerCase().includes(selectedClient.hostname.toLowerCase())) return true;
      
      // Check if marker is in the client's sensors list
      if (selectedClient.sensors?.includes(marker.id)) return true;
      
      return false;
    });
  }, [sensorMarkers, clientId, clients]);

  const filteredClientMarkers = useMemo<ClientMarker[]>(() => {
    if (!clientId || clientId === 'all') return clientMarkers;
    return clientMarkers.filter(c => c.client_id === clientId);
  }, [clientMarkers, clientId]);

  // All marker positions for bounds fitting (using filtered markers)
  const allPositions = useMemo<LatLngExpression[]>(() => {
    const positions: LatLngExpression[] = [];
    filteredSensorMarkers.forEach(s => positions.push([s.location.lat, s.location.lng]));
    filteredClientMarkers.forEach(c => positions.push([c.location.lat, c.location.lng]));
    adsbMarkers.forEach(a => positions.push([a.location.lat, a.location.lng]));
    return positions;
  }, [filteredSensorMarkers, filteredClientMarkers, adsbMarkers]);

  // Calculate statistics (using filtered markers)
  const stats = useMemo<MapStats>(() => {
    const result = {
      total: filteredSensorMarkers.length + filteredClientMarkers.length + adsbMarkers.length,
      gps: filteredSensorMarkers.filter(s => s.type === 'gps').length,
      starlink: filteredSensorMarkers.filter(s => s.type === 'starlink').length,
      clients: filteredClientMarkers.length,
      lora: filteredSensorMarkers.filter(s => s.type === 'lora').length,
      adsb: adsbMarkers.length,
      wifi: filteredSensorMarkers.filter(s => s.type === 'wifi').length,
      bluetooth: filteredSensorMarkers.filter(s => s.type === 'bluetooth').length,
      aprs: filteredSensorMarkers.filter(s => s.type === 'aprs').length,
    };
    console.log('[MapData] Final stats (filtered by client:', clientId || 'all', '):', result);
    return result;
  }, [filteredSensorMarkers, filteredClientMarkers, adsbMarkers, clientId]);

  const isLoading = sensorsLoading || clientsLoading || readingsLoading || geoLoading || adsbLoading;

  // Format time ago
  const timeAgo = useMemo(() => {
    const seconds = Math.floor((new Date().getTime() - lastUpdate.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    return `${Math.floor(seconds / 60)}m ago`;
  }, [lastUpdate]);

  return {
    sensorMarkers: filteredSensorMarkers,
    clientMarkers: filteredClientMarkers,
    adsbMarkers,
    adsbTrails,
    allPositions,
    stats,
    isLoading,
    timeAgo,
    handleRefresh,
    lastUpdate,
    geoLocations,
    adsbIsHistorical,
    adsbSource,
    // Expose unfiltered markers for client list
    allClients: clients,
  };
}
