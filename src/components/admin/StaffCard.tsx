'use client';

import React from 'react';
import { Staff } from '@/lib/supabase';

interface StaffCardProps {
  staff: Staff;
  onEdit: (staff: Staff) => void;
  onToggleStatus: (staff: Staff) => void;
  onViewAuditLogs: (staff: Staff) => void;
}

const StaffCard: React.FC<StaffCardProps> = ({
  staff,
  onEdit,
  onToggleStatus,
  onViewAuditLogs
}) => {
  return (
    <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100 overflow-hidden">
      <div className="p-6">
        {/* Header with Photo and Basic Info */}
        <div className="flex items-center mb-4">
          <div className="flex-shrink-0">
            {staff.profile_photo_url ? (
              <img
                src={staff.profile_photo_url}
                alt={`${staff.first_name} ${staff.last_name}`}
                className="w-16 h-16 rounded-full object-cover border-4 border-blue-100"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center border-4 border-blue-100">
                <span className="text-white font-bold text-lg">
                  {staff.first_name[0]}{staff.last_name[0]}
                </span>
              </div>
            )}
          </div>
          <div className="ml-4 flex-1">
            <h3 className="text-lg font-bold text-gray-900">
              {staff.first_name} {staff.last_name}
            </h3>
            <p className="text-sm text-gray-600">ID: {staff.staff_id}</p>
            <div className="mt-1">
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                staff.is_active
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {staff.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>

        {/* Department and Job Title */}
        <div className="mb-4">
          <div className="flex items-center mb-2">
            <span className="text-blue-600 mr-2">🏢</span>
            <span className="text-sm font-medium text-gray-900">{staff.department}</span>
          </div>
          <div className="flex items-center mb-2">
            <span className="text-green-600 mr-2">💼</span>
            <span className="text-sm text-gray-700">{staff.job_title}</span>
          </div>
        </div>

        {/* Contact Information */}
        <div className="mb-4 space-y-2">
          <div className="flex items-center">
            <span className="text-gray-500 mr-2">📧</span>
            <span className="text-sm text-gray-700 truncate">{staff.email}</span>
          </div>
          {staff.phone && (
            <div className="flex items-center">
              <span className="text-gray-500 mr-2">📞</span>
              <span className="text-sm text-gray-700">{staff.phone}</span>
            </div>
          )}
        </div>

        {/* Academic Qualifications */}
        {staff.academic_qualifications && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-900 mb-1">Academic Qualifications</h4>
            <p className="text-xs text-gray-600 line-clamp-2">
              {staff.academic_qualifications}
            </p>
          </div>
        )}

        {/* Specialization */}
        {staff.specialization && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-900 mb-1">Specialization</h4>
            <p className="text-xs text-gray-600 line-clamp-2">
              {staff.specialization}
            </p>
          </div>
        )}

        {/* Timestamps */}
        <div className="mb-4 text-xs text-gray-500">
          <div>Created: {new Date(staff.created_at).toLocaleDateString()}</div>
          <div>Updated: {new Date(staff.updated_at).toLocaleDateString()}</div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onEdit(staff)}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Edit
          </button>
          <button
            onClick={() => onToggleStatus(staff)}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              staff.is_active
                ? 'bg-red-100 hover:bg-red-200 text-red-800'
                : 'bg-green-100 hover:bg-green-200 text-green-800'
            }`}
          >
            {staff.is_active ? 'Deactivate' : 'Activate'}
          </button>
          <button
            onClick={() => onViewAuditLogs(staff)}
            className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Logs
          </button>
        </div>
      </div>
    </div>
  );
};

export default StaffCard;
