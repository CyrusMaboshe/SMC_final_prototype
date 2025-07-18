'use client';

import { useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { authAPI, activityLogger } from '@/lib/supabase';

interface ActivityLoggerOptions {
  enablePageViews?: boolean;
  enableUserActions?: boolean;
  enableFormSubmissions?: boolean;
  enableButtonClicks?: boolean;
}

export const useActivityLogger = (options: ActivityLoggerOptions = {}) => {
  const router = useRouter();
  const pathname = usePathname();
  const {
    enablePageViews = true,
    enableUserActions = true,
    enableFormSubmissions = true,
    enableButtonClicks = true
  } = options;

  // Get current user info
  const getCurrentUserInfo = useCallback(() => {
    const user = authAPI.getCurrentUser();
    if (!user) return null;

    return {
      userId: user.id,
      userRole: user.role,
      username: user.username
    };
  }, []);

  // Get browser and session info
  const getBrowserInfo = useCallback(() => {
    if (typeof window === 'undefined') return {};

    return {
      userAgent: navigator.userAgent,
      sessionId: sessionStorage.getItem('session_id') || generateSessionId(),
      ipAddress: undefined // Will be determined server-side if needed
    };
  }, []);

  // Generate session ID
  const generateSessionId = useCallback(() => {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('session_id', sessionId);
    return sessionId;
  }, []);

  // Log activity helper
  const logActivity = useCallback(async (
    actionType: 'login' | 'logout' | 'create' | 'update' | 'delete' | 'view' | 'export' | 'print',
    module: string,
    details?: any,
    resourceType?: string,
    resourceId?: string
  ) => {
    const userInfo = getCurrentUserInfo();
    if (!userInfo) return;

    const browserInfo = getBrowserInfo();

    try {
      await activityLogger.logActivity({
        userId: userInfo.userId,
        userRole: userInfo.userRole,
        actionType,
        module,
        resourceType,
        resourceId,
        details: {
          ...details,
          pathname,
          timestamp: new Date().toISOString(),
          username: userInfo.username
        },
        ...browserInfo
      });
    } catch (error) {
      console.error('Failed to log activity:', error);
    }
  }, [pathname, getCurrentUserInfo, getBrowserInfo]);

  // Log page views
  useEffect(() => {
    if (!enablePageViews) return;

    const userInfo = getCurrentUserInfo();
    if (!userInfo) return;

    // Determine module from pathname
    const getModuleFromPath = (path: string) => {
      if (path.includes('/admin')) return 'admin_dashboard';
      if (path.includes('/student')) return 'student_dashboard';
      if (path.includes('/lecturer')) return 'lecturer_dashboard';
      if (path.includes('/accountant')) return 'accountant_dashboard';
      if (path.includes('/principal')) return 'principal_dashboard';
      return 'public_pages';
    };

    const module = getModuleFromPath(pathname);
    
    logActivity('view', module, {
      page: pathname,
      referrer: document.referrer,
      viewTime: new Date().toISOString()
    });
  }, [pathname, enablePageViews, logActivity, getCurrentUserInfo]);

  // Log form submissions
  const logFormSubmission = useCallback(async (
    formName: string,
    formData?: any,
    success?: boolean,
    errorMessage?: string
  ) => {
    if (!enableFormSubmissions) return;

    const module = pathname.includes('/admin') ? 'admin_forms' :
                   pathname.includes('/student') ? 'student_forms' :
                   pathname.includes('/lecturer') ? 'lecturer_forms' :
                   pathname.includes('/accountant') ? 'accountant_forms' :
                   'general_forms';

    await logActivity('create', module, {
      formName,
      success,
      errorMessage,
      formFields: formData ? Object.keys(formData) : undefined,
      submissionTime: new Date().toISOString()
    }, 'form', formName);
  }, [enableFormSubmissions, pathname, logActivity]);

  // Log button clicks
  const logButtonClick = useCallback(async (
    buttonName: string,
    buttonType?: string,
    context?: any
  ) => {
    if (!enableButtonClicks) return;

    const module = pathname.includes('/admin') ? 'admin_interactions' :
                   pathname.includes('/student') ? 'student_interactions' :
                   pathname.includes('/lecturer') ? 'lecturer_interactions' :
                   pathname.includes('/accountant') ? 'accountant_interactions' :
                   'general_interactions';

    await logActivity('view', module, {
      buttonName,
      buttonType,
      context,
      clickTime: new Date().toISOString()
    }, 'button', buttonName);
  }, [enableButtonClicks, pathname, logActivity]);

  // Log data operations
  const logDataOperation = useCallback(async (
    operation: 'create' | 'update' | 'delete',
    resourceType: string,
    resourceId?: string,
    details?: any
  ) => {
    if (!enableUserActions) return;

    const module = pathname.includes('/admin') ? 'admin_data' :
                   pathname.includes('/student') ? 'student_data' :
                   pathname.includes('/lecturer') ? 'lecturer_data' :
                   pathname.includes('/accountant') ? 'accountant_data' :
                   'general_data';

    await logActivity(operation, module, {
      ...details,
      operationTime: new Date().toISOString()
    }, resourceType, resourceId);
  }, [enableUserActions, pathname, logActivity]);

  // Log exports and prints
  const logExportPrint = useCallback(async (
    action: 'export' | 'print',
    resourceType: string,
    format?: string,
    details?: any
  ) => {
    const module = pathname.includes('/admin') ? 'admin_exports' :
                   pathname.includes('/student') ? 'student_exports' :
                   pathname.includes('/lecturer') ? 'lecturer_exports' :
                   pathname.includes('/accountant') ? 'accountant_exports' :
                   'general_exports';

    await logActivity(action, module, {
      format,
      ...details,
      actionTime: new Date().toISOString()
    }, resourceType);
  }, [pathname, logActivity]);

  // Log authentication events
  const logAuthEvent = useCallback(async (
    event: 'login' | 'logout',
    success?: boolean,
    errorMessage?: string
  ) => {
    const userInfo = getCurrentUserInfo();
    
    await logActivity(event, 'authentication', {
      success,
      errorMessage,
      eventTime: new Date().toISOString(),
      loginMethod: 'username_password'
    });
  }, [logActivity, getCurrentUserInfo]);

  // Auto-log clicks on buttons and links
  useEffect(() => {
    if (!enableButtonClicks) return;

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // Log button clicks
      if (target.tagName === 'BUTTON' || target.closest('button')) {
        const button = target.tagName === 'BUTTON' ? target : target.closest('button');
        const buttonText = button?.textContent?.trim() || 'Unknown Button';
        const buttonType = button?.getAttribute('type') || 'button';
        
        logButtonClick(buttonText, buttonType, {
          className: button?.className,
          id: button?.id
        });
      }
      
      // Log link clicks
      if (target.tagName === 'A' || target.closest('a')) {
        const link = target.tagName === 'A' ? target : target.closest('a');
        const linkText = link?.textContent?.trim() || 'Unknown Link';
        const href = link?.getAttribute('href');
        
        logButtonClick(linkText, 'link', {
          href,
          className: link?.className,
          id: link?.id
        });
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [enableButtonClicks, logButtonClick]);

  // Auto-log form submissions
  useEffect(() => {
    if (!enableFormSubmissions) return;

    const handleSubmit = (event: SubmitEvent) => {
      const form = event.target as HTMLFormElement;
      const formName = form.getAttribute('name') || form.id || 'Unknown Form';
      
      // Get form data
      const formData = new FormData(form);
      const formObject: Record<string, any> = {};
      
      formData.forEach((value, key) => {
        // Don't log sensitive data
        if (!key.toLowerCase().includes('password') && !key.toLowerCase().includes('secret')) {
          formObject[key] = value;
        }
      });

      logFormSubmission(formName, formObject, true);
    };

    document.addEventListener('submit', handleSubmit);
    return () => document.removeEventListener('submit', handleSubmit);
  }, [enableFormSubmissions, logFormSubmission]);

  return {
    logActivity,
    logFormSubmission,
    logButtonClick,
    logDataOperation,
    logExportPrint,
    logAuthEvent
  };
};

// Higher-order component to wrap components with activity logging
export const withActivityLogging = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options?: ActivityLoggerOptions
) => {
  return function ActivityLoggedComponent(props: P) {
    const activityLogger = useActivityLogger(options);

    return <WrappedComponent {...props} activityLogger={activityLogger} />;
  };
};

export default useActivityLogger;
