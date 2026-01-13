import { useState, useEffect } from "react";
import { Wifi, WifiOff, AlertTriangle, RefreshCw, Server } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useHealth } from "@/hooks/useAuroraApi";
import { hasAuroraSession } from "@/hooks/aurora/core";

type ConnectionStatus = "connected" | "degraded" | "disconnected" | "checking";

const ConnectionStatusIndicator = () => {
  const [status, setStatus] = useState<ConnectionStatus>("checking");
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  
  const isAuthenticated = hasAuroraSession();
  
  const { 
    data: health, 
    isLoading, 
    isError, 
    error,
    refetch,
    isFetching
  } = useHealth();

  useEffect(() => {
    if (!isAuthenticated) {
      setStatus("disconnected");
      return;
    }
    
    if (isLoading || isFetching) {
      setStatus("checking");
      return;
    }
    
    if (isError) {
      // Check if it's a temporary error
      const errorMessage = (error as Error)?.message?.toLowerCase() || "";
      if (errorMessage.includes("timeout") || 
          errorMessage.includes("unavailable") || 
          errorMessage.includes("500") ||
          errorMessage.includes("temporarily")) {
        setStatus("degraded");
      } else {
        setStatus("disconnected");
      }
      return;
    }
    
    if (health?.status === "ok" || health?.status === "healthy") {
      setStatus("connected");
      setLastChecked(new Date());
    } else if (health) {
      setStatus("degraded");
      setLastChecked(new Date());
    } else {
      setStatus("disconnected");
    }
  }, [health, isLoading, isError, error, isFetching, isAuthenticated]);

  const getStatusConfig = () => {
    switch (status) {
      case "connected":
        return {
          icon: Wifi,
          color: "text-green-500",
          bgColor: "bg-green-500/10",
          borderColor: "border-green-500/30",
          pulseColor: "bg-green-500",
          label: "Connected",
          description: "Aurora server is healthy and responding normally"
        };
      case "degraded":
        return {
          icon: AlertTriangle,
          color: "text-amber-500",
          bgColor: "bg-amber-500/10",
          borderColor: "border-amber-500/30",
          pulseColor: "bg-amber-500",
          label: "Degraded",
          description: "Aurora server is experiencing issues. Some features may be slow or unavailable."
        };
      case "disconnected":
        return {
          icon: WifiOff,
          color: "text-red-500",
          bgColor: "bg-red-500/10",
          borderColor: "border-red-500/30",
          pulseColor: "bg-red-500",
          label: "Disconnected",
          description: isAuthenticated 
            ? "Cannot connect to Aurora server. Please check your connection."
            : "Not authenticated. Please log in."
        };
      case "checking":
      default:
        return {
          icon: RefreshCw,
          color: "text-muted-foreground",
          bgColor: "bg-muted/50",
          borderColor: "border-muted",
          pulseColor: "bg-muted-foreground",
          label: "Checking",
          description: "Checking Aurora server connection..."
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;
  const isSpinning = status === "checking";

  const formatLastChecked = () => {
    if (!lastChecked) return null;
    const seconds = Math.floor((Date.now() - lastChecked.getTime()) / 1000);
    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => refetch()}
            className={`relative flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-all duration-200 hover:scale-105 ${config.bgColor} ${config.borderColor}`}
          >
            {/* Pulse indicator */}
            <span className="relative flex h-2 w-2">
              {status === "connected" && (
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${config.pulseColor} opacity-75`} />
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${config.pulseColor}`} />
            </span>
            
            {/* Icon */}
            <Icon className={`w-4 h-4 ${config.color} ${isSpinning ? "animate-spin" : ""}`} />
            
            {/* Label - hidden on small screens */}
            <span className={`hidden sm:inline text-xs font-medium ${config.color}`}>
              {config.label}
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Server className={`w-4 h-4 ${config.color}`} />
              <span className="font-medium">Aurora Server Status</span>
            </div>
            <p className="text-xs text-muted-foreground">{config.description}</p>
            {lastChecked && (
              <p className="text-xs text-muted-foreground">
                Last checked: {formatLastChecked()}
              </p>
            )}
            <p className="text-xs text-muted-foreground italic">
              Click to refresh
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default ConnectionStatusIndicator;