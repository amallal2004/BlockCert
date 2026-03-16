import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => false,
  logout: () => {},
  isAuthenticated: false,
  loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Map a Supabase auth user to our app User type
  const mapSupabaseUser = (authUser: any): User => {
    const meta = authUser.user_metadata || {};
    return {
      id: authUser.id,
      username: authUser.email?.split("@")[0] || "",
      role: (meta.role as "admin" | "student") || "student",
      name: meta.name || authUser.email?.split("@")[0] || "",
      rollNumber: meta.roll_number || undefined,
    };
  };

  // On mount, check for existing session
  useEffect(() => {
    const initSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(mapSupabaseUser(session.user));
      }
      setLoading(false);
    };
    initSession();

    // Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(mapSupabaseUser(session.user));
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    // Support both "username" and "username@blockcert.edu" formats
    const email = username.includes("@") ? username : `${username.toLowerCase()}@blockcert.edu`;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) return false;

    setUser(mapSupabaseUser(data.user));
    return true;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
