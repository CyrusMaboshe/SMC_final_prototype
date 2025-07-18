'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface ExamSlipNotification {
  type: 'created' | 'updated' | 'deleted';
  message: string;
  courseId?: string;
  examSlipId?: string;
}

interface UseExamSlipUpdatesOptions {
  onUpdate?: (notification: ExamSlipNotification) => void;
  studentId?: string;
  showNotifications?: boolean;
}

export const useExamSlipUpdates = (options: UseExamSlipUpdatesOptions = {}) => {
  const { onUpdate, studentId, showNotifications = true } = options;
  const [notification, setNotification] = useState<ExamSlipNotification | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const clearNotification = useCallback(() => {
    setNotification(null);
  }, []);

  useEffect(() => {
    const channelName = studentId 
      ? `exam_slips_student_${studentId}` 
      : 'exam_slips_global';

    const subscription = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'exam_slips'
        },
        (payload) => {
          console.log('Exam slip real-time update:', payload);
          
          let notificationData: ExamSlipNotification;
          
          switch (payload.eventType) {
            case 'INSERT':
              notificationData = {
                type: 'created',
                message: '📅 New exam slip created!',
                courseId: payload.new?.course_id,
                examSlipId: payload.new?.id
              };
              break;
            case 'UPDATE':
              notificationData = {
                type: 'updated',
                message: '📝 Exam slip updated!',
                courseId: payload.new?.course_id,
                examSlipId: payload.new?.id
              };
              break;
            case 'DELETE':
              notificationData = {
                type: 'deleted',
                message: '🗑️ Exam slip removed!',
                courseId: payload.old?.course_id,
                examSlipId: payload.old?.id
              };
              break;
            default:
              return;
          }

          // Set notification if enabled
          if (showNotifications) {
            setNotification(notificationData);
            // Auto-clear notification after 5 seconds
            setTimeout(() => setNotification(null), 5000);
          }

          // Call custom update handler
          if (onUpdate) {
            onUpdate(notificationData);
          }
        }
      )
      .subscribe((status) => {
        console.log('Exam slip subscription status:', status);
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(subscription);
      setIsConnected(false);
    };
  }, [studentId, onUpdate, showNotifications]);

  return {
    notification,
    clearNotification,
    isConnected
  };
};

// Hook specifically for student exam slip updates
export const useStudentExamSlipUpdates = (studentId?: string) => {
  return useExamSlipUpdates({
    studentId,
    showNotifications: true
  });
};

// Hook for admin exam slip management
export const useAdminExamSlipUpdates = (onUpdate?: (notification: ExamSlipNotification) => void) => {
  return useExamSlipUpdates({
    onUpdate,
    showNotifications: false // Admins might not need visual notifications
  });
};


