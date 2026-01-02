import { Cpu, HardDrive, Network, Clock, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import AuroraBackground from "@/components/AuroraBackground";
import Header from "@/components/Header";
import StatCard from "@/components/StatCard";
import ServerCard from "@/components/ServerCard";

const servers = [
  {
    name: "Production-01",
    location: "Frankfurt, DE",
    status: "online" as const,
    cpu: 45,
    memory: 62,
    disk: 38,
    ip: "192.168.1.101",
  },
  {
    name: "Production-02",
    location: "New York, US",
    status: "online" as const,
    cpu: 78,
    memory: 85,
    disk: 55,
    ip: "192.168.1.102",
  },
  {
    name: "Staging-01",
    location: "London, UK",
    status: "warning" as const,
    cpu: 92,
    memory: 88,
    disk: 72,
    ip: "192.168.1.103",
  },
  {
    name: "Development-01",
    location: "Tokyo, JP",
    status: "online" as const,
    cpu: 23,
    memory: 41,
    disk: 29,
    ip: "192.168.1.104",
  },
  {
    name: "Backup-01",
    location: "Sydney, AU",
    status: "offline" as const,
    cpu: 0,
    memory: 0,
    disk: 85,
    ip: "192.168.1.105",
  },
  {
    name: "Database-01",
    location: "Singapore, SG",
    status: "online" as const,
    cpu: 56,
    memory: 71,
    disk: 63,
    ip: "192.168.1.106",
  },
];

const Index = () => {
  return (
    <div className="min-h-screen relative">
      <AuroraBackground />
      <Header />
      
      <main className="relative z-10 container mx-auto px-6 py-8">
        {/* Hero Section */}
        <section className="mb-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-2">
                Welcome back, <span className="text-primary glow-text">Admin</span>
              </h2>
              <p className="text-muted-foreground">
                Monitor and manage your server infrastructure in real-time.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" className="gap-2 border-border/50 hover:border-primary/50">
                <RefreshCw className="w-4 h-4" />
                Refresh
              </Button>
              <Button size="sm" className="gap-2 bg-gradient-to-r from-aurora-cyan to-aurora-purple hover:opacity-90 text-primary-foreground">
                <Plus className="w-4 h-4" />
                Add Server
              </Button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="CPU Usage"
              value="58%"
              subtitle="Average across all servers"
              icon={Cpu}
              color="cyan"
              trend={{ value: "3.2%", positive: false }}
            />
            <StatCard
              title="Memory"
              value="12.4 GB"
              subtitle="of 32 GB allocated"
              icon={HardDrive}
              color="purple"
              trend={{ value: "1.8%", positive: true }}
            />
            <StatCard
              title="Network"
              value="2.4 TB"
              subtitle="Monthly bandwidth"
              icon={Network}
              color="green"
              trend={{ value: "12%", positive: true }}
            />
            <StatCard
              title="Uptime"
              value="99.9%"
              subtitle="Last 30 days"
              icon={Clock}
              color="blue"
            />
          </div>
        </section>

        {/* Servers Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold mb-1">Active Servers</h3>
              <p className="text-sm text-muted-foreground">
                {servers.filter(s => s.status === 'online').length} of {servers.length} servers online
              </p>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full status-online" />
                <span className="text-muted-foreground">Online</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full status-warning" />
                <span className="text-muted-foreground">Warning</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full status-offline" />
                <span className="text-muted-foreground">Offline</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {servers.map((server) => (
              <ServerCard key={server.name} {...server} />
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-border/30 text-center">
          <p className="text-sm text-muted-foreground">
            AURORA Server Management System • v1.0.0
          </p>
        </footer>
      </main>
    </div>
  );
};

export default Index;
