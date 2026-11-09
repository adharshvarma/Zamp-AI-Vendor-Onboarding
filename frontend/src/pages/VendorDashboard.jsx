// File path: frontend/src/pages/VendorDashboard.jsx

import React, { useEffect, useState } from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { StatusBadge, normalizeStatus } from '../components/StatusBadge';
import { ChevronRight, Plus, RefreshCw } from 'lucide-react';
import API from '../services/api';

export function VendorDashboard({ onAddCompany, onViewCompany }) {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchVendorCompanies = async () => {
    setLoading(true);
    setError('');
    try {
      // Calls your updated backend endpoint that returns all companies for the current user
      const response = await API.get('/api/vendor/status');
      setCompanies(response.data);
    } catch (err) {
      console.error("Failed to fetch vendor companies:", err);
      // If 404, it just means the user hasn't registered any companies yet
      if (err.response?.status !== 404) {
        setError('Failed to load registered entities. Please try again.');
      }
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendorCompanies();
  }, []);

  const total = companies.length;
  const approved = companies.filter(c => normalizeStatus(c.status) === 'Approved').length;
  const pending = companies.filter(c => normalizeStatus(c.status) === 'Pending').length;
  const rejected = companies.filter(c => normalizeStatus(c.status) === 'Rejected').length;
  const needAction = companies.filter(c => normalizeStatus(c.status) !== 'Approved' && (c.actions_needed || 0) > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#173B63]">Dashboard Overview</h1>
          <p className="text-xs text-[#64748B]">Manage your registered company entities and track live AI verification statuses.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchVendorCompanies} title="Refresh Data">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="secondary" onClick={onAddCompany}>
            <Plus className="w-4 h-4" /> Add New Company
          </Button>
        </div>
      </div>

      {error && <div className="p-3 bg-red-50 text-[#DC2626] rounded-[10px] text-xs font-medium">{error}</div>}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-5">
          <p className="text-[11px] font-bold text-[#64748B] uppercase">Total Companies</p>
          <p className="text-3xl font-extrabold text-[#173B63] mt-2">{total}</p>
        </Card>
        <Card className="p-5">
          <p className="text-[11px] font-bold text-[#64748B] uppercase">Approved</p>
          <p className="text-3xl font-extrabold text-[#16A34A] mt-2">{approved}</p>
        </Card>
        <Card className="p-5">
          <p className="text-[11px] font-bold text-[#64748B] uppercase">Pending</p>
          <p className="text-3xl font-extrabold text-[#D97706] mt-2">{pending}</p>
        </Card>
        <Card className="p-5">
          <p className="text-[11px] font-bold text-[#64748B] uppercase">Rejected</p>
          <p className="text-3xl font-extrabold text-[#DC2626] mt-2">{rejected}</p>
        </Card>
      </div>

      {/* Action needed banner */}
      {!loading && needAction.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-[12px] text-sm text-[#92400E]">
          <strong>{needAction.length} application(s) need your action.</strong> Open "View Details" to see exactly what to fix, then use "Fix &amp; Resubmit".
        </div>
      )}

      {/* Company List Table */}
      <Card title="Registered Entities" className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-[#64748B] uppercase">
                <th className="py-3 px-6">Company Name</th>
                <th className="py-3 px-6">Vendor ID</th>
                <th className="py-3 px-6">App ID</th>
                <th className="py-3 px-6">Latest Update</th>
                <th className="py-3 px-6">Reg Date</th>
                <th className="py-3 px-6">Status</th>
                <th className="py-3 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-xs text-slate-500">
                    Loading your company entities...
                  </td>
                </tr>
              ) : companies.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-xs text-slate-500">
                    No vendor applications found. Click <strong>"Add New Company"</strong> to submit your first onboarding application.
                  </td>
                </tr>
              ) : (
                companies.map((company) => (
                  <tr key={company.vendor_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-6 font-semibold text-[#173B63]">{company.company_name}</td>
                    <td className="py-4 px-6 text-[#64748B] font-mono text-xs">{company.vendor_id}</td>
                    <td className="py-4 px-6 text-[#64748B] font-mono text-xs">{company.application_id}</td>
                    <td className="py-4 px-6 text-[#64748B] text-xs max-w-xs">{company.headline || company.entity_type}</td>
                    <td className="py-4 px-6 text-[#64748B]">
                      {company.submitted_at ? new Date(company.submitted_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="py-4 px-6">
                      <StatusBadge status={company.status} />
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button 
                        onClick={() => onViewCompany(company)}
                        className="text-[#2563EB] hover:underline font-medium inline-flex items-center gap-1 text-xs"
                      >
                        View Details <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}