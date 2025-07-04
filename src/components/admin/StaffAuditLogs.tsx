'use client';

import React from 'react';
import { Staff } from '@/lib/supabase';

interface AuditLog {
  id: string;
  staff_id: string;
  action: string;
  action_description?: string;
  changes?: any;
  performed_by: string;
  timestamp: string;
}

interface StaffAuditLogsProps {
  staff: Staff;
  auditLogs: AuditLog[];
  onClose: () => void;
}

const StaffAuditLogs: React.FC<StaffAuditLogsProps> = ({
  staff,
  auditLogs,
  onClose
}) => {
  const getActionIcon = (action: string) => {
    switch (action) {
      case 'created':
        return '✅';
      case 'updated':
        return '✏️';
      case 'activated':
        return '🟢';
      case 'deactivated':
        return '🔴';
      case 'photo_updated':
        return '📷';
      default:
        return '📝';
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'created':
        return 'bg-green-100 text-green-800';
      case 'updated':
        return 'bg-blue-100 text-blue-800';
      case 'activated':
        return 'bg-green-100 text-green-800';
      case 'deactivated':
        return 'bg-red-100 text-red-800';
      case 'photo_updated':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatChanges = (changes: any) => {
    if (!changes) return null;

    if (typeof changes === 'string') {
      try {
        changes = JSON.parse(changes);
      } catch {
        return changes;
      }
    }

    if (changes.before && changes.after) {
      return (
        <div className="space-y-2">
          <div>
            <span className="font-medium text-red-600">Before:</span>
            <pre className="text-xs bg-red-50 p-2 rounded mt-1 overflow-x-auto">
              {JSON.stringify(changes.before, null, 2)}
            </pre>
          </div>
          <div>
            <span className="font-medium text-green-600">After:</span>
            <pre className="text-xs bg-green-50 p-2 rounded mt-1 overflow-x-auto">
              {JSON.stringify(changes.after, null, 2)}
            </pre>
          </div>
        </div>
      );
    }

    return (
      <pre className="text-xs bg-gray-50 p-2 rounded mt-1 overflow-x-auto">
        {JSON.stringify(changes, null, 2)}
      </pre>
    );
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                Audit Logs
              </h3>
              <p className="text-gray-600">
                {staff.first_name} {staff.last_name} ({staff.staff_id})
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ✕
            </button>
          </div>

          {/* Logs Content */}
          <div className="max-h-96 overflow-y-auto">
            {auditLogs.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">📋</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Audit Logs</h3>
                <p className="text-gray-600">
                  No audit logs found for this staff member.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {auditLogs.map((log, index) => (
                  <div key={log.id || index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    {/* Log Header */}
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center">
                        <span className="text-2xl mr-3">
                          {getActionIcon(log.action)}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getActionColor(log.action)}`}>
                              {log.action.toUpperCase()}
                            </span>
                            <span className="text-sm font-medium text-gray-900">
                              {log.action_description || `Staff member ${log.action}`}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            By: {log.performed_by || 'System'}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-600">
                          {new Date(log.timestamp).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>

                    {/* Changes Details */}
                    {log.changes && (
                      <div className="mt-3">
                        <details className="text-sm">
                          <summary className="cursor-pointer text-gray-700 hover:text-gray-900 font-medium">
                            View Changes
                          </summary>
                          <div className="mt-2">
                            {formatChanges(log.changes)}
                          </div>
                        </details>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center pt-6 border-t border-gray-200">
            <div className="text-sm text-gray-500">
              Total logs: {auditLogs.length}
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffAuditLogs;
