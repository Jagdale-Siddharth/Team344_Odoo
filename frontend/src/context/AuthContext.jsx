import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const sessionGenRef = useRef(0);

  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) {
      console.warn('Failed to parse saved user from localStorage:', e);
      localStorage.removeItem('user');
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch current user from /auth/me on load if token exists
  const fetchCurrentUser = useCallback(async () => {
    const currentGen = ++sessionGenRef.current;
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      if (currentGen === sessionGenRef.current) {
        setLoading(false);
      }
      return;
    }
    try {
      const response = await api.get('/auth/me');
      if (currentGen === sessionGenRef.current && response.data.success) {
        setUser(response.data.user);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
    } catch (err) {
      if (currentGen === sessionGenRef.current) {
        console.error('Failed to fetch user session:', err);
        logout();
      }
    } finally {
      if (currentGen === sessionGenRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  const login = async (email, password) => {
    sessionGenRef.current++;
    setError(null);
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token: newToken, user: userData } = response.data;

      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(userData));

      setToken(newToken);
      setUser(userData);
      setLoading(false);
      return { success: true, user: userData };
    } catch (err) {
      const message = err.response?.data?.message || 'Login failed. Please check your credentials.';
      setError(message);
      return { success: false, error: message };
    }
  };

  const register = async (email, password, name) => {
    sessionGenRef.current++;
    setError(null);
    try {
      const response = await api.post('/auth/register', { email, password, name });
      const { token: newToken, user: userData } = response.data;

      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(userData));

      setToken(newToken);
      setUser(userData);
      setLoading(false);
      return { success: true, user: userData };
    } catch (err) {
      const message = err.response?.data?.message || 'Registration failed.';
      setError(message);
      return { success: false, error: message };
    }
  };

  const logout = () => {
    sessionGenRef.current++;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setError(null);
    setLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        error,
        login,
        register,
        logout,
        isAuthenticated: !!user && !!token,
        isSystemAdmin: user?.role === 'SYSTEM_ADMIN',
        isHRAdmin: user?.role === 'HR_ADMIN',
        isPayrollOfficer: user?.role === 'PAYROLL_OFFICER',
        isEmployee: user?.role === 'EMPLOYEE',
        isAdmin: user?.role === 'SYSTEM_ADMIN' || user?.role === 'HR_ADMIN',
        hasRole: (roles = []) => Array.isArray(roles) && roles.includes(user?.role),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
