import { useState, useMemo, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApiError, ApiErrorBanner } from "@/components/ui/api-error";
import { ComponentErrorBoundary } from "@/components/ui/error-boundary";
import "leaflet/dist/leaflet.css";
import { 
  useClientsWithHostnames,
  useClient,
  useClientSystemInfo,
  useClientSensorData,
} from "@/hooks/aurora";

import {
  type DeviceGroup,
  type SensorReading,
  ClientInfoCard,
  ClientLocationMap,
  SensorTabs,
  StatsHeader,
  StatsLoadingSkeleton,
  RawJsonPanel,
} from "@/components/stats";

// Helper to convert client sensor readings to device groups
function processClientSensorDataToGroups(
  readings: Array<{ device_id: string; device_type: string; timestamp: string; data: Record<string, unknown>; client_id?: string }>,
  clientId: string
): DeviceGroup[] {
  if (!readings || readings.length === 0) return [];
  
  const groups = new Map<string, DeviceGroup>();
  
  readings.forEach((reading) => {
    const key = `${clientId}:${reading.device_id}`;
    
    // Extract location if available
    const data = reading.data || {};
    let location: { lat: number; lng: number } | undefined;
    
    // Check for location in various places
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
      device_id: reading.device_id,
      device_type: reading.device_type,
      client_id: clientId,
      timestamp: reading.timestamp,
      data: reading.data,
    };
    
    if (!groups.has(key)) {
      groups.set(key, {
        device_id: reading.device_id,
        device_type: reading.device_type,
        client_id: clientId,
        readings: [],
        latest: sensorReading,
        location
      });
    }
    
    const group = groups.get(key)!;
    group.readings.push(sensorReading);
    
    // Update latest if this reading is newer
    if (new Date(reading.timestamp) > new Date(group.latest.timestamp)) {
      group.latest = sensorReading;
    }
    
    // Update location if available
    if (location) {
      group.location = location;
    }
  });
  
  return Array.from(groups.values());
}

export default function StatsContent() {
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("sensors");
  const [isRetrying, setIsRetrying] = useState(false);

  // Fetch clients
  const { 
    data: clients, 
    isLoading: clientsLoading,
    error: clientsError,
    refetch: refetchClients 
  } = useClientsWithHostnames();
  
  // Auto-select first client when clients load
  useEffect(() => {
    if (clients && clients.length > 0 && !selectedClient) {
      setSelectedClient(clients[0].client_id);
    }
  }, [clients, selectedClient]);
  
  // Fetch client-specific sensor data (from batches)
  const { 
    data: clientSensorData, 
    isLoading: sensorsLoading, 
    error: sensorsError,
    refetch: refetchSensors 
  } = useClientSensorData(selectedClient);
  
  // Selected client details
  const { data: selectedClientData } = useClient(selectedClient || "");
  const { data: selectedClientSystemInfo } = useClientSystemInfo(selectedClient || "");

  // Process readings into device groups
  const filteredDevices = useMemo(() => {
    if (!clientSensorData?.readings || clientSensorData.readings.length === 0) return [];
    return processClientSensorDataToGroups(clientSensorData.readings, selectedClient);
  }, [clientSensorData, selectedClient]);

  // Collect API errors
  const apiErrors = useMemo(() => {
    const errors: Array<{ endpoint: string; message: string }> = [];
    if (sensorsError) errors.push({ endpoint: "/sensors", message: sensorsError.message || "Failed to load sensor data" });
    if (clientsError) errors.push({ endpoint: "/clients", message: clientsError.message || "Failed to load clients" });
    return errors;
  }, [sensorsError, clientsError]);

  const isLoading = clientsLoading;
  const sensorsAreLoading = sensorsLoading && selectedClient;
  const hasData = (clientSensorData?.readings && clientSensorData.readings.length > 0) || (clients && clients.length > 0);
  const hasCriticalError = apiErrors.length > 0 && !hasData && !isLoading;

  const handleRefresh = async () => {
    setIsRetrying(true);
    await Promise.all([refetchSensors(), refetchClients()]);
    setIsRetrying(false);
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

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Header with client selector */}
      <StatsHeader 
        clients={clients || []}
        selectedClient={selectedClient}
        onClientChange={setSelectedClient}
        onRefresh={handleRefresh}
        isRefreshing={isRetrying}
      />

      {/* Error Banner for partial failures */}
      {apiErrors.length > 0 && hasData && (
        <ApiErrorBanner
          errors={apiErrors}
          onRetryAll={handleRefresh}
          isRetrying={isRetrying}
        />
      )}

      {/* Client Info Card - System info, hostname, IP, location */}
      {selectedClient && selectedClientData && (
        <ComponentErrorBoundary name="ClientInfoCard">
          <ClientInfoCard 
            client={selectedClientData as any} 
            systemInfo={selectedClientSystemInfo}
            devices={filteredDevices}
          />
        </ComponentErrorBoundary>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="sensors">Sensors</TabsTrigger>
          <TabsTrigger value="map">Location</TabsTrigger>
          <TabsTrigger value="raw">Raw Data</TabsTrigger>
        </TabsList>

        {/* Sensors Tab - Shows all sensors with their data */}
        <TabsContent value="sensors" className="space-y-4">
          {sensorsAreLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Loading sensor data...</p>
            </div>
          ) : filteredDevices.length > 0 ? (
            <ComponentErrorBoundary name="SensorTabs">
              <SensorTabs devices={filteredDevices} isLoading={false} clientId={selectedClient} />
            </ComponentErrorBoundary>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>No sensors found for this client</p>
              <p className="text-xs mt-2">Sensor data is extracted from batch submissions</p>
            </div>
          )}
        </TabsContent>

        {/* Location Map Tab */}
        <TabsContent value="map">
          <ComponentErrorBoundary name="ClientLocationMap">
            <ClientLocationMap 
              client={selectedClientData as any} 
              devices={filteredDevices}
              height="h-[500px]"
            />
          </ComponentErrorBoundary>
        </TabsContent>

        {/* Raw JSON Tab - Latest Batch */}
        <TabsContent value="raw" className="space-y-4">
          <ComponentErrorBoundary name="RawJsonPanel">
            <RawJsonPanel clientId={selectedClient} />
          </ComponentErrorBoundary>
        </TabsContent>
      </Tabs>
    </div>
  );
}