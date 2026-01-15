import { useState, useEffect } from "react";
import {
  Terminal,
  Send,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Server,
  Trash2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  useAdminCommands,
  useSendCommand,
  useCommandResults,
  useClientsByState,
  type RemoteCommand,
  type CommandResult,
} from "@/hooks/aurora";

import { formatDateTime, formatLastSeen } from "@/utils/dateUtils";
import { toast } from "sonner";

const STATUS_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  pending: { icon: Clock, color: "text-warning", label: "Pending" },
  sent: { icon: Loader2, color: "text-info animate-spin", label: "Sent" },
  running: { icon: Loader2, color: "text-primary animate-spin", label: "Running" },
  completed: { icon: CheckCircle, color: "text-success", label: "Completed" },
  success: { icon: CheckCircle, color: "text-success", label: "Success" },
  failed: { icon: XCircle, color: "text-destructive", label: "Failed" },
  timeout: { icon: AlertCircle, color: "text-warning", label: "Timeout" },
  error: { icon: XCircle, color: "text-destructive", label: "Error" },
};

const getStatusConfig = (status: string) => {
  return STATUS_CONFIG[status?.toLowerCase()] || STATUS_CONFIG.pending;
};

// Command Result Details Component
const CommandResultDetails = ({ commandId }: { commandId: string }) => {
  const { data, isLoading } = useCommandResults(commandId);
  const results = data?.results || [];

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-4 justify-center">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading results...</span>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="py-4 text-center text-muted-foreground text-sm">
        No results yet. Waiting for client response...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {results.map((result, idx) => {
        const statusConfig = getStatusConfig(result.status);
        const StatusIcon = statusConfig.icon;
        
        return (
          <div key={idx} className="bg-muted/30 rounded-lg p-3 border border-border/50">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-muted-foreground" />
                <span className="font-mono text-sm">{result.client_id}</span>
              </div>
              <div className="flex items-center gap-2">
                <StatusIcon className={`w-4 h-4 ${statusConfig.color}`} />
                <Badge variant="outline" className="text-xs">
                  {statusConfig.label}
                </Badge>
                {result.duration_ms && (
                  <span className="text-xs text-muted-foreground">
                    {result.duration_ms}ms
                  </span>
                )}
              </div>
            </div>
            
            {result.output && (
              <div className="mt-2">
                <Label className="text-xs text-muted-foreground">Output:</Label>
                <pre className="mt-1 p-2 bg-background rounded text-xs font-mono whitespace-pre-wrap overflow-x-auto max-h-48">
                  {result.output}
                </pre>
              </div>
            )}
            
            {result.error && (
              <div className="mt-2">
                <Label className="text-xs text-destructive">Error:</Label>
                <pre className="mt-1 p-2 bg-destructive/10 rounded text-xs font-mono text-destructive whitespace-pre-wrap overflow-x-auto">
                  {result.error}
                </pre>
              </div>
            )}
            
            {result.executed_at && (
              <p className="text-xs text-muted-foreground mt-2">
                Executed: {formatDateTime(result.executed_at)}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
};

// Command Row Component
const CommandRow = ({ command }: { command: RemoteCommand }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const statusConfig = getStatusConfig(command.status || "pending");
  const StatusIcon = statusConfig.icon;

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div className="border border-border/50 rounded-lg bg-card/50 overflow-hidden">
        <CollapsibleTrigger asChild>
          <button className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors text-left">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <StatusIcon className={`w-5 h-5 ${statusConfig.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <code className="text-sm font-mono bg-muted/50 px-2 py-0.5 rounded truncate max-w-md">
                    {command.command}
                  </code>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>ID: {command.id?.slice(0, 8)}...</span>
                  {command.created_at && (
                    <span>{formatLastSeen(command.created_at)}</span>
                  )}
                  {command.target_clients && command.target_clients.length > 0 && (
                    <span>{command.target_clients.length} target(s)</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className={statusConfig.color}>
                {statusConfig.label}
              </Badge>
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
                <Label className="text-xs text-muted-foreground">Command ID</Label>
                <p className="font-mono text-sm">{command.id}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Timeout</Label>
                <p className="text-sm">{command.timeout_seconds || 30}s</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Created</Label>
                <p className="text-sm">{command.created_at ? formatDateTime(command.created_at) : "N/A"}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Targets</Label>
                <p className="text-sm">
                  {command.target_clients?.length 
                    ? command.target_clients.join(", ") 
                    : "All clients"}
                </p>
              </div>
            </div>
            
            <div className="mb-2">
              <Label className="text-xs text-muted-foreground">Full Command</Label>
              <pre className="mt-1 p-2 bg-muted/30 rounded text-sm font-mono whitespace-pre-wrap">
                {command.command}
              </pre>
            </div>
            
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">Results</Label>
              {command.id && <CommandResultDetails commandId={command.id} />}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

const RemoteCommandsContent = () => {
  const { data: commandsData, isLoading, refetch } = useAdminCommands(50);
  const { data: clientsData } = useClientsByState();
  const sendCommand = useSendCommand();

  const [command, setCommand] = useState("");
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [timeout, setTimeout] = useState("30");
  const [showSendDialog, setShowSendDialog] = useState(false);
  

  // Get all available clients
  const allClients = clientsData ? [
    ...(clientsData.clients_by_state?.adopted || []),
    ...(clientsData.clients_by_state?.registered || []),
  ] : [];

  const commands = commandsData?.commands || [];

  // Stats
  const pendingCount = commands.filter(c => ["pending", "sent", "running"].includes(c.status?.toLowerCase() || "")).length;
  const completedCount = commands.filter(c => ["completed", "success"].includes(c.status?.toLowerCase() || "")).length;
  const failedCount = commands.filter(c => ["failed", "error", "timeout"].includes(c.status?.toLowerCase() || "")).length;

  const handleSendCommand = () => {
    if (!command.trim()) {
      toast.error("Please enter a command");
      return;
    }

    sendCommand.mutate(
      {
        command: command.trim(),
        target_clients: selectedClients.length > 0 ? selectedClients : undefined,
        timeout_seconds: parseInt(timeout) || 30,
      },
      {
        onSuccess: (data) => {
          toast.success(`Command sent successfully! ID: ${data.command_id?.slice(0, 8) || "N/A"}`);
          setCommand("");
          setSelectedClients([]);
          setShowSendDialog(false);
          refetch();
        },
        onError: (error) => {
          toast.error(`Failed to send command: ${error.message}`);
        },
      }
    );
  };

  const toggleClientSelection = (clientId: string) => {
    setSelectedClients(prev => 
      prev.includes(clientId) 
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
  };

  // Auto-refresh commands list
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 10000);
    return () => clearInterval(interval);
  }, [refetch]);

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
              <Terminal className="w-6 h-6 text-primary" />
              Remote Commands
            </h1>
            <p className="text-muted-foreground">Send shell commands to clients and view results</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setShowSendDialog(true)}>
            <Send className="w-4 h-4 mr-2" />
            New Command
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Terminal className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{commands.length}</p>
                <p className="text-sm text-muted-foreground">Total Commands</p>
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
                <p className="text-2xl font-bold">{pendingCount}</p>
                <p className="text-sm text-muted-foreground">Pending / Running</p>
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
                <p className="text-2xl font-bold">{completedCount}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <XCircle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{failedCount}</p>
                <p className="text-sm text-muted-foreground">Failed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Command Input */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Quick Command</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Input
                placeholder="Enter command to execute on all clients..."
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && command.trim()) {
                    handleSendCommand();
                  }
                }}
                className="font-mono"
              />
            </div>
            <Select value={timeout} onValueChange={setTimeout}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10s</SelectItem>
                <SelectItem value="30">30s</SelectItem>
                <SelectItem value="60">60s</SelectItem>
                <SelectItem value="120">120s</SelectItem>
                <SelectItem value="300">5min</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              onClick={handleSendCommand} 
              disabled={!command.trim() || sendCommand.isPending}
            >
              {sendCommand.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Tip: Use the "New Command" button for more options like targeting specific clients
          </p>
        </CardContent>
      </Card>

      {/* Commands History */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Command History</CardTitle>
        </CardHeader>
        <CardContent>
          {commands.length === 0 ? (
            <div className="py-12 text-center">
              <Terminal className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No commands sent yet</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Use the quick command input above or click "New Command" to get started
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-3">
                {commands.map((cmd) => (
                  <CommandRow key={cmd.id} command={cmd} />
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Send Command Dialog */}
      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Terminal className="w-5 h-5" />
              Send Remote Command
            </DialogTitle>
            <DialogDescription>
              Execute a shell command on selected clients. Leave target empty to send to all clients.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label>Command</Label>
              <Textarea
                placeholder="Enter shell command..."
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                className="font-mono mt-1.5"
                rows={3}
              />
            </div>
            
            <div>
              <Label>Timeout</Label>
              <Select value={timeout} onValueChange={setTimeout}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 seconds</SelectItem>
                  <SelectItem value="30">30 seconds</SelectItem>
                  <SelectItem value="60">1 minute</SelectItem>
                  <SelectItem value="120">2 minutes</SelectItem>
                  <SelectItem value="300">5 minutes</SelectItem>
                  <SelectItem value="600">10 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-1.5">
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
                <ScrollArea className="h-40 border rounded-lg p-2">
                  <div className="space-y-1">
                    {allClients.map((client) => (
                      <button
                        key={client.client_id}
                        onClick={() => toggleClientSelection(client.client_id)}
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
                        <span className="font-mono text-sm">{client.hostname || client.client_id}</span>
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
                  ? "No clients selected - command will be sent to all clients"
                  : `${selectedClients.length} client(s) selected`}
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSendDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSendCommand}
              disabled={!command.trim() || sendCommand.isPending}
            >
              {sendCommand.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Command
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RemoteCommandsContent;
