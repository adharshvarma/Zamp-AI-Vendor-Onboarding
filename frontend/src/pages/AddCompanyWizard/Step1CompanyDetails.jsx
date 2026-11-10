// File path: frontend/src/pages/AddCompanyWizard/Step1CompanyDetails.jsx

import React, { useState } from 'react';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { MapPin, UserCheck } from 'lucide-react';
import { lookupPincode } from '../../services/pincodeService';

export function Step1CompanyDetails({ data, updateData, onNext, onCancel }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [postOffices, setPostOffices] = useState([]);

  const handlePincodeBlur = async () => {
    if (data.pincode && data.pincode.length === 6) {
      setLoading(true);
      setError('');
      try {
        const res = await lookupPincode(data.pincode);
        updateData({
          state: res.state,
          district: res.district,
          postOffice: res.postOffices[0] || ''
        });
        setPostOffices(res.postOffices);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleNext = () => {
    const missing = [];
    if (!data.companyName?.trim()) missing.push('Legal Company Name');
    if (data.entityType === 'Other' && !data.customEntity?.trim()) missing.push('Custom Entity Type');
    if (!data.contactName?.trim()) missing.push('Contact Person Name');
    if (!data.designation) missing.push('Designation');
    if (!data.pincode || data.pincode.length !== 6) missing.push('6-digit PIN Code');
    if (!data.state) missing.push('State (enter a valid PIN code to auto-fill)');
    if (missing.length > 0) {
      alert('Please fill: ' + missing.join(', '));
      return;
    }
    onNext();
  };

  return (
    <Card title="Step 1: Company, Contact Person & Address">
      <div className="space-y-4">
        <Input 
          label="Legal Company Name" 
          required 
          value={data.companyName} 
          onChange={(e) => updateData({ companyName: e.target.value })} 
          placeholder="e.g. Acme Innovations Pvt Ltd" 
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#1E293B] mb-1">
              Business / Entity Type <span className="text-[#DC2626]">*</span>
            </label>
            <select 
              value={data.entityType} 
              onChange={(e) => updateData({ entityType: e.target.value })} 
              className="w-full border border-slate-300 rounded-[10px] p-2.5 text-sm bg-white text-[#1E293B] focus:outline-none focus:border-[#0F766E]"
            >
              <option>Sole Proprietorship</option>
              <option>Partnership</option>
              <option>LLP</option>
              <option>Private Limited Company</option>
              <option>Public Limited Company</option>
              <option>Other</option>
            </select>
          </div>

          <Input 
            label="Country" 
            disabled 
            value="India (India-only onboarding)" 
          />
        </div>

        {/* Conditional Custom Entity Input when 'Other' is selected */}
        {data.entityType === 'Other' && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-[10px] space-y-2">
            <Input 
              label="Specify Custom Entity Type" 
              required 
              value={data.customEntity || ''} 
              onChange={(e) => updateData({ customEntity: e.target.value })} 
              placeholder="e.g. Trust, Society, Section 8 Company, HUF" 
            />
            <p className="text-[11px] text-[#64748B]">Please provide the official legal classification recognized under Indian law.</p>
          </div>
        )}

        <hr className="border-slate-100 my-2" />

        <div className="flex items-center gap-1.5 text-sm font-bold text-[#0E2A47]">
          <UserCheck className="w-4 h-4 text-[#0F766E]" /> Authorised Contact Person (filling this form)
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input 
            label="Full Name" 
            required 
            value={data.contactName || ''} 
            onChange={(e) => updateData({ contactName: e.target.value })} 
            placeholder="e.g. Priya Sharma" 
          />
          <div>
            <label className="block text-xs font-semibold text-[#1E293B] mb-1">
              Designation in the Company <span className="text-[#DC2626]">*</span>
            </label>
            <select 
              value={data.designation || ''} 
              onChange={(e) => updateData({ designation: e.target.value })} 
              className="w-full border border-slate-300 rounded-[10px] p-2.5 text-sm bg-white text-[#1E293B] focus:outline-none focus:border-[#0F766E]"
            >
              <option value="">Select designation</option>
              <option>Proprietor / Owner</option>
              <option>Partner</option>
              <option>Director</option>
              <option>CEO / Managing Director</option>
              <option>CFO / Finance Head</option>
              <option>Finance / Accounts Manager</option>
              <option>Company Secretary</option>
              <option>Authorised Signatory</option>
              <option>Other</option>
            </select>
          </div>
        </div>
        <p className="text-[11px] text-[#64748B] -mt-2">This person will receive all verification updates and is accountable for the information submitted.</p>

        <hr className="border-slate-100 my-2" />

        <div className="flex items-center gap-1.5 text-sm font-bold text-[#0E2A47]">
          <MapPin className="w-4 h-4 text-[#0F766E]" /> Pin Code & Postal Lookup
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Input 
              label="PIN Code" 
              required 
              maxLength={6}
              value={data.pincode} 
              onChange={(e) => updateData({ pincode: e.target.value })} 
              onBlur={handlePincodeBlur}
              placeholder="6-digit PIN" 
              error={error}
            />
            {loading && <p className="text-[11px] text-[#0F766E] mt-1">Fetching postal records...</p>}
          </div>
          <Input 
            label="State" 
            disabled 
            value={data.state} 
            placeholder="Auto-filled" 
          />
          <Input 
            label="District" 
            disabled 
            value={data.district} 
            placeholder="Auto-filled" 
          />
        </div>

        {postOffices.length > 0 && (
          <div>
            <label className="block text-xs font-semibold text-[#1E293B] mb-1">Select Post Office / Locality</label>
            <select 
              value={data.postOffice} 
              onChange={(e) => updateData({ postOffice: e.target.value })} 
              className="w-full border border-slate-300 rounded-[10px] p-2.5 text-sm bg-white text-[#1E293B]"
            >
              {postOffices.map((po, idx) => <option key={idx} value={po}>{po}</option>)}
            </select>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input 
            label="Building / House Number" 
            value={data.addressBuilding} 
            onChange={(e) => updateData({ addressBuilding: e.target.value })} 
            placeholder="e.g. Unit 402, Tower B" 
          />
          <Input 
            label="Street and Area" 
            value={data.addressStreet} 
            onChange={(e) => updateData({ addressStreet: e.target.value })} 
            placeholder="e.g. MG Road, Industrial Estate" 
          />
        </div>

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button variant="primary" onClick={handleNext}>Continue to Documents</Button>
        </div>
      </div>
    </Card>
  );
}