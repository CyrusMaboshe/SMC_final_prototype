'use client';

import React, { useState, useEffect } from 'react';
import { studentAPI, FinancialRecord, Payment, supabase } from '@/lib/supabase';
import { useStudentRealTimeUpdates } from '@/hooks/useRealTimeUpdates';

interface StudentInvoicesProps {
  studentId: string;
}

interface StudentProfile {
  id: string;
  student_id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  program?: string;
  year_of_study?: number;
  semester?: number;
  status?: string;
  batch?: string;
}

interface FinancialSummary {
  totalOwed: number;
  totalPaid: number;
  totalBalance: number;
  records: FinancialRecord[];
  payments: Payment[];
}

const StudentInvoices: React.FC<StudentInvoicesProps> = ({ studentId }) => {
  console.log('StudentInvoices component received studentId:', studentId);

  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('summary');

  useEffect(() => {
    loadFinancialData();
    loadStudentProfile();
  }, [studentId]);

  // Set up real-time updates for financial data
  // Note: We'll implement this after fixing the data loading
  // useStudentRealTimeUpdates(studentId, () => {
  //   console.log('Real-time update triggered for student:', studentId);
  //   loadFinancialData();
  // });

  const loadFinancialData = async () => {
    try {
      setLoading(true);
      console.log('Loading financial data for student:', studentId);
      console.log('Student ID type:', typeof studentId);

      if (!studentId) {
        console.error('No student ID provided');
        setLoading(false);
        return;
      }

      const [payments, financialRecords] = await Promise.all([
        studentAPI.getPayments(studentId),
        studentAPI.getFinancialRecords(studentId)
      ]);

      console.log('Loaded payments:', payments);
      console.log('Loaded financial records:', financialRecords);

      // Calculate summary from financial records and payments
      const totalOwed = financialRecords?.reduce((sum: number, record: any) => sum + record.total_amount, 0) || 0;

      // Calculate total paid from all payments (since invoices are removed)
      const totalPaid = payments?.reduce((sum: number, payment: any) => sum + payment.amount, 0) || 0;

      // Calculate balance: if there are financial records, use their balance; otherwise use negative payment amount
      let totalBalance = 0;
      if (financialRecords && financialRecords.length > 0) {
        // Use the balance from financial records (calculated by database)
        totalBalance = financialRecords.reduce((sum: number, record: any) => sum + (record.balance || 0), 0);
      } else if (payments && payments.length > 0) {
        // If no financial records but payments exist, show negative balance (credit)
        totalBalance = -totalPaid;
      }

      console.log('Calculated totals:', { totalOwed, totalPaid, totalBalance });
      console.log('Financial records length:', financialRecords?.length || 0);
      console.log('Payments length:', payments?.length || 0);

      setSummary({
        totalOwed,
        totalPaid,
        totalBalance,
        records: financialRecords || [],
        payments: payments || []
      });
    } catch (error: any) {
      console.error('Error loading financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStudentProfile = async () => {
    try {
      console.log('Loading student profile for:', studentId);

      // Try to get profile from localStorage first (for current logged-in student)
      const storedProfile = localStorage.getItem('user_profile');
      if (storedProfile) {
        try {
          const profile = JSON.parse(storedProfile);
          if (profile.student_id === studentId) {
            setStudentProfile(profile);
            return;
          }
        } catch (e) {
          console.error('Error parsing stored profile:', e);
        }
      }

      // If not found in localStorage, fetch from API
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('student_id', studentId)
        .single();

      if (error) {
        console.error('Error fetching student profile:', error);
        return;
      }

      setStudentProfile(data);
    } catch (error) {
      console.error('Error loading student profile:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return `ZMW ${new Intl.NumberFormat('en-ZM', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Financial Statement</h2>
      </div>

      {/* Student Information Section */}
      {studentProfile && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Student Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p><span className="font-semibold text-gray-700">Student Name:</span> {studentProfile.first_name} {studentProfile.last_name}</p>
              <p><span className="font-semibold text-gray-700">Student ID:</span> {studentProfile.student_id}</p>
              <p><span className="font-semibold text-gray-700">Email:</span> {studentProfile.email || 'N/A'}</p>
            </div>
            <div>
              <p><span className="font-semibold text-gray-700">Program:</span> {studentProfile.program || 'N/A'}</p>
              <p><span className="font-semibold text-gray-700">Year of Study:</span> {studentProfile.year_of_study || 'N/A'}</p>
              <p><span className="font-semibold text-gray-700">Semester:</span> {studentProfile.semester || 'N/A'}</p>
            </div>
            <div>
              <p><span className="font-semibold text-gray-700">Status:</span>
                <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                  studentProfile.status === 'active' ? 'bg-green-100 text-green-800' :
                  studentProfile.status === 'suspended' ? 'bg-red-100 text-red-800' :
                  studentProfile.status === 'frozen' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {studentProfile.status || 'Active'}
                </span>
              </p>
              <p><span className="font-semibold text-gray-700">Academic Year:</span> 2024/2025</p>
              <p><span className="font-semibold text-gray-700">Date Generated:</span> {new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      )}

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm">💰</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-blue-600">Total Owed</p>
              <p className="text-2xl font-bold text-blue-900">{formatCurrency(summary?.totalOwed || 0)}</p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-6 border border-green-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm">✅</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-green-600">Total Paid</p>
              <p className="text-2xl font-bold text-green-900">{formatCurrency(summary?.totalPaid || 0)}</p>
            </div>
          </div>
        </div>

        <div className={`rounded-lg p-6 border ${summary?.totalBalance < 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${summary?.totalBalance < 0 ? 'bg-green-600' : 'bg-red-600'}`}>
                <span className="text-white text-sm">{summary?.totalBalance < 0 ? '💰' : '⚠️'}</span>
              </div>
            </div>
            <div className="ml-4">
              <p className={`text-sm font-medium ${summary?.totalBalance < 0 ? 'text-green-600' : 'text-red-600'}`}>
                {summary?.totalBalance < 0 ? 'Credit Balance' : 'Outstanding Balance'}
              </p>
              <p className={`text-2xl font-bold ${summary?.totalBalance < 0 ? 'text-green-900' : 'text-red-900'}`}>
                {formatCurrency(Math.abs(summary?.totalBalance || 0))}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'summary', label: 'Summary', icon: '📊' },
            { id: 'records', label: 'Fee Records', icon: '🧾' },
            { id: 'payments', label: 'Payment History', icon: '💳' },
          ].map((tab) => (
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
      {activeTab === 'summary' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Summary</h3>
          
          {summary?.totalBalance === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">✅</span>
              </div>
              <h4 className="text-lg font-semibold text-green-900 mb-2">Account Paid in Full</h4>
              <p className="text-green-600">Your account is up to date with no outstanding balance.</p>
            </div>
          ) : summary?.totalBalance < 0 ? (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <span className="text-green-600 text-xl">💰</span>
                  </div>
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-green-800">Credit Balance</h4>
                    <p className="text-sm text-green-700">
                      You have a credit balance of {formatCurrency(Math.abs(summary?.totalBalance || 0))}.
                      This will be applied to future charges.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <span className="text-yellow-600 text-xl">⚠️</span>
                  </div>
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-yellow-800">Outstanding Balance</h4>
                    <p className="text-sm text-yellow-700">
                      You have an outstanding balance of {formatCurrency(summary?.totalBalance || 0)}.
                      Please make a payment to avoid late fees.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <h5 className="font-medium text-gray-900 mb-2">Recent Fee Records</h5>
                  <div className="space-y-2">
                    {summary?.records.slice(0, 3).map((record) => (
                      <div key={record.id} className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">{record.academic_year} S{record.semester}</span>
                        <span className="font-medium">{formatCurrency(record.total_amount)}</span>
                      </div>
                    ))}
                    {summary?.records.length === 0 && (
                      <p className="text-sm text-gray-500">No fee records yet</p>
                    )}
                  </div>
                </div>

                <div>
                  <h5 className="font-medium text-gray-900 mb-2">Recent Payments</h5>
                  <div className="space-y-2">
                    {summary?.payments.slice(0, 3).map((payment) => (
                      <div key={payment.id} className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">{formatDate(payment.payment_date)}</span>
                        <span className="font-medium text-green-600">{formatCurrency(payment.amount)}</span>
                      </div>
                    ))}
                    {summary?.payments.length === 0 && (
                      <p className="text-sm text-gray-500">No payments yet</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'records' && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Academic Year
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Semester
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tuition Fee
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Accommodation
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Other Fees
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Amount
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Balance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Due Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {summary?.records.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                      <div className="flex flex-col items-center">
                        <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                          <span className="text-2xl">🧾</span>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Fee Records</h3>
                        <p className="text-gray-600">Your fee records will appear here when created by the accountant.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  summary?.records.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {record.academic_year}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        Semester {record.semester}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {formatCurrency(record.tuition_fee)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {formatCurrency(record.accommodation_fee || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {formatCurrency(record.other_fees || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                        {formatCurrency(record.total_amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {formatCurrency(record.balance)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(record.payment_status)}`}>
                          {record.payment_status.charAt(0).toUpperCase() + record.payment_status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(record.due_date)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}



      {activeTab === 'payments' && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Method
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reference
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {summary?.payments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      <div className="flex flex-col items-center">
                        <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                          <span className="text-2xl">💳</span>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Payments</h3>
                        <p className="text-gray-600">Your payment history will appear here.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  summary?.payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(payment.payment_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {payment.payment_method || 'Cash'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {payment.reference_number || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {formatCurrency(payment.amount)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {payment.notes || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentInvoices;
