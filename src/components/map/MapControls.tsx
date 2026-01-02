import { memo, useCallback } from "react";
import { useMap } from "react-leaflet";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MapControlsProps {
  onRecenter: () => void;
}

export const MapControls = memo(function MapControls({ onRecenter }: MapControlsProps) {
  const map = useMap();
  
  const handleZoomIn = useCallback(() => map.zoomIn(), [map]);
  const handleZoomOut = useCallback(() => map.zoomOut(), [map]);

  return (
    <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2">
      <Button 
        variant="outline" 
        size="icon"
        className="bg-card/90 backdrop-blur border-border/50 hover:bg-card"
        onClick={handleZoomIn}
      >
        <ZoomIn className="w-4 h-4" />
      </Button>
      <Button 
        variant="outline" 
        size="icon"
        className="bg-card/90 backdrop-blur border-border/50 hover:bg-card"
        onClick={handleZoomOut}
      >
        <ZoomOut className="w-4 h-4" />
      </Button>
      <Button 
        variant="outline" 
        size="icon"
        className="bg-card/90 backdrop-blur border-border/50 hover:bg-card"
        onClick={onRecenter}
      >
        <Maximize2 className="w-4 h-4" />
      </Button>
    </div>
  );
});
