// File path: frontend/src/pages/SignInPage.jsx

import React, { useState } from 'react';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { useAuth } from '../context/AuthContext';

export function SignInPage({ onSignInSuccess, onNavigateToRegister }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      onSignInSuccess();
    } catch (err) {
      console.error("Login error:", err);
      setError(err.response?.data?.detail || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full mx-auto">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-extrabold text-[#173B63]">Sign In to ClearVend</h2>
          <p className="text-xs text-[#64748B] mt-1">Manage your multi-company vendor profile and compliance status.</p>
        </div>

        <Card>
          {error && <div className="p-3 bg-red-50 text-[#DC2626] rounded-[10px] text-xs mb-4 font-medium">{error}</div>}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input 
              label="Email Address" 
              type="email" 
              required 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="john.doe@company.com" 
            />

            <div className="relative">
              <Input 
                label="Password" 
                type={showPassword ? "text" : "password"} 
                required 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="••••••••" 
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)} 
                className="absolute right-3 top-8 text-xs font-semibold text-[#64748B] hover:text-[#173B63]"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>

            <div className="pt-2">
              <Button type="submit" variant="primary" fullWidth disabled={loading}>
                {loading ? 'Signing In...' : 'Sign In'}
              </Button>
            </div>
          </form>

          <div className="mt-6 text-center text-xs text-[#64748B]">
            Don't have an account?{' '}
            <button onClick={onNavigateToRegister} className="text-[#2563EB] font-semibold hover:underline">
              Create Account
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}