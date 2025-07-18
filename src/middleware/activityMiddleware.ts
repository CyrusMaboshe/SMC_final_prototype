'use client';

import { NextRequest, NextResponse } from 'next/server';
import { activityLogger } from '@/lib/supabase';

// Activity logging middleware for comprehensive system monitoring
export async function activityMiddleware(request: NextRequest) {
  const response = NextResponse.next();

  // Skip logging for static assets and API routes that don't need logging
  const skipPaths = [
    '/_next/',
    '/favicon.ico',
    '/api/health',
    '/api/ping',
    '/static/',
    '/images/',
    '/css/',
    '/js/'
  ];

  const shouldSkip = skipPaths.some(path => request.nextUrl.pathname.startsWith(path));
  if (shouldSkip) {
    return response;
  }

  try {
    // Extract user information from headers or cookies
    const userId = request.headers.get('x-user-id') || request.cookies.get('user_id')?.value;
    const userRole = request.headers.get('x-user-role') || request.cookies.get('user_role')?.value;
    const username = request.headers.get('x-username') || request.cookies.get('username')?.value;

    if (userId && userRole) {
      // Determine module from pathname
      const getModuleFromPath = (pathname: string) => {
        if (pathname.includes('/admin')) return 'admin_system';
        if (pathname.includes('/student')) return 'student_system';
        if (pathname.includes('/lecturer')) return 'lecturer_system';
        if (pathname.includes('/accountant')) return 'accountant_system';
        if (pathname.includes('/principal')) return 'principal_system';
        if (pathname.includes('/api/')) return 'api_system';
        return 'public_system';
      };

      // Determine action type from method and path
      const getActionType = (method: string, pathname: string) => {
        if (method === 'GET') return 'view';
        if (method === 'POST' && pathname.includes('/login')) return 'login';
        if (method === 'POST' && pathname.includes('/logout')) return 'logout';
        if (method === 'POST') return 'create';
        if (method === 'PUT' || method === 'PATCH') return 'update';
        if (method === 'DELETE') return 'delete';
        return 'view';
      };

      const module = getModuleFromPath(request.nextUrl.pathname);
      const actionType = getActionType(request.method, request.nextUrl.pathname);

      // Log the activity asynchronously (don't block the request)
      setImmediate(async () => {
        try {
          await activityLogger.logActivity({
            userId,
            userRole,
            actionType: actionType as any,
            module,
            details: {
              pathname: request.nextUrl.pathname,
              method: request.method,
              searchParams: Object.fromEntries(request.nextUrl.searchParams),
              timestamp: new Date().toISOString(),
              username,
              referer: request.headers.get('referer'),
              origin: request.headers.get('origin')
            },
            ipAddress: request.ip || request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
            userAgent: request.headers.get('user-agent'),
            sessionId: request.cookies.get('session_id')?.value
          });
        } catch (error) {
          console.error('Failed to log activity in middleware:', error);
        }
      });
    }
  } catch (error) {
    console.error('Activity middleware error:', error);
  }

  return response;
}

// Client-side activity tracker for comprehensive logging
export class ClientActivityTracker {
  private static instance: ClientActivityTracker;
  private isInitialized = false;
  private userId: string | null = null;
  private userRole: string | null = null;
  private username: string | null = null;
  private sessionId: string | null = null;

  private constructor() {}

  static getInstance(): ClientActivityTracker {
    if (!ClientActivityTracker.instance) {
      ClientActivityTracker.instance = new ClientActivityTracker();
    }
    return ClientActivityTracker.instance;
  }

  initialize() {
    if (this.isInitialized || typeof window === 'undefined') return;

    // Get user info from localStorage
    this.userId = localStorage.getItem('user_id');
    this.userRole = localStorage.getItem('user_role');
    this.username = localStorage.getItem('username');
    this.sessionId = sessionStorage.getItem('session_id') || this.generateSessionId();

    if (this.userId && this.userRole) {
      this.setupEventListeners();
      this.trackPageView();
      this.isInitialized = true;
    }
  }

  private generateSessionId(): string {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('session_id', sessionId);
    return sessionId;
  }

  private setupEventListeners() {
    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      this.logActivity('view', 'page_visibility', {
        visibility: document.visibilityState,
        timestamp: new Date().toISOString()
      });
    });

    // Track beforeunload (page leaving)
    window.addEventListener('beforeunload', () => {
      this.logActivity('view', 'page_unload', {
        duration: Date.now() - this.getPageLoadTime(),
        timestamp: new Date().toISOString()
      });
    });

    // Track focus/blur events
    window.addEventListener('focus', () => {
      this.logActivity('view', 'window_focus', {
        timestamp: new Date().toISOString()
      });
    });

    window.addEventListener('blur', () => {
      this.logActivity('view', 'window_blur', {
        timestamp: new Date().toISOString()
      });
    });

    // Track scroll behavior
    let scrollTimeout: NodeJS.Timeout;
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        this.logActivity('view', 'page_scroll', {
          scrollY: window.scrollY,
          scrollPercent: Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100),
          timestamp: new Date().toISOString()
        });
      }, 1000);
    });

    // Track form interactions
    document.addEventListener('submit', (event) => {
      const form = event.target as HTMLFormElement;
      const formName = form.getAttribute('name') || form.id || 'unknown_form';
      
      this.logActivity('create', 'form_submission', {
        formName,
        action: form.action,
        method: form.method,
        timestamp: new Date().toISOString()
      });
    });

    // Track button clicks
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      const button = target.closest('button') || (target.tagName === 'BUTTON' ? target : null);
      
      if (button) {
        this.logActivity('view', 'button_click', {
          buttonText: button.textContent?.trim() || 'unknown',
          buttonType: button.getAttribute('type') || 'button',
          buttonId: button.id,
          buttonClass: button.className,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Track link clicks
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      const link = target.closest('a') || (target.tagName === 'A' ? target : null);
      
      if (link) {
        this.logActivity('view', 'link_click', {
          linkText: link.textContent?.trim() || 'unknown',
          href: link.getAttribute('href'),
          linkId: link.id,
          linkClass: link.className,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Track input focus (for form analytics)
    document.addEventListener('focusin', (event) => {
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        this.logActivity('view', 'input_focus', {
          inputType: target.getAttribute('type') || target.tagName.toLowerCase(),
          inputName: target.getAttribute('name'),
          inputId: target.id,
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  private trackPageView() {
    this.logActivity('view', 'page_view', {
      pathname: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash,
      referrer: document.referrer,
      timestamp: new Date().toISOString(),
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight
    });
  }

  private getPageLoadTime(): number {
    return performance.timing?.navigationStart || Date.now();
  }

  private async logActivity(
    actionType: 'login' | 'logout' | 'create' | 'update' | 'delete' | 'view' | 'export' | 'print',
    resourceType: string,
    details: any
  ) {
    if (!this.userId || !this.userRole) return;

    try {
      const module = this.getModuleFromPath(window.location.pathname);
      
      await activityLogger.logActivity({
        userId: this.userId,
        userRole: this.userRole,
        actionType,
        module,
        resourceType,
        details: {
          ...details,
          pathname: window.location.pathname,
          username: this.username
        },
        userAgent: navigator.userAgent,
        sessionId: this.sessionId
      });
    } catch (error) {
      console.error('Failed to log client activity:', error);
    }
  }

  private getModuleFromPath(pathname: string): string {
    if (pathname.includes('/admin')) return 'admin_client';
    if (pathname.includes('/student')) return 'student_client';
    if (pathname.includes('/lecturer')) return 'lecturer_client';
    if (pathname.includes('/accountant')) return 'accountant_client';
    if (pathname.includes('/principal')) return 'principal_client';
    return 'public_client';
  }

  // Public methods for manual logging
  logCustomActivity(actionType: any, resourceType: string, details: any) {
    this.logActivity(actionType, resourceType, details);
  }

  logDataOperation(operation: 'create' | 'update' | 'delete', resourceType: string, resourceId?: string, details?: any) {
    this.logActivity(operation, resourceType, {
      ...details,
      resourceId,
      timestamp: new Date().toISOString()
    });
  }

  logExportPrint(action: 'export' | 'print', resourceType: string, format?: string, details?: any) {
    this.logActivity(action, resourceType, {
      format,
      ...details,
      timestamp: new Date().toISOString()
    });
  }
}

// Initialize client-side tracking
if (typeof window !== 'undefined') {
  const tracker = ClientActivityTracker.getInstance();
  
  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => tracker.initialize());
  } else {
    tracker.initialize();
  }
}

export default ClientActivityTracker;
