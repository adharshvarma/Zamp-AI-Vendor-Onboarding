// File path: frontend/src/pages/ProfilePage.jsx

import React, { useEffect, useState } from 'react';
import { Card } from '../components/Card';
import { User, Mail, Phone, Shield, Building2 } from 'lucide-react';
import API from '../services/api';

export function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await API.get('/api/vendor/me');
        setProfile(response.data);
      } catch (err) {
        console.error("Failed to fetch user profile:", err);
        setError("Failed to load profile details.");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-6 text-center text-xs text-slate-500">
        Loading profile information...
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto p-6 bg-red-50 text-[#DC2626] rounded-[10px] text-xs font-medium">
        {error}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#173B63]">My Profile</h1>
        <p className="text-xs text-[#64748B]">View your VendorGate account credentials and role permissions.</p>
      </div>

      <Card title="Account Information">
        <div className="space-y-6">
          <div className="flex items-center space-x-4 p-4 bg-slate-50 rounded-[10px] border border-slate-200">
            <div className="w-14 h-14 rounded-full bg-[#173B63] text-white flex items-center justify-center font-bold text-xl shadow-sm">
              {profile?.first_name?.[0]}{profile?.last_name?.[0]}
            </div>
            <div>
              <h2 className="text-base font-bold text-[#173B63]">
                {profile?.first_name} {profile?.last_name}
              </h2>
              <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-[#2563EB] uppercase tracking-wide">
                Role: {profile?.role || 'Vendor'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-white border border-slate-200 rounded-[10px] space-y-1 shadow-sm">
              <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#2563EB]" /> Email Address
              </span>
              <p className="text-[#1E293B] font-medium text-sm">{profile?.email}</p>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-[10px] space-y-1 shadow-sm">
              <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-[#2563EB]" /> Mobile Number
              </span>
              <p className="text-[#1E293B] font-medium text-sm">{profile?.mobile_number || 'N/A'}</p>
            </div>
          </div>

          <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-[10px] text-xs text-slate-600 flex items-start gap-3">
            <Shield className="w-4 h-4 text-[#2563EB] mt-0.5 flex-shrink-0" />
            <p>
              Your account is authenticated securely via JWT Bearer tokens. To update your password or profile contact details, please contact system administration.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}