// File path: frontend/src/components/StatusBadge.jsx

import React from 'react';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';

// Only 3 statuses exist. Old values (Flagged / Clarification_Required) are shown as Pending.
export function normalizeStatus(status) {
  if (status === 'Approved' || status === 'Rejected') return status;
  return 'Pending';
}

export function StatusBadge({ status, size = 'sm' }) {
  const s = normalizeStatus(status);
  const styles = {
    Approved: 'bg-emerald-50 text-[#15803D] border border-emerald-200',
    Pending: 'bg-amber-50 text-[#B45309] border border-amber-200',
    Rejected: 'bg-red-50 text-[#B91C1C] border border-red-200',
  };
  const icons = { Approved: CheckCircle2, Pending: Clock, Rejected: XCircle };
  const Icon = icons[s];
  const sizing = size === 'lg' ? 'px-3.5 py-1.5 text-sm' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${sizing} ${styles[s]}`}>
      <Icon className={size === 'lg' ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
      {s}
    </span>
  );
}
