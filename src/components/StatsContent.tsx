import { useState, useMemo } from "react";
import { 
  Activity, 
  Satellite, 
  Thermometer, 
  Navigation, 
  Zap, 
  Wifi, 
  Radio,
  MapPin,
  Clock,
  Signal,
  ArrowUpDown,
  RefreshCw
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { format } from "date-fns";
import { 
  useLatestReadings,
  useClients,
  useStarlinkDevicesFromReadings,
  useStarlinkTimeseries,
  useStarlinkStats,
} from "@/hooks/aurora";
import StarlinkCharts from "@/components/StarlinkCharts";
import DeviceDetailsModal from "@/components/stats/DeviceDetailsModal";

// Custom marker icon
const createIcon = (color: string) => L.divIcon({
  className: 'custom-marker',
  html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

interface SensorReading {
  device_id: string;
  device_type: string;
  client_id?: string;
  timestamp: string;
  data?: Record<string, unknown>;
  latitude?: number;
  longitude?: number;
}

interface DeviceGroup {
  device_id: string;
  device_type: string;
  client_id: string;
  readings: SensorReading[];
  latest: SensorReading;
  location?: { lat: number; lng: number };
}

export default function StatsContent() {
  const [selectedClient, setSelectedClient] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [selectedDevice, setSelectedDevice] = useState<DeviceGroup | null>(null);
  const [deviceModalOpen, setDeviceModalOpen] = useState(false);

  // Fetch data
  const { data: readings, isLoading: readingsLoading, refetch: refetchReadings } = useLatestReadings();
  const { data: clients, isLoading: clientsLoading } = useClients();
  const { data: starlinkDevices, isLoading: starlinkLoading } = useStarlinkDevicesFromReadings();
  const { data: starlinkStats } = useStarlinkStats();
  
  // Get timeseries for starlink
  const { data: starlinkTimeseries } = useStarlinkTimeseries(24);

  // Process readings into device groups
  const deviceGroups = useMemo(() => {
    if (!readings) return [];
    
    const groups = new Map<string, DeviceGroup>();
    
    readings.forEach((reading: SensorReading) => {
      const key = `${reading.client_id || 'unknown'}:${reading.device_id}`;
      
      if (!groups.has(key)) {
        groups.set(key, {
          device_id: reading.device_id,
          device_type: reading.device_type,
          client_id: reading.client_id || 'unknown',
          readings: [],
          latest: reading,
          location: reading.latitude && reading.longitude 
            ? { lat: reading.latitude, lng: reading.longitude }
            : undefined
        });
      }
      
      const group = groups.get(key)!;
      group.readings.push(reading);
      
      // Update latest if this reading is newer
      if (new Date(reading.timestamp) > new Date(group.latest.timestamp)) {
        group.latest = reading;
      }
      
      // Update location if available
      if (reading.latitude && reading.longitude) {
        group.location = { lat: reading.latitude, lng: reading.longitude };
      }
    });
    
    return Array.from(groups.values());
  }, [readings]);

  // Filter devices by selected client
  const filteredDevices = useMemo(() => {
    if (selectedClient === "all") return deviceGroups;
    return deviceGroups.filter(d => d.client_id === selectedClient);
  }, [deviceGroups, selectedClient]);


  // Get unique device types for stats
  const deviceTypeStats = useMemo(() => {
    const stats = new Map<string, { count: number; icon: React.ReactNode; color: string }>();
    
    filteredDevices.forEach(d => {
      const type = d.device_type;
      if (!stats.has(type)) {
        stats.set(type, { 
          count: 0, 
          icon: getDeviceIcon(type),
          color: getDeviceColor(type)
        });
      }
      stats.get(type)!.count++;
    });
    
    return Array.from(stats.entries());
  }, [filteredDevices]);

  // Devices with location for map
  const devicesWithLocation = useMemo(() => {
    return filteredDevices.filter(d => d.location);
  }, [filteredDevices]);

  // Map center
  const mapCenter = useMemo(() => {
    if (devicesWithLocation.length === 0) return { lat: 0, lng: 0 };
    const lats = devicesWithLocation.map(d => d.location!.lat);
    const lngs = devicesWithLocation.map(d => d.location!.lng);
    return {
      lat: lats.reduce((a, b) => a + b, 0) / lats.length,
      lng: lngs.reduce((a, b) => a + b, 0) / lngs.length
    };
  }, [devicesWithLocation]);

  const isLoading = readingsLoading || clientsLoading || starlinkLoading;

  if (isLoading) {
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

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Device Stats</h1>
          <p className="text-muted-foreground text-sm">
            Real-time sensor measurements and device statistics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedClient} onValueChange={setSelectedClient}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select Client" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clients</SelectItem>
              {clients?.map((client: { client_id: string; name?: string }) => (
                <SelectItem key={client.client_id} value={client.client_id}>
                  {client.name || client.client_id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          
          <Button variant="outline" size="icon" onClick={() => refetchReadings()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Device Type Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {deviceTypeStats.map(([type, { count, icon, color }]) => (
          <Card key={type} className="glass-card border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${color}`}>
                  {icon}
                </div>
                <div>
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-xs text-muted-foreground capitalize">{type.replace(/_/g, ' ')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="measurements">Measurements</TabsTrigger>
          <TabsTrigger value="starlink">Starlink Details</TabsTrigger>
          <TabsTrigger value="map">Location Map</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Device List */}
            <Card className="glass-card border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Active Devices ({filteredDevices.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-80">
                  <div className="space-y-2">
                    {filteredDevices.map(device => (
                      <div 
                        key={`${device.client_id}:${device.device_id}`}
                        className="p-3 rounded-lg border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer"
                        onClick={() => {
                          setSelectedDevice(device);
                          setDeviceModalOpen(true);
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-1.5 rounded ${getDeviceColor(device.device_type)}`}>
                              {getDeviceIcon(device.device_type)}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{device.device_id}</p>
                              <p className="text-xs text-muted-foreground capitalize">
                                {device.device_type.replace(/_/g, ' ')}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant="outline" className="text-xs">
                              {device.client_id}
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(device.latest.timestamp), 'HH:mm:ss')}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Mini Map */}
            <Card className="glass-card border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Device Locations ({devicesWithLocation.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80 rounded-lg overflow-hidden">
                  {devicesWithLocation.length > 0 ? (
                    <MapContainer
                      center={[mapCenter.lat, mapCenter.lng]}
                      zoom={10}
                      className="h-full w-full"
                      scrollWheelZoom={true}
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                      />
                      {devicesWithLocation.map(device => (
                        <Marker
                          key={device.device_id}
                          position={[device.location!.lat, device.location!.lng]}
                          icon={createIcon(getMarkerColor(device.device_type))}
                        >
                          <Popup>
                            <div className="text-sm">
                              <p className="font-bold">{device.device_id}</p>
                              <p className="text-muted-foreground capitalize">{device.device_type}</p>
                              <p className="text-xs">Client: {device.client_id}</p>
                            </div>
                          </Popup>
                        </Marker>
                      ))}
                    </MapContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center bg-muted/20 rounded-lg">
                      <div className="text-center text-muted-foreground">
                        <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>No location data available</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Measurements Tab */}
        <TabsContent value="measurements" className="space-y-4">
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
        </TabsContent>

        {/* Starlink Details Tab */}
        <TabsContent value="starlink" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Starlink Device List */}
            <Card className="glass-card border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Satellite className="w-4 h-4 text-violet-400" />
                  Starlink Devices ({starlinkDevices?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <div className="space-y-2">
                    {starlinkDevices?.map(device => (
                      <div 
                        key={device.composite_key}
                        className="p-3 rounded-lg border border-border/50 hover:border-violet-500/50 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium text-sm">{device.device_id}</p>
                          <Badge variant={device.metrics.connected ? "default" : "secondary"}>
                            {device.metrics.connected ? "Connected" : "Offline"}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">Downlink:</span>
                            <span className="ml-1 font-mono">
                              {device.metrics.downlink_throughput_bps 
                                ? `${(device.metrics.downlink_throughput_bps / 1e6).toFixed(1)} Mbps`
                                : 'N/A'}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Latency:</span>
                            <span className="ml-1 font-mono">
                              {device.metrics.pop_ping_latency_ms 
                                ? `${device.metrics.pop_ping_latency_ms.toFixed(0)} ms`
                                : 'N/A'}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Power:</span>
                            <span className="ml-1 font-mono">
                              {device.metrics.power_watts 
                                ? `${device.metrics.power_watts.toFixed(0)} W`
                                : 'N/A'}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Obstruction:</span>
                            <span className="ml-1 font-mono">
                              {device.metrics.obstruction_percent !== undefined
                                ? `${device.metrics.obstruction_percent.toFixed(1)}%`
                                : 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {(!starlinkDevices || starlinkDevices.length === 0) && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Satellite className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>No Starlink devices found</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Starlink Stats */}
            <div className="lg:col-span-2 space-y-4">
              {/* Global Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StarlinkStatCard 
                  title="Downlink"
                  value={starlinkStats?.downlink_throughput_bps 
                    ? starlinkStats.downlink_throughput_bps / 1e6 
                    : undefined}
                  unit="Mbps"
                  icon={<ArrowUpDown className="w-4 h-4" />}
                />
                <StarlinkStatCard 
                  title="Latency"
                  value={starlinkStats?.pop_ping_latency_ms}
                  unit="ms"
                  icon={<Clock className="w-4 h-4" />}
                />
                <StarlinkStatCard 
                  title="SNR"
                  value={starlinkStats?.snr}
                  unit="dB"
                  icon={<Signal className="w-4 h-4" />}
                />
                <StarlinkStatCard 
                  title="Devices Online"
                  value={starlinkDevices?.filter(d => d.metrics.connected).length}
                  unit=""
                  icon={<Satellite className="w-4 h-4" />}
                />
              </div>

              {/* Performance Charts - Using StarlinkCharts component */}
              {starlinkTimeseries && starlinkTimeseries.readings.length > 0 && (
                <Card className="glass-card border-border/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">
                      Performance History
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <StarlinkCharts />
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Map Tab */}
        <TabsContent value="map">
          <Card className="glass-card border-border/50">
            <CardContent className="p-0">
              <div className="h-[600px] rounded-lg overflow-hidden">
                {devicesWithLocation.length > 0 ? (
                  <MapContainer
                    center={[mapCenter.lat, mapCenter.lng]}
                    zoom={8}
                    className="h-full w-full"
                    scrollWheelZoom={true}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                      url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    />
                    {devicesWithLocation.map(device => (
                      <Marker
                        key={device.device_id}
                        position={[device.location!.lat, device.location!.lng]}
                        icon={createIcon(getMarkerColor(device.device_type))}
                      >
                        <Popup>
                          <div className="text-sm min-w-48">
                            <p className="font-bold text-lg mb-2">{device.device_id}</p>
                            <div className="space-y-1 text-muted-foreground">
                              <p><span className="font-medium">Type:</span> {device.device_type}</p>
                              <p><span className="font-medium">Client:</span> {device.client_id}</p>
                              <p><span className="font-medium">Last seen:</span> {format(new Date(device.latest.timestamp), 'PPp')}</p>
                              <p><span className="font-medium">Location:</span> {device.location!.lat.toFixed(4)}, {device.location!.lng.toFixed(4)}</p>
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                  </MapContainer>
                ) : (
                  <div className="h-full flex items-center justify-center bg-muted/20">
                    <div className="text-center text-muted-foreground">
                      <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p className="text-lg">No devices with location data</p>
                      <p className="text-sm">Location information will appear when GPS data is available</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
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

// Helper Components

function DeviceMeasurementsCard({ device }: { device: DeviceGroup }) {
  const measurements = extractMeasurements(device.latest);
  
  return (
    <Card className="glass-card border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            {getDeviceIcon(device.device_type)}
            {device.device_id}
          </CardTitle>
          <Badge variant="outline" className="text-xs">{device.device_type}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {measurements.slice(0, 6).map(({ key, value, unit }) => (
            <div key={key} className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</span>
              <span className="font-mono">{value} {unit}</span>
            </div>
          ))}
          {measurements.length === 0 && (
            <p className="text-muted-foreground text-sm text-center py-4">No data available</p>
          )}
        </div>
        <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
          <span>{device.client_id}</span>
          <span>{format(new Date(device.latest.timestamp), 'HH:mm:ss')}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function DeviceDetailCard({ device }: { device: DeviceGroup }) {
  const measurements = extractMeasurements(device.latest);
  
  return (
    <Card className="glass-card border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${getDeviceColor(device.device_type)}`}>
              {getDeviceIcon(device.device_type)}
            </div>
            <div>
              <p className="text-xl">{device.device_id}</p>
              <p className="text-sm text-muted-foreground capitalize">{device.device_type.replace(/_/g, ' ')}</p>
            </div>
          </CardTitle>
          <div className="text-right">
            <Badge>{device.client_id}</Badge>
            <p className="text-xs text-muted-foreground mt-1">
              Last update: {format(new Date(device.latest.timestamp), 'PPp')}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {measurements.map(({ key, value, unit }) => (
            <div key={key} className="p-3 rounded-lg bg-muted/20 border border-border/50">
              <p className="text-xs text-muted-foreground capitalize mb-1">{key.replace(/_/g, ' ')}</p>
              <p className="text-lg font-mono font-bold">{value} <span className="text-sm font-normal text-muted-foreground">{unit}</span></p>
            </div>
          ))}
        </div>
        {device.location && (
          <div className="mt-4 pt-4 border-t border-border/50">
            <p className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
              <MapPin className="w-4 h-4" /> Location
            </p>
            <p className="font-mono">
              {device.location.lat.toFixed(6)}, {device.location.lng.toFixed(6)}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StarlinkStatCard({ title, value, unit, icon }: { 
  title: string; 
  value?: number | null; 
  unit: string;
  icon: React.ReactNode;
}) {
  return (
    <Card className="glass-card border-border/50">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          {icon}
          <span className="text-xs">{title}</span>
        </div>
        <p className="text-2xl font-bold font-mono">
          {value !== undefined && value !== null ? value.toFixed(1) : 'N/A'}
          <span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span>
        </p>
      </CardContent>
    </Card>
  );
}

function MetricItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-mono text-sm">{value}</p>
    </div>
  );
}

// Helper functions

function getDeviceIcon(type: string) {
  switch (type.toLowerCase()) {
    case 'starlink':
      return <Satellite className="w-4 h-4" />;
    case 'thermal_probe':
    case 'temperature':
      return <Thermometer className="w-4 h-4" />;
    case 'gps':
      return <Navigation className="w-4 h-4" />;
    case 'power':
      return <Zap className="w-4 h-4" />;
    case 'wifi':
    case 'bluetooth':
      return <Wifi className="w-4 h-4" />;
    case 'lora':
    case 'radio':
      return <Radio className="w-4 h-4" />;
    default:
      return <Activity className="w-4 h-4" />;
  }
}

function getDeviceColor(type: string): string {
  switch (type.toLowerCase()) {
    case 'starlink':
      return 'bg-violet-500/20 text-violet-400';
    case 'thermal_probe':
    case 'temperature':
      return 'bg-orange-500/20 text-orange-400';
    case 'gps':
      return 'bg-emerald-500/20 text-emerald-400';
    case 'power':
      return 'bg-yellow-500/20 text-yellow-400';
    case 'wifi':
    case 'bluetooth':
      return 'bg-blue-500/20 text-blue-400';
    case 'lora':
    case 'radio':
      return 'bg-pink-500/20 text-pink-400';
    default:
      return 'bg-cyan-500/20 text-cyan-400';
  }
}

function getMarkerColor(type: string): string {
  switch (type.toLowerCase()) {
    case 'starlink': return '#8b5cf6';
    case 'thermal_probe': case 'temperature': return '#f97316';
    case 'gps': return '#10b981';
    case 'power': return '#eab308';
    case 'wifi': case 'bluetooth': return '#3b82f6';
    case 'lora': case 'radio': return '#ec4899';
    default: return '#06b6d4';
  }
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function extractMeasurements(reading: SensorReading): { key: string; value: string; unit: string }[] {
  const measurements: { key: string; value: string; unit: string }[] = [];
  const data = reading.data || {};
  
  // Flatten nested data
  const flatData: Record<string, unknown> = {};
  
  Object.entries(data).forEach(([key, value]) => {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.entries(value as Record<string, unknown>).forEach(([subKey, subValue]) => {
        flatData[`${key}_${subKey}`] = subValue;
      });
    } else {
      flatData[key] = value;
    }
  });
  
  Object.entries(flatData).forEach(([key, value]) => {
    if (typeof value === 'number') {
      const unit = getUnit(key);
      measurements.push({ 
        key, 
        value: formatValue(value, key),
        unit 
      });
    } else if (typeof value === 'boolean') {
      measurements.push({ key, value: value ? 'Yes' : 'No', unit: '' });
    } else if (typeof value === 'string' && value.length < 20) {
      measurements.push({ key, value, unit: '' });
    }
  });
  
  return measurements;
}

function getUnit(key: string): string {
  const lower = key.toLowerCase();
  if (lower.includes('temp') || lower.includes('celsius')) return '°C';
  if (lower.includes('fahrenheit')) return '°F';
  if (lower.includes('humidity')) return '%';
  if (lower.includes('pressure')) return 'hPa';
  if (lower.includes('voltage')) return 'V';
  if (lower.includes('current')) return 'A';
  if (lower.includes('power') || lower.includes('watt')) return 'W';
  if (lower.includes('throughput') || lower.includes('bps')) return 'bps';
  if (lower.includes('latency') || lower.includes('ping')) return 'ms';
  if (lower.includes('percent') || lower.includes('obstruction')) return '%';
  if (lower.includes('snr') || lower.includes('signal')) return 'dB';
  if (lower.includes('altitude')) return 'm';
  if (lower.includes('speed')) return 'm/s';
  return '';
}

function formatValue(value: number, key: string): string {
  const lower = key.toLowerCase();
  
  // Format large numbers
  if (lower.includes('throughput') || lower.includes('bps')) {
    if (value > 1e9) return `${(value / 1e9).toFixed(2)} G`;
    if (value > 1e6) return `${(value / 1e6).toFixed(2)} M`;
    if (value > 1e3) return `${(value / 1e3).toFixed(2)} K`;
  }
  
  // Format percentages and small values
  if (Math.abs(value) < 0.01) return value.toExponential(2);
  if (Number.isInteger(value)) return value.toString();
  return value.toFixed(2);
}
