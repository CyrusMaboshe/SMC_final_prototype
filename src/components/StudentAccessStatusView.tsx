'use client';

import React, { useState, useEffect } from 'react';
import { studentAPI } from '@/lib/supabase';
import { useAccessControlMonitor } from '@/hooks/useAccessControl';

interface StudentAccessStatusViewProps {
  studentId: string;
}

interface PaymentApproval {
  id: string;
  amount_paid: number;
  payment_reference?: string;
  payment_date: string;
  access_valid_from: string;
  access_valid_until: string;
  approval_status: string;
  approval_notes?: string;
  accountants?: {
    full_name: string;
  };
}

interface SemesterRegistration {
  id: string;
  registration_date: string;
  approval_date?: string;
  registration_status: string;
  registration_notes?: string;
  semester_periods?: {
    semester_name: string;
    academic_year: string;
    semester_number: number;
    start_date: string;
    end_date: string;
    is_active: boolean;
  };
  payment_approvals?: {
    amount_paid: number;
    payment_reference: string;
    access_valid_until: string;
  };
}

const StudentAccessStatusView: React.FC<StudentAccessStatusViewProps> = ({ studentId }) => {
  const [paymentApprovals, setPaymentApprovals] = useState<PaymentApproval[]>([]);
  const [semesterRegistrations, setSemesterRegistrations] = useState<SemesterRegistration[]>([]);
  const [activeSemester, setActiveSemester] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Use access control monitoring
  const accessControl = useAccessControlMonitor(studentId);

  useEffect(() => {
    loadAccessData();
  }, [studentId]);

  const loadAccessData = async () => {
    try {
      setLoading(true);
      setError('');

      const [paymentsData, registrationsData, activeSemesterData] = await Promise.all([
        studentAPI.getMyPaymentApprovals(studentId).catch(() => []),
        studentAPI.getMySemesterRegistrations(studentId).catch(() => []),
        studentAPI.getActiveSemester().catch(() => null)
      ]);

      setPaymentApprovals(paymentsData || []);
      setSemesterRegistrations(registrationsData || []);
      setActiveSemester(activeSemesterData);

    } catch (error: any) {
      console.error('Error loading access data:', error);
      setError('Failed to load access information');
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
      case 'expired':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const isPaymentExpired = (validUntil: string) => {
    return new Date(validUntil) < new Date();
  };

  const getDaysUntilExpiry = (validUntil: string) => {
    const expiryDate = new Date(validUntil);
    const now = new Date();
    const diffTime = expiryDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">My Access Status</h2>
        <button
          onClick={loadAccessData}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-red-400">⚠️</span>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Overall Access Status */}
      <div className={`rounded-lg p-6 border ${
        accessControl.hasAccess 
          ? 'bg-green-50 border-green-200' 
          : 'bg-red-50 border-red-200'
      }`}>
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <span className="text-3xl">
              {accessControl.hasAccess ? '✅' : '🚫'}
            </span>
          </div>
          <div className="ml-4 flex-1">
            <h3 className={`text-lg font-semibold ${
              accessControl.hasAccess ? 'text-green-900' : 'text-red-900'
            }`}>
              Portal Access: {accessControl.hasAccess ? 'Granted' : 'Restricted'}
            </h3>
            <p className={`text-sm ${
              accessControl.hasAccess ? 'text-green-700' : 'text-red-700'
            }`}>
              {accessControl.hasAccess 
                ? 'You have full access to all portal features.'
                : accessControl.denialReason || 'Access to the portal is currently restricted.'
              }
            </p>
            
            <div className="mt-3 grid grid-cols-2 gap-4">
              <div className="flex items-center">
                <span className="text-sm font-medium mr-2">Payment Status:</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  accessControl.paymentApproved 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {accessControl.paymentApproved ? '✓ Approved' : '✗ Not Approved'}
                </span>
              </div>
              
              <div className="flex items-center">
                <span className="text-sm font-medium mr-2">Registration Status:</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  accessControl.semesterRegistered 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {accessControl.semesterRegistered ? '✓ Registered' : '✗ Not Registered'}
                </span>
              </div>
            </div>

            {accessControl.accessValidUntil && (
              <div className="mt-2">
                <span className="text-sm font-medium">Access Valid Until: </span>
                <span className="text-sm">
                  {formatDate(accessControl.accessValidUntil)}
                  {getDaysUntilExpiry(accessControl.accessValidUntil) <= 7 && (
                    <span className="ml-2 text-yellow-600 font-medium">
                      (Expires in {getDaysUntilExpiry(accessControl.accessValidUntil)} days)
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Active Semester Information */}
      {activeSemester && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Current Semester</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-blue-800">
                <strong>{activeSemester.semester_name}</strong>
              </p>
              <p className="text-blue-700">
                {activeSemester.academic_year} • Semester {activeSemester.semester_number}
              </p>
              <p className="text-blue-700 text-sm">
                {formatDate(activeSemester.start_date)} - {formatDate(activeSemester.end_date)}
              </p>
            </div>
            <div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                activeSemester.is_registration_open 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                Registration {activeSemester.is_registration_open ? 'Open' : 'Closed'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Payment Approvals */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">My Payment Approvals</h3>
        
        {paymentApprovals.length > 0 ? (
          <div className="space-y-4">
            {paymentApprovals.map((payment) => (
              <div key={payment.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-medium text-gray-900">
                      {formatCurrency(payment.amount_paid)}
                    </p>
                    <p className="text-sm text-gray-600">
                      Payment Date: {formatDate(payment.payment_date)}
                    </p>
                    {payment.payment_reference && (
                      <p className="text-sm text-gray-600">
                        Reference: {payment.payment_reference}
                      </p>
                    )}
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(payment.approval_status)}`}>
                    {payment.approval_status}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Access Period:</span>
                    <p className="text-gray-600">
                      {formatDate(payment.access_valid_from)} - {formatDate(payment.access_valid_until)}
                    </p>
                    {isPaymentExpired(payment.access_valid_until) && payment.approval_status === 'approved' && (
                      <p className="text-red-600 text-xs mt-1">⚠️ Access period has expired</p>
                    )}
                  </div>
                  
                  {payment.accountants?.full_name && (
                    <div>
                      <span className="font-medium">Approved By:</span>
                      <p className="text-gray-600">{payment.accountants.full_name}</p>
                    </div>
                  )}
                </div>

                {payment.approval_notes && (
                  <div className="mt-3 p-3 bg-gray-50 rounded">
                    <span className="font-medium text-sm">Notes:</span>
                    <p className="text-sm text-gray-700 mt-1">{payment.approval_notes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">💰</span>
            </div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">No Payment Approvals</h4>
            <p className="text-gray-600">
              You don't have any payment approvals yet. Contact the Accounts Office to process your payment.
            </p>
          </div>
        )}
      </div>

      {/* Semester Registrations */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">My Semester Registrations</h3>
        
        {semesterRegistrations.length > 0 ? (
          <div className="space-y-4">
            {semesterRegistrations.map((registration) => (
              <div key={registration.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-medium text-gray-900">
                      {registration.semester_periods?.semester_name}
                    </p>
                    <p className="text-sm text-gray-600">
                      {registration.semester_periods?.academic_year} • Semester {registration.semester_periods?.semester_number}
                    </p>
                    <p className="text-sm text-gray-600">
                      Registered: {formatDate(registration.registration_date)}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(registration.registration_status)}`}>
                      {registration.registration_status}
                    </span>
                    {registration.semester_periods?.is_active && (
                      <p className="text-xs text-green-600 mt-1">📅 Active Semester</p>
                    )}
                  </div>
                </div>

                {registration.approval_date && (
                  <p className="text-sm text-gray-600">
                    Approved: {formatDate(registration.approval_date)}
                  </p>
                )}

                {registration.registration_notes && (
                  <div className="mt-3 p-3 bg-gray-50 rounded">
                    <span className="font-medium text-sm">Notes:</span>
                    <p className="text-sm text-gray-700 mt-1">{registration.registration_notes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">📚</span>
            </div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">No Semester Registrations</h4>
            <p className="text-gray-600">
              You haven't registered for any semesters yet. Contact the Accounts Office during registration periods.
            </p>
          </div>
        )}
      </div>

      {/* Help Section */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-yellow-900 mb-2">Need Help?</h3>
        <div className="text-yellow-800 space-y-2">
          <p>If you're experiencing access issues:</p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Ensure your payment has been processed and approved by the Accounts Office</li>
            <li>Verify you're registered for the current semester</li>
            <li>Check that your access period hasn't expired</li>
            <li>Contact the Accounts Office for assistance</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default StudentAccessStatusView;
