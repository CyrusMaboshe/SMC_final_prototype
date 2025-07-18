'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import LedgerSystemSetup from './LedgerSystemSetup';

interface DoubleEntryLedgerProps {
  studentId?: string; // If provided, shows student-specific ledger
  accountantId?: string; // If provided, shows full access
  isStudentView?: boolean;
}

interface Student {
  id: string;
  student_id: string;
  first_name: string;
  last_name: string;
  program: string;
  year_of_study: number;
  email: string;
  phone: string;
  date_of_birth: string;
  address: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  semester: number;
  status: string;
}

interface LedgerEntry {
  id: string;
  date: string;
  transaction_number: string;
  description: string;
  reference_type: string;
  reference_number?: string;
  debit_amount: number;
  credit_amount: number;
  running_balance: number;
  account_name: string;
  account_type: string;
  student_name?: string;
  student_id?: string;
}

// AccountBalance interface removed - account balances functionality removed

const DoubleEntryLedger: React.FC<DoubleEntryLedgerProps> = ({
  studentId,
  accountantId,
  isStudentView = false
}) => {
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  // Account balances state removed
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>(studentId || '');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Account filter removed - no longer needed
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 90 days ago
    to: new Date().toISOString().split('T')[0] // today
  });
  // Removed account balances tab - only ledger view available
  const [systemReady, setSystemReady] = useState(false);

  useEffect(() => {
    checkSystemStatus();
    if (!isStudentView && accountantId) {
      loadStudents();
    } else if (isStudentView && studentId) {
      // Load student data for student view to display their information
      loadStudentData();
    }
  }, []);

  useEffect(() => {
    if (systemReady) {
      loadLedgerData();
    }
  }, [selectedStudentId, dateRange, systemReady]);

  const checkSystemStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('id')
        .limit(1);

      if (!error && data) {
        setSystemReady(true);
      }
    } catch (error) {
      console.log('Ledger system not ready:', error);
      setSystemReady(false);
    }
  };

  const loadStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select(`
          id,
          student_id,
          first_name,
          last_name,
          program,
          year_of_study,
          email,
          phone,
          date_of_birth,
          address,
          emergency_contact_name,
          emergency_contact_phone,
          semester,
          status
        `)
        .eq('status', 'active')
        .order('first_name');

      if (error) throw error;
      setStudents(data || []);
    } catch (error: any) {
      console.error('Error loading students:', error);
      setError('Failed to load students: ' + error.message);
    }
  };

  const loadStudentData = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select(`
          id,
          student_id,
          first_name,
          last_name,
          program,
          year_of_study,
          email,
          phone,
          date_of_birth,
          address,
          emergency_contact_name,
          emergency_contact_phone,
          semester,
          status
        `)
        .eq('id', studentId)
        .single();

      if (error) throw error;
      if (data) {
        setStudents([data]); // Set as array with single student
      }
    } catch (error: any) {
      console.error('Error loading student data:', error);
      setError('Failed to load student data: ' + error.message);
    }
  };

  const loadLedgerData = async () => {
    try {
      setLoading(true);
      setError('');

      if (isStudentView && studentId) {
        await loadStudentLedger(studentId);
      } else if (!isStudentView && selectedStudentId) {
        await loadStudentLedger(selectedStudentId);
      } else if (!isStudentView && !selectedStudentId) {
        await loadFullLedger();
      }

      // Account balances functionality removed
    } catch (error: any) {
      console.error('Error loading ledger data:', error);
      setError('Failed to load ledger data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadStudentLedger = async (targetStudentId: string) => {
    // Load actual financial records and payments for the student
    const { data: financialRecords, error: frError } = await supabase
      .from('financial_records')
      .select(`
        id,
        academic_year,
        semester,
        tuition_fee,
        accommodation_fee,
        other_fees,
        total_amount,
        amount_paid,
        balance,
        due_date,
        created_at,
        students!inner(student_id, first_name, last_name)
      `)
      .eq('student_id', targetStudentId)
      .order('created_at', { ascending: true });

    const { data: payments, error: payError } = await supabase
      .from('payments')
      .select(`
        id,
        amount,
        payment_method,
        reference_number,
        payment_date,
        notes,
        created_at,
        students!inner(student_id, first_name, last_name)
      `)
      .eq('student_id', targetStudentId)
      .order('payment_date', { ascending: true });

    if (frError) throw frError;
    if (payError) throw payError;

    // Convert to ledger entries format
    const entries: LedgerEntry[] = [];
    let runningBalance = 0;

    // Add financial records (fees) as debits
    financialRecords?.forEach((record: any) => {
      runningBalance += record.total_amount;
      entries.push({
        id: record.id,
        date: record.due_date || record.created_at,
        transaction_number: `FEE-${record.id.slice(0, 8)}`,
        description: `${record.academic_year} Semester ${record.semester} Fees`,
        reference_type: 'fee_record',
        reference_number: record.id,
        debit_amount: record.total_amount,
        credit_amount: 0,
        running_balance: runningBalance,
        account_name: 'Student Fees Receivable',
        account_type: 'asset',
        student_name: `${record.students.first_name} ${record.students.last_name}`,
        student_id: record.students.student_id
      });
    });

    // Add payments as credits
    payments?.forEach((payment: any) => {
      runningBalance -= payment.amount;
      entries.push({
        id: payment.id,
        date: payment.payment_date,
        transaction_number: `PAY-${payment.id.slice(0, 8)}`,
        description: `Payment - ${payment.payment_method}${payment.notes ? ` (${payment.notes})` : ''}`,
        reference_type: 'payment',
        reference_number: payment.reference_number || payment.id,
        debit_amount: 0,
        credit_amount: payment.amount,
        running_balance: runningBalance,
        account_name: 'Student Fees Receivable',
        account_type: 'asset',
        student_name: `${payment.students.first_name} ${payment.students.last_name}`,
        student_id: payment.students.student_id
      });
    });

    // Sort by date
    entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Recalculate running balance in chronological order
    let balance = 0;
    entries.forEach(entry => {
      balance += entry.debit_amount - entry.credit_amount;
      entry.running_balance = balance;
    });

    setLedgerEntries(entries);
  };

  const loadFullLedger = async () => {
    // Load all financial records and payments for all students
    const { data: financialRecords, error: frError } = await supabase
      .from('financial_records')
      .select(`
        id,
        student_id,
        academic_year,
        semester,
        tuition_fee,
        accommodation_fee,
        other_fees,
        total_amount,
        amount_paid,
        balance,
        due_date,
        created_at,
        students!inner(student_id, first_name, last_name)
      `)
      .gte('created_at', dateRange.from)
      .lte('created_at', dateRange.to)
      .order('created_at', { ascending: true });

    const { data: payments, error: payError } = await supabase
      .from('payments')
      .select(`
        id,
        student_id,
        amount,
        payment_method,
        reference_number,
        payment_date,
        notes,
        created_at,
        students!inner(student_id, first_name, last_name)
      `)
      .gte('payment_date', dateRange.from)
      .lte('payment_date', dateRange.to)
      .order('payment_date', { ascending: true });

    if (frError) throw frError;
    if (payError) throw payError;

    // Convert to ledger entries format
    const entries: LedgerEntry[] = [];

    // Add financial records (fees) as debits
    financialRecords?.forEach((record: any) => {
      entries.push({
        id: record.id,
        date: record.due_date || record.created_at,
        transaction_number: `FEE-${record.id.slice(0, 8)}`,
        description: `${record.academic_year} Semester ${record.semester} Fees`,
        reference_type: 'fee_record',
        reference_number: record.id,
        debit_amount: record.total_amount,
        credit_amount: 0,
        running_balance: 0, // Will be calculated per student
        account_name: 'Student Fees Receivable',
        account_type: 'asset',
        student_name: `${record.students.first_name} ${record.students.last_name}`,
        student_id: record.students.student_id
      });
    });

    // Add payments as credits
    payments?.forEach((payment: any) => {
      entries.push({
        id: payment.id,
        date: payment.payment_date,
        transaction_number: `PAY-${payment.id.slice(0, 8)}`,
        description: `Payment - ${payment.payment_method}${payment.notes ? ` (${payment.notes})` : ''}`,
        reference_type: 'payment',
        reference_number: payment.reference_number || payment.id,
        debit_amount: 0,
        credit_amount: payment.amount,
        running_balance: 0, // Will be calculated per student
        account_name: 'Student Fees Receivable',
        account_type: 'asset',
        student_name: `${payment.students.first_name} ${payment.students.last_name}`,
        student_id: payment.students.student_id
      });
    });

    // Sort by date and student
    entries.sort((a, b) => {
      const studentCompare = (a.student_id || '').localeCompare(b.student_id || '');
      if (studentCompare !== 0) return studentCompare;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    // Calculate running balance per student
    const studentBalances: { [key: string]: number } = {};
    entries.forEach(entry => {
      const studentId = entry.student_id || '';
      if (!studentBalances[studentId]) {
        studentBalances[studentId] = 0;
      }
      studentBalances[studentId] += entry.debit_amount - entry.credit_amount;
      entry.running_balance = studentBalances[studentId];
    });

    setLedgerEntries(entries);
  };

  // Account balances functionality removed from Double Entry Ledger

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

  // Account type color function removed - no longer needed

  const calculateTotals = () => {
    const totalDebits = ledgerEntries.reduce((sum, entry) => sum + entry.debit_amount, 0);
    const totalCredits = ledgerEntries.reduce((sum, entry) => sum + entry.credit_amount, 0);
    return { totalDebits, totalCredits };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const { totalDebits, totalCredits } = calculateTotals();

  return (
    <div className="space-y-6">
      {/* Student Information Header */}
      {selectedStudentId && !isStudentView ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Student Information & Financial Ledger</h2>
            <button
              onClick={() => setSelectedStudentId('')}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              ← Back to All Students
            </button>
          </div>

          {(() => {
            const selectedStudent = students.find(s => s.id === selectedStudentId);
            if (!selectedStudent) return null;

            return (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Personal Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                    Personal Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Full Name</label>
                      <p className="text-sm text-gray-900 font-medium">
                        {selectedStudent.first_name} {selectedStudent.last_name}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Student ID</label>
                      <p className="text-sm text-gray-900 font-medium">{selectedStudent.student_id}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Email</label>
                      <p className="text-sm text-gray-900">{selectedStudent.email}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Phone</label>
                      <p className="text-sm text-gray-900">{selectedStudent.phone}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Date of Birth</label>
                      <p className="text-sm text-gray-900">
                        {selectedStudent.date_of_birth ? new Date(selectedStudent.date_of_birth).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Semester</label>
                      <p className="text-sm text-gray-900">Semester {selectedStudent.semester}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Address</label>
                      <p className="text-sm text-gray-900">{selectedStudent.address || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Status</label>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        selectedStudent.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {selectedStudent.status.charAt(0).toUpperCase() + selectedStudent.status.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Academic & Contact Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                    Academic & Contact Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Program</label>
                      <p className="text-sm text-gray-900 font-medium">{selectedStudent.program}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Year of Study</label>
                      <p className="text-sm text-gray-900">Year {selectedStudent.year_of_study}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Email Address</label>
                      <p className="text-sm text-gray-900">{selectedStudent.email || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Phone Number</label>
                      <p className="text-sm text-gray-900">{selectedStudent.phone || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Emergency Contact</label>
                      <p className="text-sm text-gray-900">{selectedStudent.emergency_contact_name || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Emergency Phone</label>
                      <p className="text-sm text-gray-900">{selectedStudent.emergency_contact_phone || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            {isStudentView ? 'My Financial Ledger' : 'Double Entry Ledger'}
          </h2>
          <div className="text-sm text-gray-500">
            {isStudentView ? 'Your complete financial transaction history' : 'Real-time double-entry bookkeeping system'}
          </div>
        </div>
      )}

      {/* System Setup Check */}
      {!systemReady && (
        <LedgerSystemSetup onSetupComplete={() => setSystemReady(true)} />
      )}

      {!systemReady && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⚙️</span>
          </div>
          <h4 className="text-lg font-semibold text-gray-900 mb-2">System Setup Required</h4>
          <p className="text-gray-600">Please complete the ledger system setup above to continue.</p>
        </div>
      )}

      {systemReady && (
        <>
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

      {/* Account Balances tab removed - only ledger entries available */}

      {/* Student Selection for Accountants */}
      {!isStudentView && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Student to View Ledger</h3>

          {/* Search Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Students
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or student ID..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Student Selection */}
          <div className="space-y-2">
            <button
              onClick={() => setSelectedStudentId('')}
              className={`w-full p-3 rounded-lg border text-left transition-colors ${
                !selectedStudentId
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <p className="font-medium text-gray-900">All Students</p>
              <p className="text-sm text-gray-600">View complete ledger for all students</p>
            </button>

            {students
              .filter(student =>
                student.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                student.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                student.student_id.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .slice(0, 10) // Limit to 10 results for performance
              .map((student) => (
                <button
                  key={student.id}
                  onClick={() => setSelectedStudentId(student.id)}
                  className={`w-full p-3 rounded-lg border text-left transition-colors ${
                    selectedStudentId === student.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <p className="font-medium text-gray-900">
                    {student.first_name} {student.last_name}
                  </p>
                  <p className="text-sm text-gray-600">
                    ID: {student.student_id} | {student.program} | Year {student.year_of_study}
                  </p>
                </button>
              ))}
          </div>
        </div>
      )}

      {/* Filters */}
      {!isStudentView && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                From Date
              </label>
              <input
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                To Date
              </label>
              <input
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* System Overview for All Students View */}
      {!isStudentView && !selectedStudentId && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">System Overview</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <span className="text-white text-sm">👥</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-blue-600">Total Students</p>
                  <p className="text-2xl font-bold text-blue-900">{students.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                    <span className="text-white text-sm">📊</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-green-600">Ledger Entries</p>
                  <p className="text-2xl font-bold text-green-900">{ledgerEntries.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                    <span className="text-white text-sm">📅</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-purple-600">Date Range</p>
                  <p className="text-sm font-bold text-purple-900">
                    {new Date(dateRange.from).toLocaleDateString()} - {new Date(dateRange.to).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              <strong>Instructions:</strong> Select a student from the list above to view their detailed information and financial ledger,
              or use the date filters to view system-wide transactions for a specific period.
            </p>
          </div>
        </div>
      )}

      {/* Ledger Entries - Account Balances section removed */}
      {(
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Summary Cards */}
          <div className="p-6 border-b border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                      <span className="text-white text-sm">+</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-green-600">Total Debits</p>
                    <p className="text-2xl font-bold text-green-900">{formatCurrency(totalDebits)}</p>
                  </div>
                </div>
              </div>
              <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
                      <span className="text-white text-sm">-</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-red-600">Total Credits</p>
                    <p className="text-2xl font-bold text-red-900">{formatCurrency(totalCredits)}</p>
                  </div>
                </div>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                      <span className="text-white text-sm">⚖️</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-blue-600">Net Balance</p>
                    <p className={`text-2xl font-bold ${
                      totalDebits - totalCredits > 0 ? 'text-red-900' :
                      totalDebits - totalCredits < 0 ? 'text-green-900' : 'text-gray-900'
                    }`}>
                      {totalDebits - totalCredits > 0 ?
                        `${formatCurrency(totalDebits - totalCredits)} Owed` :
                        totalDebits - totalCredits < 0 ?
                        `${formatCurrency(Math.abs(totalDebits - totalCredits))} Credit` :
                        '✓ Zero Balance'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Account Header */}
          <div className="bg-green-600 text-white p-4 text-center">
            <h3 className="text-xl font-bold">General Ledger - Student Accounts Receivable</h3>
          </div>

          {/* Student Active Information */}
          <div className="bg-gray-50 p-4 border-b border-gray-200">
            {selectedStudentId && !isStudentView ? (
              (() => {
                const selectedStudent = students.find(s => s.id === selectedStudentId);
                if (!selectedStudent) {
                  return (
                    <div className="text-center text-gray-500">
                      <p>Student information not available</p>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <div className="flex items-center space-x-4">
                        <div className="border border-gray-400 px-3 py-1">
                          <span className="font-medium">Student Name:</span>
                          <span className="ml-2">{selectedStudent.first_name} {selectedStudent.last_name}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4 mt-2">
                        <div className="border border-gray-400 px-3 py-1">
                          <span className="font-medium">Student ID:</span>
                          <span className="ml-2">{selectedStudent.student_id}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4 mt-2">
                        <div className="border border-gray-400 px-3 py-1">
                          <span className="font-medium">Program:</span>
                          <span className="ml-2">{selectedStudent.program}</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center space-x-4">
                        <div className="border border-gray-400 px-3 py-1">
                          <span className="font-medium">Year of Study:</span>
                          <span className="ml-2">Year {selectedStudent.year_of_study}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4 mt-2">
                        <div className="border border-gray-400 px-3 py-1">
                          <span className="font-medium">Status:</span>
                          <span className={`ml-2 px-2 py-1 rounded-full text-xs font-semibold ${
                            selectedStudent.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {selectedStudent.status.charAt(0).toUpperCase() + selectedStudent.status.slice(1)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4 mt-2">
                        <div className="border border-gray-400 px-3 py-1">
                          <span className="font-medium">Report Date:</span>
                          <span className="ml-2">{new Date().toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric'
                          })}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()
            ) : isStudentView && studentId ? (
              (() => {
                // For student view, show their own information
                const currentStudent = students.find(s => s.id === studentId);
                if (!currentStudent) {
                  return (
                    <div className="text-center text-gray-500">
                      <p>Loading your information...</p>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <div className="flex items-center space-x-4">
                        <div className="border border-gray-400 px-3 py-1">
                          <span className="font-medium">Your Name:</span>
                          <span className="ml-2">{currentStudent.first_name} {currentStudent.last_name}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4 mt-2">
                        <div className="border border-gray-400 px-3 py-1">
                          <span className="font-medium">Student ID:</span>
                          <span className="ml-2">{currentStudent.student_id}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4 mt-2">
                        <div className="border border-gray-400 px-3 py-1">
                          <span className="font-medium">Program:</span>
                          <span className="ml-2">{currentStudent.program}</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center space-x-4">
                        <div className="border border-gray-400 px-3 py-1">
                          <span className="font-medium">Year of Study:</span>
                          <span className="ml-2">Year {currentStudent.year_of_study}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4 mt-2">
                        <div className="border border-gray-400 px-3 py-1">
                          <span className="font-medium">Account Status:</span>
                          <span className={`ml-2 px-2 py-1 rounded-full text-xs font-semibold ${
                            currentStudent.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {currentStudent.status.charAt(0).toUpperCase() + currentStudent.status.slice(1)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4 mt-2">
                        <div className="border border-gray-400 px-3 py-1">
                          <span className="font-medium">Report Date:</span>
                          <span className="ml-2">{new Date().toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric'
                          })}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()
            ) : (
              // Default view for all students
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <div className="flex items-center space-x-4">
                    <div className="border border-gray-400 px-3 py-1">
                      <span className="font-medium">Ledger Type:</span>
                      <span className="ml-2">All Students Financial Records</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 mt-2">
                    <div className="border border-gray-400 px-3 py-1">
                      <span className="font-medium">Total Students:</span>
                      <span className="ml-2">{students.length} Active Students</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 mt-2">
                    <div className="border border-gray-400 px-3 py-1">
                      <span className="font-medium">Date Range:</span>
                      <span className="ml-2">{new Date(dateRange.from).toLocaleDateString('en-GB')} - {new Date(dateRange.to).toLocaleDateString('en-GB')}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center space-x-4">
                    <div className="border border-gray-400 px-3 py-1">
                      <span className="font-medium">Total Entries:</span>
                      <span className="ml-2">{ledgerEntries.length} Transactions</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 mt-2">
                    <div className="border border-gray-400 px-3 py-1">
                      <span className="font-medium">System Status:</span>
                      <span className="ml-2 px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                        Active & Operational
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 mt-2">
                    <div className="border border-gray-400 px-3 py-1">
                      <span className="font-medium">Report Date:</span>
                      <span className="ml-2">{new Date().toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric'
                      })}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Traditional Ledger Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse border border-gray-400">
              <thead className="bg-green-100">
                <tr>
                  <th className="border border-gray-400 px-4 py-3 text-center text-sm font-bold text-gray-900">
                    Date
                  </th>
                  <th className="border border-gray-400 px-4 py-3 text-center text-sm font-bold text-gray-900">
                    Description
                  </th>
                  <th className="border border-gray-400 px-4 py-3 text-center text-sm font-bold text-gray-900">
                    Journal Reference
                  </th>
                  <th className="border border-gray-400 px-4 py-3 text-center text-sm font-bold text-gray-900" colSpan={2}>
                    Transaction
                  </th>
                  <th className="border border-gray-400 px-4 py-3 text-center text-sm font-bold text-gray-900" colSpan={2}>
                    Balance
                  </th>
                  {!isStudentView && (
                    <th className="border border-gray-400 px-4 py-3 text-center text-sm font-bold text-gray-900">
                      Student
                    </th>
                  )}
                </tr>
                <tr>
                  <th className="border border-gray-400 px-4 py-2 text-center text-xs font-medium text-gray-700"></th>
                  <th className="border border-gray-400 px-4 py-2 text-center text-xs font-medium text-gray-700"></th>
                  <th className="border border-gray-400 px-4 py-2 text-center text-xs font-medium text-gray-700"></th>
                  <th className="border border-gray-400 px-4 py-2 text-center text-xs font-medium text-gray-700 bg-green-50">
                    Debit
                  </th>
                  <th className="border border-gray-400 px-4 py-2 text-center text-xs font-medium text-gray-700 bg-red-50">
                    Credit
                  </th>
                  <th className="border border-gray-400 px-4 py-2 text-center text-xs font-medium text-gray-700 bg-green-50">
                    Debit
                  </th>
                  <th className="border border-gray-400 px-4 py-2 text-center text-xs font-medium text-gray-700 bg-red-50">
                    Credit
                  </th>
                  {!isStudentView && (
                    <th className="border border-gray-400 px-4 py-2 text-center text-xs font-medium text-gray-700"></th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white">
                {ledgerEntries.length > 0 ? (
                  ledgerEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="border border-gray-400 px-4 py-3 text-sm text-gray-900 text-center">
                        {formatDate(entry.date)}
                      </td>
                      <td className="border border-gray-400 px-4 py-3 text-sm text-gray-900">
                        <div>
                          <p className="font-medium">{entry.description}</p>
                          {!isStudentView && entry.student_name && (
                            <p className="text-xs text-gray-600">Student: {entry.student_name} ({entry.student_id})</p>
                          )}
                        </div>
                      </td>
                      <td className="border border-gray-400 px-4 py-3 text-sm text-gray-900 text-center">
                        <div>
                          <p className="font-medium text-blue-600">{entry.transaction_number}</p>
                          {entry.reference_number && entry.reference_number !== entry.transaction_number && (
                            <p className="text-xs text-gray-500">{entry.reference_number}</p>
                          )}
                        </div>
                      </td>
                      {/* Transaction Debit */}
                      <td className="border border-gray-400 px-4 py-3 text-sm text-right font-medium bg-green-50">
                        {entry.debit_amount > 0 ? (
                          <span className="text-gray-900">{formatCurrency(entry.debit_amount)}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      {/* Transaction Credit */}
                      <td className="border border-gray-400 px-4 py-3 text-sm text-right font-medium bg-red-50">
                        {entry.credit_amount > 0 ? (
                          <span className="text-gray-900">{formatCurrency(entry.credit_amount)}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      {/* Balance Debit */}
                      <td className="border border-gray-400 px-4 py-3 text-sm text-right font-bold bg-green-50">
                        {entry.running_balance > 0 ? (
                          <span className="text-gray-900">{formatCurrency(entry.running_balance)}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      {/* Balance Credit */}
                      <td className="border border-gray-400 px-4 py-3 text-sm text-right font-bold bg-red-50">
                        {entry.running_balance < 0 ? (
                          <span className="text-gray-900">{formatCurrency(Math.abs(entry.running_balance))}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      {!isStudentView && (
                        <td className="border border-gray-400 px-4 py-3 text-sm text-gray-900">
                          {entry.student_name && (
                            <div className="text-center">
                              <p className="font-medium text-xs">{entry.student_name}</p>
                              <p className="text-xs text-gray-500">{entry.student_id}</p>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={isStudentView ? 7 : 8} className="border border-gray-400 px-6 py-12 text-center">
                      <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-2xl">📊</span>
                      </div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">No Ledger Entries</h4>
                      <p className="text-gray-600">No financial records or payments found for the selected criteria.</p>
                    </td>
                  </tr>
                )}

                {/* Total Row */}
                {ledgerEntries.length > 0 && (
                  <tr className="bg-green-100 font-bold">
                    <td className="border border-gray-400 px-4 py-3 text-sm text-gray-900 text-center"></td>
                    <td className="border border-gray-400 px-4 py-3 text-sm text-gray-900 text-center">
                      <span className="font-bold">Total</span>
                    </td>
                    <td className="border border-gray-400 px-4 py-3 text-sm text-gray-900 text-center"></td>
                    <td className="border border-gray-400 px-4 py-3 text-sm text-right font-bold bg-green-50">
                      {formatCurrency(totalDebits)}
                    </td>
                    <td className="border border-gray-400 px-4 py-3 text-sm text-right font-bold bg-red-50">
                      {formatCurrency(totalCredits)}
                    </td>
                    <td className="border border-gray-400 px-4 py-3 text-sm text-right font-bold bg-green-50">
                      {totalDebits - totalCredits > 0 ? formatCurrency(totalDebits - totalCredits) : '-'}
                    </td>
                    <td className="border border-gray-400 px-4 py-3 text-sm text-right font-bold bg-red-50">
                      {totalDebits - totalCredits < 0 ? formatCurrency(Math.abs(totalDebits - totalCredits)) : '-'}
                    </td>
                    {!isStudentView && (
                      <td className="border border-gray-400 px-4 py-3 text-sm text-gray-900"></td>
                    )}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Account Balances section completely removed from Double Entry Ledger */}
        </>
      )}
    </div>
  );
};

export default DoubleEntryLedger;
