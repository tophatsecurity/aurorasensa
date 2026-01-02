import { Cpu, HardDrive, Network, Clock, Plus, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import AuroraBackground from "@/components/AuroraBackground";
import Header from "@/components/Header";
import StatCard from "@/components/StatCard";
import ServerCard from "@/components/ServerCard";
import { useServers } from "@/hooks/useServers";
import { useQueryClient } from "@tanstack/react-query";

const Index = () => {
  const { data: servers, isLoading, error } = useServers();
  const queryClient = useQueryClient();

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["servers"] });
  };

  // Calculate stats from real data
  const onlineCount = servers?.filter(s => s.status === 'online').length ?? 0;
  const totalCount = servers?.length ?? 0;
  const avgCpu = servers?.length 
    ? Math.round(servers.reduce((acc, s) => acc + s.cpu, 0) / servers.length) 
    : 0;
  const avgMemory = servers?.length 
    ? Math.round(servers.reduce((acc, s) => acc + s.memory, 0) / servers.length) 
    : 0;

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
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2 border-border/50 hover:border-primary/50"
                onClick={handleRefresh}
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
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
              value={`${avgCpu}%`}
              subtitle="Average across all servers"
              icon={Cpu}
              color="cyan"
              trend={{ value: "3.2%", positive: false }}
            />
            <StatCard
              title="Memory"
              value={`${avgMemory}%`}
              subtitle="Average usage"
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
                {onlineCount} of {totalCount} servers online
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

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-center py-12 text-destructive">
              Failed to load servers. Please try again.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {servers?.map((server) => (
                <ServerCard key={server.id} {...server} />
              ))}
            </div>
          )}
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
