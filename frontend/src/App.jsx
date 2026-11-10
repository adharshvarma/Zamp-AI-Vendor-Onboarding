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
import { AdminReviewPage } from './pages/AdminReviewPage';
import { Step1CompanyDetails } from './pages/AddCompanyWizard/Step1CompanyDetails';
import { Step2DocumentsBank } from './pages/AddCompanyWizard/Step2DocumentsBank';
import { Step3ReviewSubmit } from './pages/AddCompanyWizard/Step3ReviewSubmit';
import { ProfilePage } from './pages/ProfilePage';
import { CompanyDetailsPage } from './pages/CompanyDetails';
import { VerificationReport } from './components/VerificationReport';

const EMPTY_WIZARD = {
  companyName: '',
  entityType: 'Private Limited Company',
  customEntity: '',
  contactName: '',
  designation: '',
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
};

const WIZARD_STEPS = ['Company & Contact', 'Documents & Bank', 'Review & Submit'];

export default function App() {
  const { user, logout, loading: authLoading } = useAuth();
  const { selectedCompany, setSelectedCompany } = useCompany();

  // Start on the right home page for the signed-in role (admin vs vendor)
  const [currentRoute, setCurrentRoute] = useState(() =>
    sessionStorage.getItem('user_role') === 'admin' ? 'admin-dashboard' : 'dashboard'
  );
  const [wizardStep, setWizardStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [wizardData, setWizardData] = useState(EMPTY_WIZARD);

  const updateWizardData = (fields) => setWizardData((prev) => ({ ...prev, ...fields }));

  const handleSignInSuccess = () => {
    const role = sessionStorage.getItem('user_role');
    setCurrentRoute(role === 'admin' ? 'admin-dashboard' : 'dashboard');
  };

  const handleRegisterSuccess = () => {
    setCurrentRoute('dashboard');
  };

  const startNewApplication = () => {
    setWizardData({ ...EMPTY_WIZARD, contactName: user?.name || '' });
    setWizardStep(1);
    setCurrentRoute('company-wizard');
  };

  const handleWizardSubmit = async () => {
    setSubmitting(true);
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
      if (wizardData.contactName) formData.append('contact_name', wizardData.contactName);
      if (wizardData.designation) formData.append('designation', wizardData.designation);
      formData.append('pan_number', wizardData.panNumber);
      formData.append('gst_registered', wizardData.gstRegistered);
      if (wizardData.gstin) formData.append('gstin', wizardData.gstin);
      formData.append('bank_holder_name', wizardData.bankHolderName);
      formData.append('bank_name', wizardData.bankName);
      formData.append('acc_number', wizardData.accNumber);
      formData.append('ifsc_code', wizardData.ifscCode);

      if (wizardData.panFile) formData.append('pan_file', wizardData.panFile);
      if (wizardData.gstRegistered === 'Yes' && wizardData.gstFile) formData.append('gst_file', wizardData.gstFile);
      if (wizardData.bankFile) formData.append('bank_file', wizardData.bankFile);

      const response = await API.post('/api/vendor/apply', formData);
      setLastResult(response.data);
      setCurrentRoute('ai-verification');
    } catch (err) {
      console.error('Vendor application submission failed:', err);
      const detail = err.response?.data?.detail;
      alert(typeof detail === 'string' ? detail : 'Submission failed. Please check that all required fields are filled.');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F4F6F8] flex items-center justify-center text-sm text-slate-500">
        Loading VendorGate...
      </div>
    );
  }

  // Public unauthenticated views
  if (!user) {
    if (currentRoute === 'register') {
      return <RegisterPage onRegisterSuccess={handleRegisterSuccess} onNavigateToSignIn={() => setCurrentRoute('signin')} onHome={() => setCurrentRoute('landing')} />;
    }
    if (currentRoute === 'signin') {
      return <SignInPage onSignInSuccess={handleSignInSuccess} onNavigateToRegister={() => setCurrentRoute('register')} onHome={() => setCurrentRoute('landing')} />;
    }
    return <LandingPage onNavigate={setCurrentRoute} />;
  }

  return (
    <DashboardLayout
      currentUser={user}
      role={sessionStorage.getItem('user_role')}
      onLogout={() => { logout(); setCurrentRoute('landing'); }}
      activeNav={currentRoute}
      setActiveNav={setCurrentRoute}
      onAddCompany={startNewApplication}
    >
      {/* Vendor Dashboard */}
      {currentRoute === 'dashboard' && (
        <VendorDashboard
          onAddCompany={startNewApplication}
          onViewCompany={(comp) => {
            setSelectedCompany(comp);
            setCurrentRoute('company-details');
          }}
        />
      )}

      {/* Multi-step Registration Wizard */}
      {currentRoute === 'company-wizard' && (
        <div className="max-w-3xl mx-auto space-y-5">
          {/* Progress stepper */}
          <div className="flex items-center gap-2">
            {WIZARD_STEPS.map((label, idx) => {
              const n = idx + 1;
              const done = wizardStep > n;
              const active = wizardStep === n;
              return (
                <React.Fragment key={label}>
                  <div className="flex items-center gap-2">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      done ? 'bg-[#16A34A] text-white' : active ? 'bg-[#0E2A47] text-white' : 'bg-slate-200 text-slate-500'
                    }`}>
                      {done ? '✓' : n}
                    </span>
                    <span className={`text-xs font-semibold hidden sm:inline ${active ? 'text-[#0E2A47]' : 'text-slate-500'}`}>{label}</span>
                  </div>
                  {n < WIZARD_STEPS.length && <div className="flex-1 h-px bg-slate-200" />}
                </React.Fragment>
              );
            })}
          </div>

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
              submitting={submitting}
            />
          )}
        </div>
      )}

      {/* Result screen right after submitting */}
      {currentRoute === 'ai-verification' && lastResult && (
        <div className="max-w-4xl mx-auto space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-[#0E2A47]">Verification Result</h2>
              <p className="text-xs text-[#64748B]">
                Application {lastResult.application_id} · Vendor ID {lastResult.vendor_id}
              </p>
            </div>
            <button
              onClick={() => setCurrentRoute('dashboard')}
              className="bg-[#0E2A47] text-white px-5 py-2.5 rounded-[10px] text-sm font-medium hover:bg-[#0A1F36]"
            >
              Back to Dashboard
            </button>
          </div>
          <VerificationReport report={lastResult.report} status={lastResult.status} />
          <p className="text-xs text-slate-500">
            You can see this result anytime from your dashboard (View details). If something needs fixing, use "Fix &amp; resubmit" there.
            Final approval is confirmed by the procurement team.
          </p>
          <div className="flex justify-center pt-2 pb-6">
            <button
              onClick={() => setCurrentRoute('dashboard')}
              className="bg-[#0E2A47] text-white px-6 py-2.5 rounded-[10px] text-sm font-medium hover:bg-[#0A1F36]"
            >
              Back to dashboard
            </button>
          </div>
        </div>
      )}

      {/* Admin dashboard */}
      {currentRoute === 'admin-dashboard' && (
        <AdminDashboard
          onReviewApplication={(comp) => { setSelectedCompany(comp); setCurrentRoute('admin-review'); }}
        />
      )}

      {/* Admin review of one application */}
      {currentRoute === 'admin-review' && selectedCompany && (
        <AdminReviewPage
          companyId={selectedCompany.id}
          onBack={() => setCurrentRoute('admin-dashboard')}
        />
      )}

      {currentRoute === 'profile' && <ProfilePage />}

      {currentRoute === 'company-details' && (
        <CompanyDetailsPage
          company={selectedCompany}
          onBack={() => setCurrentRoute('dashboard')}
        />
      )}
    </DashboardLayout>
  );
}
