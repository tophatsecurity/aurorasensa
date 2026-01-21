import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, 
  Cpu, 
  Thermometer, 
  Radio, 
  Satellite, 
  Wifi, 
  Navigation, 
  Activity,
  ChevronRight,
  Globe,
  Server,
  Database,
  Clock,
  Signal
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useClientsWithHostnames, useAllClientsSystemInfo, useStatsByClient, useAllClientsLatestBatch } from "@/hooks/aurora";

interface ClientListViewProps {
  onClientSelect: (clientId: string) => void;
}

// Get icon for sensor type
function getSensorIcon(sensorType: string) {
  const type = sensorType.toLowerCase();
  if (type.includes('thermal') || type.includes('probe')) return Thermometer;
  if (type.includes('starlink')) return Satellite;
  if (type.includes('gps')) return Navigation;
  if (type.includes('lora')) return Radio;
  if (type.includes('wifi')) return Wifi;
  if (type.includes('arduino')) return Cpu;
  return Activity;
}

// Get color for sensor type
function getSensorColor(sensorType: string): string {
  const type = sensorType.toLowerCase();
  if (type.includes('thermal') || type.includes('probe')) return 'bg-rose-500/15 text-rose-400 border-rose-500/20';
  if (type.includes('starlink')) return 'bg-violet-500/15 text-violet-400 border-violet-500/20';
  if (type.includes('gps')) return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20';
  if (type.includes('lora')) return 'bg-amber-500/15 text-amber-400 border-amber-500/20';
  if (type.includes('wifi')) return 'bg-sky-500/15 text-sky-400 border-sky-500/20';
  if (type.includes('arduino')) return 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20';
  return 'bg-muted/50 text-muted-foreground border-border/50';
}

// Get state badge styling
function getStateBadge(state: string) {
  switch (state) {
    case 'adopted':
      return { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30', dot: 'bg-emerald-400' };
    case 'registered':
      return { bg: 'bg-sky-500/15', text: 'text-sky-400', border: 'border-sky-500/30', dot: 'bg-sky-400' };
    case 'pending':
      return { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30', dot: 'bg-amber-400' };
    case 'disabled':
      return { bg: 'bg-zinc-500/15', text: 'text-zinc-400', border: 'border-zinc-500/30', dot: 'bg-zinc-400' };
    default:
      return { bg: 'bg-muted/50', text: 'text-muted-foreground', border: 'border-border/50', dot: 'bg-muted-foreground' };
  }
}

export function ClientListView({ onClientSelect }: ClientListViewProps) {
  const { data: clients, isLoading: clientsLoading } = useClientsWithHostnames();
  const { data: systemInfoAll } = useAllClientsSystemInfo();
  const { data: statsByClient } = useStatsByClient({ hours: 24 });
  
  // Get client IDs for batch fetching
  const clientIds = useMemo(() => {
    if (!clients || clients.length === 0) return [];
    return clients.map((c: any) => c.client_id).filter(Boolean);
  }, [clients]);
  
  // Fetch latest batches for all clients to get real hostnames
  const { data: batchHostnames } = useAllClientsLatestBatch(clientIds);

  // Enrich clients with location data and reading counts
  const enrichedClients = useMemo(() => {
    if (!clients || clients.length === 0) return [];

    // Build a map of client stats for quick lookup
    const statsMap = new Map<string, { reading_count: number }>();
    if (statsByClient?.clients) {
      statsByClient.clients.forEach((c: any) => {
        statsMap.set(c.client_id, { reading_count: c.reading_count || 0 });
      });
    }

    return clients.map((client: any) => {
      const systemInfo = systemInfoAll?.clients?.[client.client_id];
      const clientStats = statsMap.get(client.client_id);
      const batchInfo = batchHostnames?.[client.client_id];
      
      // Try to get location from various sources
      let location: { city?: string; country?: string; lat?: number; lng?: number } | null = null;
      
      // Check client.location
      if (client.location?.latitude && client.location?.longitude) {
        location = {
          lat: client.location.latitude,
          lng: client.location.longitude,
          city: client.location.city,
          country: client.location.country,
        };
      }
      
      // Check systemInfo for IP info
      const ipAddress = systemInfo?.ip || client.ip_address;
      
      // Get display hostname - priority: batch data > client data > systemInfo > fallback
      const actualHostname = batchInfo?.hostname 
        || (client.hostname && client.hostname !== client.client_id ? client.hostname : null)
        || systemInfo?.hostname 
        || null;
      
      // Get hardware model from batch data
      const hardwareModel = batchInfo?.model || batchInfo?.platform || systemInfo?.platform || null;
      
      return {
        client_id: client.client_id,
        hostname: actualHostname,
        displayName: actualHostname || `Client ${client.client_id.replace('client_', '').slice(0, 8)}`,
        hardwareModel,
        sensors: client.sensors || [],
        last_seen: client.last_seen,
        state: client.state || 'unknown',
        ip_address: ipAddress,
        location,
        systemInfo,
        reading_count: clientStats?.reading_count || client.batches_received || client.batch_count || 0,
      };
    });
  }, [clients, systemInfoAll, statsByClient, batchHostnames]);

  if (clientsLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="border-border/50 animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-muted" />
                <div className="flex-1 space-y-3">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                  <div className="h-3 bg-muted rounded w-2/3" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!enrichedClients || enrichedClients.length === 0) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardContent className="p-12 text-center">
          <div className="w-20 h-20 rounded-3xl bg-muted/50 flex items-center justify-center mx-auto mb-6">
            <Server className="w-10 h-10 text-muted-foreground/50" />
          </div>
          <p className="text-xl font-semibold text-foreground mb-2">No Clients Found</p>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Clients will appear here when they connect to Aurora and start sending data
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Server className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Connected Clients</h2>
            <p className="text-sm text-muted-foreground">{enrichedClients.length} client{enrichedClients.length !== 1 ? 's' : ''} available</p>
          </div>
        </div>
        <Badge variant="outline" className="text-xs px-3 py-1.5 bg-primary/5 border-primary/20 text-primary">
          <Signal className="w-3 h-3 mr-1.5" />
          Live
        </Badge>
      </div>

      {/* Client Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {enrichedClients.map((client: any) => {
          const stateStyle = getStateBadge(client.state);
          
          return (
            <Card
              key={client.client_id}
              onClick={() => onClientSelect(client.client_id)}
              className="group border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card/80 hover:border-primary/30 cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-primary/5"
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border border-cyan-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-300">
                    <Cpu className="w-7 h-7 text-cyan-400" />
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-medium mb-0.5">Hostname</p>
                        <h3 className="font-semibold text-foreground truncate text-base group-hover:text-primary transition-colors">
                          {client.hostname || client.displayName}
                        </h3>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 mt-3" />
                    </div>
                    
                    {/* Hardware Model */}
                    <p className="text-xs text-muted-foreground truncate mb-3">
                      {client.hardwareModel || client.systemInfo?.platform || client.client_id}
                    </p>
                    
                    {/* Stats Row */}
                    <div className="flex items-center gap-4 text-xs mb-3">
                      {/* Reading Count */}
                      <div className="flex items-center gap-1.5 text-primary">
                        <Database className="w-3.5 h-3.5" />
                        <span className="font-semibold">{client.reading_count.toLocaleString()}</span>
                      </div>
                      
                      {/* Location or IP */}
                      {client.location?.city || client.location?.country ? (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <MapPin className="w-3.5 h-3.5" />
                          <span className="truncate">
                            {[client.location.city, client.location.country].filter(Boolean).join(', ')}
                          </span>
                        </div>
                      ) : client.ip_address ? (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Globe className="w-3.5 h-3.5" />
                          <span>{client.ip_address}</span>
                        </div>
                      ) : null}
                    </div>
                    
                    {/* Footer Row - State & Last Seen */}
                    <div className="flex items-center justify-between gap-2">
                      {/* State Badge */}
                      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-medium uppercase tracking-wide ${stateStyle.bg} ${stateStyle.text} border ${stateStyle.border}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${stateStyle.dot}`} />
                        {client.state}
                      </div>
                      
                      {/* Last Seen */}
                      {client.last_seen && !isNaN(new Date(client.last_seen).getTime()) && (
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground/70">
                          <Clock className="w-3 h-3" />
                          <span>{formatDistanceToNow(new Date(client.last_seen), { addSuffix: true })}</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Sensors */}
                    {client.sensors && client.sensors.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-3 border-t border-border/50">
                        {client.sensors.slice(0, 4).map((sensor: string) => {
                          const SensorIcon = getSensorIcon(sensor);
                          const colorClass = getSensorColor(sensor);
                          return (
                            <div 
                              key={sensor} 
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border ${colorClass}`}
                            >
                              <SensorIcon className="w-3 h-3" />
                              <span className="truncate max-w-[60px]">{sensor.replace(/_/g, ' ')}</span>
                            </div>
                          );
                        })}
                        {client.sensors.length > 4 && (
                          <div className="text-[10px] text-muted-foreground px-1.5">
                            +{client.sensors.length - 4}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
