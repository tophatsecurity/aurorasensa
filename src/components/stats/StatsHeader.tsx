import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface StatsHeaderProps {
  clients: Array<{ client_id: string; hostname?: string; name?: string }>;
  selectedClient: string;
  onClientChange: (clientId: string) => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export function StatsHeader({ 
  clients, 
  selectedClient, 
  onClientChange, 
  onRefresh, 
  isRefreshing 
}: StatsHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h1 className="text-2xl font-bold">Client Stats</h1>
        <p className="text-muted-foreground text-sm">
          Real-time sensor data and client overview
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Select value={selectedClient} onValueChange={onClientChange}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select Client" />
          </SelectTrigger>
          <SelectContent>
            {clients.map((client) => (
              <SelectItem key={client.client_id} value={client.client_id}>
                {client.hostname || client.name || client.client_id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Button 
          variant="outline" 
          size="icon" 
          onClick={onRefresh} 
          disabled={isRefreshing}
          title="Refresh data"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>
    </div>
  );
}