import { useState } from "react";
import {
  Package,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  ChevronDown,
  ChevronUp,
  Server,
  Upload,
  Send,
  History,
  AlertCircle,
  FileArchive,
  Trash2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  useUpdatePackages,
  useUpdateStatus,
  usePublishPackage,
  useCreateUpdateAssignment,
  useClientsByState,
  useClientUpdateHistory,
  UpdatePackage,
  UpdateAssignment,
} from "@/hooks/useAuroraApi";
import { formatDateTime, formatLastSeen } from "@/utils/dateUtils";
import { toast } from "sonner";

const STATUS_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  pending: { icon: Clock, color: "text-warning", label: "Pending" },
  downloading: { icon: Loader2, color: "text-info animate-spin", label: "Downloading" },
  installing: { icon: Loader2, color: "text-primary animate-spin", label: "Installing" },
  completed: { icon: CheckCircle, color: "text-success", label: "Completed" },
  success: { icon: CheckCircle, color: "text-success", label: "Success" },
  failed: { icon: XCircle, color: "text-destructive", label: "Failed" },
  error: { icon: XCircle, color: "text-destructive", label: "Error" },
  up_to_date: { icon: CheckCircle, color: "text-success", label: "Up to Date" },
};

const getStatusConfig = (status: string) => {
  return STATUS_CONFIG[status?.toLowerCase()?.replace(/-/g, "_")] || STATUS_CONFIG.pending;
};

const formatBytes = (bytes?: number) => {
  if (!bytes) return "N/A";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

// Client Update History Dialog
const ClientHistoryDialog = ({ 
  clientId, 
  open, 
  onOpenChange 
}: { 
  clientId: string; 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
}) => {
  const { data, isLoading } = useClientUpdateHistory(clientId);
  const history = data?.history || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Update History
          </DialogTitle>
          <DialogDescription>
            Update history for client: {clientId}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : history.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No update history found
            </div>
          ) : (
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {history.map((entry, idx) => {
                  const statusConfig = getStatusConfig(entry.status);
                  const StatusIcon = statusConfig.icon;
                  return (
                    <div 
                      key={idx} 
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <StatusIcon className={`w-4 h-4 ${statusConfig.color}`} />
                        <div>
                          <p className="font-mono text-sm">{entry.version}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDateTime(entry.timestamp)}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className={statusConfig.color}>
                        {statusConfig.label}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Deploy Package Dialog
const DeployPackageDialog = ({
  pkg,
  open,
  onOpenChange,
}: {
  pkg: UpdatePackage | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const { data: clientsData } = useClientsByState();
  const createAssignment = useCreateUpdateAssignment();
  const [selectedClients, setSelectedClients] = useState<string[]>([]);

  const allClients = clientsData ? [
    ...(clientsData.clients_by_state?.adopted || []),
    ...(clientsData.clients_by_state?.registered || []),
  ] : [];

  const toggleClient = (clientId: string) => {
    setSelectedClients(prev =>
      prev.includes(clientId)
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
  };

  const handleDeploy = () => {
    if (!pkg) return;

    createAssignment.mutate(
      {
        package_id: pkg.id,
        target_clients: selectedClients.length > 0 ? selectedClients : undefined,
      },
      {
        onSuccess: () => {
          toast.success("Update deployment created successfully");
          setSelectedClients([]);
          onOpenChange(false);
        },
        onError: (error) => {
          toast.error(`Failed to create deployment: ${error.message}`);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            Deploy Package
          </DialogTitle>
          <DialogDescription>
            Deploy version {pkg?.version} to selected clients
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {pkg && (
            <div className="p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <FileArchive className="w-5 h-5 text-primary" />
                <span className="font-semibold">{pkg.version}</span>
                {pkg.published && (
                  <Badge className="bg-success/10 text-success border-success/30">
                    Published
                  </Badge>
                )}
              </div>
              {pkg.description && (
                <p className="text-sm text-muted-foreground">{pkg.description}</p>
              )}
              <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                <span>Size: {formatBytes(pkg.size_bytes)}</span>
                <span>Created: {formatDateTime(pkg.created_at)}</span>
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Target Clients</Label>
              {selectedClients.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedClients([])}
                  className="h-6 px-2 text-xs"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Clear
                </Button>
              )}
            </div>

            {allClients.length === 0 ? (
              <p className="text-sm text-muted-foreground">No clients available</p>
            ) : (
              <ScrollArea className="h-48 border rounded-lg p-2">
                <div className="space-y-1">
                  {allClients.map((client) => (
                    <button
                      key={client.client_id}
                      onClick={() => toggleClient(client.client_id)}
                      className={`w-full flex items-center gap-2 p-2 rounded-lg text-left transition-colors ${
                        selectedClients.includes(client.client_id)
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-muted/50"
                      }`}
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                        selectedClients.includes(client.client_id)
                          ? "bg-primary border-primary"
                          : "border-muted-foreground/50"
                      }`}>
                        {selectedClients.includes(client.client_id) && (
                          <CheckCircle className="w-3 h-3 text-primary-foreground" />
                        )}
                      </div>
                      <Server className="w-4 h-4 text-muted-foreground" />
                      <span className="font-mono text-sm">
                        {client.hostname || client.client_id}
                      </span>
                      <Badge variant="outline" className="ml-auto text-xs">
                        {client.state}
                      </Badge>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}

            <p className="text-xs text-muted-foreground mt-1.5">
              {selectedClients.length === 0
                ? "No clients selected - update will be deployed to all clients"
                : `${selectedClients.length} client(s) selected`}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleDeploy} disabled={createAssignment.isPending}>
            {createAssignment.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Deploying...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Deploy Update
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Package Row Component
const PackageRow = ({
  pkg,
  onDeploy,
  onPublish,
  isPublishing,
}: {
  pkg: UpdatePackage;
  onDeploy: (pkg: UpdatePackage) => void;
  onPublish: (pkgId: string) => void;
  isPublishing: boolean;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div className="border border-border/50 rounded-lg bg-card/50 overflow-hidden">
        <CollapsibleTrigger asChild>
          <button className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors text-left">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileArchive className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono font-semibold">{pkg.version}</span>
                  {pkg.published ? (
                    <Badge className="bg-success/10 text-success border-success/30">
                      Published
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      Draft
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {pkg.filename && <span>{pkg.filename}</span>}
                  <span>{formatBytes(pkg.size_bytes)}</span>
                  <span>{formatLastSeen(pkg.created_at)}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="p-4 pt-0 border-t border-border/50">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <Label className="text-xs text-muted-foreground">Package ID</Label>
                <p className="font-mono text-sm">{pkg.id}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Created</Label>
                <p className="text-sm">{formatDateTime(pkg.created_at)}</p>
              </div>
              {pkg.filename && (
                <div>
                  <Label className="text-xs text-muted-foreground">Filename</Label>
                  <p className="text-sm font-mono">{pkg.filename}</p>
                </div>
              )}
              <div>
                <Label className="text-xs text-muted-foreground">Size</Label>
                <p className="text-sm">{formatBytes(pkg.size_bytes)}</p>
              </div>
            </div>

            {pkg.description && (
              <div className="mb-4">
                <Label className="text-xs text-muted-foreground">Description</Label>
                <p className="text-sm mt-1">{pkg.description}</p>
              </div>
            )}

            <div className="flex gap-2">
              {!pkg.published && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onPublish(pkg.id)}
                  disabled={isPublishing}
                >
                  {isPublishing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  Publish
                </Button>
              )}
              <Button size="sm" onClick={() => onDeploy(pkg)}>
                <Send className="w-4 h-4 mr-2" />
                Deploy
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

const UpdateManagementContent = () => {
  const { data: packagesData, isLoading: packagesLoading, refetch: refetchPackages } = useUpdatePackages();
  const { data: statusData, isLoading: statusLoading, refetch: refetchStatus } = useUpdateStatus();
  const { data: clientsData } = useClientsByState();
  const publishPackage = usePublishPackage();

  const [deployPackage, setDeployPackage] = useState<UpdatePackage | null>(null);
  const [showDeployDialog, setShowDeployDialog] = useState(false);
  const [historyClientId, setHistoryClientId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("packages");

  const packages = packagesData?.packages || statusData?.packages || [];
  const assignments = statusData?.assignments || [];
  const clientStatuses = statusData?.client_statuses || {};

  const allClients = clientsData ? [
    ...(clientsData.clients_by_state?.adopted || []),
    ...(clientsData.clients_by_state?.registered || []),
  ] : [];

  // Stats
  const publishedCount = packages.filter(p => p.published).length;
  const draftCount = packages.filter(p => !p.published).length;
  const activeDeployments = assignments.filter(a => 
    ["pending", "downloading", "installing"].includes(a.status?.toLowerCase() || "")
  ).length;
  const upToDateClients = Object.values(clientStatuses).filter(
    s => s.status?.toLowerCase() === "up_to_date" || s.status?.toLowerCase() === "completed"
  ).length;

  const handleRefresh = () => {
    refetchPackages();
    refetchStatus();
  };

  const handlePublish = (packageId: string) => {
    publishPackage.mutate(packageId, {
      onSuccess: () => {
        toast.success("Package published successfully");
      },
      onError: (error) => {
        toast.error(`Failed to publish package: ${error.message}`);
      },
    });
  };

  const handleDeploy = (pkg: UpdatePackage) => {
    setDeployPackage(pkg);
    setShowDeployDialog(true);
  };

  const isLoading = packagesLoading || statusLoading;

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 overflow-y-auto h-full">
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

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Package className="w-6 h-6 text-primary" />
              Update Management
            </h1>
            <p className="text-muted-foreground">Manage software packages and deployments</p>
          </div>
        </div>
        <Button variant="outline" onClick={handleRefresh}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{packages.length}</p>
                <p className="text-sm text-muted-foreground">Total Packages</p>
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
                <p className="text-2xl font-bold">{publishedCount}</p>
                <p className="text-sm text-muted-foreground">Published</p>
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
                <p className="text-2xl font-bold">{activeDeployments}</p>
                <p className="text-sm text-muted-foreground">Active Deployments</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-info/10">
                <Server className="w-5 h-5 text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold">{upToDateClients}</p>
                <p className="text-sm text-muted-foreground">Clients Up-to-Date</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-card/50">
          <TabsTrigger value="packages">
            <Package className="w-4 h-4 mr-2" />
            Packages ({packages.length})
          </TabsTrigger>
          <TabsTrigger value="deployments">
            <Send className="w-4 h-4 mr-2" />
            Deployments ({assignments.length})
          </TabsTrigger>
          <TabsTrigger value="clients">
            <Server className="w-4 h-4 mr-2" />
            Client Status ({Object.keys(clientStatuses).length})
          </TabsTrigger>
        </TabsList>

        {/* Packages Tab */}
        <TabsContent value="packages" className="mt-4">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Available Packages</CardTitle>
            </CardHeader>
            <CardContent>
              {packages.length === 0 ? (
                <div className="py-12 text-center">
                  <Package className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No packages available</p>
                  <p className="text-sm text-muted-foreground/70 mt-1">
                    Upload packages through the API to get started
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[500px] pr-4">
                  <div className="space-y-3">
                    {packages.map((pkg) => (
                      <PackageRow
                        key={pkg.id}
                        pkg={pkg}
                        onDeploy={handleDeploy}
                        onPublish={handlePublish}
                        isPublishing={publishPackage.isPending}
                      />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Deployments Tab */}
        <TabsContent value="deployments" className="mt-4">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Deployment Assignments</CardTitle>
            </CardHeader>
            <CardContent>
              {assignments.length === 0 ? (
                <div className="py-12 text-center">
                  <Send className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No deployments yet</p>
                  <p className="text-sm text-muted-foreground/70 mt-1">
                    Deploy a package to create an assignment
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Assignment ID</TableHead>
                      <TableHead>Package</TableHead>
                      <TableHead>Targets</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignments.map((assignment) => {
                      const statusConfig = getStatusConfig(assignment.status || "pending");
                      const StatusIcon = statusConfig.icon;
                      const pkg = packages.find(p => p.id === assignment.package_id);
                      
                      return (
                        <TableRow key={assignment.id}>
                          <TableCell className="font-mono text-sm">
                            {assignment.id.slice(0, 8)}...
                          </TableCell>
                          <TableCell>
                            {pkg?.version || assignment.package_id.slice(0, 8)}
                          </TableCell>
                          <TableCell>
                            {assignment.target_clients?.length
                              ? `${assignment.target_clients.length} client(s)`
                              : "All clients"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <StatusIcon className={`w-4 h-4 ${statusConfig.color}`} />
                              <span>{statusConfig.label}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatLastSeen(assignment.created_at)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Client Status Tab */}
        <TabsContent value="clients" className="mt-4">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Client Update Status</CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(clientStatuses).length === 0 && allClients.length === 0 ? (
                <div className="py-12 text-center">
                  <Server className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No client status available</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Current Version</TableHead>
                      <TableHead>Target Version</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Update</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(Object.keys(clientStatuses).length > 0
                      ? Object.entries(clientStatuses)
                      : allClients.map(c => [c.client_id, {}] as [string, typeof clientStatuses[string]])
                    ).map(([clientId, status]) => {
                      const statusConfig = getStatusConfig(status?.status || "unknown");
                      const StatusIcon = statusConfig.icon;
                      const client = allClients.find(c => c.client_id === clientId);
                      
                      return (
                        <TableRow key={clientId}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Server className="w-4 h-4 text-muted-foreground" />
                              <span className="font-mono text-sm">
                                {client?.hostname || clientId}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono">
                            {status?.current_version || "N/A"}
                          </TableCell>
                          <TableCell className="font-mono">
                            {status?.target_version || "-"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <StatusIcon className={`w-4 h-4 ${statusConfig.color}`} />
                              <span>{status?.status || "Unknown"}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {status?.last_update 
                              ? formatLastSeen(status.last_update)
                              : "Never"}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setHistoryClientId(clientId)}
                            >
                              <History className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Deploy Dialog */}
      <DeployPackageDialog
        pkg={deployPackage}
        open={showDeployDialog}
        onOpenChange={setShowDeployDialog}
      />

      {/* Client History Dialog */}
      {historyClientId && (
        <ClientHistoryDialog
          clientId={historyClientId}
          open={!!historyClientId}
          onOpenChange={(open) => !open && setHistoryClientId(null)}
        />
      )}
    </div>
  );
};

export default UpdateManagementContent;
