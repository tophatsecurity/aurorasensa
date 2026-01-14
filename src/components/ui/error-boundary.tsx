import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Component error:", error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Card className="glass-card border-destructive/30 bg-destructive/5 m-4">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-destructive/10 p-4 mb-4">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <h3 className="text-lg font-semibold text-destructive mb-2">Something went wrong</h3>
            <p className="text-muted-foreground text-sm max-w-md mb-2">
              An error occurred while rendering this component.
            </p>
            {this.state.error && (
              <p className="text-xs text-muted-foreground font-mono mb-4 max-w-md truncate">
                {this.state.error.message}
              </p>
            )}
            <Button
              variant="outline"
              onClick={this.handleRetry}
              className="border-destructive/30 text-destructive hover:bg-destructive/10"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

// Functional wrapper for easier use
interface ComponentErrorBoundaryProps {
  children: ReactNode;
  name?: string;
}

export function ComponentErrorBoundary({ children, name }: ComponentErrorBoundaryProps) {
  return (
    <ErrorBoundary
      onError={(error) => {
        console.error(`Error in ${name || 'component'}:`, error);
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
