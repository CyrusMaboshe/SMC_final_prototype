'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export const useRealTimeUpdates = (
  table: string,
  onUpdate: () => void,
  filter?: { column: string; value: any }
) => {
  useEffect(() => {
    let subscription: any;

    const setupSubscription = () => {
      let channel = supabase
        .channel(`${table}_changes`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: table,
            ...(filter && { filter: `${filter.column}=eq.${filter.value}` })
          },
          (payload) => {
            console.log(`Real-time update for ${table}:`, payload);
            onUpdate();
          }
        );

      subscription = channel.subscribe();
    };

    setupSubscription();

    return () => {
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, [table, onUpdate, filter]);
};

export const useStudentRealTimeUpdates = (studentId: string, onUpdate: () => void) => {
  useEffect(() => {
    if (!studentId) return;

    const subscriptions: any[] = [];

    // Subscribe to CA results
    const caChannel = supabase
      .channel('ca_results_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ca_results',
          filter: `student_id=eq.${studentId}`
        },
        onUpdate
      )
      .subscribe();

    // Subscribe to exam results
    const examChannel = supabase
      .channel('exam_results_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'exam_results',
          filter: `student_id=eq.${studentId}`
        },
        onUpdate
      )
      .subscribe();

    // Subscribe to quiz attempts
    const quizChannel = supabase
      .channel('quiz_attempts_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'quiz_attempts',
          filter: `student_id=eq.${studentId}`
        },
        onUpdate
      )
      .subscribe();

    // Subscribe to assignment submissions
    const assignmentChannel = supabase
      .channel('assignment_submissions_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'assignment_submissions',
          filter: `student_id=eq.${studentId}`
        },
        onUpdate
      )
      .subscribe();

    // Subscribe to course enrollments
    const enrollmentChannel = supabase
      .channel('course_enrollments_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'course_enrollments',
          filter: `student_id=eq.${studentId}`
        },
        onUpdate
      )
      .subscribe();

    // Subscribe to invoices
    const invoiceChannel = supabase
      .channel('invoices_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'invoices',
          filter: `student_id=eq.${studentId}`
        },
        onUpdate
      )
      .subscribe();

    // Subscribe to financial records
    const financialChannel = supabase
      .channel('financial_records_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'financial_records',
          filter: `student_id=eq.${studentId}`
        },
        onUpdate
      )
      .subscribe();

    // Subscribe to payments
    const paymentsChannel = supabase
      .channel('payments_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payments',
          filter: `student_id=eq.${studentId}`
        },
        onUpdate
      )
      .subscribe();

    subscriptions.push(caChannel, examChannel, quizChannel, assignmentChannel, enrollmentChannel, invoiceChannel, financialChannel, paymentsChannel);

    return () => {
      subscriptions.forEach(subscription => {
        supabase.removeChannel(subscription);
      });
    };
  }, [studentId, onUpdate]);
}

// Hook for student financial real-time updates (uses student number, not UUID)
export const useStudentFinancialRealTimeUpdates = (studentNumber: string, onUpdate: () => void) => {
  useEffect(() => {
    if (!studentNumber) return;

    const subscriptions: any[] = [];

    // First get the student UUID from the student number
    const getStudentUUID = async () => {
      const { data: student } = await supabase
        .from('students')
        .select('id')
        .eq('student_id', studentNumber)
        .single();

      if (!student) return;

      // Subscribe to financial records for this student
      const financialChannel = supabase
        .channel('student_financial_records_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'financial_records',
            filter: `student_id=eq.${student.id}`
          },
          (payload) => {
            console.log('Financial record update:', payload);
            onUpdate();
          }
        )
        .subscribe();

      // Subscribe to payments for this student
      const paymentsChannel = supabase
        .channel('student_payments_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'payments',
            filter: `student_id=eq.${student.id}`
          },
          (payload) => {
            console.log('Payment update:', payload);
            onUpdate();
          }
        )
        .subscribe();

      // Subscribe to invoices for this student
      const invoicesChannel = supabase
        .channel('student_invoices_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'invoices',
            filter: `student_id=eq.${student.id}`
          },
          (payload) => {
            console.log('Invoice update:', payload);
            onUpdate();
          }
        )
        .subscribe();

      subscriptions.push(financialChannel, paymentsChannel, invoicesChannel);
    };

    getStudentUUID();

    return () => {
      subscriptions.forEach(subscription => {
        supabase.removeChannel(subscription);
      });
    };
  }, [studentNumber, onUpdate]);
};

// Hook for accountant real-time updates
export function useAccountantRealTimeUpdates(onUpdate: () => void) {
  useEffect(() => {
    const subscriptions: any[] = [];

    // Subscribe to all financial records changes
    const financialChannel = supabase
      .channel('accountant_financial_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'financial_records'
        },
        onUpdate
      )
      .subscribe();

    // Subscribe to all payments changes
    const paymentsChannel = supabase
      .channel('accountant_payments_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payments'
        },
        onUpdate
      )
      .subscribe();

    // Subscribe to all invoices changes
    const invoicesChannel = supabase
      .channel('accountant_invoices_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'invoices'
        },
        onUpdate
      )
      .subscribe();

    subscriptions.push(financialChannel, paymentsChannel, invoicesChannel);

    return () => {
      subscriptions.forEach(subscription => {
        supabase.removeChannel(subscription);
      });
    };
  }, [onUpdate]);
};

export const useAdminRealTimeUpdates = (onUpdate: () => void) => {
  useEffect(() => {
    const subscriptions: any[] = [];

    // Subscribe to students table
    const studentsChannel = supabase
      .channel('students_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'students'
        },
        onUpdate
      )
      .subscribe();

    // Subscribe to lecturers table
    const lecturersChannel = supabase
      .channel('lecturers_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lecturers'
        },
        onUpdate
      )
      .subscribe();

    // Subscribe to courses table
    const coursesChannel = supabase
      .channel('courses_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'courses'
        },
        onUpdate
      )
      .subscribe();

    // Subscribe to applications table
    const applicationsChannel = supabase
      .channel('applications_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'applications'
        },
        onUpdate
      )
      .subscribe();

    subscriptions.push(studentsChannel, lecturersChannel, coursesChannel, applicationsChannel);

    return () => {
      subscriptions.forEach(subscription => {
        supabase.removeChannel(subscription);
      });
    };
  }, [onUpdate]);
};
