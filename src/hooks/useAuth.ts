import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

interface UserRole {
  id: string;
  user_id: string;
  role: 'admin' | 'user';
  created_at: string;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: UserRole[];
  loading: boolean;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    roles: [],
    loading: true,
  });

  const fetchUserData = useCallback(async (userId: string) => {
    const [profileResult, rolesResult] = await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', userId).single(),
      supabase.from('user_roles').select('*').eq('user_id', userId),
    ]);

    return {
      profile: profileResult.data as Profile | null,
      roles: (rolesResult.data as UserRole[]) || [],
    };
  }, []);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          // Defer fetching to avoid blocking
          setTimeout(async () => {
            const { profile, roles } = await fetchUserData(session.user.id);
            setAuthState({
              user: session.user,
              session,
              profile,
              roles,
              loading: false,
            });
          }, 0);
        } else {
          setAuthState({
            user: null,
            session: null,
            profile: null,
            roles: [],
            loading: false,
          });
        }
      }
    );

    // THEN get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const { profile, roles } = await fetchUserData(session.user.id);
        setAuthState({
          user: session.user,
          session,
          profile,
          roles,
          loading: false,
        });
      } else {
        setAuthState(prev => ({ ...prev, loading: false }));
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchUserData]);

  const signUp = async (email: string, password: string, displayName?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          display_name: displayName,
        },
      },
    });
    return { data, error };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const updateProfile = async (updates: Partial<Pick<Profile, 'display_name' | 'avatar_url'>>) => {
    if (!authState.user) return { error: new Error('Not authenticated') };
    
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', authState.user.id)
      .select()
      .single();
    
    if (data) {
      setAuthState(prev => ({ ...prev, profile: data as Profile }));
    }
    
    return { data, error };
  };

  const isAdmin = authState.roles.some(r => r.role === 'admin');

  return {
    ...authState,
    isAdmin,
    signUp,
    signIn,
    signOut,
    updateProfile,
  };
}
