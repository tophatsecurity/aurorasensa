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
  AlertCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSensors, useAdsbAircraft } from "@/hooks/useAuroraApi";
import { useQueryClient } from "@tanstack/react-query";

type DeviceType = 'all' | 'arduino' | 'lora' | 'starlink' | 'adsb' | 'gps';

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
        <p className="text-xs text-muted-foreground mt-4">
          Last seen: {lastSeen}
        </p>
      )}
    </div>
  );
};

const DevicesContent = () => {
  const [filter, setFilter] = useState<DeviceType>('all');
  const { data: sensors, isLoading: sensorsLoading } = useSensors();
  const { data: aircraft, isLoading: aircraftLoading } = useAdsbAircraft();
  const queryClient = useQueryClient();

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["aurora"] });
  };

  const isLoading = sensorsLoading || aircraftLoading;

  // Transform data into devices
  const devices: DeviceCardProps[] = [];

  // Add sensors as devices
  sensors?.forEach((sensor) => {
    const iconMap: Record<string, React.ReactNode> = {
      temperature: <Cpu className="w-6 h-6 text-orange-400" />,
      gps: <Navigation className="w-6 h-6 text-green-400" />,
      lora: <Radio className="w-6 h-6 text-red-400" />,
      starlink: <Wifi className="w-6 h-6 text-violet-400" />,
      signal: <Radio className="w-6 h-6 text-blue-400" />,
    };

    devices.push({
      name: sensor.name,
      type: sensor.type,
      status: sensor.status,
      lastSeen: sensor.lastUpdate,
      icon: iconMap[sensor.type.toLowerCase()] || <Cpu className="w-6 h-6 text-primary" />,
      details: {
        value: `${sensor.value} ${sensor.unit}`,
      },
    });
  });

  // Add aircraft as devices
  aircraft?.forEach((ac) => {
    devices.push({
      name: ac.flight?.trim() || ac.hex,
      type: 'adsb',
      status: (ac.seen ?? 0) < 60 ? 'online' : 'stale',
      icon: <Plane className="w-6 h-6 text-cyan-400" />,
      details: {
        hex: ac.hex,
        altitude: ac.alt_baro ? `${ac.alt_baro.toLocaleString()} ft` : '—',
        speed: ac.gs ? `${ac.gs.toFixed(0)} kts` : '—',
        rssi: ac.rssi ? `${ac.rssi.toFixed(1)} dBm` : '—',
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
    arduino: devices.filter(d => d.type === 'temperature').length,
    lora: devices.filter(d => d.type === 'lora').length,
    starlink: devices.filter(d => d.type === 'starlink').length,
    adsb: devices.filter(d => d.type === 'adsb').length,
    gps: devices.filter(d => d.type === 'gps').length,
  };

  const filterButtons: { id: DeviceType; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: `All (${counts.all})`, icon: null },
    { id: 'arduino', label: `Arduino (${counts.arduino})`, icon: <Cpu className="w-3 h-3" /> },
    { id: 'lora', label: `LoRa (${counts.lora})`, icon: <Radio className="w-3 h-3" /> },
    { id: 'starlink', label: `Starlink (${counts.starlink})`, icon: <Wifi className="w-3 h-3" /> },
    { id: 'adsb', label: `ADS-B (${counts.adsb})`, icon: <Plane className="w-3 h-3" /> },
    { id: 'gps', label: `GPS (${counts.gps})`, icon: <Navigation className="w-3 h-3" /> },
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
