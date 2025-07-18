'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, applicationAPI } from '@/lib/supabase';

interface Application {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  address: string;
  program_interest: string;
  education_background: string;
  previous_healthcare_experience?: string;
  motivation_statement: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relationship: string;
  status: 'pending' | 'approved' | 'rejected' | 'under_review';
  submitted_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
}

interface ApplicationFile {
  id: string;
  application_id: string;
  file_type: 'nrc_photo' | 'grade12_results' | 'payment_receipt';
  file_path: string;
  file_name: string;
  file_size: number;
  file_url?: string;
  authenticity_score: number;
  authenticity_flags: string[];
  requires_review: boolean;
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
  created_at: string;
  updated_at: string;
}

const ApplicationsManagement = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [applicationFiles, setApplicationFiles] = useState<ApplicationFile[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = () => {
    try {
      const currentUser = authAPI.getCurrentUser();
      if (!currentUser || currentUser.role !== 'admin') {
        router.push('/');
        return;
      }
      setUser(currentUser);
      fetchApplications();
    } catch (error) {
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const fetchApplications = async () => {
    try {
      setError('');
      const data = await applicationAPI.getAll();
      setApplications(data || []);
    } catch (err: any) {
      setError('Failed to fetch applications: ' + err.message);
    }
  };

  const fetchApplicationFiles = async (applicationId: string) => {
    try {
      const data = await applicationAPI.getFiles(applicationId);
      setApplicationFiles(data || []);
    } catch (err: any) {
      console.error('Failed to fetch application files:', err);
      setApplicationFiles([]);
    }
  };

  const handleViewApplication = async (application: Application) => {
    setSelectedApplication(application);
    await fetchApplicationFiles(application.id);
    setShowModal(true);
  };

  const handleUpdateStatus = async (applicationId: string, newStatus: string, adminNotes: string) => {
    setIsUpdating(true);
    try {
      await applicationAPI.updateStatus(applicationId, newStatus, adminNotes, user.id);
      setSuccess('Application status updated successfully!');
      await fetchApplications();
      setShowModal(false);
      setSelectedApplication(null);
    } catch (err: any) {
      setError('Failed to update application: ' + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredApplications = applications.filter(app => {
    const matchesStatus = filterStatus === 'all' || app.status === filterStatus;
    const matchesSearch = searchTerm === '' || 
      app.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.program_interest.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'under_review': return 'bg-blue-100 text-blue-800';
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAuthenticityColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatFileType = (fileType: string) => {
    switch (fileType) {
      case 'nrc_photo': return 'NRC Photo';
      case 'grade12_results': return 'Grade 12 Results';
      case 'payment_receipt': return 'Payment Receipt';
      default: return fileType;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Application Management</h1>
              <p className="text-sm text-gray-600">Review and manage student applications</p>
            </div>
            <button
              onClick={() => router.push('/admin/dashboard')}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {/* Alerts */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            {success}
          </div>
        )}

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Search Applications</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, email, or program..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Applications</option>
                <option value="pending">Pending</option>
                <option value="under_review">Under Review</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <span className="text-2xl">📝</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Applications</p>
                <p className="text-2xl font-bold text-gray-900">{applications.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <span className="text-2xl">⏳</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending Review</p>
                <p className="text-2xl font-bold text-gray-900">
                  {applications.filter(app => app.status === 'pending').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <span className="text-2xl">✅</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-gray-900">
                  {applications.filter(app => app.status === 'approved').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <span className="text-2xl">❌</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Rejected</p>
                <p className="text-2xl font-bold text-gray-900">
                  {applications.filter(app => app.status === 'rejected').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Applications Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Applications ({filteredApplications.length})
            </h2>
          </div>

          {filteredApplications.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-gray-400 text-6xl mb-4">📝</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No applications found</h3>
              <p className="text-gray-600">
                {searchTerm || filterStatus !== 'all'
                  ? 'Try adjusting your search or filter criteria.'
                  : 'No applications have been submitted yet.'
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Applicant
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Program
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Submitted
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredApplications.map((application) => (
                    <tr key={application.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {application.first_name} {application.last_name}
                          </div>
                          <div className="text-sm text-gray-500">{application.email}</div>
                          <div className="text-sm text-gray-500">{application.phone}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{application.program_interest}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(application.status)}`}>
                          {application.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(application.submitted_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleViewApplication(application)}
                          className="text-blue-600 hover:text-blue-900 mr-4"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Application Details Modal */}
      {showModal && selectedApplication && (
        <ApplicationDetailsModal
          application={selectedApplication}
          files={applicationFiles}
          onClose={() => {
            setShowModal(false);
            setSelectedApplication(null);
            setApplicationFiles([]);
          }}
          onUpdateStatus={handleUpdateStatus}
          isUpdating={isUpdating}
          formatFileType={formatFileType}
          getAuthenticityColor={getAuthenticityColor}
          getStatusColor={getStatusColor}
        />
      )}
    </div>
  );
};

// Application Details Modal Component
const ApplicationDetailsModal = ({
  application,
  files,
  onClose,
  onUpdateStatus,
  isUpdating,
  formatFileType,
  getAuthenticityColor,
  getStatusColor
}: {
  application: Application;
  files: ApplicationFile[];
  onClose: () => void;
  onUpdateStatus: (id: string, status: string, notes: string) => void;
  isUpdating: boolean;
  formatFileType: (type: string) => string;
  getAuthenticityColor: (score: number) => string;
  getStatusColor: (status: string) => string;
}) => {
  const [newStatus, setNewStatus] = useState(application.status);
  const [adminNotes, setAdminNotes] = useState(application.admin_notes || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateStatus(application.id, newStatus, adminNotes);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">Application Details</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <span className="text-2xl">&times;</span>
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Application Information Table */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Complete Application Information</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
                <tbody className="bg-white divide-y divide-gray-200">
                  {/* Personal Information Section */}
                  <tr className="bg-blue-50">
                    <td colSpan={4} className="px-4 py-3 text-sm font-semibold text-blue-900 uppercase tracking-wider">
                      👤 Personal Information
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm font-medium text-gray-500 w-1/4 bg-gray-50">Full Name</td>
                    <td className="px-4 py-3 text-sm text-gray-900 w-1/4">{application.first_name} {application.last_name}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-500 w-1/4 bg-gray-50">Email Address</td>
                    <td className="px-4 py-3 text-sm text-gray-900 w-1/4">{application.email}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm font-medium text-gray-500 bg-gray-50">Phone Number</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{application.phone}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-500 bg-gray-50">Date of Birth</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{new Date(application.date_of_birth).toLocaleDateString()}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm font-medium text-gray-500 bg-gray-50">Gender</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{application.gender}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-500 bg-gray-50">Address</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{application.address}</td>
                  </tr>

                  {/* Academic Information Section */}
                  <tr className="bg-green-50">
                    <td colSpan={4} className="px-4 py-3 text-sm font-semibold text-green-900 uppercase tracking-wider">
                      🎓 Academic Information
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm font-medium text-gray-500 bg-gray-50">Program of Interest</td>
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">{application.program_interest}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-500 bg-gray-50">Education Background</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{application.education_background}</td>
                  </tr>
                  {application.previous_healthcare_experience && (
                    <tr>
                      <td className="px-4 py-3 text-sm font-medium text-gray-500 bg-gray-50">Healthcare Experience</td>
                      <td colSpan={3} className="px-4 py-3 text-sm text-gray-900">{application.previous_healthcare_experience}</td>
                    </tr>
                  )}
                  <tr>
                    <td className="px-4 py-3 text-sm font-medium text-gray-500 bg-gray-50">Motivation Statement</td>
                    <td colSpan={3} className="px-4 py-3 text-sm text-gray-900">{application.motivation_statement}</td>
                  </tr>

                  {/* Emergency Contact Section */}
                  <tr className="bg-orange-50">
                    <td colSpan={4} className="px-4 py-3 text-sm font-semibold text-orange-900 uppercase tracking-wider">
                      🚨 Emergency Contact Information
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm font-medium text-gray-500 bg-gray-50">Contact Name</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{application.emergency_contact_name}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-500 bg-gray-50">Contact Phone</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{application.emergency_contact_phone}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm font-medium text-gray-500 bg-gray-50">Relationship</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{application.emergency_contact_relationship}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-500 bg-gray-50">Submitted Date</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{new Date(application.submitted_at).toLocaleString()}</td>
                  </tr>

                  {/* Application Status Section */}
                  <tr className="bg-purple-50">
                    <td colSpan={4} className="px-4 py-3 text-sm font-semibold text-purple-900 uppercase tracking-wider">
                      📋 Application Status & Review
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm font-medium text-gray-500 bg-gray-50">Current Status</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(application.status)}`}>
                        {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-500 bg-gray-50">Application ID</td>
                    <td className="px-4 py-3 text-sm text-gray-900 font-mono">{application.id}</td>
                  </tr>
                  {application.reviewed_by && (
                    <tr>
                      <td className="px-4 py-3 text-sm font-medium text-gray-500 bg-gray-50">Reviewed By</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{application.reviewed_by}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-500 bg-gray-50">Review Date</td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {application.reviewed_at ? new Date(application.reviewed_at).toLocaleString() : 'Not reviewed'}
                      </td>
                    </tr>
                  )}
                  {application.admin_notes && (
                    <tr>
                      <td className="px-4 py-3 text-sm font-medium text-gray-500 bg-gray-50">Admin Notes</td>
                      <td colSpan={3} className="px-4 py-3 text-sm text-gray-900 bg-yellow-50 border-l-4 border-yellow-400">
                        {application.admin_notes}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Submitted Files */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Document Submission Status</h3>

            {/* File Status Overview */}
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Required Documents Status:</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { type: 'nrc_photo', label: 'NRC Photo', icon: '🆔' },
                  { type: 'grade12_results', label: 'Grade 12 Results', icon: '📜' },
                  { type: 'payment_receipt', label: 'Payment Receipt', icon: '💳' }
                ].map(({ type, label, icon }) => {
                  const hasFile = files.some(f => f.file_type === type);
                  return (
                    <div key={type} className={`flex items-center p-2 rounded ${hasFile ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      <span className="text-lg mr-2">{icon}</span>
                      <span className="text-sm font-medium">{label}</span>
                      <span className="ml-auto text-xs">
                        {hasFile ? '✅ Uploaded' : '❌ Missing'}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 text-xs text-gray-600">
                Total Files: {files.length}/3 required documents
              </div>
            </div>

            {files.length === 0 ? (
              <div className="text-center py-8 bg-red-50 rounded-lg border border-red-200">
                <p className="text-sm text-red-600 font-medium">⚠️ No files submitted</p>
                <p className="text-xs text-red-500 mt-1">This application is incomplete - all 3 documents are required</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Document Type
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        File Details
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Authenticity
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {files.map((file) => (
                      <tr key={file.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="text-2xl mr-3">
                              {file.file_type === 'nrc_photo' && '🆔'}
                              {file.file_type === 'grade12_results' && '📜'}
                              {file.file_type === 'payment_receipt' && '💳'}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {formatFileType(file.file_type)}
                              </div>
                              <div className="text-xs text-gray-500">
                                {file.file_type === 'nrc_photo' && 'National Registration Card'}
                                {file.file_type === 'grade12_results' && 'Academic Certificate'}
                                {file.file_type === 'payment_receipt' && 'Payment Confirmation'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm text-gray-900">{file.file_name}</div>
                          <div className="text-xs text-gray-500">
                            Size: {(file.file_size / 1024 / 1024).toFixed(2)} MB
                          </div>
                          <div className="text-xs text-gray-400">
                            Uploaded: {new Date(file.created_at).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className={`text-sm font-medium ${getAuthenticityColor(file.authenticity_score)}`}>
                            {file.authenticity_score}%
                          </div>
                          {file.authenticity_flags.length > 0 && (
                            <div className="text-xs text-red-600 mt-1">
                              <div className="font-medium">Issues:</div>
                              <ul className="list-disc list-inside">
                                {file.authenticity_flags.map((flag, index) => (
                                  <li key={index}>{flag.replace(/_/g, ' ')}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {file.requires_review ? (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                              ⚠️ Needs Review
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              ✅ Verified
                            </span>
                          )}
                          {file.reviewed_at && (
                            <div className="text-xs text-gray-500 mt-1">
                              Reviewed: {new Date(file.reviewed_at).toLocaleDateString()}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                          {file.file_url ? (
                            <div className="space-y-1">
                              <a
                                href={file.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-900 block"
                              >
                                👁️ View File
                              </a>
                              <a
                                href={file.file_url}
                                download={file.file_name}
                                className="text-green-600 hover:text-green-900 block"
                              >
                                📥 Download
                              </a>
                            </div>
                          ) : (
                            <span className="text-gray-400">No file available</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Application Status and Review */}
          <form onSubmit={handleSubmit} className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Review Application</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Application Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="pending">Pending</option>
                  <option value="under_review">Under Review</option>
                  <option value="accepted">Accepted</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Submitted
                </label>
                <p className="text-sm text-gray-900 py-2">
                  {new Date(application.submitted_at).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Admin Notes
              </label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Add notes about this application..."
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUpdating}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isUpdating ? 'Updating...' : 'Update Application'}
              </button>
            </div>
          </form>

          {/* Review History */}
          {application.reviewed_at && (
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Review History</h3>
              <div className="text-sm text-gray-600">
                <p>Last reviewed: {new Date(application.reviewed_at).toLocaleString()}</p>
                {application.admin_notes && (
                  <div className="mt-2">
                    <p className="font-medium">Previous Notes:</p>
                    <p className="text-gray-900">{application.admin_notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApplicationsManagement;
