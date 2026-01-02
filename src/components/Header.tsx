import { Server, Bell, Settings, Wifi, WifiOff, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useComprehensiveStats } from "@/hooks/useAuroraApi";
import { formatTime } from "@/utils/dateUtils";

const Header = () => {
  const { isLoading, isError, data, dataUpdatedAt } = useComprehensiveStats();
  
  // Determine connection status
  const getConnectionStatus = () => {
    if (isLoading) return { status: 'connecting', label: 'Connecting...', color: 'bg-warning', icon: Wifi };
    if (isError) return { status: 'offline', label: 'Offline', color: 'bg-destructive', icon: WifiOff };
    return { status: 'online', label: 'Live', color: 'bg-success', icon: Wifi };
  };
  
  const connection = getConnectionStatus();
  const ConnectionIcon = connection.icon;
  
  const lastUpdated = dataUpdatedAt 
    ? formatTime(new Date(dataUpdatedAt).toISOString()) 
    : 'Never';
  
  const activeDevices = data?.devices_summary?.devices?.filter(d => d.status === 'online').length ?? 0;

  return (
    <header className="relative z-10 border-b border-border/50 backdrop-blur-sm">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-aurora-cyan to-aurora-purple flex items-center justify-center animate-pulse-glow">
                <Server className="w-5 h-5 text-primary-foreground" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight glow-text text-primary">AURORA</h1>
              <p className="text-xs text-muted-foreground">Server Management</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
              Dashboard
            </a>
            <a href="#" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Servers
            </a>
            <a href="#" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Analytics
            </a>
            <a href="#" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Logs
            </a>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* Connection Status Indicator */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge 
                    variant="outline" 
                    className={`gap-1.5 px-2.5 py-1 cursor-default transition-all ${
                      connection.status === 'online' 
                        ? 'border-success/50 bg-success/10 text-success' 
                        : connection.status === 'offline'
                        ? 'border-destructive/50 bg-destructive/10 text-destructive'
                        : 'border-warning/50 bg-warning/10 text-warning'
                    }`}
                  >
                    <ConnectionIcon className={`w-3.5 h-3.5 ${connection.status === 'connecting' ? 'animate-pulse' : ''}`} />
                    <span className="text-xs font-medium">{connection.label}</span>
                    {connection.status === 'online' && (
                      <span className={`w-1.5 h-1.5 rounded-full ${connection.color} animate-pulse`} />
                    )}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  <div className="space-y-1">
                    <p className="font-medium">Aurora API Status</p>
                    <p className="text-muted-foreground">Last updated: {lastUpdated}</p>
                    {connection.status === 'online' && (
                      <p className="text-success flex items-center gap-1">
                        {activeDevices} devices online
                      </p>
                    )}
                    {isError && (
                      <p className="text-destructive flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Connection failed
                      </p>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
              <Bell className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
              <Settings className="w-5 h-5" />
            </Button>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-aurora-cyan to-aurora-green" />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
