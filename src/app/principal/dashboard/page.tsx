'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, principalAPI, activityLogger } from '@/lib/supabase';
import ResponsiveDashboardLayout, { ResponsiveNav, ResponsiveCardGrid } from '@/components/ResponsiveDashboardLayout';
import SystemHealthMonitor from '@/components/SystemHealthMonitor';
import ActivityAnalytics from '@/components/ActivityAnalytics';
import RealTimeNotifications from '@/components/RealTimeNotifications';
import ResponsiveErrorBoundary from '@/components/ResponsiveErrorBoundary';
// import { withMobileOptimization, useMobileOptimization } from '@/utils/mobileOptimizations';

interface SystemOverview {
  users: {
    total: number;
    byRole: Record<string, number>;
    activeToday: number;
  };
  courses: {
    total: number;
  };
  enrollments: {
    total: number;
    active: number;
  };
  examSlips: {
    total: number;
    active: number;
  };
  payments: {
    total: number;
    approved: number;
  };
  activityStats: {
    totalActivities: number;
    byActionType: Record<string, number>;
    byUserRole: Record<string, number>;
    byModule: Record<string, number>;
  };
}

const PrincipalDashboard: React.FC = () => {
  const router = useRouter();
  // const { device, isMobile, isLowEnd } = useMobileOptimization();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [systemOverview, setSystemOverview] = useState<SystemOverview | null>(null);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [allCourses, setAllCourses] = useState<any[]>([]);
  const [financialData, setFinancialData] = useState<any>(null);

  useEffect(() => {
    const currentUser = authAPI.getCurrentUser();
    if (!currentUser || currentUser.role !== 'principal') {
      router.push('/');
      return;
    }

    setUser(currentUser);
    loadDashboardData();
    setLoading(false);

    // Log principal access
    activityLogger.logActivity({
      userId: currentUser.id,
      userRole: 'principal',
      actionType: 'view',
      module: 'principal_dashboard',
      details: { tab: 'overview' }
    }).catch(console.error);
  }, [router]);

  const loadDashboardData = async () => {
    try {
      const [overview, logs, users, courses, financial] = await Promise.all([
        principalAPI.getSystemOverview(),
        activityLogger.getActivityLogs({ limit: 50 }),
        principalAPI.getAllUsers(),
        principalAPI.getAllCourses(),
        principalAPI.getFinancialOverview()
      ]);

      setSystemOverview(overview);
      setActivityLogs(logs);
      setAllUsers(users);
      setAllCourses(courses);
      setFinancialData(financial);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  };

  const handleLogout = () => {
    authAPI.logout();
    router.push('/');
  };

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    
    // Log tab access
    if (user) {
      activityLogger.logActivity({
        userId: user.id,
        userRole: 'principal',
        actionType: 'view',
        module: 'principal_dashboard',
        details: { tab: tabId }
      }).catch(console.error);
    }
  };

  const tabs = [
    { id: 'overview', label: 'System Overview', icon: '📊' },
    { id: 'users', label: 'All Users', icon: '👥' },
    { id: 'courses', label: 'All Courses', icon: '📚' },
    { id: 'financial', label: 'Financial Overview', icon: '💰' },
    { id: 'activity-logs', label: 'Activity Logs', icon: '📋' },
    { id: 'analytics', label: 'Activity Analytics', icon: '📈' },
    { id: 'health', label: 'System Health', icon: '🏥' },
    { id: 'real-time', label: 'Real-time Monitor', icon: '📡' }
  ];

  const renderOverview = () => {
    if (!systemOverview) return <div>Loading...</div>;

    return (
      <div className="space-y-6">
        <h2 className="responsive-text-2xl font-bold text-gray-900">System Overview</h2>
        
        {/* Key Metrics */}
        <ResponsiveCardGrid columns={4}>
          <div className="responsive-card bg-blue-50 border-blue-200">
            <div className="responsive-flex responsive-flex-between">
              <div>
                <p className="responsive-text-sm font-medium text-blue-600">Total Users</p>
                <p className="responsive-text-3xl font-bold text-blue-900">{systemOverview.users.total}</p>
              </div>
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white responsive-text-lg">👥</span>
              </div>
            </div>
          </div>

          <div className="responsive-card bg-green-50 border-green-200">
            <div className="responsive-flex responsive-flex-between">
              <div>
                <p className="responsive-text-sm font-medium text-green-600">Total Courses</p>
                <p className="responsive-text-3xl font-bold text-green-900">{systemOverview.courses.total}</p>
              </div>
              <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center">
                <span className="text-white responsive-text-lg">📚</span>
              </div>
            </div>
          </div>

          <div className="responsive-card bg-purple-50 border-purple-200">
            <div className="responsive-flex responsive-flex-between">
              <div>
                <p className="responsive-text-sm font-medium text-purple-600">Active Enrollments</p>
                <p className="responsive-text-3xl font-bold text-purple-900">{systemOverview.enrollments.active}</p>
              </div>
              <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white responsive-text-lg">📝</span>
              </div>
            </div>
          </div>

          <div className="responsive-card bg-orange-50 border-orange-200">
            <div className="responsive-flex responsive-flex-between">
              <div>
                <p className="responsive-text-sm font-medium text-orange-600">Today's Activities</p>
                <p className="responsive-text-3xl font-bold text-orange-900">{systemOverview.activityStats.totalActivities}</p>
              </div>
              <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center">
                <span className="text-white responsive-text-lg">📊</span>
              </div>
            </div>
          </div>
        </ResponsiveCardGrid>

        {/* Users by Role */}
        <div className="responsive-card">
          <h3 className="responsive-text-lg font-semibold text-gray-900 responsive-m-b-md">Users by Role</h3>
          <div className="responsive-grid responsive-grid-2">
            {Object.entries(systemOverview.users.byRole).map(([role, count]) => (
              <div key={role} className="responsive-flex responsive-flex-between responsive-p-sm border rounded">
                <span className="capitalize responsive-text-sm font-medium text-gray-700">{role}s</span>
                <span className="responsive-text-sm font-bold text-gray-900">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Activity Statistics */}
        <div className="responsive-card">
          <h3 className="responsive-text-lg font-semibold text-gray-900 responsive-m-b-md">Today's Activity Breakdown</h3>
          <div className="responsive-grid responsive-grid-3">
            <div>
              <h4 className="responsive-text-sm font-medium text-gray-700 responsive-m-b-sm">By Action Type</h4>
              {Object.entries(systemOverview.activityStats.byActionType).map(([action, count]) => (
                <div key={action} className="responsive-flex responsive-flex-between responsive-p-xs">
                  <span className="capitalize responsive-text-xs text-gray-600">{action}</span>
                  <span className="responsive-text-xs font-medium text-gray-900">{count}</span>
                </div>
              ))}
            </div>
            
            <div>
              <h4 className="responsive-text-sm font-medium text-gray-700 responsive-m-b-sm">By User Role</h4>
              {Object.entries(systemOverview.activityStats.byUserRole).map(([role, count]) => (
                <div key={role} className="responsive-flex responsive-flex-between responsive-p-xs">
                  <span className="capitalize responsive-text-xs text-gray-600">{role}</span>
                  <span className="responsive-text-xs font-medium text-gray-900">{count}</span>
                </div>
              ))}
            </div>
            
            <div>
              <h4 className="responsive-text-sm font-medium text-gray-700 responsive-m-b-sm">By Module</h4>
              {Object.entries(systemOverview.activityStats.byModule).map(([module, count]) => (
                <div key={module} className="responsive-flex responsive-flex-between responsive-p-xs">
                  <span className="responsive-text-xs text-gray-600">{module.replace('_', ' ')}</span>
                  <span className="responsive-text-xs font-medium text-gray-900">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderUsers = () => (
    <div className="space-y-6">
      <h2 className="responsive-text-2xl font-bold text-gray-900">All System Users</h2>
      <div className="responsive-table-container">
        <table className="responsive-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Role</th>
              <th>Status</th>
              <th>Created</th>
              <th>Last Login</th>
            </tr>
          </thead>
          <tbody>
            {allUsers.map((user) => (
              <tr key={user.id}>
                <td className="font-medium">{user.username}</td>
                <td>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    user.role === 'admin' ? 'bg-red-100 text-red-800' :
                    user.role === 'lecturer' ? 'bg-blue-100 text-blue-800' :
                    user.role === 'student' ? 'bg-green-100 text-green-800' :
                    user.role === 'accountant' ? 'bg-purple-100 text-purple-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="responsive-text-sm text-gray-600">
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
                <td className="responsive-text-sm text-gray-600">
                  {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );


  const renderCourses = () => (
    <div className="space-y-6">
      <h2 className="responsive-text-2xl font-bold text-gray-900">All Courses</h2>
      <div className="responsive-table-container">
        <table className="responsive-table">
          <thead>
            <tr>
              <th>Course Code</th>
              <th>Course Name</th>
              <th>Credits</th>
              <th>Lecturer</th>
              <th>Enrollments</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {allCourses.map((course) => (
              <tr key={course.id}>
                <td className="font-medium">{course.course_code}</td>
                <td>{course.course_name}</td>
                <td className="responsive-text-sm text-gray-600">{course.credits}</td>
                <td className="responsive-text-sm text-gray-600">
                  {course.lecturers ? `${course.lecturers.first_name} ${course.lecturers.last_name}` : 'Not Assigned'}
                </td>
                <td className="responsive-text-sm text-gray-600">
                  {course.course_enrollments?.filter((e: any) => e.status === 'enrolled').length || 0}
                </td>
                <td>
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Active
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderFinancial = () => (
    <div className="space-y-6">
      <h2 className="responsive-text-2xl font-bold text-gray-900">Financial Overview</h2>

      {financialData && (
        <ResponsiveCardGrid columns={2}>
          <div className="responsive-card">
            <h3 className="responsive-text-lg font-semibold text-gray-900 responsive-m-b-md">Payment Approvals</h3>
            <div className="space-y-2">
              <div className="responsive-flex responsive-flex-between">
                <span className="responsive-text-sm text-gray-600">Total Payments:</span>
                <span className="responsive-text-sm font-medium">{financialData.payments.length}</span>
              </div>
              <div className="responsive-flex responsive-flex-between">
                <span className="responsive-text-sm text-gray-600">Approved:</span>
                <span className="responsive-text-sm font-medium text-green-600">
                  {financialData.payments.filter((p: any) => p.status === 'approved').length}
                </span>
              </div>
              <div className="responsive-flex responsive-flex-between">
                <span className="responsive-text-sm text-gray-600">Pending:</span>
                <span className="responsive-text-sm font-medium text-yellow-600">
                  {financialData.payments.filter((p: any) => p.status === 'pending').length}
                </span>
              </div>
            </div>
          </div>

          <div className="responsive-card">
            <h3 className="responsive-text-lg font-semibold text-gray-900 responsive-m-b-md">Ledger Entries</h3>
            <div className="space-y-2">
              <div className="responsive-flex responsive-flex-between">
                <span className="responsive-text-sm text-gray-600">Total Entries:</span>
                <span className="responsive-text-sm font-medium">{financialData.ledgerEntries.length}</span>
              </div>
              <div className="responsive-flex responsive-flex-between">
                <span className="responsive-text-sm text-gray-600">This Month:</span>
                <span className="responsive-text-sm font-medium">
                  {financialData.ledgerEntries.filter((entry: any) => {
                    const entryDate = new Date(entry.created_at);
                    const now = new Date();
                    return entryDate.getMonth() === now.getMonth() && entryDate.getFullYear() === now.getFullYear();
                  }).length}
                </span>
              </div>
            </div>
          </div>
        </ResponsiveCardGrid>
      )}

      <div className="responsive-table-container">
        <table className="responsive-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>User</th>
              <th>Type</th>
              <th>Status</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {financialData?.payments.slice(0, 20).map((payment: any) => (
              <tr key={payment.id}>
                <td className="responsive-text-sm text-gray-600">
                  {new Date(payment.created_at).toLocaleDateString()}
                </td>
                <td className="font-medium">{payment.system_users?.username || 'Unknown'}</td>
                <td className="responsive-text-sm text-gray-600">Payment</td>
                <td>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    payment.status === 'approved' ? 'bg-green-100 text-green-800' :
                    payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {payment.status}
                  </span>
                </td>
                <td className="responsive-text-sm text-gray-600">${payment.amount || 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderActivityLogs = () => (
    <div className="space-y-6">
      <h2 className="responsive-text-2xl font-bold text-gray-900">Recent Activity Logs</h2>
      <div className="responsive-table-container">
        <table className="responsive-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>User</th>
              <th>Role</th>
              <th>Action</th>
              <th>Module</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {activityLogs.map((log) => (
              <tr key={log.id}>
                <td className="responsive-text-sm text-gray-600">
                  {new Date(log.timestamp).toLocaleString()}
                </td>
                <td className="font-medium">{log.system_users?.username || 'Unknown'}</td>
                <td>
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {log.user_role}
                  </span>
                </td>
                <td>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    log.action_type === 'create' ? 'bg-green-100 text-green-800' :
                    log.action_type === 'update' ? 'bg-blue-100 text-blue-800' :
                    log.action_type === 'delete' ? 'bg-red-100 text-red-800' :
                    log.action_type === 'login' ? 'bg-purple-100 text-purple-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {log.action_type}
                  </span>
                </td>
                <td className="responsive-text-sm text-gray-600">{log.module}</td>
                <td className="responsive-text-sm text-gray-600">
                  {log.resource_type && `${log.resource_type}${log.resource_id ? ` (${log.resource_id.slice(0, 8)}...)` : ''}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderRealTimeMonitor = () => (
    <div className="space-y-6">
      <h2 className="responsive-text-2xl font-bold text-gray-900">Real-time System Monitor</h2>

      <ResponsiveCardGrid columns={3}>
        <div className="responsive-card bg-blue-50 border-blue-200">
          <h3 className="responsive-text-base font-semibold text-blue-900 responsive-m-b-sm">Active Sessions</h3>
          <p className="responsive-text-2xl font-bold text-blue-600">
            {systemOverview?.users.total || 0}
          </p>
          <p className="responsive-text-xs text-blue-700">Currently online</p>
        </div>

        <div className="responsive-card bg-green-50 border-green-200">
          <h3 className="responsive-text-base font-semibold text-green-900 responsive-m-b-sm">System Health</h3>
          <p className="responsive-text-2xl font-bold text-green-600">98.5%</p>
          <p className="responsive-text-xs text-green-700">Uptime</p>
        </div>

        <div className="responsive-card bg-purple-50 border-purple-200">
          <h3 className="responsive-text-base font-semibold text-purple-900 responsive-m-b-sm">Data Sync</h3>
          <p className="responsive-text-2xl font-bold text-purple-600">Real-time</p>
          <p className="responsive-text-xs text-purple-700">All systems synced</p>
        </div>
      </ResponsiveCardGrid>

      <div className="responsive-card">
        <h3 className="responsive-text-lg font-semibold text-gray-900 responsive-m-b-md">Live Activity Feed</h3>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {activityLogs.slice(0, 10).map((log) => (
            <div key={log.id} className="responsive-flex responsive-p-sm border-l-4 border-blue-500 bg-blue-50">
              <div className="flex-1">
                <div className="responsive-flex responsive-flex-between">
                  <span className="responsive-text-sm font-medium text-gray-900">
                    {log.system_users?.username || 'Unknown User'}
                  </span>
                  <span className="responsive-text-xs text-gray-500">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="responsive-text-sm text-gray-600">
                  {log.action_type} in {log.module.replace('_', ' ')}
                  {log.resource_type && ` - ${log.resource_type}`}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <ResponsiveErrorBoundary componentName="SystemOverview">
            {renderOverview()}
          </ResponsiveErrorBoundary>
        );
      case 'users':
        return (
          <ResponsiveErrorBoundary componentName="AllUsers">
            {renderUsers()}
          </ResponsiveErrorBoundary>
        );
      case 'courses':
        return (
          <ResponsiveErrorBoundary componentName="AllCourses">
            {renderCourses()}
          </ResponsiveErrorBoundary>
        );
      case 'financial':
        return (
          <ResponsiveErrorBoundary componentName="FinancialOverview">
            {renderFinancial()}
          </ResponsiveErrorBoundary>
        );
      case 'activity-logs':
        return (
          <ResponsiveErrorBoundary componentName="ActivityLogs">
            {renderActivityLogs()}
          </ResponsiveErrorBoundary>
        );
      case 'analytics':
        return (
          <ResponsiveErrorBoundary componentName="ActivityAnalytics">
            <ActivityAnalytics />
          </ResponsiveErrorBoundary>
        );
      case 'health':
        return (
          <ResponsiveErrorBoundary componentName="SystemHealth">
            <SystemHealthMonitor />
          </ResponsiveErrorBoundary>
        );
      case 'real-time':
        return (
          <ResponsiveErrorBoundary componentName="RealTimeMonitor">
            {renderRealTimeMonitor()}
          </ResponsiveErrorBoundary>
        );
      default:
        return <div>Content for {activeTab} coming soon...</div>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <ResponsiveDashboardLayout
      title="Principal Dashboard"
      subtitle="Master System Overview"
      actions={
        <div className="responsive-flex" style={{ gap: 'var(--space-sm)' }}>
          <RealTimeNotifications />
          <button
            onClick={handleLogout}
            className="responsive-btn responsive-btn-secondary"
          >
            Logout
          </button>
        </div>
      }
      sidebar={
        <ResponsiveNav
          title="Principal Menu"
          items={tabs.map(tab => ({
            ...tab,
            active: activeTab === tab.id,
            onClick: () => handleTabChange(tab.id)
          }))}
        />
      }
    >
      {renderContent()}
    </ResponsiveDashboardLayout>
  );
};

export default PrincipalDashboard;
