import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { callAuroraApi, hasAuroraSession } from "@/hooks/aurora/core";

interface AdsbHistoryPoint {
  lat: number;
  lon: number;
  alt_baro?: number;
  gs?: number;
  track?: number;
  timestamp?: string;
  seen?: number;
}

interface AdsbHistoryResponse {
  icao: string;
  flight?: string;
  history: AdsbHistoryPoint[];
  count: number;
}

export interface AircraftTrail {
  icao: string;
  flight?: string;
  coordinates: [number, number][];
  altitudes: (number | undefined)[];
  timestamps: (string | undefined)[];
}

export function useAdsbHistory() {
  const [selectedIcao, setSelectedIcao] = useState<string | null>(null);
  const [activeTrails, setActiveTrails] = useState<Map<string, AircraftTrail>>(new Map());

  const { data, isLoading, error } = useQuery({
    queryKey: ["adsb-history", selectedIcao],
    queryFn: () => callAuroraApi<AdsbHistoryResponse>(`/api/adsb/history/${selectedIcao}`),
    enabled: hasAuroraSession() && !!selectedIcao,
    staleTime: 30000, // 30 seconds
    refetchInterval: 30000, // Refresh every 30 seconds when selected
  });

  // Process history data into trail format
  const processHistoryToTrail = useCallback((response: AdsbHistoryResponse): AircraftTrail => {
    const coordinates: [number, number][] = [];
    const altitudes: (number | undefined)[] = [];
    const timestamps: (string | undefined)[] = [];

    response.history.forEach((point) => {
      if (point.lat && point.lon) {
        coordinates.push([point.lat, point.lon]);
        altitudes.push(point.alt_baro);
        timestamps.push(point.timestamp);
      }
    });

    return {
      icao: response.icao,
      flight: response.flight,
      coordinates,
      altitudes,
      timestamps,
    };
  }, []);

  // Toggle trail for a specific aircraft
  const toggleAircraftTrail = useCallback((icao: string) => {
    setActiveTrails((prev) => {
      const newTrails = new Map(prev);
      if (newTrails.has(icao)) {
        newTrails.delete(icao);
        if (selectedIcao === icao) {
          setSelectedIcao(null);
        }
        return newTrails;
      } else {
        setSelectedIcao(icao);
        return newTrails;
      }
    });
  }, [selectedIcao]);

  // Add trail when data is loaded
  const addTrailFromData = useCallback(() => {
    if (data && selectedIcao) {
      const trail = processHistoryToTrail(data);
      if (trail.coordinates.length > 0) {
        setActiveTrails((prev) => {
          const newTrails = new Map(prev);
          newTrails.set(selectedIcao, trail);
          return newTrails;
        });
      }
    }
  }, [data, selectedIcao, processHistoryToTrail]);

  // Clear a specific trail
  const clearTrail = useCallback((icao: string) => {
    setActiveTrails((prev) => {
      const newTrails = new Map(prev);
      newTrails.delete(icao);
      return newTrails;
    });
    if (selectedIcao === icao) {
      setSelectedIcao(null);
    }
  }, [selectedIcao]);

  // Clear all trails
  const clearAllTrails = useCallback(() => {
    setActiveTrails(new Map());
    setSelectedIcao(null);
  }, []);

  return {
    selectedIcao,
    activeTrails,
    isLoading,
    error,
    historyData: data,
    toggleAircraftTrail,
    addTrailFromData,
    clearTrail,
    clearAllTrails,
  };
}
