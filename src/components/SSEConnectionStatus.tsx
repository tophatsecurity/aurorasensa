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

export function SSEConnectionStatus({
  isConnected,
  isConnecting,
  error,
  reconnectCount,
  onReconnect,
  label = "Live",
}: SSEConnectionStatusProps) {
  if (isConnecting) {
    return (
      <Badge variant="outline" className="gap-1.5 text-muted-foreground">
        <Loader2 className="w-3 h-3 animate-spin" />
        Connecting...
      </Badge>
    );
  }

  if (isConnected) {
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

  if (error) {
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
