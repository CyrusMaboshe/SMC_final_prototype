'use client';

import React, { useState, useEffect } from 'react';
import { accountantAPI } from '@/lib/supabase';

interface AccountsOverviewDashboardProps {
  accountantId: string;
}

interface DashboardStats {
  totalStudents: number;
  activeStudents: number;
  totalPaymentApprovals: number;
  pendingPaymentApprovals: number;
  approvedPaymentApprovals: number;
  totalSemesterRegistrations: number;
  pendingSemesterRegistrations: number;
  approvedSemesterRegistrations: number;
  activeSemesters: number;
  totalRevenue: number;
  recentAccessLogs: number;
}

const AccountsOverviewDashboard: React.FC<AccountsOverviewDashboardProps> = ({ accountantId }) => {
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    activeStudents: 0,
    totalPaymentApprovals: 0,
    pendingPaymentApprovals: 0,
    approvedPaymentApprovals: 0,
    totalSemesterRegistrations: 0,
    pendingSemesterRegistrations: 0,
    approvedSemesterRegistrations: 0,
    activeSemesters: 0,
    totalRevenue: 0,
    recentAccessLogs: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError('');

      // Load all data in parallel
      const [
        students,
        paymentApprovals,
        semesterRegistrations,
        semesterPeriods,
        accessLogs
      ] = await Promise.all([
        accountantAPI.getAllStudents(),
        accountantAPI.getAllPaymentApprovals(),
        accountantAPI.getAllSemesterRegistrations(),
        accountantAPI.getAllSemesterPeriods(),
        accountantAPI.getAccessControlLogs()
      ]);

      // Calculate statistics
      const newStats: DashboardStats = {
        totalStudents: students?.length || 0,
        activeStudents: students?.filter(s => s.status === 'active').length || 0,
        totalPaymentApprovals: paymentApprovals?.length || 0,
        pendingPaymentApprovals: paymentApprovals?.filter(p => p.approval_status === 'pending').length || 0,
        approvedPaymentApprovals: paymentApprovals?.filter(p => p.approval_status === 'approved').length || 0,
        totalSemesterRegistrations: semesterRegistrations?.length || 0,
        pendingSemesterRegistrations: semesterRegistrations?.filter(r => r.registration_status === 'pending').length || 0,
        approvedSemesterRegistrations: semesterRegistrations?.filter(r => r.registration_status === 'approved').length || 0,
        activeSemesters: semesterPeriods?.filter(s => s.is_active).length || 0,
        totalRevenue: paymentApprovals?.filter(p => p.approval_status === 'approved').reduce((sum, p) => sum + (p.amount_paid || 0), 0) || 0,
        recentAccessLogs: accessLogs?.filter(log => {
          const logDate = new Date(log.created_at);
          const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
          return logDate > yesterday;
        }).length || 0
      };

      setStats(newStats);

      // Prepare recent activity (last 10 items)
      const activity = [];
      
      // Add recent payment approvals
      paymentApprovals?.slice(0, 5).forEach(payment => {
        activity.push({
          id: `payment-${payment.id}`,
          type: 'payment',
          title: `Payment Approval - $${payment.amount_paid}`,
          description: `${payment.students?.first_name} ${payment.students?.last_name} (${payment.students?.student_id})`,
          status: payment.approval_status,
          date: payment.approval_date || payment.created_at,
          icon: '💰'
        });
      });

      // Add recent semester registrations
      semesterRegistrations?.slice(0, 5).forEach(registration => {
        activity.push({
          id: `registration-${registration.id}`,
          type: 'registration',
          title: 'Semester Registration',
          description: `${registration.students?.first_name} ${registration.students?.last_name} - ${registration.semester_periods?.semester_name}`,
          status: registration.registration_status,
          date: registration.approval_date || registration.created_at,
          icon: '📚'
        });
      });

      // Sort by date and take last 10
      activity.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setRecentActivity(activity.slice(0, 10));

    } catch (error: any) {
      console.error('Error loading dashboard data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-4 text-gray-600">Loading dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-red-400">⚠️</span>
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-800">{error}</p>
            <button
              onClick={loadDashboardData}
              className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Accounts Office Overview</h2>
        <button
          onClick={loadDashboardData}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
        >
          Refresh Data
        </button>
      </div>

      {/* Key Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-2xl">👥</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Students</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalStudents}</p>
              <p className="text-sm text-green-600">{stats.activeStudents} active</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-2xl">💰</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Payment Approvals</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalPaymentApprovals}</p>
              <p className="text-sm text-yellow-600">{stats.pendingPaymentApprovals} pending</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-2xl">📚</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Semester Registrations</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalSemesterRegistrations}</p>
              <p className="text-sm text-yellow-600">{stats.pendingSemesterRegistrations} pending</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-2xl">💵</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalRevenue)}</p>
              <p className="text-sm text-green-600">{stats.approvedPaymentApprovals} approved payments</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="bg-yellow-100 rounded-lg p-4 mb-2">
              <span className="text-2xl">⏳</span>
            </div>
            <p className="text-sm font-medium text-gray-900">{stats.pendingPaymentApprovals}</p>
            <p className="text-xs text-gray-600">Pending Payment Approvals</p>
          </div>
          
          <div className="text-center">
            <div className="bg-blue-100 rounded-lg p-4 mb-2">
              <span className="text-2xl">📝</span>
            </div>
            <p className="text-sm font-medium text-gray-900">{stats.pendingSemesterRegistrations}</p>
            <p className="text-xs text-gray-600">Pending Registrations</p>
          </div>
          
          <div className="text-center">
            <div className="bg-green-100 rounded-lg p-4 mb-2">
              <span className="text-2xl">✅</span>
            </div>
            <p className="text-sm font-medium text-gray-900">{stats.activeSemesters}</p>
            <p className="text-xs text-gray-600">Active Semesters</p>
          </div>
          
          <div className="text-center">
            <div className="bg-purple-100 rounded-lg p-4 mb-2">
              <span className="text-2xl">📊</span>
            </div>
            <p className="text-sm font-medium text-gray-900">{stats.recentAccessLogs}</p>
            <p className="text-xs text-gray-600">Recent Access Logs (24h)</p>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        {recentActivity.length > 0 ? (
          <div className="space-y-3">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <span className="text-lg">{activity.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                    <p className="text-xs text-gray-600">{activity.description}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(activity.status)}`}>
                    {activity.status.charAt(0).toUpperCase() + activity.status.slice(1)}
                  </span>
                  <span className="text-xs text-gray-500">{formatDate(activity.date)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-600 text-center py-4">No recent activity found.</p>
        )}
      </div>
    </div>
  );
};

export default AccountsOverviewDashboard;
