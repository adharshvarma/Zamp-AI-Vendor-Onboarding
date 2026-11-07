import React from 'react';

export function Card({ children, className = '', title, action }) {
  return (
    <div className={`bg-white border border-slate-200 rounded-[12px] p-6 shadow-sm ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
          {title && <h3 className="font-bold text-[#173B63] text-base">{title}</h3>}
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}