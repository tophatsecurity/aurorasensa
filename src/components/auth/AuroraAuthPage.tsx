import AuroraBackground from "@/components/AuroraBackground";
import { AuroraLoginForm } from "./AuroraLoginForm";

interface AuroraAuthPageProps {
  onLogin: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  isLoading?: boolean;
}

export function AuroraAuthPage({ onLogin, isLoading }: AuroraAuthPageProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <AuroraBackground />
      <div className="relative z-10">
        <AuroraLoginForm onLogin={onLogin} isLoading={isLoading} />
      </div>
    </div>
  );
}
