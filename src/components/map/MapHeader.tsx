import { memo } from "react";
import { MapPin, RefreshCw, Activity, Signal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { SSEConnectionStatus } from "@/components/SSEConnectionStatus";
import type { MapStats } from "@/types/map";

interface SSEStatus {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  reconnectCount: number;
  onReconnect: () => void;
}

interface MapHeaderProps {
  stats: MapStats;
  timeAgo: string;
  isLoading: boolean;
  onRefresh: () => void;
  sseEnabled?: boolean;
  onSSEToggle?: (enabled: boolean) => void;
  gpsSSE?: SSEStatus;
  adsbSSE?: SSEStatus;
}

export const MapHeader = memo(function MapHeader({ 
  stats, 
  timeAgo, 
  isLoading, 
  onRefresh,
  sseEnabled,
  onSSEToggle,
  gpsSSE,
  adsbSSE,
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
        {gpsSSE && (
          <SSEConnectionStatus
            isConnected={gpsSSE.isConnected}
            isConnecting={gpsSSE.isConnecting}
            error={gpsSSE.error}
            reconnectCount={gpsSSE.reconnectCount}
            onReconnect={gpsSSE.onReconnect}
            label="GPS"
          />
        )}
        {adsbSSE && (
          <SSEConnectionStatus
            isConnected={adsbSSE.isConnected}
            isConnecting={adsbSSE.isConnecting}
            error={adsbSSE.error}
            reconnectCount={adsbSSE.reconnectCount}
            onReconnect={adsbSSE.onReconnect}
            label="ADS-B"
          />
        )}
      </div>
      <div className="flex items-center gap-3">
        {onSSEToggle !== undefined && (
          <div className="flex items-center gap-2">
            <Switch
              id="sse-toggle-map"
              checked={sseEnabled}
              onCheckedChange={onSSEToggle}
            />
            <Label htmlFor="sse-toggle-map" className="text-sm text-muted-foreground">
              Real-time
            </Label>
          </div>
        )}
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
