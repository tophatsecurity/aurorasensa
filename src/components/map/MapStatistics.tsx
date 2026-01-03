import { memo } from "react";
import { Activity, Clock, History } from "lucide-react";
import type { MapStats } from "@/types/map";

interface MapStatisticsProps {
  stats: MapStats;
  isHistoricalAdsb?: boolean;
  adsbSource?: 'live' | 'historical' | 'none';
}

const STAT_ITEMS: { key: keyof MapStats; color: string; label: string; pulse?: boolean }[] = [
  { key: 'gps', color: 'bg-green-500', label: 'GPS' },
  { key: 'adsb', color: 'bg-cyan-500', label: 'ADS-B', pulse: true },
  { key: 'starlink', color: 'bg-violet-500', label: 'Starlink' },
  { key: 'clients', color: 'bg-orange-500', label: 'Clients' },
  { key: 'lora', color: 'bg-red-500', label: 'LoRa' },
];

export const MapStatistics = memo(function MapStatistics({ 
  stats, 
  isHistoricalAdsb, 
  adsbSource 
}: MapStatisticsProps) {
  return (
    <div className="absolute top-4 right-4 glass-card rounded-xl p-4 z-[1000] min-w-[200px] backdrop-blur-md border border-border/50">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="w-4 h-4 text-primary" />
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Statistics
        </h3>
      </div>
      <div className="space-y-2.5 text-sm">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Total Markers</span>
          <span className="font-bold text-lg text-primary">{stats.total}</span>
        </div>
        <div className="h-px bg-border/50 my-2" />
        {STAT_ITEMS.map((item) => (
          <div key={item.key} className="flex justify-between">
            <span className="text-muted-foreground flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${item.color} ${item.pulse && !isHistoricalAdsb ? 'animate-pulse' : ''}`} />
              {item.label}
              {item.key === 'adsb' && isHistoricalAdsb && (
                <span className="text-[10px] text-warning flex items-center gap-1">
                  <History className="w-3 h-3" />
                  60m
                </span>
              )}
            </span>
            <span className="font-medium">{stats[item.key]}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 pt-3 border-t border-border/50 flex items-center gap-2 text-xs text-muted-foreground">
        <Clock className="w-3 h-3" />
        {isHistoricalAdsb ? (
          <span className="text-warning">ADS-B: Historical (60min)</span>
        ) : (
          <span>Auto-refresh: 5s</span>
        )}
      </div>
    </div>
  );
});
