// File path: frontend/src/pages/LandingPage.jsx

import React from 'react';
import { ShieldCheck, ArrowRight } from 'lucide-react';
import { Button } from '../components/Button';

export function LandingPage({ onNavigate }) {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 bg-[#173B63] text-white rounded-[10px] flex items-center justify-center font-bold text-xl">
              C
            </div>
            <span className="text-xl font-extrabold text-[#173B63] tracking-tight">ClearVend</span>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => onNavigate('signin')}>Sign In</Button>
            <Button variant="primary" onClick={() => onNavigate('register')}>Register</Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-20 text-center my-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 text-[#2563EB] text-xs font-semibold mb-6">
          <ShieldCheck className="w-4 h-4" /> AI-Powered Vendor Onboarding Platform
        </div>
        <h1 className="text-4xl sm:text-6xl font-extrabold text-[#173B63] mb-4 tracking-tight">
          ClearVend
        </h1>
        <p className="text-xl font-semibold text-[#2563EB] mb-6">
          Simplifying Vendor Registration and Verification.
        </p>
        <p className="text-[#64748B] max-w-2xl mx-auto mb-10 text-base leading-relaxed">
          Automated document extraction, seamless Indian PIN code auto-fill, and streamlined compliance verification for companies across India.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
          <Button variant="primary" fullWidth onClick={() => onNavigate('register')}>
            Vendor Registration <ArrowRight className="w-4 h-4" />
          </Button>
          <Button variant="secondary" fullWidth onClick={() => onNavigate('signin')}>
            Vendor Sign In
          </Button>
          {/* Changed 'admin-login' to 'signin' since admins use the same sign-in route with admin credentials */}
          <Button variant="outline" fullWidth onClick={() => onNavigate('signin')}>
            Admin Login
          </Button>
        </div>
      </main>

      <footer className="text-center py-6 text-xs text-[#64748B] border-t border-slate-200 bg-white">
        ClearVend Verification Platform © 2026. All rights reserved.
      </footer>
    </div>
  );
}