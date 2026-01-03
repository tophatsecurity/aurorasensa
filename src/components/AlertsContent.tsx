import { Bell, Loader2, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAlerts } from "@/hooks/useAuroraApi";
import { useQueryClient } from "@tanstack/react-query";
import { usePagination } from "@/hooks/usePagination";
import { TablePagination } from "@/components/TablePagination";

const AlertsContent = () => {
  const { data: alerts, isLoading, error } = useAlerts();
  const queryClient = useQueryClient();

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["aurora", "alerts"] });
  };

  const alertsList = alerts || [];

  const {
    currentPage,
    totalPages,
    itemsPerPage,
    startIndex,
    endIndex,
    setCurrentPage,
    setItemsPerPage,
    paginateData,
  } = usePagination<typeof alertsList[number]>({
    totalItems: alertsList.length,
    itemsPerPage: 10,
  });

  const paginatedAlerts = paginateData(alertsList);

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

  return (
    <div className="flex-1 overflow-y-auto p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold text-foreground">Alerts</h1>
          {alerts && alerts.length > 0 && (
            <Badge className="bg-destructive/20 text-destructive border-destructive/30 px-3 py-1">
              {alerts.length} Active
            </Badge>
          )}
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
      ) : alertsList.length > 0 ? (
        <>
          <div className="space-y-3">
            {paginatedAlerts.map((alert) => (
              <div 
                key={alert.id}
                className="glass-card rounded-xl p-5 border border-border/50 hover:border-primary/30 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center flex-shrink-0">
                      <Bell className="w-5 h-5 text-warning" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={getSeverityColor(alert.severity)}>
                          {alert.severity.toUpperCase()}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{alert.type}</span>
                      </div>
                      <p className="text-foreground">{alert.message}</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                    {alert.timestamp}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={alertsList.length}
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
            All systems are operating normally.
          </p>
        </div>
      )}
    </div>
  );
};

export default AlertsContent;
