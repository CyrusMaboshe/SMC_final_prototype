'use client';

import React, { useState, useEffect } from 'react';
import { supabase, accountantAPI } from '@/lib/supabase';
import { useAccountantRealTimeUpdates } from '@/hooks/useRealTimeUpdates';

interface AccountBalanceEditorProps {
  accountantId: string;
}

interface Student {
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

interface AccountBalance {
  id: string;
  account_number: string;
  account_name: string;
  account_type: string;
  balance: number;
  student_id?: string;
  student_name?: string;
}

interface BalanceAdjustment {
  student_id: string;
  account_id: string;
  adjustment_amount: number;
  adjustment_type: 'debit' | 'credit';
  description: string;
  reference_number: string;
}

const AccountBalanceEditor: React.FC<AccountBalanceEditorProps> = ({ accountantId }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentBalances, setStudentBalances] = useState<AccountBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAdjustmentForm, setShowAdjustmentForm] = useState(false);
  const [editingBalance, setEditingBalance] = useState<AccountBalance | null>(null);

  const [adjustmentForm, setAdjustmentForm] = useState<BalanceAdjustment>({
    student_id: '',
    account_id: '',
    adjustment_amount: 0,
    adjustment_type: 'debit',
    description: '',
    reference_number: ''
  });

  useEffect(() => {
    loadStudents();
  }, []);

  useEffect(() => {
    if (selectedStudent) {
      loadStudentBalances(selectedStudent.id);
    }
  }, [selectedStudent]);

  // Set up real-time updates
  useAccountantRealTimeUpdates(() => {
    console.log('Account balance editor real-time update triggered');
    if (selectedStudent) {
      loadStudentBalances(selectedStudent.id);
    }
  });

  const loadStudents = async () => {
    try {
      setLoading(true);
      setError('');

      const { data, error } = await supabase
        .from('students')
        .select('id, student_id, first_name, last_name, email, program, year_of_study, semester, status')
        .eq('status', 'active')
        .order('first_name');

      if (error) throw error;
      setStudents(data || []);
    } catch (error: any) {
      console.error('Error loading students:', error);
      setError('Failed to load students: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadStudentBalances = async (studentId: string) => {
    try {
      setLoading(true);
      setError('');

      // Load financial records and calculate balances
      const { data: financialRecords, error: frError } = await supabase
        .from('financial_records')
        .select(`
          id,
          academic_year,
          semester,
          total_amount,
          amount_paid,
          balance,
          due_date,
          created_at
        `)
        .eq('student_id', studentId)
        .order('created_at');

      if (frError) throw frError;

      // Load payments
      const { data: payments, error: payError } = await supabase
        .from('payments')
        .select(`
          id,
          amount,
          payment_date,
          reference_number,
          created_at
        `)
        .eq('student_id', studentId)
        .order('payment_date');

      if (payError) throw payError;

      // Calculate current balances
      const totalOwed = financialRecords?.reduce((sum, record) => sum + (record.total_amount || 0), 0) || 0;
      const totalPaid = payments?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;
      const currentBalance = totalOwed - totalPaid;

      // Create balance entries for display
      const balances: AccountBalance[] = [
        {
          id: 'student-receivable',
          account_number: '1200',
          account_name: 'Student Fees Receivable',
          account_type: 'asset',
          balance: currentBalance,
          student_id: studentId,
          student_name: `${selectedStudent?.first_name} ${selectedStudent?.last_name}`
        }
      ];

      setStudentBalances(balances);
    } catch (error: any) {
      console.error('Error loading student balances:', error);
      setError('Failed to load student balances: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(student =>
    `${student.first_name} ${student.last_name} ${student.student_id}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZM', {
      style: 'currency',
      currency: 'ZMW',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const startBalanceAdjustment = (balance: AccountBalance) => {
    setEditingBalance(balance);
    setAdjustmentForm({
      student_id: balance.student_id || '',
      account_id: balance.id,
      adjustment_amount: 0,
      adjustment_type: 'debit',
      description: '',
      reference_number: `ADJ-${Date.now()}`
    });
    setShowAdjustmentForm(true);
  };

  const handleAdjustmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !editingBalance) return;

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      // Use the API function to apply balance adjustment
      const adjustmentData = {
        student_id: adjustmentForm.student_id,
        account_id: adjustmentForm.account_id,
        adjustment_amount: adjustmentForm.adjustment_amount,
        adjustment_type: adjustmentForm.adjustment_type,
        description: adjustmentForm.description,
        reference_number: adjustmentForm.reference_number
      };

      const result = await accountantAPI.applyBalanceAdjustment(adjustmentData, accountantId);

      setSuccess(`Balance adjustment of ${formatCurrency(adjustmentForm.adjustment_amount)} applied successfully!`);
      setShowAdjustmentForm(false);
      setEditingBalance(null);

      // Reload balances
      await loadStudentBalances(selectedStudent.id);
    } catch (error: any) {
      console.error('Error applying balance adjustment:', error);
      setError('Failed to apply balance adjustment: ' + (error.message || error.toString() || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const cancelAdjustment = () => {
    setShowAdjustmentForm(false);
    setEditingBalance(null);
    setAdjustmentForm({
      student_id: '',
      account_id: '',
      adjustment_amount: 0,
      adjustment_type: 'debit',
      description: '',
      reference_number: ''
    });
  };

  if (loading && !selectedStudent) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Account Balance Editor</h2>
        <div className="text-sm text-gray-500">
          Edit student account balances with proper audit trails
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-red-400">⚠️</span>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-green-400">✅</span>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">{success}</p>
            </div>
          </div>
        </div>
      )}

      {/* Student Selection */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Student</h3>
        
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search students by name or student ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
          {filteredStudents.map((student) => (
            <div
              key={student.id}
              onClick={() => setSelectedStudent(student)}
              className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                selectedStudent?.id === student.id ? 'bg-blue-50 border-blue-200' : ''
              }`}
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-gray-900">
                    {student.first_name} {student.last_name}
                  </p>
                  <p className="text-sm text-gray-600">
                    ID: {student.student_id} | {student.program} | Year {student.year_of_study}
                  </p>
                </div>
                {selectedStudent?.id === student.id && (
                  <span className="text-blue-600">✓</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Student Balance Display */}
      {selectedStudent && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Account Balances for {selectedStudent.first_name} {selectedStudent.last_name}
            </h3>
            <div className="text-sm text-gray-600">
              Student ID: {selectedStudent.student_id}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Account
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Account Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Current Balance
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {studentBalances.map((balance) => (
                    <tr key={balance.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {balance.account_name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {balance.account_number}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          balance.account_type === 'asset' ? 'bg-blue-100 text-blue-800' :
                          balance.account_type === 'liability' ? 'bg-red-100 text-red-800' :
                          balance.account_type === 'equity' ? 'bg-green-100 text-green-800' :
                          balance.account_type === 'revenue' ? 'bg-purple-100 text-purple-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {balance.account_type.charAt(0).toUpperCase() + balance.account_type.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className={`text-sm font-medium ${
                          balance.balance > 0 ? 'text-red-600' :
                          balance.balance < 0 ? 'text-green-600' :
                          'text-gray-900'
                        }`}>
                          {formatCurrency(balance.balance)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => startBalanceAdjustment(balance)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm font-medium"
                        >
                          Adjust Balance
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Balance Adjustment Form Modal */}
      {showAdjustmentForm && editingBalance && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Adjust Account Balance
                </h3>
                <button
                  onClick={cancelAdjustment}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Account: {editingBalance.account_name}</p>
                <p className="text-sm text-gray-600">Current Balance: {formatCurrency(editingBalance.balance)}</p>
                <p className="text-sm text-gray-600">Student: {editingBalance.student_name}</p>
              </div>

              <form onSubmit={handleAdjustmentSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Adjustment Type
                  </label>
                  <select
                    value={adjustmentForm.adjustment_type}
                    onChange={(e) => setAdjustmentForm({
                      ...adjustmentForm,
                      adjustment_type: e.target.value as 'debit' | 'credit'
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="debit">Debit (Increase Balance)</option>
                    <option value="credit">Credit (Decrease Balance)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Adjustment Amount (ZMW)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={adjustmentForm.adjustment_amount}
                    onChange={(e) => setAdjustmentForm({
                      ...adjustmentForm,
                      adjustment_amount: parseFloat(e.target.value) || 0
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reference Number
                  </label>
                  <input
                    type="text"
                    value={adjustmentForm.reference_number}
                    onChange={(e) => setAdjustmentForm({
                      ...adjustmentForm,
                      reference_number: e.target.value
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description/Reason
                  </label>
                  <textarea
                    value={adjustmentForm.description}
                    onChange={(e) => setAdjustmentForm({
                      ...adjustmentForm,
                      description: e.target.value
                    })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter reason for balance adjustment..."
                    required
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg font-medium"
                  >
                    {loading ? 'Processing...' : 'Apply Adjustment'}
                  </button>
                  <button
                    type="button"
                    onClick={cancelAdjustment}
                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg font-medium"
                  >
                    Cancel
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

export default AccountBalanceEditor;
