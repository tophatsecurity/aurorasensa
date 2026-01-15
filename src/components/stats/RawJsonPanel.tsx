import { useState, useMemo, useCallback } from "react";
import { Code2, Copy, Check, Download, RefreshCw, Clock, Database, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { callAuroraApi, hasAuroraSession } from "@/hooks/aurora";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface BatchInfo {
  batch_id?: string;
  id?: string;
  batch_timestamp?: string;
  timestamp?: string;
  received_at?: string;
  client_id?: string;
  readings?: unknown[];
  sensor_readings?: unknown[];
  count?: number;
}

interface RawJsonPanelProps {
  clientId: string;
}

export function RawJsonPanel({ clientId }: RawJsonPanelProps) {
  const [copied, setCopied] = useState(false);

  // Fetch batches for this client using direct API call
  const { 
    data: batchesResponse, 
    isLoading: batchesLoading,
    refetch: refetchBatches,
    error: batchesError
  } = useQuery({
    queryKey: ["aurora", "batches", "by-client", clientId, "latest"],
    queryFn: async () => {
      if (!clientId) return { batches: [], count: 0 };
      try {
        const response = await callAuroraApi<{ 
          batches: BatchInfo[]; 
          count?: number;
          total?: number;
        }>(`/api/batches/by-client/${clientId}?limit=10`);
        return {
          batches: response.batches || [],
          count: response.count || response.total || (response.batches?.length || 0),
        };
      } catch (error) {
        console.warn(`Failed to fetch batches for client ${clientId}:`, error);
        return { batches: [], count: 0 };
      }
    },
    enabled: hasAuroraSession() && !!clientId,
    staleTime: 30000,
    refetchInterval: 60000,
  });

  // Get the latest batch ID from the batches response
  const latestBatchId = useMemo(() => {
    const batchList = batchesResponse?.batches;
    
    if (!batchList || !Array.isArray(batchList) || batchList.length === 0) return null;
    
    // Sort by timestamp descending and get the first one
    const sorted = [...batchList].sort((a, b) => {
      const timeA = new Date(a.batch_timestamp || a.timestamp || a.received_at || 0).getTime();
      const timeB = new Date(b.batch_timestamp || b.timestamp || b.received_at || 0).getTime();
      return timeB - timeA;
    });
    
    return sorted[0]?.batch_id || sorted[0]?.id || null;
  }, [batchesResponse]);

  // Fetch the latest batch details
  const { 
    data: batchData, 
    isLoading: batchLoading,
    refetch: refetchBatch,
    error: batchError
  } = useQuery({
    queryKey: ["aurora", "batches", latestBatchId, "full"],
    queryFn: async () => {
      if (!latestBatchId) return null;
      try {
        const response = await callAuroraApi<BatchInfo>(`/api/batches/${latestBatchId}`);
        return response;
      } catch (error) {
        console.warn(`Failed to fetch batch ${latestBatchId}:`, error);
        return null;
      }
    },
    enabled: hasAuroraSession() && !!latestBatchId,
    staleTime: 30000,
  });

  const isLoading = batchesLoading || batchLoading;

  const jsonString = useMemo(() => {
    if (!batchData) return "{}";
    return JSON.stringify(batchData, null, 2);
  }, [batchData]);

  const handleCopy = useCallback(async () => {
    if (!batchData) {
      toast.error("No data to copy");
      return;
    }
    try {
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      toast.error("Failed to copy to clipboard");
    }
  }, [jsonString, batchData]);

  const handleDownload = useCallback(() => {
    if (!batchData) {
      toast.error("No data to download");
      return;
    }
    try {
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${clientId}_batch_${latestBatchId || Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Download started");
    } catch (err) {
      console.error('Failed to download:', err);
      toast.error("Failed to download");
    }
  }, [jsonString, clientId, latestBatchId, batchData]);

  const handleRefresh = useCallback(() => {
    refetchBatches();
    if (latestBatchId) refetchBatch();
    toast.info("Refreshing batch data...");
  }, [refetchBatches, refetchBatch, latestBatchId]);

  // Get batch metadata
  const batchTimestamp = useMemo(() => {
    if (!batchData) return null;
    const timestamp = batchData.timestamp || batchData.batch_timestamp || batchData.received_at;
    if (!timestamp) return null;
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return null;
    }
  }, [batchData]);

  const readingsCount = useMemo(() => {
    if (!batchData) return 0;
    return batchData.readings?.length || batchData.sensor_readings?.length || batchData.count || 0;
  }, [batchData]);

  // Handle errors
  const hasError = batchesError || batchError;

  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent className="p-3">
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (hasError) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-8 text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 text-destructive opacity-70" />
          <p className="text-muted-foreground mb-2">Failed to load batch data</p>
          <p className="text-xs text-muted-foreground/70 mb-4">
            {(batchesError as Error)?.message || (batchError as Error)?.message || "Unknown error"}
          </p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!latestBatchId || !batchData) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-8 text-center">
          <Code2 className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">No batch data available for this client</p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            className="mt-4"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-primary" />
              <span>Latest Batch</span>
            </div>
            <div className="flex items-center gap-3 text-xs font-normal text-muted-foreground">
              {batchTimestamp && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {batchTimestamp}
                </span>
              )}
              {readingsCount > 0 && (
                <span className="flex items-center gap-1">
                  <Database className="w-3 h-3" />
                  {readingsCount} readings
                </span>
              )}
              <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded">
                {latestBatchId}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              className="h-7 px-2"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Refresh
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleDownload}
              className="h-7 px-2"
            >
              <Download className="w-3 h-3 mr-1" />
              Download
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleCopy}
              className="h-7 px-2"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 mr-1" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 mr-1" />
                  Copy
                </>
              )}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3">
        <ScrollArea className="h-[400px] rounded-lg border border-border/50 bg-muted/20">
          <pre className="p-4 text-xs font-mono text-foreground/90 whitespace-pre-wrap break-all">
            {jsonString}
          </pre>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}