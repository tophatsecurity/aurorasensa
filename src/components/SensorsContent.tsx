import { Thermometer, Loader2, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSensors } from "@/hooks/useAuroraApi";
import { useQueryClient } from "@tanstack/react-query";

const SensorsContent = () => {
  const { data: sensors, isLoading, error } = useSensors();
  const queryClient = useQueryClient();

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["aurora", "sensors"] });
  };

  return (
    <div className="flex-1 overflow-y-auto p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold text-foreground">Sensors</h1>
          <Badge className="bg-success/20 text-success border-success/30 px-3 py-1">
            LIVE
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

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="glass-card rounded-xl p-8 text-center border border-border/50">
          <p className="text-destructive mb-4">Failed to load sensor data</p>
          <Button variant="outline" onClick={handleRefresh}>
            Try Again
          </Button>
        </div>
      ) : sensors && sensors.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sensors.map((sensor) => (
            <div 
              key={sensor.id}
              className="glass-card rounded-xl p-5 border border-border/50 hover:border-primary/30 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Thermometer className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{sensor.name}</h3>
                    <p className="text-xs text-muted-foreground">{sensor.type}</p>
                  </div>
                </div>
                <Badge 
                  variant={sensor.status === 'online' ? 'default' : 'secondary'}
                  className={sensor.status === 'online' ? 'bg-success/20 text-success' : ''}
                >
                  {sensor.status}
                </Badge>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Value:</span>
                  <span className="font-medium">{sensor.value} {sensor.unit}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Last Update:</span>
                  <span className="text-xs text-muted-foreground">{sensor.lastUpdate}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-card rounded-xl p-12 text-center border border-border/50">
          <Thermometer className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-lg font-semibold mb-2">No Sensors Found</h3>
          <p className="text-muted-foreground">
            No sensor data is currently available from the Aurora API.
          </p>
        </div>
      )}
    </div>
  );
};

export default SensorsContent;
