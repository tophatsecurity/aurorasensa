import AuroraBackground from "@/components/AuroraBackground";
import { AuroraLoginForm } from "./AuroraLoginForm";

interface AuroraAuthPageProps {
  onLogin: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  onDemoMode?: () => void;
  isLoading?: boolean;
  serverStatus?: 'online' | 'offline' | 'checking';
}

export function AuroraAuthPage({ onLogin, onDemoMode, isLoading, serverStatus }: AuroraAuthPageProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <AuroraBackground />
      <div className="relative z-10">
        <AuroraLoginForm 
          onLogin={onLogin} 
          onDemoMode={onDemoMode}
          isLoading={isLoading} 
          serverStatus={serverStatus}
        />
      </div>
    </div>
  );
}
