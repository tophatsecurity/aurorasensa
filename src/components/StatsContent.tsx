import { useState, useMemo } from "react";
import { ApiError, ApiErrorBanner } from "@/components/ui/api-error";
import { ComponentErrorBoundary } from "@/components/ui/error-boundary";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Database, Cpu, Layers, Clock, ChevronLeft } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import "leaflet/dist/leaflet.css";
import { 
  useClientsWithHostnames,
  useClient,
  useClientSystemInfo,
  useClientSensorData,
  useStatsByClient,
} from "@/hooks/aurora";
import { useClientContext } from "@/contexts/ClientContext";
import { Button } from "@/components/ui/button";

import {
  type DeviceGroup,
  type SensorReading,
  ClientInfoCard,
  ClientLocationMap,
  SensorTabs,
  StatsLoadingSkeleton,
  RawJsonPanel,
  enrichDevicesWithLocations,
  ClientSensorStats,
  ClientListView,
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
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [isRetrying, setIsRetrying] = useState(false);

  const isClientSelected = !isAllClients && selectedClientId;
  const actualClientId = isAllClients ? "" : selectedClientId;

  // Fetch clients
  const { 
    data: clients, 
    isLoading: clientsLoading,
    error: clientsError,
    refetch: refetchClients 
  } = useClientsWithHostnames();
  
  // Fetch client-specific sensor data - only when a specific client is selected
  const { 
    data: clientSensorData, 
    isLoading: sensorsLoading, 
    error: sensorsError,
    refetch: refetchSensors 
  } = useClientSensorData(actualClientId);
  
  // Selected client details
  const { data: selectedClientData } = useClient(actualClientId);
  const { data: selectedClientSystemInfo } = useClientSystemInfo(actualClientId);

  // Process readings into device groups
  const filteredDevices = useMemo(() => {
    if (!clientSensorData?.readings || clientSensorData.readings.length === 0) return [];
    const devices = processClientSensorDataToGroups(clientSensorData.readings, actualClientId);
    return enrichDevicesWithLocations(devices);
  }, [clientSensorData, actualClientId]);

  // Collect API errors
  const apiErrors = useMemo(() => {
    const errors: Array<{ endpoint: string; message: string }> = [];
    if (sensorsError) errors.push({ endpoint: "/sensors", message: sensorsError.message || "Failed to load sensor data" });
    if (clientsError) errors.push({ endpoint: "/clients", message: clientsError.message || "Failed to load clients" });
    return errors;
  }, [sensorsError, clientsError]);

  const isLoading = clientsLoading;
  const sensorsAreLoading = sensorsLoading && actualClientId;
  const hasData = (clientSensorData?.readings && clientSensorData.readings.length > 0) || (clients && clients.length > 0);
  const hasCriticalError = apiErrors.length > 0 && !hasData && !isLoading;

  const handleRefresh = async () => {
    setIsRetrying(true);
    await Promise.all([refetchSensors(), refetchClients()]);
    setIsRetrying(false);
  };

  const handleClientSelect = (clientId: string) => {
    setSelectedClientId(clientId);
    setActiveTab("overview");
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

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          {isClientSelected && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleBackToList}
              className="gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold">
              {isClientSelected 
                ? (selectedClientData?.hostname || actualClientId) 
                : "Stats"}
            </h1>
            <p className="text-muted-foreground text-sm">
              {isClientSelected 
                ? "Detailed sensor statistics and data"
                : "Select a client to view detailed statistics"}
            </p>
          </div>
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

      {/* CLIENT LIST VIEW - When no client selected */}
      {!isClientSelected && (
        <ClientListView onClientSelect={handleClientSelect} />
      )}

      {/* CLIENT-SPECIFIC VIEW */}
      {isClientSelected && (
        <>
          {/* Current Sensor Stats - Thermal, AHT, Starlink Power */}
          <ComponentErrorBoundary name="ClientSensorStats">
            <ClientSensorStats clientId={actualClientId} />
          </ComponentErrorBoundary>

          {/* Client Info Card */}
          {selectedClientData && (
            <ComponentErrorBoundary name="ClientInfoCard">
              <ClientInfoCard 
                client={selectedClientData as any} 
                systemInfo={selectedClientSystemInfo}
                devices={filteredDevices}
              />
            </ComponentErrorBoundary>
          )}

          {/* Sensor Data Tabs */}
          <div className="space-y-4">
            {sensorsAreLoading ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>Loading sensor data...</p>
              </div>
            ) : filteredDevices.length > 0 ? (
              <ComponentErrorBoundary name="SensorTabs">
                <SensorTabs devices={filteredDevices} isLoading={false} clientId={actualClientId} />
              </ComponentErrorBoundary>
            ) : (
              <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-lg">
                <p className="text-lg font-medium">No readings found for this sensor type</p>
                <p className="text-xs mt-2">Sensor data is extracted from batch submissions</p>
              </div>
            )}
          </div>

          {/* Additional Views - Location Map & Raw Data */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="map">Location</TabsTrigger>
              <TabsTrigger value="raw">Raw Data</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              {filteredDevices.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  <SummaryStatCard 
                    label="Total Readings" 
                    value={clientSensorData?.readings?.length || 0} 
                    icon={Database}
                  />
                  <SummaryStatCard 
                    label="Device Types" 
                    value={[...new Set(filteredDevices.map(d => d.device_type))].length} 
                    icon={Layers}
                  />
                  <SummaryStatCard 
                    label="Active Devices" 
                    value={filteredDevices.length} 
                    icon={Cpu}
                  />
                  <SummaryStatCard 
                    label="Latest Update" 
                    value={filteredDevices[0]?.latest?.timestamp 
                      ? formatDistanceToNow(new Date(filteredDevices[0].latest.timestamp), { addSuffix: true })
                      : 'N/A'} 
                    icon={Clock}
                    isText
                  />
                </div>
              )}
            </TabsContent>

            <TabsContent value="map">
              <ComponentErrorBoundary name="ClientLocationMap">
                <ClientLocationMap 
                  client={selectedClientData as any} 
                  devices={filteredDevices}
                  height="h-[500px]"
                />
              </ComponentErrorBoundary>
            </TabsContent>

            <TabsContent value="raw" className="space-y-4">
              <ComponentErrorBoundary name="RawJsonPanel">
                <RawJsonPanel clientId={actualClientId} />
              </ComponentErrorBoundary>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

function SummaryStatCard({ 
  label, 
  value, 
  icon: Icon, 
  isText = false 
}: { 
  label: string; 
  value: string | number; 
  icon: React.ElementType; 
  isText?: boolean;
}) {
  return (
    <div className="p-4 rounded-lg bg-card border border-border/50">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 text-primary" />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className={isText ? "text-sm font-medium truncate" : "text-xl font-bold"}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
    </div>
  );
}
