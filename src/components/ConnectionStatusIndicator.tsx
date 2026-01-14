import { useState, useEffect } from "react";
import { Wifi, WifiOff, AlertTriangle, RefreshCw, Server, Flame } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useHealth } from "@/hooks/useAuroraApi";
import { hasAuroraSession } from "@/hooks/aurora/core";
import { useConnectionStatus, ConnectionState } from "@/hooks/useConnectionStatus";
import { Progress } from "@/components/ui/progress";

const ConnectionStatusIndicator = () => {
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  
  const isAuthenticated = hasAuroraSession();
  
  // Get global connection state from zustand store
  const { state: globalState, retryCount, maxRetries } = useConnectionStatus();
  
  const { 
    data: health, 
    isLoading, 
    isError, 
    error,
    refetch,
    isFetching
  } = useHealth();

  // Derive display state from both health check and global connection state
  const [displayState, setDisplayState] = useState<ConnectionState>("checking");

  useEffect(() => {
    // If we're warming up globally, show that state
    if (globalState === 'warming_up') {
      setDisplayState('warming_up');
      return;
    }
    
    if (!isAuthenticated) {
      setDisplayState("disconnected");
      return;
    }
    
    if (isLoading || isFetching) {
      setDisplayState("checking");
      return;
    }
    
    if (isError) {
      const errorMessage = (error as Error)?.message?.toLowerCase() || "";
      if (errorMessage.includes("boot_error") || 
          errorMessage.includes("function failed to start")) {
        setDisplayState("warming_up");
      } else if (errorMessage.includes("timeout") || 
          errorMessage.includes("unavailable") || 
          errorMessage.includes("500") ||
          errorMessage.includes("temporarily")) {
        setDisplayState("degraded");
      } else {
        setDisplayState("disconnected");
      }
      return;
    }
    
    if (health?.status === "ok" || health?.status === "healthy") {
      setDisplayState("connected");
      setLastChecked(new Date());
    } else if (health) {
      setDisplayState("degraded");
      setLastChecked(new Date());
    } else {
      setDisplayState("disconnected");
    }
  }, [health, isLoading, isError, error, isFetching, isAuthenticated, globalState]);

  const getStatusConfig = () => {
    switch (displayState) {
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
      case "warming_up":
        return {
          icon: Flame,
          color: "text-orange-400",
          bgColor: "bg-orange-500/10",
          borderColor: "border-orange-500/30",
          pulseColor: "bg-orange-400",
          label: "Warming Up",
          description: `Edge function is starting up... ${retryCount > 0 ? `(Retry ${retryCount}/${maxRetries})` : ''}`
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
  const isSpinning = displayState === "checking";
  const isWarmingUp = displayState === "warming_up";

  const formatLastChecked = () => {
    if (!lastChecked) return null;
    const seconds = Math.floor((Date.now() - lastChecked.getTime()) / 1000);
    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  const warmupProgress = maxRetries > 0 ? (retryCount / maxRetries) * 100 : 0;

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
              {(displayState === "connected" || displayState === "warming_up") && (
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${config.pulseColor} opacity-75`} />
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${config.pulseColor}`} />
            </span>
            
            {/* Icon */}
            <Icon className={`w-4 h-4 ${config.color} ${isSpinning ? "animate-spin" : ""} ${isWarmingUp ? "animate-pulse" : ""}`} />
            
            {/* Label - hidden on small screens */}
            <span className={`hidden sm:inline text-xs font-medium ${config.color}`}>
              {config.label}
            </span>
            
            {/* Progress bar for warming up state */}
            {isWarmingUp && maxRetries > 0 && (
              <div className="hidden sm:block w-12 h-1.5 bg-orange-900/30 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-orange-400 rounded-full transition-all duration-300 animate-pulse"
                  style={{ width: `${warmupProgress}%` }}
                />
              </div>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Server className={`w-4 h-4 ${config.color}`} />
              <span className="font-medium">Aurora Server Status</span>
            </div>
            <p className="text-xs text-muted-foreground">{config.description}</p>
            
            {/* Show progress bar in tooltip for warming up */}
            {isWarmingUp && maxRetries > 0 && (
              <div className="space-y-1">
                <Progress value={warmupProgress} className="h-2" />
                <p className="text-xs text-orange-400">
                  Starting edge function... This usually takes 2-5 seconds.
                </p>
              </div>
            )}
            
            {lastChecked && displayState === "connected" && (
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
