// File path: frontend/src/pages/RegisterPage.jsx

import React, { useState } from 'react';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { BrandMark } from '../layout/DashboardLayout';
import API from '../services/api';

export function RegisterPage({ onRegisterSuccess, onNavigateToSignIn, onHome }) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    mobile: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      // Connects to your backend auth router registration endpoint
      const payload = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        mobile_number: formData.mobile,
        password: formData.password,
        confirm_password: formData.confirmPassword // <--- Added this line
      };

      const response = await API.post('/api/auth/register', payload);
      
      if (response.status === 201 || response.status === 200) {
        onRegisterSuccess({ 
          name: `${formData.firstName} ${formData.lastName}`, 
          email: formData.email 
        });
      }
    } catch (err) {
      console.error("Registration error:", err);
      setError(err.response?.data?.detail || 'Registration failed. Please check your details and try again.');
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
          <h2 className="text-2xl font-extrabold text-[#0E2A47]">Create Personal Account</h2>
          <p className="text-xs text-[#64748B] mt-1">Register your main vendor account to manage multiple company entities.</p>
        </div>

        <Card>
          {error && <div className="p-3 bg-red-50 text-[#DC2626] rounded-[10px] text-xs mb-4 font-medium">{error}</div>}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input 
                label="First Name" 
                required 
                value={formData.firstName} 
                onChange={(e) => setFormData({...formData, firstName: e.target.value})} 
                placeholder="John" 
              />
              <Input 
                label="Last Name" 
                required 
                value={formData.lastName} 
                onChange={(e) => setFormData({...formData, lastName: e.target.value})} 
                placeholder="Doe" 
              />
            </div>

            <Input 
              label="Email Address" 
              type="email" 
              required 
              value={formData.email} 
              onChange={(e) => setFormData({...formData, email: e.target.value})} 
              placeholder="john.doe@company.com" 
            />

            <Input 
              label="Mobile Number" 
              type="tel" 
              required 
              value={formData.mobile} 
              onChange={(e) => setFormData({...formData, mobile: e.target.value})} 
              placeholder="+91 98765 43210" 
            />

            <div className="relative">
              <Input 
                label="Password" 
                type={showPassword ? "text" : "password"} 
                required 
                value={formData.password} 
                onChange={(e) => setFormData({...formData, password: e.target.value})} 
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

            <Input 
              label="Confirm Password" 
              type="password" 
              required 
              value={formData.confirmPassword} 
              onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})} 
              placeholder="••••••••" 
            />

            <div className="pt-2">
              <Button type="submit" variant="primary" fullWidth disabled={loading}>
                {loading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </div>
          </form>

          <div className="mt-6 text-center text-xs text-[#64748B]">
            Already have an account?{' '}
            <button onClick={onNavigateToSignIn} className="text-[#0F766E] font-semibold hover:underline">
              Sign In
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}