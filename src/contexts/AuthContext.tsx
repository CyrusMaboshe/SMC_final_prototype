'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, AuthUser, StudentProfile, LecturerProfile, AccountantProfile } from '@/lib/supabase';
import { AuthLoadingOverlay } from '@/components/AuthLoadingSpinner';

export type AuthState = 'idle' | 'loading' | 'authenticating' | 'authenticated' | 'error';

interface AuthContextType {
  user: AuthUser | null;
  profile: StudentProfile | LecturerProfile | AccountantProfile | null;
  authState: AuthState;
  error: string | null;
  isActiveLogin: boolean;
  login: (credentials: { username: string; password: string }) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<StudentProfile | LecturerProfile | AccountantProfile | null>(null);
  const [authState, setAuthState] = useState<AuthState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isActiveLogin, setIsActiveLogin] = useState(false); // Track if we're in an active login flow
  const router = useRouter();

  // Check authentication on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      setAuthState('loading');
      setError(null);
      
      const currentUser = authAPI.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        
        // Get profile from localStorage
        const storedProfile = localStorage.getItem('user_profile');
        if (storedProfile) {
          try {
            setProfile(JSON.parse(storedProfile));
          } catch (e) {
            console.error('Error parsing stored profile:', e);
          }
        }
        
        setAuthState('authenticated');
      } else {
        setAuthState('idle');
      }
    } catch (err: any) {
      console.error('Auth check error:', err);
      setError(err.message || 'Authentication check failed');
      setAuthState('error');
    }
  };

  const login = async (credentials: { username: string; password: string }) => {
    try {
      setIsActiveLogin(true); // Mark as active login
      setAuthState('authenticating');
      setError(null);

      const { user: authUser, profile: userProfile } = await authAPI.login(credentials);

      // Store user data in localStorage
      localStorage.setItem('user_id', authUser.id);
      localStorage.setItem('user_role', authUser.role);
      localStorage.setItem('username', authUser.username);
      localStorage.setItem('user_profile', JSON.stringify(userProfile));

      setUser(authUser);
      setProfile(userProfile || null);
      setAuthState('authenticated');

      // Immediate redirect for faster user experience
      setTimeout(() => {
        setIsActiveLogin(false); // Reset active login flag
        // Redirect based on role
        switch (authUser.role) {
          case 'admin':
            router.push('/admin/dashboard');
            break;
          case 'lecturer':
            router.push('/lecturer/dashboard');
            break;
          case 'student':
            router.push('/student/dashboard');
            break;
          case 'accountant':
            router.push('/accountant/dashboard');
            break;
          case 'principal':
            router.push('/principal/dashboard');
            break;
          default:
            throw new Error('Invalid user role');
        }
      }, 200); // Reduced to 0.2 seconds for instant redirect
    } catch (err: any) {
      setIsActiveLogin(false); // Reset active login flag on error
      setError(err.message || 'Login failed. Please check your credentials.');
      setAuthState('error');
      throw err; // Re-throw to allow component-level error handling
    }
  };

  const logout = () => {
    authAPI.logout();
    setUser(null);
    setProfile(null);
    setAuthState('idle');
    setError(null);
    router.push('/');
  };

  const clearError = () => {
    setError(null);
    if (authState === 'error') {
      setAuthState('idle');
    }
  };

  const value: AuthContextType = {
    user,
    profile,
    authState,
    error,
    isActiveLogin,
    login,
    logout,
    checkAuth,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      {/* Show global loading overlay during authentication */}
      {authState === 'authenticating' && (
        <AuthLoadingOverlay
          message="Signing you in..."
          subMessage="Please wait while we authenticate your credentials and prepare your dashboard"
        />
      )}
      {/* Show success overlay when authenticated (before redirect) - only during active login */}
      {authState === 'authenticated' && user && isActiveLogin && (
        <AuthLoadingOverlay
          message="Login Successful!"
          subMessage={`Welcome back! Redirecting to your ${user.role} dashboard...`}
          isSuccess={true}
        />
      )}
    </AuthContext.Provider>
  );
};
