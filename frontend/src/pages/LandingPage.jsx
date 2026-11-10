// File path: frontend/src/pages/LandingPage.jsx

import React from 'react';
import { CheckCircle2, Clock, XCircle, FileText, Landmark, Receipt } from 'lucide-react';
import { Button } from '../components/Button';
import { BrandMark } from '../layout/DashboardLayout';

// The core idea of the product, shown instead of described:
// the PAN is hidden inside every GSTIN, and every document must point to the same company.
function CrossCheckSpecimen() {
  return (
    <div className="bg-white border border-[#DCE3EA] rounded-[18px] p-6 sm:p-7 relative">
      <p className="text-sm font-semibold text-[#0E2A47] mb-5">One submission, cross-checked</p>

      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <FileText className="w-5 h-5 text-slate-400 mt-0.5" />
          <div>
            <p className="text-xs text-slate-500">PAN card</p>
            <p className="font-mono text-[15px] text-[#0E2A47]">
              <mark className="bg-[#CCFBF1] text-[#0F766E] rounded px-1">AABCT1234K</mark>
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Receipt className="w-5 h-5 text-slate-400 mt-0.5" />
          <div>
            <p className="text-xs text-slate-500">GST certificate</p>
            <p className="font-mono text-[15px] text-[#0E2A47]">
              33<mark className="bg-[#CCFBF1] text-[#0F766E] rounded px-1 mx-0.5">AABCT1234K</mark>1Z5
            </p>
            <p className="text-xs text-slate-500 mt-1">The PAN is built into every GSTIN. If they differ, the documents belong to different businesses.</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Landmark className="w-5 h-5 text-slate-400 mt-0.5" />
          <div>
            <p className="text-xs text-slate-500">Cancelled cheque</p>
            <p className="text-[15px] text-[#0E2A47]">Zamp Technologies Private Limited</p>
            <p className="text-xs text-slate-500 mt-1">The bank account must be in the same company's name.</p>
          </div>
        </div>
      </div>

      <div
        className="vg-stamp absolute -top-4 right-5 sm:right-7 border-[3px] border-[#15803D] text-[#15803D] bg-white rounded-[10px] px-3 py-1.5"
        aria-hidden="true"
      >
        <p className="text-base font-bold tracking-[0.12em] leading-none">APPROVED</p>
      </div>
    </div>
  );
}

const OUTCOMES = [
  {
    Icon: CheckCircle2,
    color: 'text-[#15803D]',
    title: 'Approved',
    text: 'The form matches every document, and all documents belong to the same company.',
  },
  {
    Icon: Clock,
    color: 'text-[#B45309]',
    title: 'Pending',
    text: 'Something is fixable: a typing mistake, a missing or blurry document, a name that only partly matches. The vendor is told exactly what to fix.',
  },
  {
    Icon: XCircle,
    color: 'text-[#B91C1C]',
    title: 'Rejected',
    text: "The documents contradict each other: another business's PAN, or a bank account in someone else's name. A common sign of fraud.",
  },
];

export function LandingPage({ onNavigate }) {
  return (
    <div className="min-h-screen bg-[#F4F6F8] flex flex-col">
      <header className="max-w-6xl w-full mx-auto px-5 sm:px-8 h-20 flex items-center justify-between">
        <BrandMark />
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => onNavigate('signin')}>Sign in</Button>
          <Button variant="primary" onClick={() => onNavigate('register')}>Register</Button>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-5 sm:px-8">
        <section className="grid lg:grid-cols-2 gap-12 items-center py-10 sm:py-16">
          <div>
            <h1 className="text-4xl sm:text-5xl font-bold text-[#0E2A47] leading-[1.1] tracking-tight">
              Check every vendor before the first payment.
            </h1>
            <p className="text-base sm:text-lg text-slate-600 mt-5 leading-relaxed max-w-[34rem]">
              Vendors upload their PAN card, GST certificate and cancelled cheque. AI reads each document,
              cross-checks it against the form and the other documents, and gives a clear decision with the reason.
            </p>
            <div className="flex flex-wrap gap-3 mt-8">
              <Button variant="secondary" onClick={() => onNavigate('register')}>Register as a vendor</Button>
              <Button variant="outline" onClick={() => onNavigate('signin')}>Sign in (vendors and admins)</Button>
            </div>
          </div>
          <CrossCheckSpecimen />
        </section>

        <section className="py-10 border-t border-[#DCE3EA]">
          <h2 className="text-xl font-semibold text-[#0E2A47] mb-6">How each application is decided</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {OUTCOMES.map(({ Icon, color, title, text }) => (
              <div key={title}>
                <div className={`flex items-center gap-2 font-semibold ${color}`}>
                  <Icon className="w-5 h-5" /> {title}
                </div>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-slate-500 mt-8 max-w-3xl">
            The procurement team always has the final say. Every decision, AI or human, is kept in an audit trail.
          </p>
        </section>
      </main>

      <footer className="text-center py-6 text-xs text-slate-500">
        VendorGate · Vendor onboarding and verification · © 2026
      </footer>
    </div>
  );
}
