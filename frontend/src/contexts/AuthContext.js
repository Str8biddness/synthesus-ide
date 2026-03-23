import { createContext, useContext, useState, useCallback, useEffect } from "react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Configure axios with auth token
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      localStorage.setItem("token", token);
    } else {
      delete axios.defaults.headers.common["Authorization"];
      localStorage.removeItem("token");
    }
  }, [token]);

  // Validate token on mount
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await axios.get(`${API}/auth/me`);
        setUser(response.data);
      } catch (error) {
        console.error("Token validation failed:", error);
        logout();
      } finally {
        setIsLoading(false);
      }
    };

    validateToken();
  }, [token]);

  const login = useCallback(async (email, password) => {
    try {
      const response = await axios.post(`${API}/auth/login`, {
        email,
        password,
      });

      const { access_token, user: userData } = response.data;
      setToken(access_token);
      setUser(userData);
      setIsAuthModalOpen(false);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || "Login failed",
      };
    }
  }, []);

  const register = useCallback(async (username, email, password) => {
    try {
      const response = await axios.post(`${API}/auth/register`, {
        username,
        email,
        password,
      });

      const { access_token, user: userData } = response.data;
      setToken(access_token);
      setUser(userData);
      setIsAuthModalOpen(false);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || "Registration failed",
      };
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common["Authorization"];
    localStorage.removeItem("token");
  }, []);

  const openAuthModal = useCallback(() => {
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  const value = {
    user,
    token,
    isLoading,
    isAuthenticated: !!user,
    isAuthModalOpen,
    login,
    register,
    logout,
    openAuthModal,
    closeAuthModal,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;
