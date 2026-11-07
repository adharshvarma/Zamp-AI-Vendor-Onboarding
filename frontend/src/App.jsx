import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { useCompany } from './context/CompanyContext';
import { DashboardLayout } from './layout/DashboardLayout';

import { LandingPage } from './pages/LandingPage';
import { RegisterPage } from './pages/RegisterPage';
import { VendorDashboard } from './pages/VendorDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { Step1CompanyDetails } from './pages/AddCompanyWizard/Step1CompanyDetails';
import { Step2DocumentsBank } from './pages/AddCompanyWizard/Step2DocumentsBank';
import { Step3ReviewSubmit } from './pages/AddCompanyWizard/Step3ReviewSubmit';
import { triggerAIVerification } from './services/verificationService';

export default function App() {
  const { user, role, loginVendor, loginAdmin, registerVendor, logout } = useAuth();
  const { companies, selectedCompany, setSelectedCompany, addCompany, updateApplicationStatus } = useCompany();

  // Navigation route: 'landing' | 'signin' | 'register' | 'admin-login' | 'dashboard' | 'company-wizard' | 'ai-verification' | 'admin-dashboard' | 'admin-review'
  const [currentRoute, setCurrentRoute] = useState('landing');
  const [wizardStep, setWizardStep] = useState(1);
  const [verificationLogs, setVerificationLogs] = useState([]);
  const [adminRemark, setAdminRemark] = useState('');

  // Wizard State
  const [wizardData, setWizardData] = useState({
    companyName: '',
    entityType: 'Private Limited Company',
    customEntity: '',
    pincode: '',
    state: '',
    district: '',
    postOffice: '',
    addressBuilding: '',
    addressStreet: '',
    panNumber: '',
    panDoc: null,
    gstRegistered: 'Yes',
    gstin: '',
    gstDoc: null,
    bankHolderName: '',
    bankName: '',
    accNumber: '',
    ifscCode: '',
    bankProof: null,
    declarationAccepted: false,
  });

  const updateWizardData = (fields) => setWizardData((prev) => ({ ...prev, ...fields }));

  const handleSignIn = async (email, password) => {
    await loginVendor(email, password);
    setCurrentRoute('dashboard');
  };

  const handleAdminSignIn = async (email, password) => {
    await loginAdmin(email, password);
    setCurrentRoute('admin-dashboard');
  };

  const handleRegister = async (formData) => {
    await registerVendor(formData);
    setCurrentRoute('dashboard');
  };

  const handleWizardSubmit = async () => {
    const createdCompany = addCompany(wizardData);
    const results = await triggerAIVerification(createdCompany.id, wizardData);
    setVerificationLogs(results);
    setCurrentRoute('ai-verification');
  };

  // Public unauthenticated views
  if (!user) {
    if (currentRoute === 'register') {
      return <RegisterPage onRegisterSuccess={handleRegister} onNavigateToSignIn={() => setCurrentRoute('signin')} />;
    }
    if (currentRoute === 'signin') {
      return (
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center py-12 px-4">
          <div className="max-w-md w-full bg-white p-8 rounded-[12px] border border-slate-200 shadow-sm">
            <h2 className="text-2xl font-bold text-[#173B63] mb-4">Vendor Sign In</h2>
            <button 
              onClick={() => handleSignIn('vendor@clearvend.in', 'password123')}
              className="w-full bg-[#2563EB] text-white py-2.5 rounded-[10px] font-medium hover:bg-[#1d4ed8]"
            >
              Sign In as Vendor Demo
            </button>
          </div>
        </div>
      );
    }
    if (currentRoute === 'admin-login') {
      return (
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center py-12 px-4">
          <div className="max-w-md w-full bg-white p-8 rounded-[12px] border border-slate-200 shadow-sm">
            <h2 className="text-2xl font-bold text-[#173B63] mb-4">Admin Portal Access</h2>
            <button 
              onClick={() => handleAdminSignIn('admin@clearvend.in', 'admin123')}
              className="w-full bg-[#173B63] text-white py-2.5 rounded-[10px] font-medium hover:bg-[#112d4e]"
            >
              Log In as Admin Demo
            </button>
          </div>
        </div>
      );
    }
    return <LandingPage onNavigate={setCurrentRoute} />;
  }

  // Authenticated Portal Layout
  return (
    <DashboardLayout 
      currentUser={user} 
      role={role} 
      onLogout={() => { logout(); setCurrentRoute('landing'); }}
      activeNav={currentRoute}
      setActiveNav={setCurrentRoute}
    >
      {/* Vendor Dashboard */}
      {currentRoute === 'dashboard' && (
        <VendorDashboard 
          companies={companies} 
          onAddCompany={() => { setWizardStep(1); setCurrentRoute('company-wizard'); }} 
          onViewCompany={(comp) => { setSelectedCompany(comp); setCurrentRoute('application-details'); }} 
        />
      )}

      {/* Multi-step Registration Wizard */}
      {currentRoute === 'company-wizard' && (
        <div className="max-w-3xl mx-auto">
          {wizardStep === 1 && (
            <Step1CompanyDetails 
              data={wizardData} 
              updateData={updateWizardData} 
              onNext={() => setWizardStep(2)} 
              onCancel={() => setCurrentRoute('dashboard')} 
            />
          )}
          {wizardStep === 2 && (
            <Step2DocumentsBank 
              data={wizardData} 
              updateData={updateWizardData} 
              onNext={() => setWizardStep(3)} 
              onBack={() => setWizardStep(1)} 
            />
          )}
          {wizardStep === 3 && (
            <Step3ReviewSubmit 
              data={wizardData} 
              updateData={updateWizardData} 
              onSubmit={handleWizardSubmit} 
              onBack={() => setWizardStep(2)} 
            />
          )}
        </div>
      )}

      {/* AI Verification Stage Screen */}
      {currentRoute === 'ai-verification' && (
        <div className="max-w-3xl mx-auto bg-white p-8 rounded-[12px] border border-slate-200 shadow-sm text-center">
          <h2 className="text-2xl font-bold text-[#173B63] mb-2">AI Document Processing</h2>
          <p className="text-xs text-[#64748B] mb-6">Cross-checking extracted documents for {selectedCompany?.companyName}</p>
          <div className="text-left space-y-2 mb-6">
            {verificationLogs.map((log, idx) => (
              <div key={idx} className="p-3 bg-slate-50 rounded-[10px] text-xs flex justify-between">
                <span>{log.stage || log.document}</span>
                <span className="font-semibold text-[#16A34A]">{log.status || log.result}</span>
              </div>
            ))}
          </div>
          <button 
            onClick={() => setCurrentRoute('dashboard')} 
            className="bg-[#173B63] text-white px-6 py-2.5 rounded-[10px] text-sm font-medium"
          >
            Return to Dashboard
          </button>
        </div>
      )}

      {/* Admin Applications Console */}
      {currentRoute === 'admin-dashboard' && (
        <AdminDashboard 
          companies={companies} 
          onReviewApplication={(comp) => { setSelectedCompany(comp); setCurrentRoute('admin-review'); }} 
        />
      )}

      {/* Admin Application Review Screen */}
      {currentRoute === 'admin-review' && selectedCompany && (
        <div className="max-w-4xl mx-auto bg-white p-8 rounded-[12px] border border-slate-200 shadow-sm space-y-6">
          <h2 className="text-xl font-bold text-[#173B63]">{selectedCompany.companyName}</h2>
          <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-[10px]">
            <div><strong>Entity Type:</strong> {selectedCompany.entityType === 'Other' ? `Other (${selectedCompany.customEntity || 'Unspecified'})` : selectedCompany.entityType}</div>
            <div><strong>PAN:</strong> {selectedCompany.panNumber || selectedCompany.pan}</div>
            <div><strong>GST Status:</strong> {selectedCompany.gstRegistered}</div>
            <div><strong>Bank:</strong> {selectedCompany.bankName}</div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#1E293B] mb-1">Decision Remark</label>
            <textarea 
              value={adminRemark} 
              onChange={(e) => setAdminRemark(e.target.value)} 
              className="w-full border border-slate-300 rounded-[10px] p-3 text-xs mb-4"
              rows={3} 
              placeholder="Enter remarks..."
            />
            <div className="flex gap-3">
              <button onClick={() => { updateApplicationStatus(selectedCompany.id, 'Approved', adminRemark); setCurrentRoute('admin-dashboard'); }} className="bg-[#16A34A] text-white px-4 py-2 rounded-[10px] text-xs font-medium">Approve</button>
              <button onClick={() => { updateApplicationStatus(selectedCompany.id, 'Pending', adminRemark); setCurrentRoute('admin-dashboard'); }} className="bg-[#D97706] text-white px-4 py-2 rounded-[10px] text-xs font-medium">Clarification Required</button>
              <button onClick={() => { updateApplicationStatus(selectedCompany.id, 'Rejected', adminRemark); setCurrentRoute('admin-dashboard'); }} className="bg-[#DC2626] text-white px-4 py-2 rounded-[10px] text-xs font-medium">Reject</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}