import { useState } from "react";
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  Plus,
  RefreshCw,
  Loader2,
  BookOpen,
  Eye,
  Zap,
  Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useBaselineProfiles,
  useBaselineViolations,
} from "@/hooks/useAuroraApi";
import { useQueryClient } from "@tanstack/react-query";

const BaselinesContent = () => {
  const queryClient = useQueryClient();
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);
  
  const { data: profiles, isLoading: profilesLoading } = useBaselineProfiles();
  const { data: violations, isLoading: violationsLoading } = useBaselineViolations();
  
  const isLoading = profilesLoading || violationsLoading;

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["aurora", "baselines"] });
  };

  const activeViolations = violations?.filter((v: any) => !v.acknowledged) || [];

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between p-6 border-b border-border/50">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <Shield className="w-7 h-7 text-primary" />
            Baseline Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor device behavior and detect anomalies
          </p>
        </div>
        <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isLoading}>
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        </Button>
      </div>

      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="violations" className="h-full flex flex-col">
          <div className="px-6 pt-4">
            <TabsList>
              <TabsTrigger value="violations" className="gap-2">
                <AlertTriangle className="w-4 h-4" />
                Violations
                {activeViolations.length > 0 && (
                  <Badge variant="destructive" className="ml-1">{activeViolations.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="profiles" className="gap-2">
                <BookOpen className="w-4 h-4" />
                Profiles
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="violations" className="flex-1 overflow-auto px-6 pb-6">
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                  Active Violations ({activeViolations.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activeViolations.length === 0 ? (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    <CheckCircle className="w-5 h-5 mr-2 text-success" />
                    No active violations
                  </div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2">
                      {activeViolations.map((v: any, idx: number) => (
                        <div key={v.id || idx} className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                          <div className="flex items-center justify-between">
                            <Badge variant="destructive">{v.violation_type || v.type || "Unknown"}</Badge>
                            <span className="text-xs text-muted-foreground">{v.detected_at || v.timestamp}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profiles" className="flex-1 overflow-auto px-6 pb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {profiles?.map((profile: any) => (
                <Card key={profile.id} className="glass-card cursor-pointer" onClick={() => setSelectedProfileId(profile.id)}>
                  <CardContent className="p-4">
                    <h3 className="font-semibold">{profile.name}</h3>
                    <p className="text-xs text-muted-foreground">{profile.description || "No description"}</p>
                  </CardContent>
                </Card>
              ))}
              {(!profiles || profiles.length === 0) && !profilesLoading && (
                <div className="col-span-full flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Shield className="w-12 h-12 mb-4 opacity-50" />
                  <p>No baseline profiles created yet</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default BaselinesContent;
