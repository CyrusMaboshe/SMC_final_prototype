'use client';

import React from 'react';

export interface ExamSlipNotification {
  type: 'created' | 'updated' | 'deleted';
  message: string;
  courseId?: string;
  examSlipId?: string;
}

interface ExamSlipNotificationDisplayProps {
  notification: ExamSlipNotification | null;
  onClose?: () => void;
}

const ExamSlipNotificationDisplay: React.FC<ExamSlipNotificationDisplayProps> = ({ 
  notification, 
  onClose 
}) => {
  if (!notification) return null;

  const getNotificationStyle = (type: ExamSlipNotification['type']) => {
    switch (type) {
      case 'created':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'updated':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'deleted':
        return 'bg-red-50 border-red-200 text-red-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  return (
    <div className={`border rounded-lg p-4 mb-6 print:hidden animate-pulse ${getNotificationStyle(notification.type)}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium">
              {notification.message} Your exam slip has been updated in real-time.
            </p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="ml-4 text-sm hover:opacity-75"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
};

export default ExamSlipNotificationDisplay;
