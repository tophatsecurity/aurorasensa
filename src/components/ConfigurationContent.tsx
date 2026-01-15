import { useState, useEffect } from "react";
import { 
  useConfig, 
  useClients, 
  useClientConfig, 
  useAllClientConfigs, 
  useUpdateConfig, 
  useUpdateClientConfig,
  useSystemInfo,
  useHealth,
  useComprehensiveStats,
  useSystemInterfaces,
  useSystemUsb,
  ServerConfig,
  Client
} from "@/hooks/useAuroraApi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Settings, 
  Server, 
  Save, 
  RefreshCw, 
  Monitor,
  Cpu,
  Database,
  Wifi,
  Radio,
  Satellite,
  Thermometer,
  AlertCircle,
  CheckCircle2,
  Edit3,
  X,
  HardDrive,
  Clock,
  Network,
  Usb,
  Activity,
  Globe,
  XCircle,
  Eye,
  ArrowLeftRight
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatRelativeTime } from "@/utils/dateUtils";
import DeviceDetailDialog from "@/components/DeviceDetailDialog";
import DeviceComparisonDialog from "@/components/DeviceComparisonDialog";

interface ConfigEditorProps {
  config: ServerConfig;
  onSave: (config: ServerConfig) => void;
  isSaving: boolean;
  title?: string;
}

const ConfigEditor = ({ config, onSave, isSaving, title }: ConfigEditorProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedConfig, setEditedConfig] = useState<string>(JSON.stringify(config, null, 2));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEditing) {
      setEditedConfig(JSON.stringify(config, null, 2));
    }
  }, [config, isEditing]);

  const handleSave = () => {
    try {
      const parsed = JSON.parse(editedConfig);
      setError(null);
      onSave(parsed);
      setIsEditing(false);
    } catch {
      setError("Invalid JSON format");
    }
  };

  const handleCancel = () => {
    setEditedConfig(JSON.stringify(config, null, 2));
    setError(null);
    setIsEditing(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">{title || "Configuration"}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button variant="ghost" size="sm" onClick={handleCancel}>
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave} disabled={isSaving}>
                  <Save className="h-4 w-4 mr-1" />
                  {isSaving ? "Saving..." : "Save"}
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <Edit3 className="h-4 w-4 mr-1" />
                Edit
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="space-y-2">
            <Textarea
              value={editedConfig}
              onChange={(e) => setEditedConfig(e.target.value)}
              className="font-mono text-sm min-h-[300px]"
              placeholder="Enter configuration JSON..."
            />
            {error && (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}
          </div>
        ) : (
          <pre className="bg-muted p-4 rounded-lg overflow-auto max-h-[400px] text-sm font-mono">
            {JSON.stringify(config, null, 2)}
          </pre>
        )}
      </CardContent>
    </Card>
  );
};

interface SensorConfigDisplayProps {
  sensors: Record<string, unknown> | undefined;
}

const SensorConfigDisplay = ({ sensors }: SensorConfigDisplayProps) => {
  if (!sensors) return <p className="text-muted-foreground text-sm">No sensor configuration</p>;

  const getSensorIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "wifi": return <Wifi className="h-4 w-4" />;
      case "lora": return <Radio className="h-4 w-4" />;
      case "starlink": return <Satellite className="h-4 w-4" />;
      case "thermal_probe": return <Thermometer className="h-4 w-4" />;
      case "system_monitor": return <Monitor className="h-4 w-4" />;
      case "gps": return <Globe className="h-4 w-4" />;
      case "bluetooth": return <Radio className="h-4 w-4" />;
      default: return <Cpu className="h-4 w-4" />;
    }
  };

  return (
    <div className="grid gap-3">
      {Object.entries(sensors).map(([key, value]) => {
        const config = value as Record<string, unknown> | Array<Record<string, unknown>> | null;
        if (!config) return null;

        const isArray = Array.isArray(config);
        const items = isArray ? config : [config];

        return (
          <div key={key} className="border rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              {getSensorIcon(key)}
              <span className="font-medium capitalize">{key.replace(/_/g, " ")}</span>
              <Badge variant="secondary" className="ml-auto">
                {isArray ? `${items.length} devices` : "1 device"}
              </Badge>
            </div>
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="bg-muted/50 rounded p-2 text-sm">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs">{item.device_id as string || `Device ${idx + 1}`}</span>
                    {item.enabled !== undefined && (
                      <Badge variant={item.enabled ? "default" : "secondary"} className="text-xs">
                        {item.enabled ? "Enabled" : "Disabled"}
                      </Badge>
                    )}
                    {item.poll_interval && (
                      <span className="text-xs text-muted-foreground">
                        Poll: {item.poll_interval as number}s
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const ClientConfigCard = ({ client, onViewDetails }: { client: Client; onViewDetails: (client: Client) => void }) => {
  const { data: clientConfig, isLoading } = useClientConfig(client.client_id);
  const updateClientConfig = useUpdateClientConfig();

  const metadata = client.metadata as { 
    config?: { 
      project?: { name: string; version: string };
      sensors?: Record<string, unknown>;
    };
    system?: {
      cpu_percent?: number;
      memory_percent?: number;
      disk_percent?: number;
      uptime_seconds?: number;
    };
  } | undefined;

  const handleSaveConfig = (config: ServerConfig) => {
    updateClientConfig.mutate(
      { clientId: client.client_id, config },
      {
        onSuccess: () => {
          toast({
            title: "Configuration updated",
            description: `Client ${client.hostname} configuration saved successfully.`,
          });
        },
        onError: (error) => {
          toast({
            title: "Error saving configuration",
            description: error.message,
            variant: "destructive",
          });
        },
      }
    );
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  const getStatusColor = (percent: number) => {
    if (percent > 90) return "text-red-500";
    if (percent > 75) return "text-yellow-500";
    return "text-green-500";
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full animate-pulse ${client.status === "online" ? "bg-green-500" : client.status === "stale" ? "bg-yellow-500" : "bg-muted"}`} />
            <div>
              <CardTitle className="text-base">{client.hostname}</CardTitle>
              <CardDescription className="text-xs">
                {client.ip_address} • {client.mac_address}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {metadata?.config?.project && (
              <Badge variant="outline">
                {metadata.config.project.name} v{metadata.config.project.version}
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={() => onViewDetails(client)}>
              <Eye className="h-3 w-3 mr-1" />
              Details
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Connection Info */}
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Last seen: {formatRelativeTime(client.last_seen)}
          </span>
          <span className="flex items-center gap-1">
            <Database className="h-3 w-3" />
            {client.batches_received} batches
          </span>
          {metadata?.system?.uptime_seconds && (
            <span className="flex items-center gap-1">
              <Activity className="h-3 w-3" />
              Uptime: {formatUptime(metadata.system.uptime_seconds)}
            </span>
          )}
        </div>

        {/* System Stats with Progress Bars */}
        {metadata?.system && (
          <div className="space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="flex items-center gap-1">
                  <Cpu className="h-3 w-3" />
                  CPU
                </span>
                <span className={`font-mono ${getStatusColor(metadata.system.cpu_percent || 0)}`}>
                  {metadata.system.cpu_percent?.toFixed(1) || "—"}%
                </span>
              </div>
              <Progress value={metadata.system.cpu_percent || 0} className="h-2" />
            </div>
            
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="flex items-center gap-1">
                  <Monitor className="h-3 w-3" />
                  Memory
                </span>
                <span className={`font-mono ${getStatusColor(metadata.system.memory_percent || 0)}`}>
                  {metadata.system.memory_percent?.toFixed(1) || "—"}%
                </span>
              </div>
              <Progress value={metadata.system.memory_percent || 0} className="h-2" />
            </div>
            
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="flex items-center gap-1">
                  <HardDrive className="h-3 w-3" />
                  Disk
                </span>
                <span className={`font-mono ${getStatusColor(metadata.system.disk_percent || 0)}`}>
                  {metadata.system.disk_percent?.toFixed(1) || "—"}%
                </span>
              </div>
              <Progress value={metadata.system.disk_percent || 0} className="h-2" />
            </div>
          </div>
        )}

        {/* Sensor Configuration */}
        {metadata?.config?.sensors && (
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="sensors" className="border-0">
              <AccordionTrigger className="py-2 text-sm">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Sensor Configuration ({Object.keys(metadata.config.sensors).length} types)
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <SensorConfigDisplay sensors={metadata.config.sensors} />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}

        {/* Raw Config Editor */}
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="raw" className="border-0">
            <AccordionTrigger className="py-2 text-sm">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Raw Configuration
              </div>
            </AccordionTrigger>
            <AccordionContent>
              {isLoading ? (
                <Skeleton className="h-[200px] w-full" />
              ) : clientConfig ? (
                <ConfigEditor
                  config={clientConfig}
                  onSave={handleSaveConfig}
                  isSaving={updateClientConfig.isPending}
                  title="Client Config"
                />
              ) : (
                <p className="text-muted-foreground text-sm">No configuration data available</p>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
};

const formatBytes = (bytes: number) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
};

const formatUptime = (seconds: number) => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
};

const ConfigurationContent = () => {
  const [selectedDevice, setSelectedDevice] = useState<Client | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [comparisonDialogOpen, setComparisonDialogOpen] = useState(false);
  
  const { data: serverConfig, isLoading: configLoading, refetch: refetchConfig } = useConfig();
  const { data: clients = [], isLoading: clientsLoading, refetch: refetchClients } = useClients();
  const { data: systemInfo, isLoading: systemLoading } = useSystemInfo();
  const { data: health, isLoading: healthLoading } = useHealth();
  const { data: stats, isLoading: statsLoading } = useComprehensiveStats();
  const { data: interfaces } = useSystemInterfaces();
  const { data: usbDevices } = useSystemUsb();
  const updateConfig = useUpdateConfig();

  const handleViewDetails = (client: Client) => {
    setSelectedDevice(client);
    setDetailDialogOpen(true);
  };

  const handleSaveServerConfig = (config: ServerConfig) => {
    updateConfig.mutate(config, {
      onSuccess: () => {
        toast({
          title: "Server configuration updated",
          description: "Configuration saved successfully.",
        });
      },
      onError: (error) => {
        toast({
          title: "Error saving configuration",
          description: error.message,
          variant: "destructive",
        });
      },
    });
  };

  const handleRefresh = () => {
    refetchConfig();
    refetchClients();
    toast({
      title: "Refreshing configurations",
      description: "Fetching latest configuration data...",
    });
  };

  const isApiHealthy = health?.status === "ok" || health?.status === "healthy";
  const onlineClients = clients.filter(c => c.status === "online").length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-border shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Configuration</h1>
            <p className="text-muted-foreground">Manage server and device configurations</p>
          </div>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6">
          <Tabs defaultValue="server" className="space-y-6">
            <TabsList className="grid w-full max-w-lg grid-cols-3">
              <TabsTrigger value="server" className="flex items-center gap-2">
                <Server className="h-4 w-4" />
                Server
              </TabsTrigger>
              <TabsTrigger value="devices" className="flex items-center gap-2">
                <Monitor className="h-4 w-4" />
                Clients
                {clients.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {onlineClients}/{clients.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="system" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                System
              </TabsTrigger>
            </TabsList>

            {/* Server Configuration */}
            <TabsContent value="server" className="space-y-6">
              {/* Status Overview Cards */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Server className="h-4 w-4" />
                      API Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {healthLoading ? (
                      <Skeleton className="h-6 w-20" />
                    ) : (
                      <div className="flex items-center gap-2">
                        {isApiHealthy ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            <span className="text-sm font-medium text-green-600">Healthy</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-4 w-4 text-red-500" />
                            <span className="text-sm font-medium text-red-600">Unhealthy</span>
                          </>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      Total Readings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {statsLoading ? (
                      <Skeleton className="h-6 w-24" />
                    ) : (
                      <div className="text-2xl font-bold">
                        {(stats?.global?.total_readings ?? stats.global?.database?.total_readings ?? 0).toLocaleString()}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Monitor className="h-4 w-4" />
                      Active Clients
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {clientsLoading ? (
                      <Skeleton className="h-6 w-16" />
                    ) : (
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-green-600">{onlineClients}</span>
                        <span className="text-muted-foreground">/ {clients.length}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Active Alerts
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {statsLoading ? (
                      <Skeleton className="h-6 w-16" />
                    ) : (
                      <div className="text-2xl font-bold">
                        {stats?.global?.database?.active_alerts || 0}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Server Config JSON Editor */}
              {configLoading ? (
                <Skeleton className="h-[400px] w-full" />
              ) : serverConfig ? (
                <ConfigEditor
                  config={serverConfig}
                  onSave={handleSaveServerConfig}
                  isSaving={updateConfig.isPending}
                  title="Server Configuration"
                />
              ) : (
                <Card>
                  <CardContent className="py-8 text-center">
                    <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Unable to load server configuration</p>
                    <Button variant="outline" onClick={() => refetchConfig()} className="mt-4">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Retry
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Database & Activity Stats */}
              {stats && (
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Database className="h-4 w-4" />
                        Database Statistics
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total Batches</span>
                        <span className="font-mono">{(stats.global?.total_batches ?? stats.global?.database?.total_batches ?? 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total Clients</span>
                        <span className="font-mono">{stats.global?.total_clients ?? stats.global?.database?.total_clients ?? 0}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Alert Rules</span>
                        <span className="font-mono">{stats.global?.database?.total_alert_rules || 0}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Data Span</span>
                        <span className="font-mono">{stats.global?.time_ranges?.data_span_days?.toFixed(1) || 0} days</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        Activity (Last 24h)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Readings</span>
                        <span className="font-mono">{stats.global?.activity?.last_24_hours?.readings_24h?.toLocaleString() || 0}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Batches</span>
                        <span className="font-mono">{stats.global?.activity?.last_24_hours?.batches_24h?.toLocaleString() || 0}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Active Devices</span>
                        <span className="font-mono">{stats.global?.activity?.last_24_hours?.active_devices_24h || 0}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Avg Readings/Hour</span>
                        <span className="font-mono">{stats.global?.activity?.avg_readings_per_hour?.toFixed(1) || 0}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            {/* Client Configurations */}
            <TabsContent value="devices" className="space-y-6">
              {/* Client Summary */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Clients</h3>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setComparisonDialogOpen(true)}
                  disabled={clients.length < 2}
                >
                  <ArrowLeftRight className="w-4 h-4 mr-2" />
                  Compare Clients
                </Button>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-500/10 rounded-lg">
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{onlineClients}</p>
                        <p className="text-xs text-muted-foreground">Online Devices</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-yellow-500/10 rounded-lg">
                        <AlertCircle className="h-5 w-5 text-yellow-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{clients.filter(c => c.status === "stale").length}</p>
                        <p className="text-xs text-muted-foreground">Stale Devices</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-muted rounded-lg">
                        <XCircle className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{clients.filter(c => c.status === "offline").length}</p>
                        <p className="text-xs text-muted-foreground">Offline Devices</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {clientsLoading ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-[350px] w-full" />
                  ))}
                </div>
              ) : clients.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <Monitor className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No devices registered</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Devices will appear here once they connect to the server
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {clients.map((client) => (
                    <ClientConfigCard key={client.client_id} client={client} onViewDetails={handleViewDetails} />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* System Info Tab */}
            <TabsContent value="system" className="space-y-6">
              {/* System Overview */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Server className="h-4 w-4" />
                      Hostname
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {systemLoading ? (
                      <Skeleton className="h-6 w-32" />
                    ) : (
                      <p className="font-mono text-sm">{systemInfo?.hostname || "—"}</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      IP Address
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {systemLoading ? (
                      <Skeleton className="h-6 w-28" />
                    ) : (
                      <p className="font-mono text-sm">{systemInfo?.ip_address || "—"}</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Uptime
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {systemLoading ? (
                      <Skeleton className="h-6 w-24" />
                    ) : (
                      <p className="font-mono text-sm">
                        {systemInfo?.uptime_seconds ? formatUptime(systemInfo.uptime_seconds) : systemInfo?.uptime || "—"}
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Cpu className="h-4 w-4" />
                      Load Average
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {systemLoading ? (
                      <Skeleton className="h-6 w-28" />
                    ) : (
                      <p className="font-mono text-sm">
                        {systemInfo?.cpu_load?.map(l => l.toFixed(2)).join(" / ") || "—"}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Resource Usage */}
              {systemInfo && (
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Monitor className="h-4 w-4" />
                        Memory Usage
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Used</span>
                          <span className="font-mono">
                            {systemInfo.memory ? `${formatBytes(systemInfo.memory.used)} / ${formatBytes(systemInfo.memory.total)}` : "—"}
                          </span>
                        </div>
                        <Progress value={systemInfo.memory?.percent || 0} className="h-3" />
                        <p className="text-xs text-muted-foreground text-right">
                          {systemInfo.memory?.percent?.toFixed(1) || 0}% used
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <HardDrive className="h-4 w-4" />
                        Disk Usage
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Used</span>
                          <span className="font-mono">
                            {systemInfo.disk ? `${formatBytes(systemInfo.disk.used)} / ${formatBytes(systemInfo.disk.total)}` : "—"}
                          </span>
                        </div>
                        <Progress value={systemInfo.disk?.percent || 0} className="h-3" />
                        <p className="text-xs text-muted-foreground text-right">
                          {systemInfo.disk?.percent?.toFixed(1) || 0}% used
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Network Interfaces */}
              {interfaces && interfaces.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Network className="h-4 w-4" />
                      Network Interfaces
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Interface</TableHead>
                          <TableHead>IP Address</TableHead>
                          <TableHead>MAC Address</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {interfaces.map((iface, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-mono text-sm">{iface.name}</TableCell>
                            <TableCell className="font-mono text-sm">{iface.ip || "—"}</TableCell>
                            <TableCell className="font-mono text-sm text-muted-foreground">{iface.mac || "—"}</TableCell>
                            <TableCell>
                              <Badge variant={iface.status === "up" ? "default" : "secondary"}>
                                {iface.status || "unknown"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {/* USB Devices */}
              {usbDevices && usbDevices.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Usb className="h-4 w-4" />
                      USB Devices
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Device</TableHead>
                          <TableHead>Vendor</TableHead>
                          <TableHead>Product</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {usbDevices.map((device, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-mono text-sm">{device.device}</TableCell>
                            <TableCell className="text-sm">{device.vendor || "—"}</TableCell>
                            <TableCell className="text-sm">{device.product || "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
      <DeviceDetailDialog 
        client={selectedDevice} 
        open={detailDialogOpen} 
        onOpenChange={setDetailDialogOpen} 
      />
      <DeviceComparisonDialog
        open={comparisonDialogOpen}
        onOpenChange={setComparisonDialogOpen}
        initialDevice={selectedDevice}
      />
    </div>
  );
};

export default ConfigurationContent;
