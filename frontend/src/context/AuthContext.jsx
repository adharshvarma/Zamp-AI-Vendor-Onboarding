// File path: frontend/src/context/AuthContext.jsx

import React, { createContext, useContext, useState, useEffect } from 'react';
import API from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch user profile on initial load if token exists
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      fetchUserProfile();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await API.get('/api/vendor/me');
      setUser({
        name: `${response.data.first_name} ${response.data.last_name}`,
        email: response.data.email,
        role: response.data.role
      });
    } catch (err) {
      console.error("Failed to fetch user profile:", err);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const response = await API.post('/api/auth/login', { email, password });
    const { access_token, role } = response.data;
    
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('user_role', role);
    
    // Fetch profile immediately after login
    await fetchUserProfile();
    return response.data;
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_role');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, fetchUserProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);