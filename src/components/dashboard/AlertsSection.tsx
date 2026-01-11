import { memo } from "react";
import { AlertTriangle, Bell, CheckCircle, XCircle, Loader2, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  useAlerts,
  useAlertStats,
} from "@/hooks/aurora/alerts";
import { formatLastSeen } from "@/utils/dateUtils";

interface AlertsSectionProps {
  limit?: number;
}

export const AlertsSection = memo(function AlertsSection({ limit = 10 }: AlertsSectionProps) {
  const { data: alertsData, isLoading: alertsLoading } = useAlerts();
  const alerts = alertsData?.alerts || [];
  const { data: stats } = useAlertStats();

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return 'bg-destructive/20 text-destructive border-destructive/30';
      case 'error': return 'bg-destructive/20 text-destructive border-destructive/30';
      case 'warning': return 'bg-warning/20 text-warning border-warning/30';
      case 'info': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default: return 'bg-muted/20 text-muted-foreground';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
      case 'error':
        return <XCircle className="w-4 h-4" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  const activeAlerts = stats?.active ?? alerts.filter(a => a.status === 'active' && !a.acknowledged_at).length ?? 0;
  const resolvedAlerts = stats?.resolved ?? 0;
  const acknowledgedAlerts = stats?.acknowledged ?? 0;

  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Bell className="w-5 h-5 text-amber-500" />
        Alerts & Notifications
        {activeAlerts > 0 && (
          <Badge variant="destructive" className="ml-2">
            {activeAlerts} Active
          </Badge>
        )}
      </h2>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="glass-card rounded-lg p-4 border border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-destructive/20 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-destructive" />
            </div>
            <span className="text-xs text-muted-foreground">Active</span>
          </div>
          <div className="text-2xl font-bold text-destructive">
            {activeAlerts}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Needs attention
          </div>
        </div>

        <div className="glass-card rounded-lg p-4 border border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-warning/20 flex items-center justify-center">
              <Clock className="w-4 h-4 text-warning" />
            </div>
            <span className="text-xs text-muted-foreground">Acknowledged</span>
          </div>
          <div className="text-2xl font-bold text-warning">
            {acknowledgedAlerts}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Being addressed
          </div>
        </div>

        <div className="glass-card rounded-lg p-4 border border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-success/20 flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-success" />
            </div>
            <span className="text-xs text-muted-foreground">Resolved</span>
          </div>
          <div className="text-2xl font-bold text-success">
            {resolvedAlerts}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Completed
          </div>
        </div>

        <div className="glass-card rounded-lg p-4 border border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Bell className="w-4 h-4 text-blue-400" />
            </div>
            <span className="text-xs text-muted-foreground">Last 24h</span>
          </div>
          <div className="text-2xl font-bold text-blue-400">
            {stats?.last_24h ?? "—"}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Total alerts
          </div>
        </div>
      </div>

      {/* Alerts List */}
      {alertsLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : alerts && alerts.length > 0 ? (
        <div className="glass-card rounded-xl border border-border/50 overflow-hidden">
          <div className="divide-y divide-border/30">
            {alerts.slice(0, limit).map((alert) => {
              const isResolved = alert.resolved || !!alert.resolved_at || alert.status === 'resolved';
              const isAcknowledged = alert.acknowledged || !!alert.acknowledged_at;
              const alertType = alert.sensor_type || alert.rule_name || alert.type || 'Alert';
              const deviceId = alert.sensor_id || alert.device_id;
              const alertTimestamp = alert.triggered_at || alert.timestamp || '';
              return (
                <div 
                  key={alert.alert_id} 
                  className={`p-4 flex items-start gap-4 ${isResolved ? 'opacity-60' : ''}`}
                >
                  <div className={`p-2 rounded-lg ${getSeverityColor(alert.severity)}`}>
                    {getSeverityIcon(alert.severity)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{alertType}</span>
                      <Badge variant="outline" className={`text-xs ${getSeverityColor(alert.severity)}`}>
                        {alert.severity}
                      </Badge>
                      {isResolved && (
                        <Badge variant="outline" className="text-xs bg-success/20 text-success">
                          Resolved
                        </Badge>
                      )}
                      {isAcknowledged && !isResolved && (
                        <Badge variant="outline" className="text-xs bg-warning/20 text-warning">
                          Acknowledged
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{alert.message}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span>{formatLastSeen(alertTimestamp)}</span>
                      {deviceId && <span>Device: {deviceId}</span>}
                    </div>
                  </div>
                  {!isResolved && !isAcknowledged && (
                    <Button variant="outline" size="sm" className="text-xs">
                      Acknowledge
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="glass-card rounded-xl p-8 text-center border border-border/50">
          <CheckCircle className="w-12 h-12 mx-auto mb-3 text-success/50" />
          <p className="text-muted-foreground">No active alerts</p>
        </div>
      )}
    </div>
  );
});

export default AlertsSection;
