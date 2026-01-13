import { Server, Bell, Settings, Shield, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuroraAuthContext } from "@/hooks/useAuroraAuth";
import ConnectionStatusIndicator from "./ConnectionStatusIndicator";

const Header = () => {
  const { user, isAdmin } = useAuroraAuthContext();

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
              <h1 className="text-xl font-bold tracking-tight glow-text text-primary">
                AURORA<span className="text-aurora-cyan">SENSE</span>
              </h1>
              <p className="text-xs text-muted-foreground">v2.1.2</p>
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
            <ConnectionStatusIndicator />
            
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
              <Bell className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
              <Settings className="w-5 h-5" />
            </Button>
            
            {/* User Info with Role Badge */}
            {user && (
              <div className="flex items-center gap-2">
                <div className="flex flex-col items-end">
                  <span className="text-sm font-medium">{user.username}</span>
                  <Badge 
                    variant={isAdmin ? "default" : "secondary"}
                    className={`text-xs px-1.5 py-0 h-4 ${
                      isAdmin 
                        ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0" 
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {isAdmin ? (
                      <><Shield className="w-2.5 h-2.5 mr-0.5" /> Admin</>
                    ) : (
                      <><User className="w-2.5 h-2.5 mr-0.5" /> User</>
                    )}
                  </Badge>
                </div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  isAdmin 
                    ? "bg-gradient-to-br from-amber-500 to-orange-500" 
                    : "bg-gradient-to-br from-aurora-cyan to-aurora-green"
                }`}>
                  {isAdmin ? (
                    <Shield className="w-4 h-4 text-white" />
                  ) : (
                    <User className="w-4 h-4 text-white" />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
