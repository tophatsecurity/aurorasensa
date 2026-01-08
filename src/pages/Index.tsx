import { useState } from "react";
import AuroraBackground from "@/components/AuroraBackground";
import Sidebar from "@/components/Sidebar";
import DashboardContent from "@/components/DashboardContent";
import CorrelationContent from "@/components/CorrelationContent";
import SensorsContent from "@/components/SensorsContent";
import AlertsContent from "@/components/AlertsContent";
import MapContent from "@/components/MapContent";
import ClientsContent from "@/components/ClientsContent";
import RulesContent from "@/components/RulesContent";
import PowerAnalyticsContent from "@/components/PowerAnalyticsContent";
import DataBatchesContent from "@/components/DataBatchesContent";
import ExportContent from "@/components/ExportContent";
import PerformanceContent from "@/components/PerformanceContent";
import SettingsContent from "@/components/SettingsContent";
import StarlinkContent from "@/components/StarlinkContent";
import AuditLogsContent from "@/components/AuditLogsContent";
import ConfigurationContent from "@/components/ConfigurationContent";
import RadioAnalyticsContent from "@/components/RadioAnalyticsContent";
import DataAnalyticsContent from "@/components/DataAnalyticsContent";
import WeatherAnalyticsContent from "@/components/WeatherAnalyticsContent";
import SoundLightAnalyticsContent from "@/components/SoundLightAnalyticsContent";
import MovementAnalyticsContent from "@/components/MovementAnalyticsContent";
import WebhooksContent from "@/components/WebhooksContent";
import UserManagementContent from "@/components/UserManagementContent";
import SystemLogsContent from "@/components/SystemLogsContent";
import StatsHistoryCharts from "@/components/StatsHistoryCharts";
import SetupPage from "@/components/SetupPage";
import { AuthPage } from "@/components/auth";
import { useAuth } from "@/hooks/useAuth";
import { useCheckSetupRequired } from "@/hooks/useAuroraApi";
import { Loader2 } from "lucide-react";

const Index = () => {
  const [activeItem, setActiveItem] = useState("dashboard");
  const [setupComplete, setSetupComplete] = useState(false);
  const { user, loading } = useAuth();
  const { data: setupData, isLoading: checkingSetup } = useCheckSetupRequired();

  // Show loading spinner while checking auth or setup status
  if (loading || checkingSetup) {
    return (
      <div className="h-screen flex items-center justify-center relative">
        <AuroraBackground />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
          <p className="text-slate-400">Loading Aurora Sense...</p>
        </div>
      </div>
    );
  }

  // Show setup page if no users exist and setup not completed
  if (setupData?.setupRequired && !setupComplete) {
    return <SetupPage onSetupComplete={() => setSetupComplete(true)} />;
  }

  // Show auth page if not logged in
  if (!user) {
    return <AuthPage />;
  }

  const renderContent = () => {
    switch (activeItem) {
      case "dashboard":
        return <DashboardContent />;
      case "correlation":
        return <CorrelationContent />;
      case "sensors":
        return <SensorsContent />;
      case "data-analytics":
        return <DataAnalyticsContent />;
      case "alerts":
        return <AlertsContent />;
      case "map":
        return <MapContent />;
      case "clients":
        return <ClientsContent />;
      case "rules":
        return <RulesContent />;
      case "power":
        return <PowerAnalyticsContent />;
      case "data-batches":
        return <DataBatchesContent />;
      case "export":
        return <ExportContent />;
      case "performance":
        return <PerformanceContent />;
      case "settings":
        return <SettingsContent />;
      case "starlink":
        return <StarlinkContent />;
      case "radio":
        return <RadioAnalyticsContent />;
      case "audit-logs":
        return <AuditLogsContent />;
      case "configuration":
        return <ConfigurationContent />;
      case "weather":
        return <WeatherAnalyticsContent />;
      case "sound-light":
        return <SoundLightAnalyticsContent />;
      case "movement":
        return <MovementAnalyticsContent />;
      case "webhooks":
        return <WebhooksContent />;
      case "users":
        return <UserManagementContent />;
      case "system-logs":
        return <SystemLogsContent />;
      case "stats-history":
        return (
          <div className="flex-1 overflow-y-auto p-8">
            <StatsHistoryCharts />
          </div>
        );
      default:
        return <DashboardContent />;
    }
  };

  return (
    <div className="h-screen flex relative overflow-hidden">
      <AuroraBackground />
      <Sidebar activeItem={activeItem} onNavigate={setActiveItem} />
      <main className="flex-1 relative z-10 flex flex-col h-full overflow-hidden">
        {renderContent()}
      </main>
    </div>
  );
};

export default Index;
