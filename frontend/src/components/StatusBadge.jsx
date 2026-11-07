import React from 'react';

export function StatusBadge({ status }) {
  const statusStyles = {
    Approved: 'bg-emerald-50 text-[#16A34A] border border-emerald-200',
    Pending: 'bg-amber-50 text-[#D97706] border border-amber-200',
    Rejected: 'bg-red-50 text-[#DC2626] border border-red-200',
    In_Progress: 'bg-blue-50 text-[#2563EB] border border-blue-200'
  };

  const formattedStatus = status === 'In Progress' ? 'In_Progress' : status;

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${statusStyles[formattedStatus] || 'bg-slate-100 text-slate-700'}`}>
      {status}
    </span>
  );
}