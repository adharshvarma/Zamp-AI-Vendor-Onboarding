// File path: frontend/src/components/VerificationReport.jsx
// Shows the AI verification result: decision banner, summary, what to fix,
// and a card per document with every check and its reason.

import React, { useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, FileText, Copy, ChevronDown, ChevronUp } from 'lucide-react';
import { normalizeStatus } from './StatusBadge';

const CHECK_STYLE = {
  pass: { Icon: CheckCircle2, color: 'text-[#15803D]', label: 'Pass' },
  warn: { Icon: AlertTriangle, color: 'text-[#B45309]', label: 'Needs fix' },
  fail: { Icon: XCircle, color: 'text-[#B91C1C]', label: 'Fail' },
  info: { Icon: Info, color: 'text-[#2563EB]', label: 'Note' },
};

const DOC_RESULT_STYLE = {
  'Pass': 'bg-emerald-50 text-[#15803D] border-emerald-200',
  'Needs fix': 'bg-amber-50 text-[#B45309] border-amber-200',
  'Fail': 'bg-red-50 text-[#B91C1C] border-red-200',
  'Not applicable': 'bg-slate-50 text-slate-600 border-slate-200',
};

const BANNER = {
  Approved: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-[#15803D]', Icon: CheckCircle2, title: 'Approved by AI verification' },
  Pending: { bg: 'bg-amber-50 border-amber-200', text: 'text-[#B45309]', Icon: AlertTriangle, title: 'Pending — action needed' },
  Rejected: { bg: 'bg-red-50 border-red-200', text: 'text-[#B91C1C]', Icon: XCircle, title: 'Rejected — conflicts found' },
};

const FIELD_LABELS = {
  document_type_detected: 'Document type seen',
  is_legible: 'Readable',
  pan_number: 'PAN',
  name: 'Name',
  date: 'Date',
  gstin: 'GSTIN',
  legal_name: 'Legal name',
  trade_name: 'Trade name',
  constitution: 'Constitution',
  address: 'Address',
  state: 'State',
  account_number: 'Account no.',
  ifsc: 'IFSC',
  bank_name: 'Bank',
  account_holder_name: 'Account holder',
  is_cancelled: 'Marked cancelled',
};

function formatValue(v) {
  if (v === true) return 'Yes';
  if (v === false) return 'No';
  return String(v);
}

function DocumentCard({ doc }) {
  const [open, setOpen] = useState(doc.result !== 'Pass');
  const extracted = doc.extracted && typeof doc.extracted === 'object' ? doc.extracted : null;

  return (
    <div className="border border-slate-200 rounded-[12px] bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 text-left"
      >
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-[#2563EB]" />
          <div>
            <p className="font-semibold text-sm text-[#173B63]">{doc.document}</p>
            <p className="text-xs text-slate-500 mt-0.5">{doc.remarks}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-3">
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${DOC_RESULT_STYLE[doc.result] || DOC_RESULT_STYLE['Not applicable']}`}>
            {doc.result}
          </span>
          {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-slate-100 p-4 space-y-4 bg-slate-50/50">
          {extracted && Object.keys(extracted).length > 0 && (
            <div>
              <p className="text-[11px] font-bold uppercase text-slate-500 mb-2">What the AI read on the document</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                {Object.entries(extracted).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3 border-b border-slate-100 pb-1">
                    <span className="text-slate-500">{FIELD_LABELS[k] || k}</span>
                    <span className="font-mono text-[#1E293B] text-right break-all">{formatValue(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {Array.isArray(doc.checks) && doc.checks.length > 0 && (
            <div>
              <p className="text-[11px] font-bold uppercase text-slate-500 mb-2">Checks performed</p>
              <ul className="space-y-2">
                {doc.checks.map((c, i) => {
                  const st = CHECK_STYLE[c.status] || CHECK_STYLE.info;
                  return (
                    <li key={i} className="flex gap-2.5 text-xs">
                      <st.Icon className={`w-4 h-4 mt-0.5 shrink-0 ${st.color}`} />
                      <div>
                        <p className="font-semibold text-[#1E293B]">
                          {c.label} <span className={`font-medium ${st.color}`}>· {st.label}</span>
                        </p>
                        <p className="text-slate-600">{c.detail}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function VerificationReport({ report, status, showVendorMessage = false }) {
  const [copied, setCopied] = useState(false);

  if (!report) {
    return (
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-[10px] text-xs text-slate-600">
        This application was submitted before the new AI verification engine. Use "Fix &amp; Resubmit" (vendor) to run the new checks.
      </div>
    );
  }

  // Banner follows the final status (admin may have overridden the AI)
  const finalStatus = normalizeStatus(status || report.decision);
  const banner = BANNER[finalStatus];
  const overridden = status && normalizeStatus(status) !== report.decision;
  const counts = report.counts || {};

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(report.vendor_message || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Decision banner */}
      <div className={`border rounded-[12px] p-5 ${banner.bg}`}>
        <div className="flex items-start gap-3">
          <banner.Icon className={`w-6 h-6 shrink-0 ${banner.text}`} />
          <div className="space-y-1.5">
            <p className={`font-bold text-base ${banner.text}`}>{banner.title}</p>
            {overridden && (
              <p className="text-xs font-semibold text-slate-700">
                Final admin decision: {finalStatus} (AI recommended {report.decision})
              </p>
            )}
            <p className="text-sm text-slate-700 leading-relaxed">{report.summary}</p>
            <div className="flex flex-wrap gap-3 pt-1 text-xs font-semibold">
              <span className="text-[#15803D]">✓ {counts.pass || 0} passed</span>
              <span className="text-[#B45309]">! {counts.warn || 0} need fixing</span>
              <span className="text-[#B91C1C]">✕ {counts.fail || 0} failed</span>
              <span className="text-[#2563EB]">i {counts.info || 0} notes</span>
            </div>
          </div>
        </div>
      </div>

      {/* What the vendor must do */}
      {Array.isArray(report.vendor_actions) && report.vendor_actions.length > 0 && (
        <div className="border border-amber-200 bg-white rounded-[12px] p-5">
          <p className="font-bold text-sm text-[#173B63] mb-3">What needs to be fixed</p>
          <ol className="space-y-2 text-sm text-slate-700 list-decimal pl-5">
            {report.vendor_actions.map((a, i) => <li key={i}>{a}</li>)}
          </ol>
        </div>
      )}

      {/* Per document */}
      <div className="space-y-3">
        <p className="font-bold text-sm text-[#173B63]">Document-by-document results</p>
        {(report.documents || []).map((doc, i) => <DocumentCard key={i} doc={doc} />)}
      </div>

      {/* Ready-to-send message */}
      {showVendorMessage && report.vendor_message && (
        <div className="border border-slate-200 rounded-[12px] p-5 bg-white">
          <div className="flex items-center justify-between mb-3">
            <p className="font-bold text-sm text-[#173B63]">Message to vendor (email-ready)</p>
            <button
              type="button"
              onClick={copyMessage}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#2563EB] hover:underline"
            >
              <Copy className="w-3.5 h-3.5" /> {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <pre className="whitespace-pre-wrap text-xs text-slate-700 bg-slate-50 p-4 rounded-[10px] border border-slate-100 font-sans">
            {report.vendor_message}
          </pre>
        </div>
      )}

      {report.evaluated_at && (
        <p className="text-[11px] text-slate-400">
          Verified {new Date(report.evaluated_at).toLocaleString()} · {report.engine}
        </p>
      )}
    </div>
  );
}
