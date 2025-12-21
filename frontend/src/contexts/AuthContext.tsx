import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import api from '@/lib/api';

interface UserState {
  full_name: string | null;
}

interface AuthContextType {
  user: UserState | null;
  isLoading: boolean;
  signUp: (full_name: string, email: string, password: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // hydrate from localStorage
    const token = localStorage.getItem('access_token');
    const full_name = localStorage.getItem('full_name');
    if (token) {
      setUser({ full_name: full_name || null });
    }
    setIsLoading(false);
  }, []);

  const signUp = async (full_name: string, email: string, password: string) => {
    try {
      await api.signup(full_name, email, password);
      return { error: null };
    } catch (err: any) {
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const res = await api.login(email, password);
      setUser({ full_name: res.full_name || null });
      return { error: null };
    } catch (err: any) {
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
  };

  const signOut = () => {
    api.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
