import { useState } from "react";
import { 
  Cpu, 
  Wifi, 
  Radio, 
  Plane, 
  Navigation, 
  RefreshCw, 
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Server,
  HardDrive,
  Clock
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useClients, useAdsbAircraft, Client } from "@/hooks/useAuroraApi";
import { useQueryClient } from "@tanstack/react-query";

type DeviceType = 'all' | 'client' | 'adsb';

interface DeviceCardProps {
  name: string;
  type: string;
  status: string;
  lastSeen?: string;
  icon: React.ReactNode;
  details?: Record<string, string | number>;
}

const DeviceCard = ({ name, type, status, lastSeen, icon, details }: DeviceCardProps) => {
  const getStatusIcon = () => {
    switch (status.toLowerCase()) {
      case 'online':
      case 'active':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'offline':
        return <XCircle className="w-4 h-4 text-destructive" />;
      default:
        return <AlertCircle className="w-4 h-4 text-warning" />;
    }
  };

  const getStatusColor = () => {
    switch (status.toLowerCase()) {
      case 'online':
      case 'active':
        return 'bg-success/20 text-success border-success/30';
      case 'offline':
        return 'bg-destructive/20 text-destructive border-destructive/30';
      default:
        return 'bg-warning/20 text-warning border-warning/30';
    }
  };

  return (
    <div className="glass-card rounded-xl p-5 border border-border/50 hover:border-primary/30 transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            {icon}
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{name}</h3>
            <p className="text-xs text-muted-foreground capitalize">{type}</p>
          </div>
        </div>
        <Badge className={getStatusColor()}>
          {getStatusIcon()}
          <span className="ml-1 capitalize">{status}</span>
        </Badge>
      </div>

      {details && (
        <div className="space-y-2 mt-4 pt-4 border-t border-border/30">
          {Object.entries(details).map(([key, value]) => (
            <div key={key} className="flex justify-between text-sm">
              <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</span>
              <span className="font-medium">{value}</span>
            </div>
          ))}
        </div>
      )}

      {lastSeen && (
        <p className="text-xs text-muted-foreground mt-4 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Last seen: {lastSeen}
        </p>
      )}
    </div>
  );
};

const formatLastSeen = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
};

const getClientStatus = (lastSeen: string) => {
  const date = new Date(lastSeen);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 5) return 'online';
  if (diffMins < 60) return 'stale';
  return 'offline';
};

const DevicesContent = () => {
  const [filter, setFilter] = useState<DeviceType>('all');
  const { data: clients, isLoading: clientsLoading } = useClients();
  const { data: aircraft, isLoading: aircraftLoading } = useAdsbAircraft();
  const queryClient = useQueryClient();

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["aurora"] });
  };

  const isLoading = clientsLoading || aircraftLoading;

  // Transform data into devices
  const devices: DeviceCardProps[] = [];

  // Add clients as devices
  clients?.forEach((client: Client) => {
    const status = getClientStatus(client.last_seen);
    const system = client.metadata?.system;
    
    devices.push({
      name: client.hostname || client.client_id,
      type: 'client',
      status,
      lastSeen: formatLastSeen(client.last_seen),
      icon: <Server className="w-6 h-6 text-cyan-400" />,
      details: {
        'IP': client.ip_address,
        'MAC': client.mac_address,
        'Batches': client.batches_received.toLocaleString(),
        ...(system?.cpu_percent !== undefined && { 'CPU': `${system.cpu_percent.toFixed(1)}%` }),
        ...(system?.memory_percent !== undefined && { 'Memory': `${system.memory_percent.toFixed(1)}%` }),
      },
    });
  });

  // Add aircraft as devices
  aircraft?.forEach((ac) => {
    devices.push({
      name: ac.flight?.trim() || ac.hex,
      type: 'adsb',
      status: (ac.seen ?? 0) < 60 ? 'online' : 'stale',
      icon: <Plane className="w-6 h-6 text-violet-400" />,
      details: {
        'Hex': ac.hex,
        'Altitude': ac.alt_baro ? `${ac.alt_baro.toLocaleString()} ft` : '—',
        'Speed': ac.gs ? `${ac.gs.toFixed(0)} kts` : '—',
        'RSSI': ac.rssi ? `${ac.rssi.toFixed(1)} dBm` : '—',
      },
    });
  });

  // Filter devices
  const filteredDevices = filter === 'all' 
    ? devices 
    : devices.filter(d => d.type.toLowerCase() === filter);

  // Device counts
  const counts = {
    all: devices.length,
    client: devices.filter(d => d.type === 'client').length,
    adsb: devices.filter(d => d.type === 'adsb').length,
  };

  const filterButtons: { id: DeviceType; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: `All (${counts.all})`, icon: <HardDrive className="w-3 h-3" /> },
    { id: 'client', label: `Clients (${counts.client})`, icon: <Server className="w-3 h-3" /> },
    { id: 'adsb', label: `ADS-B (${counts.adsb})`, icon: <Plane className="w-3 h-3" /> },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold text-foreground">Devices</h1>
          <Badge className="bg-primary/20 text-primary border-primary/30 px-3 py-1">
            {devices.length} Connected
          </Badge>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2"
          onClick={handleRefresh}
          disabled={isLoading}
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {filterButtons.map((btn) => (
          <Badge
            key={btn.id}
            variant={filter === btn.id ? 'default' : 'outline'}
            className={`cursor-pointer gap-1 px-3 py-1.5 ${filter === btn.id ? 'bg-primary text-primary-foreground' : ''}`}
            onClick={() => setFilter(btn.id)}
          >
            {btn.icon}
            {btn.label}
          </Badge>
        ))}
      </div>

      {/* Device Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredDevices.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDevices.map((device, index) => (
            <DeviceCard key={`${device.name}-${index}`} {...device} />
          ))}
        </div>
      ) : (
        <div className="glass-card rounded-xl p-12 text-center border border-border/50">
          <Cpu className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-lg font-semibold mb-2">No Devices Found</h3>
          <p className="text-muted-foreground">
            {filter === 'all' 
              ? 'No devices are currently connected.'
              : `No ${filter} devices found.`}
          </p>
        </div>
      )}
    </div>
  );
};

export default DevicesContent;
