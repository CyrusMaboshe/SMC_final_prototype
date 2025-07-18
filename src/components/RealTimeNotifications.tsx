'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, activityLogger } from '@/lib/supabase';

interface Notification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success' | 'critical';
  title: string;
  message: string;
  timestamp: string;
  userId?: string;
  userRole?: string;
  module?: string;
  actionType?: string;
  data?: any;
  read: boolean;
  persistent: boolean;
}

interface NotificationRule {
  id: string;
  name: string;
  enabled: boolean;
  conditions: {
    actionTypes?: string[];
    userRoles?: string[];
    modules?: string[];
    errorKeywords?: string[];
    thresholds?: {
      activityCount?: number;
      timeWindow?: number; // minutes
      errorRate?: number;
    };
  };
  notificationType: 'info' | 'warning' | 'error' | 'critical';
  message: string;
}

const RealTimeNotifications: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationRules, setNotificationRules] = useState<NotificationRule[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showOnlyUnread, setShowOnlyUnread] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const monitoringInterval = useRef<NodeJS.Timeout | null>(null);

  // Initialize notification system
  useEffect(() => {
    initializeNotifications();
    loadNotificationRules();
    startMonitoring();

    return () => {
      stopMonitoring();
    };
  }, []);

  // Update unread count
  useEffect(() => {
    setUnreadCount(notifications.filter(n => !n.read).length);
  }, [notifications]);

  const initializeNotifications = () => {
    // Load notifications from localStorage
    const stored = localStorage.getItem('principal_notifications');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setNotifications(parsed);
      } catch (error) {
        console.error('Failed to load stored notifications:', error);
      }
    }

    // Initialize audio for notifications
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio('/notification-sound.mp3'); // You'd need to add this file
      audioRef.current.volume = 0.5;
    }
  };

  const loadNotificationRules = () => {
    const defaultRules: NotificationRule[] = [
      {
        id: 'high_error_rate',
        name: 'High Error Rate',
        enabled: true,
        conditions: {
          thresholds: { errorRate: 0.05, timeWindow: 5 }
        },
        notificationType: 'critical',
        message: 'System error rate exceeded 5% in the last 5 minutes'
      },
      {
        id: 'admin_actions',
        name: 'Admin Actions',
        enabled: true,
        conditions: {
          userRoles: ['admin'],
          actionTypes: ['create', 'update', 'delete']
        },
        notificationType: 'info',
        message: 'Admin performed critical action'
      },
      {
        id: 'failed_logins',
        name: 'Failed Login Attempts',
        enabled: true,
        conditions: {
          actionTypes: ['login'],
          errorKeywords: ['failed', 'invalid', 'denied']
        },
        notificationType: 'warning',
        message: 'Multiple failed login attempts detected'
      },
      {
        id: 'system_errors',
        name: 'System Errors',
        enabled: true,
        conditions: {
          actionTypes: ['error'],
          modules: ['system', 'database', 'api']
        },
        notificationType: 'error',
        message: 'System error detected'
      },
      {
        id: 'high_activity',
        name: 'High Activity',
        enabled: true,
        conditions: {
          thresholds: { activityCount: 100, timeWindow: 10 }
        },
        notificationType: 'info',
        message: 'Unusually high system activity detected'
      }
    ];

    setNotificationRules(defaultRules);
  };

  const startMonitoring = () => {
    if (isMonitoring) return;

    setIsMonitoring(true);
    
    // Monitor activity logs for new events
    monitoringInterval.current = setInterval(async () => {
      await checkForNewNotifications();
    }, 5000); // Check every 5 seconds

    // Set up real-time subscription for critical events
    const subscription = supabase
      .channel('activity_logs')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'activity_logs' },
        (payload) => {
          processNewActivity(payload.new);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const stopMonitoring = () => {
    setIsMonitoring(false);
    if (monitoringInterval.current) {
      clearInterval(monitoringInterval.current);
    }
  };

  const checkForNewNotifications = async () => {
    try {
      // Get recent activity logs
      const recentLogs = await activityLogger.getActivityLogs({
        startDate: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // Last 5 minutes
        limit: 100
      });

      // Process logs against notification rules
      for (const rule of notificationRules) {
        if (!rule.enabled) continue;
        
        const matchingLogs = recentLogs.filter(log => matchesRule(log, rule));
        
        if (shouldTriggerNotification(matchingLogs, rule)) {
          createNotification(rule, matchingLogs);
        }
      }
    } catch (error) {
      console.error('Failed to check for notifications:', error);
    }
  };

  const processNewActivity = (activity: any) => {
    // Process real-time activity against rules
    for (const rule of notificationRules) {
      if (!rule.enabled) continue;
      
      if (matchesRule(activity, rule)) {
        createNotification(rule, [activity]);
      }
    }
  };

  const matchesRule = (log: any, rule: NotificationRule): boolean => {
    const { conditions } = rule;
    
    // Check action types
    if (conditions.actionTypes && !conditions.actionTypes.includes(log.action_type)) {
      return false;
    }
    
    // Check user roles
    if (conditions.userRoles && !conditions.userRoles.includes(log.user_role)) {
      return false;
    }
    
    // Check modules
    if (conditions.modules && !conditions.modules.includes(log.module)) {
      return false;
    }
    
    // Check error keywords
    if (conditions.errorKeywords) {
      const hasErrorKeyword = conditions.errorKeywords.some(keyword =>
        log.details?.error?.toLowerCase().includes(keyword.toLowerCase()) ||
        log.details?.message?.toLowerCase().includes(keyword.toLowerCase())
      );
      if (!hasErrorKeyword) return false;
    }
    
    return true;
  };

  const shouldTriggerNotification = (logs: any[], rule: NotificationRule): boolean => {
    if (logs.length === 0) return false;
    
    const { thresholds } = rule.conditions;
    if (!thresholds) return logs.length > 0;
    
    // Check activity count threshold
    if (thresholds.activityCount && logs.length < thresholds.activityCount) {
      return false;
    }
    
    // Check error rate threshold
    if (thresholds.errorRate) {
      const errorLogs = logs.filter(log => 
        log.action_type === 'error' || 
        log.details?.error ||
        log.details?.success === false
      );
      const errorRate = errorLogs.length / logs.length;
      if (errorRate < thresholds.errorRate) return false;
    }
    
    return true;
  };

  const createNotification = (rule: NotificationRule, logs: any[]) => {
    // Check if similar notification already exists (prevent spam)
    const recentSimilar = notifications.find(n => 
      n.type === rule.notificationType &&
      n.title.includes(rule.name) &&
      Date.now() - new Date(n.timestamp).getTime() < 60000 // Within last minute
    );
    
    if (recentSimilar) return;

    const notification: Notification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: rule.notificationType,
      title: rule.name,
      message: `${rule.message} (${logs.length} events)`,
      timestamp: new Date().toISOString(),
      userId: logs[0]?.user_id,
      userRole: logs[0]?.user_role,
      module: logs[0]?.module,
      actionType: logs[0]?.action_type,
      data: { logs: logs.slice(0, 5) }, // Store first 5 logs
      read: false,
      persistent: rule.notificationType === 'critical'
    };

    addNotification(notification);
  };

  const addNotification = (notification: Notification) => {
    setNotifications(prev => {
      const updated = [notification, ...prev].slice(0, 100); // Keep last 100
      
      // Save to localStorage
      localStorage.setItem('principal_notifications', JSON.stringify(updated));
      
      return updated;
    });

    // Play sound if enabled
    if (soundEnabled && audioRef.current) {
      audioRef.current.play().catch(() => {
        // Ignore audio play errors (user interaction required)
      });
    }

    // Show browser notification if permission granted
    if (Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        tag: notification.id
      });
    }
  };

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const deleteNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    localStorage.removeItem('principal_notifications');
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'critical': return '🚨';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'success': return '✅';
      default: return 'ℹ️';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'critical': return 'border-red-600 bg-red-50 text-red-800';
      case 'error': return 'border-red-500 bg-red-50 text-red-700';
      case 'warning': return 'border-yellow-500 bg-yellow-50 text-yellow-700';
      case 'success': return 'border-green-500 bg-green-50 text-green-700';
      default: return 'border-blue-500 bg-blue-50 text-blue-700';
    }
  };

  const filteredNotifications = showOnlyUnread 
    ? notifications.filter(n => !n.read)
    : notifications;

  return (
    <>
      {/* Notification Bell */}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative responsive-btn responsive-btn-secondary"
          aria-label="Notifications"
        >
          <span className="responsive-text-lg">🔔</span>
          {unreadCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* Notification Panel */}
        {isOpen && (
          <div className="absolute right-0 top-full mt-2 w-96 max-w-screen bg-white border border-gray-200 rounded-lg shadow-lg z-50">
            {/* Header */}
            <div className="responsive-p-md border-b border-gray-200">
              <div className="responsive-flex responsive-flex-between">
                <h3 className="responsive-text-lg font-semibold text-gray-900">
                  Notifications
                </h3>
                <div className="responsive-flex" style={{ gap: 'var(--space-xs)' }}>
                  <button
                    onClick={() => setShowOnlyUnread(!showOnlyUnread)}
                    className={`responsive-text-xs px-2 py-1 rounded ${
                      showOnlyUnread ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {showOnlyUnread ? 'Show All' : 'Unread Only'}
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="responsive-text-lg text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
              </div>
              
              <div className="responsive-flex responsive-flex-between responsive-m-t-sm">
                <span className="responsive-text-sm text-gray-600">
                  {unreadCount} unread of {notifications.length}
                </span>
                <div className="responsive-flex" style={{ gap: 'var(--space-xs)' }}>
                  <button
                    onClick={markAllAsRead}
                    className="responsive-text-xs text-blue-600 hover:text-blue-800"
                  >
                    Mark all read
                  </button>
                  <button
                    onClick={clearAllNotifications}
                    className="responsive-text-xs text-red-600 hover:text-red-800"
                  >
                    Clear all
                  </button>
                </div>
              </div>
            </div>

            {/* Settings */}
            <div className="responsive-p-sm border-b border-gray-200 bg-gray-50">
              <div className="responsive-flex responsive-flex-between">
                <label className="responsive-flex" style={{ alignItems: 'center', gap: 'var(--space-xs)' }}>
                  <input
                    type="checkbox"
                    checked={soundEnabled}
                    onChange={(e) => setSoundEnabled(e.target.checked)}
                  />
                  <span className="responsive-text-xs text-gray-600">Sound</span>
                </label>
                
                <label className="responsive-flex" style={{ alignItems: 'center', gap: 'var(--space-xs)' }}>
                  <input
                    type="checkbox"
                    checked={isMonitoring}
                    onChange={(e) => e.target.checked ? startMonitoring() : stopMonitoring()}
                  />
                  <span className="responsive-text-xs text-gray-600">
                    {isMonitoring ? '🟢 Monitoring' : '🔴 Paused'}
                  </span>
                </label>

                <button
                  onClick={requestNotificationPermission}
                  className="responsive-text-xs text-blue-600 hover:text-blue-800"
                >
                  Enable Browser Notifications
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-96 overflow-y-auto">
              {filteredNotifications.length > 0 ? (
                filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`responsive-p-sm border-b border-gray-100 ${
                      !notification.read ? 'bg-blue-50' : 'bg-white'
                    } hover:bg-gray-50 cursor-pointer`}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="responsive-flex">
                      <span className="responsive-text-lg responsive-m-r-sm">
                        {getNotificationIcon(notification.type)}
                      </span>
                      <div className="flex-1">
                        <div className="responsive-flex responsive-flex-between">
                          <h4 className="responsive-text-sm font-medium text-gray-900">
                            {notification.title}
                          </h4>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notification.id);
                            }}
                            className="responsive-text-xs text-gray-400 hover:text-gray-600"
                          >
                            ✕
                          </button>
                        </div>
                        <p className="responsive-text-xs text-gray-600 responsive-m-t-xs">
                          {notification.message}
                        </p>
                        <div className="responsive-flex responsive-flex-between responsive-m-t-xs">
                          <span className="responsive-text-xs text-gray-500">
                            {new Date(notification.timestamp).toLocaleTimeString()}
                          </span>
                          {notification.userRole && (
                            <span className="responsive-text-xs text-gray-500">
                              {notification.userRole}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="responsive-p-lg text-center text-gray-500">
                  <span className="responsive-text-2xl block responsive-m-b-sm">🔕</span>
                  <p className="responsive-text-sm">
                    {showOnlyUnread ? 'No unread notifications' : 'No notifications'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
};

export default RealTimeNotifications;
