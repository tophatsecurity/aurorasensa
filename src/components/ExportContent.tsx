import { useState, useMemo, useCallback } from "react";
import { Download, FileSpreadsheet, FileText, Filter, Loader2, Columns, Settings2, Database, ChevronDown, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { useExportTypes, useExportStats, buildExportUrl, type ExportType, type ExportOptions } from "@/hooks/aurora/export";
import { useClients } from "@/hooks/aurora/clients";
import { callAuroraApi } from "@/hooks/aurora/core";

// Hostname validation helper
const isValidHostname = (val: unknown): val is string => {
  if (typeof val !== 'string') return false;
  const lower = val.toLowerCase().trim();
  return lower.length > 0 && 
    !['unknown', 'undefined', 'null', '[object', 'object object'].some(bad => lower.includes(bad));
};

const getClientDisplayName = (client: { client_id: string; hostname?: string; name?: string }, index: number): string => {
  if (isValidHostname(client.hostname)) return client.hostname;
  if (isValidHostname(client.name)) return client.name;
  if (client.client_id && client.client_id !== 'unknown') {
    return client.client_id.length > 16 ? `${client.client_id.slice(0, 12)}…` : client.client_id;
  }
  return `Client ${index + 1}`;
};

const ExportContent = () => {
  const { toast } = useToast();
  const { data: exportTypesData, isLoading: typesLoading } = useExportTypes();
  const { data: clientsData } = useClients();
  
  // State
  const [selectedType, setSelectedType] = useState<string>("");
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [timeRange, setTimeRange] = useState<string>("24h");
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [deviceFilter, setDeviceFilter] = useState<string>("");
  const [exportFormat, setExportFormat] = useState<'csv' | 'tsv'>('csv');
  const [isDownloading, setIsDownloading] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [clientsOpen, setClientsOpen] = useState(false);

  // Get export types - ensure it's always an array
  const exportTypes = Array.isArray(exportTypesData?.export_types) ? exportTypesData.export_types : [];
  const selectedExportType = exportTypes.find(t => t.type === selectedType);
  
  // Parse hours from time range
  const hours = useMemo(() => {
    switch (timeRange) {
      case "1h": return 1;
      case "6h": return 6;
      case "12h": return 12;
      case "24h": return 24;
      case "7d": return 168;
      case "30d": return 720;
      case "all": return undefined;
      default: return 24;
    }
  }, [timeRange]);

  // Build export options (use first selected client for stats, or all)
  const exportOptions: ExportOptions | null = selectedType ? {
    exportType: selectedType,
    format: exportFormat,
    hours,
    clientId: selectedClients.length === 1 ? selectedClients[0] : undefined,
    deviceId: deviceFilter || undefined,
    columns: selectedColumns.length > 0 ? selectedColumns : undefined,
  } : null;

  // Fetch stats for selected export
  const { data: exportStats, isLoading: statsLoading } = useExportStats(exportOptions);

  // Toggle client selection
  const toggleClient = (clientId: string) => {
    setSelectedClients(prev =>
      prev.includes(clientId)
        ? prev.filter(c => c !== clientId)
        : [...prev, clientId]
    );
  };

  const selectAllClients = () => {
    setSelectedClients(clients.map(c => c.client_id));
  };

  const clearClientSelection = () => {
    setSelectedClients([]);
  };

  // Handle type selection
  const handleTypeChange = (type: string) => {
    setSelectedType(type);
    const typeInfo = exportTypes.find(t => t.type === type);
    if (typeInfo) {
      setSelectedColumns(typeInfo.default_columns || []);
    }
  };

  // Toggle column selection
  const toggleColumn = (column: string) => {
    setSelectedColumns(prev => 
      prev.includes(column) 
        ? prev.filter(c => c !== column)
        : [...prev, column]
    );
  };

  // Select all / none columns
  const selectAllColumns = () => {
    if (selectedExportType) {
      setSelectedColumns(selectedExportType.available_columns || []);
    }
  };

  const selectDefaultColumns = () => {
    if (selectedExportType) {
      setSelectedColumns(selectedExportType.default_columns || []);
    }
  };

  // Handle download
  const handleDownload = useCallback(async () => {
    if (!exportOptions) return;
    
    setIsDownloading(true);
    try {
      const path = buildExportUrl(exportOptions);
      const response = await callAuroraApi<string>(path, 'GET', undefined, { timeout: 120000 });
      
      // Create blob and trigger download
      const blob = new Blob([response], { 
        type: exportFormat === 'tsv' ? 'text/tab-separated-values' : 'text/csv' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedType}_export_${new Date().toISOString().slice(0,10)}.${exportFormat}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Export Complete",
        description: `Downloaded ${exportStats?.filtered_records?.toLocaleString() || 'data'} records as ${exportFormat.toUpperCase()}`,
      });
    } catch (error) {
      console.error("Export failed:", error);
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Failed to download export",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  }, [exportOptions, exportFormat, selectedType, exportStats, toast]);

  // Group export types by category
  const groupedTypes = useMemo(() => {
    const groups: Record<string, ExportType[]> = {
      "Raw Data": [],
      "Sensors": [],
      "Statistics": [],
      "Other": [],
    };
    
    exportTypes.forEach(type => {
      if (['readings', 'batches'].includes(type.type)) {
        groups["Raw Data"].push(type);
      } else if (['hourly', 'sixhour', 'twelvehour', 'daily', 'weekly', 'monthly'].includes(type.type)) {
        groups["Statistics"].push(type);
      } else if (['adsb', 'bluetooth', 'wifi', 'starlink', 'starlink_telemetry', 'system_monitor', 'thermal', 'arduino', 'lora'].includes(type.type)) {
        groups["Sensors"].push(type);
      } else {
        groups["Other"].push(type);
      }
    });
    
    return groups;
  }, [exportTypes]);

  const clients = clientsData || [];

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Export Data</h1>
        <p className="text-muted-foreground">Export sensor data with flexible filtering and column selection</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Export Type & Filters */}
        <div className="lg:col-span-2 space-y-6">
          {/* Export Type Selection */}
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Database className="w-5 h-5" />
                Export Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              {typesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(groupedTypes).map(([group, types]) => 
                    types.length > 0 && (
                      <div key={group}>
                        <Label className="text-xs text-muted-foreground uppercase tracking-wide">{group}</Label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                          {types.map((type) => (
                            <Button
                              key={type.type}
                              variant={selectedType === type.type ? "default" : "outline"}
                              size="sm"
                              className="justify-start h-auto py-2 px-3"
                              onClick={() => handleTypeChange(type.type)}
                            >
                              <div className="text-left">
                                <div className="font-medium capitalize">{type.type.replace(/_/g, ' ')}</div>
                                <div className="text-xs opacity-70">{type.available_columns?.length || 0} columns</div>
                              </div>
                            </Button>
                          ))}
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Filters */}
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Time Range</Label>
                  <Select value={timeRange} onValueChange={setTimeRange}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1h">Last Hour</SelectItem>
                      <SelectItem value="6h">Last 6 Hours</SelectItem>
                      <SelectItem value="12h">Last 12 Hours</SelectItem>
                      <SelectItem value="24h">Last 24 Hours</SelectItem>
                      <SelectItem value="7d">Last 7 Days</SelectItem>
                      <SelectItem value="30d">Last 30 Days</SelectItem>
                      <SelectItem value="all">All Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="sm:col-span-2">
                  <Label className="text-sm text-muted-foreground">Clients</Label>
                  <Popover open={clientsOpen} onOpenChange={setClientsOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full mt-1 justify-between font-normal"
                      >
                        <span className="truncate">
                          {selectedClients.length === 0 
                            ? "All Clients" 
                            : selectedClients.length === 1
                              ? getClientDisplayName(clients.find(c => c.client_id === selectedClients[0]) || { client_id: selectedClients[0] }, 0)
                              : `${selectedClients.length} clients selected`
                          }
                        </span>
                        <ChevronDown className="w-4 h-4 ml-2 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-0 bg-popover border-border z-50" align="start">
                      <div className="p-2 border-b border-border flex gap-2">
                        <Button variant="ghost" size="sm" onClick={selectAllClients} className="flex-1">
                          Select All
                        </Button>
                        <Button variant="ghost" size="sm" onClick={clearClientSelection} className="flex-1">
                          Clear
                        </Button>
                      </div>
                      <ScrollArea className="h-64">
                        <div className="p-2 space-y-1">
                          {clients.map((client, index) => {
                            const displayName = getClientDisplayName(client, index);
                            const isSelected = selectedClients.includes(client.client_id);
                            return (
                              <div
                                key={client.client_id}
                                className={`flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-accent/50 ${isSelected ? 'bg-accent' : ''}`}
                                onClick={() => toggleClient(client.client_id)}
                              >
                                <Checkbox checked={isSelected} className="pointer-events-none" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{displayName}</p>
                                  {displayName !== client.client_id && (
                                    <p className="text-xs text-muted-foreground font-mono truncate">
                                      {client.client_id.slice(0, 20)}
                                    </p>
                                  )}
                                </div>
                                {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                              </div>
                            );
                          })}
                          {clients.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-4">No clients available</p>
                          )}
                        </div>
                      </ScrollArea>
                      {selectedClients.length > 0 && (
                        <div className="p-2 border-t border-border">
                          <p className="text-xs text-muted-foreground text-center">
                            {selectedClients.length} of {clients.length} selected
                          </p>
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                </div>

                {selectedExportType?.supports_device_filter && (
                  <div>
                    <Label className="text-sm text-muted-foreground">Device ID (optional)</Label>
                    <input
                      type="text"
                      value={deviceFilter}
                      onChange={(e) => setDeviceFilter(e.target.value)}
                      placeholder="e.g., starlink_dish_1"
                      className="mt-1 w-full px-3 py-2 text-sm rounded-md border border-input bg-background"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Column Selection */}
          {selectedExportType && (
            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
              <Collapsible open={columnsOpen} onOpenChange={setColumnsOpen}>
                <CardHeader className="cursor-pointer" onClick={() => setColumnsOpen(!columnsOpen)}>
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between w-full">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Columns className="w-5 h-5" />
                        Columns
                        <Badge variant="secondary" className="ml-2">
                          {selectedColumns.length} / {selectedExportType.available_columns?.length || 0}
                        </Badge>
                      </CardTitle>
                      <ChevronDown className={`w-5 h-5 transition-transform ${columnsOpen ? 'rotate-180' : ''}`} />
                    </div>
                  </CollapsibleTrigger>
                </CardHeader>
                <CollapsibleContent>
                  <CardContent>
                    <div className="flex gap-2 mb-4">
                      <Button variant="outline" size="sm" onClick={selectAllColumns}>
                        Select All
                      </Button>
                      <Button variant="outline" size="sm" onClick={selectDefaultColumns}>
                        Reset to Default
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setSelectedColumns([])}>
                        Clear All
                      </Button>
                    </div>
                    <ScrollArea className="h-48">
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                        {selectedExportType.available_columns?.map((column) => (
                          <div key={column} className="flex items-center space-x-2">
                            <Checkbox
                              id={column}
                              checked={selectedColumns.includes(column)}
                              onCheckedChange={() => toggleColumn(column)}
                            />
                            <Label 
                              htmlFor={column} 
                              className="text-sm cursor-pointer font-mono truncate"
                              title={column}
                            >
                              {column}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          )}
        </div>

        {/* Right Column - Format & Download */}
        <div className="space-y-4">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings2 className="w-5 h-5" />
                Export Format
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                variant={exportFormat === 'csv' ? 'default' : 'outline'} 
                className="w-full justify-start gap-3 h-14"
                onClick={() => setExportFormat('csv')}
              >
                <div className="w-10 h-10 rounded bg-primary/20 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left flex-1">
                  <p className="font-medium">CSV</p>
                  <p className="text-xs opacity-70">Comma-separated values</p>
                </div>
                {exportFormat === 'csv' && <Check className="w-4 h-4" />}
              </Button>
              <Button 
                variant={exportFormat === 'tsv' ? 'default' : 'outline'} 
                className="w-full justify-start gap-3 h-14"
                onClick={() => setExportFormat('tsv')}
              >
                <div className="w-10 h-10 rounded bg-accent/20 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-accent-foreground" />
                </div>
                <div className="text-left flex-1">
                  <p className="font-medium">TSV</p>
                  <p className="text-xs opacity-70">Tab-separated values</p>
                </div>
                {exportFormat === 'tsv' && <Check className="w-4 h-4" />}
              </Button>
            </CardContent>
          </Card>

          {/* Export Stats & Download */}
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardContent className="p-4">
              {statsLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : exportStats ? (
                <div className="text-center mb-4 space-y-2">
                  <p className="text-sm text-muted-foreground">Estimated Export</p>
                  <p className="text-3xl font-bold">{exportStats.filtered_records?.toLocaleString() || 0}</p>
                  <p className="text-xs text-muted-foreground">records</p>
                  <div className="flex justify-center gap-4 text-xs text-muted-foreground pt-2">
                    <span>~{exportStats.estimated_size_mb?.toFixed(1) || 0} MB</span>
                    <span>{selectedColumns.length} columns</span>
                  </div>
                </div>
              ) : selectedType ? (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  Configure export to see stats
                </div>
              ) : (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  Select an export type to begin
                </div>
              )}
              
              <Button 
                className="w-full gap-2" 
                disabled={!selectedType || isDownloading || selectedColumns.length === 0}
                onClick={handleDownload}
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Download {exportFormat.toUpperCase()}
                  </>
                )}
              </Button>
              
              {selectedType && selectedColumns.length === 0 && (
                <p className="text-xs text-destructive text-center mt-2">
                  Select at least one column
                </p>
              )}
            </CardContent>
          </Card>

          {/* Type Description */}
          {selectedExportType && (
            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardContent className="p-4">
                <h4 className="font-medium capitalize mb-2">{selectedExportType.type.replace(/_/g, ' ')}</h4>
                <p className="text-sm text-muted-foreground">{selectedExportType.description}</p>
                <div className="flex flex-wrap gap-1 mt-3">
                  {selectedExportType.supports_client_filter && (
                    <Badge variant="outline" className="text-xs">Client Filter</Badge>
                  )}
                  {selectedExportType.supports_device_filter && (
                    <Badge variant="outline" className="text-xs">Device Filter</Badge>
                  )}
                  {selectedExportType.supports_sensor_filter && (
                    <Badge variant="outline" className="text-xs">Sensor Filter</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExportContent;
