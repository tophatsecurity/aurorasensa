import { FileText, Plus, Trash2, Edit, Loader2, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useAlertRules } from "@/hooks/useAuroraApi";
import { useQueryClient } from "@tanstack/react-query";

const RulesContent = () => {
  const { data: rulesData, isLoading, error } = useAlertRules();
  const queryClient = useQueryClient();

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["aurora", "alerts", "rules"] });
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
  const disabledRules = rules.filter(r => !r.enabled);
  const criticalRules = rules.filter(r => r.severity === 'critical');
  const warningRules = rules.filter(r => r.severity === 'warning');

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
        {rules.slice(0, 20).map((rule) => (
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
                  <Switch checked={rule.enabled} />
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {rules.length > 20 && (
        <p className="text-center text-muted-foreground mt-4">
          Showing 20 of {rules.length} rules
        </p>
      )}
    </div>
  );
};

export default RulesContent;