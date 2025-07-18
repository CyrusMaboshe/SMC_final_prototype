'use client';

import React, { useState, useEffect, lazy } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, AccountantProfile, accountantAPI } from '@/lib/supabase';
import LazyComponentWrapper, { TableSkeleton, CardSkeleton, FormSkeleton } from '@/components/LazyComponentWrapper';

// Lazy load heavy components
const FinancialLedger = lazy(() => import('@/components/FinancialLedger'));
const DoubleEntryLedger = lazy(() => import('@/components/DoubleEntryLedger'));
const LedgerManagement = lazy(() => import('@/components/LedgerManagement'));
const AccountantLogs = lazy(() => import('@/components/AccountantLogs'));
const PaymentRecording = lazy(() => import('@/components/PaymentRecording'));
const FinancialStatementsManager = lazy(() => import('@/components/FinancialStatementsManager'));
const AccountsOfficeManager = lazy(() => import('@/components/AccountsOfficeManager'));
const AccountBalanceEditor = lazy(() => import('@/components/AccountBalanceEditor'));

interface AccountantDashboardProps {}

const AccountantDashboard: React.FC<AccountantDashboardProps> = () => {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<AccountantProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const currentUser = authAPI.getCurrentUser();
      console.log('Current user:', currentUser);

      if (!currentUser || currentUser.role !== 'accountant') {
        console.log('User not authorized for accountant dashboard');
        router.push('/');
        return;
      }
      setUser(currentUser);

      // Get accountant profile from localStorage
      const storedProfile = localStorage.getItem('user_profile');
      console.log('Stored profile:', storedProfile);

      if (storedProfile) {
        setProfile(JSON.parse(storedProfile));
      }
    } catch (error) {
      console.error('Authentication error:', error);
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    authAPI.logout();
    router.push('/');
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Accounts Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                      <span className="text-white text-sm">👥</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-blue-600">Total Students</p>
                    <p className="text-2xl font-bold text-blue-900">0</p>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 rounded-lg p-6 border border-green-200">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                      <span className="text-white text-sm">💰</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-green-600">Total Collected</p>
                    <p className="text-2xl font-bold text-green-900">ZMW 0.00</p>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 rounded-lg p-6 border border-yellow-200">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-yellow-600 rounded-lg flex items-center justify-center">
                      <span className="text-white text-sm">⏳</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-yellow-600">Pending Payments</p>
                    <p className="text-2xl font-bold text-yellow-900">ZMW 0.00</p>
                  </div>
                </div>
              </div>

              <div className="bg-red-50 rounded-lg p-6 border border-red-200">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
                      <span className="text-white text-sm">📋</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-red-600">Outstanding Balance</p>
                    <p className="text-2xl font-bold text-red-900">ZMW 0.00</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Transactions</h3>
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">💳</span>
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">No Recent Transactions</h4>
                <p className="text-gray-600">Recent payment transactions will appear here.</p>
              </div>
            </div>
          </div>
        );

      case 'ledger':
        return (
          <LazyComponentWrapper fallback={<TableSkeleton />}>
            <LedgerManagement accountantId={user?.id || ''} />
          </LazyComponentWrapper>
        );

      case 'double-entry':
        return (
          <LazyComponentWrapper fallback={<TableSkeleton />}>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Double Entry Ledger System</h2>
                <div className="text-sm text-gray-500">
                  Complete double-entry bookkeeping view
                </div>
              </div>
              <DoubleEntryLedger accountantId={user?.id} isStudentView={false} />
            </div>
          </LazyComponentWrapper>
        );

      case 'balance-editor':
        return (
          <LazyComponentWrapper fallback={<FormSkeleton />}>
            <AccountBalanceEditor accountantId={user?.id || ''} />
          </LazyComponentWrapper>
        );

      case 'payments':
        return (
          <LazyComponentWrapper fallback={<FormSkeleton />}>
            <PaymentRecording accountantId={user?.id} />
          </LazyComponentWrapper>
        );

      case 'invoices':
        return (
          <LazyComponentWrapper fallback={<TableSkeleton />}>
            <FinancialStatementsManager accountantId={user?.id} />
          </LazyComponentWrapper>
        );

      case 'reports':
        return (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Financial Reports</h2>
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📈</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Financial Reports Coming Soon</h3>
              <p className="text-gray-600">Financial reporting tools will be available here.</p>
            </div>
          </div>
        );

      case 'logs':
        return (
          <LazyComponentWrapper fallback={<TableSkeleton />}>
            <AccountantLogs accountantId={user?.id} />
          </LazyComponentWrapper>
        );

      case 'access-control':
        return <AccountsOfficeManager accountantId={user?.id} />;

      default:
        return <div>Tab content not found</div>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header Skeleton */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-48"></div>
              </div>
              <div className="animate-pulse">
                <div className="h-10 bg-gray-200 rounded w-20"></div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Skeleton */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar Skeleton */}
            <div className="lg:w-64 flex-shrink-0">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="animate-pulse space-y-3">
                  {[...Array(9)].map((_, i) => (
                    <div key={i} className="h-10 bg-gray-200 rounded"></div>
                  ))}
                </div>
              </div>
            </div>

            {/* Content Skeleton */}
            <div className="flex-1">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="animate-pulse space-y-6">
                  <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="bg-gray-50 rounded-lg p-6 space-y-4">
                        <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    ))}
                  </div>
                  <div className="h-64 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'ledger', label: 'Ledger Management', icon: '📋' },
    { id: 'double-entry', label: 'Double Entry Ledger', icon: '⚖️' },
    { id: 'balance-editor', label: 'Account Balance Editor', icon: '⚖️' },
    { id: 'payments', label: 'Record Payments', icon: '💰' },
    { id: 'invoices', label: 'Financial Statements', icon: '📄' },
    { id: 'access-control', label: 'Access Control', icon: '🔐' },
    { id: 'reports', label: 'Reports', icon: '📈' },
    { id: 'logs', label: 'Activity Logs', icon: '📜' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Accounts Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                Welcome, {profile?.first_name} {profile?.last_name}
              </div>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-64 flex-shrink-0">
            <nav className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <ul className="space-y-2">
                {tabs.map((tab) => (
                  <li key={tab.id}>
                    <button
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                        activeTab === tab.id
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                    >
                      <span className="mr-3">{tab.icon}</span>
                      {tab.label}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              {renderTabContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountantDashboard;
