'use client';

import React, { useState, useEffect } from 'react';
import { accountantAPI } from '@/lib/supabase';

interface PaymentApprovalManagerProps {
  accountantId: string;
}

interface Student {
  id: string;
  student_id: string;
  first_name: string;
  last_name: string;
  email: string;
  program: string;
  year_of_study: number;
  semester: number;
  status: string;
}

interface PaymentApproval {
  id: string;
  student_id: string;
  payment_id?: string;
  amount_paid: number;
  payment_reference?: string;
  payment_date: string;
  approved_by?: string;
  approval_date?: string;
  access_valid_from: string;
  access_valid_until: string;
  approval_status: 'pending' | 'approved' | 'rejected' | 'expired' | 'revoked';
  approval_notes?: string;
  auto_expire: boolean;
  created_at: string;
  updated_at: string;
  students?: {
    student_id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  accountants?: {
    first_name: string;
    last_name: string;
  };
}

interface SemesterPeriod {
  id: string;
  semester_name: string;
  academic_year: string;
  semester_number: number;
  start_date: string;
  end_date: string;
  registration_start_date: string;
  registration_end_date: string;
  is_active: boolean;
  is_registration_open: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

interface StudentSemesterRegistration {
  id: string;
  student_id: string;
  semester_period_id: string;
  registration_date: string;
  approved_by?: string;
  approval_date?: string;
  registration_status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  payment_approval_id?: string;
  registration_notes?: string;
  created_at: string;
  updated_at: string;
  students?: {
    student_id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  semester_periods?: {
    semester_name: string;
    academic_year: string;
    semester_number: number;
  };
  payment_approvals?: {
    id: string;
    amount_paid: number;
    payment_reference: string;
    approval_status: string;
  };
}

const PaymentApprovalManager: React.FC<PaymentApprovalManagerProps> = ({ accountantId }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [paymentApprovals, setPaymentApprovals] = useState<PaymentApproval[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showApprovalForm, setShowApprovalForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [semesterRegistrations, setSemesterRegistrations] = useState<StudentSemesterRegistration[]>([]);

  // New state for registration functionality
  const [activeTab, setActiveTab] = useState<'approvals' | 'registrations'>('approvals');
  const [semesterPeriods, setSemesterPeriods] = useState<SemesterPeriod[]>([]);
  const [activeSemester, setActiveSemester] = useState<SemesterPeriod | null>(null);
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [selectedStudentForRegistration, setSelectedStudentForRegistration] = useState('');
  const [registrationFilterStatus, setRegistrationFilterStatus] = useState<string>('all');

  const [approvalForm, setApprovalForm] = useState({
    student_id: '',
    amount_paid: 0,
    payment_reference: '',
    payment_date: new Date().toISOString().split('T')[0],
    access_valid_from: new Date().toISOString().split('T')[0],
    access_valid_until: '',
    approval_notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      // Load data with individual error handling
      const studentsData = await accountantAPI.getAllStudents().catch(err => {
        console.log('Students error:', err.message);
        return [];
      });

      const approvalsData = await accountantAPI.getAllPaymentApprovals().catch(err => {
        console.log('Payment approvals error:', err.message);
        return [];
      });

      const registrationsData = await accountantAPI.getAllSemesterRegistrations().catch(err => {
        console.log('Semester registrations error:', err.message);
        return [];
      });

      const semesterPeriodsData = await accountantAPI.getAllSemesterPeriods().catch(err => {
        console.log('Semester periods error:', err.message);
        return [];
      });

      const activeSemesterData = await accountantAPI.getActiveSemester().catch(err => {
        console.log('Active semester error:', err.message);
        return null;
      });

      console.log('Loaded data:', {
        students: studentsData?.length || 0,
        approvals: approvalsData?.length || 0,
        registrations: registrationsData?.length || 0,
        semesterPeriods: semesterPeriodsData?.length || 0,
        activeSemester: activeSemesterData ? 'Found' : 'None'
      });

      setStudents(studentsData || []);
      setPaymentApprovals(approvalsData || []);
      setSemesterRegistrations(registrationsData || []);
      setSemesterPeriods(semesterPeriodsData || []);
      setActiveSemester(activeSemesterData);

      // If no payment approvals table exists, show helpful message
      if (approvalsData.length === 0) {
        console.log('No payment approvals found. This might be because:');
        console.log('1. The payment_approvals table does not exist');
        console.log('2. The table is empty');
        console.log('3. There are permission issues');
      }

    } catch (error: any) {
      console.error('Error loading data:', error);
      setError(`Failed to load data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getStudentRegistrationStatus = (studentId: string) => {
    const registration = semesterRegistrations.find(
      reg => reg.student_id === studentId && reg.registration_status === 'approved'
    );

    if (registration) {
      return {
        status: 'Registered',
        semester: registration.semester_periods?.semester_name || 'Unknown Semester',
        color: 'bg-green-100 text-green-800'
      };
    }

    const pendingRegistration = semesterRegistrations.find(
      reg => reg.student_id === studentId && reg.registration_status === 'pending'
    );

    if (pendingRegistration) {
      return {
        status: 'Pending Registration',
        semester: pendingRegistration.semester_periods?.semester_name || 'Unknown Semester',
        color: 'bg-yellow-100 text-yellow-800'
      };
    }

    return {
      status: 'Not Registered',
      semester: 'No semester registration',
      color: 'bg-red-100 text-red-800'
    };
  };

  const handleApprovePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      await accountantAPI.approvePaymentAccess(approvalForm, accountantId);
      
      const student = students.find(s => s.id === approvalForm.student_id);
      setSuccess(`Payment approved successfully for ${student?.first_name} ${student?.last_name}!`);
      
      // Reset form
      setApprovalForm({
        student_id: '',
        amount_paid: 0,
        payment_reference: '',
        payment_date: new Date().toISOString().split('T')[0],
        access_valid_from: new Date().toISOString().split('T')[0],
        access_valid_until: '',
        approval_notes: ''
      });
      setShowApprovalForm(false);
      
      // Reload data
      await loadData();

    } catch (error: any) {
      setError(error.message || 'Failed to approve payment');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectApproval = async (approvalId: string, rejectionNotes: string) => {
    try {
      setLoading(true);
      setError('');

      await accountantAPI.rejectPaymentApproval(approvalId, rejectionNotes, accountantId);
      setSuccess('Payment approval rejected successfully!');

      await loadData();
    } catch (error: any) {
      setError(error.message || 'Failed to reject payment approval');
    } finally {
      setLoading(false);
    }
  };

  const handleUnapprovePayment = async (approvalId: string, unapprovalNotes: string) => {
    try {
      setLoading(true);
      setError('');

      await accountantAPI.unapprovePaymentApproval(approvalId, unapprovalNotes, accountantId);
      setSuccess('Payment approval revoked successfully! Student access has been restricted.');

      await loadData();
    } catch (error: any) {
      setError(error.message || 'Failed to unapprove payment');
    } finally {
      setLoading(false);
    }
  };

  const handleTerminateStudentAccess = async (studentId: string, studentName: string) => {
    const reason = prompt(`Enter reason for terminating ALL access for ${studentName}:`);
    if (!reason) return;

    const confirmed = confirm(
      `Are you sure you want to TERMINATE ALL ACCESS for ${studentName}?\n\n` +
      `This will:\n` +
      `• Revoke ALL active payment approvals\n` +
      `• Cancel ALL active semester registrations\n` +
      `• Immediately restrict ALL portal access\n\n` +
      `This is more comprehensive than just revoking this payment.\n` +
      `This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setLoading(true);
      setError('');

      await accountantAPI.terminateStudentAccess(studentId, reason, accountantId);
      setSuccess(`All access terminated successfully for ${studentName}!`);

      await loadData();
    } catch (error: any) {
      setError(error.message || 'Failed to terminate student access');
    } finally {
      setLoading(false);
    }
  };

  const handleStudentSelect = (student: Student) => {
    setSelectedStudent(student);
    setApprovalForm(prev => ({ ...prev, student_id: student.id }));
  };

  const handleCreateTestData = async () => {
    try {
      setLoading(true);
      setError('');

      const result = await accountantAPI.createTestPaymentApproval(accountantId);
      setSuccess(result.message);

      await loadData();
    } catch (error: any) {
      setError(error.message || 'Failed to create test payment approval');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterStudent = async () => {
    if (!selectedStudentForRegistration || !activeSemester) {
      setError('Please select a student and ensure there is an active semester');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Check if student has valid payment approval
      const validPayment = paymentApprovals.find(p =>
        p.student_id === selectedStudentForRegistration &&
        p.approval_status === 'approved' &&
        new Date(p.access_valid_until) >= new Date()
      );

      if (!validPayment) {
        setError('Student must have a valid payment approval before registration');
        return;
      }

      // Register student using the comprehensive verification function
      const result = await accountantAPI.registerStudentWithPaymentVerification(
        selectedStudentForRegistration,
        activeSemester.id,
        accountantId,
        'Registration by accounts office'
      );

      const student = students.find(s => s.id === selectedStudentForRegistration);
      setSuccess(
        `✅ Registration successful for ${student?.first_name} ${student?.last_name} ` +
        `in ${activeSemester.semester_name} ${activeSemester.academic_year}`
      );

      setShowRegisterForm(false);
      setSelectedStudentForRegistration('');
      await loadData();

    } catch (error: any) {
      setError(error.message || 'Failed to register student');
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(student =>
    student.student_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    `${student.first_name} ${student.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredApprovals = paymentApprovals.filter(approval => {
    if (filterStatus === 'all') return true;
    return approval.approval_status === filterStatus;
  });

  const filteredRegistrations = semesterRegistrations.filter(registration => {
    if (registrationFilterStatus === 'all') return true;
    return registration.registration_status === registrationFilterStatus;
  });

  // Get students with valid payment approvals for registration
  const studentsWithValidPayments = students.filter(student => {
    const hasValidPayment = paymentApprovals.some(p =>
      p.student_id === student.id &&
      p.approval_status === 'approved' &&
      new Date(p.access_valid_until) >= new Date()
    );

    // Check if already registered for active semester
    const alreadyRegistered = semesterRegistrations.some(r =>
      r.student_id === student.id &&
      r.semester_period_id === activeSemester?.id &&
      r.registration_status !== 'cancelled'
    );

    return hasValidPayment && !alreadyRegistered;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'revoked':
        return 'bg-orange-100 text-orange-800';
      case 'expired':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const isAccessExpired = (validUntil: string) => {
    return new Date(validUntil) < new Date();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Payment Approval & Student Registration</h2>
        <div className="flex space-x-3">
          {activeTab === 'approvals' && (
            <button
              onClick={() => setShowApprovalForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              Approve New Payment
            </button>
          )}
          {activeTab === 'registrations' && (
            <button
              onClick={() => setShowRegisterForm(true)}
              disabled={!activeSemester || studentsWithValidPayments.length === 0}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
            >
              Register Student
            </button>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('approvals')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'approvals'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Payment Approvals ({paymentApprovals.length})
          </button>
          <button
            onClick={() => setActiveTab('registrations')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'registrations'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Student Registrations ({semesterRegistrations.length})
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'approvals' && (
        <>
          {/* Two-Step Process Info */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-amber-400">ℹ️</span>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-amber-800">Two-Step Approval Process</h3>
            <div className="mt-2 text-sm text-amber-700">
              <p><strong>Step 1:</strong> Approve student payment (creates payment approval record)</p>
              <p><strong>Step 2:</strong> Register student for semester (go to Student Registrations tab)</p>
              <p><strong>Access:</strong> Students can only access their portal after BOTH steps are completed</p>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-red-400">⚠️</span>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-green-400">✅</span>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-800">{success}</p>
            </div>
          </div>
        </div>
      )}

      {/* Payment Approval Form Modal */}
      {showApprovalForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Approve Payment Access</h3>
                <button
                  onClick={() => setShowApprovalForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="text-2xl">&times;</span>
                </button>
              </div>

              <form onSubmit={handleApprovePayment} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Student
                  </label>
                  <select
                    required
                    value={approvalForm.student_id}
                    onChange={(e) => setApprovalForm(prev => ({ ...prev, student_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select a student</option>
                    {students.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.student_id} - {student.first_name} {student.last_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Amount Paid ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={approvalForm.amount_paid || ''}
                      onChange={(e) => setApprovalForm(prev => ({ 
                        ...prev, 
                        amount_paid: parseFloat(e.target.value) || 0 
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Reference
                    </label>
                    <input
                      type="text"
                      value={approvalForm.payment_reference}
                      onChange={(e) => setApprovalForm(prev => ({ 
                        ...prev, 
                        payment_reference: e.target.value 
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Payment reference number"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Date
                    </label>
                    <input
                      type="date"
                      required
                      value={approvalForm.payment_date}
                      onChange={(e) => setApprovalForm(prev => ({ 
                        ...prev, 
                        payment_date: e.target.value 
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Access Valid From
                    </label>
                    <input
                      type="date"
                      required
                      value={approvalForm.access_valid_from}
                      onChange={(e) => setApprovalForm(prev => ({ 
                        ...prev, 
                        access_valid_from: e.target.value 
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Access Valid Until
                    </label>
                    <input
                      type="date"
                      required
                      value={approvalForm.access_valid_until}
                      onChange={(e) => setApprovalForm(prev => ({ 
                        ...prev, 
                        access_valid_until: e.target.value 
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Approval Notes
                  </label>
                  <textarea
                    rows={3}
                    value={approvalForm.approval_notes}
                    onChange={(e) => setApprovalForm(prev => ({ 
                      ...prev, 
                      approval_notes: e.target.value 
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Optional approval notes"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowApprovalForm(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Approving...' : 'Approve Payment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Payment Approvals Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Payment Approvals</h3>
          <div className="flex items-center space-x-4">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="expired">Expired</option>
            </select>
            <div className="text-sm text-gray-500">
              {filteredApprovals.length} approval(s) found
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading payment approvals...</p>
          </div>
        ) : filteredApprovals.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Access Period
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Semester Registration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Approved By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredApprovals.map((approval) => (
                  <tr key={approval.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {approval.students?.first_name} {approval.students?.last_name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {approval.students?.student_id}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(approval.amount_paid)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(approval.payment_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <p>{new Date(approval.access_valid_from).toLocaleDateString()} - {new Date(approval.access_valid_until).toLocaleDateString()}</p>
                        {isAccessExpired(approval.access_valid_until) && approval.approval_status === 'approved' && (
                          <p className="text-red-600 text-xs">⚠️ Expired</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(approval.approval_status)}`}>
                        {approval.approval_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {(() => {
                        const regStatus = getStudentRegistrationStatus(approval.student_id);
                        return (
                          <div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${regStatus.color}`}>
                              {regStatus.status}
                            </span>
                            <p className="text-xs text-gray-500 mt-1">{regStatus.semester}</p>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {approval.accountants?.full_name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {approval.approval_status === 'pending' && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              const notes = prompt('Enter rejection notes:');
                              if (notes) {
                                handleRejectApproval(approval.id, notes);
                              }
                            }}
                            className="text-red-600 hover:text-red-900"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      {approval.approval_status === 'approved' && (
                        <div className="flex flex-col space-y-1">
                          <span className="text-green-600">✓ Approved</span>
                          <div className="flex flex-col space-y-1">
                            <button
                              onClick={() => {
                                const notes = prompt('Enter reason for revoking this payment approval:');
                                if (notes && confirm('Are you sure you want to revoke this payment approval? This will restrict the student\'s access immediately.')) {
                                  handleUnapprovePayment(approval.id, notes);
                                }
                              }}
                              className="text-orange-600 hover:text-orange-900 text-xs"
                            >
                              Revoke This Payment
                            </button>
                            <button
                              onClick={() => {
                                const studentName = `${approval.students?.first_name} ${approval.students?.last_name}`;
                                handleTerminateStudentAccess(approval.student_id, studentName);
                              }}
                              className="text-red-600 hover:text-red-900 text-xs"
                            >
                              Terminate All Access
                            </button>
                          </div>
                        </div>
                      )}
                      {approval.approval_status === 'rejected' && (
                        <span className="text-red-600">✗ Rejected</span>
                      )}
                      {approval.approval_status === 'revoked' && (
                        <span className="text-orange-600">⚠️ Revoked</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">💰</span>
            </div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">No Payment Approvals</h4>
            <p className="text-gray-600 mb-4">No payment approvals found. This could be because:</p>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 text-left max-w-md mx-auto">
              <h5 className="font-medium text-yellow-800 mb-2">Possible Issues:</h5>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• The payment_approvals table doesn't exist</li>
                <li>• No payment approvals have been created yet</li>
                <li>• Database connection issues</li>
                <li>• Permission problems</li>
              </ul>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => console.log('Current data:', { students, paymentApprovals, semesterRegistrations })}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                Debug: Log Current Data
              </button>

              <div className="text-sm text-gray-500">
                <p>Students loaded: {students.length}</p>
                <p>Payment approvals loaded: {paymentApprovals.length}</p>
                <p>Semester registrations loaded: {semesterRegistrations.length}</p>
              </div>

              <div className="mt-4 space-y-3">
                <p className="text-sm text-gray-600 mb-2">
                  If the payment_approvals table doesn't exist, go to the Database Setup tab to create it.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={() => setShowApprovalForm(true)}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
                  >
                    Create First Payment Approval
                  </button>
                  <button
                    onClick={handleCreateTestData}
                    disabled={loading || students.length === 0}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Creating...' : 'Create Test Data'}
                  </button>
                </div>
                {students.length === 0 && (
                  <p className="text-xs text-red-600">
                    Note: You need at least one student in the system to create test payment approvals.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
        </>
      )}

      {/* Student Registrations Tab */}
      {activeTab === 'registrations' && (
        <>
          {/* Active Semester Info */}
          {activeSemester ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <span className="text-blue-400">📅</span>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">Active Semester</h3>
                  <p className="text-sm text-blue-700">
                    {activeSemester.semester_name} {activeSemester.academic_year}
                    (Semester {activeSemester.semester_number})
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Registration: {activeSemester.is_registration_open ? 'Open' : 'Closed'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <span className="text-yellow-400">⚠️</span>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">No Active Semester</h3>
                  <p className="text-sm text-yellow-700">
                    Please create and activate a semester period before registering students.
                  </p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <span className="text-red-400">❌</span>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <span className="text-green-400">✅</span>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">Success</h3>
                  <p className="text-sm text-green-700">{success}</p>
                </div>
              </div>
            </div>
          )}

          {/* Student Registration Form */}
          {showRegisterForm && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Register Student for Semester</h3>
                <button
                  onClick={() => {
                    setShowRegisterForm(false);
                    setSelectedStudentForRegistration('');
                    setError('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Student
                  </label>
                  <select
                    value={selectedStudentForRegistration}
                    onChange={(e) => setSelectedStudentForRegistration(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Choose a student...</option>
                    {studentsWithValidPayments.map(student => (
                      <option key={student.id} value={student.id}>
                        {student.student_id} - {student.first_name} {student.last_name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Only students with valid payment approvals are shown
                  </p>
                </div>

                {activeSemester && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Registration Details</h4>
                    <p className="text-sm text-gray-600">
                      <strong>Semester:</strong> {activeSemester.semester_name} {activeSemester.academic_year}
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Period:</strong> {new Date(activeSemester.start_date).toLocaleDateString()} - {new Date(activeSemester.end_date).toLocaleDateString()}
                    </p>
                  </div>
                )}

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowRegisterForm(false);
                      setSelectedStudentForRegistration('');
                      setError('');
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRegisterStudent}
                    disabled={loading || !selectedStudentForRegistration || !activeSemester}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Registering...' : 'Register Student'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Student Registrations Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Student Registrations</h3>
              <div className="flex items-center space-x-4">
                <select
                  value={registrationFilterStatus}
                  onChange={(e) => setRegistrationFilterStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading registrations...</p>
              </div>
            ) : filteredRegistrations.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Student
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Semester
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Registration Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Payment Reference
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredRegistrations.map((registration) => (
                      <tr key={registration.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {registration.students?.student_id}
                            </div>
                            <div className="text-sm text-gray-500">
                              {registration.students?.first_name} {registration.students?.last_name}
                            </div>
                            <div className="text-xs text-gray-400">
                              {registration.students?.email}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {registration.semester_periods?.semester_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {registration.semester_periods?.academic_year}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(registration.registration_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(registration.registration_status)}`}>
                            {registration.registration_status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {registration.payment_approvals?.payment_reference || 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📚</span>
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">No Registrations Found</h4>
                <p className="text-gray-600 mb-4">No student registrations found. Students will appear here when they register for semesters.</p>

                <div className="text-sm text-gray-500">
                  <p>Students loaded: {students.length}</p>
                  <p>Students with valid payments: {studentsWithValidPayments.length}</p>
                  <p>Active semester: {activeSemester ? 'Yes' : 'No'}</p>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default PaymentApprovalManager;
