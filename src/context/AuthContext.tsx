import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import * as authApi from '../api/auth';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    displayName?: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  const loadUser = useCallback(async () => {
    try {
      const user = await authApi.getMe();
      setState((s) => ({ ...s, user, loading: false, error: null }));
    } catch {
      setState((s) => ({ ...s, user: null, loading: false, error: null }));
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = useCallback(async (email: string, password: string) => {
    setState((s) => ({ ...s, error: null }));
    try {
      const { user } = await authApi.login({ email, password });
      setState((s) => ({ ...s, user, error: null }));
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Login failed';
      setState((s) => ({ ...s, error: message }));
      throw e;
    }
  }, []);

  const register = useCallback(
    async (email: string, password: string, displayName?: string) => {
      setState((s) => ({ ...s, error: null }));
      try {
        const { user } = await authApi.register({
          email,
          password,
          displayName,
        });
        setState((s) => ({ ...s, user, error: null }));
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Registration failed';
        setState((s) => ({ ...s, error: message }));
        throw e;
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setState({ user: null, loading: false, error: null });
    }
  }, []);

  const clearError = useCallback(() => {
    setState((s) => ({ ...s, error: null }));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      login,
      register,
      logout,
      clearError,
    }),
    [state, login, register, logout, clearError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
