import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

export interface AuroraUser {
  id: string;
  email: string;
  username: string;
  role: string;
  created_at?: string;
  last_login?: string;
}

interface AuroraAuthState {
  user: AuroraUser | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  serverStatus: 'online' | 'offline' | 'checking';
}

interface AuroraAuthContextValue extends AuroraAuthState {
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isAdmin: boolean;
}

// Helper to extract display name from email
function getDisplayName(email: string, displayName?: string | null): string {
  if (displayName) return displayName;
  return email.split('@')[0];
}

export function useAuroraAuth(): AuroraAuthContextValue {
  const [authState, setAuthState] = useState<AuroraAuthState>({
    user: null,
    session: null,
    loading: true,
    error: null,
    serverStatus: 'online',
  });

  const fetchUserProfile = useCallback(async (supabaseUser: User, session: Session) => {
    try {
      // Try to get profile from profiles table
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', supabaseUser.id)
        .single();

      // Get user roles
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', supabaseUser.id);

      const role = roles?.find(r => r.role === 'admin') ? 'admin' : 'user';

      const auroraUser: AuroraUser = {
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        username: profile?.display_name || getDisplayName(supabaseUser.email || '', supabaseUser.user_metadata?.display_name),
        role,
        created_at: supabaseUser.created_at,
        last_login: new Date().toISOString(),
      };

      setAuthState({
        user: auroraUser,
        session,
        loading: false,
        error: null,
        serverStatus: 'online',
      });
    } catch (error) {
      console.error('Error fetching user profile:', error);
      // Still set user even if profile fetch fails
      const auroraUser: AuroraUser = {
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        username: getDisplayName(supabaseUser.email || '', supabaseUser.user_metadata?.display_name),
        role: 'user',
        created_at: supabaseUser.created_at,
      };

      setAuthState({
        user: auroraUser,
        session,
        loading: false,
        error: null,
        serverStatus: 'online',
      });
    }
  }, []);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          // Use setTimeout to avoid blocking
          setTimeout(() => {
            fetchUserProfile(session.user, session);
          }, 0);
        } else {
          setAuthState({
            user: null,
            session: null,
            loading: false,
            error: null,
            serverStatus: 'online',
          });
        }
      }
    );

    // THEN get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchUserProfile(session.user, session);
      } else {
        setAuthState(prev => ({ ...prev, loading: false }));
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchUserProfile]);

  const refreshUser = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await fetchUserProfile(session.user, session);
    }
  }, [fetchUserProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));

    try {
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

      if (data.user && data.session) {
        await fetchUserProfile(data.user, data.session);
        return { success: true };
      }

      return { success: false, error: 'Login failed' };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Login failed';
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: errorMsg,
      }));
      return { success: false, error: errorMsg };
    }
  }, [fetchUserProfile]);

  const signUp = useCallback(async (email: string, password: string, displayName?: string) => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            display_name: displayName || getDisplayName(email),
          },
        },
      });

      if (error) {
        setAuthState(prev => ({
          ...prev,
          loading: false,
          error: error.message,
        }));
        return { success: false, error: error.message };
      }

      if (data.user) {
        // With auto-confirm enabled, user should be logged in immediately
        if (data.session) {
          await fetchUserProfile(data.user, data.session);
        }
        return { success: true };
      }

      return { success: false, error: 'Sign up failed' };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Sign up failed';
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: errorMsg,
      }));
      return { success: false, error: errorMsg };
    }
  }, [fetchUserProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setAuthState({
      user: null,
      session: null,
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
