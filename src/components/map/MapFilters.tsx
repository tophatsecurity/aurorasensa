import { memo, useMemo } from "react";
import { Layers, Navigation, Radio, Wifi, Plane } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { FilterType, MapStats, FilterButton } from "@/types/map";

interface MapFiltersProps {
  filter: FilterType;
  stats: MapStats;
  onFilterChange: (filter: FilterType) => void;
}

export const MapFilters = memo(function MapFilters({ 
  filter, 
  stats, 
  onFilterChange 
}: MapFiltersProps) {
  const filterButtons = useMemo<FilterButton[]>(() => [
    { id: 'all', label: 'All', icon: <Layers className="w-3 h-3" />, color: 'bg-primary', count: stats.total },
    { id: 'gps', label: 'GPS', icon: <Navigation className="w-3 h-3" />, color: 'bg-green-500', count: stats.gps },
    { id: 'starlink', label: 'Starlink', icon: <Wifi className="w-3 h-3" />, color: 'bg-violet-500', count: stats.starlink },
    { id: 'adsb', label: 'ADS-B', icon: <Plane className="w-3 h-3" />, color: 'bg-cyan-500', count: stats.adsb },
    { id: 'clients', label: 'Clients', icon: <Radio className="w-3 h-3" />, color: 'bg-orange-500', count: stats.clients },
    { id: 'lora', label: 'LoRa', icon: <Radio className="w-3 h-3" />, color: 'bg-red-500', count: stats.lora },
  ], [stats]);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {filterButtons.map((btn) => (
        <Badge
          key={btn.id}
          variant={filter === btn.id ? 'default' : 'outline'}
          className={`cursor-pointer gap-1.5 px-3 py-1.5 transition-all ${
            filter === btn.id ? btn.color + ' text-white shadow-lg' : 'hover:bg-muted'
          }`}
          onClick={() => onFilterChange(btn.id)}
        >
          {btn.icon}
          {btn.label}
          <span className={`ml-1 text-xs ${filter === btn.id ? 'opacity-80' : 'text-muted-foreground'}`}>
            ({btn.count})
          </span>
        </Badge>
      ))}
    </div>
  );
});
