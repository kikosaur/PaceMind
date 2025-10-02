import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
};

const defaultAuthContext: AuthContextType = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  signIn: async () => {},
  signUp: async () => {},
  logout: async () => {},
  login: async () => {},
  signup: async () => {},
  resetPassword: async () => {},
};

export const AuthContext = createContext<AuthContextType>(defaultAuthContext);
export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Ensure a corresponding profile row exists for FK constraints
  const ensureProfileExists = useCallback(async (u: User | null) => {
    try {
      if (!u || !supabase) return;
      const userId = u.id;
      if (!userId) return;

      const { data: existing, error: selectErr } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      if (selectErr) {
        console.warn('profiles select error:', selectErr.message);
        return;
      }

      if (!existing) {
        const fullName = (u.user_metadata as any)?.full_name || (u.user_metadata as any)?.name || null;
        const email = u.email ?? null;
        const { error: insertErr } = await supabase
          .from('profiles')
          .insert({ id: userId, email, full_name: fullName });
        if (insertErr) {
          console.warn('profiles insert error:', insertErr.message);
        }
      }
    } catch (e: any) {
      console.warn('ensureProfileExists failed:', e?.message || String(e));
    }
  }, []);

  useEffect(() => {
    if (!supabase) {
      // Fallback to unauthenticated app without crashing
      setUser(null);
      setIsLoading(false);
      return;
    }

    const init = async () => {
      try {
        // Safe check: supabase is guaranteed to exist here due to guard above
        const { data: { session }, error } = await supabase!.auth.getSession();
        if (error) console.warn('getSession error:', error.message);
        setUser(session?.user ?? null);
        await ensureProfileExists(session?.user ?? null);
      } catch (e) {
        console.warn('Session init failed', e);
      } finally {
        setIsLoading(false);
      }
    };
    init();

    // Safe check: supabase is guaranteed to exist here due to guard above
    const { data: { subscription } } = supabase!.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      // Fire and forget; we don't need to block UI
      void ensureProfileExists(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [ensureProfileExists]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    setUser(data.user ?? null);
    await ensureProfileExists(data.user ?? null);
  }, [ensureProfileExists]);

  const signUp = useCallback(async (email: string, password: string, _name?: string) => {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: _name ? { full_name: _name, name: _name } : undefined,
      },
    });
    if (error) throw error;
    // Only set user if a session exists (email confirmation might be required)
    if (data.session?.user) {
      setUser(data.session.user);
      await ensureProfileExists(data.session.user);
    }
  }, [ensureProfileExists]);

  const logout = useCallback(async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    if (!supabase) throw new Error('Supabase not configured');
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  }, []);

  const value = useMemo<AuthContextType>(() => ({
    user,
    isAuthenticated: !!user,
    isLoading,
    signIn,
    signUp,
    logout,
    login: signIn,
    signup: async (email: string, password: string) => signUp(email, password),
    resetPassword,
  }), [user, isLoading, signIn, signUp, logout, resetPassword]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;