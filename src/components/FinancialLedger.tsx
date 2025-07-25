'use client';

import React, { useState, useEffect } from 'react';
import { accountantAPI, FinancialRecord, Payment } from '@/lib/supabase';
import { useAccountantRealTimeUpdates } from '@/hooks/useRealTimeUpdates';

interface FinancialLedgerProps {
  accountantId: string;
}

interface StudentWithFinancials {
  id: string;
  student_id: string;
  first_name: string;
  last_name: string;
  email: string;
  program: string;
  year_of_study: number;
  semester: number;
  status: string;
}

interface LedgerEntry {
  id: string;
  student_id: string;
  student_name: string;
  student_number: string;
  description: string;
  amount: number;
  balance: number;
  date: string;
  type: 'fee' | 'payment';
  reference_number?: string;
}

const FinancialLedger: React.FC<FinancialLedgerProps> = ({ accountantId }) => {
  const [students, setStudents] = useState<StudentWithFinancials[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [accountBalances, setAccountBalances] = useState<any[]>([]);
  const [transactionHistory, setTransactionHistory] = useState<any[]>([]);
  const [financialSummary, setFinancialSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAddRecord, setShowAddRecord] = useState(false);
  const [showRecordPayment, setShowRecordPayment] = useState(false);
  const [showEditRecord, setShowEditRecord] = useState(false);
  const [showEditPayment, setShowEditPayment] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [editingPayment, setEditingPayment] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('ledger'); // ledger, accounts, transactions, summary

  const [recordForm, setRecordForm] = useState({
    student_id: '',
    academic_year: '2024-2025',
    semester: 1,
    tuition_fee: 0,
    accommodation_fee: 0,
    other_fees: 0,
    due_date: ''
  });

  const [paymentForm, setPaymentForm] = useState({
    student_id: '',
    amount: 0,
    payment_method: 'cash',
    reference_number: '',
    payment_date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  // Set up real-time updates for accountant
  useAccountantRealTimeUpdates(() => {
    console.log('Real-time update triggered, reloading data...');
    loadData();
  });

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      console.log('Loading enhanced accountant data...');

      const [
        studentsData,
        recordsData,
        paymentsData,
        accountsData,
        transactionsData,
        summaryData
      ] = await Promise.all([
        accountantAPI.getAllStudents(),
        accountantAPI.getAllFinancialRecords(),
        accountantAPI.getAllPayments(),
        accountantAPI.getAccountBalances(),
        accountantAPI.getTransactionHistory(undefined, undefined, 50),
        accountantAPI.getFinancialSummary()
      ]);

      console.log('Students loaded:', studentsData?.length || 0);
      console.log('Financial records loaded:', recordsData?.length || 0);
      console.log('Payments loaded:', paymentsData?.length || 0);
      console.log('Account balances loaded:', accountsData?.length || 0);
      console.log('Transaction history loaded:', transactionsData?.length || 0);

      setStudents(studentsData || []);
      setAccountBalances(accountsData || []);
      setTransactionHistory(transactionsData || []);
      setFinancialSummary(summaryData || null);

      // Combine financial records and payments into ledger entries
      const entries: LedgerEntry[] = [];

      // Add financial records as fee entries (using new RPC function structure)
      recordsData?.forEach(record => {
        entries.push({
          id: record.id,
          student_id: record.student_id,
          student_name: `${record.first_name} ${record.last_name}`,
          student_number: record.student_number || '',
          description: `${record.academic_year} Semester ${record.semester} Fees`,
          amount: record.total_amount,
          balance: record.balance,
          date: record.created_at,
          type: 'fee'
        });
      });

      // Add payments as payment entries (using new RPC function structure)
      paymentsData?.forEach(payment => {
        entries.push({
          id: payment.id,
          student_id: payment.student_id,
          student_name: `${payment.first_name} ${payment.last_name}`,
          student_number: payment.student_number || '',
          description: `Payment - ${payment.payment_method || 'Cash'}`,
          amount: payment.amount,
          balance: 0, // Will be calculated
          date: payment.payment_date,
          type: 'payment',
          reference_number: payment.reference_number
        });
      });

      // Sort by date (newest first)
      entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setLedgerEntries(entries);

    } catch (error: any) {
      console.error('Error loading data:', error);
      setError(`Failed to load financial data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError('');
      await accountantAPI.createFinancialRecord(recordForm, accountantId);
      setSuccess('Financial record created successfully!');
      setShowAddRecord(false);
      setRecordForm({
        student_id: '',
        academic_year: '2024-2025',
        semester: 1,
        tuition_fee: 0,
        accommodation_fee: 0,
        other_fees: 0,
        due_date: ''
      });
      loadData();
    } catch (error: any) {
      setError(error.message || 'Failed to create financial record');
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError('');
      await accountantAPI.recordPayment({
        ...paymentForm,
        processed_by: accountantId
      }, accountantId);
      setSuccess('Payment recorded successfully!');
      setShowRecordPayment(false);
      setPaymentForm({
        student_id: '',
        amount: 0,
        payment_method: 'cash',
        reference_number: '',
        payment_date: new Date().toISOString().split('T')[0],
        notes: ''
      });
      loadData();
    } catch (error: any) {
      setError(error.message || 'Failed to record payment');
    }
  };

  const handleEditRecord = (record: any) => {
    setEditingRecord(record);
    setRecordForm({
      student_id: record.student_id,
      academic_year: record.academic_year,
      semester: record.semester,
      tuition_fee: record.tuition_fee,
      accommodation_fee: record.accommodation_fee,
      other_fees: record.other_fees,
      due_date: record.due_date
    });
    setShowEditRecord(true);
  };

  const handleUpdateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError('');
      await accountantAPI.updateFinancialRecord(editingRecord.id, recordForm, accountantId);
      setSuccess('Financial record updated successfully!');
      setShowEditRecord(false);
      setEditingRecord(null);
      setRecordForm({
        student_id: '',
        academic_year: '2024-2025',
        semester: 1,
        tuition_fee: 0,
        accommodation_fee: 0,
        other_fees: 0,
        due_date: ''
      });
      loadData();
    } catch (error: any) {
      setError(error.message || 'Failed to update financial record');
    }
  };

  // Delete functionality removed for security - account balances should not be deleted

  const handleEditPayment = (payment: any) => {
    setEditingPayment(payment);
    setPaymentForm({
      student_id: payment.student_id,
      amount: payment.amount,
      payment_method: payment.payment_method,
      reference_number: payment.reference_number || '',
      payment_date: payment.payment_date,
      notes: payment.notes || ''
    });
    setShowEditPayment(true);
  };

  const handleUpdatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError('');
      await accountantAPI.updatePayment(editingPayment.id, paymentForm, accountantId);
      setSuccess('Payment updated successfully!');
      setShowEditPayment(false);
      setEditingPayment(null);
      setPaymentForm({
        student_id: '',
        amount: 0,
        payment_method: 'cash',
        reference_number: '',
        payment_date: new Date().toISOString().split('T')[0],
        notes: ''
      });
      loadData();
    } catch (error: any) {
      setError(error.message || 'Failed to update payment');
    }
  };

  // Delete functionality removed for security - payments should not be deleted

  const filteredEntries = ledgerEntries.filter(entry => {
    if (!searchTerm) return true;
    return (
      entry.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.student_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

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
        <h2 className="text-2xl font-bold text-gray-900">Financial Management</h2>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowRecordPayment(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Record Payment
          </button>
          <button
            onClick={() => setShowAddRecord(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Add Financial Record
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'ledger', name: 'Transaction Ledger', icon: '📊' },
            { id: 'accounts', name: 'Account Balances', icon: '💰' },
            { id: 'transactions', name: 'Transaction History', icon: '📋' },
            { id: 'summary', name: 'Financial Summary', icon: '📈' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
            >
              <span>{tab.icon}</span>
              <span>{tab.name}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'ledger' && (
        <>
          {/* Search and Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by student name, ID, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex space-x-2">
            <select className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              <option value="">All Types</option>
              <option value="fee">Fees</option>
              <option value="payment">Payments</option>
            </select>
            <select className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              <option value="">All Students</option>
              {students.map(student => (
                <option key={student.id} value={student.id}>
                  {student.student_id} - {student.first_name} {student.last_name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Balance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reference
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                        <span className="text-2xl">📋</span>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No Ledger Entries</h3>
                      <p className="text-gray-600">Financial transactions will appear here when recorded.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(entry.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{entry.student_name}</div>
                        <div className="text-sm text-gray-500">{entry.student_number}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {entry.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        entry.type === 'fee' 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {entry.type === 'fee' ? 'Fee' : 'Payment'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      <span className={entry.type === 'fee' ? 'text-red-600' : 'text-green-600'}>
                        {entry.type === 'fee' ? '+' : '-'}{formatCurrency(entry.amount)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {entry.type === 'fee' ? formatCurrency(entry.balance) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {entry.reference_number || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                      <div className="flex justify-center space-x-2">
                        {entry.type === 'fee' ? (
                          <button
                            onClick={() => handleEditRecord(entry)}
                            className="text-blue-600 hover:text-blue-900 text-xs"
                            title="Edit Record"
                          >
                            ✏️ Edit
                          </button>
                        ) : (
                          <button
                            onClick={() => handleEditPayment(entry)}
                            className="text-blue-600 hover:text-blue-900 text-xs"
                            title="Edit Payment"
                          >
                            ✏️ Edit
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Financial Record Modal */}
      {showAddRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Add Financial Record</h3>
                <button
                  onClick={() => setShowAddRecord(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">Close</span>
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleCreateRecord} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Student *
                  </label>
                  <select
                    value={recordForm.student_id}
                    onChange={(e) => setRecordForm({ ...recordForm, student_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select a student</option>
                    {students.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.student_id} - {student.first_name} {student.last_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Academic Year *
                    </label>
                    <input
                      type="text"
                      value={recordForm.academic_year}
                      onChange={(e) => setRecordForm({ ...recordForm, academic_year: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Semester *
                    </label>
                    <select
                      value={recordForm.semester}
                      onChange={(e) => setRecordForm({ ...recordForm, semester: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value={1}>Semester 1</option>
                      <option value={2}>Semester 2</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tuition Fee *
                    </label>
                    <input
                      type="number"
                      value={recordForm.tuition_fee}
                      onChange={(e) => setRecordForm({ ...recordForm, tuition_fee: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Accommodation Fee
                    </label>
                    <input
                      type="number"
                      value={recordForm.accommodation_fee}
                      onChange={(e) => setRecordForm({ ...recordForm, accommodation_fee: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Other Fees
                    </label>
                    <input
                      type="number"
                      value={recordForm.other_fees}
                      onChange={(e) => setRecordForm({ ...recordForm, other_fees: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Due Date *
                  </label>
                  <input
                    type="date"
                    value={recordForm.due_date}
                    onChange={(e) => setRecordForm({ ...recordForm, due_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Total Amount:</p>
                  <p className="text-lg font-bold text-gray-900">
                    {formatCurrency(recordForm.tuition_fee + recordForm.accommodation_fee + recordForm.other_fees)}
                  </p>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddRecord(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Create Record
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {showRecordPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Record Payment</h3>
                <button
                  onClick={() => setShowRecordPayment(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">Close</span>
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleRecordPayment} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Student *
                  </label>
                  <select
                    value={paymentForm.student_id}
                    onChange={(e) => setPaymentForm({ ...paymentForm, student_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select a student</option>
                    {students.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.student_id} - {student.first_name} {student.last_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Amount *
                    </label>
                    <input
                      type="number"
                      value={paymentForm.amount}
                      onChange={(e) => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Method *
                    </label>
                    <select
                      value={paymentForm.payment_method}
                      onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="cash">Cash</option>
                      <option value="check">Check</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="credit_card">Credit Card</option>
                      <option value="mobile_money">Mobile Money</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reference Number
                    </label>
                    <input
                      type="text"
                      value={paymentForm.reference_number}
                      onChange={(e) => setPaymentForm({ ...paymentForm, reference_number: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Receipt/Transaction number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Date *
                    </label>
                    <input
                      type="date"
                      value={paymentForm.payment_date}
                      onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Additional notes about the payment..."
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowRecordPayment(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Record Payment
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Financial Record Modal */}
      {showEditRecord && editingRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Edit Financial Record</h3>
                <button
                  onClick={() => {
                    setShowEditRecord(false);
                    setEditingRecord(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleUpdateRecord} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Academic Year
                    </label>
                    <input
                      type="text"
                      value={recordForm.academic_year}
                      onChange={(e) => setRecordForm({...recordForm, academic_year: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Semester
                    </label>
                    <select
                      value={recordForm.semester}
                      onChange={(e) => setRecordForm({...recordForm, semester: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value={1}>Semester 1</option>
                      <option value={2}>Semester 2</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tuition Fee (ZMW)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={recordForm.tuition_fee}
                      onChange={(e) => setRecordForm({...recordForm, tuition_fee: parseFloat(e.target.value) || 0})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Accommodation Fee (ZMW)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={recordForm.accommodation_fee}
                      onChange={(e) => setRecordForm({...recordForm, accommodation_fee: parseFloat(e.target.value) || 0})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Other Fees (ZMW)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={recordForm.other_fees}
                      onChange={(e) => setRecordForm({...recordForm, other_fees: parseFloat(e.target.value) || 0})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={recordForm.due_date}
                      onChange={(e) => setRecordForm({...recordForm, due_date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditRecord(false);
                      setEditingRecord(null);
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Update Record
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
        </>
      )}

      {/* Account Balances Tab */}
      {activeTab === 'accounts' && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Account Balances</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Account Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Account Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Account Type
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Balance
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {accountBalances.map((account) => (
                  <tr key={account.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {account.account_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {account.account_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        account.account_type === 'asset' ? 'bg-green-100 text-green-800' :
                        account.account_type === 'liability' ? 'bg-red-100 text-red-800' :
                        account.account_type === 'equity' ? 'bg-blue-100 text-blue-800' :
                        account.account_type === 'revenue' ? 'bg-purple-100 text-purple-800' :
                        'bg-orange-100 text-orange-800'
                      }`}>
                        {account.account_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                      <span className={account.balance >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatCurrency(account.balance)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Transaction History Tab */}
      {activeTab === 'transactions' && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recent Transaction History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reference
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transactionHistory.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(transaction.transaction_date)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {transaction.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {transaction.reference_number || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                      {formatCurrency(transaction.total_amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Financial Summary Tab */}
      {activeTab === 'summary' && financialSummary && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-semibold">👥</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Students</p>
                  <p className="text-2xl font-semibold text-gray-900">{financialSummary.totalStudents}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                    <span className="text-red-600 font-semibold">💸</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Owed</p>
                  <p className="text-2xl font-semibold text-red-600">{formatCurrency(financialSummary.totalOwed)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 font-semibold">💰</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Paid</p>
                  <p className="text-2xl font-semibold text-green-600">{formatCurrency(financialSummary.totalPaid)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                    <span className="text-orange-600 font-semibold">⚖️</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Outstanding Balance</p>
                  <p className="text-2xl font-semibold text-orange-600">{formatCurrency(financialSummary.totalBalance)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Transactions Summary */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
            <div className="space-y-3">
              {financialSummary.recentTransactions?.slice(0, 5).map((transaction: any) => (
                <div key={transaction.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{transaction.description}</p>
                    <p className="text-xs text-gray-500">{formatDate(transaction.transaction_date)}</p>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {formatCurrency(transaction.total_amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Edit Payment Modal */}
      {showEditPayment && editingPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Edit Payment</h3>
                <button
                  onClick={() => {
                    setShowEditPayment(false);
                    setEditingPayment(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleUpdatePayment} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Amount (ZMW)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={paymentForm.amount}
                      onChange={(e) => setPaymentForm({...paymentForm, amount: parseFloat(e.target.value) || 0})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Method
                    </label>
                    <select
                      value={paymentForm.payment_method}
                      onChange={(e) => setPaymentForm({...paymentForm, payment_method: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="cash">Cash</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="mobile_money">Mobile Money</option>
                      <option value="cheque">Cheque</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reference Number
                    </label>
                    <input
                      type="text"
                      value={paymentForm.reference_number}
                      onChange={(e) => setPaymentForm({...paymentForm, reference_number: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Date
                    </label>
                    <input
                      type="date"
                      value={paymentForm.payment_date}
                      onChange={(e) => setPaymentForm({...paymentForm, payment_date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm({...paymentForm, notes: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditPayment(false);
                      setEditingPayment(null);
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Update Payment
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancialLedger;
