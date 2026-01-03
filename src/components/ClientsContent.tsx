import { useState } from "react";
import { 
  Users, UserPlus, UserX, Trash2, RefreshCw, Search, CheckCircle, 
  Power, PowerOff, Ban, RotateCcw, Clock, History, ChevronDown
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { 
  useClientsByState, 
  useClientStatistics,
  useAdoptClientDirect,
  useRegisterClient,
  useDisableClient,
  useEnableClient,
  useSuspendClient,
  useSoftDeleteClient,
  useRestoreClient,
  useClientStateHistory,
  Client,
  ClientState
} from "@/hooks/useAuroraApi";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

const STATE_CONFIG: Record<ClientState, { label: string; color: string; icon: React.ElementType; description: string }> = {
  pending: { 
    label: "Pending", 
    color: "bg-warning/10 text-warning border-warning/30", 
    icon: Clock,
    description: "Sending data but not registered"
  },
  registered: { 
    label: "Registered", 
    color: "bg-info/10 text-info border-info/30", 
    icon: UserPlus,
    description: "Registered but not yet adopted"
  },
  adopted: { 
    label: "Adopted", 
    color: "bg-success/10 text-success border-success/30", 
    icon: CheckCircle,
    description: "Fully operational"
  },
  disabled: { 
    label: "Disabled", 
    color: "bg-muted text-muted-foreground border-muted-foreground/30", 
    icon: PowerOff,
    description: "Temporarily disabled"
  },
  suspended: { 
    label: "Suspended", 
    color: "bg-destructive/10 text-destructive border-destructive/30", 
    icon: Ban,
    description: "Requires reactivation"
  },
  deleted: { 
    label: "Deleted", 
    color: "bg-destructive/20 text-destructive border-destructive/50", 
    icon: Trash2,
    description: "Soft deleted (restorable)"
  },
};

const ClientsContent = () => {
  const { data: clientsData, isLoading, isError, refetch } = useClientsByState();
  const { data: statistics } = useClientStatistics();
  
  const adoptClient = useAdoptClientDirect();
  const registerClient = useRegisterClient();
  const disableClient = useDisableClient();
  const enableClient = useEnableClient();
  const suspendClient = useSuspendClient();
  const softDeleteClient = useSoftDeleteClient();
  const restoreClient = useRestoreClient();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [stateFilter, setStateFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [historyDialogClient, setHistoryDialogClient] = useState<string | null>(null);

  const formatLastSeen = (dateString: string | undefined | null) => {
    if (!dateString) return "Never";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Unknown";
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return "Unknown";
    }
  };

  const getActivityStatus = (client: Client): "online" | "offline" | "warning" => {
    const lastSeen = client.last_seen;
    if (!lastSeen) return "offline";
    try {
      const lastSeenDate = new Date(lastSeen);
      if (isNaN(lastSeenDate.getTime())) return "offline";
      const now = new Date();
      const diffMinutes = (now.getTime() - lastSeenDate.getTime()) / (1000 * 60);
      if (diffMinutes < 5) return "online";
      if (diffMinutes < 30) return "warning";
      return "offline";
    } catch {
      return "offline";
    }
  };

  const handleStateTransition = (
    clientId: string, 
    action: "adopt" | "register" | "disable" | "enable" | "suspend" | "delete" | "restore",
    hostname?: string
  ) => {
    const actionMap = {
      adopt: { fn: adoptClient, label: "adopted" },
      register: { fn: registerClient, label: "registered" },
      disable: { fn: disableClient, label: "disabled" },
      enable: { fn: enableClient, label: "enabled" },
      suspend: { fn: suspendClient, label: "suspended" },
      delete: { fn: softDeleteClient, label: "deleted" },
      restore: { fn: restoreClient, label: "restored" },
    };

    const { fn, label } = actionMap[action];
    fn.mutate(
      { clientId, reason: `Manual ${action} from dashboard` },
      {
        onSuccess: () => {
          toast.success(`Successfully ${label} ${hostname || clientId}`);
        },
        onError: (error) => {
          toast.error(`Failed to ${action} client: ${error.message}`);
        },
      }
    );
  };

  // Combine all clients from all states
  const allClients: Client[] = clientsData ? [
    ...(clientsData.clients_by_state?.pending || []),
    ...(clientsData.clients_by_state?.registered || []),
    ...(clientsData.clients_by_state?.adopted || []),
    ...(clientsData.clients_by_state?.disabled || []),
    ...(clientsData.clients_by_state?.suspended || []),
    ...(clientsData.clients_by_state?.deleted || []),
  ] : [];

  // Filter clients
  const filteredClients = allClients.filter((client) => {
    const matchesSearch = 
      client.hostname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.client_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.mac_address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.ip_address?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const clientState = client.state || "pending";
    const matchesState = stateFilter === "all" || clientState === stateFilter;
    const matchesTab = activeTab === "all" || clientState === activeTab;

    return matchesSearch && matchesState && matchesTab;
  });

  // Get counts by state
  const stateCounts = statistics?.by_state || {
    pending: clientsData?.clients_by_state?.pending?.length || 0,
    registered: clientsData?.clients_by_state?.registered?.length || 0,
    adopted: clientsData?.clients_by_state?.adopted?.length || 0,
    disabled: clientsData?.clients_by_state?.disabled?.length || 0,
    suspended: clientsData?.clients_by_state?.suspended?.length || 0,
    deleted: clientsData?.clients_by_state?.deleted?.length || 0,
  };

  const totalClients = statistics?.total || allClients.length;
  const activeClients = statistics?.summary?.active || stateCounts.adopted || 0;
  const needsAttention = statistics?.summary?.needs_attention || (stateCounts.pending + stateCounts.registered) || 0;
  const inactiveClients = statistics?.summary?.inactive || (stateCounts.disabled + stateCounts.suspended + stateCounts.deleted) || 0;

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6">
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="p-6 text-center">
            <p className="text-destructive">Failed to load clients. Please try again.</p>
            <Button variant="outline" onClick={() => refetch()} className="mt-4">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Client Management</h1>
          <p className="text-muted-foreground">Complete client lifecycle management with state tracking</p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalClients}</p>
                <p className="text-sm text-muted-foreground">Total Clients</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <CheckCircle className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeClients}</p>
                <p className="text-sm text-muted-foreground">Active (Adopted)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <Clock className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{needsAttention}</p>
                <p className="text-sm text-muted-foreground">Needs Attention</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <PowerOff className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{inactiveClients}</p>
                <p className="text-sm text-muted-foreground">Inactive</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* State Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-card/50 p-1">
          <TabsTrigger value="all" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            All ({totalClients})
          </TabsTrigger>
          {(Object.keys(STATE_CONFIG) as ClientState[]).map((state) => {
            const config = STATE_CONFIG[state];
            const Icon = config.icon;
            const count = stateCounts[state] || 0;
            return (
              <TabsTrigger 
                key={state} 
                value={state}
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Icon className="w-3.5 h-3.5 mr-1.5" />
                {config.label} ({count})
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      {/* Filters */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by hostname, client ID, MAC, or IP..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={stateFilter} onValueChange={setStateFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by state" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                {(Object.keys(STATE_CONFIG) as ClientState[]).map((state) => (
                  <SelectItem key={state} value={state}>
                    {STATE_CONFIG[state].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Clients List */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">
            Clients ({filteredClients.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredClients.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No clients found matching your criteria
            </div>
          ) : (
            <div className="space-y-3">
              {filteredClients.map((client) => {
                const activityStatus = getActivityStatus(client);
                const clientState = (client.state || "pending") as ClientState;
                const stateConfig = STATE_CONFIG[clientState];
                const StateIcon = stateConfig.icon;
                const batchCount = client.batch_count ?? client.batches_received ?? 0;

                return (
                  <div
                    key={client.client_id}
                    className="flex items-center justify-between p-4 rounded-lg bg-background/50 border border-border/50 hover:border-border transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                        activityStatus === "online" ? "bg-success animate-pulse" :
                        activityStatus === "warning" ? "bg-warning" : "bg-muted-foreground"
                      }`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium truncate">{client.hostname || client.client_id}</span>
                          <Badge variant="outline" className={`text-xs ${stateConfig.color}`}>
                            <StateIcon className="w-3 h-3 mr-1" />
                            {stateConfig.label}
                          </Badge>
                          <Badge variant="outline" className="text-xs capitalize">
                            {activityStatus}
                          </Badge>
                          {batchCount > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {batchCount} batches
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
                          <span className="truncate">ID: {client.client_id}</span>
                          {client.mac_address && <span>MAC: {client.mac_address}</span>}
                          {client.ip_address && <span>IP: {client.ip_address}</span>}
                          <span>Last seen: {formatLastSeen(client.last_seen)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Quick Actions based on state */}
                      <ClientActions 
                        client={client} 
                        clientState={clientState}
                        onAction={handleStateTransition}
                        onViewHistory={() => setHistoryDialogClient(client.client_id)}
                        isLoading={
                          adoptClient.isPending || 
                          registerClient.isPending || 
                          disableClient.isPending ||
                          enableClient.isPending ||
                          suspendClient.isPending ||
                          softDeleteClient.isPending ||
                          restoreClient.isPending
                        }
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* State History Dialog */}
      <ClientStateHistoryDialog 
        clientId={historyDialogClient} 
        onClose={() => setHistoryDialogClient(null)} 
      />
    </div>
  );
};

interface ClientActionsProps {
  client: Client;
  clientState: ClientState;
  onAction: (clientId: string, action: "adopt" | "register" | "disable" | "enable" | "suspend" | "delete" | "restore", hostname?: string) => void;
  onViewHistory: () => void;
  isLoading: boolean;
}

const ClientActions = ({ client, clientState, onAction, onViewHistory, isLoading }: ClientActionsProps) => {
  const primaryActions: Record<ClientState, { action: "adopt" | "register" | "enable" | "restore"; label: string; icon: React.ElementType; variant: "default" | "outline" }[]> = {
    pending: [
      { action: "adopt", label: "Adopt", icon: CheckCircle, variant: "default" },
    ],
    registered: [
      { action: "adopt", label: "Adopt", icon: CheckCircle, variant: "default" },
    ],
    adopted: [],
    disabled: [
      { action: "enable", label: "Enable", icon: Power, variant: "default" },
    ],
    suspended: [
      { action: "enable", label: "Reactivate", icon: RotateCcw, variant: "default" },
    ],
    deleted: [
      { action: "restore", label: "Restore", icon: RotateCcw, variant: "default" },
    ],
  };

  const actions = primaryActions[clientState] || [];

  return (
    <div className="flex items-center gap-2">
      {/* Primary action button */}
      {actions.map(({ action, label, icon: Icon, variant }) => (
        <Button
          key={action}
          variant={variant}
          size="sm"
          onClick={() => onAction(client.client_id, action, client.hostname)}
          disabled={isLoading}
          className={variant === "default" ? "bg-success hover:bg-success/90" : ""}
        >
          <Icon className="w-4 h-4 mr-1" />
          {label}
        </Button>
      ))}

      {/* More actions dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" disabled={isLoading}>
            <ChevronDown className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onViewHistory}>
            <History className="w-4 h-4 mr-2" />
            View History
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          {clientState === "pending" && (
            <DropdownMenuItem onClick={() => onAction(client.client_id, "register", client.hostname)}>
              <UserPlus className="w-4 h-4 mr-2" />
              Register Only
            </DropdownMenuItem>
          )}
          
          {clientState === "adopted" && (
            <>
              <DropdownMenuItem onClick={() => onAction(client.client_id, "disable", client.hostname)}>
                <PowerOff className="w-4 h-4 mr-2" />
                Disable
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onAction(client.client_id, "suspend", client.hostname)}
                className="text-warning"
              >
                <Ban className="w-4 h-4 mr-2" />
                Suspend
              </DropdownMenuItem>
            </>
          )}
          
          {(clientState === "disabled" || clientState === "suspended") && (
            <DropdownMenuItem 
              onClick={() => onAction(client.client_id, "delete", client.hostname)}
              className="text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete (Soft)
            </DropdownMenuItem>
          )}
          
          {clientState !== "deleted" && clientState !== "adopted" && (
            <DropdownMenuItem 
              onClick={() => onAction(client.client_id, "delete", client.hostname)}
              className="text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete (Soft)
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

interface ClientStateHistoryDialogProps {
  clientId: string | null;
  onClose: () => void;
}

const ClientStateHistoryDialog = ({ clientId, onClose }: ClientStateHistoryDialogProps) => {
  const { data: historyData, isLoading } = useClientStateHistory(clientId || "");

  return (
    <Dialog open={!!clientId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>State History</DialogTitle>
          <DialogDescription>
            {clientId && `Complete state transition history for ${clientId}`}
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : historyData?.state_history?.length ? (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {/* Current state */}
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
              <div className="flex items-center gap-2">
                <Badge className="bg-primary">{historyData.current_state}</Badge>
                <span className="text-sm text-muted-foreground">Current State</span>
              </div>
            </div>
            
            {/* History entries */}
            {historyData.state_history.slice().reverse().map((entry, index) => (
              <div key={index} className="p-3 rounded-lg bg-muted/50 border border-border/50">
                <div className="flex items-center gap-2 mb-1">
                  {entry.from_state && (
                    <>
                      <Badge variant="outline">{entry.from_state}</Badge>
                      <span className="text-muted-foreground">→</span>
                    </>
                  )}
                  <Badge variant="secondary">{entry.to_state}</Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}
                </div>
                {entry.reason && (
                  <div className="text-sm mt-1">{entry.reason}</div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No state history available
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ClientsContent;