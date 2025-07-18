'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface LedgerManagementProps {
  accountantId: string;
}

interface LedgerEntry {
  id: string;
  date: string;
  description: string;
  reference_number: string;
  debit_amount: number;
  credit_amount: number;
  student_id: string;
  student_name: string;
  student_number: string;
  type: 'fee' | 'payment' | 'adjustment';
  editable: boolean;
}

interface Student {
  id: string;
  student_id: string;
  first_name: string;
  last_name: string;
  program: string;
}

const LedgerManagement: React.FC<LedgerManagementProps> = ({ accountantId }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [activeTab, setActiveTab] = useState<'view' | 'edit' | 'balance'>('view');

  const [newEntry, setNewEntry] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    reference_number: '',
    debit_amount: 0,
    credit_amount: 0,
    type: 'adjustment' as 'fee' | 'payment' | 'adjustment'
  });

  const [editEntry, setEditEntry] = useState({
    id: '',
    date: '',
    description: '',
    reference_number: '',
    debit_amount: 0,
    credit_amount: 0
  });

  useEffect(() => {
    loadStudents();
  }, []);

  useEffect(() => {
    if (selectedStudent) {
      loadStudentLedger();
    }
  }, [selectedStudent]);

  const loadStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('id, student_id, first_name, last_name, program')
        .eq('status', 'active')
        .order('student_id');

      if (error) throw error;
      setStudents(data || []);
    } catch (error: any) {
      setError('Failed to load students: ' + error.message);
    }
  };

  const loadStudentLedger = async () => {
    try {
      setLoading(true);
      setError('');

      // Load financial records
      const { data: financialRecords, error: frError } = await supabase
        .from('financial_records')
        .select(`
          id,
          academic_year,
          semester,
          total_amount,
          due_date,
          created_at,
          students!inner(student_id, first_name, last_name)
        `)
        .eq('student_id', selectedStudent)
        .order('created_at');

      // Load payments
      const { data: payments, error: payError } = await supabase
        .from('payments')
        .select(`
          id,
          amount,
          payment_method,
          reference_number,
          payment_date,
          notes,
          students!inner(student_id, first_name, last_name)
        `)
        .eq('student_id', selectedStudent)
        .order('payment_date');

      if (frError) throw frError;
      if (payError) throw payError;

      // Convert to ledger entries
      const entries: LedgerEntry[] = [];

      // Add financial records as debits
      financialRecords?.forEach((record: any) => {
        entries.push({
          id: record.id,
          date: record.due_date || record.created_at,
          description: `${record.academic_year} Semester ${record.semester} Fees`,
          reference_number: `FEE-${record.id.slice(0, 8)}`,
          debit_amount: record.total_amount,
          credit_amount: 0,
          student_id: selectedStudent,
          student_name: `${record.students.first_name} ${record.students.last_name}`,
          student_number: record.students.student_id,
          type: 'fee',
          editable: true
        });
      });

      // Add payments as credits
      payments?.forEach((payment: any) => {
        entries.push({
          id: payment.id,
          date: payment.payment_date,
          description: `Payment - ${payment.payment_method}${payment.notes ? ` (${payment.notes})` : ''}`,
          reference_number: payment.reference_number || `PAY-${payment.id.slice(0, 8)}`,
          debit_amount: 0,
          credit_amount: payment.amount,
          student_id: selectedStudent,
          student_name: `${payment.students.first_name} ${payment.students.last_name}`,
          student_number: payment.students.student_id,
          type: 'payment',
          editable: true
        });
      });

      // Sort by date
      entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      setLedgerEntries(entries);
    } catch (error: any) {
      setError('Failed to load ledger: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');

      // Create a manual adjustment entry
      const { data, error } = await supabase
        .from('ledger_adjustments')
        .insert([{
          student_id: selectedStudent,
          date: newEntry.date,
          description: newEntry.description,
          reference_number: newEntry.reference_number,
          debit_amount: newEntry.debit_amount,
          credit_amount: newEntry.credit_amount,
          type: newEntry.type,
          created_by: accountantId
        }])
        .select()
        .single();

      if (error) throw error;

      setSuccess('Ledger entry added successfully!');
      setShowAddEntry(false);
      setNewEntry({
        date: new Date().toISOString().split('T')[0],
        description: '',
        reference_number: '',
        debit_amount: 0,
        credit_amount: 0,
        type: 'adjustment'
      });

      await loadStudentLedger();
    } catch (error: any) {
      setError('Failed to add entry: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');

      // Update the entry based on its type
      if (editEntry.id.startsWith('fee-')) {
        // Update financial record
        const recordId = editEntry.id.replace('fee-', '');
        const { error } = await supabase
          .from('financial_records')
          .update({
            total_amount: editEntry.debit_amount,
            due_date: editEntry.date
          })
          .eq('id', recordId);

        if (error) throw error;
      } else if (editEntry.id.startsWith('pay-')) {
        // Update payment
        const paymentId = editEntry.id.replace('pay-', '');
        const { error } = await supabase
          .from('payments')
          .update({
            amount: editEntry.credit_amount,
            payment_date: editEntry.date,
            reference_number: editEntry.reference_number
          })
          .eq('id', paymentId);

        if (error) throw error;
      }

      setSuccess('Ledger entry updated successfully!');
      setEditingEntry(null);
      await loadStudentLedger();
    } catch (error: any) {
      setError('Failed to update entry: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateBalance = () => {
    const totalDebits = ledgerEntries.reduce((sum, entry) => sum + entry.debit_amount, 0);
    const totalCredits = ledgerEntries.reduce((sum, entry) => sum + entry.credit_amount, 0);
    const balance = totalDebits - totalCredits;
    return { totalDebits, totalCredits, balance };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZM', {
      style: 'currency',
      currency: 'ZMW',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  const startEdit = (entry: LedgerEntry) => {
    setEditEntry({
      id: entry.id,
      date: entry.date,
      description: entry.description,
      reference_number: entry.reference_number,
      debit_amount: entry.debit_amount,
      credit_amount: entry.credit_amount
    });
    setEditingEntry(entry.id);
  };

  const { totalDebits, totalCredits, balance } = calculateBalance();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Ledger Management</h2>
        <div className="text-sm text-gray-500">
          Edit and balance student ledgers
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}

      {/* Student Selection */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Student</h3>
        <select
          value={selectedStudent}
          onChange={(e) => setSelectedStudent(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Select a student...</option>
          {students.map((student) => (
            <option key={student.id} value={student.id}>
              {student.student_id} - {student.first_name} {student.last_name} ({student.program})
            </option>
          ))}
        </select>
      </div>

      {selectedStudent && (
        <>
          {/* Tab Navigation */}
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('view')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'view'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📊 View Ledger
            </button>
            <button
              onClick={() => setActiveTab('edit')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'edit'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              ✏️ Edit Entries
            </button>
            <button
              onClick={() => setActiveTab('balance')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'balance'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              ⚖️ Balance Ledger
            </button>
          </div>

          {/* Balance Summary */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <div className="text-center">
                  <p className="text-sm font-medium text-green-600">Total Debits</p>
                  <p className="text-2xl font-bold text-green-900">{formatCurrency(totalDebits)}</p>
                </div>
              </div>
              <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                <div className="text-center">
                  <p className="text-sm font-medium text-red-600">Total Credits</p>
                  <p className="text-2xl font-bold text-red-900">{formatCurrency(totalCredits)}</p>
                </div>
              </div>
              <div className={`rounded-lg p-4 border ${
                balance === 0 ? 'bg-green-50 border-green-200' :
                balance > 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'
              }`}>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-600">Balance</p>
                  <p className={`text-2xl font-bold ${
                    balance === 0 ? 'text-green-900' :
                    balance > 0 ? 'text-yellow-900' : 'text-red-900'
                  }`}>
                    {formatCurrency(Math.abs(balance))}
                  </p>
                  <p className="text-xs text-gray-500">
                    {balance === 0 ? 'Balanced' : balance > 0 ? 'Student Owes' : 'Overpaid'}
                  </p>
                </div>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="text-center">
                  <p className="text-sm font-medium text-blue-600">Entries</p>
                  <p className="text-2xl font-bold text-blue-900">{ledgerEntries.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* View Tab */}
          {activeTab === 'view' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Student Ledger Entries</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse border border-gray-400">
                  <thead className="bg-green-100">
                    <tr>
                      <th className="border border-gray-400 px-4 py-3 text-center text-sm font-bold">Date</th>
                      <th className="border border-gray-400 px-4 py-3 text-center text-sm font-bold">Description</th>
                      <th className="border border-gray-400 px-4 py-3 text-center text-sm font-bold">Reference</th>
                      <th className="border border-gray-400 px-4 py-3 text-center text-sm font-bold">Debit</th>
                      <th className="border border-gray-400 px-4 py-3 text-center text-sm font-bold">Credit</th>
                      <th className="border border-gray-400 px-4 py-3 text-center text-sm font-bold">Type</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {ledgerEntries.map((entry, index) => (
                      <tr key={entry.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="border border-gray-400 px-4 py-3 text-sm text-center">
                          {formatDate(entry.date)}
                        </td>
                        <td className="border border-gray-400 px-4 py-3 text-sm">
                          {entry.description}
                        </td>
                        <td className="border border-gray-400 px-4 py-3 text-sm text-center">
                          {entry.reference_number}
                        </td>
                        <td className="border border-gray-400 px-4 py-3 text-sm text-right bg-green-50">
                          {entry.debit_amount > 0 ? formatCurrency(entry.debit_amount) : '-'}
                        </td>
                        <td className="border border-gray-400 px-4 py-3 text-sm text-right bg-red-50">
                          {entry.credit_amount > 0 ? formatCurrency(entry.credit_amount) : '-'}
                        </td>
                        <td className="border border-gray-400 px-4 py-3 text-sm text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            entry.type === 'fee' ? 'bg-blue-100 text-blue-800' :
                            entry.type === 'payment' ? 'bg-green-100 text-green-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {entry.type}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Edit Tab */}
          {activeTab === 'edit' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Edit Ledger Entries</h3>
                  <button
                    onClick={() => setShowAddEntry(true)}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium"
                  >
                    + Add Entry
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse border border-gray-400">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="border border-gray-400 px-4 py-3 text-center text-sm font-bold">Date</th>
                        <th className="border border-gray-400 px-4 py-3 text-center text-sm font-bold">Description</th>
                        <th className="border border-gray-400 px-4 py-3 text-center text-sm font-bold">Reference</th>
                        <th className="border border-gray-400 px-4 py-3 text-center text-sm font-bold">Debit</th>
                        <th className="border border-gray-400 px-4 py-3 text-center text-sm font-bold">Credit</th>
                        <th className="border border-gray-400 px-4 py-3 text-center text-sm font-bold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {ledgerEntries.map((entry, index) => (
                        <tr key={entry.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          {editingEntry === entry.id ? (
                            <>
                              <td className="border border-gray-400 px-2 py-2">
                                <input
                                  type="date"
                                  value={editEntry.date}
                                  onChange={(e) => setEditEntry(prev => ({ ...prev, date: e.target.value }))}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                />
                              </td>
                              <td className="border border-gray-400 px-2 py-2">
                                <input
                                  type="text"
                                  value={editEntry.description}
                                  onChange={(e) => setEditEntry(prev => ({ ...prev, description: e.target.value }))}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                />
                              </td>
                              <td className="border border-gray-400 px-2 py-2">
                                <input
                                  type="text"
                                  value={editEntry.reference_number}
                                  onChange={(e) => setEditEntry(prev => ({ ...prev, reference_number: e.target.value }))}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                />
                              </td>
                              <td className="border border-gray-400 px-2 py-2">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={editEntry.debit_amount}
                                  onChange={(e) => setEditEntry(prev => ({ ...prev, debit_amount: parseFloat(e.target.value) || 0 }))}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                />
                              </td>
                              <td className="border border-gray-400 px-2 py-2">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={editEntry.credit_amount}
                                  onChange={(e) => setEditEntry(prev => ({ ...prev, credit_amount: parseFloat(e.target.value) || 0 }))}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                />
                              </td>
                              <td className="border border-gray-400 px-2 py-2">
                                <div className="flex space-x-1">
                                  <button
                                    onClick={handleEditEntry}
                                    className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => setEditingEntry(null)}
                                    className="bg-gray-600 hover:bg-gray-700 text-white px-2 py-1 rounded text-xs"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="border border-gray-400 px-4 py-3 text-sm text-center">
                                {formatDate(entry.date)}
                              </td>
                              <td className="border border-gray-400 px-4 py-3 text-sm">
                                {entry.description}
                              </td>
                              <td className="border border-gray-400 px-4 py-3 text-sm text-center">
                                {entry.reference_number}
                              </td>
                              <td className="border border-gray-400 px-4 py-3 text-sm text-right bg-green-50">
                                {entry.debit_amount > 0 ? formatCurrency(entry.debit_amount) : '-'}
                              </td>
                              <td className="border border-gray-400 px-4 py-3 text-sm text-right bg-red-50">
                                {entry.credit_amount > 0 ? formatCurrency(entry.credit_amount) : '-'}
                              </td>
                              <td className="border border-gray-400 px-4 py-3 text-sm text-center">
                                {entry.editable && (
                                  <button
                                    onClick={() => startEdit(entry)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs"
                                  >
                                    Edit
                                  </button>
                                )}
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Balance Tab */}
          {activeTab === 'balance' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Ledger Balance Analysis</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Balance Status</h4>
                    <div className={`p-4 rounded-lg border ${
                      balance === 0 ? 'bg-green-50 border-green-200' :
                      'bg-yellow-50 border-yellow-200'
                    }`}>
                      <div className="flex items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          balance === 0 ? 'bg-green-600' : 'bg-yellow-600'
                        }`}>
                          <span className="text-white text-sm">
                            {balance === 0 ? '✓' : '⚠'}
                          </span>
                        </div>
                        <div className="ml-4">
                          <p className={`font-medium ${
                            balance === 0 ? 'text-green-800' : 'text-yellow-800'
                          }`}>
                            {balance === 0 ? 'Ledger is Balanced' : 'Ledger is Unbalanced'}
                          </p>
                          <p className={`text-sm ${
                            balance === 0 ? 'text-green-600' : 'text-yellow-600'
                          }`}>
                            {balance === 0 ?
                              'Debits equal credits' :
                              `Difference: ${formatCurrency(Math.abs(balance))}`
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Quick Actions</h4>
                    <div className="space-y-2">
                      {balance !== 0 && (
                        <button
                          onClick={() => {
                            setNewEntry({
                              date: new Date().toISOString().split('T')[0],
                              description: 'Balance Adjustment',
                              reference_number: `ADJ-${Date.now()}`,
                              debit_amount: balance < 0 ? Math.abs(balance) : 0,
                              credit_amount: balance > 0 ? balance : 0,
                              type: 'adjustment'
                            });
                            setShowAddEntry(true);
                          }}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
                        >
                          Create Balance Adjustment
                        </button>
                      )}
                      <button
                        onClick={() => setShowAddEntry(true)}
                        className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium"
                      >
                        Add Manual Entry
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <h4 className="font-medium text-gray-900 mb-3">Ledger Summary</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-sm text-gray-600">Total Debits</p>
                        <p className="text-lg font-bold text-green-600">{formatCurrency(totalDebits)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Total Credits</p>
                        <p className="text-lg font-bold text-red-600">{formatCurrency(totalCredits)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Net Balance</p>
                        <p className={`text-lg font-bold ${
                          balance === 0 ? 'text-green-600' :
                          balance > 0 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {formatCurrency(Math.abs(balance))}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Add Entry Modal */}
          {showAddEntry && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                <div className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Add Ledger Entry</h3>
                    <button
                      onClick={() => setShowAddEntry(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <span className="text-xl">×</span>
                    </button>
                  </div>

                  <form onSubmit={handleAddEntry} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Date
                      </label>
                      <input
                        type="date"
                        required
                        value={newEntry.date}
                        onChange={(e) => setNewEntry(prev => ({ ...prev, date: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <input
                        type="text"
                        required
                        value={newEntry.description}
                        onChange={(e) => setNewEntry(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter description..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Reference Number
                      </label>
                      <input
                        type="text"
                        required
                        value={newEntry.reference_number}
                        onChange={(e) => setNewEntry(prev => ({ ...prev, reference_number: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter reference..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Debit Amount
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={newEntry.debit_amount}
                          onChange={(e) => setNewEntry(prev => ({
                            ...prev,
                            debit_amount: parseFloat(e.target.value) || 0,
                            credit_amount: 0
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Credit Amount
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={newEntry.credit_amount}
                          onChange={(e) => setNewEntry(prev => ({
                            ...prev,
                            credit_amount: parseFloat(e.target.value) || 0,
                            debit_amount: 0
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Entry Type
                      </label>
                      <select
                        value={newEntry.type}
                        onChange={(e) => setNewEntry(prev => ({ ...prev, type: e.target.value as 'fee' | 'payment' | 'adjustment' }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="adjustment">Adjustment</option>
                        <option value="fee">Fee</option>
                        <option value="payment">Payment</option>
                      </select>
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setShowAddEntry(false)}
                        className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-medium"
                      >
                        {loading ? 'Adding...' : 'Add Entry'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default LedgerManagement;
