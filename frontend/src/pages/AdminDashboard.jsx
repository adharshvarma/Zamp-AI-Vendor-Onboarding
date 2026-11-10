// File path: frontend/src/pages/AdminDashboard.jsx

import React, { useState, useEffect } from 'react';
import { Card } from '../components/Card';
import { StatusBadge, normalizeStatus } from '../components/StatusBadge';
import { Button } from '../components/Button';
import { Search, RefreshCw, Building2, CheckCircle2, Clock, XCircle } from 'lucide-react';
import API from '../services/api';

const STATUS_META = {
  Approved: { color: '#16A34A', Icon: CheckCircle2, text: 'text-[#15803D]' },
  Pending: { color: '#D97706', Icon: Clock, text: 'text-[#B45309]' },
  Rejected: { color: '#DC2626', Icon: XCircle, text: 'text-[#B91C1C]' },
};
const ORDER = ['Approved', 'Pending', 'Rejected'];

function KpiCard({ label, value, sub, Icon, textClass, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left bg-white border rounded-[12px] p-5 shadow-sm transition-all hover:shadow-md ${
        active ? 'border-[#0E2A47] ring-1 ring-[#0E2A47]' : 'border-slate-200'
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wide">{label}</p>
        <Icon className={`w-4 h-4 ${textClass}`} />
      </div>
      <p className="text-3xl font-extrabold text-[#0E2A47] mt-2">{value}</p>
      <p className="text-xs text-slate-500 mt-1">{sub}</p>
    </button>
  );
}

// One horizontal bar split into Approved / Pending / Rejected (share of all applications)
function StatusSplitBar({ counts, total }) {
  const [hover, setHover] = useState(null);
  if (total === 0) {
    return <p className="text-xs text-slate-500">No applications yet.</p>;
  }
  return (
    <div className="space-y-3">
      <div className="flex w-full h-4 gap-[2px] rounded-full overflow-hidden bg-slate-100" role="img"
        aria-label={ORDER.map((s) => `${s}: ${counts[s]}`).join(', ')}>
        {ORDER.filter((s) => counts[s] > 0).map((s) => (
          <div
            key={s}
            onMouseEnter={() => setHover(s)}
            onMouseLeave={() => setHover(null)}
            style={{ width: `${(counts[s] / total) * 100}%`, backgroundColor: STATUS_META[s].color, opacity: hover && hover !== s ? 0.45 : 1 }}
            className="h-full transition-opacity cursor-default"
            title={`${s}: ${counts[s]} (${Math.round((counts[s] / total) * 100)}%)`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
        {ORDER.map((s) => (
          <span key={s} className="inline-flex items-center gap-2 text-[#1E293B]">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STATUS_META[s].color }} />
            <strong>{s}</strong>
            <span className="text-slate-500">{counts[s]} · {Math.round((counts[s] / total) * 100)}%</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// Top reasons applications are not approved (from AI checks)
function TopIssues({ companies }) {
  const tally = {};
  companies.forEach((c) => {
    const h = c.headline || '';
    if (!h.startsWith('Pending:') && !h.startsWith('Rejected:')) return;
    h.split(':').slice(1).join(':').split(';').map((x) => x.trim()).filter(Boolean)
      .forEach((issue) => { tally[issue] = (tally[issue] || 0) + 1; });
  });
  const rows = Object.entries(tally).sort((a, b) => b[1] - a[1]).slice(0, 5);
  if (rows.length === 0) return <p className="text-xs text-slate-500">No open issues.</p>;
  const max = rows[0][1];
  return (
    <ul className="space-y-2.5">
      {rows.map(([issue, n]) => (
        <li key={issue} className="text-xs">
          <div className="flex justify-between mb-1">
            <span className="text-[#1E293B] font-medium">{issue}</span>
            <span className="text-slate-500 font-semibold">{n}</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full">
            <div className="h-1.5 rounded-full bg-[#0E2A47]" style={{ width: `${(n / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function AdminDashboard({ onReviewApplication }) {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const fetchAdminApps = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await API.get('/api/admin/applications');
      setCompanies(response.data);
    } catch (err) {
      console.error('Failed to load admin applications queue:', err);
      setError(err.response?.status === 403 ? 'This account is not an admin.' : 'Failed to load applications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminApps();
  }, []);

  const counts = { Approved: 0, Pending: 0, Rejected: 0 };
  companies.forEach((c) => { counts[normalizeStatus(c.status)] += 1; });
  const total = companies.length;

  const filteredCompanies = companies.filter((c) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch = [c.companyName, c.vendorId, c.applicationId, c.contactName]
      .some((v) => String(v || '').toLowerCase().includes(q));
    const matchesStatus = statusFilter === 'All' || normalizeStatus(c.status) === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return <div className="p-8 text-center text-xs text-slate-500">Loading admin dashboard...</div>;
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0E2A47]">Vendor Onboarding Dashboard</h1>
          <p className="text-xs text-[#64748B]">AI verifies every submission. You review the reasons and give the final decision.</p>
        </div>
        <Button variant="outline" onClick={fetchAdminApps} title="Refresh">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {error && <div className="p-3 bg-red-50 text-[#DC2626] rounded-[10px] text-xs font-medium">{error}</div>}

      {/* KPI cards (click to filter) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total Applications" value={total} sub="All time" Icon={Building2} textClass="text-[#0E2A47]"
          active={statusFilter === 'All'} onClick={() => setStatusFilter('All')} />
        <KpiCard label="Approved" value={counts.Approved} sub={`${total ? Math.round((counts.Approved / total) * 100) : 0}% of total`}
          Icon={CheckCircle2} textClass="text-[#15803D]" active={statusFilter === 'Approved'} onClick={() => setStatusFilter('Approved')} />
        <KpiCard label="Pending" value={counts.Pending} sub="Waiting on vendor / review"
          Icon={Clock} textClass="text-[#B45309]" active={statusFilter === 'Pending'} onClick={() => setStatusFilter('Pending')} />
        <KpiCard label="Rejected" value={counts.Rejected} sub="Hard conflicts found"
          Icon={XCircle} textClass="text-[#B91C1C]" active={statusFilter === 'Rejected'} onClick={() => setStatusFilter('Rejected')} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Status split">
          <StatusSplitBar counts={counts} total={total} />
          <p className="text-[11px] text-slate-500 mt-4">
            Tip: click a number card above to filter the list below.
          </p>
        </Card>
        <Card title="Top reasons for Pending / Rejected">
          <TopIssues companies={companies} />
        </Card>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-3 text-[#64748B]" />
            <input
              type="text"
              placeholder="Search company, contact, Vendor ID, App ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-[10px] text-xs focus:outline-none focus:border-[#0F766E]"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-semibold text-[#64748B]">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-slate-300 rounded-[10px] p-2 text-xs bg-white text-[#1E293B]"
            >
              <option value="All">All</option>
              <option value="Approved">Approved</option>
              <option value="Pending">Pending</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-[#64748B] uppercase">
                <th className="py-3 px-5">Company</th>
                <th className="py-3 px-5">Contact</th>
                <th className="py-3 px-5">Submitted</th>
                <th className="py-3 px-5">Status</th>
                <th className="py-3 px-5">Why (AI reasoning)</th>
                <th className="py-3 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredCompanies.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-6 text-center text-slate-400">No matching vendor applications found.</td>
                </tr>
              ) : (
                filteredCompanies.map((company) => (
                  <tr key={company.id} className="hover:bg-slate-50/80 align-top">
                    <td className="py-4 px-5">
                      <p className="font-semibold text-[#0E2A47]">{company.companyName}</p>
                      <p className="text-[#64748B] font-mono text-[11px]">{company.vendorId} · {company.applicationId}</p>
                    </td>
                    <td className="py-4 px-5 text-[#1E293B]">
                      <p>{company.contactName || '—'}</p>
                      <p className="text-[#64748B] text-[11px]">{company.designation || ''}</p>
                    </td>
                    <td className="py-4 px-5 text-[#64748B]">
                      {company.createdAt ? new Date(company.createdAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="py-4 px-5">
                      <StatusBadge status={company.status} />
                      {company.aiDecision && normalizeStatus(company.status) !== company.aiDecision && (
                        <p className="text-[10px] text-slate-500 mt-1">AI said {company.aiDecision}</p>
                      )}
                    </td>
                    <td className="py-4 px-5 text-slate-600 max-w-xs">{company.headline}</td>
                    <td className="py-4 px-5 text-right">
                      <Button variant="primary" className="py-1 px-3 text-xs inline-flex" onClick={() => onReviewApplication(company)}>
                        Review
                      </Button>
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
