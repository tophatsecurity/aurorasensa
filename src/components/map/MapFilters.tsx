import { memo, useMemo } from "react";
import { Navigation, Radio, Wifi, Plane, Bluetooth, Antenna, Ship, LifeBuoy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { FilterType, MapStats, FilterButton, ActiveFilters } from "@/types/map";

interface MapFiltersProps {
  activeFilters: ActiveFilters;
  stats: MapStats;
  onToggleFilter: (filter: Exclude<FilterType, 'all'>) => void;
}

export const MapFilters = memo(function MapFilters({ 
  activeFilters, 
  stats, 
  onToggleFilter 
}: MapFiltersProps) {
  const filterButtons = useMemo<FilterButton[]>(() => [
    { id: 'gps', label: 'GPS', icon: <Navigation className="w-3 h-3" />, color: 'bg-green-500', count: stats.gps },
    { id: 'starlink', label: 'Starlink', icon: <Wifi className="w-3 h-3" />, color: 'bg-violet-500', count: stats.starlink },
    { id: 'adsb', label: 'ADS-B', icon: <Plane className="w-3 h-3" />, color: 'bg-cyan-500', count: stats.adsb },
    { id: 'clients', label: 'Clients', icon: <Radio className="w-3 h-3" />, color: 'bg-orange-500', count: stats.clients },
    { id: 'lora', label: 'LoRa', icon: <Radio className="w-3 h-3" />, color: 'bg-red-500', count: stats.lora },
    { id: 'wifi', label: 'WiFi', icon: <Wifi className="w-3 h-3" />, color: 'bg-blue-500', count: stats.wifi },
    { id: 'bluetooth', label: 'Bluetooth', icon: <Bluetooth className="w-3 h-3" />, color: 'bg-indigo-500', count: stats.bluetooth },
    { id: 'aprs', label: 'APRS', icon: <Antenna className="w-3 h-3" />, color: 'bg-amber-500', count: stats.aprs },
    { id: 'ais', label: 'AIS', icon: <Ship className="w-3 h-3" />, color: 'bg-teal-500', count: stats.ais },
    { id: 'epirb', label: 'EPIRB', icon: <LifeBuoy className="w-3 h-3" />, color: 'bg-rose-500', count: stats.epirb },
  ], [stats]);

  return (
    <div className="flex items-center gap-2 flex-wrap justify-start w-full">
      {filterButtons.map((btn) => {
        const isActive = activeFilters.has(btn.id);
        return (
          <Badge
            key={btn.id}
            variant={isActive ? 'default' : 'outline'}
            className={`cursor-pointer gap-1.5 px-3 py-1.5 transition-all flex-shrink-0 ${
              isActive ? btn.color + ' text-white shadow-lg border-transparent' : 'hover:bg-muted opacity-60 border-border/50'
            }`}
            onClick={() => onToggleFilter(btn.id)}
          >
            {btn.icon}
            {btn.label}
            <span className={`ml-1 text-xs ${isActive ? 'opacity-80' : 'text-muted-foreground'}`}>
              ({btn.count})
            </span>
          </Badge>
        );
      })}
    </div>
  );
});
