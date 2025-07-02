'use client';

import React from 'react';

interface AuthLoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

const AuthLoadingSpinner: React.FC<AuthLoadingSpinnerProps> = ({ 
  message = 'Loading...', 
  size = 'md',
  showIcon = true 
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  return (
    <div className="flex items-center justify-center space-x-3">
      {showIcon && (
        <svg 
          className={`animate-spin ${sizeClasses[size]} text-blue-600`} 
          xmlns="http://www.w3.org/2000/svg" 
          fill="none" 
          viewBox="0 0 24 24"
        >
          <circle 
            className="opacity-25" 
            cx="12" 
            cy="12" 
            r="10" 
            stroke="currentColor" 
            strokeWidth="4"
          />
          <path 
            className="opacity-75" 
            fill="currentColor" 
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      <span className={`${textSizeClasses[size]} text-gray-700 font-medium`}>
        {message}
      </span>
    </div>
  );
};

export default AuthLoadingSpinner;

// Full page loading overlay component
interface AuthLoadingOverlayProps {
  message?: string;
  subMessage?: string;
  isSuccess?: boolean;
}

export const AuthLoadingOverlay: React.FC<AuthLoadingOverlayProps> = ({
  message = 'Signing you in...',
  subMessage = 'Please wait while we authenticate your credentials',
  isSuccess = false
}) => {
  return (
    <div className="fixed inset-0 bg-white bg-opacity-95 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl border border-blue-100 p-8 max-w-md w-full mx-4">
        <div className="text-center">
          {/* Animated logo or success checkmark */}
          {isSuccess ? (
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          ) : (
            <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-blue-700 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          )}
          
          {/* Loading spinner or success message */}
          <div className="mb-4">
            {isSuccess ? (
              <div className="text-center">
                <h3 className="text-lg font-semibold text-green-600 mb-2">{message}</h3>
              </div>
            ) : (
              <AuthLoadingSpinner message={message} size="lg" />
            )}
          </div>
          
          {/* Sub message */}
          {subMessage && (
            <p className="text-sm text-gray-500 mb-4">
              {subMessage}
            </p>
          )}
          
          {/* Progress bar */}
          {!isSuccess && (
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 h-2 rounded-full animate-pulse" style={{ width: '70%' }}></div>
            </div>
          )}
          
          {/* Success checkmark animation (hidden by default) */}
          <div className="hidden" id="success-checkmark">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-green-600 font-semibold">Login Successful!</p>
            <p className="text-sm text-gray-500">Redirecting to your dashboard...</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Success state component
interface AuthSuccessStateProps {
  message?: string;
  userRole?: string;
}

export const AuthSuccessState: React.FC<AuthSuccessStateProps> = ({ 
  message = 'Login Successful!',
  userRole 
}) => {
  return (
    <div className="text-center py-4">
      <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3 animate-bounce">
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <p className="text-green-600 font-semibold mb-1">{message}</p>
      {userRole && (
        <p className="text-sm text-gray-600">
          Redirecting to {userRole} dashboard...
        </p>
      )}
    </div>
  );
};
