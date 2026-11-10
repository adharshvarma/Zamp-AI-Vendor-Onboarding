// File path: frontend/src/layout/DashboardLayout.jsx

import React from 'react';
import { LayoutDashboard, LogOut, ShieldCheck, User, Plus } from 'lucide-react';

function initials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || 'U';
}

export function BrandMark({ light = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-9 h-9 rounded-[10px] bg-[#0F766E] flex items-center justify-center">
        <ShieldCheck className="w-5 h-5 text-white" />
      </div>
      <div className="leading-tight">
        <p className={`text-[17px] font-bold ${light ? 'text-white' : 'text-[#0E2A47]'}`}>VendorGate</p>
        <p className={`text-[11px] ${light ? 'text-[#9FB3C8]' : 'text-slate-500'}`}>Vendor verification</p>
      </div>
    </div>
  );
}

export function DashboardLayout({ children, currentUser, onLogout, activeNav, setActiveNav, role = 'vendor', onAddCompany }) {
  const isAdmin = role === 'admin';

  const navItems = isAdmin
    ? [{ id: 'admin-dashboard', label: 'Applications', icon: LayoutDashboard }]
    : [
        { id: 'dashboard', label: 'My companies', icon: LayoutDashboard },
        { id: 'company-wizard', label: 'Add a company', icon: Plus },
        { id: 'profile', label: 'My profile', icon: User },
      ];

  // Detail pages highlight their parent menu item
  const activeParent =
    activeNav === 'admin-review' ? 'admin-dashboard'
    : activeNav === 'company-details' || activeNav === 'ai-verification' ? 'dashboard'
    : activeNav;

  const go = (id) => {
    if (id === 'company-wizard' && onAddCompany) {
      onAddCompany();
      return;
    }
    setActiveNav(id);
  };

  const name = currentUser?.name || currentUser?.email || 'Account';

  return (
    <div className="min-h-screen bg-[#F4F6F8] flex">
      {/* Sidebar (desktop) */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col bg-[#0E2A47] text-white sticky top-0 h-screen">
        <button type="button" onClick={() => go(isAdmin ? 'admin-dashboard' : 'dashboard')} className="px-5 pt-6 pb-8 text-left">
          <BrandMark light />
        </button>

        <p className="px-5 text-[11px] text-[#9FB3C8] mb-2">{isAdmin ? 'Procurement admin' : 'Vendor portal'}</p>
        <nav className="px-3 space-y-1 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeParent === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => go(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-sm transition-colors ${
                  active ? 'bg-white/10 text-white font-semibold' : 'text-[#C9D6E3] hover:bg-white/5 hover:text-white'
                }`}
              >
                <span className={`w-1 h-5 rounded-full ${active ? 'bg-[#2DD4BF]' : 'bg-transparent'}`} />
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-xs font-semibold">
              {initials(name)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{name}</p>
              <p className="text-[11px] text-[#9FB3C8] truncate">{currentUser?.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 text-xs font-medium text-[#FCA5A5] border border-white/10 rounded-[10px] py-2 hover:bg-white/5"
          >
            <LogOut className="w-3.5 h-3.5" /> Log out
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar (mobile) */}
        <header className="md:hidden bg-[#0E2A47] px-4 h-14 flex items-center justify-between sticky top-0 z-40">
          <button type="button" onClick={() => go(isAdmin ? 'admin-dashboard' : 'dashboard')}>
            <BrandMark light />
          </button>
          <button type="button" onClick={onLogout} className="text-xs text-[#FCA5A5] flex items-center gap-1">
            <LogOut className="w-3.5 h-3.5" /> Log out
          </button>
        </header>
        <nav className="md:hidden bg-white border-b border-[#DCE3EA] px-2 flex gap-1 overflow-x-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => go(item.id)}
              className={`px-3 py-2.5 text-xs whitespace-nowrap border-b-2 ${
                activeParent === item.id ? 'border-[#0F766E] text-[#0E2A47] font-semibold' : 'border-transparent text-slate-500'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <main className="flex-1 p-5 sm:p-8 lg:p-10">
          {children}
        </main>
      </div>
    </div>
  );
}
