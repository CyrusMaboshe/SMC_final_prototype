'use client';

import React, { useState, useEffect } from 'react';
import { accountantAPI } from '@/lib/supabase';

interface SemesterRegistrationManagerProps {
  accountantId: string;
}

interface SemesterPeriod {
  id: string;
  semester_name: string;
  academic_year: string;
  semester_number: number;
  start_date: string;
  end_date: string;
  registration_start_date: string;
  registration_end_date: string;
  is_active: boolean;
  is_registration_open: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
  accountants?: {
    full_name: string;
  };
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

const SemesterRegistrationManager: React.FC<SemesterRegistrationManagerProps> = ({ accountantId }) => {
  const [semesterPeriods, setSemesterPeriods] = useState<SemesterPeriod[]>([]);
  const [activeSemester, setActiveSemester] = useState<SemesterPeriod | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [semesterForm, setSemesterForm] = useState({
    semester_name: '',
    academic_year: '2024-2025',
    semester_number: 1,
    start_date: '',
    end_date: '',
    registration_start_date: '',
    registration_end_date: '',
    is_active: false,
    is_registration_open: false
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(''); // Clear previous errors

      // First, ensure tables exist
      console.log('🔧 Ensuring access control tables exist...');
      await accountantAPI.ensureTablesExist();

      const [semestersData, activeData, studentsData] = await Promise.all([
        accountantAPI.getAllSemesterPeriods().catch(err => {
          console.log('Semester periods not available:', err.message);
          return [];
        }),
        accountantAPI.getActiveSemester().catch(err => {
          console.log('Active semester not available:', err.message);
          return null;
        }),
        accountantAPI.getAllStudents().catch(err => {
          console.log('Students data not available:', err.message);
          return [];
        })
      ]);

      setSemesterPeriods(semestersData || []);
      setActiveSemester(activeData);
      setStudents(studentsData || []);

      console.log('✅ Data loaded successfully');
    } catch (error: any) {
      console.error('Error loading data:', error);
      setError('Failed to load data. Database setup may be required.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSemester = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      console.log('🚀 Starting semester creation process...');
      console.log('📝 Form data:', semesterForm);
      console.log('👤 Accountant ID:', accountantId);

      // Validate form data
      if (!semesterForm.semester_name || !semesterForm.academic_year || !semesterForm.start_date || !semesterForm.end_date) {
        throw new Error('Please fill in all required fields');
      }

      if (new Date(semesterForm.start_date) >= new Date(semesterForm.end_date)) {
        throw new Error('End date must be after start date');
      }

      console.log('✅ Form validation passed');

      const result = await accountantAPI.createSemesterPeriod(semesterForm, accountantId);

      console.log('✅ API call successful, result:', result);
      setSuccess('Semester period created successfully!');

      // Reset form
      setSemesterForm({
        semester_name: '',
        academic_year: '2024-2025',
        semester_number: 1,
        start_date: '',
        end_date: '',
        registration_start_date: '',
        registration_end_date: '',
        is_active: false,
        is_registration_open: false
      });
      setShowCreateForm(false);

      // Reload data
      console.log('🔄 Reloading data...');
      await loadData();

    } catch (error: any) {
      console.error('❌ Error in handleCreateSemester:', error);
      console.error('❌ Error type:', typeof error);
      console.error('❌ Error constructor:', error.constructor?.name);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);

      // Provide user-friendly error message
      let errorMessage = 'Failed to create semester period';

      if (error.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error.error) {
        errorMessage = error.error;
      } else {
        errorMessage = 'An unexpected error occurred. Please check the console for details.';
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const testDatabaseSetup = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      console.log('🧪 Testing database setup...');

      // Try the API approach first
      const response = await fetch('/api/setup-db', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ Database setup successful via API');
        setSuccess('✅ Database tables created successfully! You can now create semester periods.');
        await loadData();
      } else {
        console.error('❌ API setup failed:', result.error);

        // Try the direct method
        console.log('🔧 Trying direct table creation...');
        const directResult = await accountantAPI.ensureTablesExist();

        if (directResult) {
          setSuccess('✅ Database tables created successfully via direct method!');
          await loadData();
        } else {
          setError('❌ Failed to create database tables. Please check console for details.');
        }
      }
    } catch (error: any) {
      console.error('❌ Error in database setup test:', error);
      setError(`Database setup failed: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleActivateSemester = async (semesterId: string) => {
    try {
      setLoading(true);
      setError('');
      
      await accountantAPI.activateSemester(semesterId);
      setSuccess('Semester activated successfully!');
      
      await loadData();
    } catch (error: any) {
      setError(error.message || 'Failed to activate semester');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRegistration = async (semesterId: string, isOpen: boolean) => {
    try {
      setLoading(true);
      setError('');
      
      await accountantAPI.updateSemesterPeriod(semesterId, { 
        is_registration_open: isOpen 
      });
      setSuccess(`Registration ${isOpen ? 'opened' : 'closed'} successfully!`);
      
      await loadData();
    } catch (error: any) {
      setError(error.message || 'Failed to update registration status');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const isCurrentSemester = (semester: SemesterPeriod) => {
    const now = new Date();
    const start = new Date(semester.start_date);
    const end = new Date(semester.end_date);
    return now >= start && now <= end;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Semester Registration Management</h2>
        <div className="flex space-x-3">
          <button
            onClick={testDatabaseSetup}
            disabled={loading}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Setting up...' : '🔧 Setup Database'}
          </button>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            Create New Semester
          </button>
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

      {/* Active Semester Card */}
      {activeSemester && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-blue-900">Active Semester</h3>
              <p className="text-blue-800">
                {activeSemester.semester_name} - {activeSemester.academic_year}
              </p>
              <p className="text-sm text-blue-600">
                {formatDate(activeSemester.start_date)} - {formatDate(activeSemester.end_date)}
              </p>
            </div>
            <div className="text-right">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                activeSemester.is_registration_open 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                Registration {activeSemester.is_registration_open ? 'Open' : 'Closed'}
              </span>
              <div className="mt-2">
                <button
                  onClick={() => handleToggleRegistration(
                    activeSemester.id, 
                    !activeSemester.is_registration_open
                  )}
                  className={`px-3 py-1 rounded text-sm font-medium ${
                    activeSemester.is_registration_open
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {activeSemester.is_registration_open ? 'Close Registration' : 'Open Registration'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Semester Form Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Create Semester Period</h3>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="text-2xl">&times;</span>
                </button>
              </div>

              <form onSubmit={handleCreateSemester} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Semester Name
                    </label>
                    <input
                      type="text"
                      required
                      value={semesterForm.semester_name}
                      onChange={(e) => setSemesterForm(prev => ({ ...prev, semester_name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., Fall Semester 2024"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Academic Year
                    </label>
                    <input
                      type="text"
                      required
                      value={semesterForm.academic_year}
                      onChange={(e) => setSemesterForm(prev => ({ ...prev, academic_year: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="2024-2025"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Semester Number
                  </label>
                  <select
                    value={semesterForm.semester_number}
                    onChange={(e) => setSemesterForm(prev => ({ ...prev, semester_number: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={1}>Semester 1</option>
                    <option value={2}>Semester 2</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Semester Start Date
                    </label>
                    <input
                      type="date"
                      required
                      value={semesterForm.start_date}
                      onChange={(e) => setSemesterForm(prev => ({ ...prev, start_date: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Semester End Date
                    </label>
                    <input
                      type="date"
                      required
                      value={semesterForm.end_date}
                      onChange={(e) => setSemesterForm(prev => ({ ...prev, end_date: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Registration Start Date
                    </label>
                    <input
                      type="date"
                      required
                      value={semesterForm.registration_start_date}
                      onChange={(e) => setSemesterForm(prev => ({ ...prev, registration_start_date: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Registration End Date
                    </label>
                    <input
                      type="date"
                      required
                      value={semesterForm.registration_end_date}
                      onChange={(e) => setSemesterForm(prev => ({ ...prev, registration_end_date: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-6">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={semesterForm.is_active}
                      onChange={(e) => setSemesterForm(prev => ({ ...prev, is_active: e.target.checked }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Set as Active Semester</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={semesterForm.is_registration_open}
                      onChange={(e) => setSemesterForm(prev => ({ ...prev, is_registration_open: e.target.checked }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Open Registration</span>
                  </label>
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
                    {loading ? 'Creating...' : 'Create Semester'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Semester Periods Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">All Semester Periods</h3>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading semester periods...</p>
          </div>
        ) : semesterPeriods.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Semester
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Academic Year
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Period
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Registration Period
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {semesterPeriods.map((semester) => (
                  <tr key={semester.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {semester.semester_name}
                        </p>
                        <p className="text-sm text-gray-500">
                          Semester {semester.semester_number}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {semester.academic_year}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <p>{formatDate(semester.start_date)} - {formatDate(semester.end_date)}</p>
                        {isCurrentSemester(semester) && (
                          <p className="text-green-600 text-xs">📅 Current Period</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(semester.registration_start_date)} - {formatDate(semester.registration_end_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col space-y-1">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          semester.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {semester.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          semester.is_registration_open
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          Registration {semester.is_registration_open ? 'Open' : 'Closed'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex flex-col space-y-2">
                        {!semester.is_active && (
                          <button
                            onClick={() => handleActivateSemester(semester.id)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Activate
                          </button>
                        )}
                        {semester.is_active && (
                          <button
                            onClick={() => handleToggleRegistration(
                              semester.id,
                              !semester.is_registration_open
                            )}
                            className={`${
                              semester.is_registration_open
                                ? 'text-red-600 hover:text-red-900'
                                : 'text-green-600 hover:text-green-900'
                            }`}
                          >
                            {semester.is_registration_open ? 'Close Reg.' : 'Open Reg.'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">📅</span>
            </div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">No Semester Periods</h4>
            <p className="text-gray-600">
              No semester periods found. Create a new semester to get started.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SemesterRegistrationManager;
