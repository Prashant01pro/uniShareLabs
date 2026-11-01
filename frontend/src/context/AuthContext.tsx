import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { IUser, UserRole, IDemoPersona } from '../types';
import { authApi } from '../services/api';
import { socketService } from '../services/socket';

export const DEMO_PERSONAS: Record<UserRole, IDemoPersona> = {
  STUDENT: {
    role: 'STUDENT',
    name: 'Alex Mercer',
    email: 'student@university.edu',
    department: 'Physics',
    trustScore: 85,
    quotaHours: 10,
    avatar: '👨‍🎓',
    badge: 'Student',
    description: 'Undergraduate researcher in laser safety & optical spectroscopy',
  },
  RESEARCHER: {
    role: 'RESEARCHER',
    name: 'Dr. Elena Rostova',
    email: 'researcher@university.edu',
    department: 'Materials Science',
    trustScore: 92,
    quotaHours: 25,
    avatar: '🔬',
    badge: 'Researcher',
    description: 'Postdoctoral specialist with electron microscopy & cleanroom certs',
  },
  RESOURCE_OWNER: {
    role: 'RESOURCE_OWNER',
    name: 'Prof. Marcus Vance',
    email: 'owner@university.edu',
    department: 'Physics',
    trustScore: 98,
    quotaHours: 40,
    avatar: '⚙️',
    badge: 'Resource Owner',
    description: 'Principal Investigator and custodian of advanced analytical instrumentation',
  },
  LAB_MANAGER: {
    role: 'LAB_MANAGER',
    name: 'Dr. Sarah Jenkins',
    email: 'manager@university.edu',
    department: 'Materials Science',
    trustScore: 100,
    quotaHours: 40,
    avatar: '📋',
    badge: 'Lab Manager',
    description: 'Facility manager responsible for reservation SLA approvals & compliance',
  },
  ADMIN: {
    role: 'ADMIN',
    name: 'Arthur Pendelton',
    email: 'admin@university.edu',
    department: 'Central Administration',
    trustScore: 100,
    quotaHours: 100,
    avatar: '🛡️',
    badge: 'Admin',
    description: 'Institutional administrator overseeing security and cryptographic audit trail',
  },
};

export interface AuthContextType {
  currentUser: IUser | null;
  token: string | null;
  activeRole: UserRole;
  isLoading: boolean;
  isSwitchingPersona: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  switchPersona: (role: UserRole) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<IUser | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [activeRole, setActiveRole] = useState<UserRole>('STUDENT');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSwitchingPersona, setIsSwitchingPersona] = useState<boolean>(false);

  const refreshProfile = useCallback(async (): Promise<void> => {
    try {
      const res = await authApi.getMe();
      if (res && res.user) {
        setCurrentUser(res.user);
        setActiveRole(res.user.role);
      }
    } catch (err) {
      console.error('[AuthContext] refreshProfile error:', err);
    }
  }, []);

  const switchPersona = useCallback(async (role: UserRole): Promise<void> => {
    setIsSwitchingPersona(true);
    try {
      let tokenPair: { accessToken: string; refreshToken?: string; user?: IUser } | null = null;
      try {
        const demoRes = await authApi.getDemoTokens();
        if (demoRes?.personas?.[role]) {
          tokenPair = {
            accessToken: demoRes.personas[role].accessToken,
            refreshToken: demoRes.personas[role].refreshToken,
            user: demoRes.personas[role].user,
          };
        }
      } catch {
      }

      if (!tokenPair) {
        const personaConfig = DEMO_PERSONAS[role];
        const loginRes = await authApi.login({
          email: personaConfig.email,
          password: 'Password123!',
        });
        tokenPair = {
          accessToken: loginRes.accessToken,
          refreshToken: loginRes.refreshToken,
          user: loginRes.user,
        };
      }

      if (tokenPair?.accessToken) {
        localStorage.setItem('token', tokenPair.accessToken);
        if (tokenPair.refreshToken) {
          localStorage.setItem('refreshToken', tokenPair.refreshToken);
        }

        setToken(tokenPair.accessToken);
        setActiveRole(role);

        if (tokenPair.user) {
          setCurrentUser(tokenPair.user);
        } else {
          await refreshProfile();
        }

        socketService.connect(tokenPair.accessToken);
        if (tokenPair.user?._id) {
          socketService.joinUserRoom(tokenPair.user._id);
        }
        socketService.joinRoleRoom(role);
      }
    } catch (err) {
      console.error('[AuthContext] Persona switch failed:', err);
      throw err;
    } finally {
      setIsSwitchingPersona(false);
    }
  }, [refreshProfile]);

  const initializeAuth = useCallback(async () => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      try {
        const isReviewRoute = typeof window !== 'undefined' && window.location.pathname.includes('/review');
        await switchPersona(isReviewRoute ? 'LAB_MANAGER' : 'RESEARCHER');
      } catch (err) {
        console.warn('[AuthContext] Default demo persona auto-login fallback failed:', err);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    try {
      const response = await authApi.getMe();
      if (response && response.user) {
        setCurrentUser(response.user);
        setActiveRole(response.user.role);
        socketService.connect(storedToken);
      }
    } catch (err) {
      console.warn('[AuthContext] Session initialization failed, recovering demo persona:', err);
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      try {
        const isReviewRoute = typeof window !== 'undefined' && window.location.pathname.includes('/review');
        await switchPersona(isReviewRoute ? 'LAB_MANAGER' : 'RESEARCHER');
      } catch {
        setToken(null);
        setCurrentUser(null);
        socketService.disconnect();
      }
    } finally {
      setIsLoading(false);
    }
  }, [switchPersona]);

  useEffect(() => {
    initializeAuth();

    const handleGlobalLogout = () => {
      setToken(null);
      setCurrentUser(null);
      socketService.disconnect();
    };

    window.addEventListener('auth:logout', handleGlobalLogout);
    return () => {
      window.removeEventListener('auth:logout', handleGlobalLogout);
    };
  }, [initializeAuth]);

  const login = async (email: string, password: string): Promise<void> => {
    setIsLoading(true);
    try {
      const data = await authApi.login({ email, password });
      const user = data.user;
      const accessToken = data.accessToken;
      const refreshToken = data.refreshToken;

      if (accessToken) {
        localStorage.setItem('token', accessToken);
        setToken(accessToken);
      }
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      }

      setCurrentUser(user);
      setActiveRole(user.role);
      socketService.connect(accessToken);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await authApi.logout();
    } catch {
    } finally {
      setToken(null);
      setCurrentUser(null);
      socketService.disconnect();
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        token,
        activeRole,
        isLoading,
        isSwitchingPersona,
        login,
        logout,
        switchPersona,
        refreshProfile,
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
