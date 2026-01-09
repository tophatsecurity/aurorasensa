import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AuroraUser {
  username: string;
  role: string;
  created_at?: string;
  last_login?: string;
}

interface AuroraAuthState {
  user: AuroraUser | null;
  loading: boolean;
  error: string | null;
}

interface AuroraAuthContextValue extends AuroraAuthState {
  signIn: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isAdmin: boolean;
}

// Session storage keys
const SESSION_KEY = 'aurora_session';
const SESSION_COOKIE_KEY = 'aurora_cookie';

async function callAuroraApi<T>(path: string, method: string = "GET", body?: unknown): Promise<T> {
  const sessionCookie = sessionStorage.getItem(SESSION_COOKIE_KEY);
  
  const { data, error } = await supabase.functions.invoke("aurora-proxy", {
    body: { path, method, body, sessionCookie },
  });

  if (error) {
    throw new Error(`Aurora API error: ${error.message}`);
  }

  if (data && typeof data === 'object' && 'detail' in data) {
    throw new Error(String(data.detail));
  }

  return data as T;
}

export function useAuroraAuth(): AuroraAuthContextValue {
  const [authState, setAuthState] = useState<AuroraAuthState>({
    user: null,
    loading: true,
    error: null,
  });

  // Check for existing session on mount
  const refreshUser = useCallback(async () => {
    try {
      const sessionData = sessionStorage.getItem(SESSION_KEY);
      if (!sessionData) {
        setAuthState({ user: null, loading: false, error: null });
        return;
      }

      const session = JSON.parse(sessionData);
      
      // Verify session is still valid by calling /api/auth/me
      const userData = await callAuroraApi<AuroraUser>("/api/auth/me");
      
      setAuthState({
        user: userData,
        loading: false,
        error: null,
      });
    } catch (error) {
      // Session invalid, clear it
      sessionStorage.removeItem(SESSION_KEY);
      setAuthState({
        user: null,
        loading: false,
        error: null,
      });
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const signIn = useCallback(async (username: string, password: string) => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await callAuroraApi<{ success?: boolean; user?: AuroraUser; message?: string; auroraCookie?: string; username?: string; role?: string }>(
        "/api/auth/login",
        "POST",
        { username, password }
      );

      // Aurora API returns user data directly on success (username, role, etc.)
      const isSuccess = response.auroraCookie || response.username || response.success;
      
      if (isSuccess) {
        // Store the actual Aurora cookie for future API calls
        if (response.auroraCookie) {
          sessionStorage.setItem(SESSION_COOKIE_KEY, response.auroraCookie);
        }
        
        // Build user object from response
        const user: AuroraUser = response.user || {
          username: response.username || username,
          role: response.role || 'user',
        };
        
        // Store session info
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({
          username: user.username,
          loggedInAt: new Date().toISOString(),
        }));

        setAuthState({
          user,
          loading: false,
          error: null,
        });

        return { success: true };
      } else {
        const errorMsg = response.message || 'Login failed';
        setAuthState(prev => ({
          ...prev,
          loading: false,
          error: errorMsg,
        }));
        return { success: false, error: errorMsg };
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Login failed';
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: errorMsg,
      }));
      return { success: false, error: errorMsg };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await callAuroraApi("/api/auth/logout", "POST");
    } catch {
      // Ignore logout errors
    }
    
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_COOKIE_KEY);
    setAuthState({
      user: null,
      loading: false,
      error: null,
    });
  }, []);

  const isAdmin = authState.user?.role === 'admin';

  return {
    ...authState,
    signIn,
    signOut,
    refreshUser,
    isAdmin,
  };
}

// Context for providing auth throughout app
const AuroraAuthContext = createContext<AuroraAuthContextValue | null>(null);

export function AuroraAuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuroraAuth();
  
  return React.createElement(AuroraAuthContext.Provider, { value: auth }, children);
}

export function useAuroraAuthContext() {
  const context = useContext(AuroraAuthContext);
  if (!context) {
    throw new Error('useAuroraAuthContext must be used within AuroraAuthProvider');
  }
  return context;
}
