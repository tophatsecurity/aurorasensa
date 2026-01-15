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

import {
  type DeviceGroup,
  type SensorReading,
  ClientInfoCard,
  ClientLocationMap,
  SensorTabs,
  StatsLoadingSkeleton,
  RawJsonPanel,
  enrichDevicesWithLocations,
} from "@/components/stats";
import GlobalStatsCards from "@/components/stats/GlobalStatsCards";
import GlobalReadingsTrendChart from "@/components/stats/GlobalReadingsTrendChart";
import ClientTrendChart from "@/components/stats/ClientTrendChart";

// Constants
const GLOBAL_CLIENT_ID = "__global__";

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

// Helper to format large numbers
function formatNumber(num?: number): string {
  if (num === undefined || num === null) return "0";
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString();
}

export default function StatsContent() {
  const [selectedClient, setSelectedClient] = useState<string>(GLOBAL_CLIENT_ID);
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [isRetrying, setIsRetrying] = useState(false);

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
  const actualClientId = selectedClient === GLOBAL_CLIENT_ID ? "" : selectedClient;
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

  // Process client stats for display
  const clientStatsList = useMemo(() => {
    if (!statsByClient?.clients) return [];
    return statsByClient.clients.map((c: any) => ({
      client_id: c.client_id,
      hostname: c.hostname || c.client_id,
      reading_count: c.reading_count || 0,
      device_count: c.device_count || 0,
      sensor_types: c.sensor_types || [],
      last_reading: c.last_reading,
    }));
  }, [statsByClient]);

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
  const isGlobalView = selectedClient === GLOBAL_CLIENT_ID;

  const handleRefresh = async () => {
    setIsRetrying(true);
    await Promise.all([refetchSensors(), refetchClients()]);
    setIsRetrying(false);
  };

  const handleClientChange = (clientId: string) => {
    setSelectedClient(clientId);
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
          {/* Context Selector - Global or Client ID */}
          <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-1">
            <button
              onClick={() => handleClientChange(GLOBAL_CLIENT_ID)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                isGlobalView 
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Globe className="w-4 h-4" />
              Global
            </button>
            <div className="w-px h-6 bg-border" />
            <select
              value={isGlobalView ? "" : selectedClient}
              onChange={(e) => e.target.value && handleClientChange(e.target.value)}
              className={`bg-transparent border-0 text-sm font-medium focus:outline-none focus:ring-0 cursor-pointer px-2 py-1.5 rounded-md transition-colors ${
                !isGlobalView
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <option value="" disabled>Select Client</option>
              {(clients || []).map((client) => (
                <option key={client.client_id} value={client.client_id}>
                  {client.hostname || client.client_id}
                </option>
              ))}
            </select>
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

      {/* GLOBAL VIEW */}
      {isGlobalView && (
        <>
          {/* Global Stats Cards */}
          <GlobalStatsCards 
            comprehensiveStats={comprehensiveStats} 
            stats1hr={stats1hr} 
            stats24hr={stats24hr} 
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

          {/* Client Breakdown Table */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Client Breakdown (Last 24 Hours)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statsByClientLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading client stats...</div>
              ) : clientStatsList.length > 0 ? (
                <div className="space-y-2">
                  {/* Table Header */}
                  <div className="grid grid-cols-12 gap-4 px-3 py-2 text-xs font-medium text-muted-foreground border-b border-border/50">
                    <div className="col-span-4">Client</div>
                    <div className="col-span-2 text-right">Readings</div>
                    <div className="col-span-2 text-right">Devices</div>
                    <div className="col-span-2">Sensor Types</div>
                    <div className="col-span-2 text-right">Last Active</div>
                  </div>
                  
                  {/* Table Rows */}
                  {clientStatsList.map((client: any) => (
                    <div 
                      key={client.client_id}
                      onClick={() => handleClientChange(client.client_id)}
                      className="grid grid-cols-12 gap-4 px-3 py-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors border border-transparent hover:border-primary/30"
                    >
                      <div className="col-span-4 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                          <Cpu className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{client.hostname}</p>
                          <p className="text-xs text-muted-foreground truncate">{client.client_id}</p>
                        </div>
                      </div>
                      <div className="col-span-2 text-right font-mono font-semibold text-lg">
                        {formatNumber(client.reading_count)}
                      </div>
                      <div className="col-span-2 text-right font-mono">
                        {client.device_count}
                      </div>
                      <div className="col-span-2 flex flex-wrap gap-1">
                        {client.sensor_types?.slice(0, 3).map((type: string) => (
                          <Badge key={type} variant="secondary" className="text-[10px] px-1.5 py-0">
                            {type.replace(/_/g, ' ')}
                          </Badge>
                        ))}
                        {client.sensor_types?.length > 3 && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            +{client.sensor_types.length - 3}
                          </Badge>
                        )}
                      </div>
                      <div className="col-span-2 text-right text-xs text-muted-foreground">
                        {client.last_reading 
                          ? formatDistanceToNow(new Date(client.last_reading), { addSuffix: true })
                          : 'N/A'}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No client statistics available
                </div>
              )}
            </CardContent>
          </Card>

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
