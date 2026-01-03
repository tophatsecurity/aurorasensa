import { 
  LayoutDashboard, 
  Map, 
  Cpu, 
  Bell, 
  FileText, 
  Thermometer, 
  Zap, 
  Database, 
  Download, 
  Activity, 
  Settings,
  Server,
  Satellite,
  ScrollText
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  activeItem: string;
  onNavigate: (item: string) => void;
}

const menuSections = [
  {
    title: "OVERVIEW",
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "map", label: "Map", icon: Map },
      { id: "devices", label: "Devices", icon: Cpu },
      { id: "alerts", label: "Alerts", icon: Bell },
      { id: "rules", label: "Rules", icon: FileText },
    ],
  },
  {
    title: "DATA & ANALYTICS",
    items: [
      { id: "sensors", label: "Sensors", icon: Thermometer },
      { id: "starlink", label: "Starlink", icon: Satellite },
      { id: "power", label: "Power", icon: Zap },
      { id: "data-batches", label: "Data Batches", icon: Database },
      { id: "export", label: "Export", icon: Download },
    ],
  },
  {
    title: "SYSTEM",
    items: [
      { id: "performance", label: "Performance", icon: Activity },
      { id: "audit-logs", label: "Audit Logs", icon: ScrollText },
      { id: "settings", label: "Settings", icon: Settings },
    ],
  },
];

const Sidebar = ({ activeItem, onNavigate }: SidebarProps) => {
  return (
    <aside className="w-64 min-h-screen bg-sidebar-background border-r border-sidebar-border flex flex-col relative z-20 shrink-0">
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-aurora-cyan to-aurora-purple flex items-center justify-center animate-pulse-glow">
            <Server className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight glow-text text-primary">AURORASENSE</h1>
            <p className="text-xs text-muted-foreground">Server Dashboard</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {menuSections.map((section) => (
          <div key={section.title} className="mb-6">
            <h3 className="px-6 mb-2 text-xs font-semibold text-muted-foreground tracking-wider">
              {section.title}
            </h3>
            <ul className="space-y-1 px-3">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeItem === item.id;
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => onNavigate(item.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                      )}
                    >
                      <Icon className={cn("w-5 h-5", isActive && "text-primary")} />
                      {item.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-sm">
            U
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">User</p>
            <p className="text-xs text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
