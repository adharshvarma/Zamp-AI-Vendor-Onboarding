// File path: frontend/src/App.jsx

import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { useCompany } from './context/CompanyContext';
import { DashboardLayout } from './layout/DashboardLayout';
import API from './services/api';

import { LandingPage } from './pages/LandingPage';
import { RegisterPage } from './pages/RegisterPage';
import { SignInPage } from './pages/SignInPage';
import { VendorDashboard } from './pages/VendorDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { Step1CompanyDetails } from './pages/AddCompanyWizard/Step1CompanyDetails';
import { Step2DocumentsBank } from './pages/AddCompanyWizard/Step2DocumentsBank';
import { Step3ReviewSubmit } from './pages/AddCompanyWizard/Step3ReviewSubmit';
import { ProfilePage } from './pages/ProfilePage';
import { CompanyDetailsPage } from './pages/CompanyDetails';

export default function App() {
  const { user, logout } = useAuth();
  const { selectedCompany, setSelectedCompany, fetchCompanies } = useCompany();

  const [currentRoute, setCurrentRoute] = useState('dashboard');
  const [wizardStep, setWizardStep] = useState(1);
  const [verificationLogs, setVerificationLogs] = useState([]);
  const [adminRemark, setAdminRemark] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

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
    panFile: null,
    gstRegistered: 'Yes',
    gstin: '',
    gstFile: null,
    bankHolderName: '',
    bankName: '',
    accNumber: '',
    ifscCode: '',
    bankFile: null,
    declarationAccepted: false,
  });

  const updateWizardData = (fields) => setWizardData((prev) => ({ ...prev, ...fields }));

  const handleSignInSuccess = () => {
    const role = localStorage.getItem('user_role');
    if (role === 'admin') {
      setCurrentRoute('admin-dashboard');
    } else {
      setCurrentRoute('dashboard');
      fetchCompanies?.();
    }
  };

  const handleRegisterSuccess = () => {
    setCurrentRoute('dashboard');
    fetchCompanies?.();
  };

  const handleWizardSubmit = async () => {
    try {
      const formData = new FormData();
      formData.append('company_name', wizardData.companyName);
      formData.append('entity_type', wizardData.entityType);
      if (wizardData.customEntity) formData.append('custom_entity', wizardData.customEntity);
      formData.append('country', 'India');
      formData.append('pincode', wizardData.pincode);
      formData.append('state', wizardData.state);
      formData.append('district', wizardData.district);
      if (wizardData.postOffice) formData.append('post_office', wizardData.postOffice);
      if (wizardData.addressBuilding) formData.append('address_building', wizardData.addressBuilding);
      if (wizardData.addressStreet) formData.append('address_street', wizardData.addressStreet);
      formData.append('pan_number', wizardData.panNumber);
      formData.append('gst_registered', wizardData.gstRegistered);
      if (wizardData.gstin) formData.append('gstin', wizardData.gstin);
      formData.append('bank_holder_name', wizardData.bankHolderName);
      formData.append('bank_name', wizardData.bankName);
      formData.append('acc_number', wizardData.accNumber);
      formData.append('ifsc_code', wizardData.ifscCode);

      if (wizardData.panFile) formData.append('pan_file', wizardData.panFile);
      if (wizardData.gstFile) formData.append('gst_file', wizardData.gstFile);
      if (wizardData.bankFile) formData.append('bank_file', wizardData.bankFile);

      const response = await API.post('/api/vendor/apply', formData);
      setVerificationLogs(response.data.ai_evaluations || response.data.results || []);
      setCurrentRoute('ai-verification');
    } catch (err) {
      console.error("Vendor application submission failed:", err);
      alert(err.response?.data?.detail || "Submission failed. Please check your inputs.");
    }
  };

  const handleAdminReviewAction = async (statusValue) => {
    if (!selectedCompany) return;
    setActionLoading(true);
    try {
      await API.post(`/api/admin/applications/${selectedCompany.id}/review`, {
        status: statusValue,
        remark: adminRemark
      });
      alert(`Application successfully marked as ${statusValue}`);
      setAdminRemark('');
      setCurrentRoute('admin-dashboard');
    } catch (err) {
      console.error("Failed to update status:", err);
      alert("Failed to update application status.");
    } finally {
      setActionLoading(false);
    }
  };

  // Public unauthenticated views
  if (!user) {
    if (currentRoute === 'register') {
      return <RegisterPage onRegisterSuccess={handleRegisterSuccess} onNavigateToSignIn={() => setCurrentRoute('signin')} />;
    }
    if (currentRoute === 'signin') {
      return <SignInPage onSignInSuccess={handleSignInSuccess} onNavigateToRegister={() => setCurrentRoute('register')} />;
    }
    return <LandingPage onNavigate={setCurrentRoute} />;
  }

  // Authenticated Portal Layout
  return (
    <DashboardLayout 
      currentUser={user} 
      role={localStorage.getItem('user_role')} 
      onLogout={() => { logout(); setCurrentRoute('landing'); }}
      activeNav={currentRoute}
      setActiveNav={setCurrentRoute}
    >
      {/* Vendor Dashboard */}
      {currentRoute === 'dashboard' && (
        <VendorDashboard 
          onAddCompany={() => { setWizardStep(1); setCurrentRoute('company-wizard'); }} 
          onViewCompany={(comp) => { 
            setSelectedCompany(comp); 
            setCurrentRoute('company-details'); 
          }} 
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
          <h2 className="text-2xl font-bold text-[#173B63] mb-2">AI Document Compliance Processing</h2>
          <p className="text-xs text-[#64748B] mb-6">Groq AI OCR & Cross-Field Consistency Evaluation Results</p>
          <div className="text-left space-y-3 mb-6">
            {verificationLogs.map((log, idx) => (
              <div key={idx} className="p-4 bg-slate-50 rounded-[10px] border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between font-semibold">
                  <span className="text-[#173B63]">{log.document}</span>
                  <span className={log.result === 'Pass' ? 'text-emerald-600' : 'text-amber-600'}>
                    {log.result}
                  </span>
                </div>
                <p className="text-slate-600"><strong>Extracted:</strong> {log.extracted}</p>
                <p className="text-slate-500"><strong>Remarks:</strong> {log.remarks}</p>
              </div>
            ))}
          </div>
          <button 
            onClick={() => { setCurrentRoute('dashboard'); }} 
            className="bg-[#173B63] text-white px-6 py-2.5 rounded-[10px] text-sm font-medium hover:bg-[#112d4e]"
          >
            Return to Dashboard
          </button>
        </div>
      )}

      {/* Admin Applications Console */}
      {currentRoute === 'admin-dashboard' && (
        <AdminDashboard 
          onReviewApplication={(comp) => { setSelectedCompany(comp); setCurrentRoute('admin-review'); }} 
        />
      )}

      {/* Admin Application Review Screen */}
      {currentRoute === 'admin-review' && selectedCompany && (
        <div className="max-w-4xl mx-auto bg-white p-8 rounded-[12px] border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#173B63]">{selectedCompany.companyName || selectedCompany.company_name}</h2>
            <button onClick={() => setCurrentRoute('admin-dashboard')} className="text-xs text-[#2563EB] hover:underline">
              &larr; Back to Queue
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-[10px]">
            <div><strong>Entity Type:</strong> {selectedCompany.entityType || selectedCompany.entity_type}</div>
            <div><strong>Vendor ID:</strong> {selectedCompany.vendorId || selectedCompany.vendor_id}</div>
            <div><strong>App ID:</strong> {selectedCompany.applicationId || selectedCompany.application_id}</div>
            <div><strong>Status:</strong> {selectedCompany.status}</div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#1E293B] mb-1">Decision Remark</label>
            <textarea 
              value={adminRemark} 
              onChange={(e) => setAdminRemark(e.target.value)} 
              className="w-full border border-slate-300 rounded-[10px] p-3 text-xs mb-4 focus:outline-none focus:border-[#2563EB]"
              rows={3} 
              placeholder="Enter review remarks or reason for decision..."
            />
            <div className="flex gap-3">
              <button 
                onClick={() => handleAdminReviewAction('Approved')} 
                disabled={actionLoading}
                className="bg-[#16A34A] text-white px-4 py-2 rounded-[10px] text-xs font-medium hover:bg-[#15803d]"
              >
                Approve
              </button>
              <button 
                onClick={() => handleAdminReviewAction('Clarification_Required')} 
                disabled={actionLoading}
                className="bg-[#D97706] text-white px-4 py-2 rounded-[10px] text-xs font-medium hover:bg-[#b45309]"
              >
                Clarification Required
              </button>
              <button 
                onClick={() => handleAdminReviewAction('Rejected')} 
                disabled={actionLoading}
                className="bg-[#DC2626] text-white px-4 py-2 rounded-[10px] text-xs font-medium hover:bg-[#b91c1c]"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Profile Page */}
      {currentRoute === 'profile' && (
        <ProfilePage />
      )}

      {/* Company Details View */}
      {currentRoute === 'company-details' && (
        <CompanyDetailsPage
          company={selectedCompany} 
          onBack={() => setCurrentRoute('dashboard')} 
        />
      )}
    </DashboardLayout>
  );
}