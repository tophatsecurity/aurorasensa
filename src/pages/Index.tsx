import { useState } from "react";
import AuroraBackground from "@/components/AuroraBackground";
import Sidebar from "@/components/Sidebar";
import DashboardContent from "@/components/DashboardContent";
import SensorsContent from "@/components/SensorsContent";
import AlertsContent from "@/components/AlertsContent";

const Index = () => {
  const [activeItem, setActiveItem] = useState("dashboard");

  const renderContent = () => {
    switch (activeItem) {
      case "dashboard":
        return <DashboardContent />;
      case "sensors":
        return <SensorsContent />;
      case "alerts":
        return <AlertsContent />;
      case "map":
      case "devices":
      case "rules":
      case "power":
      case "data-batches":
      case "export":
      case "performance":
      case "settings":
        return (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2 capitalize">{activeItem.replace("-", " ")}</h2>
              <p className="text-muted-foreground">This section is coming soon...</p>
            </div>
          </div>
        );
      default:
        return <DashboardContent />;
    }
  };

  return (
    <div className="min-h-screen flex relative">
      <AuroraBackground />
      <Sidebar activeItem={activeItem} onNavigate={setActiveItem} />
      <main className="flex-1 relative z-10">
        {renderContent()}
      </main>
    </div>
  );
};

export default Index;
