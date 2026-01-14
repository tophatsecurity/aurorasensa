import { 
  Radio,
  MapPin,
  Clock,
  Database,
  Globe,
  Wifi,
  CheckCircle2,
  AlertCircle,
  Satellite,
  Navigation,
  HelpCircle,
  Cpu,
  Plane,
  Thermometer,
  Bluetooth,
  Monitor,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDistanceToNow } from "date-fns";
import { formatUptime } from "./utils";
import type { ClientInfo, SystemInfo, DeviceGroup } from "./types";
import { 
  resolveClientLocation, 
  getSourceLabel, 
  getSourceColor,
  type LocationSource,
  type ResolvedLocation,
} from "./locationResolver";

interface ClientInfoCardProps {
  client: ClientInfo;
  systemInfo?: SystemInfo | null;
  devices?: DeviceGroup[];
}

export function ClientInfoCard({ client, systemInfo, devices = [] }: ClientInfoCardProps) {
  if (!client) return null;

  const getStatusColor = (state?: string) => {
    switch (state?.toLowerCase()) {
      case 'adopted': return 'bg-success/20 text-success border-success/30';
      case 'registered': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'pending': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'disabled': return 'bg-destructive/20 text-destructive border-destructive/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusIcon = (state?: string) => {
    switch (state?.toLowerCase()) {
      case 'adopted': return <CheckCircle2 className="w-3 h-3" />;
      case 'disabled': return <AlertCircle className="w-3 h-3" />;
      default: return null;
    }
  };

  // Use the location resolver to get best location from all sensors
  const location = resolveClientLocation(client, devices);

  const getSourceIcon = (source: LocationSource) => {
    const iconMap: Record<LocationSource, LucideIcon> = {
      starlink: Satellite,
      gps: Navigation,
      lora: Radio,
      arduino: Cpu,
      adsb: Plane,
      thermal: Thermometer,
      system: Monitor,
      wifi: Wifi,
      bluetooth: Bluetooth,
      geolocated: Globe,
      unknown: HelpCircle,
    };
    const Icon = iconMap[source] || HelpCircle;
    return <Icon className="w-3 h-3" />;
  };

  const formatLocationDisplay = () => {
    const parts = [];
    if (location.city) parts.push(location.city);
    if (location.country) parts.push(location.country);
    return parts.join(', ') || null;
  };

  const lastSeen = client.last_seen 
    ? (() => {
        try {
          const date = new Date(client.last_seen);
          if (isNaN(date.getTime())) return null;
          return formatDistanceToNow(date, { addSuffix: true });
        } catch {
          return null;
        }
      })()
    : null;

  return (
    <Card className="glass-card border-primary/30">
      <CardContent className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {/* Client ID */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Radio className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">Client ID</span>
            </div>
            <p className="font-mono text-sm font-semibold truncate" title={client.client_id}>
              {client.client_id || 'Unknown'}
            </p>
          </div>

          {/* Hostname - prioritize SystemInfo */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Globe className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">Hostname</span>
            </div>
            <p className="font-mono text-sm font-semibold truncate" title={systemInfo?.hostname || client.hostname}>
              {systemInfo?.hostname || client.hostname || 'N/A'}
            </p>
            {systemInfo?.hostname && (
              <p className="text-[10px] text-muted-foreground">via System Info</p>
            )}
          </div>

          {/* IP Address - prioritize SystemInfo */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Wifi className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">IP Address</span>
            </div>
            <p className="font-mono text-sm font-semibold truncate" title={systemInfo?.ip_addresses?.[0] || client.ip_address}>
              {(systemInfo?.ip_addresses && systemInfo.ip_addresses[0]) || 
                client.ip_address || 
                'N/A'}
            </p>
            {systemInfo?.ip_addresses && systemInfo.ip_addresses.length > 0 && (
              <p className="text-[10px] text-muted-foreground">via System Info</p>
            )}
          </div>

          {/* Status */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">Status</span>
            </div>
            <Badge variant="outline" className={`${getStatusColor(client.state)} capitalize`}>
              {getStatusIcon(client.state)}
              <span className="ml-1">{client.state || client.status || 'Unknown'}</span>
            </Badge>
          </div>

          {/* Uptime */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">Uptime</span>
            </div>
            <p className="text-sm font-semibold">
              {systemInfo?.uptime_seconds 
                ? formatUptime(systemInfo.uptime_seconds)
                : lastSeen || 'N/A'}
            </p>
          </div>

          {/* Batches */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Database className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">Batches</span>
            </div>
            <p className="text-xl font-bold text-primary">
              {client.batches_received ?? 0}
            </p>
          </div>

          {/* Location with source */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">Location</span>
            </div>
            <div>
              {location.latitude && location.longitude ? (
                <>
                  <p className="text-sm font-semibold truncate">
                    {formatLocationDisplay() || 'Coordinates only'}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                  </p>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className={`flex items-center gap-1 mt-1 text-xs ${getSourceColor(location.source)}`}>
                          {getSourceIcon(location.source)}
                          <span className="capitalize">{getSourceLabel(location.source)}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Location sourced from: {getSourceLabel(location.source)}</p>
                        {location.deviceId && (
                          <p className="text-xs text-muted-foreground">Device: {location.deviceId}</p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">N/A</p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
