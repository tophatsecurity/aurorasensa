import AuroraBackground from "@/components/AuroraBackground";
import { AuroraLoginForm } from "./AuroraLoginForm";

interface AuroraAuthPageProps {
  onLogin: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  isLoading?: boolean;
  serverStatus?: 'online' | 'offline' | 'checking';
}

export function AuroraAuthPage({ onLogin, isLoading, serverStatus }: AuroraAuthPageProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <AuroraBackground />
      <div className="relative z-10">
        <AuroraLoginForm 
          onLogin={onLogin} 
          isLoading={isLoading} 
          serverStatus={serverStatus}
        />
      </div>
    </div>
  );
}
