import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { api } from '../api/client';

interface User {
  id: number;
  email: string;
  full_name: string;
  phone?: string;
  push_sound?: boolean;
  push_prefs?: Record<string, boolean>;
  finance_enabled?: boolean;
  nav_config?: { pinned?: string[] };
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  isOwner: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, full_name: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(
    localStorage.getItem('token')
  );
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (token) {
      Promise.all([api.auth.me(), api.auth.role()])
        .then(([u, r]) => {
          setUser(u);
          setIsOwner(r.is_owner);
          setIsAdmin(r.is_admin);
        })
        .catch(() => {
          localStorage.removeItem('token');
          setToken(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (email: string, password: string) => {
    api.invalidate('');
    const res = await api.auth.login({ email, password });
    localStorage.setItem('token', res.token);
    setToken(res.token);
    setUser(res.user);
    const r = await api.auth.role();
    setIsOwner(r.is_owner);
    setIsAdmin(r.is_admin);
  };

  const register = async (email: string, password: string, full_name: string) => {
    api.invalidate('');
    const res = await api.auth.register({ email, password, full_name });
    localStorage.setItem('token', res.token);
    setToken(res.token);
    setUser(res.user);
    const r = await api.auth.role();
    setIsOwner(r.is_owner);
    setIsAdmin(r.is_admin);
  };

  const logout = () => {
    api.invalidate('');
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setIsOwner(false);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, isOwner, isAdmin, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
