import { useState } from "react";
import { FileText, Shield, Bell, Activity } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import RulesContent from "./RulesContent";
import BaselinesContent from "./BaselinesContent";
import { useAlertRules } from "@/hooks/aurora/alerts";
import { useBaselineViolations } from "@/hooks/useAuroraApi";

const RulesBaselinesContent = () => {
  const [activeTab, setActiveTab] = useState("rules");
  
  const { data: rulesData } = useAlertRules();
  const { data: violations } = useBaselineViolations();
  
  const rules = rulesData?.rules || [];
  const enabledRules = rules.filter(r => r.enabled);
  const activeViolations = violations?.filter((v: any) => !v.acknowledged) || [];

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-border/50">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
              <Bell className="w-5 h-5 text-primary" />
            </div>
            Rules & Baselines
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure alert rules and monitor baseline behavior
          </p>
        </div>
        
        {/* Quick Stats */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card/50 border border-border/50">
            <FileText className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">{enabledRules.length}</span>
            <span className="text-xs text-muted-foreground">Active Rules</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card/50 border border-border/50">
            <Activity className="w-4 h-4 text-destructive" />
            <span className="text-sm font-medium">{activeViolations.length}</span>
            <span className="text-xs text-muted-foreground">Violations</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <div className="px-6 pt-4 border-b border-border/50">
          <TabsList className="bg-card/50">
            <TabsTrigger value="rules" className="gap-2 data-[state=active]:bg-primary/10">
              <FileText className="w-4 h-4" />
              Alert Rules
              {enabledRules.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {enabledRules.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="baselines" className="gap-2 data-[state=active]:bg-primary/10">
              <Shield className="w-4 h-4" />
              Baselines
              {activeViolations.length > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">
                  {activeViolations.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="rules" className="flex-1 overflow-hidden m-0">
          <RulesContent />
        </TabsContent>

        <TabsContent value="baselines" className="flex-1 overflow-hidden m-0">
          <BaselinesContent />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RulesBaselinesContent;
