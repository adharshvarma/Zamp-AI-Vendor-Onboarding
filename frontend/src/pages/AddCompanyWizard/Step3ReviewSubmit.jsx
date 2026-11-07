import React from 'react';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { CheckCircle2 } from 'lucide-react';

export function Step3ReviewSubmit({ data, updateData, onSubmit, onBack }) {
  return (
    <Card title="Step 3: Review Application Summary">
      <div className="space-y-6">
        
        <div className="bg-slate-50 p-4 rounded-[10px] border border-slate-200 text-xs space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <p><strong>Legal Entity Name:</strong> {data.companyName}</p>
            <p><strong>Entity Structure:</strong> {data.entityType === 'Other' ? `Other (${data.customEntity || 'Unspecified'})` : data.entityType}</p>
            <p><strong>PAN Number:</strong> {data.panNumber}</p>
            <p><strong>GST Registration:</strong> {data.gstRegistered === 'Yes' ? data.gstin : 'Non-GST Registered'}</p>
            <p><strong>Bank Name:</strong> {data.bankName}</p>
            <p><strong>Account Number:</strong> {data.accNumber}</p>
            <p><strong>IFSC Code:</strong> {data.ifscCode}</p>
          </div>
          <hr className="border-slate-200 my-2" />
          <p>
            <strong>Registered Address:</strong> {data.addressBuilding}, {data.addressStreet}, {data.postOffice}, {data.district}, {data.state} - {data.pincode}
          </p>
        </div>

        <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-100 rounded-[10px]">
          <input 
            type="checkbox" 
            id="declaration" 
            checked={data.declarationAccepted} 
            onChange={(e) => updateData({ declarationAccepted: e.target.checked })} 
            className="mt-0.5" 
          />
          <label htmlFor="declaration" className="text-xs text-[#1E293B] cursor-pointer">
            I hereby confirm that all statutory details, PAN records, GST options, and bank details provided above are true, accurate, and match legal entity records.
          </label>
        </div>

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={onBack}>Back</Button>
          <Button 
            variant="success" 
            disabled={!data.declarationAccepted} 
            onClick={onSubmit}
          >
            <CheckCircle2 className="w-4 h-4" /> Submit Application
          </Button>
        </div>
      </div>
    </Card>
  );
}