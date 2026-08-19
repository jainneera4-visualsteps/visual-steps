import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { clearAuthSession, isAuthError } from '../utils/auth';

interface User {
  id: string;
  email: string;
  name: string;
  max_parent_message_days?: number;
  max_parent_messages?: number;
}

interface AuthContextType {
  user: User | null;
  logout: () => void;
  isLoading: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const userRef = useRef<User | null>(null);

  const refreshProfile = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session?.user) return;

      const { data, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (!profileError && data) {
        setUser(data);
      }
    } catch (error) {
      console.warn('AuthContext: failed to refresh profile', error);
    }
  };

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    const pauseAuthRefresh = () => {
      supabase.auth.stopAutoRefresh();
    };
    const resumeAuthRefresh = () => {
      supabase.auth.startAutoRefresh();
    };

    window.addEventListener('offline', pauseAuthRefresh);
    window.addEventListener('online', resumeAuthRefresh);
    if (navigator.onLine === false) pauseAuthRefresh();

    const fetchProfile = async (sessionUser: SupabaseUser | null) => {
      if (sessionUser) {
        // Only set loading if we don't already have this user
        if (!userRef.current || userRef.current.id !== sessionUser.id) {
          setIsLoading(true);
        }
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', sessionUser.id)
          .single();
        if (error && isAuthError(error)) {
          await clearAuthSession();
          return;
        }
        if (data) setUser(data);
      } else {
        setUser(null);
      }
      setIsLoading(false);
    };

    // Get initial session
    const initSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session error:', error);
          if (isAuthError(error)) {
            await clearAuthSession();
            setUser(null);
            setIsLoading(false);
            return;
          }
        }

        if (session) {
          await fetchProfile(session.user);
        } else {
          setUser(null);
          setIsLoading(false);
        }
      } catch (error: any) {
        console.error('Error getting session:', error);
        if (isAuthError(error)) {
          await clearAuthSession();
        }
        setUser(null);
        setIsLoading(false);
      }
    };

    initSession();

    // Listen for auth changes
    const pendingAuthTasks = new Set<ReturnType<typeof setTimeout>>();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('Auth event:', _event);
      // Supabase recommends keeping this callback synchronous. Defer profile
      // queries until its internal auth lock has been released.
      const task = setTimeout(() => {
        pendingAuthTasks.delete(task);
        if (_event === 'SIGNED_IN' || _event === 'TOKEN_REFRESHED') {
          if (!userRef.current || userRef.current.id !== session?.user?.id) {
            setIsLoading(true);
          }
          void fetchProfile(session?.user || null);
        } else if (_event === 'SIGNED_OUT') {
          setUser(null);
          setIsLoading(false);
        }
      }, 0);
      pendingAuthTasks.add(task);
    });

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('offline', pauseAuthRefresh);
      window.removeEventListener('online', resumeAuthRefresh);
      pendingAuthTasks.forEach(task => clearTimeout(task));
      pendingAuthTasks.clear();
    };
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, logout, isLoading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
