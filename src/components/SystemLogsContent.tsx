import { useState } from "react";
import { 
  FileText, 
  RefreshCw, 
  Download, 
  Server, 
  Database, 
  Terminal,
  Loader2,
  Clock,
  Search,
  Filter,
  ChevronDown
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useDatacollectorLogs, useDataserverLogs, useLogs } from "@/hooks/useAuroraApi";
import { useQueryClient } from "@tanstack/react-query";

interface LogLine {
  timestamp?: string;
  level?: string;
  message: string;
}

const parseLogLine = (line: string): LogLine => {
  // Try to parse structured log format: [timestamp] [level] message
  const structuredMatch = line.match(/^\[([^\]]+)\]\s*\[([^\]]+)\]\s*(.+)$/);
  if (structuredMatch) {
    return {
      timestamp: structuredMatch[1],
      level: structuredMatch[2].toUpperCase(),
      message: structuredMatch[3],
    };
  }
  
  // Try to parse Python log format: timestamp - level - message
  const pythonMatch = line.match(/^(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}[\d.,]*)\s*[-:]\s*(\w+)\s*[-:]\s*(.+)$/);
  if (pythonMatch) {
    return {
      timestamp: pythonMatch[1],
      level: pythonMatch[2].toUpperCase(),
      message: pythonMatch[3],
    };
  }
  
  return { message: line };
};

const getLevelBadgeVariant = (level?: string): "default" | "secondary" | "destructive" | "outline" => {
  if (!level) return "outline";
  const l = level.toLowerCase();
  if (l === "error" || l === "critical" || l === "fatal") return "destructive";
  if (l === "warning" || l === "warn") return "default";
  if (l === "info") return "secondary";
  return "outline";
};

const LogViewer = ({ logs, isLoading, title }: { logs: string | null | undefined; isLoading: boolean; title: string }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showErrors, setShowErrors] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(10)].map((_, i) => (
          <Skeleton key={i} className="h-6 w-full" />
        ))}
      </div>
    );
  }

  if (!logs) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No logs available
      </div>
    );
  }

  const lines = logs.split("\n").filter(Boolean);
  const parsedLines = lines.map(parseLogLine);
  
  const filteredLines = parsedLines.filter((line) => {
    const matchesSearch = searchTerm === "" || 
      line.message.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesError = !showErrors || 
      (line.level && ["error", "critical", "fatal", "warning", "warn"].includes(line.level.toLowerCase()));
    return matchesSearch && matchesError;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          variant={showErrors ? "default" : "outline"}
          size="sm"
          onClick={() => setShowErrors(!showErrors)}
        >
          <Filter className="w-4 h-4 mr-2" />
          Errors Only
        </Button>
      </div>
      
      <div className="text-xs text-muted-foreground">
        Showing {filteredLines.length} of {parsedLines.length} lines
      </div>

      <ScrollArea className="h-[500px] rounded-md border bg-muted/20">
        <div className="p-4 font-mono text-xs space-y-1">
          {filteredLines.map((line, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2 py-1 hover:bg-white/5 rounded px-1"
            >
              {line.timestamp && (
                <span className="text-muted-foreground shrink-0">
                  {line.timestamp}
                </span>
              )}
              {line.level && (
                <Badge variant={getLevelBadgeVariant(line.level)} className="shrink-0 text-[10px] py-0">
                  {line.level}
                </Badge>
              )}
              <span className="text-foreground break-all">{line.message}</span>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

const SystemLogsContent = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("datacollector");

  const { data: datacollectorLogs, isLoading: dcLoading } = useDatacollectorLogs();
  const { data: dataserverLogs, isLoading: dsLoading } = useDataserverLogs();
  const { data: generalLogs, isLoading: generalLoading } = useLogs(200);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["aurora", "logs"] });
  };

  const downloadLogs = (content: string | null | undefined, filename: string) => {
    if (!content) return;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-border shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">System Logs</h1>
            <p className="text-muted-foreground">View datacollector and dataserver logs</p>
          </div>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Datacollector</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {dcLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-2xl font-bold">
                    {datacollectorLogs ? datacollectorLogs.split("\n").filter(Boolean).length : 0}
                    <span className="text-sm font-normal text-muted-foreground ml-1">lines</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Dataserver</CardTitle>
                <Server className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {dsLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-2xl font-bold">
                    {dataserverLogs ? dataserverLogs.split("\n").filter(Boolean).length : 0}
                    <span className="text-sm font-normal text-muted-foreground ml-1">lines</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">General Logs</CardTitle>
                <Terminal className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {generalLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-2xl font-bold">
                    {generalLogs?.length || 0}
                    <span className="text-sm font-normal text-muted-foreground ml-1">entries</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Logs Tabs */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Log Viewer</CardTitle>
                  <CardDescription>View and search through system logs</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (activeTab === "datacollector") {
                      downloadLogs(datacollectorLogs, "datacollector.log");
                    } else if (activeTab === "dataserver") {
                      downloadLogs(dataserverLogs, "dataserver.log");
                    } else {
                      const content = generalLogs?.map(l => `[${l.timestamp}] [${l.level}] ${l.message}`).join("\n");
                      downloadLogs(content, "general.log");
                    }
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-4">
                  <TabsTrigger value="datacollector" className="gap-2">
                    <Database className="w-4 h-4" />
                    Datacollector
                  </TabsTrigger>
                  <TabsTrigger value="dataserver" className="gap-2">
                    <Server className="w-4 h-4" />
                    Dataserver
                  </TabsTrigger>
                  <TabsTrigger value="general" className="gap-2">
                    <Terminal className="w-4 h-4" />
                    General
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="datacollector">
                  <LogViewer 
                    logs={datacollectorLogs} 
                    isLoading={dcLoading} 
                    title="Datacollector Logs" 
                  />
                </TabsContent>

                <TabsContent value="dataserver">
                  <LogViewer 
                    logs={dataserverLogs} 
                    isLoading={dsLoading} 
                    title="Dataserver Logs" 
                  />
                </TabsContent>

                <TabsContent value="general">
                  {generalLoading ? (
                    <div className="space-y-2">
                      {[...Array(10)].map((_, i) => (
                        <Skeleton key={i} className="h-6 w-full" />
                      ))}
                    </div>
                  ) : (
                    <ScrollArea className="h-[500px] rounded-md border bg-muted/20">
                      <div className="p-4 font-mono text-xs space-y-1">
                        {generalLogs?.map((log, idx) => (
                          <div
                            key={idx}
                            className="flex items-start gap-2 py-1 hover:bg-white/5 rounded px-1"
                          >
                            <span className="text-muted-foreground shrink-0">
                              {log.timestamp}
                            </span>
                            <Badge variant={getLevelBadgeVariant(log.level)} className="shrink-0 text-[10px] py-0">
                              {log.level}
                            </Badge>
                            <span className="text-foreground break-all">{log.message}</span>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
};

export default SystemLogsContent;
