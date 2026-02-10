import { useState, useMemo, lazy, Suspense, memo } from "react";
import AuroraBackground from "@/components/AuroraBackground";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import Sidebar from "@/components/Sidebar";
import { AuroraAuthPage } from "@/components/auth/AuroraAuthPage";
import { useAuroraAuthContext } from "@/hooks/useAuroraAuth";
import { useEpirbAlertNotifications } from "@/hooks/useEpirbAlertNotifications";
import { usePrewarm } from "@/hooks/usePrewarm";
import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

// ===== LAZY LOAD ALL CONTENT COMPONENTS =====
// Only the active page gets loaded — dramatically reduces initial bundle
const DashboardContent = lazy(() => import("@/components/DashboardContent"));
const CorrelationContent = lazy(() => import("@/components/CorrelationContent"));
const SensorsContent = lazy(() => import("@/components/SensorsContent"));
const StatsContent = lazy(() => import("@/components/StatsContent"));
const DataAnalyticsContent = lazy(() => import("@/components/DataAnalyticsContent"));
const ClientSensorBreakdownContent = lazy(() => import("@/components/ClientSensorBreakdownContent"));
const AlertsContent = lazy(() => import("@/components/AlertsContent"));
const MapContent = lazy(() => import("@/components/MapContent"));
const ClientsContent = lazy(() => import("@/components/ClientsContent"));
const RulesBaselinesContent = lazy(() => import("@/components/RulesBaselinesContent"));
const PowerContent = lazy(() => import("@/components/PowerContent"));
const DataBatchesContent = lazy(() => import("@/components/DataBatchesContent"));
const ExportContent = lazy(() => import("@/components/ExportContent"));
const PerformanceContent = lazy(() => import("@/components/PerformanceContent"));
const SettingsContent = lazy(() => import("@/components/SettingsContent"));
const StarlinkContent = lazy(() => import("@/components/StarlinkContent"));
const AuditLogsContent = lazy(() => import("@/components/AuditLogsContent"));
const ConfigurationContent = lazy(() => import("@/components/ConfigurationContent"));
const RadioAnalyticsContent = lazy(() => import("@/components/RadioAnalyticsContent"));
const WeatherAnalyticsContent = lazy(() => import("@/components/WeatherAnalyticsContent"));
const SoundLightAnalyticsContent = lazy(() => import("@/components/SoundLightAnalyticsContent"));
const MovementAnalyticsContent = lazy(() => import("@/components/MovementAnalyticsContent"));
const WebhooksContent = lazy(() => import("@/components/WebhooksContent"));
const UserManagementContent = lazy(() => import("@/components/UserManagementContent"));
const SystemLogsContent = lazy(() => import("@/components/SystemLogsContent"));
const RemoteCommandsContent = lazy(() => import("@/components/RemoteCommandsContent"));
const UpdateManagementContent = lazy(() => import("@/components/UpdateManagementContent"));
const StatsHistoryCharts = lazy(() => import("@/components/StatsHistoryCharts"));
const AdsbAnalyticsContent = lazy(() => import("@/components/AdsbAnalyticsContent"));
const MaritimeContent = lazy(() => import("@/components/MaritimeContent"));

// Page loading fallback
const PageSkeleton = () => (
  <div className="flex-1 p-6 lg:p-8 space-y-6">
    <div className="flex items-center justify-between">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-9 w-24" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Skeleton className="h-28 rounded-xl" />
      <Skeleton className="h-28 rounded-xl" />
      <Skeleton className="h-28 rounded-xl" />
    </div>
    <Skeleton className="h-64 rounded-xl" />
    <Skeleton className="h-64 rounded-xl" />
  </div>
);

// Map from route key to lazy component
const CONTENT_MAP: Record<string, React.LazyExoticComponent<React.ComponentType<any>>> = {
  dashboard: DashboardContent,
  correlation: CorrelationContent,
  sensors: SensorsContent,
  stats: StatsContent,
  "data-analytics": DataAnalyticsContent,
  "data-breakdown": ClientSensorBreakdownContent,
  alerts: AlertsContent,
  map: MapContent,
  clients: ClientsContent,
  rules: RulesBaselinesContent,
  baselines: RulesBaselinesContent,
  power: PowerContent,
  "data-batches": DataBatchesContent,
  export: ExportContent,
  performance: PerformanceContent,
  settings: SettingsContent,
  starlink: StarlinkContent,
  radio: RadioAnalyticsContent,
  adsb: AdsbAnalyticsContent,
  maritime: MaritimeContent,
  "audit-logs": AuditLogsContent,
  configuration: ConfigurationContent,
  weather: WeatherAnalyticsContent,
  "sound-light": SoundLightAnalyticsContent,
  movement: MovementAnalyticsContent,
  webhooks: WebhooksContent,
  users: UserManagementContent,
  "system-logs": SystemLogsContent,
  "remote-commands": RemoteCommandsContent,
  "update-management": UpdateManagementContent,
  "stats-history": StatsHistoryCharts,
};

const Index = () => {
  const [activeItem, setActiveItem] = useState("dashboard");
  const { user, loading, signIn, signUp, serverStatus } = useAuroraAuthContext();
  
  // Prewarm edge function silently on app load to avoid cold start errors
  usePrewarm();

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
            <h2 className="text-xl font-semibold text-slate-100 mb-2">AuroraSENSE</h2>
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

  // Render authenticated dashboard
  return <AuthenticatedDashboard activeItem={activeItem} onNavigate={setActiveItem} />;
};

// Separate component for authenticated users - hooks only run when logged in
const AuthenticatedDashboard = memo(function AuthenticatedDashboard({ 
  activeItem, 
  onNavigate 
}: { 
  activeItem: string; 
  onNavigate: (item: string) => void;
}) {
  // Monitor EPIRB alerts and show toast notifications for new distress signals
  useEpirbAlertNotifications();

  // Memoize the content element — only re-creates when activeItem changes
  const content = useMemo(() => {
    // Special case for stats-history which needs a wrapper
    if (activeItem === "stats-history") {
      const StatsHistory = CONTENT_MAP["stats-history"];
      return (
        <div className="flex-1 overflow-y-auto p-8">
          <StatsHistory />
        </div>
      );
    }

    const ContentComponent = CONTENT_MAP[activeItem] || DashboardContent;
    return <ContentComponent />;
  }, [activeItem]);

  return (
    <div className="h-screen flex relative overflow-hidden">
      <AuroraBackground />
      <Sidebar activeItem={activeItem} onNavigate={onNavigate} />
      <main className="flex-1 relative z-10 flex flex-col h-full overflow-hidden">
        <ErrorBoundary>
          <Suspense fallback={<PageSkeleton />}>
            {content}
          </Suspense>
        </ErrorBoundary>
      </main>
    </div>
  );
});

export default Index;
