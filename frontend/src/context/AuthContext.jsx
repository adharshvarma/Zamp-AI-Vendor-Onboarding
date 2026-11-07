import React, { createContext, useContext, useState } from 'react';
import { loginVendor, loginAdmin, registerVendor } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null); // 'vendor' | 'admin' | null

  const handleVendorLogin = async (email, password) => {
    const data = await loginVendor(email, password);
    setUser(data.user);
    setRole('vendor');
    return data.user;
  };

  const handleAdminLogin = async (email, password) => {
    const data = await loginAdmin(email, password);
    setUser(data.user);
    setRole('admin');
    return data.user;
  };

  const handleRegister = async (formData) => {
    const data = await registerVendor(formData);
    setUser(data.user);
    setRole('vendor');
    return data.user;
  };

  const logout = () => {
    setUser(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAuthenticated: !!user,
        loginVendor: handleVendorLogin,
        loginAdmin: handleAdminLogin,
        registerVendor: handleRegister,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}