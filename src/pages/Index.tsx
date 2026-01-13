import { useState } from "react";
import AuroraBackground from "@/components/AuroraBackground";
import Sidebar from "@/components/Sidebar";
import DashboardContent from "@/components/DashboardContent";
import CorrelationContent from "@/components/CorrelationContent";
import SensorsContent from "@/components/SensorsContent";
import AlertsContent from "@/components/AlertsContent";
import MapContent from "@/components/MapContent";
import ClientsContent from "@/components/ClientsContent";
import RulesBaselinesContent from "@/components/RulesBaselinesContent";
import PowerContent from "@/components/PowerContent";
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
import RemoteCommandsContent from "@/components/RemoteCommandsContent";
import UpdateManagementContent from "@/components/UpdateManagementContent";
import StatsHistoryCharts from "@/components/StatsHistoryCharts";
import AdsbAnalyticsContent from "@/components/AdsbAnalyticsContent";
import BaselinesContent from "@/components/BaselinesContent";
import MaritimeContent from "@/components/MaritimeContent";
import StatsContent from "@/components/StatsContent";
import { AuroraAuthPage } from "@/components/auth/AuroraAuthPage";
import { useAuroraAuthContext } from "@/hooks/useAuroraAuth";
import { useEpirbAlertNotifications } from "@/hooks/useEpirbAlertNotifications";
import { Loader2 } from "lucide-react";

const Index = () => {
  const [activeItem, setActiveItem] = useState("dashboard");
  
  // Monitor EPIRB alerts and show toast notifications for new distress signals
  useEpirbAlertNotifications();
  const { user, loading, signIn, signUp, serverStatus } = useAuroraAuthContext();

  // Show loading spinner while checking auth/session validity
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center relative bg-slate-950">
        <AuroraBackground />
        <div className="relative z-10 flex flex-col items-center gap-6">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-cyan-500/20 border-t-cyan-400 animate-spin" />
            <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-transparent border-b-purple-400/50 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-semibold text-slate-100 mb-2">Aurora Sense</h2>
            <p className="text-slate-400 text-sm">Validating session...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show auth page if not logged in
  if (!user) {
    return (
      <AuroraAuthPage 
        onLogin={signIn}
        onSignUp={signUp}
        isLoading={loading} 
        serverStatus={serverStatus}
      />
    );
  }

  const renderContent = () => {
    switch (activeItem) {
      case "dashboard":
        return <DashboardContent />;
      case "correlation":
        return <CorrelationContent />;
      case "sensors":
        return <SensorsContent />;
      case "stats":
        return <StatsContent />;
      case "data-analytics":
        return <DataAnalyticsContent />;
      case "alerts":
        return <AlertsContent />;
      case "map":
        return <MapContent />;
      case "clients":
        return <ClientsContent />;
      case "rules":
        return <RulesBaselinesContent />;
      case "baselines":
        return <RulesBaselinesContent />;
      case "power":
        return <PowerContent />;
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
      case "adsb":
        return <AdsbAnalyticsContent />;
      case "maritime":
        return <MaritimeContent />;
      case "baselines":
        return <RulesBaselinesContent />;
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
      case "remote-commands":
        return <RemoteCommandsContent />;
      case "update-management":
        return <UpdateManagementContent />;
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
