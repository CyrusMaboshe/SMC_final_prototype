'use client';

import React from 'react';
import { AccessControlState } from '@/hooks/useAccessControl';

interface AccessControlStatusProps {
  accessState: AccessControlState;
  showDetails?: boolean;
  className?: string;
}

const AccessControlStatus: React.FC<AccessControlStatusProps> = ({ 
  accessState, 
  showDetails = true,
  className = '' 
}) => {
  if (accessState.isLoading) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
          <span className="text-sm text-gray-600">Checking access status...</span>
        </div>
      </div>
    );
  }

  const getStatusColor = () => {
    if (!accessState.hasAccess) return 'red';
    if (!accessState.paymentApproved || !accessState.semesterRegistered) return 'yellow';
    return 'green';
  };

  const getStatusIcon = () => {
    if (!accessState.hasAccess) return '🚫';
    if (!accessState.paymentApproved || !accessState.semesterRegistered) return '⚠️';
    return '✅';
  };

  const getStatusText = () => {
    if (!accessState.hasAccess) return 'Access Denied';
    if (!accessState.paymentApproved || !accessState.semesterRegistered) return 'Limited Access';
    return 'Full Access';
  };

  const color = getStatusColor();
  const bgColor = `bg-${color}-50`;
  const borderColor = `border-${color}-200`;
  const textColor = `text-${color}-800`;
  const badgeColor = `bg-${color}-100 text-${color}-800`;

  return (
    <div className={`${bgColor} ${borderColor} border rounded-lg p-4 ${className}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <span className="text-xl">{getStatusIcon()}</span>
        </div>
        <div className="ml-3 flex-1">
          <div className="flex items-center justify-between">
            <h3 className={`text-sm font-medium ${textColor}`}>
              Portal Access Status: {getStatusText()}
            </h3>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${badgeColor}`}>
              {accessState.hasAccess ? 'Active' : 'Restricted'}
            </span>
          </div>
          
          {showDetails && (
            <div className="mt-3 space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="flex items-center justify-between">
                  <span className={textColor}>Payment Status:</span>
                  <span className={`px-2 py-1 rounded-full font-medium ${
                    accessState.paymentApproved 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {accessState.paymentApproved ? '✓ Approved' : '✗ Not Approved'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className={textColor}>Registration Status:</span>
                  <span className={`px-2 py-1 rounded-full font-medium ${
                    accessState.semesterRegistered 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {accessState.semesterRegistered ? '✓ Registered' : '✗ Not Registered'}
                  </span>
                </div>

                {accessState.accessValidUntil && (
                  <div className="flex items-center justify-between">
                    <span className={textColor}>Access Expires:</span>
                    <span className={`text-xs font-medium ${textColor}`}>
                      {new Date(accessState.accessValidUntil).toLocaleDateString()}
                    </span>
                  </div>
                )}

                {accessState.semesterEndDate && (
                  <div className="flex items-center justify-between">
                    <span className={textColor}>Semester Ends:</span>
                    <span className={`text-xs font-medium ${textColor}`}>
                      {new Date(accessState.semesterEndDate).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>

              {!accessState.hasAccess && accessState.denialReason && (
                <div className={`mt-2 p-2 bg-white bg-opacity-50 rounded text-xs ${textColor}`}>
                  <strong>Reason:</strong> {accessState.denialReason}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Compact status indicator for headers/navbars
export const AccessControlIndicator: React.FC<{ accessState: AccessControlState }> = ({ 
  accessState 
}) => {
  if (accessState.isLoading) {
    return (
      <div className="flex items-center text-xs text-gray-500">
        <div className="animate-spin rounded-full h-3 w-3 border-b border-gray-400 mr-1"></div>
        Checking...
      </div>
    );
  }

  const getIndicatorColor = () => {
    if (!accessState.hasAccess) return 'text-red-600 bg-red-100';
    if (!accessState.paymentApproved || !accessState.semesterRegistered) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  const getIndicatorText = () => {
    if (!accessState.hasAccess) return 'Access Denied';
    if (!accessState.paymentApproved || !accessState.semesterRegistered) return 'Limited Access';
    return 'Full Access';
  };

  return (
    <div className={`px-2 py-1 rounded-full text-xs font-medium ${getIndicatorColor()}`}>
      {getIndicatorText()}
    </div>
  );
};

// Module access warning for specific tabs/sections
export const ModuleAccessWarning: React.FC<{ 
  moduleType: string;
  accessState: AccessControlState;
}> = ({ moduleType, accessState }) => {
  if (accessState.hasAccess) return null;

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <span className="text-red-400 text-xl">🔒</span>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800">
            {moduleType} Access Restricted
          </h3>
          <div className="mt-2 text-sm text-red-700">
            <p>
              {!accessState.paymentApproved && !accessState.semesterRegistered
                ? `Access to ${moduleType.toLowerCase()} is denied. You must have approved payment and semester registration.`
                : !accessState.paymentApproved
                ? `Access to ${moduleType.toLowerCase()} requires payment approval from the Accounts Office.`
                : `Access to ${moduleType.toLowerCase()} requires semester registration approval.`
              }
            </p>
          </div>
          <div className="mt-3">
            <p className="text-xs text-red-600">
              Contact the Accounts Office to resolve access issues.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Floating access status widget
export const FloatingAccessStatus: React.FC<{ 
  accessState: AccessControlState;
  onClose?: () => void;
}> = ({ accessState, onClose }) => {
  if (accessState.isLoading || accessState.hasAccess) return null;

  return (
    <div className="fixed bottom-4 right-4 max-w-sm bg-white border border-red-200 rounded-lg shadow-lg p-4 z-50">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <span className="text-red-500 text-lg">🚫</span>
        </div>
        <div className="ml-3 flex-1">
          <h4 className="text-sm font-medium text-gray-900">Access Restricted</h4>
          <p className="text-xs text-gray-600 mt-1">
            Some features may be unavailable due to access restrictions.
          </p>
          <div className="mt-2 flex space-x-2 text-xs">
            <span className={`px-2 py-1 rounded-full ${
              accessState.paymentApproved 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              Payment: {accessState.paymentApproved ? '✓' : '✗'}
            </span>
            <span className={`px-2 py-1 rounded-full ${
              accessState.semesterRegistered 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              Registration: {accessState.semesterRegistered ? '✓' : '✗'}
            </span>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="ml-2 text-gray-400 hover:text-gray-600"
          >
            <span className="text-sm">×</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default AccessControlStatus;
