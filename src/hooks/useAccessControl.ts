'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { studentAPI, StudentAccessStatus, supabase } from '@/lib/supabase';

// Cache for access control results
const accessControlCache = new Map<string, {
  data: StudentAccessStatus;
  timestamp: number;
  expiresAt: number;
}>();

const ACCESS_CACHE_DURATION = 2 * 60 * 1000; // 2 minutes cache

export interface AccessControlState {
  isLoading: boolean;
  hasAccess: boolean;
  paymentApproved: boolean;
  semesterRegistered: boolean;
  accessValidUntil?: string;
  semesterEndDate?: string;
  denialReason?: string;
  error?: string;
}

export const useAccessControl = (studentId?: string) => {
  const [accessState, setAccessState] = useState<AccessControlState>({
    isLoading: true,
    hasAccess: false,
    paymentApproved: false,
    semesterRegistered: false
  });

  const lastFetchRef = useRef<number>(0);
  const isCheckingRef = useRef<boolean>(false);

  useEffect(() => {
    if (!studentId) {
      setAccessState({
        isLoading: false,
        hasAccess: false,
        paymentApproved: false,
        semesterRegistered: false,
        denialReason: 'No student ID provided'
      });
      return;
    }

    checkAccess();
  }, [studentId]);

  const checkAccess = useCallback(async (forceRefresh = false) => {
    if (!studentId || isCheckingRef.current) return;

    // Check cache first
    const cacheKey = `access_${studentId}`;
    const cached = accessControlCache.get(cacheKey);
    const now = Date.now();

    if (!forceRefresh && cached && now < cached.expiresAt) {
      setAccessState({
        isLoading: false,
        hasAccess: cached.data.has_access,
        paymentApproved: cached.data.payment_approved,
        semesterRegistered: cached.data.semester_registered,
        accessValidUntil: cached.data.access_valid_until,
        semesterEndDate: cached.data.semester_end_date,
        denialReason: cached.data.denial_reason
      });
      return;
    }

    // Prevent multiple simultaneous requests
    if (now - lastFetchRef.current < 1000) return; // Debounce 1 second

    try {
      isCheckingRef.current = true;
      lastFetchRef.current = now;
      setAccessState(prev => ({ ...prev, isLoading: true, error: undefined }));

      const accessStatus = await studentAPI.checkAccess(studentId);

      if (!accessStatus) {
        setAccessState({
          isLoading: false,
          hasAccess: false,
          paymentApproved: false,
          semesterRegistered: false,
          denialReason: 'Unable to verify access status'
        });
        return;
      }

      // Cache the result
      accessControlCache.set(cacheKey, {
        data: accessStatus,
        timestamp: now,
        expiresAt: now + ACCESS_CACHE_DURATION
      });

      setAccessState({
        isLoading: false,
        hasAccess: accessStatus.has_access,
        paymentApproved: accessStatus.payment_approved,
        semesterRegistered: accessStatus.semester_registered,
        accessValidUntil: accessStatus.access_valid_until,
        semesterEndDate: accessStatus.semester_end_date,
        denialReason: accessStatus.denial_reason
      });

    } catch (error: any) {
      console.error('Error checking access:', error);
      setAccessState({
        isLoading: false,
        hasAccess: false,
        paymentApproved: false,
        semesterRegistered: false,
        denialReason: 'Error checking access status',
        error: error.message
      });
    } finally {
      isCheckingRef.current = false;
    }
  }, [studentId]);

  const refreshAccess = useCallback(() => {
    if (studentId) {
      // Clear cache and force refresh
      const cacheKey = `access_${studentId}`;
      accessControlCache.delete(cacheKey);
      checkAccess(true);
    }
  }, [studentId, checkAccess]);

  return {
    ...accessState,
    refreshAccess
  };
};

// Hook for real-time access control monitoring with optimized subscriptions
export const useAccessControlMonitor = (studentId?: string, onAccessChange?: (hasAccess: boolean) => void) => {
  const accessControl = useAccessControl(studentId);
  const subscriptionsRef = useRef<any[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (onAccessChange && !accessControl.isLoading) {
      onAccessChange(accessControl.hasAccess);
    }
  }, [accessControl.hasAccess, accessControl.isLoading, onAccessChange]);

  // Set up periodic access checks (reduced frequency for better performance)
  useEffect(() => {
    if (!studentId) return;

    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Only set up periodic checks if user has access (more frequent monitoring when active)
    if (accessControl.hasAccess) {
      intervalRef.current = setInterval(() => {
        accessControl.refreshAccess();
      }, 3 * 60 * 1000); // 3 minutes for active users
    } else {
      // Less frequent checks for users without access
      intervalRef.current = setInterval(() => {
        accessControl.refreshAccess();
      }, 5 * 60 * 1000); // 5 minutes for inactive users
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [studentId, accessControl.hasAccess, accessControl.refreshAccess]);

  // Set up real-time access monitoring with optimized subscriptions
  useEffect(() => {
    if (!studentId) return;

    // Clean up existing subscriptions
    subscriptionsRef.current.forEach(subscription => {
      supabase.removeChannel(subscription);
    });
    subscriptionsRef.current = [];

    // Debounced refresh function to prevent excessive API calls
    let refreshTimeout: NodeJS.Timeout | null = null;
    const debouncedRefresh = () => {
      if (refreshTimeout) clearTimeout(refreshTimeout);
      refreshTimeout = setTimeout(() => {
        accessControl.refreshAccess();
      }, 1000); // 1 second debounce
    };

    // Single combined channel for all access-related changes
    const accessChannel = supabase
      .channel(`student_access_${studentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payment_approvals',
          filter: `student_id=eq.${studentId}`
        },
        (payload) => {
          console.log('Payment approval changed for student:', payload);
          debouncedRefresh();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'student_semester_registrations',
          filter: `student_id=eq.${studentId}`
        },
        (payload) => {
          console.log('Semester registration changed for student:', payload);
          debouncedRefresh();
        }
      )
      .subscribe();

    subscriptionsRef.current.push(accessChannel);

    return () => {
      if (refreshTimeout) clearTimeout(refreshTimeout);
      subscriptionsRef.current.forEach(subscription => {
        supabase.removeChannel(subscription);
      });
      subscriptionsRef.current = [];
    };
  }, [studentId, accessControl.refreshAccess]);

  return accessControl;
};

// Access control validation functions
export const validateStudentAccess = async (studentId: string): Promise<{
  allowed: boolean;
  reason?: string;
  redirectTo?: string;
}> => {
  try {
    const accessStatus = await studentAPI.checkAccess(studentId);
    
    if (!accessStatus) {
      return {
        allowed: false,
        reason: 'Unable to verify access status',
        redirectTo: '/access-denied'
      };
    }

    if (!accessStatus.has_access) {
      let reason = 'Access denied';
      let redirectTo = '/access-denied';

      if (!accessStatus.payment_approved && !accessStatus.semester_registered) {
        reason = 'Access denied: You must pay and be approved by the Accounts Office to access your account and results.';
      } else if (!accessStatus.payment_approved) {
        reason = 'Access denied: You must pay and be approved by the Accounts Office to access your account and results.';
      } else if (!accessStatus.semester_registered) {
        reason = 'You are not registered for the current semester. Please visit the Accounts Office.';
      }

      return {
        allowed: false,
        reason,
        redirectTo
      };
    }

    return { allowed: true };

  } catch (error) {
    console.error('Error validating student access:', error);
    return {
      allowed: false,
      reason: 'Error validating access. Please try again.',
      redirectTo: '/access-denied'
    };
  }
};

// Module-level access control
export const checkModuleAccess = (
  accessState: AccessControlState,
  moduleType: 'results' | 'courses' | 'timetable' | 'financial' | 'general'
): {
  allowed: boolean;
  reason?: string;
} => {
  if (accessState.isLoading) {
    return { allowed: false, reason: 'Checking access...' };
  }

  if (!accessState.hasAccess) {
    if (moduleType === 'results' || moduleType === 'courses' || moduleType === 'timetable') {
      return {
        allowed: false,
        reason: accessState.denialReason || 'Access denied to academic modules'
      };
    }
  }

  // Financial module has different access rules
  if (moduleType === 'financial') {
    if (!accessState.paymentApproved) {
      return {
        allowed: false,
        reason: 'Payment approval required to access financial information'
      };
    }
  }

  return { allowed: true };
};

// Access control error messages
export const getAccessErrorMessage = (accessState: AccessControlState): string => {
  if (!accessState.paymentApproved && !accessState.semesterRegistered) {
    return 'Access denied: You must pay and be approved by the Accounts Office to access your account and results.';
  }
  
  if (!accessState.paymentApproved) {
    return 'Access denied: You must pay and be approved by the Accounts Office to access your account and results.';
  }
  
  if (!accessState.semesterRegistered) {
    return 'You are not registered for the current semester. Please visit the Accounts Office.';
  }
  
  return accessState.denialReason || 'Access denied';
};

// Access control warning messages
export const getAccessWarningMessage = (accessState: AccessControlState): string | null => {
  if (!accessState.hasAccess) return null;

  const warnings: string[] = [];

  // Check if access is expiring soon (within 7 days)
  if (accessState.accessValidUntil) {
    const expiryDate = new Date(accessState.accessValidUntil);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry <= 7 && daysUntilExpiry > 0) {
      warnings.push(`Your access will expire in ${daysUntilExpiry} day(s) on ${expiryDate.toLocaleDateString()}.`);
    } else if (daysUntilExpiry <= 0) {
      warnings.push('Your access has expired. Please contact the Accounts Office.');
    }
  }

  // Check if semester is ending soon
  if (accessState.semesterEndDate) {
    const semesterEnd = new Date(accessState.semesterEndDate);
    const now = new Date();
    const daysUntilSemesterEnd = Math.ceil((semesterEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilSemesterEnd <= 14 && daysUntilSemesterEnd > 0) {
      warnings.push(`Current semester ends in ${daysUntilSemesterEnd} day(s) on ${semesterEnd.toLocaleDateString()}.`);
    }
  }

  return warnings.length > 0 ? warnings.join(' ') : null;
};
