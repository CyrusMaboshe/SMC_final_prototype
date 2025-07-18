'use client';

import React from 'react';
import { AccessControlState } from '@/hooks/useAccessControl';

interface AccessDeniedProps {
  accessState: AccessControlState;
  studentName?: string;
  onRetry?: () => void;
}

const AccessDenied: React.FC<AccessDeniedProps> = ({ 
  accessState, 
  studentName,
  onRetry 
}) => {
  const getIcon = () => {
    if (!accessState.paymentApproved && !accessState.semesterRegistered) {
      return '🚫';
    }
    if (!accessState.paymentApproved) {
      return '💳';
    }
    if (!accessState.semesterRegistered) {
      return '📚';
    }
    return '⚠️';
  };

  const getTitle = () => {
    if (!accessState.paymentApproved && !accessState.semesterRegistered) {
      return 'Payment and Registration Required';
    }
    if (!accessState.paymentApproved) {
      return 'Payment Approval Required';
    }
    if (!accessState.semesterRegistered) {
      return 'Semester Registration Required';
    }
    return 'Access Denied';
  };

  const getMessage = () => {
    if (!accessState.paymentApproved && !accessState.semesterRegistered) {
      return 'Access denied: You must pay and be approved by the Accounts Office to access your account and results.';
    }
    if (!accessState.paymentApproved) {
      return 'Access denied: You must pay and be approved by the Accounts Office to access your account and results.';
    }
    if (!accessState.semesterRegistered) {
      return 'You are not registered for the current semester. Please visit the Accounts Office.';
    }
    return accessState.denialReason || 'Access to the student portal is currently restricted.';
  };

  const getInstructions = () => {
    const instructions: string[] = [];

    if (!accessState.paymentApproved) {
      instructions.push('1. Make your payment for the current academic period');
      instructions.push('2. Submit payment proof to the Accounts Office');
      instructions.push('3. Wait for payment approval and access period assignment');
    }

    if (!accessState.semesterRegistered) {
      instructions.push('1. Visit the Accounts Office during registration period');
      instructions.push('2. Complete semester registration process');
      instructions.push('3. Ensure all required documents are submitted');
      instructions.push('4. Wait for registration approval');
    }

    if (instructions.length === 0) {
      instructions.push('1. Contact the Accounts Office for assistance');
      instructions.push('2. Verify your student status and enrollment');
      instructions.push('3. Ensure all requirements are met');
    }

    return instructions;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-24 w-24 bg-red-100 rounded-full flex items-center justify-center">
            <span className="text-4xl">{getIcon()}</span>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            {getTitle()}
          </h2>
          {studentName && (
            <p className="mt-2 text-sm text-gray-600">
              Welcome, {studentName}
            </p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-center mb-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-800 font-medium">
                {getMessage()}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">
              What you need to do:
            </h3>
            
            <div className="space-y-2">
              {getInstructions().map((instruction, index) => (
                <div key={index} className="flex items-start">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-xs font-medium mr-3 mt-0.5">
                    {index + 1}
                  </span>
                  <p className="text-sm text-gray-700">{instruction}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="text-md font-semibold text-gray-900 mb-3">
              Access Status:
            </h4>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Payment Approved:</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  accessState.paymentApproved 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {accessState.paymentApproved ? '✓ Yes' : '✗ No'}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Semester Registered:</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  accessState.semesterRegistered 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {accessState.semesterRegistered ? '✓ Yes' : '✗ No'}
                </span>
              </div>

              {accessState.accessValidUntil && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Access Valid Until:</span>
                  <span className="text-sm text-gray-900">
                    {new Date(accessState.accessValidUntil).toLocaleDateString()}
                  </span>
                </div>
              )}

              {accessState.semesterEndDate && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Semester Ends:</span>
                  <span className="text-sm text-gray-900">
                    {new Date(accessState.semesterEndDate).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {onRetry && (
              <button
                onClick={onRetry}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                Check Access Again
              </button>
            )}
            
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Need help? Contact the{' '}
                <span className="font-semibold text-blue-600">Accounts Office</span>
              </p>
            </div>
          </div>
        </div>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            This access control system ensures that only students with approved payments 
            and valid semester registrations can access the portal.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AccessDenied;
