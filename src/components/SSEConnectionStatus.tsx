import { useState, useEffect, useRef } from "react";
import { Wifi, WifiOff, Loader2, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SSEConnectionStatusProps {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  reconnectCount: number;
  onReconnect: () => void;
  label?: string;
}

type DisplayState = "connecting" | "connected" | "error" | "polling";

export function SSEConnectionStatus({
  isConnected,
  isConnecting,
  error,
  reconnectCount,
  onReconnect,
  label = "Live",
}: SSEConnectionStatusProps) {
  // Debounce the display state to prevent rapid flickering
  const [displayState, setDisplayState] = useState<DisplayState>("polling");
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const stableConnectedRef = useRef(false);

  useEffect(() => {
    // Clear any pending debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Determine the new state
    let newState: DisplayState;
    if (isConnected) {
      newState = "connected";
      stableConnectedRef.current = true;
    } else if (error) {
      newState = "error";
      stableConnectedRef.current = false;
    } else if (isConnecting) {
      newState = "connecting";
    } else {
      newState = "polling";
      stableConnectedRef.current = false;
    }

    // If transitioning from connected to connecting, use longer debounce
    // to prevent flicker during brief reconnection attempts
    if (stableConnectedRef.current && newState === "connecting") {
      debounceRef.current = setTimeout(() => {
        setDisplayState(newState);
      }, 1500); // Wait 1.5s before showing "connecting" if was connected
    } else if (newState === "connecting" && displayState !== "connected") {
      // For initial connecting, use shorter debounce
      debounceRef.current = setTimeout(() => {
        setDisplayState(newState);
      }, 500);
    } else {
      // Immediate update for connected/error states
      setDisplayState(newState);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [isConnected, isConnecting, error, displayState]);

  if (displayState === "connecting") {
    return (
      <Badge variant="outline" className="gap-1.5 text-muted-foreground">
        <Loader2 className="w-3 h-3 animate-spin" />
        Connecting...
      </Badge>
    );
  }

  if (displayState === "connected") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge className="gap-1.5 bg-success/10 text-success border-success/30">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
            </span>
            {label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>Real-time updates active</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  if (displayState === "error") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={onReconnect}
            className="gap-1.5 h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <WifiOff className="w-3 h-3" />
            {reconnectCount > 0 ? `Retry (${reconnectCount})` : "Offline"}
            <RefreshCw className="w-3 h-3" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{error}. Click to reconnect.</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Badge variant="outline" className="gap-1.5 text-muted-foreground">
      <WifiOff className="w-3 h-3" />
      Polling
    </Badge>
  );
}
