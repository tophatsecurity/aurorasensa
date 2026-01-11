import { useState, useMemo } from "react";
import { FileText, Plus, Trash2, Edit, Loader2, RefreshCw, Save, X, AlertTriangle, Bell, Zap, Activity, Download, Upload, Check, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  useAlertRules, 
  useCreateAlertRule, 
  useUpdateAlertRule, 
  useDeleteAlertRule, 
  AlertRule,
  CreateAlertRulePayload 
} from "@/hooks/aurora/alerts";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { usePagination } from "@/hooks/usePagination";
import { TablePagination } from "@/components/TablePagination";
import { DEFAULT_ALERT_RULES, DefaultAlertRule, getRulesByCategory, getRuleCountBySeverity } from "@/data/defaultAlertRules";

// Sensor types available for rules
const SENSOR_TYPES = [
  { value: "arduino_sensor_kit", label: "Arduino Sensor Kit" },
  { value: "wifi_scanner", label: "WiFi Scanner" },
  { value: "bluetooth_scanner", label: "Bluetooth Scanner" },
  { value: "system_monitor", label: "System Monitor" },
  { value: "starlink", label: "Starlink" },
  { value: "starlink_dish_comprehensive", label: "Starlink Dish" },
  { value: "thermal_probe", label: "Thermal Probe" },
  { value: "adsb_detector", label: "ADS-B Detector" },
  { value: "lora_detector", label: "LoRa Detector" },
  { value: "gps_tracker", label: "GPS Tracker" },
];

// Common fields per sensor type
const SENSOR_FIELDS: Record<string, string[]> = {
  arduino_sensor_kit: ["temperature", "humidity", "pressure", "light", "motion"],
  wifi_scanner: ["signal_strength", "client_count", "channel", "frequency"],
  bluetooth_scanner: ["device_count", "rssi", "battery_level"],
  system_monitor: ["cpu_usage", "memory_usage", "disk_usage", "temperature"],
  starlink: ["download_speed", "upload_speed", "latency", "signal_quality"],
  starlink_dish_comprehensive: ["dish_temperature", "obstruction_percent", "uptime"],
  thermal_probe: ["temperature", "ambient_temp", "delta"],
  adsb_detector: ["aircraft_count", "altitude", "speed", "distance"],
  lora_detector: ["rssi", "snr", "frequency", "packet_count"],
  gps_tracker: ["speed", "altitude", "accuracy", "satellites"],
};

// Notification channels
const NOTIFICATION_CHANNELS = [
  { value: "email", label: "Email" },
  { value: "webhook", label: "Webhook" },
  { value: "dashboard", label: "Dashboard Alert" },
  { value: "sms", label: "SMS" },
];

interface RuleFormData {
  name: string;
  description: string;
  severity: string;
  sensor_type_filter: string;
  field: string;
  operator: string;
  value: string;
  notification_channels: string[];
  cooldown_minutes: number;
  enabled: boolean;
}

const defaultFormData: RuleFormData = {
  name: "",
  description: "",
  severity: "warning",
  sensor_type_filter: "",
  field: "",
  operator: ">",
  value: "",
  notification_channels: ["dashboard"],
  cooldown_minutes: 5,
  enabled: true,
};

const RulesContent = () => {
  const { data: rulesData, isLoading, error } = useAlertRules();
  const queryClient = useQueryClient();
  const createMutation = useCreateAlertRule();
  const updateMutation = useUpdateAlertRule();
  const deleteMutation = useDeleteAlertRule();
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);
  const [formData, setFormData] = useState<RuleFormData>(defaultFormData);
  const [deleteConfirmRule, setDeleteConfirmRule] = useState<AlertRule | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'templates'>('active');
  const [selectedTemplates, setSelectedTemplates] = useState<Set<number>>(new Set());
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState<string>('all');
  const [isImporting, setIsImporting] = useState(false);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["aurora", "alerts", "rules"] });
  };

  const resetForm = () => {
    setFormData(defaultFormData);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsCreateDialogOpen(true);
  };

  const openEditDialog = (rule: AlertRule) => {
    setEditingRule(rule);
    const condition = rule.conditions?.[0] || { field: "", operator: ">", value: "" };
    setFormData({
      name: rule.name,
      description: rule.description || "",
      severity: rule.severity,
      sensor_type_filter: rule.sensor_type_filter || "",
      field: condition.field || "",
      operator: condition.operator || ">",
      value: String(condition.value || ""),
      notification_channels: rule.notification_channels || ["dashboard"],
      cooldown_minutes: rule.cooldown_minutes || 5,
      enabled: rule.enabled,
    });
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

  const handleCreateRule = async () => {
    if (!formData.name || !formData.sensor_type_filter || !formData.field || !formData.value) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    const payload: CreateAlertRulePayload = {
      name: formData.name,
      description: formData.description,
      enabled: formData.enabled,
      severity: formData.severity,
      sensor_type_filter: formData.sensor_type_filter,
      conditions: [{
        field: formData.field,
        operator: formData.operator,
        value: isNaN(Number(formData.value)) ? formData.value : Number(formData.value),
      }],
      notification_channels: formData.notification_channels,
      cooldown_minutes: formData.cooldown_minutes,
    };

    try {
      await createMutation.mutateAsync(payload);
      toast({
        title: "Rule created",
        description: `${formData.name} has been created successfully.`,
      });
      setIsCreateDialogOpen(false);
      resetForm();
    } catch (err) {
      toast({
        title: "Error",
        description: `Failed to create rule: ${err instanceof Error ? err.message : "Unknown error"}`,
        variant: "destructive",
      });
    }
  };

  const handleUpdateRule = async () => {
    if (!editingRule) return;

    try {
      await updateMutation.mutateAsync({
        ruleId: editingRule.id,
        updates: {
          name: formData.name,
          description: formData.description,
          enabled: formData.enabled,
          severity: formData.severity,
          sensor_type_filter: formData.sensor_type_filter,
          conditions: [{
            field: formData.field,
            operator: formData.operator,
            value: isNaN(Number(formData.value)) ? formData.value : Number(formData.value),
          }],
          notification_channels: formData.notification_channels,
          cooldown_minutes: formData.cooldown_minutes,
        },
      });
      toast({
        title: "Rule updated",
        description: `${formData.name} has been updated successfully.`,
      });
      setEditingRule(null);
      resetForm();
    } catch (err) {
      toast({
        title: "Error",
        description: `Failed to update rule: ${err instanceof Error ? err.message : "Unknown error"}`,
        variant: "destructive",
      });
    }
  };

  const handleDeleteRule = async () => {
    if (!deleteConfirmRule) return;

    try {
      await deleteMutation.mutateAsync(deleteConfirmRule.id);
      toast({
        title: "Rule deleted",
        description: `${deleteConfirmRule.name} has been deleted.`,
      });
      setDeleteConfirmRule(null);
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
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
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
      case 'gps_tracker':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const formatCondition = (conditions?: { field: string; operator?: string | null; value?: number | string | null }[]) => {
    if (!conditions || conditions.length === 0) return "No condition";
    const c = conditions[0];
    const op = c.operator || '>';
    return `${c.field} ${op} ${c.value}`;
  };

  const availableFields = formData.sensor_type_filter 
    ? SENSOR_FIELDS[formData.sensor_type_filter] || [] 
    : [];

  const rules = rulesData?.rules || [];
  const enabledRules = rules.filter(r => r.enabled);
  const criticalRules = rules.filter(r => r.severity === 'critical');
  const warningRules = rules.filter(r => r.severity === 'warning');

  // Template rules processing
  const rulesByCategory = useMemo(() => getRulesByCategory(), []);
  const templateCategories = useMemo(() => ['all', ...Object.keys(rulesByCategory)], [rulesByCategory]);
  const severityCounts = useMemo(() => getRuleCountBySeverity(), []);
  
  const filteredTemplates = useMemo(() => {
    if (templateCategoryFilter === 'all') return DEFAULT_ALERT_RULES;
    return DEFAULT_ALERT_RULES.filter(r => r.category === templateCategoryFilter);
  }, [templateCategoryFilter]);

  const handleToggleTemplate = (index: number) => {
    const newSelected = new Set(selectedTemplates);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedTemplates(newSelected);
  };

  const handleSelectAllTemplates = () => {
    if (selectedTemplates.size === filteredTemplates.length) {
      setSelectedTemplates(new Set());
    } else {
      setSelectedTemplates(new Set(filteredTemplates.map((_, i) => i)));
    }
  };

  const handleImportSelectedRules = async () => {
    if (selectedTemplates.size === 0) return;
    
    setIsImporting(true);
    let successCount = 0;
    let errorCount = 0;
    
    const templatesToImport = Array.from(selectedTemplates).map(i => filteredTemplates[i]);
    
    for (const template of templatesToImport) {
      try {
        await createMutation.mutateAsync({
          name: template.name,
          description: template.description,
          enabled: template.enabled,
          severity: template.severity,
          sensor_type_filter: template.sensor_type_filter,
          conditions: template.conditions,
          notification_channels: template.notification_channels,
          cooldown_minutes: template.cooldown_minutes,
        });
        successCount++;
      } catch (err) {
        errorCount++;
        console.error(`Failed to import rule: ${template.name}`, err);
      }
    }
    
    setIsImporting(false);
    setSelectedTemplates(new Set());
    
    if (successCount > 0) {
      toast({
        title: "Rules Imported",
        description: `Successfully imported ${successCount} rules${errorCount > 0 ? `, ${errorCount} failed` : ''}.`,
      });
    } else {
      toast({
        title: "Import Failed",
        description: "Failed to import rules. Please try again.",
        variant: "destructive",
      });
    }
  };

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

  // Rule Editor Form Component
  const RuleEditorForm = ({ isCreate }: { isCreate: boolean }) => (
    <Tabs defaultValue="basic" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="basic">Basic Info</TabsTrigger>
        <TabsTrigger value="condition">Condition</TabsTrigger>
        <TabsTrigger value="notifications">Notifications</TabsTrigger>
      </TabsList>
      
      <TabsContent value="basic" className="space-y-4 mt-4">
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Rule Name *</Label>
            <Input
              id="name"
              placeholder="e.g., High Temperature Alert"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe what this rule monitors and when it triggers..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="severity">Severity *</Label>
              <Select 
                value={formData.severity} 
                onValueChange={(v) => setFormData({ ...formData, severity: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      Info
                    </div>
                  </SelectItem>
                  <SelectItem value="warning">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-yellow-500" />
                      Warning
                    </div>
                  </SelectItem>
                  <SelectItem value="critical">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                      Critical
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label>Enabled</Label>
              <div className="flex items-center gap-2 h-10">
                <Switch 
                  checked={formData.enabled} 
                  onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
                />
                <span className="text-sm text-muted-foreground">
                  {formData.enabled ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </TabsContent>
      
      <TabsContent value="condition" className="space-y-4 mt-4">
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="sensor_type">Sensor Type *</Label>
            <Select 
              value={formData.sensor_type_filter} 
              onValueChange={(v) => setFormData({ ...formData, sensor_type_filter: v, field: "" })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select sensor type" />
              </SelectTrigger>
              <SelectContent>
                {SENSOR_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid gap-2">
            <Label>Condition *</Label>
            <div className="flex gap-2">
              <Select 
                value={formData.field} 
                onValueChange={(v) => setFormData({ ...formData, field: v })}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select field" />
                </SelectTrigger>
                <SelectContent>
                  {availableFields.length > 0 ? (
                    availableFields.map((field) => (
                      <SelectItem key={field} value={field}>
                        {field.replace(/_/g, " ")}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="" disabled>
                      Select sensor type first
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              
              <Select 
                value={formData.operator} 
                onValueChange={(v) => setFormData({ ...formData, operator: v })}
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
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
                placeholder="Value"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                className="w-32"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Alert triggers when: {formData.field || "[field]"} {formData.operator} {formData.value || "[value]"}
            </p>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="cooldown">Cooldown (minutes)</Label>
            <Input
              id="cooldown"
              type="number"
              min="1"
              max="1440"
              value={formData.cooldown_minutes}
              onChange={(e) => setFormData({ ...formData, cooldown_minutes: parseInt(e.target.value) || 5 })}
            />
            <p className="text-xs text-muted-foreground">
              Minimum time between repeated alerts for this rule
            </p>
          </div>
        </div>
      </TabsContent>
      
      <TabsContent value="notifications" className="space-y-4 mt-4">
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>Notification Channels</Label>
            <div className="grid grid-cols-2 gap-3">
              {NOTIFICATION_CHANNELS.map((channel) => (
                <label
                  key={channel.value}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    formData.notification_channels.includes(channel.value)
                      ? "border-primary bg-primary/10"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={formData.notification_channels.includes(channel.value)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({
                          ...formData,
                          notification_channels: [...formData.notification_channels, channel.value],
                        });
                      } else {
                        setFormData({
                          ...formData,
                          notification_channels: formData.notification_channels.filter(c => c !== channel.value),
                        });
                      }
                    }}
                    className="sr-only"
                  />
                  {channel.value === "email" && <Bell className="w-4 h-4" />}
                  {channel.value === "webhook" && <Zap className="w-4 h-4" />}
                  {channel.value === "dashboard" && <Activity className="w-4 h-4" />}
                  {channel.value === "sms" && <Bell className="w-4 h-4" />}
                  <span className="text-sm">{channel.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );

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
            {rules.length} rules configured • {DEFAULT_ALERT_RULES.length} templates available
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
          <Button className="gap-2" onClick={openCreateDialog}>
            <Plus className="w-4 h-4" />
            Create Rule
          </Button>
        </div>
      </div>

      {/* Tabs for Active Rules and Templates */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'active' | 'templates')} className="mb-6">
        <TabsList>
          <TabsTrigger value="active" className="gap-2">
            <Zap className="w-4 h-4" />
            Active Rules
            <Badge variant="secondary" className="ml-1">{rules.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <Download className="w-4 h-4" />
            Rule Templates
            <Badge variant="outline" className="ml-1">{DEFAULT_ALERT_RULES.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4">
          {/* Rule Statistics */}
          <Card className="mb-6 bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Rule Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 rounded-lg bg-muted/30">
                  <p className="text-2xl font-bold text-primary">{rules.length}</p>
                  <p className="text-sm text-muted-foreground">Total Rules</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/30">
                  <p className="text-2xl font-bold text-green-400">{enabledRules.length}</p>
                  <p className="text-sm text-muted-foreground">Active</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/30">
                  <p className="text-2xl font-bold text-destructive">{criticalRules.length}</p>
                  <p className="text-sm text-muted-foreground">Critical</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/30">
                  <p className="text-2xl font-bold text-yellow-400">{warningRules.length}</p>
                  <p className="text-sm text-muted-foreground">Warning</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Empty State */}
          {rules.length === 0 && (
            <Card className="bg-card/50 backdrop-blur-sm border-border/50 border-dashed">
              <CardContent className="py-12 text-center">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Rules Configured</h3>
                <p className="text-muted-foreground mb-6">
                  Import from templates or create custom rules to start monitoring.
                </p>
                <div className="flex gap-2 justify-center">
                  <Button variant="outline" onClick={() => setActiveTab('templates')}>
                    <Download className="w-4 h-4 mr-2" />
                    Browse Templates
                  </Button>
                  <Button onClick={openCreateDialog}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Custom Rule
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Rules List */}
          <div className="grid gap-4">
            {paginatedRules.map((rule) => (
              <Card key={rule.id} className="bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${rule.enabled ? 'bg-primary/20' : 'bg-muted'}`}>
                        <FileText className={`w-5 h-5 ${rule.enabled ? 'text-primary' : 'text-muted-foreground'}`} />
                      </div>
                      <div>
                        <h3 className="font-semibold">{rule.name}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-1">{rule.description || "No description"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        {rule.sensor_type_filter && (
                          <Badge variant="outline" className={getSensorTypeColor(rule.sensor_type_filter)}>
                            {rule.sensor_type_filter.replace(/_/g, ' ')}
                          </Badge>
                        )}
                        <Badge className={getSeverityColor(rule.severity)}>
                          {rule.severity.toUpperCase()}
                        </Badge>
                      </div>
                      <Switch 
                        checked={rule.enabled} 
                        onCheckedChange={() => handleToggleEnabled(rule)}
                        disabled={updateMutation.isPending}
                      />
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(rule)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteConfirmRule(rule)}>
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
        </TabsContent>

        <TabsContent value="templates" className="mt-4">
          <Card className="mb-4 bg-card/50 border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Select value={templateCategoryFilter} onValueChange={setTemplateCategoryFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by category" />
                    </SelectTrigger>
                    <SelectContent>
                      {templateCategories.map(cat => (
                        <SelectItem key={cat} value={cat}>
                          {cat === 'all' ? 'All Categories' : cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-muted-foreground">
                    {filteredTemplates.length} templates
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleSelectAllTemplates}>
                    {selectedTemplates.size === filteredTemplates.length ? 'Deselect All' : 'Select All'}
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={handleImportSelectedRules} 
                    disabled={selectedTemplates.size === 0 || isImporting}
                  >
                    {isImporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                    Import {selectedTemplates.size > 0 ? `(${selectedTemplates.size})` : ''}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <ScrollArea className="h-[500px]">
            <div className="grid gap-2">
              {filteredTemplates.map((template, index) => (
                <Card 
                  key={index} 
                  className={`bg-card/50 border-border/50 cursor-pointer transition-colors ${selectedTemplates.has(index) ? 'border-primary ring-1 ring-primary/50' : 'hover:border-primary/30'}`}
                  onClick={() => handleToggleTemplate(index)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <Checkbox checked={selectedTemplates.has(index)} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-sm">{template.name}</h4>
                          <Badge variant="outline" className="text-xs">{template.category}</Badge>
                          <Badge className={getSeverityColor(template.severity)} variant="outline">
                            {template.severity}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{template.description}</p>
                      </div>
                      <code className="text-xs bg-muted px-2 py-1 rounded hidden md:block">
                        {template.conditions[0].field} {template.conditions[0].operator} {template.conditions[0].value}
                      </code>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Create Rule Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Create New Rule
            </DialogTitle>
            <DialogDescription>
              Configure an automation rule to monitor sensor data and trigger alerts.
            </DialogDescription>
          </DialogHeader>
          
          <RuleEditorForm isCreate={true} />
          
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleCreateRule} disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Create Rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Rule Dialog */}
      <Dialog open={!!editingRule} onOpenChange={(open) => !open && setEditingRule(null)}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5" />
              Edit Rule
            </DialogTitle>
            <DialogDescription>
              Modify the automation rule configuration.
            </DialogDescription>
          </DialogHeader>
          
          <RuleEditorForm isCreate={false} />
          
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setEditingRule(null)}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleUpdateRule} disabled={updateMutation.isPending}>
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmRule} onOpenChange={(open) => !open && setDeleteConfirmRule(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Delete Rule
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteConfirmRule?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirmRule(null)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteRule}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Delete Rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RulesContent;
