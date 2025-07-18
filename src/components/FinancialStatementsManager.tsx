'use client';

import React, { useState, useEffect } from 'react';
import { accountantAPI } from '@/lib/supabase';
import { useAccountantRealTimeUpdates } from '@/hooks/useRealTimeUpdates';

interface FinancialStatementsManagerProps {
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
  student_id: string;
  student_name?: string;
  student_number?: string;
  academic_year: string;
  semester: number;
  tuition_fee: number;
  accommodation_fee: number;
  other_fees: number;
  total_amount: number;
  amount_paid: number;
  balance: number;
  payment_status: string;
  due_date: string;
  created_at: string;
}

const FinancialStatementsManager: React.FC<FinancialStatementsManagerProps> = ({ accountantId }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [financialRecords, setFinancialRecords] = useState<FinancialRecord[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [recordForm, setRecordForm] = useState({
    student_id: '',
    academic_year: '2024-2025',
    semester: 1,
    tuition_fee: 0,
    accommodation_fee: 0,
    other_fees: 0,
    due_date: ''
  });

  useEffect(() => {
    loadStudents();
    loadFinancialRecords();
  }, []);

  // Set up real-time updates
  useAccountantRealTimeUpdates(() => {
    console.log('Financial statements real-time update triggered');
    loadFinancialRecords();
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

  const loadFinancialRecords = async () => {
    try {
      setLoading(true);
      const data = await accountantAPI.getAllFinancialRecords();
      setFinancialRecords(data || []);
    } catch (error: any) {
      console.error('Error loading financial records:', error);
      setError('Failed to load financial records');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      await accountantAPI.createFinancialRecord(recordForm, accountantId);
      
      const student = students.find(s => s.id === recordForm.student_id);
      setSuccess(`Financial record created successfully for ${student?.first_name} ${student?.last_name}!`);
      
      // Reset form
      setRecordForm({
        student_id: '',
        academic_year: '2024-2025',
        semester: 1,
        tuition_fee: 0,
        accommodation_fee: 0,
        other_fees: 0,
        due_date: ''
      });
      setShowCreateForm(false);
      
      // Reload data
      await loadFinancialRecords();

    } catch (error: any) {
      setError(error.message || 'Failed to create financial record');
    } finally {
      setLoading(false);
    }
  };

  const handleStudentSelect = (student: Student) => {
    setSelectedStudent(student);
    setRecordForm(prev => ({ ...prev, student_id: student.id }));
  };

  const filteredStudents = students.filter(student =>
    student.student_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    `${student.first_name} ${student.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredRecords = selectedStudent 
    ? financialRecords.filter(record => record.student_id === selectedStudent.id)
    : financialRecords;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Financial Statements Management</h2>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
        >
          Create New Record
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

      {/* Create Financial Record Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Create Financial Record</h3>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="text-2xl">&times;</span>
                </button>
              </div>

              <form onSubmit={handleCreateRecord} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Student
                  </label>
                  <select
                    required
                    value={recordForm.student_id}
                    onChange={(e) => setRecordForm(prev => ({ ...prev, student_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                      Academic Year
                    </label>
                    <input
                      type="text"
                      required
                      value={recordForm.academic_year}
                      onChange={(e) => setRecordForm(prev => ({ ...prev, academic_year: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="2024-2025"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Semester
                    </label>
                    <select
                      value={recordForm.semester}
                      onChange={(e) => setRecordForm(prev => ({ ...prev, semester: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value={1}>Semester 1</option>
                      <option value={2}>Semester 2</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tuition Fee ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={recordForm.tuition_fee || ''}
                      onChange={(e) => setRecordForm(prev => ({ 
                        ...prev, 
                        tuition_fee: parseFloat(e.target.value) || 0 
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Accommodation Fee ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={recordForm.accommodation_fee || ''}
                      onChange={(e) => setRecordForm(prev => ({ 
                        ...prev, 
                        accommodation_fee: parseFloat(e.target.value) || 0 
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Other Fees ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={recordForm.other_fees || ''}
                      onChange={(e) => setRecordForm(prev => ({ 
                        ...prev, 
                        other_fees: parseFloat(e.target.value) || 0 
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    required
                    value={recordForm.due_date}
                    onChange={(e) => setRecordForm(prev => ({ ...prev, due_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Creating...' : 'Create Record'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Student Filter */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Filter by Student</h3>

        <div className="mb-4">
          <input
            type="text"
            placeholder="Search by student ID, name, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-48 overflow-y-auto">
          <button
            onClick={() => setSelectedStudent(null)}
            className={`p-3 rounded-lg border text-left transition-colors ${
              !selectedStudent
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <p className="font-medium text-gray-900">All Students</p>
            <p className="text-sm text-gray-600">Show all financial records</p>
          </button>

          {filteredStudents.map((student) => (
            <button
              key={student.id}
              onClick={() => handleStudentSelect(student)}
              className={`p-3 rounded-lg border text-left transition-colors ${
                selectedStudent?.id === student.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <p className="font-medium text-gray-900">
                {student.first_name} {student.last_name}
              </p>
              <p className="text-sm text-gray-600">ID: {student.student_id}</p>
              <p className="text-sm text-gray-600">{student.program}</p>
            </button>
          ))}
        </div>

        {selectedStudent && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Viewing Records For</h4>
            <p className="text-sm text-blue-800">
              <strong>{selectedStudent.first_name} {selectedStudent.last_name}</strong>
              <br />
              ID: {selectedStudent.student_id}
              <br />
              Program: {selectedStudent.program}
            </p>
          </div>
        )}
      </div>

      {/* Financial Records Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Financial Records {selectedStudent && `- ${selectedStudent.first_name} ${selectedStudent.last_name}`}
          </h3>
          <div className="text-sm text-gray-500">
            {filteredRecords.length} record(s) found
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading financial records...</p>
          </div>
        ) : filteredRecords.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Due Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {record.student_name || 'N/A'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {record.student_number || 'N/A'}
                        </p>
                      </div>
                    </td>
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
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(record.payment_status)}`}>
                        {record.payment_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(record.due_date).toLocaleDateString()}
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
            <p className="text-gray-600">
              {selectedStudent
                ? `No financial records found for ${selectedStudent.first_name} ${selectedStudent.last_name}.`
                : 'No financial records found. Create a new record to get started.'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FinancialStatementsManager;
