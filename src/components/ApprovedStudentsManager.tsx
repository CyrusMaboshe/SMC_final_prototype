'use client';

import React, { useState, useEffect } from 'react';
import { accountantAPI } from '@/lib/supabase';
import { setupAccessControlTablesAlternative } from '@/utils/setupAccessControlTables';

interface ApprovedStudentsManagerProps {
  accountantId: string;
}

interface ApprovedStudent {
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
  };
  semester_info: {
    registration_status: string;
    semester_name: string;
    academic_year: string;
  } | null;
  has_full_access: boolean;
}

const ApprovedStudentsManager: React.FC<ApprovedStudentsManagerProps> = ({ accountantId }) => {
  const [approvedStudents, setApprovedStudents] = useState<ApprovedStudent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAccess, setFilterAccess] = useState<string>('all'); // all, full_access, payment_only

  useEffect(() => {
    loadApprovedStudents();
  }, []);

  const loadApprovedStudents = async () => {
    try {
      setLoading(true);
      setError('');

      // First check if tables exist
      const setupResult = await setupAccessControlTablesAlternative();
      if (!setupResult.success && setupResult.setupRequired) {
        setError('Access control tables are not set up. Please contact your administrator to run the database setup.');
        return;
      }

      const students = await accountantAPI.getAllApprovedStudents();
      setApprovedStudents(students as ApprovedStudent[] || []);

    } catch (error: any) {
      console.error('Error loading approved students:', error);

      // Provide more specific error messages
      if (error.message?.includes('relation') || error.message?.includes('table')) {
        setError('Database tables not found. Please ensure the access control tables are set up properly.');
      } else if (error.message?.includes('permission')) {
        setError('Permission denied. Please check your account permissions.');
      } else {
        setError(`Failed to load approved students: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTerminateAccess = async (studentId: string, studentName: string) => {
    const reason = prompt(`Enter reason for terminating access for ${studentName}:`);
    if (!reason) return;

    const confirmed = confirm(
      `Are you sure you want to terminate access for ${studentName}?\n\n` +
      `This will:\n` +
      `• Revoke all active payment approvals\n` +
      `• Cancel all active semester registrations\n` +
      `• Immediately restrict student portal access\n\n` +
      `This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setLoading(true);
      setError('');

      await accountantAPI.terminateStudentAccess(studentId, reason, accountantId);

      // Reload the data to reflect changes
      await loadApprovedStudents();

      alert(`Access terminated successfully for ${studentName}`);
    } catch (error: any) {
      setError(`Failed to terminate access: ${error.message || 'Unknown error'}`);
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

  const isAccessExpiring = (validUntil: string) => {
    const expiryDate = new Date(validUntil);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 7 && daysUntilExpiry > 0;
  };

  const isAccessExpired = (validUntil: string) => {
    return new Date(validUntil) < new Date();
  };

  const getAccessStatusBadge = (student: ApprovedStudent) => {
    if (isAccessExpired(student.payment_info.access_valid_until)) {
      return <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">Expired</span>;
    }

    if (isAccessExpiring(student.payment_info.access_valid_until)) {
      return <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Expiring Soon</span>;
    }

    // Payment approval is now sufficient for full access
    return <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Active Access</span>;
  };

  // Filter students based on search term and access filter
  const filteredStudents = approvedStudents.filter(student => {
    const matchesSearch = 
      student.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.student_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = 
      filterAccess === 'all' ||
      (filterAccess === 'full_access' && student.has_full_access) ||
      (filterAccess === 'payment_only' && !student.has_full_access);

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Approved Student Accounts</h2>
        <button
          onClick={loadApprovedStudents}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
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
            <label htmlFor="accessFilter" className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Access Level
            </label>
            <select
              id="accessFilter"
              value={filterAccess}
              onChange={(e) => setFilterAccess(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Approved Students</option>
              <option value="full_access">With Semester Registration</option>
              <option value="payment_only">Payment Approved (Access Granted)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-2xl">✅</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-600">Total Approved</p>
              <p className="text-2xl font-bold text-green-900">{approvedStudents.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-2xl">🎓</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-blue-600">With Registration</p>
              <p className="text-2xl font-bold text-blue-900">
                {approvedStudents.filter(s => s.has_full_access).length}
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
                {approvedStudents.filter(s => isAccessExpiring(s.payment_info.access_valid_until)).length}
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
              <p className="text-sm font-medium text-red-600">Expired</p>
              <p className="text-2xl font-bold text-red-900">
                {approvedStudents.filter(s => isAccessExpired(s.payment_info.access_valid_until)).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {filteredStudents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
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
                    Semester Registration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Access Status
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
                      {isAccessExpiring(student.payment_info.access_valid_until) && (
                        <div className="text-xs text-yellow-600">⚠️ Expires in {Math.ceil((new Date(student.payment_info.access_valid_until).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days</div>
                      )}
                      {isAccessExpired(student.payment_info.access_valid_until) && (
                        <div className="text-xs text-red-600">🚫 Expired</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {student.semester_info ? (
                        <div>
                          <div className="text-sm text-gray-900">
                            {student.semester_info.semester_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {student.semester_info.academic_year}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">Not Registered</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getAccessStatusBadge(student)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {!isAccessExpired(student.payment_info.access_valid_until) ? (
                        <button
                          onClick={() => handleTerminateAccess(student.id, `${student.first_name} ${student.last_name}`)}
                          disabled={loading}
                          className="text-red-600 hover:text-red-900 disabled:opacity-50"
                        >
                          Terminate Access
                        </button>
                      ) : (
                        <span className="text-gray-400">Expired</span>
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
              <span className="text-2xl">👥</span>
            </div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">No Approved Students</h4>
            <p className="text-gray-600">
              {searchTerm || filterAccess !== 'all' 
                ? 'No students match your current filters.' 
                : 'No students have approved payment access yet.'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ApprovedStudentsManager;
