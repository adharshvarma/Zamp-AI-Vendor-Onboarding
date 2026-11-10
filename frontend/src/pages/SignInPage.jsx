// File path: frontend/src/pages/SignInPage.jsx

import React, { useState } from 'react';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { BrandMark } from '../layout/DashboardLayout';
import { useAuth } from '../context/AuthContext';

export function SignInPage({ onSignInSuccess, onNavigateToRegister, onHome, portal = 'vendor', onSwitchPortal }) {
  const isAdminPortal = portal === 'admin';
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
      await login(email, password, isAdminPortal ? 'admin' : 'vendor');
      onSignInSuccess();
    } catch (err) {
      console.error("Login error:", err);
      setError(err.response?.data?.detail || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F6F8] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full mx-auto">
        <div className="flex justify-center mb-8">
          <button type="button" onClick={onHome} title="Back to home">
            <BrandMark />
          </button>
        </div>
        <div className="text-center mb-6">
          <span className={`inline-block text-[11px] font-semibold px-2.5 py-1 rounded-full mb-3 ${isAdminPortal ? 'bg-[#0E2A47] text-white' : 'bg-[#E6F4F1] text-[#0F766E]'}`}>
            {isAdminPortal ? 'Procurement admin portal' : 'Vendor portal'}
          </span>
          <h2 className="text-2xl font-extrabold text-[#0E2A47]">{isAdminPortal ? 'Admin sign in' : 'Vendor sign in'}</h2>
          <p className="text-xs text-[#64748B] mt-1">
            {isAdminPortal
              ? 'Review vendor applications and give the final decision.'
              : 'Register your companies and track their verification status.'}
          </p>
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
                className="absolute right-3 top-8 text-xs font-semibold text-[#64748B] hover:text-[#0E2A47]"
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

          {!isAdminPortal && (
            <div className="mt-6 text-center text-xs text-[#64748B]">
              Don't have an account?{' '}
              <button onClick={onNavigateToRegister} className="text-[#0F766E] font-semibold hover:underline">
                Create Account
              </button>
            </div>
          )}
          {onSwitchPortal && (
            <div className="mt-3 text-center text-xs text-[#64748B]">
              {isAdminPortal ? 'Are you a vendor?' : 'Procurement team?'}{' '}
              <button onClick={onSwitchPortal} className="text-[#0F766E] font-semibold hover:underline">
                {isAdminPortal ? 'Vendor sign in' : 'Admin sign in'}
              </button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}