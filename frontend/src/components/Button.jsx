import React from 'react';

export function Button({ 
  children, 
  variant = 'primary', 
  type = 'button', 
  fullWidth = false, 
  onClick, 
  disabled = false,
  className = '' 
}) {
  const baseStyles = "py-2.5 px-4 rounded-[10px] font-medium text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-[#0E2A47] text-white hover:bg-[#0A1F36]",
    secondary: "bg-[#0F766E] text-white hover:bg-[#0B5E58]",
    outline: "bg-white border border-slate-300 text-[#1E293B] hover:bg-slate-50",
    danger: "bg-[#DC2626] text-white hover:opacity-90",
    success: "bg-[#16A34A] text-white hover:opacity-90"
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`${baseStyles} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      {children}
    </button>
  );
}