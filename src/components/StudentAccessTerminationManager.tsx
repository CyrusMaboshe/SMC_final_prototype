'use client';

import React, { useState, useEffect } from 'react';
import { accountantAPI } from '@/lib/supabase';

interface StudentAccessTerminationManagerProps {
  accountantId: string;
}

interface StudentWithAccess {
  id: string;
  student_id: string;
  first_name: string;
  last_name: string;
  email: string;
  program: string;
  year_of_study: number;
  semester: number;
  status: string;
  payment_info: {
    amount_paid: number;
    payment_date: string;
    access_valid_from: string;
    access_valid_until: string;
    approval_status: string;
    approval_notes?: string;
  };
  semester_info: {
    registration_status: string;
    semester_name: string;
    academic_year: string;
  } | null;
  access_status: {
    has_payment_approval: boolean;
    has_semester_registration: boolean;
    is_expired: boolean;
    is_expiring_soon: boolean;
    can_terminate: boolean;
  };
}

const StudentAccessTerminationManager: React.FC<StudentAccessTerminationManagerProps> = ({ accountantId }) => {
  const [studentsWithAccess, setStudentsWithAccess] = useState<StudentWithAccess[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all'); // all, active, expiring, expired
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [showBulkTermination, setShowBulkTermination] = useState(false);
  const [terminationReason, setTerminationReason] = useState('');

  useEffect(() => {
    loadStudentsWithAccess();
  }, []);

  const loadStudentsWithAccess = async () => {
    try {
      setLoading(true);
      setError('');

      const students = await accountantAPI.getStudentsWithActiveAccess();
      setStudentsWithAccess(students as StudentWithAccess[] || []);

    } catch (error: any) {
      console.error('Error loading students with access:', error);
      setError(`Failed to load students with access: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTerminateAccess = async (studentId: string, reason: string) => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      await accountantAPI.terminateStudentAccess(studentId, reason, accountantId);
      setSuccess('Student access terminated successfully!');
      
      await loadStudentsWithAccess();
    } catch (error: any) {
      setError(error.message || 'Failed to terminate student access');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkTermination = async () => {
    if (selectedStudents.length === 0) {
      setError('Please select at least one student');
      return;
    }

    if (!terminationReason.trim()) {
      setError('Please provide a reason for termination');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const result = await accountantAPI.bulkTerminateStudentAccess(selectedStudents, terminationReason, accountantId);
      setSuccess(`Bulk termination completed: ${result.summary}`);
      
      setSelectedStudents([]);
      setTerminationReason('');
      setShowBulkTermination(false);
      
      await loadStudentsWithAccess();
    } catch (error: any) {
      setError(error.message || 'Failed to perform bulk termination');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZM', {
      style: 'currency',
      currency: 'ZMW'
    }).format(amount);
  };

  const getAccessStatusBadge = (student: StudentWithAccess) => {
    if (student.access_status.is_expired) {
      return <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">Expired</span>;
    }

    if (student.access_status.is_expiring_soon) {
      return <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Expiring Soon</span>;
    }

    if (student.access_status.has_semester_registration) {
      return <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Active + Registered</span>;
    }

    return <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Active Access</span>;
  };

  const handleSelectStudent = (studentId: string) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleSelectAll = () => {
    const terminableStudents = filteredStudents.filter(s => s.access_status.can_terminate).map(s => s.id);
    setSelectedStudents(prev => 
      prev.length === terminableStudents.length ? [] : terminableStudents
    );
  };

  // Filter students based on search term and status filter
  const filteredStudents = studentsWithAccess.filter(student => {
    const matchesSearch = 
      student.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.student_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = 
      filterStatus === 'all' ||
      (filterStatus === 'active' && !student.access_status.is_expired && !student.access_status.is_expiring_soon) ||
      (filterStatus === 'expiring' && student.access_status.is_expiring_soon) ||
      (filterStatus === 'expired' && student.access_status.is_expired);

    return matchesSearch && matchesFilter;
  });

  const terminableStudents = filteredStudents.filter(s => s.access_status.can_terminate);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Student Access Termination</h2>
        <div className="flex space-x-3">
          {selectedStudents.length > 0 && (
            <button
              onClick={() => setShowBulkTermination(true)}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
            >
              Terminate Selected ({selectedStudents.length})
            </button>
          )}
          <button
            onClick={loadStudentsWithAccess}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-red-400 text-xl">⚠️</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-green-400 text-xl">✅</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">Success</h3>
              <div className="mt-2 text-sm text-green-700">
                <p>{success}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
              Search Students
            </label>
            <input
              type="text"
              id="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, student ID, or email..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="statusFilter" className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Access Status
            </label>
            <select
              id="statusFilter"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Students with Payment Approval</option>
              <option value="active">Active Access</option>
              <option value="expiring">Expiring Soon</option>
              <option value="expired">Expired Access</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-2xl">👥</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-blue-600">Total with Access</p>
              <p className="text-2xl font-bold text-blue-900">{studentsWithAccess.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-2xl">✅</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-600">Active Access</p>
              <p className="text-2xl font-bold text-green-900">
                {studentsWithAccess.filter(s => !s.access_status.is_expired && !s.access_status.is_expiring_soon).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-2xl">⏰</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-yellow-600">Expiring Soon</p>
              <p className="text-2xl font-bold text-yellow-900">
                {studentsWithAccess.filter(s => s.access_status.is_expiring_soon).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-red-50 rounded-lg p-4 border border-red-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-2xl">🚫</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-600">Can Terminate</p>
              <p className="text-2xl font-bold text-red-900">
                {terminableStudents.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Termination Modal */}
      {showBulkTermination && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Bulk Terminate Access
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                You are about to terminate access for {selectedStudents.length} students. This action cannot be undone.
              </p>
              <div className="mb-4">
                <label htmlFor="bulkReason" className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Termination *
                </label>
                <textarea
                  id="bulkReason"
                  value={terminationReason}
                  onChange={(e) => setTerminationReason(e.target.value)}
                  placeholder="Enter reason for terminating access..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  required
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowBulkTermination(false);
                    setTerminationReason('');
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkTermination}
                  disabled={loading || !terminationReason.trim()}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Terminating...' : 'Terminate Access'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Students Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {filteredStudents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={selectedStudents.length === terminableStudents.length && terminableStudents.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Program
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment Info
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Access Period
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
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedStudents.includes(student.id)}
                        onChange={() => handleSelectStudent(student.id)}
                        disabled={!student.access_status.can_terminate}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {student.first_name} {student.last_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {student.student_id} • {student.email}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{student.program}</div>
                      <div className="text-sm text-gray-500">
                        Year {student.year_of_study}, Semester {student.semester}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatCurrency(student.payment_info.amount_paid)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(student.payment_info.payment_date).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(student.payment_info.access_valid_from).toLocaleDateString()} -
                        {new Date(student.payment_info.access_valid_until).toLocaleDateString()}
                      </div>
                      {student.access_status.is_expiring_soon && (
                        <div className="text-xs text-yellow-600">
                          ⚠️ Expires in {Math.ceil((new Date(student.payment_info.access_valid_until).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days
                        </div>
                      )}
                      {student.access_status.is_expired && (
                        <div className="text-xs text-red-600">🚫 Expired</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getAccessStatusBadge(student)}
                      {student.semester_info && (
                        <div className="text-xs text-gray-500 mt-1">
                          {student.semester_info.semester_name}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {student.access_status.can_terminate ? (
                        <button
                          onClick={() => {
                            const reason = prompt('Enter reason for terminating access:');
                            if (reason && confirm(`Are you sure you want to terminate access for ${student.first_name} ${student.last_name}? This will revoke all active payment approvals and semester registrations.`)) {
                              handleTerminateAccess(student.id, reason);
                            }
                          }}
                          className="text-red-600 hover:text-red-900"
                        >
                          Terminate Access
                        </button>
                      ) : (
                        <span className="text-gray-400">
                          {student.access_status.is_expired ? 'Already Expired' : 'Cannot Terminate'}
                        </span>
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
              <span className="text-2xl">🔒</span>
            </div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">No Students Found</h4>
            <p className="text-gray-600">
              {searchTerm || filterStatus !== 'all'
                ? 'No students match your current filters.'
                : 'No students currently have active access.'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentAccessTerminationManager;
