import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = "https://hewwtgcrupegpcwfujln.supabase.co";

interface AuroraProxyResponse {
  error?: string;
}

async function callAuroraProxy<T>(path: string, method: string = "GET", body?: unknown): Promise<T> {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/aurora-proxy`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhld3d0Z2NydXBlZ3Bjd2Z1amxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczNzM0ODEsImV4cCI6MjA4Mjk0OTQ4MX0.KBi-s-z9yxU6d0D-kGrHDjKK00VwhYj1WebEzR8qZvA",
    },
    body: JSON.stringify({ path, method, body }),
  });

  if (!response.ok) {
    throw new Error(`Aurora API error: ${response.status}`);
  }

  const data = await response.json();
  
  if ((data as AuroraProxyResponse).error) {
    throw new Error((data as AuroraProxyResponse).error);
  }

  return data as T;
}

// Sensor data types
export interface SensorData {
  id: string;
  name: string;
  type: string;
  value: number;
  unit: string;
  status: string;
  lastUpdate: string;
  location?: {
    lat: number;
    lng: number;
  };
}

export interface SensorStats {
  avgTemperature: number;
  avgSignal: number;
  avgPower: number;
  totalSensors: number;
}

export interface Alert {
  id: string;
  type: string;
  message: string;
  severity: string;
  timestamp: string;
}

export interface AdsbAircraft {
  hex: string;
  flight?: string;
  alt_baro?: number;
  alt_geom?: number;
  gs?: number;
  track?: number;
  lat?: number;
  lon?: number;
  squawk?: string;
  category?: string;
  seen?: number;
  rssi?: number;
}

export interface AdsbStats {
  total: number;
  tracked: number;
  messages: number;
  positions: number;
}

// Hooks
export function useSensors() {
  return useQuery({
    queryKey: ["aurora", "sensors"],
    queryFn: () => callAuroraProxy<SensorData[]>("/api/v1/sensors"),
    refetchInterval: 10000,
    retry: 2,
  });
}

export function useAlerts() {
  return useQuery({
    queryKey: ["aurora", "alerts"],
    queryFn: () => callAuroraProxy<Alert[]>("/api/alerts"),
    refetchInterval: 30000,
    retry: 2,
  });
}

export function useAdsbAircraft() {
  return useQuery({
    queryKey: ["aurora", "adsb", "aircraft"],
    queryFn: () => callAuroraProxy<AdsbAircraft[]>("/api/adsb/aircraft"),
    refetchInterval: 5000,
    retry: 2,
  });
}

export function useAdsbStats() {
  return useQuery({
    queryKey: ["aurora", "adsb", "stats"],
    queryFn: () => callAuroraProxy<AdsbStats>("/api/adsb/stats"),
    refetchInterval: 10000,
    retry: 2,
  });
}
