import React, { useState } from 'react';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { Button } from '../components/Button';
import { Search } from 'lucide-react';

export function AdminDashboard({ companies, onReviewApplication }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const filteredCompanies = companies.filter(c => {
    const matchesSearch = c.companyName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.vendorId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#173B63]">Admin Verification Console</h1>
          <p className="text-xs text-[#64748B]">Review incoming vendor applications, verify documents, and issue decisions.</p>
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-3 text-[#64748B]" />
            <input 
              type="text" 
              placeholder="Search by company, Vendor ID, App ID..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-[10px] text-xs focus:outline-none focus:border-[#2563EB]"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-semibold text-[#64748B]">Filter Status:</span>
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-slate-300 rounded-[10px] p-2 text-xs bg-white text-[#1E293B]"
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-[#64748B] uppercase">
                <th className="py-3 px-6">Company Name</th>
                <th className="py-3 px-6">Vendor ID</th>
                <th className="py-3 px-6">App ID</th>
                <th className="py-3 px-6">Submission Date</th>
                <th className="py-3 px-6">Status</th>
                <th className="py-3 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCompanies.map((company) => (
                <tr key={company.id} className="hover:bg-slate-50/80">
                  <td className="py-4 px-6 font-semibold text-[#173B63]">{company.companyName}</td>
                  <td className="py-4 px-6 text-[#64748B] font-mono text-xs">{company.vendorId}</td>
                  <td className="py-4 px-6 text-[#64748B] font-mono text-xs">{company.id}</td>
                  <td className="py-4 px-6 text-[#64748B]">{company.regDate}</td>
                  <td className="py-4 px-6">
                    <StatusBadge status={company.status} />
                  </td>
                  <td className="py-4 px-6 text-right">
                    <Button variant="primary" className="py-1 px-3 text-xs" onClick={() => onReviewApplication(company)}>
                      Review Application
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}