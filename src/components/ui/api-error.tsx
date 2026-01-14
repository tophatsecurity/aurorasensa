import { AlertCircle, RefreshCw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ApiErrorProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  isRetrying?: boolean;
  variant?: "default" | "compact" | "inline";
  className?: string;
}

export function ApiError({
  title = "Connection Error",
  message = "Unable to connect to the Aurora API. Please check your connection and try again.",
  onRetry,
  isRetrying = false,
  variant = "default",
  className,
}: ApiErrorProps) {
  if (variant === "inline") {
    return (
      <div className={cn("flex items-center gap-2 text-sm text-destructive", className)}>
        <WifiOff className="h-4 w-4" />
        <span>{message}</span>
        {onRetry && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRetry}
            disabled={isRetrying}
            className="h-6 px-2"
          >
            <RefreshCw className={cn("h-3 w-3", isRetrying && "animate-spin")} />
          </Button>
        )}
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className={cn("flex items-center justify-between p-3 rounded-lg bg-destructive/10 border border-destructive/20", className)}>
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <span className="text-sm text-destructive">{message}</span>
        </div>
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            disabled={isRetrying}
            className="border-destructive/30 text-destructive hover:bg-destructive/10"
          >
            <RefreshCw className={cn("h-3 w-3 mr-1", isRetrying && "animate-spin")} />
            Retry
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className={cn("glass-card border-destructive/30 bg-destructive/5", className)}>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-destructive/10 p-4 mb-4">
          <WifiOff className="h-8 w-8 text-destructive" />
        </div>
        <h3 className="text-lg font-semibold text-destructive mb-2">{title}</h3>
        <p className="text-muted-foreground text-sm max-w-md mb-6">{message}</p>
        {onRetry && (
          <Button
            variant="outline"
            onClick={onRetry}
            disabled={isRetrying}
            className="border-destructive/30 text-destructive hover:bg-destructive/10"
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isRetrying && "animate-spin")} />
            {isRetrying ? "Retrying..." : "Try Again"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

interface ApiErrorBannerProps {
  errors: Array<{ endpoint: string; message: string }>;
  onRetryAll?: () => void;
  isRetrying?: boolean;
  className?: string;
}

export function ApiErrorBanner({
  errors,
  onRetryAll,
  isRetrying = false,
  className,
}: ApiErrorBannerProps) {
  if (errors.length === 0) return null;

  return (
    <div className={cn("rounded-lg bg-destructive/10 border border-destructive/20 p-4", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-destructive">
              {errors.length === 1 ? "API Connection Issue" : `${errors.length} API Connection Issues`}
            </h4>
            <ul className="mt-1 text-sm text-muted-foreground space-y-0.5">
              {errors.slice(0, 3).map((error, i) => (
                <li key={i}>
                  <span className="font-mono text-xs">{error.endpoint}</span>: {error.message}
                </li>
              ))}
              {errors.length > 3 && (
                <li className="text-xs">...and {errors.length - 3} more</li>
              )}
            </ul>
          </div>
        </div>
        {onRetryAll && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetryAll}
            disabled={isRetrying}
            className="border-destructive/30 text-destructive hover:bg-destructive/10 flex-shrink-0"
          >
            <RefreshCw className={cn("h-3 w-3 mr-1", isRetrying && "animate-spin")} />
            Retry All
          </Button>
        )}
      </div>
    </div>
  );
}
