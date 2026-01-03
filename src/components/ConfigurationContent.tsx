import { useState } from "react";
import { 
  useConfig, 
  useClients, 
  useClientConfig, 
  useAllClientConfigs, 
  useUpdateConfig, 
  useUpdateClientConfig,
  ServerConfig,
  Client
} from "@/hooks/useAuroraApi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Textarea } from "@/components/ui/textarea";
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
  X
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatRelativeTime } from "@/utils/dateUtils";

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
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs">{item.device_id as string || `Device ${idx + 1}`}</span>
                    {item.enabled !== undefined && (
                      <Badge variant={item.enabled ? "default" : "secondary"} className="text-xs">
                        {item.enabled ? "Enabled" : "Disabled"}
                      </Badge>
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

const ClientConfigCard = ({ client }: { client: Client }) => {
  const { data: clientConfig, isLoading } = useClientConfig(client.client_id);
  const updateClientConfig = useUpdateClientConfig();
  const [expanded, setExpanded] = useState(false);

  const metadata = client.metadata as { 
    config?: { 
      project?: { name: string; version: string };
      sensors?: Record<string, unknown>;
    };
    system?: {
      cpu_percent?: number;
      memory_percent?: number;
      disk_percent?: number;
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

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${client.status === "online" ? "bg-green-500" : "bg-muted"}`} />
            <div>
              <CardTitle className="text-base">{client.hostname}</CardTitle>
              <CardDescription className="text-xs">
                {client.ip_address} • Last seen: {formatRelativeTime(client.last_seen)}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {metadata?.config?.project && (
              <Badge variant="outline">
                v{metadata.config.project.version}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* System Stats */}
        {metadata?.system && (
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-muted/50 rounded p-2 text-center">
              <div className="text-xs text-muted-foreground">CPU</div>
              <div className="font-mono text-sm">{metadata.system.cpu_percent?.toFixed(1) || "—"}%</div>
            </div>
            <div className="bg-muted/50 rounded p-2 text-center">
              <div className="text-xs text-muted-foreground">Memory</div>
              <div className="font-mono text-sm">{metadata.system.memory_percent?.toFixed(1) || "—"}%</div>
            </div>
            <div className="bg-muted/50 rounded p-2 text-center">
              <div className="text-xs text-muted-foreground">Disk</div>
              <div className="font-mono text-sm">{metadata.system.disk_percent?.toFixed(1) || "—"}%</div>
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
                  Sensor Configuration
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

const ConfigurationContent = () => {
  const { data: serverConfig, isLoading: configLoading, refetch: refetchConfig } = useConfig();
  const { data: clients = [], isLoading: clientsLoading, refetch: refetchClients } = useClients();
  const updateConfig = useUpdateConfig();

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

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-border shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Configuration</h1>
            <p className="text-muted-foreground">Manage server and client configurations</p>
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
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="server" className="flex items-center gap-2">
                <Server className="h-4 w-4" />
                Server Config
              </TabsTrigger>
              <TabsTrigger value="clients" className="flex items-center gap-2">
                <Monitor className="h-4 w-4" />
                Client Configs
                {clients.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {clients.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Server Configuration */}
            <TabsContent value="server" className="space-y-6">
              {configLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-[400px] w-full" />
                </div>
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

              {/* Server Config Info Cards */}
              {serverConfig && (
                <div className="grid gap-4 md:grid-cols-3">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Database className="h-4 w-4" />
                        Database
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span className="text-sm">Connected</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Server className="h-4 w-4" />
                        API Server
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span className="text-sm">Running</span>
                      </div>
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
                      <div className="text-2xl font-bold">{clients.length}</div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            {/* Client Configurations */}
            <TabsContent value="clients" className="space-y-6">
              {clientsLoading ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-[300px] w-full" />
                  ))}
                </div>
              ) : clients.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <Monitor className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No clients registered</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Clients will appear here once they connect to the server
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {clients.map((client) => (
                    <ClientConfigCard key={client.client_id} client={client} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </div>
  );
};

export default ConfigurationContent;
