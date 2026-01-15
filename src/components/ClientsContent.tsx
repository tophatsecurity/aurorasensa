import { useState, useMemo } from "react";
import { 
  Users, UserPlus, UserX, Trash2, RefreshCw, Search, CheckCircle, 
  Power, PowerOff, Ban, RotateCcw, Clock, History, ChevronDown, ChevronUp, Pencil,
  Cpu, Wifi, Radio, Plane, Navigation, Thermometer, Bluetooth, Monitor, Satellite,
  Server, Activity, Eye, CheckSquare, Square, XSquare, Download
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
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
  DialogFooter,
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { 
  useClientsByState, 
  useClientStatistics,
  useRegisterClient,
  useDisableClient,
  useEnableClient,
  useSuspendClient,
  useSoftDeleteClient,
  useRestoreClient,
  useDeleteClient,
  useClientStateHistory,
  useRenameClient,
  useLatestReadings,
  useDeleteSensor,
  type Client,
  type ClientState,
  callAuroraApi,
} from "@/hooks/aurora";
import { useAdoptClientDirect } from "@/hooks/useAuroraApi";
import { formatLastSeen, formatDateTime, getDeviceStatusFromLastSeen } from "@/utils/dateUtils";
import { toast } from "sonner";
import DeviceDetailDialog from "./DeviceDetailDialog";

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

// Sensor icon and color helpers
const getSensorIcon = (sensorId: string) => {
  const id = sensorId.toLowerCase();
  if (id.includes('arduino')) return Cpu;
  if (id.includes('lora')) return Radio;
  if (id.includes('starlink')) return Satellite;
  if (id.includes('wifi')) return Wifi;
  if (id.includes('bluetooth') || id.includes('ble')) return Bluetooth;
  if (id.includes('adsb')) return Plane;
  if (id.includes('gps')) return Navigation;
  if (id.includes('thermal')) return Thermometer;
  if (id.includes('system')) return Monitor;
  return Cpu;
};

const getSensorColor = (sensorId: string) => {
  const id = sensorId.toLowerCase();
  if (id.includes('arduino')) return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
  if (id.includes('lora')) return 'bg-red-500/20 text-red-400 border-red-500/30';
  if (id.includes('starlink')) return 'bg-violet-500/20 text-violet-400 border-violet-500/30';
  if (id.includes('wifi')) return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
  if (id.includes('bluetooth') || id.includes('ble')) return 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30';
  if (id.includes('adsb')) return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
  if (id.includes('gps')) return 'bg-green-500/20 text-green-400 border-green-500/30';
  if (id.includes('thermal')) return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
  if (id.includes('system')) return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  return 'bg-primary/20 text-primary border-primary/30';
};

const ClientsContent = () => {
  const { data: clientsData, isLoading, isError, refetch } = useClientsByState();
  const { data: statistics } = useClientStatistics();
  const { data: latestReadings } = useLatestReadings();
  const adoptClient = useAdoptClientDirect();
  const registerClient = useRegisterClient();
  const disableClient = useDisableClient();
  const enableClient = useEnableClient();
  const suspendClient = useSuspendClient();
  const softDeleteClient = useSoftDeleteClient();
  const restoreClient = useRestoreClient();
  const deleteClient = useDeleteClient();
  const deleteSensor = useDeleteSensor();
  const renameClient = useRenameClient();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [stateFilter, setStateFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [historyDialogClient, setHistoryDialogClient] = useState<string | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [editHostname, setEditHostname] = useState("");
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  const [detailClient, setDetailClient] = useState<Client | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [deleteConfirmClient, setDeleteConfirmClient] = useState<Client | null>(null);
  
  // Bulk selection state
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set());
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const getActivityStatus = (client: Client): "online" | "offline" | "warning" => {
    const status = getDeviceStatusFromLastSeen(client.last_seen);
    if (status === 'stale') return 'warning';
    return status;
  };

  // Get sensors for a client
  const getClientSensors = (client: Client) => {
    return client.sensors || [];
  };

  // Get latest readings for a specific client's sensors
  const getClientSensorReadings = (clientId: string) => {
    if (!latestReadings) return [];
    return latestReadings.filter(r => r.device_id?.includes(clientId));
  };

  const toggleClientExpanded = (clientId: string) => {
    setExpandedClients(prev => {
      const next = new Set(prev);
      if (next.has(clientId)) {
        next.delete(clientId);
      } else {
        next.add(clientId);
      }
      return next;
    });
  };

  const handleStateTransition = (
    clientId: string, 
    action: "adopt" | "register" | "disable" | "enable" | "suspend" | "delete" | "restore",
    hostname?: string
  ) => {
    const actionMap = {
      register: { fn: registerClient, label: "registered" },
      disable: { fn: disableClient, label: "disabled" },
      enable: { fn: enableClient, label: "enabled" },
      suspend: { fn: suspendClient, label: "suspended" },
      delete: { fn: softDeleteClient, label: "deleted" },
      restore: { fn: restoreClient, label: "restored" },
    };

    // Handle adopt separately due to different signature
    if (action === "adopt") {
      adoptClient.mutate(clientId, {
        onSuccess: () => {
          toast.success(`Successfully adopted ${hostname || clientId}`);
          refetch();
        },
        onError: (error: Error) => {
          toast.error(`Failed to adopt: ${error.message}`);
        },
      });
      return;
    }

    const { fn, label } = actionMap[action as keyof typeof actionMap];
    fn.mutate(
      { clientId, reason: `Manual ${action} from dashboard` },
      {
        onSuccess: () => {
          toast.success(`Successfully ${label} ${hostname || clientId}`);
          // Force refetch to ensure UI updates immediately
          refetch();
        },
        onError: (error) => {
          toast.error(`Failed to ${action} client: ${error.message}`);
        },
      }
    );
  };

  const handlePermanentDelete = (client: Client) => {
    setDeleteConfirmClient(client);
  };

  const confirmPermanentDelete = async () => {
    if (!deleteConfirmClient) return;
    
    const clientName = deleteConfirmClient.hostname || deleteConfirmClient.client_id;
    const sensors = deleteConfirmClient.sensors || [];
    
    try {
      // First, delete all sensors/devices associated with this client
      if (sensors.length > 0) {
        toast.info(`Removing ${sensors.length} sensor(s) from ${clientName}...`);
        
        // Delete sensors in parallel
        const sensorDeletePromises = sensors.map(sensorId => 
          new Promise<void>((resolve, reject) => {
            deleteSensor.mutate(sensorId, {
              onSuccess: () => resolve(),
              onError: (error) => {
                // Don't fail if sensor not found - it may already be deleted
                if (error.message?.includes('not found')) {
                  resolve();
                } else {
                  reject(error);
                }
              },
            });
          })
        );
        
        await Promise.all(sensorDeletePromises);
      }
      
      // Then delete the client itself
      deleteClient.mutate(deleteConfirmClient.client_id, {
        onSuccess: () => {
          toast.success(`Permanently removed ${clientName} and ${sensors.length} sensor(s)`);
          setDeleteConfirmClient(null);
          refetch(); // Refresh client list
        },
        onError: (error) => {
          // Handle "not found" as already deleted
          if (error.message?.includes('not found')) {
            toast.info(`Client ${clientName} was already removed`);
            refetch(); // Refresh to sync state
          } else {
            toast.error(`Failed to remove client: ${error.message}`);
          }
          setDeleteConfirmClient(null); // Close dialog on error too
        },
      });
    } catch (error: any) {
      toast.error(`Failed to remove sensors: ${error.message}`);
      setDeleteConfirmClient(null);
    }
  };

  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    setEditHostname(client.hostname || "");
  };

  const handleSaveRename = () => {
    if (!editingClient || !editHostname.trim()) return;
    
    renameClient.mutate(
      { clientId: editingClient.client_id, hostname: editHostname.trim() },
      {
        onSuccess: () => {
          toast.success(`Successfully renamed client to "${editHostname.trim()}"`);
          setEditingClient(null);
          setEditHostname("");
        },
        onError: (error) => {
          toast.error(`Failed to rename client: ${error.message}`);
        },
      }
    );
  };

  const handleViewDetails = (client: Client) => {
    setDetailClient(client);
    setDetailsOpen(true);
  };

  const handleDownloadBatch = async (client: Client) => {
    const clientName = client.hostname || client.client_id;
    try {
      toast.info(`Fetching latest batch for ${clientName}...`);
      
      // Fetch batches for this client
      const batchesResponse = await callAuroraApi<{ batches: Array<{ batch_id: string; client_id: string; timestamp?: string }> }>(
        `/api/batches/list?limit=50`
      );
      const batches = batchesResponse.batches || [];
      
      // Find the most recent batch for this client
      const clientBatch = batches.find(b => {
        // Match by client_id directly or extract from batch_id
        if (b.client_id === client.client_id) return true;
        if (b.batch_id.includes(client.client_id)) return true;
        // Handle "unknown" client_id with client_xxx pattern in batch_id
        if (b.client_id === "unknown" && client.client_id.startsWith("client_")) {
          const clientHash = client.client_id.replace("client_", "");
          return b.batch_id.includes(clientHash);
        }
        return false;
      });
      
      if (!clientBatch) {
        toast.error(`No batches found for ${clientName}`);
        return;
      }
      
      // Fetch the full batch data
      const batchData = await callAuroraApi<Record<string, unknown>>(`/api/batches/${clientBatch.batch_id}`);
      
      // Create and download JSON file
      const blob = new Blob([JSON.stringify(batchData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${clientName}_batch_${clientBatch.batch_id}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success(`Downloaded latest batch for ${clientName}`);
    } catch (error: any) {
      toast.error(`Failed to download batch: ${error.message}`);
    }
  };

  // Bulk selection handlers
  const toggleClientSelection = (clientId: string) => {
    setSelectedClients(prev => {
      const next = new Set(prev);
      if (next.has(clientId)) {
        next.delete(clientId);
      } else {
        next.add(clientId);
      }
      return next;
    });
  };

  const selectAllVisible = () => {
    const visibleIds = filteredClients.map(c => c.client_id);
    setSelectedClients(new Set(visibleIds));
  };

  const clearSelection = () => {
    setSelectedClients(new Set());
  };

  const getSelectedClients = (): Client[] => {
    return allClientsIncludingDeleted.filter(c => selectedClients.has(c.client_id));
  };

  const getTotalSensorsInSelection = (): number => {
    return getSelectedClients().reduce((acc, client) => acc + (client.sensors?.length || 0), 0);
  };

  const confirmBulkDelete = async () => {
    const clientsToDelete = getSelectedClients();
    if (clientsToDelete.length === 0) return;
    
    setIsBulkDeleting(true);
    let deletedCount = 0;
    let sensorDeletedCount = 0;
    let errorCount = 0;
    
    try {
      for (const client of clientsToDelete) {
        const sensors = client.sensors || [];
        
        // Delete sensors first
        for (const sensorId of sensors) {
          try {
            await new Promise<void>((resolve, reject) => {
              deleteSensor.mutate(sensorId, {
                onSuccess: () => {
                  sensorDeletedCount++;
                  resolve();
                },
                onError: (error) => {
                  if (error.message?.includes('not found')) {
                    resolve();
                  } else {
                    reject(error);
                  }
                },
              });
            });
          } catch (e) {
            // Continue even if sensor deletion fails
          }
        }
        
        // Delete the client
        try {
          await new Promise<void>((resolve, reject) => {
            deleteClient.mutate(client.client_id, {
              onSuccess: () => {
                deletedCount++;
                resolve();
              },
              onError: (error) => {
                if (error.message?.includes('not found')) {
                  resolve();
                } else {
                  errorCount++;
                  reject(error);
                }
              },
            });
          });
        } catch (e) {
          errorCount++;
        }
      }
      
      if (deletedCount > 0) {
        toast.success(`Permanently removed ${deletedCount} client(s) and ${sensorDeletedCount} sensor(s)`);
      }
      if (errorCount > 0) {
        toast.warning(`Failed to remove ${errorCount} client(s)`);
      }
    } finally {
      setIsBulkDeleting(false);
      setBulkDeleteConfirm(false);
      setSelectedClients(new Set());
      refetch();
    }
  };

  // Combine all clients from all states (excluding deleted for main datasets)
  const allClientsIncludingDeleted: Client[] = clientsData ? [
    ...(clientsData.clients_by_state?.pending || []),
    ...(clientsData.clients_by_state?.registered || []),
    ...(clientsData.clients_by_state?.adopted || []),
    ...(clientsData.clients_by_state?.disabled || []),
    ...(clientsData.clients_by_state?.suspended || []),
    ...(clientsData.clients_by_state?.deleted || []),
  ] : [];

  // Active clients (excluding deleted) for stats and general use
  const allClients = allClientsIncludingDeleted.filter(c => c.state !== "deleted");
  
  // Deleted clients only shown when specifically viewing deleted tab
  const deletedClients = clientsData?.clients_by_state?.deleted || [];

  // Filter clients based on current view
  const filteredClients = (activeTab === "deleted" ? deletedClients : allClients).filter((client) => {
    const matchesSearch = 
      client.hostname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.client_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.mac_address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.ip_address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.sensors?.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));
    
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

  // Stats exclude deleted clients
  const totalClients = statistics?.total ? (statistics.total - (stateCounts.deleted || 0)) : allClients.length;
  const activeClients = statistics?.summary?.active || stateCounts.adopted || 0;
  const needsAttention = statistics?.summary?.needs_attention || (stateCounts.pending + stateCounts.registered) || 0;
  const inactiveClients = (stateCounts.disabled + stateCounts.suspended) || 0;
  const totalSensors = allClients.reduce((acc, client) => acc + (client.sensors?.length || 0), 0);

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
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Clients & Sensors</h1>
            <p className="text-muted-foreground">Manage clients and their attached sensors</p>
          </div>
          <Badge className="bg-primary/20 text-primary border-primary/30 px-3 py-1">
            {totalClients} Clients
          </Badge>
          <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 px-3 py-1">
            {totalSensors} Sensors
          </Badge>
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
              <div className="p-2 rounded-lg bg-cyan-500/10">
                <Activity className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalSensors}</p>
                <p className="text-sm text-muted-foreground">Total Sensors</p>
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
                placeholder="Search by hostname, client ID, MAC, IP, or sensor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={stateFilter} onValueChange={setStateFilter}>
              <SelectTrigger className="w-full md:w-48 bg-background">
                <SelectValue placeholder="Filter by state" />
              </SelectTrigger>
              <SelectContent className="bg-background border border-border z-50">
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

      {/* Bulk Actions Bar */}
      {selectedClients.size > 0 && (
        <Card className="bg-primary/10 border-primary/30 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <CheckSquare className="w-5 h-5 text-primary" />
                <span className="font-medium">
                  {selectedClients.size} client(s) selected
                </span>
                <span className="text-muted-foreground text-sm">
                  ({getTotalSensorsInSelection()} sensors)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={clearSelection}>
                  <XSquare className="w-4 h-4 mr-2" />
                  Clear Selection
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={() => setBulkDeleteConfirm(true)}
                  disabled={isBulkDeleting}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Selected
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Clients List */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              Clients ({filteredClients.length})
            </CardTitle>
            {filteredClients.length > 0 && (
              <Button variant="ghost" size="sm" onClick={selectAllVisible} className="text-muted-foreground">
                <CheckSquare className="w-4 h-4 mr-2" />
                Select All Visible
              </Button>
            )}
          </div>
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
                const sensors = getClientSensors(client);
                const isExpanded = expandedClients.has(client.client_id);

                return (
                  <Collapsible
                    key={client.client_id}
                    open={isExpanded}
                    onOpenChange={() => toggleClientExpanded(client.client_id)}
                  >
                    <div className={`rounded-lg bg-background/50 border transition-colors ${
                      selectedClients.has(client.client_id) 
                        ? "border-primary/50 bg-primary/5" 
                        : "border-border/50 hover:border-border"
                    }`}>
                      <div className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          {/* Selection Checkbox */}
                          <Checkbox
                            checked={selectedClients.has(client.client_id)}
                            onCheckedChange={() => toggleClientSelection(client.client_id)}
                            className="flex-shrink-0"
                          />
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
                            
                            {/* Sensors Badge Row */}
                            {sensors.length > 0 && (
                              <div className="flex items-center gap-2 mt-2 flex-wrap">
                                <span className="text-xs text-muted-foreground">Sensors:</span>
                                {sensors.slice(0, 5).map((sensorId) => {
                                  const SensorIcon = getSensorIcon(sensorId);
                                  return (
                                    <Badge 
                                      key={sensorId} 
                                      variant="outline" 
                                      className={`text-[10px] px-2 py-0.5 gap-1 ${getSensorColor(sensorId)}`}
                                    >
                                      <SensorIcon className="w-3 h-3" />
                                      {sensorId.replace(/_/g, ' ').replace(/\d+$/, '').trim()}
                                    </Badge>
                                  );
                                })}
                                {sensors.length > 5 && (
                                  <Badge variant="secondary" className="text-[10px]">
                                    +{sensors.length - 5} more
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          {/* Expand/Collapse for sensors */}
                          {sensors.length > 0 && (
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="sm" className="gap-1">
                                <Activity className="w-4 h-4" />
                                {sensors.length}
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </Button>
                            </CollapsibleTrigger>
                          )}

                          {/* View Details */}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewDetails(client)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>

                          {/* Client Actions */}
                          <ClientActions 
                            client={client} 
                            clientState={clientState}
                            onAction={handleStateTransition}
                            onPermanentDelete={() => handlePermanentDelete(client)}
                            onViewHistory={() => setHistoryDialogClient(client.client_id)}
                            onEdit={() => handleEditClient(client)}
                            onDownloadBatch={() => handleDownloadBatch(client)}
                            isLoading={
                              adoptClient.isPending || 
                              registerClient.isPending || 
                              disableClient.isPending ||
                              enableClient.isPending ||
                              suspendClient.isPending ||
                              softDeleteClient.isPending ||
                              restoreClient.isPending ||
                              deleteClient.isPending ||
                              renameClient.isPending
                            }
                          />
                        </div>
                      </div>

                      {/* Expanded Sensors Section */}
                      <CollapsibleContent>
                        <div className="px-4 pb-4 border-t border-border/50 pt-4">
                          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                            <Activity className="w-4 h-4 text-primary" />
                            Attached Sensors ({sensors.length})
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {sensors.map((sensorId) => {
                              const SensorIcon = getSensorIcon(sensorId);
                              const readings = getClientSensorReadings(client.client_id).filter(r => 
                                r.device_type?.toLowerCase().includes(sensorId.split('_')[0]?.toLowerCase() || '')
                              );
                              const latestReading = readings[0];

                              return (
                                <div 
                                  key={sensorId}
                                  className={`p-3 rounded-lg border ${getSensorColor(sensorId)} bg-card/30`}
                                >
                                  <div className="flex items-center gap-2 mb-2">
                                    <SensorIcon className="w-4 h-4" />
                                    <span className="font-medium text-sm">
                                      {sensorId.replace(/_/g, ' ')}
                                    </span>
                                  </div>
                                  {latestReading ? (
                                    <div className="space-y-1 text-xs text-muted-foreground">
                                      <p>Device: {latestReading.device_id}</p>
                                      <p>Last reading: {formatLastSeen(latestReading.timestamp)}</p>
                                      {latestReading.data && typeof latestReading.data === 'object' && (
                                        <div className="mt-2 pt-2 border-t border-border/30">
                                          {Object.entries(latestReading.data as Record<string, unknown>).slice(0, 3).map(([key, value]) => (
                                            <p key={key} className="truncate">
                                              <span className="capitalize">{key.replace(/_/g, ' ')}:</span>{' '}
                                              <span className="text-foreground">
                                                {typeof value === 'number' ? value.toFixed(2) : String(value)}
                                              </span>
                                            </p>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-muted-foreground">No recent readings</p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
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

      {/* Device Detail Dialog */}
      <DeviceDetailDialog 
        client={detailClient}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />

      {/* Edit Client Dialog */}
      <Dialog open={!!editingClient} onOpenChange={(open) => !open && setEditingClient(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
            <DialogDescription>
              Update the hostname for {editingClient?.client_id}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="hostname">Hostname / Name</Label>
              <Input
                id="hostname"
                value={editHostname}
                onChange={(e) => setEditHostname(e.target.value)}
                placeholder="Enter client hostname"
                maxLength={100}
              />
            </div>
            
            {editingClient && (
              <div className="text-sm text-muted-foreground space-y-1">
                <p><span className="font-medium">Client ID:</span> {editingClient.client_id}</p>
                {editingClient.mac_address && (
                  <p><span className="font-medium">MAC:</span> {editingClient.mac_address}</p>
                )}
                {editingClient.ip_address && (
                  <p><span className="font-medium">IP:</span> {editingClient.ip_address}</p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingClient(null)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveRename}
              disabled={renameClient.isPending || !editHostname.trim()}
            >
              {renameClient.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permanent Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmClient} onOpenChange={(open) => !open && setDeleteConfirmClient(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently Remove Client?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                This will permanently remove <span className="font-semibold">{deleteConfirmClient?.hostname || deleteConfirmClient?.client_id}</span> and all associated data.
              </p>
              {deleteConfirmClient?.sensors && deleteConfirmClient.sensors.length > 0 && (
                <p className="text-warning">
                  This will also delete {deleteConfirmClient.sensors.length} sensor(s)/device(s): {deleteConfirmClient.sensors.slice(0, 3).join(", ")}{deleteConfirmClient.sensors.length > 3 ? ` and ${deleteConfirmClient.sensors.length - 3} more` : ""}
                </p>
              )}
              <p className="text-destructive font-medium">This action cannot be undone.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmPermanentDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteClient.isPending || deleteSensor.isPending ? "Removing..." : "Remove Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={bulkDeleteConfirm} onOpenChange={(open) => !open && !isBulkDeleting && setBulkDeleteConfirm(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently Remove {selectedClients.size} Client(s)?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                This will permanently remove <span className="font-semibold">{selectedClients.size} client(s)</span> and all associated data.
              </p>
              {getTotalSensorsInSelection() > 0 && (
                <p className="text-warning">
                  This will also delete <span className="font-semibold">{getTotalSensorsInSelection()}</span> sensor(s)/device(s) across all selected clients.
                </p>
              )}
              <div className="mt-3 max-h-32 overflow-y-auto text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Selected clients:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  {getSelectedClients().slice(0, 10).map(client => (
                    <li key={client.client_id}>
                      {client.hostname || client.client_id}
                      {client.sensors && client.sensors.length > 0 && (
                        <span className="text-muted-foreground"> ({client.sensors.length} sensors)</span>
                      )}
                    </li>
                  ))}
                  {selectedClients.size > 10 && (
                    <li className="text-muted-foreground">...and {selectedClients.size - 10} more</li>
                  )}
                </ul>
              </div>
              <p className="text-destructive font-medium pt-2">This action cannot be undone.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBulkDelete}
              disabled={isBulkDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isBulkDeleting ? "Removing..." : `Remove ${selectedClients.size} Client(s)`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

interface ClientActionsProps {
  client: Client;
  clientState: ClientState;
  onAction: (clientId: string, action: "adopt" | "register" | "disable" | "enable" | "suspend" | "delete" | "restore", hostname?: string) => void;
  onPermanentDelete: () => void;
  onViewHistory: () => void;
  onEdit: () => void;
  onDownloadBatch: () => void;
  isLoading: boolean;
}

const ClientActions = ({ client, clientState, onAction, onPermanentDelete, onViewHistory, onEdit, onDownloadBatch, isLoading }: ClientActionsProps) => {
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
      {/* Edit button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onEdit}
        disabled={isLoading}
        className="text-muted-foreground hover:text-foreground"
      >
        <Pencil className="w-4 h-4" />
      </Button>

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
        <DropdownMenuContent align="end" className="bg-popover border border-border shadow-lg z-50">
          <DropdownMenuItem onClick={onDownloadBatch}>
            <Download className="w-4 h-4 mr-2" />
            Download Latest Batch
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onEdit}>
            <Pencil className="w-4 h-4 mr-2" />
            Edit Name
          </DropdownMenuItem>
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
              <DropdownMenuItem 
                onClick={() => onAction(client.client_id, "delete", client.hostname)}
                className="text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete (Soft)
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

          {clientState === "deleted" && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={onPermanentDelete}
                className="text-destructive font-medium"
              >
                <UserX className="w-4 h-4 mr-2" />
                Remove Permanently
              </DropdownMenuItem>
            </>
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
                  {formatLastSeen(entry.timestamp)}
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
