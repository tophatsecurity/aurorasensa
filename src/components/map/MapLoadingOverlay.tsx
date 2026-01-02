import { memo } from "react";
import { Loader2 } from "lucide-react";

interface MapLoadingOverlayProps {
  isLoading: boolean;
}

export const MapLoadingOverlay = memo(function MapLoadingOverlay({ 
  isLoading 
}: MapLoadingOverlayProps) {
  if (!isLoading) return null;

  return (
    <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center z-[1001]">
      <div className="glass-card rounded-xl p-6 flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Loading map data...</span>
      </div>
    </div>
  );
});
