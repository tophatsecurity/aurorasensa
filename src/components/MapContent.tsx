import { useState, useCallback } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
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
  MapControls,
  MapLegend,
  MapStatistics,
  MapLoadingOverlay,
  FitBounds,
  AircraftMarkers,
  SensorMarkers,
} from "@/components/map";

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

  const handleRecenter = useCallback(() => {
    // Recenter logic handled by FitBounds
  }, []);

  const showAircraft = filter === 'all' || filter === 'adsb';

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-6 pb-4 border-b border-border/50">
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
      <div className="flex-1 relative">
        <MapContainer
          center={MAP_CONFIG.defaultCenter}
          zoom={MAP_CONFIG.defaultZoom}
          className="h-full w-full"
          style={{ background: MAP_CONFIG.backgroundColor }}
          zoomControl={false}
        >
          <TileLayer
            attribution={MAP_CONFIG.attribution}
            url={MAP_CONFIG.tileUrl}
          />

          <MapControls onRecenter={handleRecenter} />
          
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
