import { useState, useMemo } from "react";
import { Code2, Copy, Check, Download, RefreshCw, Clock, Database } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useBatchesByClient, useBatchById } from "@/hooks/aurora";
import { formatDistanceToNow } from "date-fns";

interface RawJsonPanelProps {
  clientId: string;
}

export function RawJsonPanel({ clientId }: RawJsonPanelProps) {
  const [copied, setCopied] = useState(false);

  // Fetch batches for this client
  const { 
    data: batches, 
    isLoading: batchesLoading,
    refetch: refetchBatches 
  } = useBatchesByClient(clientId);

  // Get the latest batch ID from the batches response
  const latestBatchId = useMemo(() => {
    if (!batches) return null;
    
    // Handle the new response format: { batches: [...], count: number }
    const batchList = (batches as { batches?: Array<{ batch_id?: string; id?: string; batch_timestamp?: string; timestamp?: string; received_at?: string }> })?.batches;
    
    if (!batchList || !Array.isArray(batchList) || batchList.length === 0) return null;
    
    // Sort by timestamp descending and get the first one
    const sorted = [...batchList].sort((a, b) => {
      const timeA = new Date(a.batch_timestamp || a.timestamp || a.received_at || 0).getTime();
      const timeB = new Date(b.batch_timestamp || b.timestamp || b.received_at || 0).getTime();
      return timeB - timeA;
    });
    
    return sorted[0]?.batch_id || sorted[0]?.id || null;
  }, [batches]);

  // Fetch the latest batch details
  const { 
    data: batchData, 
    isLoading: batchLoading,
    refetch: refetchBatch 
  } = useBatchById(latestBatchId || "");

  const isLoading = batchesLoading || batchLoading;

  const jsonString = useMemo(() => {
    return JSON.stringify(batchData, null, 2);
  }, [batchData]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${clientId}_batch_${latestBatchId || Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRefresh = () => {
    refetchBatches();
    if (latestBatchId) refetchBatch();
  };

  // Get batch metadata
  const batchTimestamp = useMemo(() => {
    if (!batchData) return null;
    const timestamp = (batchData as any).timestamp || (batchData as any).received_at;
    if (!timestamp) return null;
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return null;
    }
  }, [batchData]);

  const readingsCount = useMemo(() => {
    if (!batchData) return 0;
    const data = batchData as any;
    return data.readings?.length || data.sensor_readings?.length || data.count || 0;
  }, [batchData]);

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