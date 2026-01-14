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
  Cpu,
  Router,
  HelpCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDistanceToNow } from "date-fns";
import { formatUptime } from "./utils";
import type { ClientInfo, SystemInfo, DeviceGroup } from "./types";

interface ClientInfoCardProps {
  client: ClientInfo;
  systemInfo?: SystemInfo | null;
  devices?: DeviceGroup[];
}

type LocationSource = 'starlink' | 'gps' | 'arduino' | 'client' | 'unknown';

interface ResolvedLocation {
  city?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  source: LocationSource;
  deviceId?: string;
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

  // Resolve location with priority: Starlink > GPS > Arduino > Client
  const resolveLocation = (): ResolvedLocation => {
    // Priority 1: Starlink device location
    const starlinkDevice = devices.find(d => 
      d.device_type?.toLowerCase().includes('starlink') && 
      d.location?.lat && d.location?.lng
    );
    if (starlinkDevice?.location) {
      const data = starlinkDevice.latest?.data as Record<string, unknown> | undefined;
      return {
        latitude: starlinkDevice.location.lat,
        longitude: starlinkDevice.location.lng,
        city: data?.city as string | undefined,
        country: data?.country as string | undefined,
        source: 'starlink',
        deviceId: starlinkDevice.device_id,
      };
    }

    // Priority 2: GPS device
    const gpsDevice = devices.find(d => 
      d.device_type?.toLowerCase().includes('gps') && 
      d.location?.lat && d.location?.lng
    );
    if (gpsDevice?.location) {
      return {
        latitude: gpsDevice.location.lat,
        longitude: gpsDevice.location.lng,
        source: 'gps',
        deviceId: gpsDevice.device_id,
      };
    }

    // Priority 3: Arduino/Probe with location
    const arduinoDevice = devices.find(d => 
      (d.device_type?.toLowerCase().includes('arduino') || 
       d.device_type?.toLowerCase().includes('probe')) && 
      d.location?.lat && d.location?.lng
    );
    if (arduinoDevice?.location) {
      return {
        latitude: arduinoDevice.location.lat,
        longitude: arduinoDevice.location.lng,
        source: 'arduino',
        deviceId: arduinoDevice.device_id,
      };
    }

    // Priority 4: Any device with location
    const anyDeviceWithLocation = devices.find(d => d.location?.lat && d.location?.lng);
    if (anyDeviceWithLocation?.location) {
      return {
        latitude: anyDeviceWithLocation.location.lat,
        longitude: anyDeviceWithLocation.location.lng,
        source: 'unknown',
        deviceId: anyDeviceWithLocation.device_id,
      };
    }

    // Priority 5: Client's stored location
    if (client.location?.latitude && client.location?.longitude) {
      return {
        ...client.location,
        source: 'client',
      };
    }

    return { source: 'unknown' };
  };

  const location = resolveLocation();

  const getSourceIcon = (source: LocationSource) => {
    switch (source) {
      case 'starlink': return <Satellite className="w-3 h-3" />;
      case 'gps': return <MapPin className="w-3 h-3" />;
      case 'arduino': return <Cpu className="w-3 h-3" />;
      case 'client': return <Router className="w-3 h-3" />;
      default: return <HelpCircle className="w-3 h-3" />;
    }
  };

  const getSourceLabel = (source: LocationSource) => {
    switch (source) {
      case 'starlink': return 'Starlink Dish';
      case 'gps': return 'GPS Device';
      case 'arduino': return 'Arduino/Probe';
      case 'client': return 'Client Registration';
      default: return 'Unknown';
    }
  };

  const getSourceColor = (source: LocationSource) => {
    switch (source) {
      case 'starlink': return 'text-blue-400';
      case 'gps': return 'text-green-400';
      case 'arduino': return 'text-amber-400';
      case 'client': return 'text-purple-400';
      default: return 'text-muted-foreground';
    }
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

          {/* Hostname */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Globe className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">Hostname</span>
            </div>
            <p className="font-mono text-sm font-semibold truncate" title={client.hostname}>
              {client.hostname || systemInfo?.hostname || 'N/A'}
            </p>
          </div>

          {/* IP Address */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Wifi className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">IP Address</span>
            </div>
            <p className="font-mono text-sm font-semibold truncate">
              {client.ip_address || 
                (systemInfo?.ip_addresses && systemInfo.ip_addresses[0]) || 
                'N/A'}
            </p>
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
