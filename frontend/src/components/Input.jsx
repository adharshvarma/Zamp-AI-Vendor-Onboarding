import React from 'react';

export function Input({ 
  label, 
  error, 
  type = 'text', 
  id, 
  placeholder, 
  value, 
  onChange, 
  required = false,
  disabled = false,
  className = '',
  ...props 
}) {
  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label htmlFor={id} className="block text-xs font-semibold text-[#1E293B]">
          {label} {required && <span className="text-[#DC2626]">*</span>}
        </label>
      )}
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={required}
        className={`w-full border rounded-[10px] p-2.5 text-sm bg-white text-[#1E293B] placeholder:text-[#64748B] focus:outline-none focus:ring-1 transition-all ${
          error ? 'border-[#DC2626] focus:ring-[#DC2626]' : 'border-slate-300 focus:border-[#2563EB] focus:ring-[#2563EB]'
        } ${disabled ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}`}
        {...props}
      />
      {error && <p className="text-xs text-[#DC2626] mt-1">{error}</p>}
    </div>
  );
}