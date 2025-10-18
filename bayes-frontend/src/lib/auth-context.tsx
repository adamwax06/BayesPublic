"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

// API function for getting subscription status
async function getSubscriptionStatus(token: string) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const response = await fetch(`${API_URL}/api/subscription-status`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    return { plan: "free", status: "active" };
  }

  return response.json();
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  subscriptionPlan: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscriptionPlan, setSubscriptionPlan] = useState<string | null>(null);

  useEffect(() => {
    const fetchSessionAndSubscription = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);

      if (session) {
        try {
          const status = await getSubscriptionStatus(session.access_token);
          setSubscriptionPlan(status.plan);
        } catch (error) {
          console.error("Error fetching subscription status:", error);
          setSubscriptionPlan("free"); // Default to free on error
        }
      } else {
        setSubscriptionPlan("free"); // Default for non-authenticated users
      }
      setLoading(false);
    };

    fetchSessionAndSubscription();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(true);

      if (session) {
        try {
          const status = await getSubscriptionStatus(session.access_token);
          setSubscriptionPlan(status.plan);
        } catch (error) {
          console.error(
            "Error fetching subscription status on auth change:",
            error,
          );
          setSubscriptionPlan("free");
        }
      } else {
        setSubscriptionPlan("free"); // No session, so free plan
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      const baseUrl =
        process.env.NODE_ENV === "production"
          ? "https://trybayes.com"
          : window.location.origin;

      // Get the redirect parameter from the URL if it exists
      const urlParams = new URLSearchParams(window.location.search);
      const redirectPath = urlParams.get("redirect");

      const redirectTo = redirectPath
        ? `${baseUrl}/auth/callback?redirect=${encodeURIComponent(redirectPath)}`
        : `${baseUrl}/auth/callback`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
        },
      });
      if (error) throw error;
    } catch (error) {
      console.error("Error signing in with Google:", error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error("Error signing out:", error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    subscriptionPlan,
    signInWithGoogle,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
