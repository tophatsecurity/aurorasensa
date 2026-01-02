import { Settings, Bell, Wifi, Database, Shield, Palette, Globe, Save, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useComprehensiveStats, useClients } from "@/hooks/useAuroraApi";

const AURORA_API_URL = "http://aurora.tophatsecurity.com:9151";

const SettingsContent = () => {
  const { data: stats, isLoading: statsLoading, error: statsError } = useComprehensiveStats();
  const { data: clients, isLoading: clientsLoading } = useClients();

  const isConnected = !statsError && stats;
  const totalClients = stats?.global?.database?.total_clients ?? 0;
  const totalReadings = stats?.global?.database?.total_readings ?? 0;

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Configure your AuroraSense dashboard</p>
        </div>
        <Button className="gap-2">
          <Save className="w-4 h-4" />
          Save Changes
        </Button>
      </div>

      <div className="grid gap-6 max-w-4xl">
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
              <div className="grid grid-cols-3 gap-4">
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
              </div>
            )}
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
    </div>
  );
};

export default SettingsContent;