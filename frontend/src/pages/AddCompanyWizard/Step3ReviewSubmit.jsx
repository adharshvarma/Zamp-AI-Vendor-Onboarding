// File path: frontend/src/pages/AddCompanyWizard/Step3ReviewSubmit.jsx

import React from 'react';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { CheckCircle2, FileText } from 'lucide-react';

export function Step3ReviewSubmit({ data, updateData, onSubmit, onBack, submitting = false }) {
  const handleSubmitClick = () => {
    if (!data.panFile || !data.bankFile) {
      alert("Please ensure both PAN Document and Bank Proof are uploaded before submitting.");
      return;
    }
    if (data.gstRegistered === 'Yes' && !data.gstFile) {
      alert("Please upload your GST Certificate since GST registration is set to Yes.");
      return;
    }
    onSubmit();
  };

  return (
    <Card title="Step 3: Review Application Summary">
      <div className="space-y-6">
        
        <div className="bg-slate-50 p-4 rounded-[10px] border border-slate-200 text-xs space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <p><strong>Legal Entity Name:</strong> {data.companyName || 'N/A'}</p>
            <p><strong>Contact Person:</strong> {data.contactName || 'N/A'}</p>
            <p><strong>Designation:</strong> {data.designation || 'N/A'}</p>
            <p><strong>Entity Structure:</strong> {data.entityType === 'Other' ? `Other (${data.customEntity || 'Unspecified'})` : data.entityType || 'N/A'}</p>
            <p><strong>PAN Number:</strong> {data.panNumber || 'N/A'}</p>
            <p><strong>GST Registration:</strong> {data.gstRegistered === 'Yes' ? (data.gstin || 'GSTIN Provided') : 'Non-GST Registered'}</p>
            <p><strong>Bank Name:</strong> {data.bankName || 'N/A'}</p>
            <p><strong>Account Holder:</strong> {data.bankHolderName || 'N/A'}</p>
            <p><strong>Account Number:</strong> {data.accNumber || 'N/A'}</p>
            <p><strong>IFSC Code:</strong> {data.ifscCode || 'N/A'}</p>
          </div>
          
          <hr className="border-slate-200 my-2" />
          
          <p>
            <strong>Registered Address:</strong> {data.addressBuilding}, {data.addressStreet}, {data.postOffice}, {data.district}, {data.state} {data.pincode}
          </p>

          <hr className="border-slate-200 my-2" />
          
          {/* Uploaded Files Review Section */}
          <div className="space-y-1.5">
            <p className="font-semibold text-slate-700">Uploaded Compliance Files:</p>
            <div className="flex flex-col gap-1 text-[11px] text-slate-600">
              <span className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <strong>PAN Document:</strong> {data.panFile ? data.panFile.name : 'No file selected'}
              </span>
              {data.gstRegistered === 'Yes' && (
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  <strong>GST Certificate:</strong> {data.gstFile ? data.gstFile.name : 'No file selected'}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <strong>Bank Proof / Cancelled Cheque:</strong> {data.bankFile ? data.bankFile.name : 'No file selected'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-100 rounded-[10px]">
          <input 
            type="checkbox" 
            id="declaration" 
            checked={!!data.declarationAccepted} 
            onChange={(e) => updateData({ declarationAccepted: e.target.checked })} 
            className="mt-0.5 cursor-pointer" 
          />
          <label htmlFor="declaration" className="text-xs text-[#1E293B] cursor-pointer">
            I hereby confirm that all statutory details, PAN records, GST options, bank info, and attached compliance documents provided above are true, accurate, and match legal entity records.
          </label>
        </div>

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={onBack} disabled={submitting}>Back</Button>
          <Button 
            variant="success" 
            disabled={!data.declarationAccepted || submitting} 
            onClick={handleSubmitClick}
          >
            <CheckCircle2 className="w-4 h-4" /> {submitting ? 'AI is reading your documents (about 20 sec)...' : 'Submit Application'}
          </Button>
        </div>
      </div>
    </Card>
  );
}