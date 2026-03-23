"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { setStoredAccessToken } from "@/lib/apiClient";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

type AuthContextValue = {
  loading: boolean;
  session: Session | null;
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let isActive = true;

    supabaseBrowser.auth.getSession().then(({ data, error }) => {
      if (!isActive) {
        return;
      }

      if (error) {
        setStoredAccessToken("");
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }

      setSession(data.session ?? null);
      setUser(data.session?.user ?? null);
      setStoredAccessToken(data.session?.access_token ?? "");
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabaseBrowser.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null);
      setUser(nextSession?.user ?? null);
      setStoredAccessToken(nextSession?.access_token ?? "");
      setLoading(false);
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      session,
      user,
      async signIn(email: string, password: string) {
        const { error } = await supabaseBrowser.auth.signInWithPassword({ email, password });

        if (error) {
          throw error;
        }
      },
      async signOut() {
        const { error } = await supabaseBrowser.auth.signOut();

        if (error) {
          throw error;
        }
      },
    }),
    [loading, session, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
