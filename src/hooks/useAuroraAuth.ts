import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { resetSSEAvailability } from '@/hooks/useSSE';
import type { User, Session } from '@supabase/supabase-js';

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

// Map Supabase user + profile/roles to AuroraUser shape
function mapToAuroraUser(
  supaUser: User,
  displayName?: string | null,
  role?: string
): AuroraUser {
  return {
    id: supaUser.id,
    email: supaUser.email || '',
    username: displayName || supaUser.email?.split('@')[0] || 'User',
    role: role || 'user',
    created_at: supaUser.created_at,
    last_login: supaUser.last_sign_in_at || undefined,
    is_active: true,
  };
}

async function fetchUserRole(userId: string): Promise<string> {
  const { data } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .limit(1)
    .single();
  return data?.role || 'user';
}

async function fetchDisplayName(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('user_id', userId)
    .single();
  return data?.display_name || null;
}

export function useAuroraAuth(): AuroraAuthContextValue {
  const [authState, setAuthState] = useState<AuroraAuthState>({
    user: null,
    token: null,
    loading: true,
    error: null,
    serverStatus: 'online',
  });

  const buildAuthState = useCallback(async (session: Session | null) => {
    if (!session?.user) {
      setAuthState({
        user: null,
        token: null,
        loading: false,
        error: null,
        serverStatus: 'online',
      });
      return;
    }

    // Fetch profile and role in parallel
    const [displayName, role] = await Promise.all([
      fetchDisplayName(session.user.id),
      fetchUserRole(session.user.id),
    ]);

    const auroraUser = mapToAuroraUser(session.user, displayName, role);

    setAuthState({
      user: auroraUser,
      token: session.access_token,
      loading: false,
      error: null,
      serverStatus: 'online',
    });
  }, []);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          resetSSEAvailability();
          setTimeout(() => buildAuthState(session), 0);
        } else {
          setAuthState({
            user: null,
            token: null,
            loading: false,
            error: null,
            serverStatus: 'online',
          });
        }
      }
    );

    // THEN get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      buildAuthState(session);
    });

    return () => subscription.unsubscribe();
  }, [buildAuthState]);

  const refreshUser = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    await buildAuthState(session);
  }, [buildAuthState]);

  const signIn = useCallback(async (identifier: string, password: string) => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));

    try {
      let email = identifier;

      // If identifier doesn't look like an email, try to resolve it from profiles
      if (!identifier.includes('@')) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_id')
          .ilike('display_name', identifier)
          .limit(1)
          .single();

        if (profile?.user_id) {
          // Look up the email from auth via a known workaround:
          // Try signing in with the identifier as-is first won't work,
          // so we query the user_id and construct the email lookup.
          // Since we can't query auth.users directly, we need a different approach.
          // For now, append the default domain if no match found.
          email = identifier; // Will attempt as-is below
        }

        // Common pattern: if bare username, try appending default domain
        if (!email.includes('@')) {
          email = `${identifier}@aurorasense.local`;
        }
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setAuthState(prev => ({
          ...prev,
          loading: false,
          error: error.message,
        }));
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Login failed';
      setAuthState(prev => ({ ...prev, loading: false, error: errorMsg }));
      return { success: false, error: errorMsg };
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, displayName?: string) => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { display_name: displayName },
        },
      });

      if (error) {
        setAuthState(prev => ({ ...prev, loading: false, error: error.message }));
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Sign up failed';
      setAuthState(prev => ({ ...prev, loading: false, error: errorMsg }));
      return { success: false, error: errorMsg };
    }
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
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

// Export helper to check if user has Supabase session
export function hasAuroraSession(): boolean {
  // Check synchronously via localStorage for the Supabase session
  const storageKey = `sb-hewwtgcrupegpcwfujln-auth-token`;
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const parsed = JSON.parse(stored);
      return !!parsed?.access_token;
    }
  } catch {}
  return false;
}

// Export helper to get auth token (Supabase access token)
export function getAuroraToken(): string | null {
  const storageKey = `sb-hewwtgcrupegpcwfujln-auth-token`;
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed?.access_token || null;
    }
  } catch {}
  return null;
}
