'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { activityLogger } from '@/lib/supabase';

interface ActivityPattern {
  hour: number;
  count: number;
  actions: Record<string, number>;
  users: Record<string, number>;
}

interface UserBehavior {
  userId: string;
  username: string;
  role: string;
  totalActions: number;
  mostActiveHour: number;
  favoriteActions: string[];
  sessionDuration: number;
  lastActive: string;
  activityScore: number;
}

interface SystemInsight {
  type: 'peak_usage' | 'unusual_activity' | 'performance_correlation' | 'user_pattern';
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  data: any;
  timestamp: string;
}

const ActivityAnalytics: React.FC = () => {
  const [timeframe, setTimeframe] = useState<'today' | 'week' | 'month'>('today');
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<SystemInsight[]>([]);

  useEffect(() => {
    loadActivityData();
  }, [timeframe]);

  const loadActivityData = async () => {
    setLoading(true);
    try {
      const now = new Date();
      let startDate: Date;

      switch (timeframe) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
      }

      const logs = await activityLogger.getActivityLogs({
        startDate: startDate.toISOString(),
        limit: 1000
      });

      setActivityLogs(logs || []);
      generateInsights(logs || []);
    } catch (error) {
      console.error('Failed to load activity data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Generate hourly activity patterns
  const hourlyPatterns = useMemo((): ActivityPattern[] => {
    const patterns: ActivityPattern[] = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      count: 0,
      actions: {},
      users: {}
    }));

    activityLogs.forEach(log => {
      const hour = new Date(log.timestamp).getHours();
      const pattern = patterns[hour];
      
      pattern.count++;
      pattern.actions[log.action_type] = (pattern.actions[log.action_type] || 0) + 1;
      pattern.users[log.user_role] = (pattern.users[log.user_role] || 0) + 1;
    });

    return patterns;
  }, [activityLogs]);

  // Analyze user behavior patterns
  const userBehaviors = useMemo((): UserBehavior[] => {
    const userMap = new Map<string, any>();

    activityLogs.forEach(log => {
      const userId = log.user_id;
      if (!userMap.has(userId)) {
        userMap.set(userId, {
          userId,
          username: log.system_users?.username || 'Unknown',
          role: log.user_role,
          actions: [],
          hours: [],
          sessions: new Set(),
          firstActivity: log.timestamp,
          lastActivity: log.timestamp
        });
      }

      const user = userMap.get(userId);
      user.actions.push(log.action_type);
      user.hours.push(new Date(log.timestamp).getHours());
      if (log.session_id) user.sessions.add(log.session_id);
      user.lastActivity = log.timestamp;
    });

    return Array.from(userMap.values()).map(user => {
      const actionCounts = user.actions.reduce((acc: any, action: string) => {
        acc[action] = (acc[action] || 0) + 1;
        return acc;
      }, {});

      const hourCounts = user.hours.reduce((acc: any, hour: number) => {
        acc[hour] = (acc[hour] || 0) + 1;
        return acc;
      }, {});

      const mostActiveHour = Object.entries(hourCounts)
        .sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0] || '0';

      const favoriteActions = Object.entries(actionCounts)
        .sort(([,a], [,b]) => (b as number) - (a as number))
        .slice(0, 3)
        .map(([action]) => action);

      const sessionDuration = user.sessions.size > 0 ? 
        (new Date(user.lastActivity).getTime() - new Date(user.firstActivity).getTime()) / user.sessions.size : 0;

      const activityScore = user.actions.length * 10 + user.sessions.size * 50;

      return {
        userId: user.userId,
        username: user.username,
        role: user.role,
        totalActions: user.actions.length,
        mostActiveHour: parseInt(mostActiveHour),
        favoriteActions,
        sessionDuration,
        lastActive: user.lastActivity,
        activityScore
      };
    }).sort((a, b) => b.activityScore - a.activityScore);
  }, [activityLogs]);

  // Generate system insights
  const generateInsights = (logs: any[]) => {
    const insights: SystemInsight[] = [];

    // Peak usage analysis
    const peakHour = hourlyPatterns.reduce((max, pattern) => 
      pattern.count > max.count ? pattern : max, hourlyPatterns[0]);

    if (peakHour.count > 0) {
      insights.push({
        type: 'peak_usage',
        title: 'Peak Usage Time Identified',
        description: `Highest activity occurs at ${peakHour.hour}:00 with ${peakHour.count} actions`,
        severity: 'info',
        data: { hour: peakHour.hour, count: peakHour.count },
        timestamp: new Date().toISOString()
      });
    }

    // Unusual activity detection
    const avgActivity = logs.length / 24;
    const unusualHours = hourlyPatterns.filter(p => p.count > avgActivity * 2);
    
    if (unusualHours.length > 0) {
      insights.push({
        type: 'unusual_activity',
        title: 'Unusual Activity Spike Detected',
        description: `Activity is ${Math.round(unusualHours[0].count / avgActivity)}x higher than average during certain hours`,
        severity: 'warning',
        data: { hours: unusualHours.map(h => h.hour) },
        timestamp: new Date().toISOString()
      });
    }

    // User pattern analysis
    const highActivityUsers = userBehaviors.filter(u => u.activityScore > 500);
    if (highActivityUsers.length > 0) {
      insights.push({
        type: 'user_pattern',
        title: 'High Activity Users Identified',
        description: `${highActivityUsers.length} users showing exceptionally high activity levels`,
        severity: 'info',
        data: { users: highActivityUsers.slice(0, 5) },
        timestamp: new Date().toISOString()
      });
    }

    // Performance correlation
    const errorActions = logs.filter(log => log.details?.error || log.action_type === 'error');
    if (errorActions.length > logs.length * 0.05) {
      insights.push({
        type: 'performance_correlation',
        title: 'High Error Rate Detected',
        description: `Error rate is ${((errorActions.length / logs.length) * 100).toFixed(1)}% - above normal threshold`,
        severity: 'critical',
        data: { errorRate: errorActions.length / logs.length, errors: errorActions.slice(0, 10) },
        timestamp: new Date().toISOString()
      });
    }

    setInsights(insights);
  };

  const formatDuration = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'peak_usage': return '📈';
      case 'unusual_activity': return '⚠️';
      case 'performance_correlation': return '🔍';
      case 'user_pattern': return '👤';
      default: return 'ℹ️';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'border-red-500 bg-red-50 text-red-800';
      case 'warning': return 'border-yellow-500 bg-yellow-50 text-yellow-800';
      default: return 'border-blue-500 bg-blue-50 text-blue-800';
    }
  };

  if (loading) {
    return (
      <div className="responsive-card">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="responsive-card">
        <div className="responsive-flex responsive-flex-between">
          <h2 className="responsive-text-2xl font-bold text-gray-900">Activity Analytics</h2>
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value as any)}
            className="responsive-form-input"
            style={{ width: 'auto' }}
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </div>
      </div>

      {/* System Insights */}
      <div className="responsive-card">
        <h3 className="responsive-text-lg font-semibold text-gray-900 responsive-m-b-md">System Insights</h3>
        <div className="space-y-3">
          {insights.length > 0 ? insights.map((insight, index) => (
            <div key={index} className={`responsive-p-md border-l-4 rounded ${getSeverityColor(insight.severity)}`}>
              <div className="responsive-flex">
                <span className="responsive-text-lg responsive-m-r-sm">{getInsightIcon(insight.type)}</span>
                <div className="flex-1">
                  <h4 className="responsive-text-base font-medium">{insight.title}</h4>
                  <p className="responsive-text-sm responsive-m-t-xs">{insight.description}</p>
                  <p className="responsive-text-xs responsive-m-t-sm opacity-75">
                    {new Date(insight.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )) : (
            <p className="responsive-text-sm text-gray-500 text-center responsive-p-lg">
              No significant insights detected for this timeframe
            </p>
          )}
        </div>
      </div>

      {/* Hourly Activity Pattern */}
      <div className="responsive-card">
        <h3 className="responsive-text-lg font-semibold text-gray-900 responsive-m-b-md">Hourly Activity Pattern</h3>
        <div className="responsive-grid responsive-grid-4">
          {hourlyPatterns.filter((_, index) => index % 6 === 0).map((pattern) => (
            <div key={pattern.hour} className="text-center responsive-p-sm border rounded">
              <p className="responsive-text-lg font-bold text-blue-600">{pattern.count}</p>
              <p className="responsive-text-sm text-gray-600">{pattern.hour}:00</p>
              <div className="responsive-m-t-xs">
                {Object.entries(pattern.actions).slice(0, 2).map(([action, count]) => (
                  <span key={action} className="responsive-text-xs text-gray-500 block">
                    {action}: {count}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Active Users */}
      <div className="responsive-card">
        <h3 className="responsive-text-lg font-semibold text-gray-900 responsive-m-b-md">Top Active Users</h3>
        <div className="responsive-table-container">
          <table className="responsive-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Actions</th>
                <th>Peak Hour</th>
                <th>Favorite Actions</th>
                <th>Activity Score</th>
              </tr>
            </thead>
            <tbody>
              {userBehaviors.slice(0, 10).map((user) => (
                <tr key={user.userId}>
                  <td className="font-medium">{user.username}</td>
                  <td>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {user.role}
                    </span>
                  </td>
                  <td className="responsive-text-sm text-gray-600">{user.totalActions}</td>
                  <td className="responsive-text-sm text-gray-600">{user.mostActiveHour}:00</td>
                  <td className="responsive-text-sm text-gray-600">
                    {user.favoriteActions.slice(0, 2).join(', ')}
                  </td>
                  <td>
                    <div className="responsive-flex">
                      <div className="w-16 bg-gray-200 rounded-full h-2 responsive-m-r-sm responsive-m-t-xs">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${Math.min(100, (user.activityScore / 1000) * 100)}%` }}
                        ></div>
                      </div>
                      <span className="responsive-text-sm text-gray-600">{user.activityScore}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Activity Distribution */}
      <div className="responsive-card">
        <h3 className="responsive-text-lg font-semibold text-gray-900 responsive-m-b-md">Activity Distribution</h3>
        <div className="responsive-grid responsive-grid-3">
          <div>
            <h4 className="responsive-text-base font-medium text-gray-800 responsive-m-b-sm">By Action Type</h4>
            {Object.entries(
              activityLogs.reduce((acc: any, log) => {
                acc[log.action_type] = (acc[log.action_type] || 0) + 1;
                return acc;
              }, {})
            ).sort(([,a], [,b]) => (b as number) - (a as number)).slice(0, 5).map(([action, count]) => (
              <div key={action} className="responsive-flex responsive-flex-between responsive-p-xs">
                <span className="responsive-text-sm text-gray-600 capitalize">{action}</span>
                <span className="responsive-text-sm font-medium">{count}</span>
              </div>
            ))}
          </div>

          <div>
            <h4 className="responsive-text-base font-medium text-gray-800 responsive-m-b-sm">By User Role</h4>
            {Object.entries(
              activityLogs.reduce((acc: any, log) => {
                acc[log.user_role] = (acc[log.user_role] || 0) + 1;
                return acc;
              }, {})
            ).sort(([,a], [,b]) => (b as number) - (a as number)).map(([role, count]) => (
              <div key={role} className="responsive-flex responsive-flex-between responsive-p-xs">
                <span className="responsive-text-sm text-gray-600 capitalize">{role}</span>
                <span className="responsive-text-sm font-medium">{count}</span>
              </div>
            ))}
          </div>

          <div>
            <h4 className="responsive-text-base font-medium text-gray-800 responsive-m-b-sm">By Module</h4>
            {Object.entries(
              activityLogs.reduce((acc: any, log) => {
                acc[log.module] = (acc[log.module] || 0) + 1;
                return acc;
              }, {})
            ).sort(([,a], [,b]) => (b as number) - (a as number)).slice(0, 5).map(([module, count]) => (
              <div key={module} className="responsive-flex responsive-flex-between responsive-p-xs">
                <span className="responsive-text-sm text-gray-600">{module.replace('_', ' ')}</span>
                <span className="responsive-text-sm font-medium">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityAnalytics;
