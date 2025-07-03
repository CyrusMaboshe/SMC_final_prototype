'use client';

import React, { useState, useEffect } from 'react';
import { accountantAPI } from '@/lib/supabase';

interface AccountantLogsProps {
  accountantId: string;
}

interface LogEntry {
  id: string;
  accountant_id: string;
  accountant_name: string;
  action_type: string;
  entity_type: string;
  entity_id: string;
  student_id: string;
  student_name: string;
  description: string;
  old_values: any;
  new_values: any;
  ip_address: string;
  user_agent: string;
  created_at: string;
  created_date: string;
  created_hour: number;
  created_month: number;
  created_year: number;
}

const AccountantLogs: React.FC<AccountantLogsProps> = ({ accountantId }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [groupedLogs, setGroupedLogs] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [groupBy, setGroupBy] = useState<'date' | 'month' | 'none'>('date');
  const [filters, setFilters] = useState({
    actionType: '',
    entityType: '',
    studentId: '',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    loadLogs();
  }, [accountantId, filters, groupBy]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      setError('');

      if (groupBy === 'date') {
        const grouped = await accountantAPI.getLogsGroupedByDate({
          accountantId,
          startDate: filters.startDate || undefined,
          endDate: filters.endDate || undefined
        });
        setGroupedLogs(grouped);
      } else if (groupBy === 'month') {
        const grouped = await accountantAPI.getLogsGroupedByMonth({
          accountantId
        });
        setGroupedLogs(grouped);
      } else {
        const logsData = await accountantAPI.getAccountantLogs({
          accountantId,
          actionType: filters.actionType || undefined,
          entityType: filters.entityType || undefined,
          studentId: filters.studentId || undefined,
          startDate: filters.startDate || undefined,
          endDate: filters.endDate || undefined,
          limit: 200
        });
        setLogs(logsData);
      }
    } catch (error: any) {
      console.error('Error loading logs:', error);
      setError(`Failed to load logs: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleString();
  };

  const getActionColor = (actionType: string) => {
    switch (actionType) {
      case 'create': return 'bg-green-100 text-green-800';
      case 'update': return 'bg-blue-100 text-blue-800';
      case 'delete': return 'bg-red-100 text-red-800';
      case 'view': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getEntityColor = (entityType: string) => {
    switch (entityType) {
      case 'financial_record': return 'bg-purple-100 text-purple-800';
      case 'payment': return 'bg-yellow-100 text-yellow-800';
      case 'student': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const renderLogEntry = (log: LogEntry) => (
    <div key={log.id} className="bg-white border border-gray-200 rounded-lg p-4 mb-3">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getActionColor(log.action_type)}`}>
              {log.action_type.toUpperCase()}
            </span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getEntityColor(log.entity_type)}`}>
              {log.entity_type.replace('_', ' ').toUpperCase()}
            </span>
            <span className="text-sm text-gray-500">
              {formatDateTime(log.created_at)}
            </span>
          </div>
          
          <p className="text-sm text-gray-900 mb-2">{log.description}</p>
          
          {log.student_name && (
            <p className="text-xs text-gray-600">
              <span className="font-medium">Student:</span> {log.student_name}
            </p>
          )}
          
          {log.accountant_name && (
            <p className="text-xs text-gray-600">
              <span className="font-medium">Accountant:</span> {log.accountant_name}
            </p>
          )}
        </div>
        
        <div className="text-xs text-gray-500">
          {new Date(log.created_at).toLocaleTimeString()}
        </div>
      </div>
      
      {(log.old_values || log.new_values) && (
        <details className="mt-3">
          <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-800">
            View Details
          </summary>
          <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
            {log.old_values && (
              <div className="mb-2">
                <strong>Previous Values:</strong>
                <pre className="mt-1 text-xs overflow-x-auto">
                  {JSON.stringify(log.old_values, null, 2)}
                </pre>
              </div>
            )}
            {log.new_values && (
              <div>
                <strong>New Values:</strong>
                <pre className="mt-1 text-xs overflow-x-auto">
                  {JSON.stringify(log.new_values, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </details>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Accountant Activity Logs</h2>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters & Grouping</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Group By</label>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as 'date' | 'month' | 'none')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="none">No Grouping</option>
              <option value="date">By Date</option>
              <option value="month">By Month</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Action Type</label>
            <select
              value={filters.actionType}
              onChange={(e) => setFilters({...filters, actionType: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Actions</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
              <option value="view">View</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Entity Type</label>
            <select
              value={filters.entityType}
              onChange={(e) => setFilters({...filters, entityType: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Entities</option>
              <option value="financial_record">Financial Records</option>
              <option value="payment">Payments</option>
              <option value="student">Students</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({...filters, startDate: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({...filters, endDate: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={loadLogs}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Logs Display */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Activity History
            {groupBy === 'date' && ' (Grouped by Date)'}
            {groupBy === 'month' && ' (Grouped by Month)'}
          </h3>
        </div>

        <div className="p-4">
          {groupBy !== 'none' ? (
            // Grouped display
            Object.keys(groupedLogs).length === 0 ? (
              <p className="text-gray-500 text-center py-8">No logs found for the selected criteria.</p>
            ) : (
              Object.entries(groupedLogs)
                .sort(([a], [b]) => b.localeCompare(a))
                .map(([groupKey, groupLogs]: [string, any]) => (
                  <div key={groupKey} className="mb-6">
                    <h4 className="text-lg font-semibold text-gray-800 mb-3 pb-2 border-b border-gray-200">
                      {groupBy === 'date' ? new Date(groupKey).toLocaleDateString() : groupKey}
                      <span className="text-sm font-normal text-gray-600 ml-2">
                        ({groupLogs.length} {groupLogs.length === 1 ? 'action' : 'actions'})
                      </span>
                    </h4>
                    <div className="space-y-3">
                      {groupLogs.map((log: LogEntry) => renderLogEntry(log))}
                    </div>
                  </div>
                ))
            )
          ) : (
            // Non-grouped display
            logs.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No logs found for the selected criteria.</p>
            ) : (
              <div className="space-y-3">
                {logs.map((log) => renderLogEntry(log))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default AccountantLogs;
