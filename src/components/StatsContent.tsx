import { useState, useMemo } from "react";
import { ApiError, ApiErrorBanner } from "@/components/ui/api-error";
import { ComponentErrorBoundary } from "@/components/ui/error-boundary";
import { Database, Cpu, Layers, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import "leaflet/dist/leaflet.css";
import { 
  useClientsWithHostnames,
  useClient,
  useClientSystemInfo,
  useClientSensorData,
} from "@/hooks/aurora";
import { useClientContext } from "@/contexts/ClientContext";

import {
  type DeviceGroup,
  type SensorReading,
  StatsLoadingSkeleton,
  ClientListView,
  ClientDetailPage,
} from "@/components/stats";

// Helper to convert client sensor readings to device groups
function processClientSensorDataToGroups(
  readings: Array<{ 
    device_id?: string; 
    device_type?: string; 
    sensor_type?: string;
    timestamp: string; 
    data?: Record<string, unknown>; 
    client_id?: string;
  }>,
  clientId: string
): DeviceGroup[] {
  if (!readings || readings.length === 0) return [];
  
  const groups = new Map<string, DeviceGroup>();
  
  readings.forEach((reading) => {
    const sensorType = reading.sensor_type || reading.device_type || 'unknown';
    const deviceId = reading.device_id || sensorType;
    const readingClientId = reading.client_id || clientId;
    
    const key = `${readingClientId}:${sensorType}`;
    
    const data = reading.data || {};
    let location: { lat: number; lng: number } | undefined;
    
    const starlinkData = data.starlink as Record<string, unknown> | undefined;
    if (starlinkData) {
      if (typeof starlinkData.latitude === 'number' && typeof starlinkData.longitude === 'number') {
        location = { lat: starlinkData.latitude, lng: starlinkData.longitude };
      }
    }
    if (typeof data.latitude === 'number' && typeof data.longitude === 'number') {
      location = { lat: data.latitude as number, lng: data.longitude as number };
    }
    
    const sensorReading: SensorReading = {
      sensor_type: sensorType,
      device_id: deviceId,
      device_type: sensorType,
      client_id: readingClientId,
      timestamp: reading.timestamp,
      data: reading.data,
    };
    
    if (!groups.has(key)) {
      groups.set(key, {
        device_id: deviceId,
        device_type: sensorType,
        client_id: readingClientId,
        readings: [],
        latest: sensorReading,
        location
      });
    }
    
    const group = groups.get(key)!;
    group.readings.push(sensorReading);
    
    if (new Date(reading.timestamp) > new Date(group.latest.timestamp)) {
      group.latest = sensorReading;
    }
    
    if (location) {
      group.location = location;
    }
  });
  
  return Array.from(groups.values());
}

export default function StatsContent() {
  const { selectedClientId, setSelectedClientId, isAllClients } = useClientContext();
  const [isRetrying, setIsRetrying] = useState(false);

  const isClientSelected = !isAllClients && selectedClientId;

  // Fetch clients
  const { 
    data: clients, 
    isLoading: clientsLoading,
    error: clientsError,
    refetch: refetchClients 
  } = useClientsWithHostnames();

  // Collect API errors
  const apiErrors = useMemo(() => {
    const errors: Array<{ endpoint: string; message: string }> = [];
    if (clientsError) errors.push({ endpoint: "/clients", message: clientsError.message || "Failed to load clients" });
    return errors;
  }, [clientsError]);

  const isLoading = clientsLoading;
  const hasData = clients && clients.length > 0;
  const hasCriticalError = apiErrors.length > 0 && !hasData && !isLoading;

  const handleRefresh = async () => {
    setIsRetrying(true);
    await refetchClients();
    setIsRetrying(false);
  };

  const handleClientSelect = (clientId: string) => {
    setSelectedClientId(clientId);
  };

  const handleBackToList = () => {
    setSelectedClientId("all");
  };

  if (isLoading) {
    return <StatsLoadingSkeleton />;
  }

  if (hasCriticalError) {
    return (
      <div className="flex-1 overflow-y-auto p-6">
        <ApiError
          title="Unable to Load Data"
          message="Could not connect to the Aurora API. The server may be temporarily unavailable."
          onRetry={handleRefresh}
          isRetrying={isRetrying}
        />
      </div>
    );
  }

  // If a client is selected, show the full-page detail view
  if (isClientSelected) {
    return (
      <ComponentErrorBoundary name="ClientDetailPage">
        <ClientDetailPage clientId={selectedClientId} onBack={handleBackToList} />
      </ComponentErrorBoundary>
    );
  }

  // Otherwise show the client list
  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Stats</h1>
          <p className="text-muted-foreground text-sm">Select a client to view detailed statistics</p>
        </div>
      </div>

      {/* Error Banner for partial failures */}
      {apiErrors.length > 0 && hasData && (
        <ApiErrorBanner
          errors={apiErrors}
          onRetryAll={handleRefresh}
          isRetrying={isRetrying}
        />
      )}

      {/* CLIENT LIST VIEW */}
      <ClientListView onClientSelect={handleClientSelect} />
    </div>
  );
}
