import { useState } from "react";
import { FileText, Plus, Trash2, Edit, Loader2, RefreshCw, Save, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useAlertRules, useUpdateAlertRule, useDeleteAlertRule, AlertRule } from "@/hooks/useAuroraApi";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { usePagination } from "@/hooks/usePagination";
import { TablePagination } from "@/components/TablePagination";

const RulesContent = () => {
  const { data: rulesData, isLoading, error } = useAlertRules();
  const queryClient = useQueryClient();
  const updateMutation = useUpdateAlertRule();
  const deleteMutation = useDeleteAlertRule();
  
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    severity: "",
    sensor_type_filter: "",
    field: "",
    operator: "",
    threshold: "",
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["aurora", "alerts", "rules"] });
  };

  const handleToggleEnabled = async (rule: AlertRule) => {
    try {
      await updateMutation.mutateAsync({
        ruleId: rule.id,
        updates: { enabled: !rule.enabled },
      });
      toast({
        title: rule.enabled ? "Rule disabled" : "Rule enabled",
        description: `${rule.name} has been ${rule.enabled ? "disabled" : "enabled"}.`,
      });
    } catch (err) {
      toast({
        title: "Error",
        description: `Failed to update rule: ${err instanceof Error ? err.message : "Unknown error"}`,
        variant: "destructive",
      });
    }
  };

  const handleEditClick = (rule: AlertRule) => {
    setEditingRule(rule);
    setEditForm({
      name: rule.name,
      description: rule.description,
      severity: rule.severity,
      sensor_type_filter: rule.sensor_type_filter,
      field: rule.conditions.field,
      operator: rule.conditions.operator || ">",
      threshold: rule.conditions.threshold,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingRule) return;
    
    try {
      await updateMutation.mutateAsync({
        ruleId: editingRule.id,
        updates: {
          name: editForm.name,
          description: editForm.description,
          severity: editForm.severity,
          sensor_type_filter: editForm.sensor_type_filter,
          conditions: {
            field: editForm.field,
            operator: editForm.operator,
            threshold: editForm.threshold,
          },
        },
      });
      toast({
        title: "Rule updated",
        description: `${editForm.name} has been updated successfully.`,
      });
      setEditingRule(null);
    } catch (err) {
      toast({
        title: "Error",
        description: `Failed to update rule: ${err instanceof Error ? err.message : "Unknown error"}`,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (rule: AlertRule) => {
    try {
      await deleteMutation.mutateAsync(rule.id);
      toast({
        title: "Rule deleted",
        description: `${rule.name} has been deleted.`,
      });
    } catch (err) {
      toast({
        title: "Error",
        description: `Failed to delete rule: ${err instanceof Error ? err.message : "Unknown error"}`,
        variant: "destructive",
      });
    }
  };

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

  const getSensorTypeColor = (sensorType: string) => {
    switch (sensorType) {
      case 'arduino_sensor_kit':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'wifi_scanner':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'bluetooth_scanner':
        return 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30';
      case 'system_monitor':
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
      case 'starlink':
      case 'starlink_dish_comprehensive':
        return 'bg-violet-500/20 text-violet-400 border-violet-500/30';
      case 'thermal_probe':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'adsb_detector':
        return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
      case 'lora_detector':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const formatCondition = (conditions: { field: string; operator?: string | null; threshold: string }) => {
    const op = conditions.operator || '>';
    return `${conditions.field} ${op} ${conditions.threshold}`;
  };

  const rules = rulesData?.rules || [];
  const enabledRules = rules.filter(r => r.enabled);
  const criticalRules = rules.filter(r => r.severity === 'critical');
  const warningRules = rules.filter(r => r.severity === 'warning');

  const {
    currentPage,
    totalPages,
    itemsPerPage,
    startIndex,
    endIndex,
    setCurrentPage,
    setItemsPerPage,
    paginateData,
  } = usePagination<AlertRule>({
    totalItems: rules.length,
    itemsPerPage: 10,
  });

  const paginatedRules = paginateData(rules);

  if (isLoading) {
    return (
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="glass-card rounded-xl p-8 text-center border border-border/50">
          <p className="text-destructive mb-4">Failed to load alert rules</p>
          <Button variant="outline" onClick={handleRefresh}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Automation Rules</h1>
          <p className="text-muted-foreground">
            {rulesData?.count || 0} rules configured for automated alerts
          </p>
        </div>
        <div className="flex gap-2">
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
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Create Rule
          </Button>
        </div>
      </div>

      {/* Rule Statistics */}
      <Card className="mb-6 bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Rule Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center p-4 rounded-lg bg-muted/30">
              <p className="text-2xl font-bold text-primary">{rules.length}</p>
              <p className="text-sm text-muted-foreground">Total Rules</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/30">
              <p className="text-2xl font-bold text-success">{enabledRules.length}</p>
              <p className="text-sm text-muted-foreground">Active</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/30">
              <p className="text-2xl font-bold text-destructive">{criticalRules.length}</p>
              <p className="text-sm text-muted-foreground">Critical</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/30">
              <p className="text-2xl font-bold text-warning">{warningRules.length}</p>
              <p className="text-sm text-muted-foreground">Warning</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rules List */}
      <div className="grid gap-4">
        {paginatedRules.map((rule) => (
          <Card key={rule.id} className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${rule.enabled ? 'bg-primary/20' : 'bg-muted'}`}>
                    <FileText className={`w-5 h-5 ${rule.enabled ? 'text-primary' : 'text-muted-foreground'}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold">{rule.name}</h3>
                    <p className="text-sm text-muted-foreground">{rule.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={getSensorTypeColor(rule.sensor_type_filter)}>
                      {rule.sensor_type_filter.replace(/_/g, ' ')}
                    </Badge>
                    <Badge className={getSeverityColor(rule.severity)}>
                      {rule.severity.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="text-right min-w-[120px]">
                    <p className="text-xs text-muted-foreground mb-1">Condition</p>
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {formatCondition(rule.conditions)}
                    </code>
                  </div>
                  <Switch 
                    checked={rule.enabled} 
                    onCheckedChange={() => handleToggleEnabled(rule)}
                    disabled={updateMutation.isPending}
                  />
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => handleEditClick(rule)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleDelete(rule)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {rules.length > 0 && (
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={rules.length}
          itemsPerPage={itemsPerPage}
          startIndex={startIndex}
          endIndex={endIndex}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
        />
      )}

      {/* Edit Rule Dialog */}
      <Dialog open={!!editingRule} onOpenChange={(open) => !open && setEditingRule(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Rule</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="severity">Severity</Label>
                <Select value={editForm.severity} onValueChange={(v) => setEditForm({ ...editForm, severity: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sensor_type">Sensor Type</Label>
                <Input
                  id="sensor_type"
                  value={editForm.sensor_type_filter}
                  onChange={(e) => setEditForm({ ...editForm, sensor_type_filter: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Condition</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Field"
                  value={editForm.field}
                  onChange={(e) => setEditForm({ ...editForm, field: e.target.value })}
                  className="flex-1"
                />
                <Select value={editForm.operator} onValueChange={(v) => setEditForm({ ...editForm, operator: v })}>
                  <SelectTrigger className="w-20">
                    <SelectValue placeholder="Op" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value=">">{">"}</SelectItem>
                    <SelectItem value="<">{"<"}</SelectItem>
                    <SelectItem value=">=">{">="}</SelectItem>
                    <SelectItem value="<=">{"<="}</SelectItem>
                    <SelectItem value="==">{"=="}</SelectItem>
                    <SelectItem value="!=">{"!="}</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Threshold"
                  value={editForm.threshold}
                  onChange={(e) => setEditForm({ ...editForm, threshold: e.target.value })}
                  className="w-24"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRule(null)}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RulesContent;