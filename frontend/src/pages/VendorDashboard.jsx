import React from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { StatusBadge } from '../components/StatusBadge';
import { ChevronRight, Plus } from 'lucide-react';

export function VendorDashboard({ companies, onAddCompany, onViewCompany }) {
  const total = companies.length;
  const approved = companies.filter(c => c.status === 'Approved').length;
  const pending = companies.filter(c => c.status === 'Pending').length;
  const rejected = companies.filter(c => c.status === 'Rejected').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#173B63]">Dashboard Overview</h1>
          <p className="text-xs text-[#64748B]">Manage your registered company entities and track application statuses.</p>
        </div>
        <Button variant="secondary" onClick={onAddCompany}>
          <Plus className="w-4 h-4" /> Add New Company
        </Button>
      </div>

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

      {/* Company List Table */}
      <Card title="Registered Entities" className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-[#64748B] uppercase">
                <th className="py-3 px-6">Company Name</th>
                <th className="py-3 px-6">Vendor ID</th>
                <th className="py-3 px-6">App ID</th>
                <th className="py-3 px-6">Country</th>
                <th className="py-3 px-6">Reg Date</th>
                <th className="py-3 px-6">Status</th>
                <th className="py-3 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {companies.map((company) => (
                <tr key={company.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-4 px-6 font-semibold text-[#173B63]">{company.companyName}</td>
                  <td className="py-4 px-6 text-[#64748B] font-mono text-xs">{company.vendorId}</td>
                  <td className="py-4 px-6 text-[#64748B] font-mono text-xs">{company.id}</td>
                  <td className="py-4 px-6 text-[#64748B]">{company.country}</td>
                  <td className="py-4 px-6 text-[#64748B]">{company.regDate}</td>
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
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}