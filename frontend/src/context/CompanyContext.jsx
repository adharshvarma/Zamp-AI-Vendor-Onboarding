import React, { createContext, useContext, useState } from 'react';

const CompanyContext = createContext(null);

const INITIAL_DEMO_COMPANIES = [
  {
    id: 'VF-0001',
    vendorId: 'VND-0001',
    companyName: 'ABC Technologies Pvt Ltd',
    entityType: 'Private Limited Company',
    customEntity: '',
    country: 'India',
    regDate: '2026-03-10',
    status: 'Approved',
    pincode: '400001',
    state: 'Maharashtra',
    district: 'Mumbai',
    addressBuilding: '101 Tech Park',
    addressStreet: 'BKC Complex',
    postOffice: 'Mumbai G.P.O.',
    panNumber: 'AAACA1234F',
    gstRegistered: 'Yes',
    gstin: '27AAACA1234F1Z5',
    bankHolderName: 'ABC Technologies Pvt Ltd',
    bankName: 'HDFC Bank',
    accNumber: '50100012345678',
    ifscCode: 'HDFC0001234',
    documents: {
      panDoc: 'pan_card.pdf',
      gstDoc: 'gst_certificate.pdf',
      bankProof: 'cancelled_cheque.pdf',
    },
    activityLogs: [
      { date: '2026-03-10 10:00 AM', text: 'Application submitted by vendor' },
      { date: '2026-03-10 10:05 AM', text: 'AI document extraction completed' },
      { date: '2026-03-10 11:30 AM', text: 'Approved by ClearVend Admin' },
    ],
  },
];

export function CompanyProvider({ children }) {
  const [companies, setCompanies] = useState(INITIAL_DEMO_COMPANIES);
  const [selectedCompany, setSelectedCompany] = useState(null);

  const addCompany = (newCompanyData) => {
    const nextIndex = companies.length + 1;
    const formattedId = `VF-${String(nextIndex).padStart(4, '0')}`;
    const formattedVendorId = `VND-${String(nextIndex).padStart(4, '0')}`;

    const createdCompany = {
      ...newCompanyData,
      id: formattedId,
      vendorId: formattedVendorId,
      country: 'India',
      regDate: new Date().toISOString().split('T')[0],
      status: 'Pending',
      activityLogs: [
        {
          date: new Date().toLocaleString(),
          text: 'Application submitted for AI verification',
        },
      ],
    };

    setCompanies((prev) => [...prev, createdCompany]);
    setSelectedCompany(createdCompany);
    return createdCompany;
  };

  const updateApplicationStatus = (companyId, newStatus, adminRemark = '') => {
    setCompanies((prev) =>
      prev.map((item) => {
        if (item.id === companyId) {
          const updatedLogs = [
            ...item.activityLogs,
            {
              date: new Date().toLocaleString(),
              text: `Status updated to ${newStatus}.${adminRemark ? ` Remark: ${adminRemark}` : ''}`,
            },
          ];
          const updatedItem = { ...item, status: newStatus, activityLogs: updatedLogs };
          if (selectedCompany?.id === companyId) {
            setSelectedCompany(updatedItem);
          }
          return updatedItem;
        }
        return item;
      })
    );
  };

  return (
    <CompanyContext.Provider
      value={{
        companies,
        selectedCompany,
        setSelectedCompany,
        addCompany,
        updateApplicationStatus,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
}

