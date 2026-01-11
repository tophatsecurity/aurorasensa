import { useState, useMemo } from "react";
import { 
  Bell, Loader2, RefreshCw, Info, Eye, EyeOff, 
  MoreVertical, Check, CheckCheck, Clock, Cpu, Timer, Trash2,
  AlertTriangle, AlertCircle, Activity, Server, BarChart3,
  Search, ArrowUpDown, ArrowUp, ArrowDown, Filter, X, List, LayoutGrid
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAlerts, useAcknowledgeAlert, useResolveAlert, type Alert } from "@/hooks/aurora/alerts";
import { useQueryClient } from "@tanstack/react-query";
import { usePagination } from "@/hooks/usePagination";
import { TablePagination } from "@/components/TablePagination";
import { useAlertsSSE } from "@/hooks/useSSE";
import { SSEConnectionStatus } from "@/components/SSEConnectionStatus";
import { toast } from "sonner";

const EXCLUSIONS_KEY = 'aurora_alert_exclusions';

interface Exclusion {
  id: string;
  type: 'temporary' | 'permanent';
  expiresAt?: number;
  reason?: string;
}

type SortField = 'severity' | 'type' | 'message' | 'timestamp' | 'device_id' | 'status';
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

interface Filters {
  severity: string[];
  status: string[];
  type: string[];
}

function getExclusions(): Exclusion[] {
  try {
    const stored = localStorage.getItem(EXCLUSIONS_KEY);
    if (!stored) return [];
    const exclusions: Exclusion[] = JSON.parse(stored);
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

const severityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 };

const AlertsContent = () => {
  const { data: alertsData, isLoading, error } = useAlerts();
  const alerts = alertsData?.alerts || [];
  const queryClient = useQueryClient();
  const acknowledgeAlert = useAcknowledgeAlert();
  const resolveAlert = useResolveAlert();
  const [sseEnabled, setSSEEnabled] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [showExcluded, setShowExcluded] = useState(false);
  const [exclusions, setExclusions] = useState<Exclusion[]>(getExclusions);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  
  // Search, sort, filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'timestamp', direction: 'desc' });
  const [filters, setFilters] = useState<Filters>({ severity: [], status: [], type: [] });
  
  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const sse = useAlertsSSE(sseEnabled);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["aurora", "alerts"] });
    setExclusions(getExclusions());
  };

  // Get unique values for filters
  const filterOptions = useMemo(() => {
    const list = alerts;
    return {
      severities: [...new Set(list.map(a => a.severity.toLowerCase()))],
      types: [...new Set(list.map(a => a.sensor_type || a.rule_name || a.type || 'unknown').filter(Boolean) as string[])],
      statuses: ['pending', 'acknowledged', 'resolved', 'active'],
    };
  }, [alerts]);

  // Apply exclusions, search, filters, and sort
  const processedAlerts = useMemo(() => {
    let list = [...alerts];
    
    // Apply exclusions - use sensor_id as fallback for device_id
    if (!showExcluded) {
      list = list.filter(alert => {
        const deviceId = alert.sensor_id || alert.device_id;
        return !deviceId || !isExcluded(deviceId);
      });
    }
    
    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      list = list.filter(alert => {
        const alertType = alert.sensor_type || alert.rule_name || alert.type || '';
        const alertSource = alert.sensor_id || alert.device_id || '';
        return alert.message.toLowerCase().includes(query) ||
          alertType.toLowerCase().includes(query) ||
          alert.severity.toLowerCase().includes(query) ||
          alertSource.toLowerCase().includes(query) ||
          String(alert.alert_id).includes(query);
      });
    }
    
    // Apply filters
    if (filters.severity.length > 0) {
      list = list.filter(a => filters.severity.includes(a.severity.toLowerCase()));
    }
    if (filters.type.length > 0) {
      list = list.filter(a => {
        const alertType = a.sensor_type || a.rule_name || a.type || '';
        return filters.type.includes(alertType);
      });
    }
    if (filters.status.length > 0) {
      list = list.filter(a => {
        const statuses: string[] = [];
        const isAcknowledged = a.acknowledged || !!a.acknowledged_at;
        const isResolved = a.resolved || !!a.resolved_at || a.status === 'resolved';
        if (!isAcknowledged) statuses.push('pending');
        if (isAcknowledged) statuses.push('acknowledged');
        if (isResolved) statuses.push('resolved');
        if (!isResolved) statuses.push('active');
        return filters.status.some(s => statuses.includes(s));
      });
    }
    
    // Apply sort
    list = [...list].sort((a, b) => {
      let comparison = 0;
      switch (sortConfig.field) {
        case 'severity':
          comparison = (severityOrder[a.severity.toLowerCase()] ?? 3) - (severityOrder[b.severity.toLowerCase()] ?? 3);
          break;
        case 'type':
          const typeA = a.sensor_type || a.rule_name || a.type || '';
          const typeB = b.sensor_type || b.rule_name || b.type || '';
          comparison = typeA.localeCompare(typeB);
          break;
        case 'message':
          comparison = a.message.localeCompare(b.message);
          break;
        case 'timestamp':
          const tsA = a.triggered_at || a.timestamp || '';
          const tsB = b.triggered_at || b.timestamp || '';
          comparison = new Date(tsA).getTime() - new Date(tsB).getTime();
          break;
        case 'device_id':
          const srcA = a.sensor_id || a.device_id || '';
          const srcB = b.sensor_id || b.device_id || '';
          comparison = srcA.localeCompare(srcB);
          break;
        case 'status':
          const resolvedA = a.resolved || !!a.resolved_at || a.status === 'resolved';
          const ackA = a.acknowledged || !!a.acknowledged_at;
          const resolvedB = b.resolved || !!b.resolved_at || b.status === 'resolved';
          const ackB = b.acknowledged || !!b.acknowledged_at;
          const statusA = resolvedA ? 2 : ackA ? 1 : 0;
          const statusB = resolvedB ? 2 : ackB ? 1 : 0;
          comparison = statusA - statusB;
          break;
      }
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
    
    return list;
  }, [alerts, showExcluded, searchQuery, filters, sortConfig, exclusions]);

  const excludedCount = useMemo(() => {
    const list = alerts || [];
    return list.filter(alert => alert.device_id && isExcluded(alert.device_id)).length;
  }, [alerts, exclusions]);

  // Statistics
  const stats = useMemo(() => {
    const list = alerts || [];
    const bySeverity = {
      critical: list.filter(a => a.severity.toLowerCase() === 'critical').length,
      warning: list.filter(a => a.severity.toLowerCase() === 'warning').length,
      info: list.filter(a => a.severity.toLowerCase() === 'info').length,
    };
    const byStatus = {
      acknowledged: list.filter(a => a.acknowledged).length,
      pending: list.filter(a => !a.acknowledged).length,
      resolved: list.filter(a => a.resolved).length,
      active: list.filter(a => !a.resolved).length,
    };
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
    totalItems: processedAlerts.length,
    itemsPerPage: 15,
  });

  const paginatedAlerts = paginateData(processedAlerts);

  // Selection handlers
  const isAllSelected = paginatedAlerts.length > 0 && paginatedAlerts.every(a => selectedIds.has(a.alert_id));
  const isPartiallySelected = paginatedAlerts.some(a => selectedIds.has(a.alert_id)) && !isAllSelected;

  const handleSelectAll = () => {
    if (isAllSelected) {
      const newSelected = new Set(selectedIds);
      paginatedAlerts.forEach(a => newSelected.delete(a.alert_id));
      setSelectedIds(newSelected);
    } else {
      const newSelected = new Set(selectedIds);
      paginatedAlerts.forEach(a => newSelected.add(a.alert_id));
      setSelectedIds(newSelected);
    }
  };

  const handleSelectOne = (id: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkAcknowledge = async () => {
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      try {
        await acknowledgeAlert.mutateAsync(id);
      } catch {}
    }
    toast.success(`Acknowledged ${ids.length} alerts`);
    setSelectedIds(new Set());
  };

  const handleBulkResolve = async () => {
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      try {
        await resolveAlert.mutateAsync(id);
      } catch {}
    }
    toast.success(`Resolved ${ids.length} alerts`);
    setSelectedIds(new Set());
  };

  const handleSort = (field: SortField) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const toggleFilter = (category: keyof Filters, value: string) => {
    setFilters(prev => {
      const current = prev[category];
      const updated = current.includes(value) 
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, [category]: updated };
    });
  };

  const clearFilters = () => {
    setFilters({ severity: [], status: [], type: [] });
    setSearchQuery('');
  };

  const hasActiveFilters = filters.severity.length > 0 || filters.status.length > 0 || filters.type.length > 0 || searchQuery.trim();

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

  const handleAcknowledge = async (alertId: number) => {
    try {
      await acknowledgeAlert.mutateAsync(alertId);
      toast.success("Alert acknowledged");
    } catch {
      toast.error("Failed to acknowledge alert");
    }
  };

  const handleResolve = async (alertId: number) => {
    try {
      await resolveAlert.mutateAsync(alertId);
      toast.success("Alert resolved");
    } catch {
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
      return new Date(ts).toLocaleString();
    } catch {
      return ts;
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortConfig.field !== field) return <ArrowUpDown className="w-4 h-4 ml-1 opacity-50" />;
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="w-4 h-4 ml-1" />
      : <ArrowDown className="w-4 h-4 ml-1" />;
  };

  return (
    <div className="flex-1 overflow-y-auto p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold text-foreground">Alerts</h1>
          {alerts && alerts.length > 0 && (
            <Badge className="bg-destructive/20 text-destructive border-destructive/30 px-3 py-1">
              {processedAlerts.length} Active
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
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch id="show-excluded" checked={showExcluded} onCheckedChange={setShowExcluded} />
            <Label htmlFor="show-excluded" className="text-sm text-muted-foreground">Show hidden</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="sse-toggle" checked={sseEnabled} onCheckedChange={setSSEEnabled} />
            <Label htmlFor="sse-toggle" className="text-sm text-muted-foreground">Real-time</Label>
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Statistics Dashboard */}
      {!isLoading && !error && stats.total > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
                        {source === 'Unknown' ? 'Unknown' : source.length > 12 ? `${source.substring(0, 12)}...` : source}
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

      {/* Search, Filter, and View Controls */}
      {!isLoading && !error && (
        <div className="flex flex-wrap items-center gap-3 mb-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search alerts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Severity Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="w-4 h-4" />
                Severity
                {filters.severity.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5">{filters.severity.length}</Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-popover">
              <DropdownMenuLabel>Filter by Severity</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {filterOptions.severities.map(sev => (
                <DropdownMenuCheckboxItem
                  key={sev}
                  checked={filters.severity.includes(sev)}
                  onCheckedChange={() => toggleFilter('severity', sev)}
                >
                  {sev.charAt(0).toUpperCase() + sev.slice(1)}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Status Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="w-4 h-4" />
                Status
                {filters.status.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5">{filters.status.length}</Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-popover">
              <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {filterOptions.statuses.map(status => (
                <DropdownMenuCheckboxItem
                  key={status}
                  checked={filters.status.includes(status)}
                  onCheckedChange={() => toggleFilter('status', status)}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Type Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="w-4 h-4" />
                Type
                {filters.type.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5">{filters.type.length}</Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-popover max-h-60 overflow-y-auto">
              <DropdownMenuLabel>Filter by Type</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {filterOptions.types.map(type => (
                <DropdownMenuCheckboxItem
                  key={type}
                  checked={filters.type.includes(type)}
                  onCheckedChange={() => toggleFilter('type', type)}
                >
                  {type}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-muted-foreground">
              <X className="w-4 h-4" />
              Clear filters
            </Button>
          )}

          <div className="flex-1" />

          {/* View Toggle */}
          <div className="flex items-center border rounded-lg overflow-hidden">
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-none"
              onClick={() => setViewMode('table')}
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'cards' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-none"
              onClick={() => setViewMode('cards')}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 mb-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <Button size="sm" variant="outline" onClick={handleBulkAcknowledge} disabled={acknowledgeAlert.isPending}>
            <Check className="w-4 h-4 mr-1" />
            Acknowledge All
          </Button>
          <Button size="sm" variant="outline" onClick={handleBulkResolve} disabled={resolveAlert.isPending}>
            <CheckCheck className="w-4 h-4 mr-1" />
            Resolve All
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
            Clear selection
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="glass-card rounded-xl p-8 text-center border border-border/50">
          <p className="text-destructive mb-4">Failed to load alerts</p>
          <Button variant="outline" onClick={handleRefresh}>Try Again</Button>
        </div>
      ) : processedAlerts.length > 0 ? (
        <>
          {viewMode === 'table' ? (
            <div className="glass-card rounded-xl border border-border/50 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-12">
                      <Checkbox
                        checked={isAllSelected}
                        ref={(el) => {
                          if (el) (el as any).indeterminate = isPartiallySelected;
                        }}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort('severity')}>
                      <div className="flex items-center">Severity<SortIcon field="severity" /></div>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort('type')}>
                      <div className="flex items-center">Type<SortIcon field="type" /></div>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none min-w-[300px]" onClick={() => handleSort('message')}>
                      <div className="flex items-center">Message<SortIcon field="message" /></div>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort('device_id')}>
                      <div className="flex items-center">Source<SortIcon field="device_id" /></div>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort('status')}>
                      <div className="flex items-center">Status<SortIcon field="status" /></div>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort('timestamp')}>
                      <div className="flex items-center">Time<SortIcon field="timestamp" /></div>
                    </TableHead>
                    <TableHead className="w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedAlerts.map((alert) => {
                    const deviceId = alert.sensor_id || alert.device_id;
                    const exclusion = deviceId ? isExcluded(deviceId) : undefined;
                    const alertType = alert.sensor_type || alert.rule_name || alert.type || 'Alert';
                    const isAcknowledged = alert.acknowledged || !!alert.acknowledged_at;
                    const isResolved = alert.resolved || !!alert.resolved_at || alert.status === 'resolved';
                    const alertTimestamp = alert.triggered_at || alert.timestamp || '';
                    return (
                      <TableRow 
                        key={alert.alert_id} 
                        className={`${exclusion ? 'opacity-60' : ''} ${selectedIds.has(alert.alert_id) ? 'bg-primary/5' : ''}`}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(alert.alert_id)}
                            onCheckedChange={() => handleSelectOne(alert.alert_id)}
                          />
                        </TableCell>
                        <TableCell>
                          <Badge className={getSeverityColor(alert.severity)}>
                            {alert.severity.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{alertType}</TableCell>
                        <TableCell className="max-w-[400px]">
                          <p className="truncate text-sm" title={alert.message}>{alert.message}</p>
                        </TableCell>
                        <TableCell>
                          {deviceId ? (
                            <span className="font-mono text-xs">{deviceId.substring(0, 12)}...</span>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {isAcknowledged ? (
                              <Badge variant="outline" className="text-xs gap-1">
                                <Check className="w-3 h-3" />Ack
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs text-warning border-warning/30">Pending</Badge>
                            )}
                            {isResolved && (
                              <Badge variant="outline" className="text-xs text-success border-success/30">
                                <CheckCheck className="w-3 h-3" />
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatTimestamp(alertTimestamp)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedAlert(alert)}>
                              <Eye className="w-4 h-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-popover">
                                {!isAcknowledged && (
                                  <DropdownMenuItem onClick={() => handleAcknowledge(alert.alert_id)}>
                                    <Check className="w-4 h-4 mr-2" />Acknowledge
                                  </DropdownMenuItem>
                                )}
                                {!isResolved && (
                                  <DropdownMenuItem onClick={() => handleResolve(alert.alert_id)}>
                                    <CheckCheck className="w-4 h-4 mr-2" />Resolve
                                  </DropdownMenuItem>
                                )}
                                {deviceId && (
                                  <>
                                    <DropdownMenuSeparator />
                                    {exclusion ? (
                                      <DropdownMenuItem onClick={() => handleRemoveExclusion(deviceId!)}>
                                        <Eye className="w-4 h-4 mr-2" />Show source
                                      </DropdownMenuItem>
                                    ) : (
                                      <>
                                        <DropdownMenuItem onClick={() => handleExcludeTemporary(deviceId!, 15)}>
                                          <Timer className="w-4 h-4 mr-2" />Hide 15m
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleExcludeTemporary(deviceId!, 60)}>
                                          <Timer className="w-4 h-4 mr-2" />Hide 1h
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleExcludePermanent(deviceId!)} className="text-destructive">
                                          <Trash2 className="w-4 h-4 mr-2" />Hide permanently
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="space-y-3">
              {paginatedAlerts.map((alert) => {
                const deviceId = alert.sensor_id || alert.device_id;
                const exclusion = deviceId ? isExcluded(deviceId) : undefined;
                const alertType = alert.sensor_type || alert.rule_name || alert.type || 'Alert';
                const isAcknowledged = alert.acknowledged || !!alert.acknowledged_at;
                const isResolved = alert.resolved || !!alert.resolved_at || alert.status === 'resolved';
                const alertTimestamp = alert.triggered_at || alert.timestamp || '';
                return (
                  <div 
                    key={alert.alert_id}
                    className={`glass-card rounded-xl p-5 border transition-all ${
                      exclusion ? 'border-muted/30 opacity-60' : 'border-border/50 hover:border-primary/30'
                    } ${selectedIds.has(alert.alert_id) ? 'ring-2 ring-primary/50' : ''}`}
                  >
                    <div className="flex items-start gap-4">
                      <Checkbox
                        checked={selectedIds.has(alert.alert_id)}
                        onCheckedChange={() => handleSelectOne(alert.alert_id)}
                        className="mt-1"
                      />
                      <div className="w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center flex-shrink-0">
                        <Bell className="w-5 h-5 text-warning" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <Badge className={getSeverityColor(alert.severity)}>{alert.severity.toUpperCase()}</Badge>
                          <span className="text-xs text-muted-foreground">{alertType}</span>
                          {isAcknowledged && <Badge variant="outline" className="text-xs gap-1"><Check className="w-3 h-3" />Ack</Badge>}
                          {isResolved && <Badge variant="outline" className="text-xs gap-1 text-success border-success/30"><CheckCheck className="w-3 h-3" />Resolved</Badge>}
                        </div>
                        <p className="text-foreground mb-2">{alert.message}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {deviceId && (
                            <span className="flex items-center gap-1">
                              <Cpu className="w-3 h-3" />Source: <span className="font-mono">{deviceId}</span>
                            </span>
                          )}
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatTimestamp(alertTimestamp)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setSelectedAlert(alert)}><Eye className="w-4 h-4" /></Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-popover">
                            {!isAcknowledged && <DropdownMenuItem onClick={() => handleAcknowledge(alert.alert_id)}><Check className="w-4 h-4 mr-2" />Acknowledge</DropdownMenuItem>}
                            {!isResolved && <DropdownMenuItem onClick={() => handleResolve(alert.alert_id)}><CheckCheck className="w-4 h-4 mr-2" />Resolve</DropdownMenuItem>}
                            {deviceId && !exclusion && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleExcludeTemporary(deviceId!, 60)}><Timer className="w-4 h-4 mr-2" />Hide 1h</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleExcludePermanent(deviceId!)} className="text-destructive"><Trash2 className="w-4 h-4 mr-2" />Hide permanently</DropdownMenuItem>
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
          )}
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={processedAlerts.length}
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
          <h3 className="text-lg font-semibold mb-2">No Alerts Found</h3>
          <p className="text-muted-foreground">
            {hasActiveFilters 
              ? 'No alerts match your current filters.'
              : excludedCount > 0 
                ? `All systems are operating normally. ${excludedCount} alerts are hidden.`
                : 'All systems are operating normally.'
            }
          </p>
          {hasActiveFilters && (
            <Button variant="outline" className="mt-4" onClick={clearFilters}>Clear Filters</Button>
          )}
        </div>
      )}

      {/* Alert Details Dialog */}
      <Dialog open={!!selectedAlert} onOpenChange={() => setSelectedAlert(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Bell className="w-5 h-5" />Alert Details</DialogTitle>
            <DialogDescription>Full information about this alert</DialogDescription>
          </DialogHeader>
          {selectedAlert && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className={getSeverityColor(selectedAlert.severity)}>{selectedAlert.severity.toUpperCase()}</Badge>
                <span className="text-sm text-muted-foreground">{selectedAlert.type}</span>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Message</h4>
                <p className="text-foreground">{selectedAlert.message}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Alert ID</h4>
                  <p className="font-mono text-sm">{selectedAlert.alert_id}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Timestamp</h4>
                  <p className="text-sm">{formatTimestamp(selectedAlert.triggered_at || selectedAlert.timestamp || '')}</p>
                </div>
              </div>
              {(selectedAlert.sensor_id || selectedAlert.device_id) && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Source Device</h4>
                  <p className="font-mono text-sm">{selectedAlert.sensor_id || selectedAlert.device_id}</p>
                </div>
              )}
              {selectedAlert.rule_id && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Triggered by Rule</h4>
                  <p className="text-sm">{selectedAlert.rule_name || `Rule #${selectedAlert.rule_id}`}</p>
                </div>
              )}
              {(selectedAlert.value || selectedAlert.threshold) && (
                <div className="grid grid-cols-2 gap-4">
                  {selectedAlert.value && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">Value</h4>
                      <p className="text-sm font-mono">{selectedAlert.value}</p>
                    </div>
                  )}
                  {selectedAlert.threshold && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">Threshold</h4>
                      <p className="text-sm font-mono">{selectedAlert.threshold}</p>
                    </div>
                  )}
                </div>
              )}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Status</h4>
                <div className="flex items-center gap-2">
                  {(selectedAlert.acknowledged || selectedAlert.acknowledged_at) ? (
                    <Badge variant="outline" className="gap-1"><Check className="w-3 h-3" />Acknowledged</Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1 text-warning border-warning/30">Pending</Badge>
                  )}
                  {(selectedAlert.resolved || selectedAlert.resolved_at || selectedAlert.status === 'resolved') && (
                    <Badge variant="outline" className="gap-1 text-success border-success/30"><CheckCheck className="w-3 h-3" />Resolved</Badge>
                  )}
                </div>
              </div>
              <div className="flex gap-2 pt-4 border-t">
                {!(selectedAlert.acknowledged || selectedAlert.acknowledged_at) && (
                  <Button variant="outline" size="sm" onClick={() => { handleAcknowledge(selectedAlert.alert_id); setSelectedAlert(null); }} disabled={acknowledgeAlert.isPending}>
                    <Check className="w-4 h-4 mr-2" />Acknowledge
                  </Button>
                )}
                {!(selectedAlert.resolved || selectedAlert.resolved_at || selectedAlert.status === 'resolved') && (
                  <Button variant="default" size="sm" onClick={() => { handleResolve(selectedAlert.alert_id); setSelectedAlert(null); }} disabled={resolveAlert.isPending}>
                    <CheckCheck className="w-4 h-4 mr-2" />Resolve
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
