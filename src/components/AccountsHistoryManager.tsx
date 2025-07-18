'use client';

import React, { useState, useEffect } from 'react';
import { accountantAPI } from '@/lib/supabase';

interface AccountsHistoryManagerProps {
  accountantId: string;
}

interface HistoryRecord {
  id: string;
  type: 'payment' | 'registration' | 'semester' | 'access_log';
  date: string;
  student?: {
    student_id: string;
    first_name: string;
    last_name: string;
  };
  title: string;
  description: string;
  status: string;
  amount?: number;
  details: any;
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

const AccountsHistoryManager: React.FC<AccountsHistoryManagerProps> = ({ accountantId }) => {
  const [historyRecords, setHistoryRecords] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    to: new Date().toISOString().split('T')[0] // today
  });

  useEffect(() => {
    loadHistoryData();
  }, []);

  const loadHistoryData = async () => {
    try {
      setLoading(true);
      setError('');

      const [
        paymentApprovals,
        studentRegistrations,
        semesterPeriods,
        accessLogs
      ] = await Promise.all([
        accountantAPI.getAllPaymentApprovals(),
        accountantAPI.getAllSemesterRegistrations(),
        accountantAPI.getAllSemesterPeriods(),
        accountantAPI.getAccessControlLogs()
      ]);

      const records: HistoryRecord[] = [];

      // Process payment approvals
      paymentApprovals?.forEach(payment => {
        records.push({
          id: `payment-${payment.id}`,
          type: 'payment',
          date: payment.approval_date || payment.created_at,
          student: payment.students,
          title: `Payment Approval - $${payment.amount_paid}`,
          description: `Payment reference: ${payment.payment_reference || 'N/A'}`,
          status: payment.approval_status,
          amount: payment.amount_paid,
          details: payment
        });
      });

      // Process student registrations
      studentRegistrations?.forEach(registration => {
        records.push({
          id: `registration-${registration.id}`,
          type: 'registration',
          date: registration.approval_date || registration.created_at,
          student: registration.students,
          title: `Semester Registration`,
          description: `${registration.semester_periods?.semester_name} - ${registration.semester_periods?.academic_year}`,
          status: registration.registration_status,
          details: registration
        });
      });

      // Process semester periods
      semesterPeriods?.forEach(semester => {
        records.push({
          id: `semester-${semester.id}`,
          type: 'semester',
          date: semester.created_at,
          title: `Semester Created: ${semester.semester_name}`,
          description: `${semester.academic_year} - ${semester.is_active ? 'Active' : 'Inactive'}`,
          status: semester.is_active ? 'active' : 'inactive',
          details: semester
        });
      });

      // Process access logs
      accessLogs?.forEach(log => {
        records.push({
          id: `log-${log.id}`,
          type: 'access_log',
          date: log.created_at,
          student: log.students,
          title: `Access Control: ${log.action_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`,
          description: log.reason || 'No reason provided',
          status: log.action_type,
          details: log
        });
      });

      // Sort by date (newest first)
      records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setHistoryRecords(records);

    } catch (error: any) {
      console.error('Error loading history data:', error);
      setError('Failed to load history data');
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = historyRecords.filter(record => {
    // Filter by type
    if (filterType !== 'all' && record.type !== filterType) {
      return false;
    }

    // Filter by status
    if (filterStatus !== 'all' && record.status !== filterStatus) {
      return false;
    }

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesTitle = record.title.toLowerCase().includes(searchLower);
      const matchesDescription = record.description.toLowerCase().includes(searchLower);
      const matchesStudent = record.student ? 
        `${record.student.first_name} ${record.student.last_name} ${record.student.student_id}`.toLowerCase().includes(searchLower) : false;
      
      if (!matchesTitle && !matchesDescription && !matchesStudent) {
        return false;
      }
    }

    // Filter by date range
    const recordDate = new Date(record.date).toISOString().split('T')[0];
    if (recordDate < dateRange.from || recordDate > dateRange.to) {
      return false;
    }

    return true;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'payment':
        return '💰';
      case 'registration':
        return '📚';
      case 'semester':
        return '📅';
      case 'access_log':
        return '📜';
      default:
        return '📝';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'payment':
        return 'bg-green-100 text-green-800';
      case 'registration':
        return 'bg-blue-100 text-blue-800';
      case 'semester':
        return 'bg-purple-100 text-purple-800';
      case 'access_log':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string, type: string) => {
    if (type === 'payment' || type === 'registration') {
      switch (status) {
        case 'approved':
          return 'bg-green-100 text-green-800';
        case 'pending':
          return 'bg-yellow-100 text-yellow-800';
        case 'rejected':
          return 'bg-red-100 text-red-800';
        default:
          return 'bg-gray-100 text-gray-800';
      }
    } else if (type === 'semester') {
      return status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
    } else {
      return 'bg-blue-100 text-blue-800';
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const exportHistory = () => {
    const csvContent = [
      ['Date/Time', 'Type', 'Student ID', 'Student Name', 'Title', 'Description', 'Status', 'Amount'].join(','),
      ...filteredRecords.map(record => [
        formatDateTime(record.date),
        record.type,
        record.student?.student_id || 'N/A',
        record.student ? `${record.student.first_name} ${record.student.last_name}` : 'N/A',
        record.title,
        record.description,
        record.status,
        record.amount || 'N/A'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `accounts_history_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const uniqueStatuses = [...new Set(filteredRecords.map(record => record.status))];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Accounts History</h2>
        <div className="flex items-center space-x-4">
          <button
            onClick={exportHistory}
            disabled={filteredRecords.length === 0}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
          >
            Export CSV
          </button>
          <button
            onClick={loadHistoryData}
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

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-2xl">💰</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Payment Records</p>
              <p className="text-2xl font-bold text-gray-900">
                {historyRecords.filter(r => r.type === 'payment').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-2xl">📚</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Registration Records</p>
              <p className="text-2xl font-bold text-gray-900">
                {historyRecords.filter(r => r.type === 'registration').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-2xl">📅</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Semester Records</p>
              <p className="text-2xl font-bold text-gray-900">
                {historyRecords.filter(r => r.type === 'semester').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-2xl">📜</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Access Logs</p>
              <p className="text-2xl font-bold text-gray-900">
                {historyRecords.filter(r => r.type === 'access_log').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Record Type
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Types</option>
              <option value="payment">Payment Approvals</option>
              <option value="registration">Student Registrations</option>
              <option value="semester">Semester Periods</option>
              <option value="access_log">Access Logs</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Statuses</option>
              {uniqueStatuses.map(status => (
                <option key={status} value={status}>
                  {status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search records..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              From Date
            </label>
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To Date
            </label>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setFilterType('all');
                setFilterStatus('all');
                setSearchTerm('');
                setDateRange({
                  from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                  to: new Date().toISOString().split('T')[0]
                });
              }}
              className="w-full px-3 py-2 text-blue-600 hover:text-blue-800 text-sm border border-blue-300 rounded-lg hover:bg-blue-50"
            >
              Clear Filters
            </button>
          </div>
        </div>

        <div className="mt-4 text-sm text-gray-600">
          Showing {filteredRecords.length} of {historyRecords.length} records
        </div>
      </div>

      {/* History Records Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">History Records</h3>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading history records...</p>
          </div>
        ) : filteredRecords.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date/Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDateTime(record.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="mr-2 text-lg">{getTypeIcon(record.type)}</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(record.type)}`}>
                          {record.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {record.student ? (
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {record.student.first_name} {record.student.last_name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {record.student.student_id}
                          </p>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {record.title}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {record.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(record.status, record.type)}`}>
                        {record.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.amount ? `$${record.amount.toFixed(2)}` : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">📋</span>
            </div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">No Records Found</h4>
            <p className="text-gray-600">
              No history records match your current filters. Try adjusting the filters or date range.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountsHistoryManager;
