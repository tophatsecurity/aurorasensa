import { useState } from "react";
import { Users, UserPlus, UserX, Trash2, RefreshCw, Search, CheckCircle } from "lucide-react";
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
import { useClients, useDeleteClient, useAdoptClient, Client } from "@/hooks/useAuroraApi";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

const ClientsContent = () => {
  const { data: clients, isLoading, isError, refetch } = useClients();
  const deleteClient = useDeleteClient();
  const adoptClient = useAdoptClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [adoptionFilter, setAdoptionFilter] = useState<string>("all");

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

  const getClientStatus = (client: Client): "online" | "offline" | "warning" => {
    if (client.status === "online" || client.status === "offline" || client.status === "warning") {
      return client.status;
    }
    const lastSeen = client.metadata?.last_seen || client.last_seen;
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

  const isClientAdopted = (client: Client): boolean => {
    return !!(client.adopted_at && client.adopted_at !== null);
  };

  const handleDelete = (clientId: string) => {
    deleteClient.mutate(clientId);
  };

  const handleAdopt = (clientId: string, hostname: string) => {
    adoptClient.mutate(clientId, {
      onSuccess: () => {
        toast.success(`Successfully adopted ${hostname || clientId}`);
      },
      onError: (error) => {
        toast.error(`Failed to adopt client: ${error.message}`);
      },
    });
  };

  // Filter clients
  const filteredClients = clients?.filter((client) => {
    const matchesSearch = 
      client.hostname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.mac_address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.ip_address?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const status = getClientStatus(client);
    const matchesStatus = statusFilter === "all" || status === statusFilter;
    
    const isAdopted = isClientAdopted(client);
    const matchesAdoption = 
      adoptionFilter === "all" || 
      (adoptionFilter === "adopted" && isAdopted) ||
      (adoptionFilter === "unadopted" && !isAdopted);

    return matchesSearch && matchesStatus && matchesAdoption;
  }) ?? [];

  // Stats
  const totalClients = clients?.length ?? 0;
  const adoptedClients = clients?.filter(c => isClientAdopted(c)).length ?? 0;
  const unadoptedClients = totalClients - adoptedClients;
  const onlineClients = clients?.filter(c => getClientStatus(c) === "online").length ?? 0;

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
          <h1 className="text-2xl font-bold text-foreground">Clients</h1>
          <p className="text-muted-foreground">Manage and monitor all connected clients</p>
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
                <UserPlus className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{adoptedClients}</p>
                <p className="text-sm text-muted-foreground">Adopted</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <UserX className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{unadoptedClients}</p>
                <p className="text-sm text-muted-foreground">Needs Adoption</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-aurora-cyan/10">
                <RefreshCw className="w-5 h-5 text-aurora-cyan" />
              </div>
              <div>
                <p className="text-2xl font-bold">{onlineClients}</p>
                <p className="text-sm text-muted-foreground">Online Now</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by hostname, MAC, or IP..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="offline">Offline</SelectItem>
              </SelectContent>
            </Select>
            <Select value={adoptionFilter} onValueChange={setAdoptionFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Adoption" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clients</SelectItem>
                <SelectItem value="adopted">Adopted</SelectItem>
                <SelectItem value="unadopted">Needs Adoption</SelectItem>
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
                const status = getClientStatus(client);
                const isAdopted = isClientAdopted(client);
                const canDelete = !isAdopted || status === "offline";
                const lastSeen = client.metadata?.last_seen || client.last_seen;
                const clientId = client.client_id;

                return (
                  <div
                    key={clientId}
                    className="flex items-center justify-between p-4 rounded-lg bg-background/50 border border-border/50 hover:border-border transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full ${
                        status === "online" ? "bg-success animate-pulse" :
                        status === "warning" ? "bg-warning" : "bg-muted-foreground"
                      }`} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{client.hostname || "Unknown"}</span>
                          <Badge variant={isAdopted ? "default" : "secondary"} className="text-xs">
                            {isAdopted ? "Adopted" : "Needs Adoption"}
                          </Badge>
                          <Badge variant="outline" className="text-xs capitalize">
                            {status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <span>MAC: {client.mac_address || "N/A"}</span>
                          <span>IP: {client.ip_address || "N/A"}</span>
                          <span>Last seen: {formatLastSeen(lastSeen)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Adopt Button - only for unadopted clients */}
                      {!isAdopted && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAdopt(clientId, client.hostname)}
                          disabled={adoptClient.isPending}
                          className="text-success border-success/50 hover:bg-success/10 hover:text-success"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Adopt
                        </Button>
                      )}

                      {/* Delete Button - only for unadopted or offline */}
                      {canDelete && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              disabled={deleteClient.isPending}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Client</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{client.hostname || client.mac_address}"? 
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(clientId)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientsContent;
