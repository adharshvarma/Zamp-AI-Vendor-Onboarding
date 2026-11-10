import React from 'react';

export function Card({ children, className = '', title, action }) {
  return (
    <div className={`bg-white border border-[#DCE3EA] rounded-[14px] p-6 ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
          {title && <h3 className="font-semibold text-[#0E2A47] text-[15px]">{title}</h3>}
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}