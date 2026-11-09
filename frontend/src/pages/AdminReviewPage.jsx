// File path: frontend/src/pages/AdminReviewPage.jsx

import React, { useEffect, useState } from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { StatusBadge } from '../components/StatusBadge';
import API from '../services/api';
import { CheckCircle, XCircle, AlertCircle, FileText, ArrowLeft } from 'lucide-react';

export function AdminReviewPage() {
  const [applications, setApplications] = useState([]);
  const [selectedApp, setSelectedApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [remark, setRemark] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchApplications = async () => {
    try {
      const response = await API.get('/api/admin/applications');
      setApplications(response.data);
    } catch (err) {
      console.error("Failed to load admin applications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const handleReviewAction = async (newStatus) => {
    if (!selectedApp) return;
    setActionLoading(true);
    try {
      await API.post(`/api/admin/applications/${selectedApp.id}/review`, {
        status: newStatus,
        remark: remark
      });
      alert(`Application status successfully updated to ${newStatus}`);
      setSelectedApp(null);
      setRemark('');
      fetchApplications();
    } catch (err) {
      console.error("Failed to update application status:", err);
      alert("Error updating status. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-xs text-slate-500">Loading admin applications queue...</div>;
  }

  // Detail Inspector View
  if (selectedApp) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Button variant="outline" onClick={() => setSelectedApp(null)}>
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Queue
        </Button>

        <Card title={`Review Application: ${selectedApp.companyName}`}>
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-[10px] border border-slate-200">
              <p><strong>App ID:</strong> {selectedApp.applicationId}</p>
              <p><strong>Vendor ID:</strong> {selectedApp.vendorId}</p>
              <p><strong>Entity Type:</strong> {selectedApp.entityType}</p>
              <p><strong>Current Status:</strong> <StatusBadge status={selectedApp.status} /></p>
            </div>

            <div className="space-y-2">
              <p className="font-semibold text-slate-700">Uploaded Compliance Files:</p>
              <div className="space-y-2">
                {selectedApp.documents?.map((doc, idx) => (
                  <div key={idx} className="p-3 bg-white border border-slate-200 rounded-[10px] flex items-center justify-between">
                    <span className="flex items-center gap-2 font-medium text-[#173B63]">
                      <FileText className="w-4 h-4 text-[#2563EB]" /> {doc.doc_type}
                    </span>
                    <a href={`http://localhost:8000/${doc.file_url}`} target="_blank" rel="noreferrer" className="text-[#2563EB] hover:underline font-medium">
                      View File
                    </a>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <label className="font-semibold text-slate-700 block">Admin Review Remark:</label>
              <textarea 
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder="Enter remarks or reason for approval/rejection/clarification..."
                className="w-full p-3 border border-slate-200 rounded-[10px] focus:outline-none focus:border-[#2563EB] text-xs"
                rows={3}
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <Button 
                variant="outline" 
                onClick={() => handleReviewAction('Clarification_Required')}
                disabled={actionLoading}
              >
                <AlertCircle className="w-4 h-4 mr-1 text-amber-600" /> Request Clarification
              </Button>
              <Button 
                variant="danger" 
                onClick={() => handleReviewAction('Rejected')}
                disabled={actionLoading}
              >
                <XCircle className="w-4 h-4 mr-1" /> Reject
              </Button>
              <Button 
                variant="success" 
                onClick={() => handleReviewAction('Approved')}
                disabled={actionLoading}
              >
                <CheckCircle className="w-4 h-4 mr-1" /> Approve
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Main Queue Table View
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#173B63]">Admin Application Review</h1>
        <p className="text-xs text-[#64748B]">Manage all submitted vendor companies, inspect documents, and take action.</p>
      </div>

      <Card title="All Vendor Submissions">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Company Name</th>
                <th className="py-3 px-4">Vendor ID</th>
                <th className="py-3 px-4">Entity Type</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {applications.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-6 text-center text-slate-400">No applications found.</td>
                </tr>
              ) : (
                applications.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-4 font-semibold text-[#173B63]">{app.companyName}</td>
                    <td className="py-4 px-4 font-mono text-slate-600">{app.vendorId}</td>
                    <td className="py-4 px-4 text-slate-600">{app.entityType}</td>
                    <td className="py-4 px-4"><StatusBadge status={app.status} /></td>
                    <td className="py-4 px-4 text-right">
                      <Button variant="outline" onClick={() => setSelectedApp(app)}>
                        Review Application
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}