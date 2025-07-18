'use client';

import React, { useState, useEffect } from 'react';
import { accountantAPI, studentAPI } from '@/lib/supabase';
import { useAccountantRealTimeUpdates } from '@/hooks/useRealTimeUpdates';

interface PaymentRecordingProps {
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

interface FinancialRecord {
  id: string;
  academic_year: string;
  semester: number;
  total_amount: number;
  amount_paid: number;
  balance: number;
  payment_status: string;
  due_date: string;
}

const PaymentRecording: React.FC<PaymentRecordingProps> = ({ accountantId }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentFinancials, setStudentFinancials] = useState<FinancialRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [recentPayments, setRecentPayments] = useState<any[]>([]);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [addingStudent, setAddingStudent] = useState(false);
  const [activeTab, setActiveTab] = useState<'search' | 'browse'>('search');

  const [paymentForm, setPaymentForm] = useState({
    student_id: '',
    amount: 0,
    payment_method: 'cash',
    reference_number: '',
    payment_date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const [newStudentForm, setNewStudentForm] = useState({
    student_id: '',
    password: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    program: '',
    year_of_study: 1,
    semester: 1
  });

  useEffect(() => {
    loadStudents();
    loadRecentPayments();
  }, []);

  // Set up real-time updates
  useAccountantRealTimeUpdates(() => {
    console.log('Payment recording real-time update triggered');
    loadRecentPayments();
    if (selectedStudent) {
      loadStudentFinancials(selectedStudent.id);
    }
  });

  const loadStudents = async () => {
    try {
      const data = await accountantAPI.getAllStudents();
      setStudents(data || []);
    } catch (error: any) {
      console.error('Error loading students:', error);
      setError('Failed to load students');
    }
  };

  const loadRecentPayments = async () => {
    try {
      const data = await accountantAPI.getAllPayments();
      setRecentPayments(data?.slice(0, 10) || []);
    } catch (error: any) {
      console.error('Error loading recent payments:', error);
    }
  };

  const loadStudentFinancials = async (studentId: string) => {
    try {
      const data = await accountantAPI.getStudentFinancialRecords(studentId);
      setStudentFinancials(data || []);
    } catch (error: any) {
      console.error('Error loading student financials:', error);
    }
  };

  const handleStudentSelect = async (student: Student) => {
    setSelectedStudent(student);
    setPaymentForm(prev => ({ ...prev, student_id: student.id }));
    await loadStudentFinancials(student.id);
  };

  const handleAddNewStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setAddingStudent(true);
      setError('');
      setSuccess('');

      // Import adminAPI for creating students
      const { adminAPI } = await import('@/lib/supabase');

      await adminAPI.createStudent(newStudentForm);

      setSuccess(`Student ${newStudentForm.first_name} ${newStudentForm.last_name} added successfully!`);

      // Reset form
      setNewStudentForm({
        student_id: '',
        password: '',
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        program: '',
        year_of_study: 1,
        semester: 1
      });

      setShowAddStudent(false);

      // Reload students list
      await loadStudents();

    } catch (error: any) {
      setError(error.message || 'Failed to add student');
    } finally {
      setAddingStudent(false);
    }
  };

  const handleShowAddStudent = () => {
    // Pre-fill form with search term if it looks like a name
    if (searchTerm && searchTerm.includes(' ')) {
      const nameParts = searchTerm.trim().split(' ');
      setNewStudentForm(prev => ({
        ...prev,
        first_name: nameParts[0] || '',
        last_name: nameParts.slice(1).join(' ') || ''
      }));
    } else if (searchTerm && !searchTerm.includes('@') && !searchTerm.startsWith('SMC')) {
      // If it's a single word and not an email or student ID, put it as first name
      setNewStudentForm(prev => ({
        ...prev,
        first_name: searchTerm
      }));
    }
    setShowAddStudent(true);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) {
      setError('Please select a student first');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      await accountantAPI.recordPayment({
        ...paymentForm,
        processed_by: accountantId
      }, accountantId);

      setSuccess(`Payment of $${paymentForm.amount} recorded successfully for ${selectedStudent.first_name} ${selectedStudent.last_name}!`);
      
      // Reset form
      setPaymentForm({
        student_id: selectedStudent.id,
        amount: 0,
        payment_method: 'cash',
        reference_number: '',
        payment_date: new Date().toISOString().split('T')[0],
        notes: ''
      });

      // Reload data
      await loadStudentFinancials(selectedStudent.id);
      await loadRecentPayments();

    } catch (error: any) {
      setError(error.message || 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(student =>
    student.student_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    `${student.first_name} ${student.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Record Payments</h2>
        <div className="text-sm text-gray-500">
          Real-time payment recording with instant student updates
        </div>
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

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-green-400">✅</span>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-800">{success}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Student Search and Selection */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Select Student</h3>
            <button
              onClick={handleShowAddStudent}
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors"
            >
              + Add New Student
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex space-x-1 mb-4 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('search')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'search'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🔍 Search Students
            </button>
            <button
              onClick={() => setActiveTab('browse')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'browse'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📋 Browse All
            </button>
          </div>

          {/* Search Tab Content */}
          {activeTab === 'search' && (
            <div>
              <div className="mb-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Type student ID, name, or email to search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                    autoFocus
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <span className="text-xl">×</span>
                    </button>
                  )}
                </div>

                {searchTerm && (
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                      Found {filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''} matching "{searchTerm}"
                    </p>
                    {filteredStudents.length > 0 && (
                      <p className="text-xs text-blue-600">
                        Click on a student to select
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Search Results */}
              {searchTerm ? (
                filteredStudents.length > 0 ? (
                  <div className="max-h-80 overflow-y-auto space-y-2">
                    {filteredStudents.map((student) => (
                      <div
                        key={student.id}
                        onClick={() => handleStudentSelect(student)}
                        className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                          selectedStudent?.id === student.id
                            ? 'border-blue-500 bg-blue-50 shadow-md'
                            : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900 text-lg">
                              {student.first_name} {student.last_name}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                              <span className="font-medium">ID:</span> {student.student_id}
                            </p>
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Program:</span> {student.program}
                            </p>
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Year:</span> {student.year_of_study},
                              <span className="ml-1">Semester:</span> {student.semester}
                            </p>
                            {student.email && (
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Email:</span> {student.email}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col items-end space-y-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              student.status === 'active'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {student.status}
                            </span>
                            {selectedStudent?.id === student.id && (
                              <span className="text-blue-600 text-xs font-medium">
                                ✓ Selected
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl">🔍</span>
                    </div>
                    <p className="text-lg font-medium mb-2">No students found</p>
                    <p className="mb-4">No students match "{searchTerm}"</p>
                    <button
                      onClick={handleShowAddStudent}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      Add "{searchTerm}" as new student
                    </button>
                  </div>
                )
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">🔍</span>
                  </div>
                  <p className="text-lg font-medium mb-2">Search for Students</p>
                  <p className="text-sm">Start typing to search by student ID, name, or email</p>
                </div>
              )}
            </div>
          )}

          {/* Browse Tab Content */}
          {activeTab === 'browse' && (
            <div>
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-3">
                  Showing all {students.length} students in the system
                </p>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Filter students..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <span className="text-lg">×</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="max-h-80 overflow-y-auto space-y-2">
                {(searchTerm ? filteredStudents : students).map((student) => (
                  <div
                    key={student.id}
                    onClick={() => handleStudentSelect(student)}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedStudent?.id === student.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">
                          {student.first_name} {student.last_name}
                        </p>
                        <p className="text-sm text-gray-600">ID: {student.student_id}</p>
                        <p className="text-sm text-gray-600">{student.program}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        student.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {student.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedStudent && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Selected Student</h4>
              <p className="text-sm text-blue-800">
                <strong>{selectedStudent.first_name} {selectedStudent.last_name}</strong>
                <br />
                ID: {selectedStudent.student_id}
                <br />
                Program: {selectedStudent.program}
                <br />
                Year {selectedStudent.year_of_study}, Semester {selectedStudent.semester}
              </p>
            </div>
          )}
        </div>

        {/* Payment Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Details</h3>
          
          <form onSubmit={handleRecordPayment} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Amount ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={paymentForm.amount || ''}
                onChange={(e) => setPaymentForm(prev => ({ 
                  ...prev, 
                  amount: parseFloat(e.target.value) || 0 
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Method
              </label>
              <select
                value={paymentForm.payment_method}
                onChange={(e) => setPaymentForm(prev => ({ 
                  ...prev, 
                  payment_method: e.target.value 
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="mobile_money">Mobile Money</option>
                <option value="cheque">Cheque</option>
                <option value="card">Card</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reference Number
              </label>
              <input
                type="text"
                value={paymentForm.reference_number}
                onChange={(e) => setPaymentForm(prev => ({ 
                  ...prev, 
                  reference_number: e.target.value 
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Optional reference number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Date
              </label>
              <input
                type="date"
                required
                value={paymentForm.payment_date}
                onChange={(e) => setPaymentForm(prev => ({ 
                  ...prev, 
                  payment_date: e.target.value 
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                rows={3}
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm(prev => ({ 
                  ...prev, 
                  notes: e.target.value 
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Optional payment notes"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !selectedStudent}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Recording Payment...' : 'Record Payment'}
            </button>
          </form>
        </div>
      </div>

      {/* Student Financial Overview */}
      {selectedStudent && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Financial Overview - {selectedStudent.first_name} {selectedStudent.last_name}
          </h3>

          {studentFinancials.length > 0 ? (
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount Paid
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Balance
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {studentFinancials.map((record) => (
                    <tr key={record.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.academic_year}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.semester}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(record.total_amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(record.amount_paid)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(record.balance)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          record.payment_status === 'paid'
                            ? 'bg-green-100 text-green-800'
                            : record.payment_status === 'partial'
                            ? 'bg-yellow-100 text-yellow-800'
                            : record.payment_status === 'overdue'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {record.payment_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📊</span>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">No Financial Records</h4>
              <p className="text-gray-600">No financial records found for this student.</p>
            </div>
          )}
        </div>
      )}

      {/* Recent Payments */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Payments</h3>

        {recentPayments.length > 0 ? (
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
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Method
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reference
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentPayments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(payment.payment_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payment.student_name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(payment.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payment.payment_method}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payment.reference_number || 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">💳</span>
            </div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">No Recent Payments</h4>
            <p className="text-gray-600">Recent payment transactions will appear here.</p>
          </div>
        )}
      </div>

      {/* Add New Student Modal */}
      {showAddStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Add New Student</h3>
                <button
                  onClick={() => setShowAddStudent(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="text-xl">×</span>
                </button>
              </div>

              <form onSubmit={handleAddNewStudent} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Student ID *
                    </label>
                    <input
                      type="text"
                      required
                      value={newStudentForm.student_id}
                      onChange={(e) => setNewStudentForm(prev => ({ ...prev, student_id: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="SMC2025001"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password *
                    </label>
                    <input
                      type="password"
                      required
                      value={newStudentForm.password}
                      onChange={(e) => setNewStudentForm(prev => ({ ...prev, password: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={newStudentForm.first_name}
                      onChange={(e) => setNewStudentForm(prev => ({ ...prev, first_name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={newStudentForm.last_name}
                      onChange={(e) => setNewStudentForm(prev => ({ ...prev, last_name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={newStudentForm.email}
                    onChange={(e) => setNewStudentForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={newStudentForm.phone}
                    onChange={(e) => setNewStudentForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Program *
                  </label>
                  <select
                    required
                    value={newStudentForm.program}
                    onChange={(e) => setNewStudentForm(prev => ({ ...prev, program: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Program</option>
                    <option value="Nursing">Nursing</option>
                    <option value="Midwifery">Midwifery</option>
                    <option value="Clinical Medicine">Clinical Medicine</option>
                    <option value="Public Health">Public Health</option>
                    <option value="Medical Laboratory Sciences">Medical Laboratory Sciences</option>
                    <option value="Pharmacy">Pharmacy</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Year of Study
                    </label>
                    <select
                      value={newStudentForm.year_of_study}
                      onChange={(e) => setNewStudentForm(prev => ({ ...prev, year_of_study: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value={1}>Year 1</option>
                      <option value={2}>Year 2</option>
                      <option value={3}>Year 3</option>
                      <option value={4}>Year 4</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Semester
                    </label>
                    <select
                      value={newStudentForm.semester}
                      onChange={(e) => setNewStudentForm(prev => ({ ...prev, semester: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value={1}>Semester 1</option>
                      <option value={2}>Semester 2</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddStudent(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addingStudent}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
                  >
                    {addingStudent ? 'Adding...' : 'Add Student'}
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

export default PaymentRecording;
