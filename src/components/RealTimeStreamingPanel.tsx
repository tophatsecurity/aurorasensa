import { useState } from "react";
import { 
  Radio, 
  Satellite, 
  Thermometer, 
  Navigation, 
  Plane, 
  Zap,
  Activity,
  Wifi,
  WifiOff,
  RefreshCw
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useStarlinkRealTime,
  useThermalProbeRealTime,
  useGpsRealTime,
  useAdsbRealTime,
  usePowerRealTime,
  useSystemMonitorRealTime,
  useSSEAvailability,
} from "@/hooks/useSSE";

interface StreamStatus {
  name: string;
  icon: React.ReactNode;
  isConnected: boolean;
  isConnecting: boolean;
  isSSE: boolean;
  isPolling: boolean;
  error: string | null;
  reconnect: () => void;
}

interface RealTimeStreamingPanelProps {
  enabled?: boolean;
  clientId?: string;
  compact?: boolean;
}

export function RealTimeStreamingPanel({ 
  enabled = true, 
  clientId,
  compact = false 
}: RealTimeStreamingPanelProps) {
  const [streamingEnabled, setStreamingEnabled] = useState(enabled);
  
  // SSE availability check
  const { isAvailable: sseAvailable, isChecking } = useSSEAvailability();
  
  // Individual stream connections
  const starlinkStream = useStarlinkRealTime(streamingEnabled, clientId);
  const thermalStream = useThermalProbeRealTime(streamingEnabled, clientId);
  const gpsStream = useGpsRealTime(streamingEnabled, clientId);
  const adsbStream = useAdsbRealTime(streamingEnabled, clientId);
  const powerStream = usePowerRealTime(streamingEnabled, clientId);
  const systemStream = useSystemMonitorRealTime(streamingEnabled, clientId);

  const streams: StreamStatus[] = [
    {
      name: "Starlink",
      icon: <Satellite className="w-4 h-4" />,
      ...starlinkStream,
    },
    {
      name: "Thermal",
      icon: <Thermometer className="w-4 h-4" />,
      ...thermalStream,
    },
    {
      name: "GPS",
      icon: <Navigation className="w-4 h-4" />,
      ...gpsStream,
    },
    {
      name: "ADS-B",
      icon: <Plane className="w-4 h-4" />,
      ...adsbStream,
    },
    {
      name: "Power",
      icon: <Zap className="w-4 h-4" />,
      ...powerStream,
    },
    {
      name: "System",
      icon: <Activity className="w-4 h-4" />,
      ...systemStream,
    },
  ];

  const connectedCount = streams.filter(s => s.isConnected).length;
  const sseCount = streams.filter(s => s.isSSE && s.isConnected).length;
  const pollingCount = streams.filter(s => s.isPolling && s.isConnected).length;

  const reconnectAll = () => {
    streams.forEach(stream => stream.reconnect());
  };

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Switch
            id="streaming-toggle"
            checked={streamingEnabled}
            onCheckedChange={setStreamingEnabled}
          />
          <Label htmlFor="streaming-toggle" className="text-sm">Live</Label>
        </div>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant={connectedCount > 0 ? "default" : "secondary"}
              className={connectedCount > 0 ? "bg-success/20 text-success border-success/30" : ""}
            >
              {streamingEnabled ? (
                <>
                  <span className="relative flex h-2 w-2 mr-1.5">
                    {connectedCount > 0 && (
                      <>
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
                      </>
                    )}
                    {connectedCount === 0 && (
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-muted-foreground"></span>
                    )}
                  </span>
                  {connectedCount}/{streams.length} streams
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 mr-1" />
                  Paused
                </>
              )}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>{sseCount} SSE, {pollingCount} polling</p>
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return (
    <Card className="glass-card border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Radio className="w-4 h-4 text-violet-400" />
            Real-Time Streams
          </CardTitle>
          <div className="flex items-center gap-2">
            <Switch
              id="streaming-enabled"
              checked={streamingEnabled}
              onCheckedChange={setStreamingEnabled}
            />
            <Label htmlFor="streaming-enabled" className="text-xs">
              {streamingEnabled ? "Live" : "Paused"}
            </Label>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* SSE Availability Status */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">SSE Available:</span>
          <Badge variant={sseAvailable ? "default" : "secondary"} className="text-xs">
            {isChecking ? "Checking..." : sseAvailable ? "Yes" : "No (using polling)"}
          </Badge>
        </div>

        {/* Stream Status Grid */}
        <div className="grid grid-cols-2 gap-2">
          {streams.map((stream) => (
            <Tooltip key={stream.name}>
              <TooltipTrigger asChild>
                <div
                  className={`flex items-center gap-2 p-2 rounded-lg border transition-colors cursor-default ${
                    stream.isConnected
                      ? "border-success/30 bg-success/5"
                      : stream.isConnecting
                      ? "border-warning/30 bg-warning/5"
                      : stream.error
                      ? "border-destructive/30 bg-destructive/5"
                      : "border-border/50 bg-muted/20"
                  }`}
                >
                  <div className={stream.isConnected ? "text-success" : "text-muted-foreground"}>
                    {stream.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{stream.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {stream.isConnected 
                        ? (stream.isSSE ? "SSE" : "Polling")
                        : stream.isConnecting 
                        ? "Connecting..."
                        : stream.error 
                        ? "Error"
                        : "Disconnected"}
                    </p>
                  </div>
                  {stream.isConnected && (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
                    </span>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {stream.name}: {stream.isConnected 
                    ? `Connected via ${stream.isSSE ? "SSE" : "Polling"}`
                    : stream.error || "Disconnected"}
                </p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>

        {/* Summary */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <div className="text-xs text-muted-foreground">
            {connectedCount}/{streams.length} connected
            {sseCount > 0 && ` (${sseCount} SSE)`}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={reconnectAll}
            disabled={!streamingEnabled}
            className="h-7 text-xs gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            Reconnect
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Compact status badge for headers
export function RealTimeStatusBadge({ 
  enabled = true,
  clientId 
}: { 
  enabled?: boolean;
  clientId?: string;
}) {
  const starlinkStream = useStarlinkRealTime(enabled, clientId);
  const thermalStream = useThermalProbeRealTime(enabled, clientId);
  const gpsStream = useGpsRealTime(enabled, clientId);
  const adsbStream = useAdsbRealTime(enabled, clientId);

  const streams = [starlinkStream, thermalStream, gpsStream, adsbStream];
  const connectedCount = streams.filter(s => s.isConnected).length;
  const hasSSE = streams.some(s => s.isSSE && s.isConnected);

  if (!enabled) {
    return (
      <Badge variant="secondary" className="gap-1">
        <WifiOff className="w-3 h-3" />
        Offline
      </Badge>
    );
  }

  if (connectedCount === 0) {
    return (
      <Badge variant="outline" className="gap-1 text-muted-foreground">
        <Wifi className="w-3 h-3" />
        Connecting...
      </Badge>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge className="gap-1.5 bg-success/10 text-success border-success/30">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
          </span>
          {hasSSE ? "Live (SSE)" : "Live"}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p>{connectedCount}/4 streams active</p>
      </TooltipContent>
    </Tooltip>
  );
}
