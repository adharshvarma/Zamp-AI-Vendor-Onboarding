// File path: frontend/src/pages/CompanyDetailsPage.jsx

import React, { useEffect, useState } from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { StatusBadge } from '../components/StatusBadge';
import { ArrowLeft, FileText, ShieldCheck } from 'lucide-react';
import API from '../services/api';

export function CompanyDetailsPage({ company, onBack }) {
  const [details, setDetails] = useState(company);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      const vendorId = company?.vendor_id;
      if (!vendorId) {
        setLoading(false);
        return;
      }
      try {
        const response = await API.get(`/api/vendor/companies/${vendorId}`);
        setDetails(response.data);
      } catch (err) {
        console.error("Failed to fetch full company details:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [company]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center text-xs text-slate-500">
        Loading company details...
      </div>
    );
  }

  const comp = details || company;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Dashboard
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-mono">App ID: {comp.application_id}</span>
          <StatusBadge status={comp.status} />
        </div>
      </div>

      {/* Header Overview Card */}
      <Card title={comp.company_name}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs bg-slate-50 p-4 rounded-[10px] border border-slate-200">
          <div>
            <span className="text-slate-400 uppercase font-semibold text-[10px]">Vendor ID</span>
            <p className="font-mono font-semibold text-[#173B63]">{comp.vendor_id}</p>
          </div>
          <div>
            <span className="text-slate-400 uppercase font-semibold text-[10px]">Entity Type</span>
            <p className="font-medium text-[#1E293B]">{comp.entity_type}</p>
          </div>
          <div>
            <span className="text-slate-400 uppercase font-semibold text-[10px]">Country</span>
            <p className="font-medium text-[#1E293B]">{comp.country || 'India'}</p>
          </div>
          <div>
            <span className="text-slate-400 uppercase font-semibold text-[10px]">Submission Date</span>
            <p className="font-medium text-[#1E293B]">
              {comp.submitted_at ? new Date(comp.submitted_at).toLocaleDateString() : 'N/A'}
            </p>
          </div>
        </div>
      </Card>

      {/* Statutory & Banking Details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Card title="Statutory Identifiers">
          <div className="space-y-3 text-xs">
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500 font-medium">PAN Number</span>
              <span className="font-mono font-semibold text-[#173B63]">{comp.pan_number || 'N/A'}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500 font-medium">GST Registered</span>
              <span className="font-semibold text-[#1E293B]">{comp.gst_registered || 'N/A'}</span>
            </div>
            <div className="flex justify-between pb-1">
              <span className="text-slate-500 font-medium">GSTIN</span>
              <span className="font-mono font-semibold text-[#173B63]">{comp.gstin || 'N/A'}</span>
            </div>
          </div>
        </Card>

        <Card title="Bank Account Details">
          <div className="space-y-3 text-xs">
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500 font-medium">Account Holder</span>
              <span className="font-semibold text-[#173B63]">{comp.bank_holder_name || 'N/A'}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500 font-medium">Bank Name</span>
              <span className="font-semibold text-[#1E293B]">{comp.bank_name || 'N/A'}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500 font-medium">Account Number</span>
              <span className="font-mono text-[#1E293B]">{comp.acc_number || 'N/A'}</span>
            </div>
            <div className="flex justify-between pb-1">
              <span className="text-slate-500 font-medium">IFSC Code</span>
              <span className="font-mono font-semibold text-[#173B63]">{comp.ifsc_code || 'N/A'}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Address Details */}
      <Card title="Registered Address">
        <p className="text-xs text-slate-700">
          {[comp.address_building, comp.address_street, comp.post_office, comp.district, comp.state]
            .filter(Boolean)
            .join(', ')} {comp.pincode ? `- ${comp.pincode}` : ''}
        </p>
      </Card>


      {/* Groq AI Compliance Summary Paragraph */}
      {comp.ai_summary && (
        <Card title="AI Compliance Summary">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-[10px] text-xs text-slate-700 leading-relaxed font-medium">
            {typeof comp.ai_summary === 'string' ? comp.ai_summary : comp.ai_summary.action_required}
          </div>
        </Card>
      )}

      {/* Uploaded Documents List */}
      <Card title="Uploaded Compliance Documents">
        <div className="space-y-2 text-xs">
          {comp.documents && comp.documents.length > 0 ? (
            comp.documents.map((doc, idx) => (
              <div key={idx} className="p-3 bg-slate-50 rounded-[10px] border border-slate-200 flex items-center justify-between">
                <span className="font-semibold text-[#173B63] flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#2563EB]" /> {doc.doc_type}
                </span>
                <span className="text-[11px] text-slate-500 font-mono truncate max-w-xs">{doc.file_url}</span>
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