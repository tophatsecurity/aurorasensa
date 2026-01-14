import { 
  Radio,
  MapPin,
  Clock,
  Database,
  Globe,
  Wifi,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { formatUptime } from "./utils";
import type { ClientInfo, SystemInfo } from "./types";

interface ClientInfoCardProps {
  client: ClientInfo;
  systemInfo?: SystemInfo | null;
}

export function ClientInfoCard({ client, systemInfo }: ClientInfoCardProps) {
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

  const formatLocation = (location?: ClientInfo['location']) => {
    if (!location) return null;
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

          {/* Location */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">Location</span>
            </div>
            <div>
              <p className="text-sm font-semibold truncate">
                {formatLocation(client.location) || 'N/A'}
              </p>
              {client.location?.latitude && client.location?.longitude && (
                <p className="text-xs text-muted-foreground font-mono">
                  {client.location.latitude.toFixed(4)}, {client.location.longitude.toFixed(4)}
                </p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
