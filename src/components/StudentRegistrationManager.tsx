'use client';

import React, { useState, useEffect } from 'react';
import { accountantAPI, supabase } from '@/lib/supabase';

interface StudentRegistrationManagerProps {
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

interface SemesterPeriod {
  id: string;
  semester_name: string;
  academic_year: string;
  semester_number: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  is_registration_open: boolean;
}

interface StudentRegistration {
  id: string;
  student_id: string;
  semester_period_id: string;
  registration_date: string;
  approved_by?: string;
  approval_date?: string;
  registration_status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  payment_approval_id?: string;
  registration_notes?: string;
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
    start_date: string;
    end_date: string;
  };
  payment_approvals?: {
    amount_paid: number;
    payment_reference: string;
    access_valid_until: string;
  };
}

const StudentRegistrationManager: React.FC<StudentRegistrationManagerProps> = ({ accountantId }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [semesterPeriods, setSemesterPeriods] = useState<SemesterPeriod[]>([]);
  const [registrations, setRegistrations] = useState<StudentRegistration[]>([]);
  const [paymentApprovals, setPaymentApprovals] = useState<any[]>([]);
  const [activeSemester, setActiveSemester] = useState<SemesterPeriod | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [selectedRegistrations, setSelectedRegistrations] = useState<string[]>([]);
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [selectedStudentForRegistration, setSelectedStudentForRegistration] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const [
        studentsData,
        semestersData,
        registrationsData,
        paymentsData,
        activeData
      ] = await Promise.all([
        accountantAPI.getAllStudents().catch(() => []),
        accountantAPI.getAllSemesterPeriods().catch(() => []),
        accountantAPI.getStudentSemesterRegistrations().catch(() => []),
        accountantAPI.getAllPaymentApprovals().catch(() => []),
        accountantAPI.getActiveSemester().catch(() => null)
      ]);

      setStudents(studentsData || []);
      setSemesterPeriods(semestersData || []);
      setRegistrations(registrationsData || []);
      setPaymentApprovals(paymentsData || []);
      setActiveSemester(activeData);

    } catch (error: any) {
      console.error('Error loading data:', error);
      setError('Failed to load registration data');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRegistration = async (registrationId: string, notes?: string) => {
    try {
      setLoading(true);
      setError('');

      const registration = registrations.find(r => r.id === registrationId);
      if (!registration) {
        setError('Registration not found');
        return;
      }

      // Find a valid payment approval for this student
      const validPayment = paymentApprovals.find(p => 
        p.student_id === registration.student_id && 
        p.approval_status === 'approved'
      );

      await accountantAPI.approveSemesterRegistration({
        student_id: registration.student_id,
        semester_period_id: registration.semester_period_id,
        payment_approval_id: validPayment?.id,
        registration_notes: notes
      }, accountantId);

      setSuccess('Registration approved successfully!');
      await loadData();

    } catch (error: any) {
      setError(error.message || 'Failed to approve registration');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectRegistration = async (registrationId: string, reason: string) => {
    try {
      setLoading(true);
      setError('');

      const { error: updateError } = await supabase
        .from('student_semester_registrations')
        .update({
          registration_status: 'rejected',
          approved_by: accountantId,
          approval_date: new Date().toISOString(),
          registration_notes: reason,
          updated_at: new Date().toISOString()
        })
        .eq('id', registrationId);

      if (updateError) throw updateError;

      setSuccess('Registration rejected successfully!');
      await loadData();

    } catch (error: any) {
      setError(error.message || 'Failed to reject registration');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkApprove = async () => {
    try {
      setLoading(true);
      setError('');

      for (const registrationId of selectedRegistrations) {
        await handleApproveRegistration(registrationId, 'Bulk approval');
      }

      setSuccess(`${selectedRegistrations.length} registrations approved successfully!`);
      setSelectedRegistrations([]);
      setShowBulkActions(false);

    } catch (error: any) {
      setError(error.message || 'Failed to bulk approve registrations');
    } finally {
      setLoading(false);
    }
  };

  const registerStudentForSemester = async (studentId: string, semesterId: string) => {
    try {
      setLoading(true);
      setError('');

      // ENHANCED DATABASE-LEVEL PAYMENT VERIFICATION
      console.log('Performing database-level payment verification for student:', studentId);

      // Use the new database function for comprehensive verification
      const { data: verificationResult, error: verificationError } = await supabase
        .rpc('register_student_with_payment_verification', {
          p_student_id: studentId,
          p_semester_period_id: semesterId,
          p_registered_by: accountantId,
          p_registration_notes: 'Registration requested by accounts office'
        });

      if (verificationError) {
        console.error('Database verification error:', verificationError);
        setError(`Database verification failed: ${verificationError.message}`);
        return;
      }

      const result = verificationResult?.[0];

      if (!result) {
        setError('No verification result returned from database');
        return;
      }

      console.log('Database verification result:', result);

      if (!result.success) {
        setError(`Registration denied: ${result.message}`);
        return;
      }

      // Registration successful with payment verification
      const student = students.find(s => s.id === studentId);
      const semester = semesterPeriods.find(s => s.id === semesterId);

      setSuccess(
        `✅ Registration successful for ${student?.first_name} ${student?.last_name} ` +
        `in ${semester?.semester_name} ${semester?.academic_year}. ` +
        `Payment verification passed. Registration ID: ${result.registration_id}`
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

  const handleRegisterStudent = async () => {
    if (!selectedStudentForRegistration || !activeSemester) {
      setError('Please select a student and ensure there is an active semester');
      return;
    }

    await registerStudentForSemester(selectedStudentForRegistration, activeSemester.id);
  };

  const filteredRegistrations = registrations.filter(registration => {
    if (filterStatus === 'all') return true;
    return registration.registration_status === filterStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStudentPaymentStatus = (studentId: string) => {
    const payment = paymentApprovals.find(p =>
      p.student_id === studentId &&
      p.approval_status === 'approved' &&
      new Date(p.access_valid_until) >= new Date()
    );
    return payment ? 'Valid Payment' : 'No Valid Payment';
  };

  const hasApprovedPayment = (studentId: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison

    const approvedPayment = paymentApprovals.find(p => {
      const isStudentMatch = p.student_id === studentId;
      const isApproved = p.approval_status === 'approved';
      const validUntilDate = new Date(p.access_valid_until);
      const isNotExpired = validUntilDate >= today;

      return isStudentMatch && isApproved && isNotExpired;
    });

    return !!approvedPayment;
  };

  // VERIFIED PAYMENT REQUIREMENT: Only show students with verified payment approvals
  const studentsWithApprovedPayments = students.filter(student => {
    const hasPayment = hasApprovedPayment(student.id);
    console.log(`Student ${student.first_name} ${student.last_name} (${student.id}): has verified payment = ${hasPayment}`);
    return hasPayment;
  });

  // Debug logging
  console.log('Total students:', students.length);
  console.log('Payment approvals:', paymentApprovals.length);
  console.log('Students with verified payments:', studentsWithApprovedPayments.length);
  console.log('Note: Only students with verified payment approvals can be registered');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Student Semester Registrations</h2>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowRegisterForm(!showRegisterForm)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
          >
            {showRegisterForm ? 'Cancel Registration' : 'Register New Student'}
          </button>
          {selectedRegistrations.length > 0 && (
            <button
              onClick={() => setShowBulkActions(!showBulkActions)}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors"
            >
              Bulk Actions ({selectedRegistrations.length})
            </button>
          )}
          <button
            onClick={loadData}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
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

      {/* Active Semester Info */}
      {activeSemester && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-blue-900">
                Active Semester: {activeSemester.semester_name}
              </h3>
              <p className="text-blue-800">
                {activeSemester.academic_year} • {formatDate(activeSemester.start_date)} - {formatDate(activeSemester.end_date)}
              </p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              activeSemester.is_registration_open
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}>
              Registration {activeSemester.is_registration_open ? 'Open' : 'Closed'}
            </span>
          </div>
        </div>
      )}

      {/* Register New Student Form */}
      {showRegisterForm && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Register Student for Semester</h3>

          {!activeSemester ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800">⚠️ No active semester found. Please create and activate a semester first.</p>
            </div>
          ) : studentsWithApprovedPayments.length === 0 ? (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <p className="text-orange-800">⚠️ No students with verified payment approvals found.</p>
              <div className="mt-2 text-sm text-orange-700">
                <p>Current status:</p>
                <p>• Total students: {students.length}</p>
                <p>• Students with verified payments: {studentsWithApprovedPayments.length}</p>
                <p>• Payment approvals in system: {paymentApprovals.length}</p>
                <p>• Approved payments: {paymentApprovals.filter(p => p.approval_status === 'approved').length}</p>
              </div>
              <div className="mt-3 p-3 bg-orange-100 rounded">
                <p className="text-sm text-orange-800 font-medium">Required for Registration:</p>
                <p className="text-sm text-orange-700">
                  Students must have verified payment approval before they can be registered for a semester.
                  Please approve student payments first in the Payment Approvals tab.
                </p>
              </div>
              {paymentApprovals.length > 0 && (
                <div className="mt-2 space-x-4">
                  <button
                    onClick={() => console.log('Payment approvals:', paymentApprovals)}
                    className="text-orange-600 hover:text-orange-800 text-sm underline"
                  >
                    Debug: Log payment approvals
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Student (Only students with verified payment approvals)
                </label>
                <select
                  value={selectedStudentForRegistration}
                  onChange={(e) => setSelectedStudentForRegistration(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a student...</option>
                  {studentsWithApprovedPayments.map((student) => {
                    // Check if already registered
                    const isAlreadyRegistered = registrations.some(
                      reg => reg.student_id === student.id && reg.semester_period_id === activeSemester.id
                    );

                    if (isAlreadyRegistered) return null;

                    return (
                      <option key={student.id} value={student.id}>
                        {student.first_name} {student.last_name} ({student.student_id}) - {getStudentPaymentStatus(student.id)}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Registration Details:</h4>
                <p className="text-sm text-gray-600">
                  <strong>Semester:</strong> {activeSemester.semester_name} ({activeSemester.academic_year})
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Status:</strong> Registration will be created as "Pending" and require approval
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Requirement:</strong> Student must have verified payment approval before registration. Payment verification is checked through database.
                </p>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={handleRegisterStudent}
                  disabled={!selectedStudentForRegistration || loading}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Registering...' : 'Register Student'}
                </button>
                <button
                  onClick={() => {
                    setShowRegisterForm(false);
                    setSelectedStudentForRegistration('');
                  }}
                  className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bulk Actions Panel */}
      {showBulkActions && selectedRegistrations.length > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-purple-900">
              Bulk Actions ({selectedRegistrations.length} selected)
            </h3>
            <div className="flex space-x-3">
              <button
                onClick={handleBulkApprove}
                disabled={loading}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
              >
                Approve All
              </button>
              <button
                onClick={() => {
                  setSelectedRegistrations([]);
                  setShowBulkActions(false);
                }}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter Controls */}
      <div className="flex items-center justify-between">
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
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div className="text-sm text-gray-500">
          {filteredRegistrations.length} registration(s) found
        </div>
      </div>

      {/* Registrations Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Student Registrations</h3>

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
                    <input
                      type="checkbox"
                      checked={selectedRegistrations.length === filteredRegistrations.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedRegistrations(filteredRegistrations.map(r => r.id));
                        } else {
                          setSelectedRegistrations([]);
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
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
                    Payment Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRegistrations.map((registration) => (
                  <tr key={registration.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedRegistrations.includes(registration.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRegistrations(prev => [...prev, registration.id]);
                          } else {
                            setSelectedRegistrations(prev => prev.filter(id => id !== registration.id));
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {registration.students?.first_name} {registration.students?.last_name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {registration.students?.student_id}
                        </p>
                        <p className="text-sm text-gray-500">
                          {registration.students?.email}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {registration.semester_periods?.semester_name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {registration.semester_periods?.academic_year}
                        </p>
                        <p className="text-sm text-gray-500">
                          Semester {registration.semester_periods?.semester_number}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(registration.registration_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        getStudentPaymentStatus(registration.student_id) === 'Valid Payment'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {getStudentPaymentStatus(registration.student_id)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(registration.registration_status)}`}>
                        {registration.registration_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {registration.registration_status === 'pending' && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              const notes = prompt('Enter approval notes (optional):');
                              handleApproveRegistration(registration.id, notes || undefined);
                            }}
                            className="text-green-600 hover:text-green-900"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => {
                              const reason = prompt('Enter rejection reason:');
                              if (reason) {
                                handleRejectRegistration(registration.id, reason);
                              }
                            }}
                            className="text-red-600 hover:text-red-900"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      {registration.registration_status === 'approved' && (
                        <span className="text-green-600">✓ Approved</span>
                      )}
                      {registration.registration_status === 'rejected' && (
                        <span className="text-red-600">✗ Rejected</span>
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
              <span className="text-2xl">📚</span>
            </div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">No Registrations Found</h4>
            <p className="text-gray-600">
              {filterStatus === 'all'
                ? 'No student registrations found. Students will appear here when they register for semesters.'
                : `No ${filterStatus} registrations found.`
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentRegistrationManager;
