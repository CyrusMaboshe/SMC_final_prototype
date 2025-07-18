'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { activityLogger } from '@/lib/supabase';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
  retryCount: number;
  isRecovering: boolean;
}

interface ResponsiveErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  enableRetry?: boolean;
  maxRetries?: number;
  showErrorDetails?: boolean;
  componentName?: string;
}

class ResponsiveErrorBoundary extends Component<ResponsiveErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeout: NodeJS.Timeout | null = null;

  constructor(props: ResponsiveErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      retryCount: 0,
      isRecovering: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    // Log error to activity logger
    this.logError(error, errorInfo);

    // Call custom error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Report to external error tracking service
    this.reportError(error, errorInfo);
  }

  private async logError(error: Error, errorInfo: ErrorInfo) {
    try {
      const user = JSON.parse(localStorage.getItem('user_id') || 'null');
      const userRole = localStorage.getItem('user_role');

      if (user && userRole) {
        await activityLogger.logActivity({
          userId: user,
          userRole,
          actionType: 'view',
          module: 'error_handling',
          resourceType: 'component_error',
          resourceId: this.state.errorId,
          details: {
            errorMessage: error.message,
            errorStack: error.stack,
            componentStack: errorInfo.componentStack,
            componentName: this.props.componentName,
            retryCount: this.state.retryCount,
            userAgent: navigator.userAgent,
            url: window.location.href,
            timestamp: new Date().toISOString()
          }
        });
      }
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
  }

  private reportError(error: Error, errorInfo: ErrorInfo) {
    // In production, this would send to error tracking service like Sentry
    console.error('Component Error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      componentName: this.props.componentName,
      errorId: this.state.errorId,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    });
  }

  private handleRetry = () => {
    const { maxRetries = 3 } = this.props;
    
    if (this.state.retryCount >= maxRetries) {
      return;
    }

    this.setState({ 
      isRecovering: true,
      retryCount: this.state.retryCount + 1
    });

    // Clear any existing timeout
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }

    // Retry after a delay
    this.retryTimeout = setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        isRecovering: false
      });
    }, 1000);
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleReportIssue = () => {
    const errorReport = {
      errorId: this.state.errorId,
      message: this.state.error?.message,
      stack: this.state.error?.stack,
      componentStack: this.state.errorInfo?.componentStack,
      componentName: this.props.componentName,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // Copy error report to clipboard
    navigator.clipboard.writeText(JSON.stringify(errorReport, null, 2))
      .then(() => {
        alert('Error report copied to clipboard. Please share this with support.');
      })
      .catch(() => {
        console.log('Error Report:', errorReport);
        alert('Error report logged to console. Please check browser console and share with support.');
      });
  };

  componentWillUnmount() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default responsive error UI
      return (
        <div className="responsive-error-boundary">
          <div className="responsive-error-container">
            <div className="responsive-error-icon">
              {this.state.isRecovering ? '🔄' : '⚠️'}
            </div>
            
            <h2 className="responsive-error-title">
              {this.state.isRecovering ? 'Recovering...' : 'Something went wrong'}
            </h2>
            
            <p className="responsive-error-message">
              {this.state.isRecovering 
                ? 'Attempting to recover the component...'
                : 'We encountered an unexpected error. This has been logged and will be investigated.'
              }
            </p>

            {this.props.componentName && (
              <p className="responsive-error-component">
                Component: {this.props.componentName}
              </p>
            )}

            <div className="responsive-error-id">
              Error ID: {this.state.errorId}
            </div>

            {this.props.showErrorDetails && this.state.error && (
              <details className="responsive-error-details">
                <summary className="responsive-error-details-summary">
                  Technical Details
                </summary>
                <div className="responsive-error-details-content">
                  <h4>Error Message:</h4>
                  <pre className="responsive-error-pre">{this.state.error.message}</pre>
                  
                  {this.state.error.stack && (
                    <>
                      <h4>Stack Trace:</h4>
                      <pre className="responsive-error-pre">{this.state.error.stack}</pre>
                    </>
                  )}
                  
                  {this.state.errorInfo?.componentStack && (
                    <>
                      <h4>Component Stack:</h4>
                      <pre className="responsive-error-pre">{this.state.errorInfo.componentStack}</pre>
                    </>
                  )}
                </div>
              </details>
            )}

            <div className="responsive-error-actions">
              {this.props.enableRetry && this.state.retryCount < (this.props.maxRetries || 3) && (
                <button
                  onClick={this.handleRetry}
                  disabled={this.state.isRecovering}
                  className="responsive-btn responsive-btn-primary"
                >
                  {this.state.isRecovering ? 'Retrying...' : `Retry (${this.state.retryCount}/${this.props.maxRetries || 3})`}
                </button>
              )}
              
              <button
                onClick={this.handleReload}
                className="responsive-btn responsive-btn-secondary"
              >
                Reload Page
              </button>
              
              <button
                onClick={this.handleReportIssue}
                className="responsive-btn responsive-btn-secondary"
              >
                Report Issue
              </button>
            </div>

            <div className="responsive-error-help">
              <h4>What can you do?</h4>
              <ul>
                <li>Try refreshing the page</li>
                <li>Check your internet connection</li>
                <li>Clear your browser cache</li>
                <li>Contact support if the problem persists</li>
              </ul>
            </div>
          </div>

          <style jsx>{`
            .responsive-error-boundary {
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 400px;
              padding: var(--space-lg);
              background: #fef2f2;
              border: 1px solid #fecaca;
              border-radius: clamp(0.5rem, 0.4rem + 0.5vw, 0.75rem);
              margin: var(--space-md);
            }

            .responsive-error-container {
              max-width: 600px;
              text-align: center;
              background: white;
              padding: var(--space-xl);
              border-radius: clamp(0.5rem, 0.4rem + 0.5vw, 0.75rem);
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }

            .responsive-error-icon {
              font-size: clamp(3rem, 2.5rem + 2.5vw, 4rem);
              margin-bottom: var(--space-md);
              animation: ${this.state.isRecovering ? 'spin 1s linear infinite' : 'none'};
            }

            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }

            .responsive-error-title {
              font-size: var(--text-2xl);
              font-weight: 700;
              color: #dc2626;
              margin-bottom: var(--space-md);
            }

            .responsive-error-message {
              font-size: var(--text-base);
              color: #374151;
              margin-bottom: var(--space-lg);
              line-height: 1.6;
            }

            .responsive-error-component {
              font-size: var(--text-sm);
              color: #6b7280;
              margin-bottom: var(--space-sm);
              font-family: monospace;
            }

            .responsive-error-id {
              font-size: var(--text-xs);
              color: #9ca3af;
              margin-bottom: var(--space-lg);
              font-family: monospace;
              background: #f3f4f6;
              padding: var(--space-xs) var(--space-sm);
              border-radius: var(--space-xs);
              display: inline-block;
            }

            .responsive-error-details {
              text-align: left;
              margin-bottom: var(--space-lg);
              border: 1px solid #e5e7eb;
              border-radius: var(--space-sm);
            }

            .responsive-error-details-summary {
              padding: var(--space-sm) var(--space-md);
              background: #f9fafb;
              cursor: pointer;
              font-weight: 500;
              border-bottom: 1px solid #e5e7eb;
            }

            .responsive-error-details-content {
              padding: var(--space-md);
            }

            .responsive-error-details-content h4 {
              font-size: var(--text-sm);
              font-weight: 600;
              color: #374151;
              margin: var(--space-md) 0 var(--space-sm) 0;
            }

            .responsive-error-pre {
              background: #1f2937;
              color: #f9fafb;
              padding: var(--space-sm);
              border-radius: var(--space-xs);
              font-size: var(--text-xs);
              overflow-x: auto;
              white-space: pre-wrap;
              word-break: break-word;
            }

            .responsive-error-actions {
              display: flex;
              flex-wrap: wrap;
              gap: var(--space-sm);
              justify-content: center;
              margin-bottom: var(--space-lg);
            }

            .responsive-error-help {
              text-align: left;
              background: #f0f9ff;
              padding: var(--space-md);
              border-radius: var(--space-sm);
              border: 1px solid #bae6fd;
            }

            .responsive-error-help h4 {
              font-size: var(--text-base);
              font-weight: 600;
              color: #0369a1;
              margin-bottom: var(--space-sm);
            }

            .responsive-error-help ul {
              margin: 0;
              padding-left: var(--space-lg);
              color: #0c4a6e;
            }

            .responsive-error-help li {
              margin-bottom: var(--space-xs);
              font-size: var(--text-sm);
            }

            @media (max-width: 768px) {
              .responsive-error-boundary {
                padding: var(--space-md);
                margin: var(--space-sm);
              }

              .responsive-error-container {
                padding: var(--space-lg);
              }

              .responsive-error-actions {
                flex-direction: column;
              }

              .responsive-error-actions .responsive-btn {
                width: 100%;
              }
            }
          `}</style>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for functional components to handle errors
export const useErrorHandler = () => {
  const handleError = React.useCallback((error: Error, errorInfo?: any) => {
    // Log error
    console.error('Handled Error:', error);
    
    // Report to error tracking
    if (typeof window !== 'undefined') {
      // Log to activity logger
      const user = JSON.parse(localStorage.getItem('user_id') || 'null');
      const userRole = localStorage.getItem('user_role');

      if (user && userRole) {
        activityLogger.logActivity({
          userId: user,
          userRole,
          actionType: 'view',
          module: 'error_handling',
          resourceType: 'handled_error',
          details: {
            errorMessage: error.message,
            errorStack: error.stack,
            errorInfo,
            timestamp: new Date().toISOString()
          }
        }).catch(console.error);
      }
    }
  }, []);

  return { handleError };
};

// Higher-order component for wrapping components with error boundary
export const withErrorBoundary = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Partial<ResponsiveErrorBoundaryProps>
) => {
  const WithErrorBoundaryComponent = (props: P) => (
    <ResponsiveErrorBoundary {...errorBoundaryProps}>
      <WrappedComponent {...props} />
    </ResponsiveErrorBoundary>
  );

  WithErrorBoundaryComponent.displayName = `withErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name})`;
  
  return WithErrorBoundaryComponent;
};

export default ResponsiveErrorBoundary;
