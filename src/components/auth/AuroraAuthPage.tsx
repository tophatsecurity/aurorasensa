import { useState } from "react";
import AuroraBackground from "@/components/AuroraBackground";
import { AuroraLoginForm } from "./AuroraLoginForm";
import { AuroraSignUpForm } from "./AuroraSignUpForm";

interface AuroraAuthPageProps {
  onLogin: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  onSignUp: (email: string, password: string, displayName?: string) => Promise<{ success: boolean; error?: string }>;
  isLoading?: boolean;
  serverStatus?: 'online' | 'offline' | 'checking';
}

export function AuroraAuthPage({ onLogin, onSignUp, isLoading, serverStatus }: AuroraAuthPageProps) {
  const [isLoginMode, setIsLoginMode] = useState(true);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <AuroraBackground />
      <div className="relative z-10">
        {isLoginMode ? (
          <AuroraLoginForm 
            onLogin={onLogin} 
            isLoading={isLoading} 
            serverStatus={serverStatus}
            onSwitchToSignUp={() => setIsLoginMode(false)}
          />
        ) : (
          <AuroraSignUpForm
            onSignUp={onSignUp}
            isLoading={isLoading}
            onSwitchToLogin={() => setIsLoginMode(true)}
          />
        )}
      </div>
    </div>
  );
}
