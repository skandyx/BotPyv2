import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { api } from '../services/mockApi';
import { positionService } from '../services/positionService';

interface AuthContextType {
  isAuthenticated: boolean;
  login: (password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // On initial load, check with the backend if we have a valid session.
    const verifySession = async () => {
      try {
        const data = await api.checkSession();
        setIsAuthenticated(data.isAuthenticated);
        if (data.isAuthenticated) {
          const initialPositions = await api.fetchActivePositions();
          positionService._initialize(initialPositions);
        }
      } catch (error) {
        // If the server returns 401 Unauthorized, it's fine.
        console.log("No active session found.");
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };
    verifySession();
  }, []);

  const login = async (password: string): Promise<void> => {
    try {
      // api.login will throw on a non-ok response (like 401)
      // and will resolve with { success: true, ... } on a 200 OK.
      const response = await api.login(password);
      if (response.success) {
        setIsAuthenticated(true);
        const initialPositions = await api.fetchActivePositions();
        positionService._initialize(initialPositions);
      } else {
        // This case is unlikely if the backend uses HTTP status codes correctly,
        // but it's a good safeguard.
        throw new Error(response.message || 'Authentication failed');
      }
    } catch (error) {
      console.error("Login failed:", error);
      // Re-throw to allow the UI to display the specific error message
      throw error;
    }
  };

  const logout = async () => {
    try {
      await api.logout();
      positionService.clearPositions();
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setIsAuthenticated(false);
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, isLoading }}>
      {!isLoading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};