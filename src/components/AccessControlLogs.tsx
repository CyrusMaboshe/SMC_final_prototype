'use client';

import React, { useState, useEffect } from 'react';
import { accountantAPI } from '@/lib/supabase';

interface AccessControlLogsProps {
  accountantId: string;
}

interface AccessLog {
  id: string;
  student_id: string;
  action_type: string;
  reason?: string;
  payment_approval_id?: string;
  semester_registration_id?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  students?: {
    student_id: string;
    first_name: string;
    last_name: string;
  };
}

const AccessControlLogs: React.FC<AccessControlLogsProps> = ({ accountantId }) => {
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterStudent, setFilterStudent] = useState<string>('');
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days ago
    to: new Date().toISOString().split('T')[0] // today
  });

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      setLoading(true);
      setError('');

      const data = await accountantAPI.getAccessControlLogs();
      setLogs(data || []);

    } catch (error: any) {
      console.error('Error loading access logs:', error);
      setError('Failed to load access control logs');
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    // Filter by action type
    if (filterAction !== 'all' && log.action_type !== filterAction) {
      return false;
    }

    // Filter by student
    if (filterStudent && !log.students?.student_id.toLowerCase().includes(filterStudent.toLowerCase()) &&
        !`${log.students?.first_name} ${log.students?.last_name}`.toLowerCase().includes(filterStudent.toLowerCase())) {
      return false;
    }

    // Filter by date range
    const logDate = new Date(log.created_at).toISOString().split('T')[0];
    if (logDate < dateRange.from || logDate > dateRange.to) {
      return false;
    }

    return true;
  });

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'login_attempt':
        return '🔑';
      case 'access_granted':
        return '✅';
      case 'access_denied':
        return '🚫';
      case 'auto_expire':
        return '⏰';
      case 'manual_revoke':
        return '🔒';
      case 'payment_approved':
        return '💰';
      case 'semester_approved':
        return '📚';
      default:
        return '📝';
    }
  };

  const getActionColor = (actionType: string) => {
    switch (actionType) {
      case 'access_granted':
      case 'payment_approved':
      case 'semester_approved':
        return 'bg-green-100 text-green-800';
      case 'access_denied':
      case 'manual_revoke':
        return 'bg-red-100 text-red-800';
      case 'auto_expire':
        return 'bg-yellow-100 text-yellow-800';
      case 'login_attempt':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const exportLogs = () => {
    const csvContent = [
      ['Date/Time', 'Student ID', 'Student Name', 'Action', 'Reason', 'IP Address'].join(','),
      ...filteredLogs.map(log => [
        formatDateTime(log.created_at),
        log.students?.student_id || 'N/A',
        `${log.students?.first_name || ''} ${log.students?.last_name || ''}`.trim() || 'N/A',
        log.action_type,
        log.reason || 'N/A',
        log.ip_address || 'N/A'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `access_control_logs_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const uniqueActionTypes = [...new Set(logs.map(log => log.action_type))];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Access Control Logs</h2>
        <div className="flex items-center space-x-4">
          <button
            onClick={exportLogs}
            disabled={filteredLogs.length === 0}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
          >
            Export CSV
          </button>
          <button
            onClick={loadLogs}
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

      {/* Filter Controls */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Action Type
            </label>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Actions</option>
              {uniqueActionTypes.map(action => (
                <option key={action} value={action}>
                  {action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Student Search
            </label>
            <input
              type="text"
              value={filterStudent}
              onChange={(e) => setFilterStudent(e.target.value)}
              placeholder="Search by student ID or name..."
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
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {filteredLogs.length} of {logs.length} log entries
          </div>
          <button
            onClick={() => {
              setFilterAction('all');
              setFilterStudent('');
              setDateRange({
                from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                to: new Date().toISOString().split('T')[0]
              });
            }}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Access Control Events</h3>
        
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading access logs...</p>
          </div>
        ) : filteredLogs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date/Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reason
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    IP Address
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDateTime(log.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {log.students?.first_name} {log.students?.last_name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {log.students?.student_id}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="mr-2 text-lg">{getActionIcon(log.action_type)}</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getActionColor(log.action_type)}`}>
                          {log.action_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {log.reason || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.ip_address || 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">📜</span>
            </div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">No Logs Found</h4>
            <p className="text-gray-600">
              No access control logs match your current filters. Try adjusting the date range or clearing filters.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccessControlLogs;
