import React from 'react';
import { Navbar } from './Navbar';
import { Building2, FileText, LayoutDashboard, ShieldCheck, User } from 'lucide-react';

export function DashboardLayout({ children, currentUser, onLogout, activeNav, setActiveNav, role = 'vendor' }) {
  const vendorNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'companies', label: 'My Companies', icon: Building2 },
    { id: 'applications', label: 'Applications', icon: FileText },
    { id: 'profile', label: 'My Profile', icon: User },
  ];

  const adminNavItems = [
    { id: 'admin-dashboard', label: 'Summary & Queue', icon: LayoutDashboard },
    { id: 'admin-reviews', label: 'Pending Reviews', icon: ShieldCheck },
  ];

  const navItems = role === 'admin' ? adminNavItems : vendorNavItems;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <Navbar currentUser={currentUser} onLogout={onLogout} onLogoClick={() => setActiveNav(role === 'admin' ? 'admin-dashboard' : 'dashboard')} />
      
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-slate-200 p-6 hidden md:block">
          <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-4">
            {role === 'admin' ? 'Admin Portal' : 'Vendor Navigation'}
          </p>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeNav === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveNav(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-[10px] text-sm font-medium transition-colors ${
                    isActive 
                      ? 'bg-[#173B63] text-white font-semibold' 
                      : 'text-[#1E293B] hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[#64748B]'}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-6 sm:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}