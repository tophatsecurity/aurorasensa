import { useState, useMemo } from "react";
import { 
  Bell, Loader2, RefreshCw, Info, Eye, EyeOff, 
  MoreVertical, Check, CheckCheck, Clock, Cpu, Timer, Trash2,
  AlertTriangle, AlertCircle, Activity, Server, BarChart3
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAlerts, useAcknowledgeAlert, useResolveAlert, Alert } from "@/hooks/useAuroraApi";
import { useQueryClient } from "@tanstack/react-query";
import { usePagination } from "@/hooks/usePagination";
import { TablePagination } from "@/components/TablePagination";
import { useAlertsSSE } from "@/hooks/useSSE";
import { SSEConnectionStatus } from "@/components/SSEConnectionStatus";
import { toast } from "sonner";

const EXCLUSIONS_KEY = 'aurora_alert_exclusions';

interface Exclusion {
  id: string; // device_id or sensor
  type: 'temporary' | 'permanent';
  expiresAt?: number; // timestamp for temporary
  reason?: string;
}

function getExclusions(): Exclusion[] {
  try {
    const stored = localStorage.getItem(EXCLUSIONS_KEY);
    if (!stored) return [];
    const exclusions: Exclusion[] = JSON.parse(stored);
    // Filter out expired temporary exclusions
    const now = Date.now();
    return exclusions.filter(e => e.type === 'permanent' || (e.expiresAt && e.expiresAt > now));
  } catch {
    return [];
  }
}

function saveExclusions(exclusions: Exclusion[]) {
  localStorage.setItem(EXCLUSIONS_KEY, JSON.stringify(exclusions));
}

function addExclusion(deviceId: string, type: 'temporary' | 'permanent', durationMinutes?: number) {
  const exclusions = getExclusions();
  // Remove existing if any
  const filtered = exclusions.filter(e => e.id !== deviceId);
  const newExclusion: Exclusion = {
    id: deviceId,
    type,
    expiresAt: type === 'temporary' && durationMinutes ? Date.now() + durationMinutes * 60 * 1000 : undefined,
  };
  saveExclusions([...filtered, newExclusion]);
}

function removeExclusion(deviceId: string) {
  const exclusions = getExclusions();
  saveExclusions(exclusions.filter(e => e.id !== deviceId));
}

function isExcluded(deviceId: string): Exclusion | undefined {
  return getExclusions().find(e => e.id === deviceId);
}

const AlertsContent = () => {
  const { data: alerts, isLoading, error } = useAlerts();
  const queryClient = useQueryClient();
  const acknowledgeAlert = useAcknowledgeAlert();
  const resolveAlert = useResolveAlert();
  const [sseEnabled, setSSEEnabled] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [showExcluded, setShowExcluded] = useState(false);
  const [exclusions, setExclusions] = useState<Exclusion[]>(getExclusions);

  // SSE for real-time alerts
  const sse = useAlertsSSE(sseEnabled);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["aurora", "alerts"] });
    setExclusions(getExclusions());
  };

  // Filter out excluded alerts
  const filteredAlerts = useMemo(() => {
    const list = alerts || [];
    if (showExcluded) return list;
    return list.filter(alert => !alert.device_id || !isExcluded(alert.device_id));
  }, [alerts, exclusions, showExcluded]);

  const excludedCount = useMemo(() => {
    const list = alerts || [];
    return list.filter(alert => alert.device_id && isExcluded(alert.device_id)).length;
  }, [alerts, exclusions]);

  // Statistics calculations
  const stats = useMemo(() => {
    const list = alerts || [];
    
    // By severity
    const bySeverity = {
      critical: list.filter(a => a.severity.toLowerCase() === 'critical').length,
      warning: list.filter(a => a.severity.toLowerCase() === 'warning').length,
      info: list.filter(a => a.severity.toLowerCase() === 'info').length,
    };
    
    // By acknowledgment status
    const byStatus = {
      acknowledged: list.filter(a => a.acknowledged).length,
      pending: list.filter(a => !a.acknowledged).length,
      resolved: list.filter(a => a.resolved).length,
      active: list.filter(a => !a.resolved).length,
    };
    
    // By source (top 5)
    const sourceMap = new Map<string, number>();
    list.forEach(a => {
      const source = a.device_id || 'Unknown';
      sourceMap.set(source, (sourceMap.get(source) || 0) + 1);
    });
    const bySource = Array.from(sourceMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    
    return { bySeverity, byStatus, bySource, total: list.length };
  }, [alerts]);

  const {
    currentPage,
    totalPages,
    itemsPerPage,
    startIndex,
    endIndex,
    setCurrentPage,
    setItemsPerPage,
    paginateData,
  } = usePagination<Alert>({
    totalItems: filteredAlerts.length,
    itemsPerPage: 10,
  });

  const paginatedAlerts = paginateData(filteredAlerts);

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return 'bg-destructive/20 text-destructive border-destructive/30';
      case 'warning':
        return 'bg-warning/20 text-warning border-warning/30';
      case 'info':
        return 'bg-primary/20 text-primary border-primary/30';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const handleAcknowledge = async (alertId: string) => {
    try {
      await acknowledgeAlert.mutateAsync(alertId);
      toast.success("Alert acknowledged");
    } catch (err) {
      toast.error("Failed to acknowledge alert");
    }
  };

  const handleResolve = async (alertId: string) => {
    try {
      await resolveAlert.mutateAsync(alertId);
      toast.success("Alert resolved");
    } catch (err) {
      toast.error("Failed to resolve alert");
    }
  };

  const handleExcludeTemporary = (deviceId: string, minutes: number) => {
    addExclusion(deviceId, 'temporary', minutes);
    setExclusions(getExclusions());
    toast.success(`Alerts from ${deviceId} hidden for ${minutes} minutes`);
  };

  const handleExcludePermanent = (deviceId: string) => {
    addExclusion(deviceId, 'permanent');
    setExclusions(getExclusions());
    toast.success(`Alerts from ${deviceId} permanently hidden`);
  };

  const handleRemoveExclusion = (deviceId: string) => {
    removeExclusion(deviceId);
    setExclusions(getExclusions());
    toast.success(`Alerts from ${deviceId} are now visible`);
  };

  const formatTimestamp = (ts: string) => {
    try {
      const date = new Date(ts);
      return date.toLocaleString();
    } catch {
      return ts;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold text-foreground">Alerts</h1>
          {alerts && alerts.length > 0 && (
            <Badge className="bg-destructive/20 text-destructive border-destructive/30 px-3 py-1">
              {filteredAlerts.length} Active
            </Badge>
          )}
          {excludedCount > 0 && (
            <Badge variant="outline" className="gap-1">
              <EyeOff className="w-3 h-3" />
              {excludedCount} hidden
            </Badge>
          )}
          <SSEConnectionStatus
            isConnected={sse.isConnected}
            isConnecting={sse.isConnecting}
            error={sse.error}
            reconnectCount={sse.reconnectCount}
            onReconnect={sse.reconnect}
            label="Live Alerts"
          />
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="show-excluded"
              checked={showExcluded}
              onCheckedChange={setShowExcluded}
            />
            <Label htmlFor="show-excluded" className="text-sm text-muted-foreground">
              Show hidden
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="sse-toggle"
              checked={sseEnabled}
              onCheckedChange={setSSEEnabled}
            />
            <Label htmlFor="sse-toggle" className="text-sm text-muted-foreground">
              Real-time
            </Label>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Statistics Dashboard */}
      {!isLoading && !error && stats.total > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* By Severity */}
          <Card className="glass-card border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">By Severity</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-destructive" />
                    <span className="text-sm">Critical</span>
                  </div>
                  <span className="font-bold text-destructive">{stats.bySeverity.critical}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-warning" />
                    <span className="text-sm">Warning</span>
                  </div>
                  <span className="font-bold text-warning">{stats.bySeverity.warning}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <span className="text-sm">Info</span>
                  </div>
                  <span className="font-bold text-primary">{stats.bySeverity.info}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Acknowledgment Status */}
          <Card className="glass-card border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Check className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Acknowledgment</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-3 h-3 text-warning" />
                    <span className="text-sm">Pending</span>
                  </div>
                  <span className="font-bold text-warning">{stats.byStatus.pending}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Check className="w-3 h-3 text-success" />
                    <span className="text-sm">Acknowledged</span>
                  </div>
                  <span className="font-bold text-success">{stats.byStatus.acknowledged}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Resolution Status */}
          <Card className="glass-card border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Resolution</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-3 h-3 text-destructive" />
                    <span className="text-sm">Active</span>
                  </div>
                  <span className="font-bold text-destructive">{stats.byStatus.active}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCheck className="w-3 h-3 text-success" />
                    <span className="text-sm">Resolved</span>
                  </div>
                  <span className="font-bold text-success">{stats.byStatus.resolved}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top Sources */}
          <Card className="glass-card border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Server className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Top Sources</span>
              </div>
              <div className="space-y-2">
                {stats.bySource.length > 0 ? (
                  stats.bySource.slice(0, 3).map(([source, count]) => (
                    <div key={source} className="flex items-center justify-between">
                      <span className="text-sm font-mono truncate max-w-[120px]" title={source}>
                        {source === 'Unknown' ? 'Unknown' : source.substring(0, 12)}...
                      </span>
                      <span className="font-bold">{count}</span>
                    </div>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">No sources</span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="glass-card rounded-xl p-8 text-center border border-border/50">
          <p className="text-destructive mb-4">Failed to load alerts</p>
          <Button variant="outline" onClick={handleRefresh}>
            Try Again
          </Button>
        </div>
      ) : filteredAlerts.length > 0 ? (
        <>
          <div className="space-y-3">
            {paginatedAlerts.map((alert) => {
              const exclusion = alert.device_id ? isExcluded(alert.device_id) : undefined;
              
              return (
                <div 
                  key={alert.id}
                  className={`glass-card rounded-xl p-5 border transition-all ${
                    exclusion 
                      ? 'border-muted/30 opacity-60' 
                      : 'border-border/50 hover:border-primary/30'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center flex-shrink-0">
                        <Bell className="w-5 h-5 text-warning" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <Badge className={getSeverityColor(alert.severity)}>
                            {alert.severity.toUpperCase()}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{alert.type}</span>
                          {alert.acknowledged && (
                            <Badge variant="outline" className="text-xs gap-1">
                              <Check className="w-3 h-3" />
                              Acknowledged
                            </Badge>
                          )}
                          {alert.resolved && (
                            <Badge variant="outline" className="text-xs gap-1 text-success border-success/30">
                              <CheckCheck className="w-3 h-3" />
                              Resolved
                            </Badge>
                          )}
                          {exclusion && (
                            <Badge variant="outline" className="text-xs gap-1 text-muted-foreground">
                              <EyeOff className="w-3 h-3" />
                              {exclusion.type === 'temporary' ? 'Temp Hidden' : 'Hidden'}
                            </Badge>
                          )}
                        </div>
                        <p className="text-foreground mb-2">{alert.message}</p>
                        
                        {/* Source Information */}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {alert.device_id && (
                            <span className="flex items-center gap-1">
                              <Cpu className="w-3 h-3" />
                              Source: <span className="font-mono text-foreground/80">{alert.device_id}</span>
                            </span>
                          )}
                          {alert.rule_id && (
                            <span className="flex items-center gap-1">
                              <Info className="w-3 h-3" />
                              Rule #{alert.rule_id}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTimestamp(alert.timestamp)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedAlert(alert)}
                        className="gap-1"
                      >
                        <Eye className="w-4 h-4" />
                        Details
                      </Button>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-popover">
                          {!alert.acknowledged && (
                            <DropdownMenuItem 
                              onClick={() => handleAcknowledge(alert.id)}
                              disabled={acknowledgeAlert.isPending}
                            >
                              <Check className="w-4 h-4 mr-2" />
                              Acknowledge
                            </DropdownMenuItem>
                          )}
                          {!alert.resolved && (
                            <DropdownMenuItem 
                              onClick={() => handleResolve(alert.id)}
                              disabled={resolveAlert.isPending}
                            >
                              <CheckCheck className="w-4 h-4 mr-2" />
                              Resolve
                            </DropdownMenuItem>
                          )}
                          
                          {alert.device_id && (
                            <>
                              <DropdownMenuSeparator />
                              {exclusion ? (
                                <DropdownMenuItem onClick={() => handleRemoveExclusion(alert.device_id!)}>
                                  <Eye className="w-4 h-4 mr-2" />
                                  Show alerts from this source
                                </DropdownMenuItem>
                              ) : (
                                <>
                                  <DropdownMenuItem onClick={() => handleExcludeTemporary(alert.device_id!, 15)}>
                                    <Timer className="w-4 h-4 mr-2" />
                                    Hide for 15 minutes
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleExcludeTemporary(alert.device_id!, 60)}>
                                    <Timer className="w-4 h-4 mr-2" />
                                    Hide for 1 hour
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleExcludeTemporary(alert.device_id!, 1440)}>
                                    <Timer className="w-4 h-4 mr-2" />
                                    Hide for 24 hours
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    onClick={() => handleExcludePermanent(alert.device_id!)}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Hide permanently
                                  </DropdownMenuItem>
                                </>
                              )}
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredAlerts.length}
            itemsPerPage={itemsPerPage}
            startIndex={startIndex}
            endIndex={endIndex}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
          />
        </>
      ) : (
        <div className="glass-card rounded-xl p-12 text-center border border-border/50">
          <Bell className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-lg font-semibold mb-2">No Active Alerts</h3>
          <p className="text-muted-foreground">
            {excludedCount > 0 
              ? `All systems are operating normally. ${excludedCount} alerts are hidden.`
              : 'All systems are operating normally.'
            }
          </p>
        </div>
      )}

      {/* Alert Details Dialog */}
      <Dialog open={!!selectedAlert} onOpenChange={() => setSelectedAlert(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Alert Details
            </DialogTitle>
            <DialogDescription>
              Full information about this alert
            </DialogDescription>
          </DialogHeader>
          
          {selectedAlert && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className={getSeverityColor(selectedAlert.severity)}>
                  {selectedAlert.severity.toUpperCase()}
                </Badge>
                <span className="text-sm text-muted-foreground">{selectedAlert.type}</span>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Message</h4>
                <p className="text-foreground">{selectedAlert.message}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Alert ID</h4>
                  <p className="font-mono text-sm">{selectedAlert.id}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Timestamp</h4>
                  <p className="text-sm">{formatTimestamp(selectedAlert.timestamp)}</p>
                </div>
              </div>
              
              {selectedAlert.device_id && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Source Device</h4>
                  <p className="font-mono text-sm">{selectedAlert.device_id}</p>
                </div>
              )}
              
              {selectedAlert.rule_id && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Triggered by Rule</h4>
                  <p className="text-sm">Rule #{selectedAlert.rule_id}</p>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Status</h4>
                  <div className="flex items-center gap-2">
                    {selectedAlert.acknowledged ? (
                      <Badge variant="outline" className="gap-1">
                        <Check className="w-3 h-3" />
                        Acknowledged
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1 text-warning border-warning/30">
                        Pending
                      </Badge>
                    )}
                    {selectedAlert.resolved && (
                      <Badge variant="outline" className="gap-1 text-success border-success/30">
                        <CheckCheck className="w-3 h-3" />
                        Resolved
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2 pt-4 border-t">
                {!selectedAlert.acknowledged && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      handleAcknowledge(selectedAlert.id);
                      setSelectedAlert(null);
                    }}
                    disabled={acknowledgeAlert.isPending}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Acknowledge
                  </Button>
                )}
                {!selectedAlert.resolved && (
                  <Button 
                    variant="default" 
                    size="sm"
                    onClick={() => {
                      handleResolve(selectedAlert.id);
                      setSelectedAlert(null);
                    }}
                    disabled={resolveAlert.isPending}
                  >
                    <CheckCheck className="w-4 h-4 mr-2" />
                    Resolve
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AlertsContent;
