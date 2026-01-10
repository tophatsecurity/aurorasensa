import { memo } from "react";
import { MapPin, RefreshCw, Activity, Signal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { MapStats } from "@/types/map";

interface MapHeaderProps {
  stats: MapStats;
  timeAgo: string;
  isLoading: boolean;
  onRefresh: () => void;
}

export const MapHeader = memo(function MapHeader({ 
  stats, 
  timeAgo, 
  isLoading, 
  onRefresh,
}: MapHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
          <MapPin className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Sensor Map</h1>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Activity className="w-3 h-3 text-success animate-pulse" />
            Live tracking • Updated {timeAgo}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Badge variant="outline" className="gap-1 bg-card">
          <Signal className="w-3 h-3 text-success" />
          {stats.total} markers
        </Badge>
        <Button 
          variant="default" 
          size="sm" 
          className="gap-2"
          onClick={onRefresh}
          disabled={isLoading}
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>
    </div>
  );
});
