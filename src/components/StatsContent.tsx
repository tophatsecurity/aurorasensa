import { useState, useMemo, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApiError, ApiErrorBanner } from "@/components/ui/api-error";
import { ComponentErrorBoundary } from "@/components/ui/error-boundary";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Globe, Users, Database, Cpu, Layers, BarChart3, Clock, Activity, TrendingUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import "leaflet/dist/leaflet.css";
import { 
  useClientsWithHostnames,
  useClient,
  useClientSystemInfo,
  useClientSensorData,
  useGlobalStats,
  useComprehensiveStats,
  useStatsByClient,
  use1hrStats,
  use24hrStats,
} from "@/hooks/aurora";
import { useClientContext } from "@/contexts/ClientContext";
import { ClientSelector } from "@/components/ui/context-selectors";

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
import GlobalStatsCards from "@/components/stats/GlobalStatsCards";
import GlobalReadingsTrendChart from "@/components/stats/GlobalReadingsTrendChart";
import ClientTrendChart from "@/components/stats/ClientTrendChart";

// Helper to convert client sensor readings to device groups
// Handles both old format (device_id, device_type) and new format (sensor_type, client_id)
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
    // Support both old (device_type) and new (sensor_type) formats
    const sensorType = reading.sensor_type || reading.device_type || 'unknown';
    const deviceId = reading.device_id || sensorType;
    const readingClientId = reading.client_id || clientId;
    
    const key = `${readingClientId}:${sensorType}`;
    
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

// Helper to format large numbers
function formatNumber(num?: number): string {
  if (num === undefined || num === null) return "0";
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString();
}

export default function StatsContent() {
  // Use global client context
  const { selectedClientId, setSelectedClientId, isAllClients } = useClientContext();
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [isRetrying, setIsRetrying] = useState(false);

  // Map context values - "all" in context means global view
  const isGlobalView = isAllClients;
  const actualClientId = isAllClients ? "" : selectedClientId;

  // Global stats hooks
  const { data: globalStats, isLoading: globalStatsLoading } = useGlobalStats();
  const { data: comprehensiveStats, isLoading: comprehensiveLoading } = useComprehensiveStats();
  const { data: statsByClient, isLoading: statsByClientLoading } = useStatsByClient({ hours: 24 });
  const { data: stats1hr } = use1hrStats();
  const { data: stats24hr } = use24hrStats();

  // Fetch clients
  const { 
    data: clients, 
    isLoading: clientsLoading,
    error: clientsError,
    refetch: refetchClients 
  } = useClientsWithHostnames();
  
  // Fetch client-specific sensor data (from batches) - only when a specific client is selected
  const { 
    data: clientSensorData, 
    isLoading: sensorsLoading, 
    error: sensorsError,
    refetch: refetchSensors 
  } = useClientSensorData(actualClientId);
  
  // Selected client details
  const { data: selectedClientData } = useClient(actualClientId);
  const { data: selectedClientSystemInfo } = useClientSystemInfo(actualClientId);

  // Process readings into device groups and enrich with locations
  const filteredDevices = useMemo(() => {
    if (!clientSensorData?.readings || clientSensorData.readings.length === 0) return [];
    const devices = processClientSensorDataToGroups(clientSensorData.readings, actualClientId);
    return enrichDevicesWithLocations(devices);
  }, [clientSensorData, actualClientId]);

  // Process client stats for display - fallback to constructing from clients list if API returns empty
  const clientStatsList = useMemo(() => {
    // If we have data from statsByClient, use it
    if (statsByClient?.clients && statsByClient.clients.length > 0) {
      return statsByClient.clients.map((c: any) => ({
        client_id: c.client_id,
        hostname: c.hostname || c.client_id,
        reading_count: c.reading_count || 0,
        device_count: c.device_count || 0,
        sensor_types: c.sensor_types || [],
        last_reading: c.last_reading,
      }));
    }
    
    // Fallback: construct from clients list
    if (clients && clients.length > 0) {
      return clients.map((client: any) => ({
        client_id: client.client_id,
        hostname: client.hostname || client.client_id,
        reading_count: client.batches_received || client.batch_count || 0,
        device_count: client.sensors?.length || 0,
        sensor_types: client.sensors || [],
        last_reading: client.last_seen,
      }));
    }
    
    return [];
  }, [statsByClient, clients]);

  // Collect API errors
  const apiErrors = useMemo(() => {
    const errors: Array<{ endpoint: string; message: string }> = [];
    if (sensorsError) errors.push({ endpoint: "/sensors", message: sensorsError.message || "Failed to load sensor data" });
    if (clientsError) errors.push({ endpoint: "/clients", message: clientsError.message || "Failed to load clients" });
    return errors;
  }, [sensorsError, clientsError]);

  const isLoading = clientsLoading || globalStatsLoading;
  const sensorsAreLoading = sensorsLoading && actualClientId;
  const hasData = (clientSensorData?.readings && clientSensorData.readings.length > 0) || (clients && clients.length > 0) || globalStats;
  const hasCriticalError = apiErrors.length > 0 && !hasData && !isLoading;

  const handleRefresh = async () => {
    setIsRetrying(true);
    await Promise.all([refetchSensors(), refetchClients()]);
    setIsRetrying(false);
  };

  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId);
    // Reset to overview tab when switching contexts
    setActiveTab("overview");
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
      {/* Header with Context Selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            {isGlobalView ? "Global Statistics" : "Client Statistics"}
          </h1>
          <p className="text-muted-foreground text-sm">
            {isGlobalView 
              ? "Overview of all clients and sensor data" 
              : `Detailed stats for ${selectedClientData?.hostname || actualClientId}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ClientSelector
            value={selectedClientId}
            onChange={handleClientChange}
            showAllOption={true}
          />
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

      {/* GLOBAL VIEW */}
      {isGlobalView && (
        <>
          {/* Global Stats Cards */}
          <GlobalStatsCards 
            comprehensiveStats={comprehensiveStats} 
            stats1hr={stats1hr} 
            stats24hr={stats24hr}
            clientsCount={clients?.length}
            sensorsCount={clients?.reduce((acc: number, c: any) => acc + (c.sensors?.length || 0), 0)}
          />

          {/* Charts Row - Readings Trend & Client Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <GlobalReadingsTrendChart 
              readingsByDay={comprehensiveStats?.global?.readings_by_day}
              isLoading={comprehensiveLoading}
            />
            <ClientTrendChart 
              clientStats={clientStatsList}
              isLoading={statsByClientLoading}
            />
          </div>

          {/* Client List with Locations and Sensors */}
          <ClientListView onClientSelect={handleClientChange} />

          {/* Device Type Breakdown */}
          {comprehensiveStats?.global?.device_breakdown && comprehensiveStats.global.device_breakdown.length > 0 && (
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary" />
                  Device Types
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {comprehensiveStats.global.device_breakdown.map((dt: any) => (
                    <div key={dt.device_type} className="p-3 rounded-lg bg-muted/30 border border-border/50">
                      <p className="text-xs text-muted-foreground capitalize truncate">
                        {dt.device_type?.replace(/_/g, ' ') || 'Unknown'}
                      </p>
                      <p className="text-xl font-bold">{formatNumber(dt.count)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* CLIENT-SPECIFIC VIEW */}
      {!isGlobalView && (
        <>
          {/* Current Sensor Stats - Thermal, AHT, Starlink Power */}
          <ComponentErrorBoundary name="ClientSensorStats">
            <ClientSensorStats clientId={actualClientId} isGlobalView={false} />
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

          {/* Sensor Data Tabs - Primary content showing each sensor type */}
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

            {/* Overview Tab - Summary stats */}
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
                <RawJsonPanel clientId={actualClientId} />
              </ComponentErrorBoundary>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

// Summary stat card component
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
