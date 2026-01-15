import { Server, Bell, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuroraAuthContext } from "@/hooks/useAuroraAuth";
import ConnectionStatusIndicator from "./ConnectionStatusIndicator";
import { UserMenu } from "./UserMenu";

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
            
            {/* User Menu with Logout */}
            {user && <UserMenu />}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
