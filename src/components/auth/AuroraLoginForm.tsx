import { useState } from "react";
import { Eye, EyeOff, Loader2, AlertCircle, Zap, WifiOff } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AuroraLoginFormProps {
  onLogin: (identifier: string, password: string) => Promise<{ success: boolean; error?: string }>;
  isLoading?: boolean;
  serverStatus?: 'online' | 'offline' | 'checking';
  onSwitchToSignUp?: () => void;
}

export function AuroraLoginForm({ onLogin, isLoading, serverStatus, onSwitchToSignUp }: AuroraLoginFormProps) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!identifier || !password) {
      setError("Email/username and password are required");
      return;
    }

    setLoading(true);
    const result = await onLogin(identifier, password);
    setLoading(false);

    if (!result.success) {
      setError(result.error || "Login failed");
    }
  };

  const isPending = loading || isLoading;
  const isServerOffline = serverStatus === 'offline';

  return (
    <Card className="w-full max-w-md bg-background/95 backdrop-blur-sm border-border">
      <CardHeader className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Zap className="w-8 h-8 text-primary" />
        </div>
        <CardTitle className="text-2xl">Aurora Sense</CardTitle>
        <CardDescription>
          Sign in to access the monitoring dashboard
        </CardDescription>
        
        {isServerOffline && (
          <Alert className="bg-amber-500/10 border-amber-500/50 text-left">
            <WifiOff className="h-4 w-4 text-amber-500" />
            <AlertDescription className="text-amber-200">
              Server is currently offline. Please try again later.
            </AlertDescription>
          </Alert>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && !isServerOffline && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="identifier">Email or Username</Label>
            <Input
              id="identifier"
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Enter your email or username"
              autoComplete="username"
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                disabled={isPending}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isPending}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </Button>
        </form>

        {onSwitchToSignUp && (
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{" "}
              <button
                type="button"
                onClick={onSwitchToSignUp}
                className="text-primary hover:underline font-medium"
              >
                Sign up
              </button>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
