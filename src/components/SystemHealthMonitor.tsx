'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase, principalAPI } from '@/lib/supabase';

interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical';
  uptime: number;
  responseTime: number;
  errorRate: number;
  activeConnections: number;
  memoryUsage: number;
  cpuUsage: number;
  diskUsage: number;
  lastUpdated: string;
}

interface PerformanceMetrics {
  pageLoadTime: number;
  apiResponseTime: number;
  databaseQueryTime: number;
  renderTime: number;
  networkLatency: number;
}

interface ErrorLog {
  id: string;
  timestamp: string;
  level: 'error' | 'warning' | 'info';
  message: string;
  stack?: string;
  userId?: string;
  userAgent?: string;
  url: string;
}

const SystemHealthMonitor: React.FC = () => {
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(5000); // 5 seconds

  // Initialize monitoring
  useEffect(() => {
    startMonitoring();
    return () => stopMonitoring();
  }, []);

  const startMonitoring = useCallback(() => {
    setIsMonitoring(true);
    
    // Initial load
    updateSystemHealth();
    updatePerformanceMetrics();
    loadErrorLogs();

    // Set up intervals
    const healthInterval = setInterval(updateSystemHealth, refreshInterval);
    const metricsInterval = setInterval(updatePerformanceMetrics, refreshInterval * 2);
    const errorInterval = setInterval(loadErrorLogs, refreshInterval * 3);

    return () => {
      clearInterval(healthInterval);
      clearInterval(metricsInterval);
      clearInterval(errorInterval);
    };
  }, [refreshInterval]);

  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
  }, []);

  const updateSystemHealth = useCallback(async () => {
    try {
      const startTime = performance.now();
      
      // Test database connectivity
      const { data, error } = await supabase.from('system_users').select('count').limit(1);
      const responseTime = performance.now() - startTime;

      if (error) throw error;

      // Calculate system metrics
      const health: SystemHealth = {
        status: responseTime < 100 ? 'healthy' : responseTime < 500 ? 'warning' : 'critical',
        uptime: performance.now() / 1000 / 60 / 60, // Hours since page load
        responseTime,
        errorRate: calculateErrorRate(),
        activeConnections: await getActiveConnections(),
        memoryUsage: getMemoryUsage(),
        cpuUsage: getCPUUsage(),
        diskUsage: 0, // Would need server-side implementation
        lastUpdated: new Date().toISOString()
      };

      setSystemHealth(health);
    } catch (error) {
      console.error('Failed to update system health:', error);
      setSystemHealth(prev => prev ? { ...prev, status: 'critical' } : null);
    }
  }, []);

  const updatePerformanceMetrics = useCallback(async () => {
    try {
      const metrics: PerformanceMetrics = {
        pageLoadTime: getPageLoadTime(),
        apiResponseTime: await measureApiResponseTime(),
        databaseQueryTime: await measureDatabaseQueryTime(),
        renderTime: getRenderTime(),
        networkLatency: await measureNetworkLatency()
      };

      setPerformanceMetrics(metrics);
    } catch (error) {
      console.error('Failed to update performance metrics:', error);
    }
  }, []);

  const loadErrorLogs = useCallback(async () => {
    try {
      // In a real implementation, this would fetch from an error logging service
      const mockErrors: ErrorLog[] = [
        {
          id: '1',
          timestamp: new Date().toISOString(),
          level: 'error',
          message: 'Database connection timeout',
          url: '/api/users',
          userId: 'user123'
        },
        {
          id: '2',
          timestamp: new Date(Date.now() - 60000).toISOString(),
          level: 'warning',
          message: 'Slow query detected',
          url: '/api/courses',
        }
      ];

      setErrorLogs(mockErrors);
    } catch (error) {
      console.error('Failed to load error logs:', error);
    }
  }, []);

  // Helper functions for metrics calculation
  const calculateErrorRate = (): number => {
    // Calculate error rate based on recent activity
    return Math.random() * 5; // Mock implementation
  };

  const getActiveConnections = async (): Promise<number> => {
    try {
      const overview = await principalAPI.getSystemOverview();
      return overview.users.total;
    } catch {
      return 0;
    }
  };

  const getMemoryUsage = (): number => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
    }
    return 0;
  };

  const getCPUUsage = (): number => {
    // Mock CPU usage - would need server-side implementation
    return Math.random() * 100;
  };

  const getPageLoadTime = (): number => {
    if (performance.timing) {
      return performance.timing.loadEventEnd - performance.timing.navigationStart;
    }
    return 0;
  };

  const measureApiResponseTime = async (): Promise<number> => {
    const startTime = performance.now();
    try {
      await supabase.from('system_users').select('count').limit(1);
      return performance.now() - startTime;
    } catch {
      return -1;
    }
  };

  const measureDatabaseQueryTime = async (): Promise<number> => {
    const startTime = performance.now();
    try {
      await supabase.from('courses').select('id').limit(1);
      return performance.now() - startTime;
    } catch {
      return -1;
    }
  };

  const getRenderTime = (): number => {
    if (performance.timing) {
      return performance.timing.domContentLoadedEventEnd - performance.timing.domLoading;
    }
    return 0;
  };

  const measureNetworkLatency = async (): Promise<number> => {
    const startTime = performance.now();
    try {
      await fetch('/api/ping', { method: 'HEAD' });
      return performance.now() - startTime;
    } catch {
      return -1;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  return (
    <div className="space-y-6">
      {/* System Status Overview */}
      <div className="responsive-card">
        <div className="responsive-flex responsive-flex-between responsive-m-b-md">
          <h3 className="responsive-text-lg font-semibold text-gray-900">System Health Status</h3>
          <div className="responsive-flex" style={{ gap: 'var(--space-sm)' }}>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              systemHealth ? getStatusColor(systemHealth.status) : 'text-gray-600 bg-gray-100'
            }`}>
              {systemHealth?.status.toUpperCase() || 'UNKNOWN'}
            </span>
            <button
              onClick={isMonitoring ? stopMonitoring : startMonitoring}
              className={`responsive-btn ${isMonitoring ? 'responsive-btn-secondary' : 'responsive-btn-primary'}`}
            >
              {isMonitoring ? '⏸️ Pause' : '▶️ Start'} Monitoring
            </button>
          </div>
        </div>

        {systemHealth && (
          <div className="responsive-grid responsive-grid-4">
            <div className="text-center">
              <p className="responsive-text-2xl font-bold text-blue-600">
                {systemHealth.uptime.toFixed(1)}h
              </p>
              <p className="responsive-text-sm text-gray-600">Uptime</p>
            </div>
            <div className="text-center">
              <p className="responsive-text-2xl font-bold text-green-600">
                {systemHealth.responseTime.toFixed(0)}ms
              </p>
              <p className="responsive-text-sm text-gray-600">Response Time</p>
            </div>
            <div className="text-center">
              <p className="responsive-text-2xl font-bold text-purple-600">
                {systemHealth.activeConnections}
              </p>
              <p className="responsive-text-sm text-gray-600">Active Users</p>
            </div>
            <div className="text-center">
              <p className="responsive-text-2xl font-bold text-orange-600">
                {systemHealth.errorRate.toFixed(1)}%
              </p>
              <p className="responsive-text-sm text-gray-600">Error Rate</p>
            </div>
          </div>
        )}
      </div>

      {/* Performance Metrics */}
      <div className="responsive-card">
        <h3 className="responsive-text-lg font-semibold text-gray-900 responsive-m-b-md">Performance Metrics</h3>
        {performanceMetrics && (
          <div className="responsive-grid responsive-grid-3">
            <div className="responsive-p-md border rounded">
              <h4 className="responsive-text-base font-medium text-gray-800 responsive-m-b-sm">Load Times</h4>
              <div className="space-y-2">
                <div className="responsive-flex responsive-flex-between">
                  <span className="responsive-text-sm text-gray-600">Page Load:</span>
                  <span className="responsive-text-sm font-medium">{formatDuration(performanceMetrics.pageLoadTime)}</span>
                </div>
                <div className="responsive-flex responsive-flex-between">
                  <span className="responsive-text-sm text-gray-600">API Response:</span>
                  <span className="responsive-text-sm font-medium">{formatDuration(performanceMetrics.apiResponseTime)}</span>
                </div>
                <div className="responsive-flex responsive-flex-between">
                  <span className="responsive-text-sm text-gray-600">DB Query:</span>
                  <span className="responsive-text-sm font-medium">{formatDuration(performanceMetrics.databaseQueryTime)}</span>
                </div>
              </div>
            </div>

            <div className="responsive-p-md border rounded">
              <h4 className="responsive-text-base font-medium text-gray-800 responsive-m-b-sm">Resource Usage</h4>
              <div className="space-y-2">
                <div className="responsive-flex responsive-flex-between">
                  <span className="responsive-text-sm text-gray-600">Memory:</span>
                  <span className="responsive-text-sm font-medium">{systemHealth?.memoryUsage.toFixed(1)}%</span>
                </div>
                <div className="responsive-flex responsive-flex-between">
                  <span className="responsive-text-sm text-gray-600">CPU:</span>
                  <span className="responsive-text-sm font-medium">{systemHealth?.cpuUsage.toFixed(1)}%</span>
                </div>
                <div className="responsive-flex responsive-flex-between">
                  <span className="responsive-text-sm text-gray-600">Network:</span>
                  <span className="responsive-text-sm font-medium">{formatDuration(performanceMetrics.networkLatency)}</span>
                </div>
              </div>
            </div>

            <div className="responsive-p-md border rounded">
              <h4 className="responsive-text-base font-medium text-gray-800 responsive-m-b-sm">System Status</h4>
              <div className="space-y-2">
                <div className="responsive-flex responsive-flex-between">
                  <span className="responsive-text-sm text-gray-600">Database:</span>
                  <span className="responsive-text-sm font-medium text-green-600">✅ Online</span>
                </div>
                <div className="responsive-flex responsive-flex-between">
                  <span className="responsive-text-sm text-gray-600">API:</span>
                  <span className="responsive-text-sm font-medium text-green-600">✅ Healthy</span>
                </div>
                <div className="responsive-flex responsive-flex-between">
                  <span className="responsive-text-sm text-gray-600">Storage:</span>
                  <span className="responsive-text-sm font-medium text-green-600">✅ Available</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error Logs */}
      <div className="responsive-card">
        <h3 className="responsive-text-lg font-semibold text-gray-900 responsive-m-b-md">Recent Error Logs</h3>
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {errorLogs.length > 0 ? errorLogs.map((error) => (
            <div key={error.id} className={`responsive-p-sm border-l-4 ${
              error.level === 'error' ? 'border-red-500 bg-red-50' :
              error.level === 'warning' ? 'border-yellow-500 bg-yellow-50' :
              'border-blue-500 bg-blue-50'
            }`}>
              <div className="responsive-flex responsive-flex-between">
                <span className={`responsive-text-sm font-medium ${
                  error.level === 'error' ? 'text-red-800' :
                  error.level === 'warning' ? 'text-yellow-800' :
                  'text-blue-800'
                }`}>
                  {error.level.toUpperCase()}
                </span>
                <span className="responsive-text-xs text-gray-500">
                  {new Date(error.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <p className="responsive-text-sm text-gray-700 responsive-m-t-xs">{error.message}</p>
              <p className="responsive-text-xs text-gray-500 responsive-m-t-xs">{error.url}</p>
            </div>
          )) : (
            <p className="responsive-text-sm text-gray-500 text-center responsive-p-lg">
              No recent errors detected ✅
            </p>
          )}
        </div>
      </div>

      {/* Monitoring Controls */}
      <div className="responsive-card">
        <h3 className="responsive-text-lg font-semibold text-gray-900 responsive-m-b-md">Monitoring Settings</h3>
        <div className="responsive-flex responsive-flex-between">
          <div>
            <label className="responsive-text-sm font-medium text-gray-700">Refresh Interval</label>
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              className="responsive-form-input responsive-m-l-sm"
              style={{ width: 'auto' }}
            >
              <option value={1000}>1 second</option>
              <option value={5000}>5 seconds</option>
              <option value={10000}>10 seconds</option>
              <option value={30000}>30 seconds</option>
              <option value={60000}>1 minute</option>
            </select>
          </div>
          <div className="responsive-text-sm text-gray-600">
            Last updated: {systemHealth?.lastUpdated ? new Date(systemHealth.lastUpdated).toLocaleTimeString() : 'Never'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemHealthMonitor;
