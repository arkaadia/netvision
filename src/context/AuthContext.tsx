import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface AuthUser {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: string;
  userType: 'local' | 'ad';
  policyId?: string;
  groupIds?: string[];
  isBuiltin?: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: AuthUser, rememberMe?: boolean) => void;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_STORAGE_KEY = 'nettopology_auth_token_v1';
const USER_STORAGE_KEY = 'nettopology_auth_user_v1';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize session from storage
  const checkAuth = useCallback(async () => {
    try {
      const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY) || sessionStorage.getItem(TOKEN_STORAGE_KEY);
      if (!storedToken) {
        setUser(null);
        setToken(null);
        setIsLoading(false);
        return;
      }

      // Verify token with backend
      const res = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${storedToken}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.user) {
          setUser(data.user);
          setToken(storedToken);
          setIsLoading(false);
          return;
        }
      }

      // Fallback to locally cached user if server is restarting or in standalone mode
      const rawUser = localStorage.getItem(USER_STORAGE_KEY) || sessionStorage.getItem(USER_STORAGE_KEY);
      if (rawUser) {
        try {
          const parsed = JSON.parse(rawUser);
          setUser(parsed);
          setToken(storedToken);
          setIsLoading(false);
          return;
        } catch {
          // ignore
        }
      }

      // If verification failed completely, clear invalid credentials
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      setUser(null);
      setToken(null);
    } catch (e) {
      console.warn('[Auth] Server verification check deferred:', e);
      // If network error occurred, keep existing session if token exists
      const fallbackToken = localStorage.getItem(TOKEN_STORAGE_KEY) || sessionStorage.getItem(TOKEN_STORAGE_KEY);
      const rawUser = localStorage.getItem(USER_STORAGE_KEY) || sessionStorage.getItem(USER_STORAGE_KEY);
      if (fallbackToken && rawUser) {
        try {
          setUser(JSON.parse(rawUser));
          setToken(fallbackToken);
        } catch {
          // ignore
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = (newToken: string, newUser: AuthUser, rememberMe: boolean = false) => {
    setToken(newToken);
    setUser(newUser);
    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem(TOKEN_STORAGE_KEY, newToken);
    storage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser));

    // Remove from opposite storage to prevent desync
    if (rememberMe) {
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      sessionStorage.removeItem(USER_STORAGE_KEY);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(USER_STORAGE_KEY);
    }
  };

  const logout = async () => {
    try {
      const currentToken = token || localStorage.getItem(TOKEN_STORAGE_KEY) || sessionStorage.getItem(TOKEN_STORAGE_KEY);
      if (currentToken) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${currentToken}`,
          },
        }).catch(() => {});
      }
    } catch {
      // ignore
    } finally {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(USER_STORAGE_KEY);
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      sessionStorage.removeItem(USER_STORAGE_KEY);
      setUser(null);
      setToken(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        isLoading,
        login,
        logout,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
