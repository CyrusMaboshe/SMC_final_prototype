'use client';

import React, { useState } from 'react';
import { AccessControlState, getAccessWarningMessage } from '@/hooks/useAccessControl';

interface AccessControlAlertProps {
  accessState: AccessControlState;
  className?: string;
}

const AccessControlAlert: React.FC<AccessControlAlertProps> = ({ 
  accessState, 
  className = '' 
}) => {
  const [isDismissed, setIsDismissed] = useState(false);

  if (accessState.isLoading || isDismissed) {
    return null;
  }

  const warningMessage = getAccessWarningMessage(accessState);

  // Don't show alert if no warnings and user has access
  if (!warningMessage && accessState.hasAccess) {
    return null;
  }

  // Show error alert if no access
  if (!accessState.hasAccess) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-red-400 text-xl">🚫</span>
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-red-800">
              Access Restricted
            </h3>
            <div className="mt-2 text-sm text-red-700">
              <p>
                {!accessState.paymentApproved && !accessState.semesterRegistered
                  ? 'Access denied: You must pay and be approved by the Accounts Office to access your account and results.'
                  : !accessState.paymentApproved
                  ? 'Access denied: You must pay and be approved by the Accounts Office to access your account and results.'
                  : 'You are not registered for the current semester. Please visit the Accounts Office.'
                }
              </p>
            </div>
            <div className="mt-3">
              <div className="flex space-x-4 text-xs">
                <div className="flex items-center">
                  <span className="mr-1">Payment:</span>
                  <span className={`px-2 py-1 rounded-full font-medium ${
                    accessState.paymentApproved 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {accessState.paymentApproved ? '✓' : '✗'}
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="mr-1">Registration:</span>
                  <span className={`px-2 py-1 rounded-full font-medium ${
                    accessState.semesterRegistered 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {accessState.semesterRegistered ? '✓' : '✗'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                onClick={() => setIsDismissed(true)}
                className="inline-flex bg-red-50 rounded-md p-1.5 text-red-500 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-red-50 focus:ring-red-600"
              >
                <span className="sr-only">Dismiss</span>
                <span className="text-sm">×</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show warning alert if access is valid but has warnings
  if (warningMessage) {
    return (
      <div className={`bg-yellow-50 border border-yellow-200 rounded-lg p-4 ${className}`}>
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-yellow-400 text-xl">⚠️</span>
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-yellow-800">
              Access Warning
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>{warningMessage}</p>
            </div>
            <div className="mt-3">
              <div className="flex space-x-4 text-xs">
                {accessState.accessValidUntil && (
                  <div className="flex items-center">
                    <span className="mr-1">Access expires:</span>
                    <span className="font-medium">
                      {new Date(accessState.accessValidUntil).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {accessState.semesterEndDate && (
                  <div className="flex items-center">
                    <span className="mr-1">Semester ends:</span>
                    <span className="font-medium">
                      {new Date(accessState.semesterEndDate).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                onClick={() => setIsDismissed(true)}
                className="inline-flex bg-yellow-50 rounded-md p-1.5 text-yellow-500 hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-yellow-50 focus:ring-yellow-600"
              >
                <span className="sr-only">Dismiss</span>
                <span className="text-sm">×</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

// Success alert for when access is fully valid
export const AccessControlSuccessAlert: React.FC<AccessControlAlertProps> = ({ 
  accessState, 
  className = '' 
}) => {
  const [isDismissed, setIsDismissed] = useState(false);

  if (accessState.isLoading || isDismissed || !accessState.hasAccess) {
    return null;
  }

  const warningMessage = getAccessWarningMessage(accessState);
  
  // Only show success alert if no warnings
  if (warningMessage) {
    return null;
  }

  return (
    <div className={`bg-green-50 border border-green-200 rounded-lg p-4 ${className}`}>
      <div className="flex">
        <div className="flex-shrink-0">
          <span className="text-green-400 text-xl">✅</span>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-green-800">
            Access Granted
          </h3>
          <div className="mt-2 text-sm text-green-700">
            <p>You have full access to the student portal and all academic modules.</p>
          </div>
          <div className="mt-3">
            <div className="flex space-x-4 text-xs">
              <div className="flex items-center">
                <span className="mr-1">Payment:</span>
                <span className="px-2 py-1 rounded-full font-medium bg-green-100 text-green-800">
                  ✓ Approved
                </span>
              </div>
              <div className="flex items-center">
                <span className="mr-1">Registration:</span>
                <span className="px-2 py-1 rounded-full font-medium bg-green-100 text-green-800">
                  ✓ Active
                </span>
              </div>
              {accessState.accessValidUntil && (
                <div className="flex items-center">
                  <span className="mr-1">Valid until:</span>
                  <span className="font-medium">
                    {new Date(accessState.accessValidUntil).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="ml-auto pl-3">
          <div className="-mx-1.5 -my-1.5">
            <button
              onClick={() => setIsDismissed(true)}
              className="inline-flex bg-green-50 rounded-md p-1.5 text-green-500 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-green-50 focus:ring-green-600"
            >
              <span className="sr-only">Dismiss</span>
              <span className="text-sm">×</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccessControlAlert;
