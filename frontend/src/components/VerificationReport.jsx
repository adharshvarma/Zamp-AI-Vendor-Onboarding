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
  info: { Icon: Info, color: 'text-[#0F766E]', label: 'Note' },
};

const DOC_RESULT_STYLE = {
  'Pass': 'bg-emerald-50 text-[#15803D] border-emerald-200',
  'Needs fix': 'bg-amber-50 text-[#B45309] border-amber-200',
  'Fail': 'bg-red-50 text-[#B91C1C] border-red-200',
  'Not applicable': 'bg-slate-50 text-slate-600 border-slate-200',
};

const BANNER = {
  Approved: { bg: 'bg-[#F0FAF4] border-[#BFE5CD]', text: 'text-[#15803D]', ring: 'border-[#15803D]', Icon: CheckCircle2, title: 'Approved', line: 'All documents match and belong to the same company.' },
  Pending: { bg: 'bg-[#FFF8EB] border-[#F3D9A6]', text: 'text-[#B45309]', ring: 'border-[#B45309]', Icon: AlertTriangle, title: 'Pending', line: 'Some details need to be fixed by the vendor.' },
  Rejected: { bg: 'bg-[#FEF2F2] border-[#F5C2C2]', text: 'text-[#B91C1C]', ring: 'border-[#B91C1C]', Icon: XCircle, title: 'Rejected', line: 'The documents belong to different parties.' },
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

const ID_FIELDS = new Set(['pan_number', 'gstin', 'account_number', 'ifsc']);

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
          <FileText className="w-5 h-5 text-[#0F766E]" />
          <div>
            <p className="font-semibold text-sm text-[#0E2A47]">{doc.document}</p>
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
              <p className="text-xs font-semibold text-slate-500 mb-2">What the AI read on the document</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                {Object.entries(extracted).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3 border-b border-slate-100 pb-1">
                    <span className="text-slate-500">{FIELD_LABELS[k] || k}</span>
                    <span className={`text-[#1E293B] text-right break-words ${ID_FIELDS.has(k) ? 'font-mono' : 'font-medium'}`}>{formatValue(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {Array.isArray(doc.checks) && doc.checks.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-2">Checks performed</p>
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

const VENDOR_DOC_STYLE = {
  'Verified': 'bg-emerald-50 text-[#15803D] border-emerald-200',
  'Action needed': 'bg-amber-50 text-[#B45309] border-amber-200',
  'Not accepted': 'bg-red-50 text-[#B91C1C] border-red-200',
  'Not required': 'bg-slate-50 text-slate-600 border-slate-200',
};

const VENDOR_FALLBACK_TITLE = {
  Approved: 'Verification complete',
  Pending: 'Action required',
  Rejected: 'Application not approved',
};

function Stamp({ banner, date }) {
  return (
    <div
      className={`vg-stamp shrink-0 self-start border-[3px] ${banner.ring} ${banner.text} rounded-[10px] px-4 py-2 text-center bg-white/60`}
      aria-label={`Status: ${banner.title}`}
    >
      <p className="text-xl font-bold tracking-[0.12em] leading-none">{banner.title.toUpperCase()}</p>
      <p className="text-[10px] font-medium mt-1 opacity-80">{date ? new Date(date).toLocaleDateString() : ''} · VendorGate</p>
    </div>
  );
}

// What the VENDOR sees: status, a professional summary, what to do, and a simple status per document.
function VendorView({ report, finalStatus, overridden }) {
  const banner = BANNER[finalStatus];
  const title = overridden ? VENDOR_FALLBACK_TITLE[finalStatus] : (report.vendor_title || VENDOR_FALLBACK_TITLE[finalStatus]);
  let summary = report.vendor_summary || '';
  if (overridden || !summary) {
    summary = finalStatus === 'Approved'
      ? 'Your application has been approved. No action is needed.'
      : finalStatus === 'Rejected'
        ? 'We are unable to approve this application.'
        : 'Your application needs attention before it can be approved.';
  }
  const items = Array.isArray(report.vendor_items)
    ? report.vendor_items
    : (report.vendor_actions || []).map((a) => ({ title: '', message: a }));
  const showItems = finalStatus !== 'Approved' && items.length > 0 && title !== 'Under review';

  return (
    <div className="space-y-5">
      <div className={`border rounded-[14px] p-5 sm:p-6 ${banner.bg}`}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <Stamp banner={banner} date={report.evaluated_at} />
          <div className="space-y-1.5">
            <p className={`font-semibold text-[15px] ${banner.text}`}>{title}</p>
            <p className="text-sm text-slate-700 leading-relaxed">{summary}</p>
          </div>
        </div>
      </div>

      {showItems && (
        <div className={`bg-white rounded-[12px] p-5 border ${finalStatus === 'Rejected' ? 'border-red-200' : 'border-amber-200'}`}>
          <p className="font-semibold text-sm text-[#0E2A47] mb-3">
            {finalStatus === 'Rejected' ? 'Reason' : 'What we need from you'}
          </p>
          <ol className="space-y-2.5 text-sm text-slate-700 list-decimal pl-5">
            {items.map((it, i) => (
              <li key={i}>
                {it.title && <span className="font-semibold text-[#0E2A47]">{it.title}: </span>}
                {it.message}
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="space-y-2">
        <p className="font-semibold text-sm text-[#0E2A47]">Documents</p>
        {(report.documents || []).map((doc, i) => {
          const label = doc.vendor_result || (doc.result === 'Pass' ? 'Verified' : doc.result === 'Fail' ? 'Not accepted' : doc.result === 'Not applicable' ? 'Not required' : 'Action needed');
          return (
            <div key={i} className="flex items-center justify-between gap-3 border border-slate-200 rounded-[12px] bg-white p-4">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-[#0F766E] shrink-0" />
                <div>
                  <p className="font-semibold text-sm text-[#0E2A47]">{doc.document}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{doc.vendor_remark || (label === 'Verified' ? 'Verified.' : '')}</p>
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border shrink-0 ${VENDOR_DOC_STYLE[label] || VENDOR_DOC_STYLE['Not required']}`}>
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function VerificationReport({ report, status, showVendorMessage = false, audience }) {
  const [copied, setCopied] = useState(false);
  const isAdmin = (audience || (showVendorMessage ? 'admin' : 'vendor')) === 'admin';

  if (!report) {
    return (
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-[10px] text-xs text-slate-600">
        {isAdmin
          ? 'This application was submitted before the current verification engine. The vendor can use "Fix & resubmit" to run the latest checks.'
          : 'Your application is being reviewed. Use "Fix & resubmit" below to update it if needed.'}
      </div>
    );
  }

  // Banner follows the final status (admin may have overridden the AI)
  const finalStatus = normalizeStatus(status || report.decision);
  const overridden = Boolean(status) && normalizeStatus(status) !== report.decision;

  if (!isAdmin) {
    return <VendorView report={report} finalStatus={finalStatus} overridden={overridden} />;
  }

  const banner = BANNER[finalStatus];

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(report.vendor_message || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const adminItems = Array.isArray(report.vendor_items)
    ? report.vendor_items.map((it) => `${it.title}: ${it.message}`)
    : (report.vendor_actions || []);

  return (
    <div className="space-y-5">
      {/* Decision stamp + internal summary */}
      <div className={`border rounded-[14px] p-5 sm:p-6 ${banner.bg}`}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <Stamp banner={banner} date={report.evaluated_at} />
          <div className="space-y-1.5">
            <p className={`font-semibold text-[15px] ${banner.text}`}>AI recommendation: {report.decision}</p>
            {overridden && (
              <p className="text-xs font-semibold text-slate-700">Final decision by admin: {finalStatus}.</p>
            )}
            <p className="text-sm text-slate-700 leading-relaxed">{report.summary}</p>
            {report.risk && (
              <p className="text-xs font-semibold text-[#B91C1C]">Risk flag: {report.risk}</p>
            )}
          </div>
        </div>
      </div>

      {/* What the vendor has been asked to do */}
      {adminItems.length > 0 && (
        <div className="border border-amber-200 bg-white rounded-[12px] p-5">
          <p className="font-semibold text-sm text-[#0E2A47] mb-3">Communicated to the vendor</p>
          <ol className="space-y-2 text-sm text-slate-700 list-decimal pl-5">
            {adminItems.map((a, i) => <li key={i}>{a}</li>)}
          </ol>
        </div>
      )}

      {/* Per document, full detail */}
      <div className="space-y-3">
        <p className="font-semibold text-sm text-[#0E2A47]">Document by document (internal detail)</p>
        {(report.documents || []).map((doc, i) => <DocumentCard key={i} doc={doc} />)}
      </div>

      {/* Ready-to-send message */}
      {report.vendor_message && (
        <div className="border border-slate-200 rounded-[12px] p-5 bg-white">
          <div className="flex items-center justify-between mb-3">
            <p className="font-bold text-sm text-[#0E2A47]">Message to vendor (email-ready)</p>
            <button
              type="button"
              onClick={copyMessage}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#0F766E] hover:underline"
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
          Checked {new Date(report.evaluated_at).toLocaleString()} by {report.engine}
        </p>
      )}
    </div>
  );
}
