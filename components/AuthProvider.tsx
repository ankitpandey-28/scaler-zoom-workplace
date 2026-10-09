"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { api, ApiError, User } from "@/lib/api";

type Auth = {
  user: User | null;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  login: (email: string, password: string, remember: boolean) => Promise<void>;
  signup: (
    display_name: string,
    email: string,
    password: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
};
const AuthContext = createContext<Auth | null>(null);
function announce() {
  localStorage.setItem("zoom-auth-change", String(Date.now()));
}

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const refresh = useCallback(async () => {
    try {
      setUser(await api<User>("/me"));
      setError("");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setUser(null);
        setError("");
      } else setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    refresh();
    const focus = () => {
      void refresh();
    };
    const storage = (event: StorageEvent) => {
      if (event.key === "zoom-auth-change") void refresh();
    };
    window.addEventListener("focus", focus);
    window.addEventListener("storage", storage);
    return () => {
      window.removeEventListener("focus", focus);
      window.removeEventListener("storage", storage);
    };
  }, [refresh]);
  async function authenticate(path: string, body: object) {
    const account = await api<User>(path, {
      method: "POST",
      body: JSON.stringify(body),
    });
    setUser(account);
    setError("");
    localStorage.setItem("zoom-name", account.display_name);
    announce();
  }
  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        refresh,
        login: (email, password, remember) =>
          authenticate("/auth/login", { email, password, remember }),
        signup: (display_name, email, password) =>
          authenticate("/auth/signup", { display_name, email, password }),
        logout: async () => {
          await api("/auth/logout", { method: "POST" });
          setUser(null);
          localStorage.removeItem("zoom-name");
          announce();
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error("AuthProvider is required.");
  return auth;
}
