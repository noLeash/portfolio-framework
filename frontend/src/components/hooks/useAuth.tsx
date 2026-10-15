import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { jwtDecode } from "jwt-decode";

const TOKEN_KEY = "access_token";

type DecodedToken = {
  sub?: string;
  exp?: number;
  is_admin?: boolean;
  email?: string;
  [key: string]: any;
};

type AuthContextType = {
  token: string | null;
  user: DecodedToken | null;
  isAuthenticated: boolean;
  isExpired: boolean;
  isAdmin: boolean;
  login: (username: string, password: string) => Promise<LoginResult>;
  logout: () => void;
};

export type LoginResult = {
  success: boolean;
  error?: string;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const decodeToken = (token: string): DecodedToken | null => {
  try {
    return jwtDecode<DecodedToken>(token);
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (stored) setToken(stored);
  }, []);

  const user = useMemo(() => {
    if (!token) return null;
    return decodeToken(token);
  }, [token]);

  const isExpired = useMemo(() => {
    if (!user?.exp) return false;
    return user.exp * 1000 < Date.now();
  }, [user]);

  const isAdmin = useMemo(() => {
    return !!user?.is_admin;
  }, [user]);

  const login = async (
    username: string,
    password: string,
  ): Promise<LoginResult> => {
    const body = new URLSearchParams({ username, password });

    const res = await fetch("/api/auth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    if (!res.ok) {
      console.error("Login failed:", res.status);
      return { success: false, error: `HTTP ${res.status}` };
    }
    const data = await res.json();
    const accessToken = data.access_token;

    if (!accessToken) {
      console.error("Login failed: No access token received");
      return { success: false, error: "No access token received" };
    }

    localStorage.setItem(TOKEN_KEY, accessToken);
    setToken(accessToken);
    return { success: true };
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isAdmin,
        isAuthenticated: !!token && !isExpired,
        isExpired,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
