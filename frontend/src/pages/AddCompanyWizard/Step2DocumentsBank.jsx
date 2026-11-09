// File path: frontend/src/pages/AddCompanyWizard/Step2DocumentsBank.jsx

import React from 'react';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Upload, FileText, CheckCircle2 } from 'lucide-react';

export function Step2DocumentsBank({ data, updateData, onNext, onBack }) {
  const handleFileChange = (field, file) => {
    if (!file) return;
    const okType = /\.(png|jpe?g|webp)$/i.test(file.name);
    if (!okType) {
      alert('Please upload an image (JPG or PNG). Take a clear photo or screenshot of the document.');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      alert('This image is larger than 4 MB. Please upload a smaller image.');
      return;
    }
    updateData({ [field]: file });
  };

  const handleNext = () => {
    // Validate required fields before proceeding to review
    if (!data.panNumber || !data.bankHolderName || !data.bankName || !data.accNumber || !data.ifscCode) {
      alert("Please fill in all required text fields before proceeding.");
      return;
    }
    onNext();
  };

  return (
    <Card title="Step 2: Document Submission & Bank Account">
      <div className="space-y-6">
        
        {/* PAN Information */}
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-[#173B63]">PAN Card Details</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input 
              label="PAN Number" 
              required 
              maxLength={10} 
              value={data.panNumber} 
              onChange={(e) => updateData({ panNumber: e.target.value.toUpperCase() })} 
              placeholder="ABCDE1234F" 
            />
            <div>
              <label className="block text-xs font-semibold text-[#1E293B] mb-1">
                Upload PAN Card (JPG / PNG, max 4 MB) <span className="text-[#DC2626]">*</span>
              </label>
              <div className="border border-dashed border-slate-300 rounded-[10px] p-3 text-center bg-slate-50 relative hover:bg-slate-100 transition-colors">
                <input 
                  type="file" 
                  accept=".jpg,.jpeg,.png,.webp"
                  onChange={(e) => handleFileChange('panFile', e.target.files[0])}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                />
                <div className="flex items-center justify-center gap-2 text-xs text-[#64748B]">
                  <Upload className="w-4 h-4 text-[#2563EB]" />
                  <span>{data.panFile ? data.panFile.name : "Choose file or drag & drop"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <hr className="border-slate-100" />

        {/* GST Details */}
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-[#173B63]">GST Registration</h4>
          <label className="block text-xs font-semibold text-[#1E293B]">Is your business registered under GST? <span className="text-[#DC2626]">*</span></label>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm text-[#1E293B] cursor-pointer">
              <input 
                type="radio" 
                name="gstRegistered" 
                value="Yes" 
                checked={data.gstRegistered === 'Yes'} 
                onChange={() => updateData({ gstRegistered: 'Yes' })} 
                className="text-[#2563EB]"
              /> Yes
            </label>
            <label className="flex items-center gap-2 text-sm text-[#1E293B] cursor-pointer">
              <input 
                type="radio" 
                name="gstRegistered" 
                value="No" 
                checked={data.gstRegistered === 'No'} 
                onChange={() => updateData({ gstRegistered: 'No' })} 
                className="text-[#2563EB]"
              /> No
            </label>
          </div>

          {data.gstRegistered === 'Yes' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <Input 
                label="GSTIN" 
                required 
                maxLength={15} 
                value={data.gstin} 
                onChange={(e) => updateData({ gstin: e.target.value.toUpperCase() })} 
                placeholder="27ABCDE1234F1Z5" 
              />
              <div>
                <label className="block text-xs font-semibold text-[#1E293B] mb-1">
                  Upload GST Certificate <span className="text-[#DC2626]">*</span>
                </label>
                <div className="border border-dashed border-slate-300 rounded-[10px] p-3 text-center bg-slate-50 relative hover:bg-slate-100 transition-colors">
                  <input 
                    type="file" 
                    accept=".jpg,.jpeg,.png,.webp"
                    onChange={(e) => handleFileChange('gstFile', e.target.files[0])}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                  />
                  <div className="flex items-center justify-center gap-2 text-xs text-[#64748B]">
                    <Upload className="w-4 h-4 text-[#2563EB]" />
                    <span>{data.gstFile ? data.gstFile.name : "Choose GST certificate"}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-amber-50 border border-amber-200 text-[#D97706] rounded-[10px] text-xs">
              <strong>GST Non-Registration Declaration:</strong> By selecting "No", you confirm that your annual turnover falls below the mandatory threshold or your legal entity is exempt under applicable GST rules.
            </div>
          )}
        </div>

        <hr className="border-slate-100" />

        {/* Bank Account Details */}
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-[#173B63]">Bank Details for Payments</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input 
              label="Account Holder Name" 
              required 
              value={data.bankHolderName} 
              onChange={(e) => updateData({ bankHolderName: e.target.value })} 
              placeholder="Legal Name on Account" 
            />
            <Input 
              label="Bank Name" 
              required 
              value={data.bankName} 
              onChange={(e) => updateData({ bankName: e.target.value })} 
              placeholder="e.g. HDFC Bank" 
            />
            <Input 
              label="Account Number" 
              required 
              value={data.accNumber} 
              onChange={(e) => updateData({ accNumber: e.target.value })} 
              placeholder="50100012345678" 
            />
            <Input 
              label="IFSC Code" 
              required 
              value={data.ifscCode} 
              onChange={(e) => updateData({ ifscCode: e.target.value.toUpperCase() })} 
              placeholder="HDFC0001234" 
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1E293B] mb-1">
              Upload Cancelled Cheque / Bank Proof <span className="text-[#DC2626]">*</span>
            </label>
            <div className="border border-dashed border-slate-300 rounded-[10px] p-3 text-center bg-slate-50 relative hover:bg-slate-100 transition-colors">
              <input 
                type="file" 
                accept=".jpg,.jpeg,.png,.webp"
                onChange={(e) => handleFileChange('bankFile', e.target.files[0])}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
              />
              <div className="flex items-center justify-center gap-2 text-xs text-[#64748B]">
                <Upload className="w-4 h-4 text-[#2563EB]" />
                <span>{data.bankFile ? data.bankFile.name : "Choose bank proof document"}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={onBack}>Back</Button>
          <Button variant="primary" onClick={handleNext}>Review & Submit</Button>
        </div>
      </div>
    </Card>
  );
}