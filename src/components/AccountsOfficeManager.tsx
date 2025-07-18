'use client';

import React, { useState, useEffect } from 'react';
import { accountantAPI } from '@/lib/supabase';
import PaymentApprovalManager from './PaymentApprovalManager';
import SemesterRegistrationManager from './SemesterRegistrationManager';
import StudentRegistrationManager from './StudentRegistrationManager';
import AccessControlLogs from './AccessControlLogs';
import AccountsHistoryManager from './AccountsHistoryManager';
import AccountsOverviewDashboard from './AccountsOverviewDashboard';
import ApprovedStudentsManager from './ApprovedStudentsManager';
import DatabaseSetupHelper from './DatabaseSetupHelper';
import StudentAccessTerminationManager from './StudentAccessTerminationManager';

interface AccountsOfficeManagerProps {
  accountantId: string;
}

interface DashboardStats {
  totalStudents: number;
  pendingPayments: number;
  approvedPayments: number;
  activeSemester: string;
  registeredStudents: number;
  pendingRegistrations: number;
}

const AccountsOfficeManager: React.FC<AccountsOfficeManagerProps> = ({ accountantId }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    pendingPayments: 0,
    approvedPayments: 0,
    activeSemester: 'None',
    registeredStudents: 0,
    pendingRegistrations: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      setError('');

      // First, ensure tables exist
      console.log('🔧 Ensuring access control tables exist...');
      await accountantAPI.ensureTablesExist();

      const [
        studentsData,
        paymentsData,
        activeSemesterData,
        registrationsData
      ] = await Promise.all([
        accountantAPI.getAllStudents(),
        accountantAPI.getAllPaymentApprovals(),
        accountantAPI.getActiveSemester(),
        accountantAPI.getStudentSemesterRegistrations()
      ]);

      const pendingPayments = paymentsData?.filter(p => p.approval_status === 'pending').length || 0;
      const approvedPayments = paymentsData?.filter(p => p.approval_status === 'approved').length || 0;
      const registeredStudents = registrationsData?.filter(r => r.registration_status === 'approved').length || 0;
      const pendingRegistrations = registrationsData?.filter(r => r.registration_status === 'pending').length || 0;

      setStats({
        totalStudents: studentsData?.length || 0,
        pendingPayments,
        approvedPayments,
        activeSemester: activeSemesterData ? `${activeSemesterData.semester_name} (${activeSemesterData.academic_year})` : 'None',
        registeredStudents,
        pendingRegistrations
      });

      console.log('✅ Dashboard stats loaded successfully');
    } catch (error: any) {
      console.error('Error loading dashboard stats:', error);
      setError('Failed to load dashboard statistics.');
    } finally {
      setLoading(false);
    }
  };

  const runMaintenance = async () => {
    try {
      setLoading(true);
      setError('');
      
      const result = await accountantAPI.runAccessControlMaintenance();
      alert(`Maintenance completed: ${result}`);
      
      // Reload stats after maintenance
      await loadDashboardStats();
    } catch (error: any) {
      setError(error.message || 'Failed to run maintenance');
    } finally {
      setLoading(false);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <AccountsOverviewDashboard accountantId={accountantId} />;

      case 'approved-students':
        return <ApprovedStudentsManager accountantId={accountantId} />;

      case 'terminate-access':
        return <StudentAccessTerminationManager accountantId={accountantId} />;

      case 'payment-approvals':
        return <PaymentApprovalManager accountantId={accountantId} />;

      case 'semester-management':
        return <SemesterRegistrationManager accountantId={accountantId} />;

      case 'student-registrations':
        return <StudentRegistrationManager accountantId={accountantId} />;

      case 'access-logs':
        return <AccessControlLogs accountantId={accountantId} />;

      case 'history':
        return <AccountsHistoryManager accountantId={accountantId} />;

      case 'database-setup':
        return <DatabaseSetupHelper />;

      default:
        return <div>Tab content not found</div>;
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'approved-students', label: 'Approved Students', icon: '👥' },
    { id: 'terminate-access', label: 'Terminate Access', icon: '🚫' },
    { id: 'payment-approvals', label: 'Payment Approvals', icon: '💰' },
    { id: 'semester-management', label: 'Semester Management', icon: '📅' },
    { id: 'student-registrations', label: 'Student Registrations', icon: '📚' },
    { id: 'access-logs', label: 'Access Logs', icon: '📜' },
    { id: 'history', label: 'History Records', icon: '📋' },
    { id: 'database-setup', label: 'Database Setup', icon: '🔧' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Accounts Office Management</h1>
        <div className="text-sm text-gray-500">
          Payment-based access and semester registration control
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {renderTabContent()}
      </div>
    </div>
  );
};

export default AccountsOfficeManager;
