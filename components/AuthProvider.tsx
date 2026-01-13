'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { dbClient as supabase } from '@/lib/orbit/services/dbClient';
import { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithEmail: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInWithEmail: async () => { },
  signOut: async () => { }
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const signInWithEmail = async (email: string) => {
    if (!supabase) return;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
      },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
  };

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
          setUser(session.user);

          // Check for pending role assignment
          if (typeof window !== 'undefined') {
            const pendingRole = window.localStorage.getItem('orbit_pending_role');
            if (pendingRole) {
              // Update user metadata with the role
              const { error } = await supabase.auth.updateUser({
                data: { role: pendingRole }
              });

              if (!error) {
                console.log(`✅ Assigned role ${pendingRole} to user ${session.user.id}`);
                window.localStorage.removeItem('orbit_pending_role');
                // Refresh local user state
                setUser(prev => prev ? { ...prev, user_metadata: { ...prev.user_metadata, role: pendingRole } } : null);
              } else {
                console.error("Failed to assign role:", error);
              }
            }
          }

        } else {
          // Check if we are handling an OTP callback logic or just let it stay anonymous?
          // For now, removing auto-anonymous sign-in to force explicit choice if desired,
          // OR iterate to keep anonymous as fallback.
          // The user request emphasizes "proper Auth using email", so let's prefer real auth.
          // We will retain anonymous as a fallback only if explicit login isn't triggered.

          /* 
             User request: "Create proper Auth using email" 
             We should probably NOT auto-sign-in anonymously immediately if we want them to use email.
             But to keep existing flow working, maybe we keep it as a fallback?
             Let's start empty and let the UI prompt for login.
          */
          // setUser(null); // Explicitly null
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signInWithEmail, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
