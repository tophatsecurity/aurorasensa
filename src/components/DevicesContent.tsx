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
  Clock,
  Thermometer,
  Bluetooth,
  Monitor,
  Satellite,
  Eye
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useClients, useAdsbAircraft, useAdoptClient, Client } from "@/hooks/useAuroraApi";
import { useQueryClient } from "@tanstack/react-query";
import DeviceDetailDialog from "./DeviceDetailDialog";
import { toast } from "sonner";

type DeviceType = 'all' | 'client' | 'adsb';

interface SensorBadge {
  id: string;
  type: string;
  enabled: boolean;
}

interface DeviceCardProps {
  name: string;
  type: string;
  status: string;
  lastSeen?: string;
  icon: React.ReactNode;
  details?: Record<string, string | number>;
  sensors?: SensorBadge[];
  onViewDetails?: () => void;
  onAdopt?: () => void;
  isAdopting?: boolean;
  needsAdoption?: boolean;
}

const getSensorIcon = (sensorId: string) => {
  if (sensorId.includes('arduino')) return <Cpu className="w-3 h-3" />;
  if (sensorId.includes('lora')) return <Radio className="w-3 h-3" />;
  if (sensorId.includes('starlink')) return <Satellite className="w-3 h-3" />;
  if (sensorId.includes('wifi')) return <Wifi className="w-3 h-3" />;
  if (sensorId.includes('bluetooth')) return <Bluetooth className="w-3 h-3" />;
  if (sensorId.includes('adsb')) return <Plane className="w-3 h-3" />;
  if (sensorId.includes('gps')) return <Navigation className="w-3 h-3" />;
  if (sensorId.includes('thermal')) return <Thermometer className="w-3 h-3" />;
  if (sensorId.includes('system')) return <Monitor className="w-3 h-3" />;
  return <Cpu className="w-3 h-3" />;
};

const getSensorColor = (sensorId: string) => {
  if (sensorId.includes('arduino')) return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
  if (sensorId.includes('lora')) return 'bg-red-500/20 text-red-400 border-red-500/30';
  if (sensorId.includes('starlink')) return 'bg-violet-500/20 text-violet-400 border-violet-500/30';
  if (sensorId.includes('wifi')) return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
  if (sensorId.includes('bluetooth')) return 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30';
  if (sensorId.includes('adsb')) return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
  if (sensorId.includes('gps')) return 'bg-green-500/20 text-green-400 border-green-500/30';
  if (sensorId.includes('thermal')) return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
  if (sensorId.includes('system')) return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  return 'bg-primary/20 text-primary border-primary/30';
};

const DeviceCard = ({ name, type, status, lastSeen, icon, details, sensors, onViewDetails, onAdopt, isAdopting, needsAdoption }: DeviceCardProps) => {
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
    <div 
      className="glass-card rounded-xl p-5 border border-border/50 hover:border-primary/30 transition-all cursor-pointer group"
      onClick={onViewDetails}
    >
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
        <div className="flex items-center gap-2">
          <Badge className={getStatusColor()}>
            {getStatusIcon()}
            <span className="ml-1 capitalize">{status}</span>
          </Badge>
          {needsAdoption && onAdopt && (
            <Button 
              variant="default" 
              size="sm" 
              className="h-7 px-3 text-xs bg-primary hover:bg-primary/90"
              onClick={(e) => { e.stopPropagation(); onAdopt(); }}
              disabled={isAdopting}
            >
              {isAdopting ? <Loader2 className="w-3 h-3 animate-spin" /> : "Adopt"}
            </Button>
          )}
          {onViewDetails && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => { e.stopPropagation(); onViewDetails(); }}
            >
              <Eye className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {sensors && sensors.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-muted-foreground mb-2">Sensors ({sensors.length})</p>
          <div className="flex flex-wrap gap-1.5">
            {sensors.map((sensor) => (
              <Badge 
                key={sensor.id} 
                variant="outline" 
                className={`text-[10px] px-2 py-0.5 gap-1 ${getSensorColor(sensor.id)}`}
              >
                {getSensorIcon(sensor.id)}
                {sensor.id.replace(/_/g, ' ').replace(/\d+$/, '').trim()}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {details && (
        <div className="space-y-2 pt-3 border-t border-border/30">
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

const getClientStatus = (client: Client) => {
  if (client.status === 'active') return 'online';
  const date = new Date(client.last_seen);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 5) return 'online';
  if (diffMins < 60) return 'stale';
  return 'offline';
};

const DevicesContent = () => {
  const [filter, setFilter] = useState<DeviceType>('all');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { data: clients, isLoading: clientsLoading } = useClients();
  const { data: aircraft, isLoading: aircraftLoading } = useAdsbAircraft();
  const adoptMutation = useAdoptClient();
  const queryClient = useQueryClient();

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["aurora"] });
  };

  const handleViewDetails = (client: Client) => {
    setSelectedClient(client);
    setDetailsOpen(true);
  };

  const handleAdopt = (client: Client) => {
    adoptMutation.mutate(client.client_id, {
      onSuccess: () => {
        toast.success(`${client.hostname || client.client_id} adopted successfully`);
      },
      onError: (error) => {
        toast.error(`Failed to adopt device: ${error.message}`);
      },
    });
  };

  const isNeedsAdoption = (client: Client) => {
    return client.auto_registered && !client.adopted_at;
  };

  const isLoading = clientsLoading || aircraftLoading;

  // Transform data into devices
  const devices: (DeviceCardProps & { client?: Client })[] = [];

  // Add clients as devices with their sensors
  clients?.forEach((client: Client) => {
    const status = getClientStatus(client);
    const system = client.metadata?.system;
    
    const sensorList: SensorBadge[] = (client.sensors || []).map(sensorId => ({
      id: sensorId,
      type: sensorId.split('_')[0],
      enabled: true,
    }));

    const needsAdoption = isNeedsAdoption(client);

    devices.push({
      name: client.hostname || client.client_id,
      type: 'client',
      status: needsAdoption ? 'pending' : status,
      lastSeen: formatLastSeen(client.last_seen),
      icon: <Server className="w-6 h-6 text-cyan-400" />,
      sensors: sensorList,
      details: {
        'IP': client.ip_address,
        'Batches': client.batches_received.toLocaleString(),
        ...(system?.cpu_percent !== undefined && { 'CPU': `${system.cpu_percent.toFixed(1)}%` }),
        ...(system?.memory_percent !== undefined && { 'Memory': `${system.memory_percent.toFixed(1)}%` }),
      },
      client,
      needsAdoption,
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

  // Sort devices: "to be adopted" first, then by status
  const sortedDevices = [...devices].sort((a, b) => {
    const aAdopted = a.status.toLowerCase() === 'pending' || a.status.toLowerCase() === 'to adopt' || a.status.toLowerCase() === 'stale';
    const bAdopted = b.status.toLowerCase() === 'pending' || b.status.toLowerCase() === 'to adopt' || b.status.toLowerCase() === 'stale';
    if (aAdopted && !bAdopted) return -1;
    if (!aAdopted && bAdopted) return 1;
    // Then sort by status: offline > stale > online
    const statusOrder = { 'offline': 0, 'stale': 1, 'pending': 2, 'to adopt': 3, 'online': 4, 'active': 5 };
    const aOrder = statusOrder[a.status.toLowerCase() as keyof typeof statusOrder] ?? 3;
    const bOrder = statusOrder[b.status.toLowerCase() as keyof typeof statusOrder] ?? 3;
    return aOrder - bOrder;
  });

  // Filter devices
  const filteredDevices = filter === 'all' 
    ? sortedDevices 
    : sortedDevices.filter(d => d.type.toLowerCase() === filter);

  // Device counts
  const counts = {
    all: devices.length,
    client: devices.filter(d => d.type === 'client').length,
    adsb: devices.filter(d => d.type === 'adsb').length,
  };

  const totalSensors = clients?.reduce((acc, client) => acc + (client.sensors?.length || 0), 0) || 0;

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
            {counts.client} Clients
          </Badge>
          <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 px-3 py-1">
            {totalSensors} Sensors
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
            <DeviceCard 
              key={`${device.name}-${index}`} 
              {...device}
              onViewDetails={device.client ? () => handleViewDetails(device.client!) : undefined}
              onAdopt={device.client && device.needsAdoption ? () => handleAdopt(device.client!) : undefined}
              isAdopting={adoptMutation.isPending && adoptMutation.variables === device.client?.client_id}
            />
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

      {/* Detail Dialog */}
      <DeviceDetailDialog 
        client={selectedClient}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />
    </div>
  );
};

export default DevicesContent;
