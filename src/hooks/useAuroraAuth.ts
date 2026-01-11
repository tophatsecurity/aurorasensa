import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AuroraUser {
  username: string;
  role: string;
  created_at?: string;
  last_login?: string;
  isOfflineMode?: boolean;
}

interface AuroraAuthState {
  user: AuroraUser | null;
  loading: boolean;
  error: string | null;
  isOfflineMode: boolean;
  serverStatus: 'online' | 'offline' | 'checking';
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

const isConnectionError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('aborted') || 
         message.includes('timeout') || 
         message.includes('503') ||
         message.includes('504') ||
         message.includes('500') ||
         message.includes('network') ||
         message.includes('unavailable') ||
         message.includes('offline') ||
         message.includes('NetworkError');
};

async function callAuroraApi<T>(path: string, method: string = "GET", body?: unknown): Promise<T> {
  const sessionCookie = sessionStorage.getItem(SESSION_COOKIE_KEY);
  
  const { data, error } = await supabase.functions.invoke("aurora-proxy", {
    body: { path, method, body, sessionCookie },
  });

  if (error) {
    if (isConnectionError(error)) {
      throw new Error('AURORA_OFFLINE');
    }
    throw new Error(`Aurora API error: ${error.message}`);
  }

  if (data && typeof data === 'object' && 'error' in data) {
    const errorData = data as { error: string; details?: string; retryable?: boolean };
    if (errorData.error === 'Aurora server unavailable' || 
        errorData.error === 'Aurora server timeout' ||
        isConnectionError(errorData.details || '') ||
        isConnectionError(errorData.error || '')) {
      throw new Error('AURORA_OFFLINE');
    }
  }

  if (data && typeof data === 'object' && 'detail' in data) {
    const detailStr = String(data.detail);
    // Check for auth errors
    const isAuthError = detailStr.toLowerCase().includes('not authenticated') || 
                       detailStr.toLowerCase().includes('invalid session') ||
                       detailStr.toLowerCase().includes('provide x-api-key');
    if (isAuthError) {
      // Clear invalid session
      sessionStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(SESSION_COOKIE_KEY);
    }
    throw new Error(detailStr);
  }

  return data as T;
}

export function useAuroraAuth(): AuroraAuthContextValue {
  const [authState, setAuthState] = useState<AuroraAuthState>({
    user: null,
    loading: true,
    error: null,
    isOfflineMode: false,
    serverStatus: 'checking',
  });

  // Check for existing session on mount
  const refreshUser = useCallback(async () => {
    try {
      const sessionData = sessionStorage.getItem(SESSION_KEY);
      if (!sessionData) {
        setAuthState({ user: null, loading: false, error: null, isOfflineMode: false, serverStatus: 'online' });
        return;
      }

      const session = JSON.parse(sessionData);
      
      // Verify session is still valid by calling /api/auth/me
      const userData = await callAuroraApi<AuroraUser>("/api/auth/me");
      
      setAuthState({
        user: userData,
        loading: false,
        error: null,
        isOfflineMode: false,
        serverStatus: 'online',
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      
      if (errorMsg === 'AURORA_OFFLINE') {
        setAuthState({
          user: null,
          loading: false,
          error: 'Aurora server is currently offline. Please try again later.',
          isOfflineMode: false,
          serverStatus: 'offline',
        });
        return;
      }
      
      // Session invalid, clear it
      sessionStorage.removeItem(SESSION_KEY);
      setAuthState({
        user: null,
        loading: false,
        error: null,
        isOfflineMode: false,
        serverStatus: 'online',
      });
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Listen for session being cleared by other parts of the app
  useEffect(() => {
    const checkSession = () => {
      const hasSession = sessionStorage.getItem(SESSION_COOKIE_KEY);
      if (!hasSession && authState.user) {
        setAuthState(prev => ({ ...prev, user: null }));
      }
    };

    const intervalId = setInterval(checkSession, 1000);
    window.addEventListener('focus', checkSession);
    
    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', checkSession);
    };
  }, [authState.user]);

  const signIn = useCallback(async (username: string, password: string) => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await callAuroraApi<{ success?: boolean; user?: AuroraUser; message?: string; auroraCookie?: string; username?: string; role?: string }>(
        "/api/auth/login",
        "POST",
        { username, password }
      );

      const isSuccess = response.auroraCookie || response.username || response.success;
      
      if (isSuccess) {
        if (response.auroraCookie) {
          sessionStorage.setItem(SESSION_COOKIE_KEY, response.auroraCookie);
        }
        
        const user: AuroraUser = response.user || {
          username: response.username || username,
          role: response.role || 'user',
        };
        
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({
          username: user.username,
          loggedInAt: new Date().toISOString(),
        }));

        setAuthState({
          user,
          loading: false,
          error: null,
          isOfflineMode: false,
          serverStatus: 'online',
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
      
      if (errorMsg === 'AURORA_OFFLINE') {
        setAuthState(prev => ({
          ...prev,
          loading: false,
          error: 'Aurora server is offline. Please try again later.',
          serverStatus: 'offline',
        }));
        return { success: false, error: 'Server offline' };
      }
      
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
      isOfflineMode: false,
      serverStatus: 'checking',
    });
  }, [authState.isOfflineMode]);

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
