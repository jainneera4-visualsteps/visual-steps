import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { User as SupabaseUser } from '@supabase/supabase-js';

interface User {
  id: string;
  email: string;
  name: string;
  secret_question?: string;
}

interface AuthContextType {
  user: User | null;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const userRef = useRef<User | null>(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    const fetchProfile = async (sessionUser: SupabaseUser | null) => {
      if (sessionUser) {
        // Only set loading if we don't already have this user
        if (!userRef.current || userRef.current.id !== sessionUser.id) {
          setIsLoading(true);
        }
        const { data } = await supabase
          .from('users')
          .select('*')
          .eq('id', sessionUser.id)
          .single();
        if (data) setUser(data);
      } else {
        setUser(null);
      }
      setIsLoading(false);
    };

    // Get initial session
    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await fetchProfile(session.user);
        } else {
          setUser(null);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error getting session:', error);
        setUser(null);
        setIsLoading(false);
      }
    };

    initSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (_event === 'SIGNED_IN') {
        // If we already have the user, don't show loading spinner
        if (!userRef.current || userRef.current.id !== session?.user?.id) {
          setIsLoading(true);
        }
        fetchProfile(session?.user || null);
      } else if (_event === 'SIGNED_OUT') {
        setUser(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, logout, isLoading }}>
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
