import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User } from "@/lib/types";
import { authenticateUser } from "@/lib/database";

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => false,
  logout: () => {},
  isAuthenticated: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("current_user");
    if (saved) setUser(JSON.parse(saved));
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    const u = await authenticateUser(username, password);
    if (u) {
      setUser(u);
      localStorage.setItem("current_user", JSON.stringify(u));
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("current_user");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
