import { useState, useCallback, useEffect } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Types and utilities
import { FilterType, MAP_CONFIG } from "@/types/map";
import "@/utils/mapIcons"; // Initialize Leaflet icons

// Custom hook for map data
import { useMapData } from "@/hooks/useMapData";

// Map components
import {
  MapHeader,
  MapFilters,
  MapLegend,
  MapStatistics,
  MapLoadingOverlay,
  FitBounds,
  AircraftMarkers,
  SensorMarkers,
} from "@/components/map";
import { Button } from "@/components/ui/button";

// Map controls must be defined as a component used inside MapContainer
const MapControlsInner = () => {
  const map = useMap();
  
  const handleZoomIn = useCallback(() => map.zoomIn(), [map]);
  const handleZoomOut = useCallback(() => map.zoomOut(), [map]);
  const handleRecenter = useCallback(() => {
    map.setView(MAP_CONFIG.defaultCenter, MAP_CONFIG.defaultZoom);
  }, [map]);

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
        onClick={handleRecenter}
      >
        <Maximize2 className="w-4 h-4" />
      </Button>
    </div>
  );
};

// Component to invalidate map size after mount
const MapResizer = () => {
  const map = useMap();
  
  useEffect(() => {
    // Invalidate size after a short delay to ensure container is rendered
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [map]);
  
  return null;
};

const MapContent = () => {
  const [filter, setFilter] = useState<FilterType>('all');
  
  const {
    aircraftMarkers,
    sensorMarkers,
    allPositions,
    stats,
    isLoading,
    timeAgo,
    handleRefresh,
  } = useMapData();

  const handleFilterChange = useCallback((newFilter: FilterType) => {
    setFilter(newFilter);
  }, []);

  const showAircraft = filter === 'all' || filter === 'adsb';

  return (
    <div className="flex flex-col h-full w-full">
      {/* Header */}
      <div className="p-6 pb-4 border-b border-border/50 shrink-0">
        <MapHeader 
          stats={stats}
          timeAgo={timeAgo}
          isLoading={isLoading}
          onRefresh={handleRefresh}
        />
        <MapFilters 
          filter={filter}
          stats={stats}
          onFilterChange={handleFilterChange}
        />
      </div>

      {/* Map Container */}
      <div className="flex-1 relative min-h-0">
        <MapContainer
          center={MAP_CONFIG.defaultCenter}
          zoom={MAP_CONFIG.defaultZoom}
          className="absolute inset-0"
          style={{ background: MAP_CONFIG.backgroundColor }}
          zoomControl={false}
        >
          <TileLayer
            attribution={MAP_CONFIG.attribution}
            url={MAP_CONFIG.tileUrl}
          />

          <MapResizer />
          <MapControlsInner />
          
          {allPositions.length > 0 && <FitBounds markers={allPositions} />}

          <AircraftMarkers 
            aircraft={aircraftMarkers} 
            visible={showAircraft} 
          />

          <SensorMarkers 
            sensors={sensorMarkers} 
            filter={filter} 
          />
        </MapContainer>

        <MapLegend />
        <MapStatistics stats={stats} />
        <MapLoadingOverlay isLoading={isLoading} />
      </div>
    </div>
  );
};

export default MapContent;
