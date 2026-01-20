import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Server
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useClientsWithHostnames, useAllClientsSystemInfo } from "@/hooks/aurora";

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
  if (type.includes('thermal') || type.includes('probe')) return 'bg-chart-1/20 text-chart-1';
  if (type.includes('starlink')) return 'bg-chart-2/20 text-chart-2';
  if (type.includes('gps')) return 'bg-chart-3/20 text-chart-3';
  if (type.includes('lora')) return 'bg-chart-4/20 text-chart-4';
  if (type.includes('wifi')) return 'bg-chart-5/20 text-chart-5';
  if (type.includes('arduino')) return 'bg-primary/20 text-primary';
  return 'bg-muted text-muted-foreground';
}

export function ClientListView({ onClientSelect }: ClientListViewProps) {
  const { data: clients, isLoading: clientsLoading } = useClientsWithHostnames();
  const { data: systemInfoAll } = useAllClientsSystemInfo();

  // Enrich clients with location data from system info
  const enrichedClients = useMemo(() => {
    if (!clients || clients.length === 0) return [];

    return clients.map((client: any) => {
      const systemInfo = systemInfoAll?.clients?.[client.client_id];
      
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
      
      return {
        client_id: client.client_id,
        hostname: client.hostname || client.client_id,
        sensors: client.sensors || [],
        last_seen: client.last_seen,
        state: client.state || 'unknown',
        ip_address: ipAddress,
        location,
        systemInfo,
      };
    });
  }, [clients, systemInfoAll]);

  if (clientsLoading) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-8 text-center text-muted-foreground">
          Loading clients...
        </CardContent>
      </Card>
    );
  }

  if (!enrichedClients || enrichedClients.length === 0) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-8 text-center text-muted-foreground">
          <Server className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No Clients Found</p>
          <p className="text-sm mt-1">Clients will appear here when they connect to Aurora</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Server className="w-4 h-4 text-primary" />
          Clients ({enrichedClients.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border/50">
          {enrichedClients.map((client: any) => (
            <div
              key={client.client_id}
              onClick={() => onClientSelect(client.client_id)}
              className="p-4 hover:bg-muted/50 cursor-pointer transition-colors group"
            >
              <div className="flex items-start justify-between gap-4">
                {/* Client Info */}
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                    <Cpu className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium truncate">{client.hostname}</h3>
                      <Badge 
                        variant={client.state === 'adopted' ? 'default' : 'secondary'}
                        className="text-[10px] px-1.5 py-0 shrink-0"
                      >
                        {client.state}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {client.client_id}
                    </p>
                    
                    {/* Location */}
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      {client.location?.city || client.location?.country ? (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          <span>
                            {[client.location.city, client.location.country]
                              .filter(Boolean)
                              .join(', ')}
                          </span>
                        </div>
                      ) : client.ip_address ? (
                        <div className="flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          <span>{client.ip_address}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 opacity-50">
                          <MapPin className="w-3 h-3" />
                          <span>No location</span>
                        </div>
                      )}
                      
                      {client.last_seen && (
                        <span className="text-muted-foreground/70">
                          • {formatDistanceToNow(new Date(client.last_seen), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                    
                    {/* Sensors */}
                    {client.sensors && client.sensors.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 mt-3">
                        {client.sensors.slice(0, 6).map((sensor: string) => {
                          const SensorIcon = getSensorIcon(sensor);
                          const colorClass = getSensorColor(sensor);
                          return (
                            <Badge 
                              key={sensor} 
                              variant="outline" 
                              className={`text-[10px] px-1.5 py-0.5 ${colorClass} border-0`}
                            >
                              <SensorIcon className="w-3 h-3 mr-1" />
                              {sensor.replace(/_/g, ' ')}
                            </Badge>
                          );
                        })}
                        {client.sensors.length > 6 && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                            +{client.sensors.length - 6} more
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Arrow */}
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-2" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
