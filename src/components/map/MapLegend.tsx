import { memo } from "react";

const LEGEND_ITEMS: { color: string; shadow: string; label: string }[] = [
  { color: 'bg-green-500', shadow: 'shadow-green-500/30', label: 'GPS Sensors' },
  { color: 'bg-violet-500', shadow: 'shadow-violet-500/30', label: 'Starlink Dishes' },
  { color: 'bg-orange-500', shadow: 'shadow-orange-500/30', label: 'Client Devices' },
  { color: 'bg-red-500', shadow: 'shadow-red-500/30', label: 'LoRa Devices' },
];

export const MapLegend = memo(function MapLegend() {
  return (
    <div className="absolute bottom-4 left-4 glass-card rounded-xl p-4 z-[1000] backdrop-blur-md border border-border/50">
      <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
        Legend
      </h3>
      <div className="space-y-2.5 text-sm">
        {LEGEND_ITEMS.map((item) => (
          <div key={item.label} className="flex items-center gap-3">
            <div 
              className={`w-3 h-3 rounded-full ${item.color} shadow-lg ${item.shadow}`} 
            />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
});
