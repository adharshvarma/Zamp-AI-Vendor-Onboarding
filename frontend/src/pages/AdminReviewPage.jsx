// File path: frontend/src/pages/AdminReviewPage.jsx

import React, { useEffect, useState } from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { StatusBadge, normalizeStatus } from '../components/StatusBadge';
import { VerificationReport } from '../components/VerificationReport';
import { ArrowLeft, CheckCircle2, Clock, XCircle } from 'lucide-react';
import API from '../services/api';

function Row({ label, value, mono = false }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 pb-2 last:border-0">
      <span className="text-slate-500 font-medium">{label}</span>
      <span className={`font-semibold text-[#0E2A47] text-right ${mono ? 'font-mono' : ''}`}>{value || 'N/A'}</span>
    </div>
  );
}

export function AdminReviewPage({ companyId, onBack }) {
  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [remark, setRemark] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const response = await API.get(`/api/admin/applications/${companyId}`);
      setApp(response.data);
    } catch (err) {
      console.error('Failed to load application:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const decide = async (newStatus) => {
    const aiDecision = app?.ai_report?.decision;
    if (aiDecision && newStatus !== aiDecision && !remark.trim()) {
      alert(`The AI recommended "${aiDecision}". Please write a remark explaining why you are choosing "${newStatus}".`);
      return;
    }
    setActionLoading(true);
    setMessage('');
    try {
      await API.post(`/api/admin/applications/${companyId}/review`, { status: newStatus, remark });
      setMessage(`Final decision saved: ${newStatus}`);
      setRemark('');
      await fetchDetail();
    } catch (err) {
      const d = err.response?.data?.detail;
      alert(typeof d === 'string' ? d : 'Failed to update application status.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-xs text-slate-500">Loading application...</div>;
  }
  if (!app) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <Button variant="outline" onClick={onBack}><ArrowLeft className="w-4 h-4" /> Back</Button>
        <p className="text-sm text-red-600">Could not load this application.</p>
      </div>
    );
  }

  const aiDecision = app.ai_report?.decision;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Button>
        <StatusBadge status={app.status} size="lg" />
      </div>

      <div>
        <h1 className="text-2xl font-bold text-[#0E2A47]">{app.company_name}</h1>
        <p className="text-xs text-slate-500">
          {app.application_id} · {app.vendor_id} · {app.entity_type} · Submitted {app.submitted_at ? new Date(app.submitted_at).toLocaleString() : 'N/A'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: AI report */}
        <div className="lg:col-span-2 space-y-6">
          <Card title="AI Verification Report">
            <VerificationReport report={app.ai_report} status={app.status} showVendorMessage />
          </Card>
        </div>

        {/* Right: decision + submitted data */}
        <div className="space-y-6">
          <Card title="Final Decision">
            <div className="space-y-3">
              {aiDecision && (
                <p className="text-xs text-slate-600">
                  AI recommendation: <strong>{aiDecision}</strong>. Agree with one click, or override with a remark.
                </p>
              )}
              <textarea
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                className="w-full border border-slate-300 rounded-[10px] p-3 text-xs focus:outline-none focus:border-[#0F766E]"
                rows={3}
                placeholder="Remark (required if you differ from the AI)..."
              />
              <div className="grid grid-cols-1 gap-2">
                <Button variant="success" onClick={() => decide('Approved')} disabled={actionLoading}>
                  <CheckCircle2 className="w-4 h-4" /> Approve
                </Button>
                <button
                  type="button"
                  onClick={() => decide('Pending')}
                  disabled={actionLoading}
                  className="py-2.5 px-4 rounded-[10px] font-medium text-sm bg-[#D97706] text-white hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Clock className="w-4 h-4" /> Keep Pending (ask vendor)
                </button>
                <Button variant="danger" onClick={() => decide('Rejected')} disabled={actionLoading}>
                  <XCircle className="w-4 h-4" /> Reject
                </Button>
              </div>
              {message && <p className="text-xs font-semibold text-[#15803D]">{message}</p>}
              <p className="text-[11px] text-slate-500">Current status: {normalizeStatus(app.status)}. Every decision is logged in the audit trail.</p>
            </div>
          </Card>

          <Card title="Submitted by">
            <div className="space-y-2 text-xs">
              <Row label="Name" value={app.contact_name} />
              <Row label="Designation" value={app.designation} />
              <Row label="Email" value={app.ai_report?.contact?.email} />
              <Row label="Mobile" value={app.ai_report?.contact?.mobile} />
            </div>
          </Card>

          <Card title="Form details">
            <div className="space-y-2 text-xs">
              <Row label="PAN" value={app.pan_number} mono />
              <Row label="GST Registered" value={app.gst_registered} />
              <Row label="GSTIN" value={app.gstin} mono />
              <Row label="Account Holder" value={app.bank_holder_name} />
              <Row label="Bank" value={app.bank_name} />
              <Row label="Account No." value={app.acc_number} mono />
              <Row label="IFSC" value={app.ifsc_code} mono />
              <Row label="State" value={app.state} />
              <Row label="PIN" value={app.pincode} />
            </div>
          </Card>

          {Array.isArray(app.activity) && app.activity.length > 0 && (
            <Card title="Audit Trail">
              <ol className="space-y-3 text-xs">
                {app.activity.map((a, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="w-2 h-2 mt-1.5 rounded-full bg-[#0F766E] shrink-0" />
                    <div>
                      <p className="font-semibold text-[#1E293B]">{a.action}</p>
                      {a.remark && <p className="text-slate-600">{a.remark}</p>}
                      <p className="text-slate-400">{a.by} · {a.at ? new Date(a.at).toLocaleString() : ''}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </Card>
          )}
        </div>
      </div>

      <div className="flex justify-center pt-2 pb-6">
        <Button variant="primary" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" /> Back to dashboard
        </Button>
      </div>
    </div>
  );
}
