import { 
  Activity, 
  Thermometer, 
  Zap, 
  Radio,
  MapPin,
  Clock,
  Signal
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { formatUptime } from "./utils";
import type { ClientInfo, SystemInfo } from "./types";

interface ClientStatsPanelProps {
  client: ClientInfo;
  systemInfo?: SystemInfo | null;
  deviceCount: number;
  readingsCount: number;
}

export function ClientStatsPanel({ client, systemInfo, deviceCount, readingsCount }: ClientStatsPanelProps) {
  if (!client) {
    return null;
  }

  return (
    <Card className="glass-card border-primary/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <Radio className="w-5 h-5 text-primary" />
            </div>
            <div>
              <span className="text-lg">{client.hostname || client.client_id || 'Unknown'}</span>
              <p className="text-xs text-muted-foreground font-normal">{client.ip_address || 'N/A'}</p>
            </div>
          </div>
          <Badge variant={client.state === 'adopted' ? 'default' : 'secondary'}>
            {client.state || client.status || 'Unknown'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <StatMetricCard icon={Thermometer} label="Devices" value={deviceCount} />
          <StatMetricCard icon={Activity} label="Readings" value={readingsCount} />
          <StatMetricCard icon={Clock} label="Batches" value={client.batches_received ?? 0} />
          
          {systemInfo?.cpu_percent !== undefined && (
            <StatMetricCard 
              icon={Zap} 
              label="CPU" 
              value={`${systemInfo.cpu_percent.toFixed(1)}%`} 
            />
          )}
          
          {systemInfo?.memory_percent !== undefined && (
            <StatMetricCard 
              icon={Activity} 
              label="Memory" 
              value={`${systemInfo.memory_percent.toFixed(1)}%`} 
            />
          )}
          
          {systemInfo?.disk_percent !== undefined && (
            <StatMetricCard 
              icon={Signal} 
              label="Disk" 
              value={`${systemInfo.disk_percent.toFixed(1)}%`} 
            />
          )}
          
          {systemInfo?.uptime_seconds !== undefined && (
            <StatMetricCard 
              icon={Clock} 
              label="Uptime" 
              value={formatUptime(systemInfo.uptime_seconds)} 
            />
          )}
          
          {client.location && (
            <StatMetricCard 
              icon={MapPin} 
              label="Location" 
              value={client.location.city || client.location.country || 'Unknown'}
              isText
            />
          )}
          
          <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-xs">Last Seen</span>
            </div>
            <p className="text-sm font-medium">
              {client.last_seen ? (() => {
                try {
                  return format(new Date(client.last_seen), 'HH:mm:ss');
                } catch {
                  return 'N/A';
                }
              })() : 'N/A'}
            </p>
          </div>
        </div>
        
        {/* System Info Details */}
        {systemInfo && (
          <div className="mt-4 pt-4 border-t border-border/50">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {systemInfo.hostname && (
                <div>
                  <span className="text-muted-foreground">Hostname:</span>
                  <span className="ml-2 font-mono">{systemInfo.hostname}</span>
                </div>
              )}
              {systemInfo.os && (
                <div>
                  <span className="text-muted-foreground">OS:</span>
                  <span className="ml-2 font-mono">{systemInfo.os}</span>
                </div>
              )}
              {systemInfo.kernel && (
                <div>
                  <span className="text-muted-foreground">Kernel:</span>
                  <span className="ml-2 font-mono text-xs">{systemInfo.kernel}</span>
                </div>
              )}
              {systemInfo.ip_addresses && systemInfo.ip_addresses.length > 0 && (
                <div>
                  <span className="text-muted-foreground">IPs:</span>
                  <span className="ml-2 font-mono text-xs">{systemInfo.ip_addresses.slice(0, 2).join(', ')}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatMetricCard({ 
  icon: Icon, 
  label, 
  value,
  isText = false 
}: { 
  icon: React.ElementType; 
  label: string; 
  value: string | number;
  isText?: boolean;
}) {
  return (
    <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        <Icon className="w-4 h-4" />
        <span className="text-xs">{label}</span>
      </div>
      <p className={isText ? "text-sm font-medium truncate" : "text-xl font-bold"}>
        {value}
      </p>
    </div>
  );
}
