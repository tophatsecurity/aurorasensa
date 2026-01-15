import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AUTH } from './aurora/endpoints';

export interface AuroraUser {
  id: string;
  email: string;
  username: string;
  role: string;
  created_at?: string;
  last_login?: string;
  is_active?: boolean;
}

interface AuroraAuthState {
  user: AuroraUser | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  serverStatus: 'online' | 'offline' | 'checking';
}

interface AuroraAuthContextValue extends AuroraAuthState {
  signIn: (identifier: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isAdmin: boolean;
}

// Storage keys for Aurora auth
const AURORA_TOKEN_KEY = 'aurora_access_token';
const AURORA_USER_KEY = 'aurora_user';

// Helper to get stored auth data
function getStoredAuth(): { token: string | null; user: AuroraUser | null } {
  try {
    const token = localStorage.getItem(AURORA_TOKEN_KEY);
    const userStr = localStorage.getItem(AURORA_USER_KEY);
    const user = userStr ? JSON.parse(userStr) : null;
    return { token, user };
  } catch {
    return { token: null, user: null };
  }
}

// Helper to store auth data
function storeAuth(token: string, user: AuroraUser): void {
  localStorage.setItem(AURORA_TOKEN_KEY, token);
  localStorage.setItem(AURORA_USER_KEY, JSON.stringify(user));
}

// Helper to clear auth data
function clearStoredAuth(): void {
  localStorage.removeItem(AURORA_TOKEN_KEY);
  localStorage.removeItem(AURORA_USER_KEY);
}

// Call Aurora API through edge function
async function callAuroraAuth<T>(
  path: string, 
  method: 'GET' | 'POST' = 'GET', 
  body?: unknown,
  token?: string | null
): Promise<{ data?: T; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke("aurora-proxy", {
      body: { 
        path, 
        method, 
        body,
        // Pass Aurora token for authenticated requests
        auroraToken: token,
      },
    });

    if (error) {
      return { error: error.message };
    }

    if (data?.detail) {
      return { error: data.detail };
    }

    if (data?.error) {
      return { error: data.error };
    }

    return { data: data as T };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Request failed' };
  }
}

export function useAuroraAuth(): AuroraAuthContextValue {
  const [authState, setAuthState] = useState<AuroraAuthState>(() => {
    const { token, user } = getStoredAuth();
    return {
      user,
      token,
      loading: !!token, // If we have a token, we need to verify it
      error: null,
      serverStatus: 'checking',
    };
  });

  // Verify session on mount
  const verifySession = useCallback(async (token: string) => {
    try {
      const { data, error } = await callAuroraAuth<{ valid: boolean; user?: AuroraUser }>(
        AUTH.VERIFY,
        'GET',
        undefined,
        token
      );

      if (error || !data?.valid) {
        clearStoredAuth();
        setAuthState({
          user: null,
          token: null,
          loading: false,
          error: null,
          serverStatus: 'online',
        });
        return;
      }

      // Get fresh user data
      const { data: meData } = await callAuroraAuth<AuroraUser>(
        AUTH.ME,
        'GET',
        undefined,
        token
      );

      if (meData) {
        storeAuth(token, meData);
        setAuthState({
          user: meData,
          token,
          loading: false,
          error: null,
          serverStatus: 'online',
        });
      } else {
        // Session valid but can't get user - use stored user
        const { user } = getStoredAuth();
        setAuthState({
          user,
          token,
          loading: false,
          error: null,
          serverStatus: 'online',
        });
      }
    } catch {
      // Network error - check if we have cached user
      const { user } = getStoredAuth();
      if (user) {
        setAuthState({
          user,
          token,
          loading: false,
          error: null,
          serverStatus: 'offline',
        });
      } else {
        clearStoredAuth();
        setAuthState({
          user: null,
          token: null,
          loading: false,
          error: null,
          serverStatus: 'offline',
        });
      }
    }
  }, []);

  // Check server health
  const checkServerHealth = useCallback(async () => {
    try {
      const { error } = await callAuroraAuth('/health', 'GET');
      return !error;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const { token } = getStoredAuth();
      
      if (token) {
        await verifySession(token);
      } else {
        // No token - check server health
        const isOnline = await checkServerHealth();
        setAuthState({
          user: null,
          token: null,
          loading: false,
          error: null,
          serverStatus: isOnline ? 'online' : 'offline',
        });
      }
    };

    init();
  }, [verifySession, checkServerHealth]);

  const refreshUser = useCallback(async () => {
    const { token } = getStoredAuth();
    if (token) {
      await verifySession(token);
    }
  }, [verifySession]);

  const signIn = useCallback(async (identifier: string, password: string) => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Aurora API login - returns { success: true, username, token?, access_token? }
      const { data, error } = await callAuroraAuth<{ 
        success?: boolean;
        access_token?: string; 
        token?: string;
        token_type?: string;
        username?: string;
        user?: AuroraUser;
      }>(
        AUTH.LOGIN,
        'POST',
        { 
          username: identifier, // Aurora accepts username or email
          password 
        }
      );

      if (error) {
        setAuthState(prev => ({
          ...prev,
          loading: false,
          error,
          serverStatus: error.includes('network') || error.includes('fetch') ? 'offline' : 'online',
        }));
        return { success: false, error };
      }

      // Handle Aurora response format - may have 'token' or 'access_token'
      const accessToken = data?.access_token || data?.token;
      
      if (!accessToken && !data?.success) {
        setAuthState(prev => ({
          ...prev,
          loading: false,
          error: 'Invalid response from server',
        }));
        return { success: false, error: 'Invalid response from server' };
      }

      // If we have success but no token, create a session identifier
      const finalToken = accessToken || `session_${Date.now()}`;

      // Try to get user info with the new token
      let user: AuroraUser;
      if (accessToken) {
        const { data: userData } = await callAuroraAuth<AuroraUser>(
          AUTH.ME,
          'GET',
          undefined,
          accessToken
        );
        user = userData || data?.user || {
          id: data?.username || identifier,
          email: identifier.includes('@') ? identifier : '',
          username: data?.username || (identifier.includes('@') ? identifier.split('@')[0] : identifier),
          role: 'user',
        };
      } else {
        // Fallback user from login response
        user = data?.user || {
          id: data?.username || identifier,
          email: identifier.includes('@') ? identifier : '',
          username: data?.username || (identifier.includes('@') ? identifier.split('@')[0] : identifier),
          role: 'user',
        };
      }

      storeAuth(finalToken, user);
      
      setAuthState({
        user,
        token: finalToken,
        loading: false,
        error: null,
        serverStatus: 'online',
      });

      return { success: true };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Login failed';
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: errorMsg,
      }));
      return { success: false, error: errorMsg };
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, displayName?: string) => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Create user through Aurora API
      const { data, error } = await callAuroraAuth<{ 
        success: boolean; 
        message?: string;
        user_id?: string;
      }>(
        '/api/users',
        'POST',
        { 
          username: displayName || email.split('@')[0],
          email,
          password,
          role: 'user'
        }
      );

      if (error) {
        setAuthState(prev => ({
          ...prev,
          loading: false,
          error,
        }));
        return { success: false, error };
      }

      if (!data?.success) {
        const msg = data?.message || 'Sign up failed';
        setAuthState(prev => ({
          ...prev,
          loading: false,
          error: msg,
        }));
        return { success: false, error: msg };
      }

      // Auto-login after signup
      const loginResult = await signIn(email, password);
      return loginResult;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Sign up failed';
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: errorMsg,
      }));
      return { success: false, error: errorMsg };
    }
  }, [signIn]);

  const signOut = useCallback(async () => {
    const { token } = getStoredAuth();
    
    // Call logout endpoint if we have a token
    if (token) {
      try {
        await callAuroraAuth(AUTH.LOGOUT, 'POST', undefined, token);
      } catch {
        // Ignore logout errors - we're clearing local state anyway
      }
    }

    clearStoredAuth();
    setAuthState({
      user: null,
      token: null,
      loading: false,
      error: null,
      serverStatus: 'online',
    });
  }, []);

  const isAdmin = authState.user?.role === 'admin';

  return {
    ...authState,
    signIn,
    signUp,
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

// Export helper to check if user has Aurora session (for API hooks)
export function hasAuroraSession(): boolean {
  const { token } = getStoredAuth();
  return !!token;
}

// Export helper to get Aurora token
export function getAuroraToken(): string | null {
  const { token } = getStoredAuth();
  return token;
}
