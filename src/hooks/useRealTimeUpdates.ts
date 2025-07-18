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

    subscriptions.push(caChannel, examChannel, quizChannel, assignmentChannel, enrollmentChannel, financialChannel, paymentsChannel);

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
            console.log('💰 Student financial record real-time update:', payload);
            console.log('Student ID:', student.id);
            console.log('Event type:', payload.eventType);
            console.log('Updated record:', payload.new);
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
            console.log('💳 Student payment real-time update:', payload);
            console.log('Student ID:', student.id);
            console.log('Event type:', payload.eventType);
            console.log('New payment:', payload.new);
            onUpdate();
          }
        )
        .subscribe();

      // Subscribe to account transactions that affect this student's financial records
      const accountTransactionsChannel = supabase
        .channel('student_account_transactions_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'account_transactions',
            filter: `reference_type=eq.fee_record`
          },
          (payload) => {
            console.log('Student account transaction real-time update:', payload);
            // Only trigger update if this transaction relates to the current student
            // The trigger will handle updating the financial_records table
            onUpdate();
          }
        )
        .subscribe();

      subscriptions.push(financialChannel, paymentsChannel, accountTransactionsChannel);
    };

    getStudentUUID();

    return () => {
      subscriptions.forEach(subscription => {
        supabase.removeChannel(subscription);
      });
    };
  }, [studentNumber, onUpdate]);
};

// Hook for accountant real-time updates with enhanced account transaction tracking
export function useAccountantRealTimeUpdates(onUpdate: () => void) {
  useEffect(() => {
    const subscriptions: any[] = [];

    // Subscribe to all financial records changes with detailed logging
    const financialChannel = supabase
      .channel('accountant_financial_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'financial_records'
        },
        (payload) => {
          console.log('🔄 Financial records real-time update:', payload);
          console.log('Event type:', payload.eventType);
          console.log('New record:', payload.new);
          console.log('Old record:', payload.old);
          onUpdate();
        }
      )
      .subscribe();

    // Subscribe to all payments changes with detailed logging
    const paymentsChannel = supabase
      .channel('accountant_payments_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payments'
        },
        (payload) => {
          console.log('💰 Payments real-time update:', payload);
          console.log('Event type:', payload.eventType);
          console.log('New payment:', payload.new);
          console.log('Old payment:', payload.old);
          onUpdate();
        }
      )
      .subscribe();

    // Subscribe to account transactions for real-time accounting updates
    const accountTransactionsChannel = supabase
      .channel('accountant_account_transactions_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'account_transactions'
        },
        (payload) => {
          console.log('📊 Account transactions real-time update:', payload);
          console.log('Event type:', payload.eventType);
          console.log('New transaction:', payload.new);
          onUpdate();
        }
      )
      .subscribe();

    // Subscribe to students table changes for accountant dashboard
    const studentsChannel = supabase
      .channel('accountant_students_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'students'
        },
        (payload) => {
          console.log('👥 Students real-time update:', payload);
          onUpdate();
        }
      )
      .subscribe();

    // Subscribe to transaction entries for real-time balance updates
    const transactionEntriesChannel = supabase
      .channel('accountant_transaction_entries_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transaction_entries'
        },
        (payload) => {
          console.log('Transaction entries real-time update:', payload);
          onUpdate();
        }
      )
      .subscribe();

    // Subscribe to accounts for real-time balance updates
    const accountsChannel = supabase
      .channel('accountant_accounts_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'accounts'
        },
        (payload) => {
          console.log('Accounts real-time update:', payload);
          onUpdate();
        }
      )
      .subscribe();

    // Subscribe to audit logs for real-time audit tracking
    const auditLogsChannel = supabase
      .channel('accountant_audit_logs_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'audit_logs'
        },
        (payload) => {
          console.log('Audit logs real-time update:', payload);
          onUpdate();
        }
      )
      .subscribe();

    // Subscribe to ledger adjustments for real-time balance updates
    const ledgerAdjustmentsChannel = supabase
      .channel('accountant_ledger_adjustments_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ledger_adjustments'
        },
        (payload) => {
          console.log('⚖️ Ledger adjustments real-time update:', payload);
          console.log('Event type:', payload.eventType);
          console.log('New adjustment:', payload.new);
          console.log('Old adjustment:', payload.old);
          onUpdate();
        }
      )
      .subscribe();

    subscriptions.push(
      financialChannel,
      paymentsChannel,
      accountTransactionsChannel,
      studentsChannel,
      transactionEntriesChannel,
      accountsChannel,
      auditLogsChannel,
      ledgerAdjustmentsChannel
    );

    console.log('🚀 Accountant real-time subscriptions established:', subscriptions.length);

    return () => {
      console.log('🔌 Cleaning up accountant real-time subscriptions');
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

    // Subscribe to updates table
    const updatesChannel = supabase
      .channel('updates_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'updates'
        },
        onUpdate
      )
      .subscribe();

    // Subscribe to documents table
    const documentsChannel = supabase
      .channel('documents_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'documents'
        },
        onUpdate
      )
      .subscribe();

    subscriptions.push(studentsChannel, lecturersChannel, coursesChannel, applicationsChannel, updatesChannel, documentsChannel);

    return () => {
      subscriptions.forEach(subscription => {
        supabase.removeChannel(subscription);
      });
    };
  }, [onUpdate]);
};

// Hook for documents real-time updates
export const useDocumentsRealTimeUpdates = (onUpdate: () => void) => {
  useEffect(() => {
    const documentsChannel = supabase
      .channel('public_documents_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'documents',
          filter: 'is_public=eq.true'
        },
        (payload) => {
          console.log('Documents real-time update:', payload);
          onUpdate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(documentsChannel);
    };
  }, [onUpdate]);
};
