"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

type AuthContextValue = {
  session: Session | null;
  loading: boolean;
  isGuest: boolean;
  signIn: (
    email: string,
    password: string,
  ) => Promise<{ error: string | null }>;
  signInAnonymously: (captchaToken?: string) => Promise<{
    error: string | null;
  }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = useCallback(
    async (
      email: string,
      password: string,
    ): Promise<{ error: string | null }> => {
      const { error } = await createClient().auth.signInWithPassword({
        email,
        password,
      });
      if (!error) return { error: null };
      return { error: error.message };
    },
    [],
  );

  const signInAnonymously = useCallback(
    async (captchaToken?: string): Promise<{ error: string | null }> => {
      const { error } = await createClient().auth.signInAnonymously({
        options: { captchaToken },
      });
      if (!error) return { error: null };
      return { error: error.message };
    },
    [],
  );

  const signOut = useCallback(async () => {
    await createClient().auth.signOut();
  }, []);

  const isGuest = Boolean(session?.user.is_anonymous && !session.user.email);

  return (
    <AuthContext.Provider
      value={{
        session,
        loading,
        isGuest,
        signIn,
        signInAnonymously,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}

export { useAuth };
