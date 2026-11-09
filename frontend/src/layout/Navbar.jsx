// File path: frontend/src/layout/Navbar.jsx

import React from 'react';
import { LogOut, User as UserIcon } from 'lucide-react';

export function Navbar({ currentUser, onLogout, onLogoClick }) {
  // Fallback helper to get display name
  const displayName = currentUser?.name || currentUser?.email || 'Account';

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div 
          className="flex items-center space-x-3 cursor-pointer group" 
          onClick={onLogoClick}
        >
          <div className="w-9 h-9 bg-[#173B63] text-white rounded-[10px] flex items-center justify-center font-bold text-xl group-hover:bg-[#2563EB] transition-colors">
            C
          </div>
          <span className="text-xl font-extrabold text-[#173B63] tracking-tight">ClearVend</span>
        </div>

        {currentUser && (
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm font-medium text-[#1E293B]">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[#173B63]">
                <UserIcon className="w-4 h-4" />
              </div>
              <span className="hidden sm:inline font-semibold">{displayName}</span>
            </div>
            <button 
              onClick={onLogout}
              className="flex items-center text-xs font-semibold text-[#DC2626] hover:opacity-80 bg-red-50 px-3 py-2 rounded-[8px] transition-colors"
            >
              <LogOut className="w-3.5 h-3.5 mr-1.5" /> Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}