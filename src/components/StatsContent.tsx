import { useState, useMemo, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApiError, ApiErrorBanner } from "@/components/ui/api-error";
import { ComponentErrorBoundary } from "@/components/ui/error-boundary";
import "leaflet/dist/leaflet.css";
import { 
  useLatestReadings,
  useClientsWithHostnames,
  useClient,
  useClientSystemInfo,
} from "@/hooks/aurora";

import {
  type DeviceGroup,
  type SensorReading,
  processReadingsToGroups,
  ClientInfoCard,
  ClientLocationMap,
  SensorTabs,
  StatsHeader,
  StatsLoadingSkeleton,
  RawJsonPanel,
} from "@/components/stats";

export default function StatsContent() {
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("sensors");
  const [isRetrying, setIsRetrying] = useState(false);

  // Fetch data
  const { 
    data: readings, 
    isLoading: readingsLoading, 
    error: readingsError,
    refetch: refetchReadings 
  } = useLatestReadings();
  
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
  
  // Selected client details
  const { data: selectedClientData } = useClient(selectedClient || "");
  const { data: selectedClientSystemInfo } = useClientSystemInfo(selectedClient || "");

  // Process readings into device groups
  const deviceGroups = useMemo(() => {
    return processReadingsToGroups(readings as SensorReading[] || []);
  }, [readings]);

  // Filter devices by selected client
  const filteredDevices = useMemo(() => {
    if (!selectedClient) return deviceGroups;
    return deviceGroups.filter(d => d.client_id === selectedClient);
  }, [deviceGroups, selectedClient]);

  // Collect API errors
  const apiErrors = useMemo(() => {
    const errors: Array<{ endpoint: string; message: string }> = [];
    if (readingsError) errors.push({ endpoint: "/readings", message: readingsError.message || "Failed to load readings" });
    if (clientsError) errors.push({ endpoint: "/clients", message: clientsError.message || "Failed to load clients" });
    return errors;
  }, [readingsError, clientsError]);

  const isLoading = readingsLoading || clientsLoading;
  const hasData = (readings && readings.length > 0) || (clients && clients.length > 0);
  const hasCriticalError = apiErrors.length > 0 && !hasData && !isLoading;

  const handleRefresh = async () => {
    setIsRetrying(true);
    await Promise.all([refetchReadings(), refetchClients()]);
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
          {filteredDevices.length > 0 ? (
            <ComponentErrorBoundary name="SensorTabs">
              <SensorTabs devices={filteredDevices} isLoading={readingsLoading} />
            </ComponentErrorBoundary>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>No sensors found for this client</p>
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