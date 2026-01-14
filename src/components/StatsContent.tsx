import { useState, useMemo, useEffect } from "react";
import { RefreshCw, Code2, Copy, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, ApiErrorBanner } from "@/components/ui/api-error";
import { ComponentErrorBoundary } from "@/components/ui/error-boundary";
import "leaflet/dist/leaflet.css";
import { 
  useLatestReadings,
  useClientsWithHostnames,
  useClient,
  useClientSystemInfo,
  useStarlinkDevicesFromReadings,
} from "@/hooks/aurora";

// Import refactored components
import {
  type DeviceGroup,
  type SensorReading,
  processReadingsToGroups,
  ClientInfoCard,
  MeasurementsSection,
  ClientLocationMap,
  DeviceListCard,
  DeviceMeasurementsCard,
  DeviceLocationMap as DeviceMapLegacy,
  StarlinkTab,
  ArduinoTab,
  DeviceDetailsModal,
} from "@/components/stats";

export default function StatsContent() {
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [selectedDevice, setSelectedDevice] = useState<DeviceGroup | null>(null);
  const [deviceModalOpen, setDeviceModalOpen] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  // Fetch data with error tracking
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
  
  const { 
    isLoading: starlinkLoading,
    error: starlinkError,
    refetch: refetchStarlink
  } = useStarlinkDevicesFromReadings();
  
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
    if (starlinkError) errors.push({ endpoint: "/starlink", message: starlinkError.message || "Failed to load starlink data" });
    return errors;
  }, [readingsError, clientsError, starlinkError]);

  const isLoading = readingsLoading || clientsLoading || starlinkLoading;
  const hasData = (readings && readings.length > 0) || (clients && clients.length > 0);
  const hasCriticalError = apiErrors.length > 0 && !hasData && !isLoading;

  const handleDeviceSelect = (device: DeviceGroup) => {
    setSelectedDevice(device);
    setDeviceModalOpen(true);
  };

  const handleRefresh = async () => {
    setIsRetrying(true);
    await Promise.all([
      refetchReadings(),
      refetchClients(),
      refetchStarlink(),
    ]);
    setIsRetrying(false);
  };

  if (isLoading) {
    return <StatsLoadingSkeleton />;
  }

  // Show full error page if no data at all
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

      {/* Top Card: Client Info */}
      {selectedClient && selectedClientData && (
        <ComponentErrorBoundary name="ClientInfoCard">
          <ClientInfoCard 
            client={selectedClientData as any} 
            systemInfo={selectedClientSystemInfo}
            devices={filteredDevices}
          />
        </ComponentErrorBoundary>
      )}

      {/* Second Row: Measurements by Category */}
      <ComponentErrorBoundary name="MeasurementsSection">
        <MeasurementsSection devices={filteredDevices} />
      </ComponentErrorBoundary>

      {/* Bottom Card: Location Map */}
      {selectedClient && (
        <ComponentErrorBoundary name="ClientLocationMap">
          <ClientLocationMap 
            client={selectedClientData as any} 
            devices={filteredDevices}
          />
        </ComponentErrorBoundary>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="measurements">Measurements</TabsTrigger>
          <TabsTrigger value="starlink">Starlink</TabsTrigger>
          <TabsTrigger value="arduino">Arduino</TabsTrigger>
          <TabsTrigger value="map">Location Map</TabsTrigger>
          <TabsTrigger value="raw">Raw JSON</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ComponentErrorBoundary name="DeviceListCard">
              <DeviceListCard 
                devices={filteredDevices} 
                onDeviceSelect={handleDeviceSelect} 
              />
            </ComponentErrorBoundary>
            <ComponentErrorBoundary name="DeviceLocationMap">
              <DeviceMapLegacy devices={filteredDevices} />
            </ComponentErrorBoundary>
          </div>
        </TabsContent>

        {/* Measurements Tab */}
        <TabsContent value="measurements" className="space-y-4">
          <ComponentErrorBoundary name="DeviceMeasurements">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDevices.slice(0, 12).map(device => (
                <DeviceMeasurementsCard key={device.device_id} device={device} />
              ))}
            </div>
            {filteredDevices.length === 0 && (
              <Card className="glass-card border-border/50 p-8 text-center">
                <p className="text-muted-foreground">No devices found for selected client</p>
              </Card>
            )}
          </ComponentErrorBoundary>
        </TabsContent>

        {/* Starlink Tab */}
        <TabsContent value="starlink" className="space-y-4">
          <ComponentErrorBoundary name="StarlinkTab">
            <StarlinkTab />
          </ComponentErrorBoundary>
        </TabsContent>

        {/* Arduino Tab */}
        <TabsContent value="arduino" className="space-y-4">
          <ComponentErrorBoundary name="ArduinoTab">
            <ArduinoTab />
          </ComponentErrorBoundary>
        </TabsContent>

        {/* Map Tab */}
        <TabsContent value="map">
          <Card className="glass-card border-border/50">
            <CardContent className="p-0">
              <ComponentErrorBoundary name="DeviceLocationMap">
                <DeviceMapLegacy 
                  devices={filteredDevices} 
                  height="h-[600px]" 
                  showHeader={false}
                  zoom={8}
                />
              </ComponentErrorBoundary>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Raw JSON Tab */}
        <TabsContent value="raw" className="space-y-4">
          <ComponentErrorBoundary name="RawJsonTab">
            <RawJsonPanel readings={readings || []} clientId={selectedClient} />
          </ComponentErrorBoundary>
        </TabsContent>
      </Tabs>

      {/* Device Details Modal */}
      <DeviceDetailsModal
        device={selectedDevice}
        open={deviceModalOpen}
        onOpenChange={setDeviceModalOpen}
      />
    </div>
  );
}

// =============================================
// HEADER COMPONENT
// =============================================

interface StatsHeaderProps {
  clients: Array<{ client_id: string; hostname?: string; name?: string }>;
  selectedClient: string;
  onClientChange: (clientId: string) => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

function StatsHeader({ clients, selectedClient, onClientChange, onRefresh, isRefreshing }: StatsHeaderProps) {
  return (
    <div className="flex justify-between items-center">
      <div>
        <h1 className="text-2xl font-bold">Client Stats</h1>
        <p className="text-muted-foreground text-sm">
          Real-time sensor measurements and client statistics
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Select value={selectedClient} onValueChange={onClientChange}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select Client" />
          </SelectTrigger>
          <SelectContent>
            {clients.map((client) => (
              <SelectItem key={client.client_id} value={client.client_id}>
                {client.hostname || client.name || client.client_id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Button variant="outline" size="icon" onClick={onRefresh} disabled={isRefreshing}>
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>
    </div>
  );
}

// =============================================
// LOADING SKELETON
// =============================================

function StatsLoadingSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-64" />
      </div>
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-96" />
    </div>
  );
}

// =============================================
// RAW JSON PANEL
// =============================================

interface RawJsonPanelProps {
  readings: unknown[];
  clientId: string;
}

function RawJsonPanel({ readings, clientId }: RawJsonPanelProps) {
  const [copied, setCopied] = useState(false);

  // Get latest readings for the selected client
  const latestBatch = useMemo(() => {
    if (!readings || readings.length === 0) return null;
    
    const clientReadings = clientId 
      ? readings.filter((r: any) => r.client_id === clientId)
      : readings;
    
    // Group by timestamp to find the latest batch
    const sorted = [...clientReadings].sort((a: any, b: any) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    // Get the most recent readings (batch)
    return sorted.slice(0, 50);
  }, [readings, clientId]);

  const jsonString = useMemo(() => {
    return JSON.stringify(latestBatch, null, 2);
  }, [latestBatch]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (!latestBatch || latestBatch.length === 0) {
    return (
      <Card className="glass-card border-border/50">
        <CardContent className="p-8 text-center">
          <Code2 className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">No batch data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-primary" />
            <span>Latest Batch - Raw JSON</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-normal text-muted-foreground">
              {latestBatch.length} readings
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleCopy}
              className="h-7 px-2"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 mr-1" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 mr-1" />
                  Copy
                </>
              )}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3">
        <ScrollArea className="h-[500px] rounded-lg border border-border/50 bg-muted/20">
          <pre className="p-4 text-xs font-mono text-foreground/90 whitespace-pre-wrap break-all">
            {jsonString}
          </pre>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
