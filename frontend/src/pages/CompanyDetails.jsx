// File path: frontend/src/pages/CompanyDetails.jsx

import React, { useEffect, useState } from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { StatusBadge, normalizeStatus } from '../components/StatusBadge';
import { VerificationReport } from '../components/VerificationReport';
import { ArrowLeft, FileText, RefreshCw, Upload } from 'lucide-react';
import API from '../services/api';

function Row({ label, value, mono = false }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 pb-2 last:border-0">
      <span className="text-slate-500 font-medium">{label}</span>
      <span className={`font-semibold text-[#173B63] text-right ${mono ? 'font-mono' : ''}`}>{value || 'N/A'}</span>
    </div>
  );
}

function FilePick({ label, file, onPick }) {
  const handle = (f) => {
    if (!f) return;
    if (!/\.(png|jpe?g|webp)$/i.test(f.name)) { alert('Please upload a JPG or PNG image.'); return; }
    if (f.size > 4 * 1024 * 1024) { alert('Image must be under 4 MB.'); return; }
    onPick(f);
  };
  return (
    <div>
      <label className="block text-xs font-semibold text-[#1E293B] mb-1">{label}</label>
      <div className="border border-dashed border-slate-300 rounded-[10px] p-3 text-center bg-slate-50 relative hover:bg-slate-100">
        <input
          type="file"
          accept=".jpg,.jpeg,.png,.webp"
          onChange={(e) => handle(e.target.files[0])}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div className="flex items-center justify-center gap-2 text-xs text-[#64748B]">
          <Upload className="w-4 h-4 text-[#2563EB]" />
          <span>{file ? file.name : 'Keep current file (click to replace)'}</span>
        </div>
      </div>
    </div>
  );
}

function FixAndResubmit({ comp, onDone }) {
  const [form, setForm] = useState({
    company_name: comp.company_name || '',
    pan_number: comp.pan_number || '',
    gstin: comp.gstin || '',
    bank_holder_name: comp.bank_holder_name || '',
    acc_number: comp.acc_number || '',
    ifsc_code: comp.ifsc_code || '',
  });
  const [files, setFiles] = useState({ pan_file: null, gst_file: null, bank_file: null });
  const [saving, setSaving] = useState(false);
  const gstYes = String(comp.gst_registered || '').toLowerCase() === 'yes';

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('vendor_id', comp.vendor_id);
      Object.entries(form).forEach(([k, v]) => { if (v && String(v).trim()) fd.append(k, String(v).trim()); });
      Object.entries(files).forEach(([k, f]) => { if (f) fd.append(k, f); });
      await API.put('/api/vendor/update', fd);
      onDone();
    } catch (err) {
      const d = err.response?.data?.detail;
      alert(typeof d === 'string' ? d : 'Resubmission failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title="Fix & Resubmit">
      <div className="space-y-4">
        <p className="text-xs text-slate-600">
          Correct any details below and/or re-upload the documents mentioned above. The AI will re-check everything immediately.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Legal Company Name" value={form.company_name} onChange={(e) => set('company_name', e.target.value)} />
          <Input label="PAN Number" maxLength={10} value={form.pan_number} onChange={(e) => set('pan_number', e.target.value.toUpperCase())} />
          {gstYes && (
            <Input label="GSTIN" maxLength={15} value={form.gstin} onChange={(e) => set('gstin', e.target.value.toUpperCase())} />
          )}
          <Input label="Account Holder Name" value={form.bank_holder_name} onChange={(e) => set('bank_holder_name', e.target.value)} />
          <Input label="Account Number" value={form.acc_number} onChange={(e) => set('acc_number', e.target.value)} />
          <Input label="IFSC Code" value={form.ifsc_code} onChange={(e) => set('ifsc_code', e.target.value.toUpperCase())} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FilePick label="PAN Card" file={files.pan_file} onPick={(f) => setFiles((p) => ({ ...p, pan_file: f }))} />
          {gstYes && (
            <FilePick label="GST Certificate" file={files.gst_file} onPick={(f) => setFiles((p) => ({ ...p, gst_file: f }))} />
          )}
          <FilePick label="Cancelled Cheque / Bank Letter" file={files.bank_file} onPick={(f) => setFiles((p) => ({ ...p, bank_file: f }))} />
        </div>
        <div className="flex justify-end">
          <Button variant="secondary" onClick={submit} disabled={saving}>
            <RefreshCw className={`w-4 h-4 ${saving ? 'animate-spin' : ''}`} />
            {saving ? 'Re-verifying with AI...' : 'Resubmit for Verification'}
          </Button>
        </div>
      </div>
    </Card>
  );
}

export function CompanyDetailsPage({ company, onBack }) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDetails = async () => {
    const vendorId = company?.vendor_id;
    if (!vendorId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await API.get(`/api/vendor/companies/${vendorId}`);
      setDetails(response.data);
    } catch (err) {
      console.error('Failed to fetch full company details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company]);

  if (loading) {
    return <div className="max-w-4xl mx-auto p-8 text-center text-xs text-slate-500">Loading company details...</div>;
  }

  const comp = details || company || {};
  const status = normalizeStatus(comp.status);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Button>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 font-mono">App ID: {comp.application_id}</span>
          <StatusBadge status={comp.status} size="lg" />
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-[#173B63]">{comp.company_name}</h1>
        <p className="text-xs text-slate-500">
          Vendor ID {comp.vendor_id} · {comp.entity_type} · Submitted {comp.submitted_at ? new Date(comp.submitted_at).toLocaleDateString() : 'N/A'}
        </p>
      </div>

      {/* Verification result first: this is what the vendor cares about */}
      <Card title="Verification Result">
        <VerificationReport report={comp.ai_report} status={comp.status} />
      </Card>

      {status !== 'Approved' && <FixAndResubmit comp={comp} onDone={fetchDetails} />}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Card title="Company & Contact">
          <div className="space-y-2 text-xs">
            <Row label="Contact Person" value={comp.contact_name} />
            <Row label="Designation" value={comp.designation} />
            <Row label="Entity Type" value={comp.entity_type} />
            <Row label="PAN" value={comp.pan_number} mono />
            <Row label="GST Registered" value={comp.gst_registered} />
            <Row label="GSTIN" value={comp.gstin} mono />
          </div>
        </Card>
        <Card title="Bank Account">
          <div className="space-y-2 text-xs">
            <Row label="Account Holder" value={comp.bank_holder_name} />
            <Row label="Bank" value={comp.bank_name} />
            <Row label="Account Number" value={comp.acc_number} mono />
            <Row label="IFSC" value={comp.ifsc_code} mono />
          </div>
        </Card>
      </div>

      <Card title="Registered Address">
        <p className="text-xs text-slate-700">
          {[comp.address_building, comp.address_street, comp.post_office, comp.district, comp.state].filter(Boolean).join(', ')}
          {comp.pincode ? ` - ${comp.pincode}` : ''}
        </p>
      </Card>

      {Array.isArray(comp.activity) && comp.activity.length > 0 && (
        <Card title="Activity Timeline">
          <ol className="space-y-3 text-xs">
            {comp.activity.map((a, i) => (
              <li key={i} className="flex gap-3">
                <span className="w-2 h-2 mt-1.5 rounded-full bg-[#2563EB] shrink-0" />
                <div>
                  <p className="font-semibold text-[#1E293B]">{a.action}</p>
                  {a.remark && <p className="text-slate-600">{a.remark}</p>}
                  <p className="text-slate-400">{a.at ? new Date(a.at).toLocaleString() : ''}</p>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      )}

      <Card title="Uploaded Documents">
        <div className="space-y-2 text-xs">
          {comp.documents && comp.documents.length > 0 ? (
            comp.documents.map((doc, idx) => (
              <div key={idx} className="p-3 bg-slate-50 rounded-[10px] border border-slate-200 flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#2563EB]" />
                <span className="font-semibold text-[#173B63]">{doc.doc_type}</span>
              </div>
            ))
          ) : (
            <p className="text-slate-500 text-center py-4">No documents uploaded.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
