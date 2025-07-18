'use client';

import React, { useState, useEffect } from 'react';
import { adminAPI, ExamSlip } from '@/lib/supabase';
import { useAdminExamSlipUpdates } from '@/hooks/useExamSlipUpdates';

interface ExamSlipManagementProps {
  adminId: string;
}

interface Course {
  id: string;
  course_code: string;
  course_name: string;
}

const ExamSlipManagement: React.FC<ExamSlipManagementProps> = ({ adminId }) => {
  const [examSlips, setExamSlips] = useState<ExamSlip[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingSlip, setEditingSlip] = useState<ExamSlip | null>(null);

  // Use the admin exam slip updates hook
  useAdminExamSlipUpdates((notification) => {
    console.log('Admin received exam slip update:', notification);
    loadData(); // Reload data when changes occur
  });

  // Form state
  const [formData, setFormData] = useState({
    course_id: '',
    lecturer_name: '',
    exam_date: '',
    exam_time: '',
    venue: '',
    academic_year: new Date().getFullYear().toString() + '-' + (new Date().getFullYear() + 1).toString(),
    semester: 1
  });

  useEffect(() => {
    loadData();
  }, []);



  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Load exam slips and courses
      const [examSlipsData, coursesData] = await Promise.all([
        adminAPI.getAllExamSlips(),
        adminAPI.getAllCourses()
      ]);
      
      setExamSlips(examSlipsData || []);
      setCourses(coursesData || []);
    } catch (error: any) {
      console.error('Error loading data:', error);
      setError('Failed to load data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.course_id || !formData.lecturer_name || !formData.exam_date || 
        !formData.exam_time || !formData.venue) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setError('');
      setSuccess('');

      if (editingSlip) {
        // Update existing exam slip
        await adminAPI.updateExamSlip(editingSlip.id, {
          lecturer_name: formData.lecturer_name,
          exam_date: formData.exam_date,
          exam_time: formData.exam_time,
          venue: formData.venue,
          academic_year: formData.academic_year,
          semester: formData.semester
        });
        setSuccess('Exam slip updated successfully!');
      } else {
        // Create new exam slip
        await adminAPI.createExamSlip({
          ...formData,
          created_by: adminId
        });
        setSuccess('Exam slip created successfully!');
      }

      // Reset form and reload data
      resetForm();
      loadData();
    } catch (error: any) {
      console.error('Error saving exam slip:', error);
      setError('Failed to save exam slip: ' + error.message);
    }
  };

  const handleEdit = (slip: ExamSlip) => {
    setEditingSlip(slip);
    setFormData({
      course_id: slip.course_id,
      lecturer_name: slip.lecturer_name,
      exam_date: slip.exam_date.split('T')[0], // Format for date input
      exam_time: slip.exam_time,
      venue: slip.venue,
      academic_year: slip.academic_year,
      semester: slip.semester
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (slipId: string) => {
    if (!confirm('Are you sure you want to delete this exam slip?')) return;

    try {
      setError('');
      await adminAPI.deleteExamSlip(slipId);
      setSuccess('Exam slip deleted successfully!');
      loadData();
    } catch (error: any) {
      console.error('Error deleting exam slip:', error);
      setError('Failed to delete exam slip: ' + error.message);
    }
  };

  const handleToggleStatus = async (slipId: string, currentStatus: boolean) => {
    try {
      setError('');
      await adminAPI.toggleExamSlipStatus(slipId, !currentStatus);
      setSuccess(`Exam slip ${!currentStatus ? 'activated' : 'deactivated'} successfully!`);
      loadData();
    } catch (error: any) {
      console.error('Error toggling exam slip status:', error);
      setError('Failed to update exam slip status: ' + error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      course_id: '',
      lecturer_name: '',
      exam_date: '',
      exam_time: '',
      venue: '',
      academic_year: new Date().getFullYear().toString() + '-' + (new Date().getFullYear() + 1).toString(),
      semester: 1
    });
    setEditingSlip(null);
    setShowCreateForm(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading exam slips...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">📋 Exam Slip Management</h1>
            <p className="mt-2 text-gray-600">Create and manage exam slips with lecturer, date, time, and venue information</p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            ➕ Create Exam Slip
          </button>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Create/Edit Form */}
      {showCreateForm && (
        <div className="mb-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {editingSlip ? 'Edit Exam Slip' : 'Create New Exam Slip'}
            </h2>
            <button
              onClick={resetForm}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Course Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Course <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.course_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, course_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select a course</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.course_code} - {course.course_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Lecturer Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lecturer Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.lecturer_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, lecturer_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter lecturer name"
                  required
                />
              </div>

              {/* Exam Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Exam Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.exam_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, exam_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              {/* Exam Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Exam Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={formData.exam_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, exam_time: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Venue */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Venue <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.venue}
                  onChange={(e) => setFormData(prev => ({ ...prev, venue: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter exam venue"
                  required
                />
              </div>

              {/* Academic Year */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Academic Year <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.academic_year}
                  onChange={(e) => setFormData(prev => ({ ...prev, academic_year: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., 2024-2025"
                  required
                />
              </div>

              {/* Semester */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Semester <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.semester}
                  onChange={(e) => setFormData(prev => ({ ...prev, semester: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value={1}>Semester 1</option>
                  <option value={2}>Semester 2</option>
                  <option value={3}>Semester 3</option>
                </select>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {editingSlip ? 'Update Exam Slip' : 'Create Exam Slip'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Exam Slips Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Exam Slips</h2>
          <p className="text-sm text-gray-600 mt-1">
            {examSlips.length} exam slip{examSlips.length !== 1 ? 's' : ''} total
          </p>
        </div>

        {examSlips.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-gray-400 text-6xl mb-4">📋</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No exam slips found</h3>
            <p className="text-gray-600 mb-4">Create your first exam slip to get started.</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Exam Slip
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Course
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lecturer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Venue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Academic Year
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {examSlips.map((slip) => (
                  <tr key={slip.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {slip.courses?.course_code}
                        </div>
                        <div className="text-sm text-gray-500">
                          {slip.courses?.course_name}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{slip.lecturer_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatDate(slip.exam_date)}</div>
                      <div className="text-sm text-gray-500">{formatTime(slip.exam_time)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{slip.venue}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{slip.academic_year}</div>
                      <div className="text-sm text-gray-500">Semester {slip.semester}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        slip.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {slip.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleEdit(slip)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Edit exam slip"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleToggleStatus(slip.id, slip.is_active)}
                          className={`${slip.is_active ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}`}
                          title={slip.is_active ? 'Deactivate exam slip' : 'Activate exam slip'}
                        >
                          {slip.is_active ? '🔴' : '🟢'}
                        </button>
                        <button
                          onClick={() => handleDelete(slip.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete exam slip"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExamSlipManagement;
