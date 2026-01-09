import { useState, useEffect } from "react";
import { Settings, Bell, Wifi, Database, Shield, Palette, Globe, Save, CheckCircle, XCircle, Loader2, Activity, Server, RefreshCw, Ruler } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useComprehensiveStats, useClients, useServiceStatus, useHealth, useSystemUptime, useSystemMemory, useSystemDisk, useSystemCpuLoad } from "@/hooks/useAuroraApi";
import { useQueryClient } from "@tanstack/react-query";

const AURORA_API_URL = "http://aurora.tophatsecurity.com:9151";

export type UnitSystem = "metric" | "imperial";

export const getUnitSystem = (): UnitSystem => {
  const stored = localStorage.getItem("unitSystem");
  return (stored === "imperial" || stored === "metric") ? stored : "imperial";
};

export const setUnitSystem = (system: UnitSystem) => {
  localStorage.setItem("unitSystem", system);
  window.dispatchEvent(new CustomEvent("unitSystemChange", { detail: system }));
};

const MONITORED_SERVICES = [
  { name: "datacollector", label: "Data Collector" },
  { name: "dataserver", label: "Data Server" },
  { name: "gpsd", label: "GPS Daemon" },
  { name: "dump1090", label: "ADS-B Receiver" },
];

const ServiceStatusCard = ({ serviceName, label }: { serviceName: string; label: string }) => {
  const { data, isLoading, error } = useServiceStatus(serviceName);
  
  const isActive = data?.active ?? false;
  const status = data?.status || (error ? "error" : "unknown");

  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
      <div className="flex items-center gap-3">
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        ) : isActive ? (
          <CheckCircle className="w-4 h-4 text-success" />
        ) : (
          <XCircle className="w-4 h-4 text-destructive" />
        )}
        <div>
          <p className="font-medium text-sm">{label}</p>
          <p className="text-xs text-muted-foreground font-mono">{serviceName}</p>
        </div>
      </div>
      <Badge 
        variant={isActive ? "default" : "destructive"} 
        className={isActive ? "bg-success/20 text-success border-success/30" : ""}
      >
        {isLoading ? "Checking..." : isActive ? "Active" : status}
      </Badge>
    </div>
  );
};

const SettingsContent = () => {
  const queryClient = useQueryClient();
  const { data: stats, isLoading: statsLoading, error: statsError } = useComprehensiveStats();
  const { data: clients, isLoading: clientsLoading } = useClients();
  const { data: health, isLoading: healthLoading } = useHealth();
  const { data: uptime } = useSystemUptime();
  const { data: memory } = useSystemMemory();
  const { data: disk } = useSystemDisk();
  const { data: cpuLoad } = useSystemCpuLoad();
  
  const [unitSystem, setUnitSystemState] = useState<UnitSystem>(getUnitSystem);

  const handleUnitSystemChange = (value: string) => {
    const newSystem = value as UnitSystem;
    setUnitSystemState(newSystem);
    setUnitSystem(newSystem);
  };

  const isConnected = !statsError && stats;
  const totalClients = stats?.global?.database?.total_clients ?? 0;
  const totalReadings = stats?.global?.database?.total_readings ?? 0;

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["aurora"] });
  };

  const formatUptime = (seconds?: number): string => {
    if (!seconds) return "Unknown";
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between p-6 border-b border-border shrink-0">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Configure your AuroraSense dashboard</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button className="gap-2">
            <Save className="w-4 h-4" />
            Save Changes
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6 max-w-4xl">
          {/* API Status Card */}
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Wifi className="w-5 h-5" />
                API Connection Status
              </CardTitle>
              <CardDescription>Current connection to Aurora API server</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  {statsLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  ) : isConnected ? (
                    <CheckCircle className="w-5 h-5 text-success" />
                  ) : (
                    <XCircle className="w-5 h-5 text-destructive" />
                  )}
                  <div>
                    <p className="font-medium">
                      {statsLoading ? "Connecting..." : isConnected ? "Connected" : "Disconnected"}
                    </p>
                    <p className="text-sm text-muted-foreground font-mono">{AURORA_API_URL}</p>
                  </div>
                </div>
                <Badge className={isConnected ? "bg-success/20 text-success border-success/30" : "bg-destructive/20 text-destructive border-destructive/30"}>
                  {isConnected ? "Online" : "Offline"}
                </Badge>
              </div>
              {isConnected && (
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center p-3 rounded-lg bg-muted/20">
                    <p className="text-lg font-bold text-primary">{totalClients}</p>
                    <p className="text-xs text-muted-foreground">Clients</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/20">
                    <p className="text-lg font-bold">{totalReadings.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Readings</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/20">
                    <p className="text-lg font-bold text-success">{stats?.global?.activity?.last_1_hour?.active_devices_1h ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Active (1h)</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/20">
                    <p className="text-lg font-bold">{formatUptime(uptime?.uptime_seconds)}</p>
                    <p className="text-xs text-muted-foreground">Uptime</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Service Status */}
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Server className="w-5 h-5" />
                Service Status
              </CardTitle>
              <CardDescription>Monitor system services via systemctl</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {MONITORED_SERVICES.map((service) => (
                <ServiceStatusCard 
                  key={service.name} 
                  serviceName={service.name} 
                  label={service.label} 
                />
              ))}
            </CardContent>
          </Card>

          {/* System Resources */}
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="w-5 h-5" />
                System Resources
              </CardTitle>
              <CardDescription>Current resource utilization</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">CPU Load</span>
                    <span className="font-medium">{cpuLoad?.load?.[0]?.toFixed(2) ?? "—"}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all"
                      style={{ width: `${Math.min((cpuLoad?.load?.[0] || 0) * 25, 100)}%` }}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Memory</span>
                    <span className="font-medium">{memory?.percent?.toFixed(1) ?? "—"}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-success transition-all"
                      style={{ width: `${memory?.percent || 0}%` }}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Disk</span>
                    <span className="font-medium">{disk?.percent?.toFixed(1) ?? "—"}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-amber-500 transition-all"
                      style={{ width: `${disk?.percent || 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Globe className="w-5 h-5" />
                API Configuration
              </CardTitle>
              <CardDescription>Configure connection to Aurora API server</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>API Endpoint</Label>
                  <Input defaultValue={AURORA_API_URL} className="mt-1 font-mono text-sm" readOnly />
                </div>
                <div>
                  <Label>API Key</Label>
                  <Input type="password" defaultValue="••••••••••••••••" className="mt-1" disabled />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Refresh Interval</Label>
                  <Select defaultValue="10">
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 seconds</SelectItem>
                      <SelectItem value="10">10 seconds</SelectItem>
                      <SelectItem value="30">30 seconds</SelectItem>
                      <SelectItem value="60">1 minute</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Timeout</Label>
                  <Select defaultValue="30">
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 seconds</SelectItem>
                      <SelectItem value="30">30 seconds</SelectItem>
                      <SelectItem value="60">60 seconds</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notifications
              </CardTitle>
              <CardDescription>Configure alert and notification preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Browser Notifications</p>
                  <p className="text-sm text-muted-foreground">Receive alerts in your browser</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Sound Alerts</p>
                  <p className="text-sm text-muted-foreground">Play sound for critical alerts</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Email Notifications</p>
                  <p className="text-sm text-muted-foreground">Send alerts to your email</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>

          {/* Unit System */}
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Ruler className="w-5 h-5" />
                Unit System
              </CardTitle>
              <CardDescription>Choose between Metric and Imperial units</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Measurement Units</p>
                  <p className="text-sm text-muted-foreground">
                    {unitSystem === "metric" 
                      ? "Celsius, meters, km/h" 
                      : "Fahrenheit, feet, mph"}
                  </p>
                </div>
                <Select value={unitSystem} onValueChange={handleUnitSystemChange}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="imperial">Imperial</SelectItem>
                    <SelectItem value="metric">Metric</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Appearance
              </CardTitle>
              <CardDescription>Customize dashboard appearance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Theme</Label>
                  <Select defaultValue="dark">
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Accent Color</Label>
                  <Select defaultValue="cyan">
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cyan">Cyan</SelectItem>
                      <SelectItem value="purple">Purple</SelectItem>
                      <SelectItem value="green">Green</SelectItem>
                      <SelectItem value="blue">Blue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Aurora Background Effect</p>
                  <p className="text-sm text-muted-foreground">Animated background gradient</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Database className="w-5 h-5" />
                Data Management
              </CardTitle>
              <CardDescription>Manage local data and cache</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Cache Size</p>
                  <p className="text-sm text-muted-foreground">Currently using 24.5 MB</p>
                </div>
                <Button variant="outline" size="sm">Clear Cache</Button>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Local Storage</p>
                  <p className="text-sm text-muted-foreground">Saved preferences and state</p>
                </div>
                <Button variant="outline" size="sm">Reset</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
};

export default SettingsContent;