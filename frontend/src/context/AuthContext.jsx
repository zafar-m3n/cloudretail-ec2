import React, { createContext, useContext, useEffect, useState } from "react";
import api from "../api/axios";
import { saveToken, getToken, removeToken, getUserFromToken, isTokenExpired } from "../utils/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getToken());
  const [user, setUser] = useState(() => getUserFromToken());
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState(null);

  // Whenever token changes, update user derived from token
  useEffect(() => {
    if (!token || isTokenExpired(token)) {
      setUser(null);
      return;
    }
    const u = getUserFromToken();
    setUser(u);
  }, [token]);

  const isAuthenticated = !!token && !isTokenExpired(token);

  /**
   * Call the backend login endpoint and persist the token.
   * Expects the backend to return something like:
   * { token: "<JWT>" } or { accessToken: "<JWT>" }
   */
  const login = async (email, password) => {
    setAuthLoading(true);
    setAuthError(null);

    try {
      const response = await api.post("/api/v1/users/login", {
        email,
        password,
      });

      const data = response.data || {};

      const tokenFromApi = data.token || data.accessToken || data.jwt || data.idToken;

      if (!tokenFromApi) {
        throw new Error("Login response did not contain a token.");
      }

      saveToken(tokenFromApi);
      setToken(tokenFromApi);

      const u = getUserFromToken();
      setUser(u);

      return { success: true, user: u };
    } catch (error) {
      console.error("Login failed:", error);
      const message = error.response?.data?.message || error.message || "Login failed. Please try again.";
      setAuthError(message);
      return { success: false, message };
    } finally {
      setAuthLoading(false);
    }
  };

  /**
   * Call the backend register endpoint.
   * We do NOT auto-login by default (you can change this later if you want).
   */
  const register = async (payload) => {
    // payload = { fullName, email, password } or whatever your backend expects
    setAuthLoading(true);
    setAuthError(null);

    try {
      const response = await api.post("/api/v1/users/register", payload);
      return { success: true, data: response.data };
    } catch (error) {
      console.error("Registration failed:", error);
      const message = error.response?.data?.message || error.message || "Registration failed. Please try again.";
      setAuthError(message);
      return { success: false, message };
    } finally {
      setAuthLoading(false);
    }
  };

  /**
   * Fetch user profile from backend (optional, but useful if
   * you want fresher data than the token payload).
   */
  const fetchProfile = async () => {
    if (!isAuthenticated) return null;

    try {
      const response = await api.get("/api/v1/users/profile");
      const profile = response.data;
      setUser((prev) => ({
        ...prev,
        ...profile,
      }));
      return profile;
    } catch (error) {
      console.error("Failed to fetch profile:", error);
      return null;
    }
  };

  /**
   * Clear token and user info.
   */
  const logout = () => {
    removeToken();
    setToken(null);
    setUser(null);
    setAuthError(null);
  };

  const value = {
    token,
    user,
    isAuthenticated,
    authLoading,
    authError,
    login,
    logout,
    register,
    fetchProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
