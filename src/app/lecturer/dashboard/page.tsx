'use client';

import React, { useState, useEffect, lazy } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, LecturerProfile, supabase, lecturerAPI, adminAPI } from '@/lib/supabase';
import { useRealTimeUpdates } from '@/hooks/useRealTimeUpdates';
import LazyComponentWrapper, { TableSkeleton, CardSkeleton, FormSkeleton } from '@/components/LazyComponentWrapper';

// Lazy load heavy components
const QuizManager = lazy(() => import('@/components/QuizManager'));
const QuizResultsAnalytics = lazy(() => import('@/components/QuizResultsAnalytics'));
const AssignmentManager = lazy(() => import('@/components/AssignmentManager'));
const EnhancedQuizDashboard = lazy(() => import('@/components/EnhancedQuizDashboard'));

// CA Results Manager Component
const CAResultsManager = ({ profile, courses }: { profile: any, courses: any[] }) => {
  const [caResults, setCAResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [courseStudents, setCourseStudents] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    assessment_name: '',
    score: '',
    max_score: '100',
    assessment_date: new Date().toISOString().split('T')[0],
    semester: 1,
    academic_year: '2024-2025'
  });
  // Removed editingResult state - lecturers can only add new results
  const [selectedSemester, setSelectedSemester] = useState(1);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('2024-2025');



  useEffect(() => {
    if (profile?.id) {
      loadCAResults();
    }
  }, [profile, selectedSemester, selectedAcademicYear]);

  useEffect(() => {
    if (selectedCourse) {
      loadCourseStudents();
    }
  }, [selectedCourse]);

  const loadCAResults = async () => {
    try {
      setLoading(true);
      const results = await lecturerAPI.getCAResults(profile.id, undefined, selectedAcademicYear, selectedSemester);
      setCAResults(results);
    } catch (error) {
      console.error('Error loading CA results:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCourseStudents = async () => {
    try {
      const students = await lecturerAPI.getCourseStudents(selectedCourse);
      setCourseStudents(students);
    } catch (error) {
      console.error('Error loading course students:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log('CA Form submission started');

    if (!profile?.id) {
      alert('Error: Lecturer profile not loaded. Please refresh the page and try again.');
      return;
    }

    // Comprehensive validation
    const validationErrors = [];

    if (!selectedCourse) validationErrors.push('Course not selected');
    if (!selectedStudent) validationErrors.push('Student not selected');
    if (!formData.assessment_name.trim()) validationErrors.push('Assessment name is required');
    if (!formData.score.trim()) validationErrors.push('Score is required');
    if (!formData.max_score.trim()) validationErrors.push('Max score is required');
    if (!formData.assessment_date) validationErrors.push('Assessment date is required');

    if (validationErrors.length > 0) {
      alert('Validation errors:\n' + validationErrors.join('\n'));
      return;
    }

    try {
      const score = parseFloat(formData.score);
      const maxScore = parseFloat(formData.max_score);

      if (isNaN(score) || isNaN(maxScore)) {
        alert('Please enter valid numeric scores');
        return;
      }

      if (score > maxScore) {
        alert('Score cannot be greater than maximum score');
        return;
      }

      if (score < 0 || maxScore <= 0) {
        alert('Please enter valid positive scores');
        return;
      }

      // Only allow creating new results, not editing existing ones
      const caResultData = {
        student_id: selectedStudent,
        course_id: selectedCourse,
        assessment_name: formData.assessment_name.trim(),
        score: score,
        max_score: maxScore,
        assessment_date: formData.assessment_date,
        semester: formData.semester,
        academic_year: formData.academic_year,
        created_by: profile.id
      };
      await lecturerAPI.createCAResult(caResultData);

      // Reset form
      setFormData({
        assessment_name: '',
        score: '',
        max_score: '100',
        assessment_date: new Date().toISOString().split('T')[0],
        semester: 1,
        academic_year: '2024-2025'
      });
      setSelectedCourse('');
      setSelectedStudent('');
      setShowAddForm(false);

      // Reload results
      await loadCAResults();

      alert('CA result added successfully!');
    } catch (error) {
      console.error('Error saving CA result:', error);
      alert(`Error saving CA result: ${error.message || 'Please try again.'}`);
    }
  };

  // Edit and delete functionality removed for security
  // Lecturers can only add new results, not modify existing ones

  const getStatusBadge = (percentage: number) => {
    if (percentage >= 50) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          Pass
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          Repeat
        </span>
      );
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Manage CA Results</h2>
          <p className="text-sm text-gray-600 mt-1">Academic Year: {selectedAcademicYear} | Semester {selectedSemester}</p>
        </div>
        <button
          onClick={() => {
            setShowAddForm(true);
            setFormData({
              assessment_name: '',
              score: '',
              max_score: '100',
              assessment_date: new Date().toISOString().split('T')[0],
              semester: 1,
              academic_year: '2024-2025'
            });
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          Add CA Result
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Academic Year
            </label>
            <select
              value={selectedAcademicYear}
              onChange={(e) => setSelectedAcademicYear(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="2024-2025">2024-2025</option>
              <option value="2025-2026">2025-2026</option>
              <option value="2026-2027">2026-2027</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Semester
            </label>
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={1}>Semester 1</option>
              <option value={2}>Semester 2</option>
            </select>
          </div>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingResult ? 'Edit CA Result' : 'Add New CA Result'}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Course Name *
                </label>
                <select
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select Course</option>
                  {courses && courses.length > 0 ? (
                    courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.course_code} - {course.course_name}
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>No courses available</option>
                  )}
                </select>
                {/* Debug info */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="text-xs text-gray-500 mt-1">
                    Debug: {courses?.length || 0} courses loaded
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Student *
                </label>
                <select
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                  disabled={!selectedCourse}
                >
                  <option value="">Select Student</option>
                  {courseStudents.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.student_id} - {student.first_name} {student.last_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Academic Year *
                </label>
                <select
                  value={formData.academic_year}
                  onChange={(e) => setFormData(prev => ({ ...prev, academic_year: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="2024-2025">2024-2025</option>
                  <option value="2025-2026">2025-2026</option>
                  <option value="2026-2027">2026-2027</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Semester *
                </label>
                <select
                  value={formData.semester}
                  onChange={(e) => setFormData(prev => ({ ...prev, semester: parseInt(e.target.value) }))}
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
                  Assessment Name *
                </label>
                <input
                  type="text"
                  value={formData.assessment_name}
                  onChange={(e) => setFormData({ ...formData, assessment_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Quiz 1, Assignment 1"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Score *
                </label>
                <input
                  type="number"
                  value={formData.score}
                  onChange={(e) => setFormData({ ...formData, score: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                  step="0.1"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Score *
                </label>
                <input
                  type="number"
                  value={formData.max_score}
                  onChange={(e) => setFormData({ ...formData, max_score: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="1"
                  step="0.1"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assessment Date *
              </label>
              <input
                type="date"
                value={formData.assessment_date}
                onChange={(e) => setFormData({ ...formData, assessment_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingResult(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {editingResult ? 'Update Result' : 'Add Result'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Results Table */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-2">Loading CA results...</p>
        </div>
      ) : caResults.length > 0 ? (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Course
                  </th>
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
                    Assessment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Percentage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {caResults.map((result) => (
                  <tr key={result.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {result.courses?.course_code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {result.students?.student_id} - {result.students?.first_name} {result.students?.last_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {result.academic_year || '2024-2025'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Semester {result.semester || 1}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {result.assessment_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {result.score}/{result.max_score}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {result.percentage?.toFixed(1)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(result.percentage)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(result.assessment_date).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">📈</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No CA Results</h3>
          <p className="text-gray-600">Start by adding your first Continuous Assessment result.</p>
        </div>
      )}
    </div>
  );
};

// Final Results Manager Component
const FinalResultsManager = ({ profile, courses }: { profile: any, courses: any[] }) => {
  const [finalResults, setFinalResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [courseStudents, setCourseStudents] = useState<any[]>([]);
  const [showResultsTable, setShowResultsTable] = useState(false);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('2024-2025');
  const [selectedSemester, setSelectedSemester] = useState(1);
  const [formData, setFormData] = useState({
    academic_year: '2024-2025',
    semester: 1,
    final_score: '',
    final_grade: '',
    gpa_points: '',
    status: '',
    comments: ''
  });
  // Removed editingResult state - lecturers can only add new results

  useEffect(() => {
    if (profile?.id) {
      loadFinalResults();
    }
  }, [profile, selectedAcademicYear, selectedSemester]);

  useEffect(() => {
    if (selectedCourse) {
      loadCourseStudents();
    }
  }, [selectedCourse]);

  const loadFinalResults = async () => {
    try {
      setLoading(true);
      const results = await lecturerAPI.getFinalResults(profile.id, selectedAcademicYear, selectedSemester);
      setFinalResults(results);
    } catch (error) {
      console.error('Error loading final results:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCourseStudents = async () => {
    try {
      const students = await lecturerAPI.getCourseStudents(selectedCourse);
      setCourseStudents(students);
    } catch (error) {
      console.error('Error loading course students:', error);
    }
  };

  const calculateGradeAndGPA = (score: number) => {
    if (score >= 80) return { grade: 'A', gpa: 4.0, status: 'Pass' };
    if (score >= 70) return { grade: 'B', gpa: 3.0, status: 'Pass' };
    if (score >= 60) return { grade: 'C', gpa: 2.0, status: 'Pass' };
    if (score >= 50) return { grade: 'D', gpa: 1.0, status: 'Pass' };
    return { grade: 'F', gpa: 0.0, status: 'Repeat' };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log('Form validation check:', {
      selectedCourse,
      selectedStudent,
      finalScore: formData.final_score,
      academicYear: formData.academic_year,
      semester: formData.semester
    });

    // Comprehensive validation
    const validationErrors = [];

    if (!profile?.id) validationErrors.push('Lecturer profile not loaded');
    if (!selectedCourse) validationErrors.push('Course not selected');
    if (!selectedStudent) validationErrors.push('Student not selected');
    if (!formData.final_score.trim()) validationErrors.push('Final score is required');
    if (!formData.academic_year) validationErrors.push('Academic year is required');
    if (!formData.semester) validationErrors.push('Semester is required');

    if (validationErrors.length > 0) {
      alert('Validation errors:\n' + validationErrors.join('\n'));
      return;
    }

    try {
      const score = parseFloat(formData.final_score);

      // Validate score
      if (isNaN(score)) {
        alert('Please enter a valid numeric score');
        return;
      }

      if (score < 0 || score > 100) {
        alert('Score must be between 0 and 100');
        return;
      }

      const { grade, gpa, status } = calculateGradeAndGPA(score);

      console.log('Final result form data:', {
        selectedStudent,
        selectedCourse,
        formData,
        score,
        grade,
        gpa,
        status,
        profileId: profile.id
      });

      // Only allow creating new results, not editing existing ones
      console.log('Creating new final result');
      const resultData = {
        student_id: selectedStudent,
        course_id: selectedCourse,
        academic_year: formData.academic_year,
        semester: formData.semester,
        final_score: score,
        final_grade: formData.final_grade || grade,
        gpa_points: parseFloat(formData.gpa_points) || gpa,
        status: formData.status || status,
        submitted_by: profile.id,
        comments: formData.comments
      };
      console.log('Final result data to be created:', resultData);
      await lecturerAPI.createFinalResult(resultData);

      // Reset form
      setFormData({
        academic_year: '2024-2025',
        semester: 1,
        final_score: '',
        final_grade: '',
        gpa_points: '',
        status: '',
        comments: ''
      });
      setSelectedCourse('');
      setSelectedStudent('');
      setShowAddForm(false);
      // Reload results
      await loadFinalResults();

      alert('Final result added successfully!');
    } catch (error) {
      console.error('Error saving final result:', error);
      console.error('Error details:', error.message);
      console.error('Full error object:', JSON.stringify(error, null, 2));

      let errorMessage = 'Please try again.';
      if (error.message) {
        errorMessage = error.message;
      } else if (error.error) {
        errorMessage = error.error.message || error.error;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      alert(`Error saving final result: ${errorMessage}`);
    }
  };

  // Edit and delete functionality removed for security
  // Lecturers can only add new results, not modify existing ones

  const getStatusBadge = (status: string) => {
    if (status === 'Pass') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          Pass
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          Repeat
        </span>
      );
    }
  };

  const generateResultsTable = () => {
    // Group results by student
    const studentResults = finalResults.reduce((acc: any, result: any) => {
      const studentId = result.student_id;
      if (!acc[studentId]) {
        acc[studentId] = {
          student: result.students,
          courses: []
        };
      }
      acc[studentId].courses.push(result);
      return acc;
    }, {});

    return Object.values(studentResults);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Manage Final Exam Results</h2>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowResultsTable(!showResultsTable)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            {showResultsTable ? 'Hide Results Table' : 'View Results Table'}
          </button>
          <button
            onClick={() => {
              setShowAddForm(true);
              setFormData({
                academic_year: '2024-2025',
                semester: 1,
                final_score: '',
                final_grade: '',
                gpa_points: '',
                status: '',
                comments: ''
              });
            }}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Add Final Result
          </button>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Academic Year
            </label>
            <select
              value={selectedAcademicYear}
              onChange={(e) => setSelectedAcademicYear(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="2024-2025">2024-2025</option>
              <option value="2023-2024">2023-2024</option>
              <option value="2022-2023">2022-2023</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Semester
            </label>
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={1}>Semester 1</option>
              <option value={2}>Semester 2</option>
            </select>
          </div>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Add New Final Result
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Course Name *
                </label>
                <select
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select Course</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.course_code} - {course.course_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Student *
                </label>
                <select
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                  disabled={!selectedCourse}
                >
                  <option value="">Select Student</option>
                  {courseStudents.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.student_id} - {student.first_name} {student.last_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Academic Year *
                </label>
                <select
                  value={formData.academic_year}
                  onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="2024-2025">2024-2025</option>
                  <option value="2023-2024">2023-2024</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Semester *
                </label>
                <select
                  value={formData.semester}
                  onChange={(e) => setFormData({ ...formData, semester: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value={1}>Semester 1</option>
                  <option value={2}>Semester 2</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Final Score (%) *
                </label>
                <input
                  type="number"
                  value={formData.final_score}
                  onChange={(e) => {
                    const score = parseFloat(e.target.value);
                    const { grade, gpa, status } = calculateGradeAndGPA(score);
                    setFormData({
                      ...formData,
                      final_score: e.target.value,
                      final_grade: grade,
                      gpa_points: gpa.toString(),
                      status: status
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                  max="100"
                  step="0.1"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Grade
                </label>
                <input
                  type="text"
                  value={formData.final_grade}
                  onChange={(e) => setFormData({ ...formData, final_grade: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Auto-calculated"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  GPA Points
                </label>
                <input
                  type="number"
                  value={formData.gpa_points}
                  onChange={(e) => setFormData({ ...formData, gpa_points: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                  max="4"
                  step="0.1"
                  placeholder="Auto-calculated"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Auto-calculated</option>
                  <option value="Pass">Pass</option>
                  <option value="Repeat">Repeat</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Comments
              </label>
              <textarea
                value={formData.comments}
                onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                placeholder="Optional comments about the result"
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Add Result
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Results Table */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
          <p className="text-gray-600 mt-2">Loading final results...</p>
        </div>
      ) : finalResults.length > 0 ? (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Course
                  </th>
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
                    Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Grade
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    GPA
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {finalResults.map((result) => (
                  <tr key={result.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {result.courses?.course_code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {result.students?.student_id} - {result.students?.first_name} {result.students?.last_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {result.academic_year}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {result.semester}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {result.final_score}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {result.final_grade}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {result.gpa_points}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(result.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">📋</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Final Results</h3>
          <p className="text-gray-600">Start by adding your first final exam result.</p>
        </div>
      )}

      {/* Professional Results Table */}
      {showResultsTable && finalResults.length > 0 && (
        <div className="mt-8">
          <ProfessionalResultsTable
            results={generateResultsTable()}
            academicYear={selectedAcademicYear}
            semester={selectedSemester}
          />
        </div>
      )}
    </div>
  );
};

// Professional Results Table Component
const ProfessionalResultsTable = ({ results, academicYear, semester }: {
  results: any[],
  academicYear: string,
  semester: number
}) => {
  const [showPrintView, setShowPrintView] = useState(false);

  const evaluateStudentStatus = (courses: any[]) => {
    const hasFailure = courses.some(course => course.final_score < 50);
    return hasFailure ? "Incomplete Year – Repeat Course Required" : "Clear Pass";
  };

  const downloadResults = () => {
    const printContent = document.getElementById('results-table-print');
    if (printContent) {
      const newWindow = window.open('', '_blank');
      newWindow?.document.write(`
        <html>
          <head>
            <title>Final Results - ${academicYear} Semester ${semester}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .header { text-align: center; margin-bottom: 30px; }
              .university-name { font-size: 24px; font-weight: bold; color: #1e40af; margin-bottom: 10px; }
              .academic-info { font-size: 16px; margin-bottom: 20px; }
              .watermark {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%) rotate(-45deg);
                font-size: 100px;
                color: rgba(0,0,0,0.05);
                z-index: -1;
                pointer-events: none;
              }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f8f9fa; font-weight: bold; }
              .status-pass { color: #059669; font-weight: bold; }
              .status-repeat { color: #dc2626; font-weight: bold; }
              .security-pattern {
                background-image:
                  repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,.05) 2px, rgba(0,0,0,.05) 4px),
                  repeating-linear-gradient(-45deg, transparent, transparent 2px, rgba(0,0,0,.05) 2px, rgba(0,0,0,.05) 4px);
              }
              @media print {
                .no-print { display: none; }
                body { margin: 0; }
              }
            </style>
          </head>
          <body class="security-pattern">
            <div class="watermark">SANCTA MARIA COLLEGE</div>
            ${printContent.innerHTML}
          </body>
        </html>
      `);
      newWindow?.document.close();
      newWindow?.print();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-gray-900">Professional Results Table</h3>
        <div className="space-x-3">
          <button
            onClick={() => setShowPrintView(!showPrintView)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            {showPrintView ? 'Hide Print View' : 'Show Print View'}
          </button>
          <button
            onClick={downloadResults}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Download/Print
          </button>
        </div>
      </div>

      <div id="results-table-print" className={showPrintView ? 'block' : 'hidden'}>
        <div className="header text-center mb-8">
          <div className="university-name text-2xl font-bold text-blue-600 mb-2">
            SANCTA MARIA COLLEGE OF NURSING
          </div>
          <div className="academic-info text-lg text-gray-700">
            Final Examination Results
          </div>
          <div className="academic-info text-md text-gray-600">
            Academic Year: {academicYear} | Semester: {semester}
          </div>
        </div>

        {results.map((studentData: any, index: number) => (
          <div key={index} className="mb-8 page-break-inside-avoid">
            <div className="student-header bg-gray-50 p-4 rounded-lg mb-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>Student Name:</strong> {studentData.student?.first_name} {studentData.student?.last_name}
                </div>
                <div>
                  <strong>Student ID:</strong> {studentData.student?.student_id}
                </div>
                <div>
                  <strong>Program:</strong> {studentData.student?.program}
                </div>
                <div>
                  <strong>Status:</strong>
                  <span className={evaluateStudentStatus(studentData.courses) === 'Clear Pass' ? 'status-pass ml-2' : 'status-repeat ml-2'}>
                    {evaluateStudentStatus(studentData.courses)}
                  </span>
                </div>
              </div>
            </div>

            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-4 py-2 text-left">Course Code</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Course Name</th>
                  <th className="border border-gray-300 px-4 py-2 text-center">Final Grade (%)</th>
                  <th className="border border-gray-300 px-4 py-2 text-center">Letter Grade</th>
                  <th className="border border-gray-300 px-4 py-2 text-center">GPA Points</th>
                  <th className="border border-gray-300 px-4 py-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {studentData.courses.map((course: any, courseIndex: number) => (
                  <tr key={courseIndex} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-4 py-2">{course.courses?.course_code}</td>
                    <td className="border border-gray-300 px-4 py-2">{course.courses?.course_name}</td>
                    <td className="border border-gray-300 px-4 py-2 text-center">{course.final_score}%</td>
                    <td className="border border-gray-300 px-4 py-2 text-center font-semibold">{course.final_grade}</td>
                    <td className="border border-gray-300 px-4 py-2 text-center">{course.gpa_points}</td>
                    <td className="border border-gray-300 px-4 py-2 text-center">
                      <span className={course.status === 'Pass' ? 'status-pass' : 'status-repeat'}>
                        {course.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-4 text-sm text-gray-600">
              <p><strong>Generated on:</strong> {new Date().toLocaleDateString()}</p>
              <p><strong>Total Courses:</strong> {studentData.courses.length}</p>
              <p><strong>Average GPA:</strong> {(studentData.courses.reduce((sum: number, course: any) => sum + course.gpa_points, 0) / studentData.courses.length).toFixed(2)}</p>
            </div>
          </div>
        ))}

        <div className="footer mt-8 text-center text-sm text-gray-500">
          <p>This document is computer-generated and bears the official seal of Sancta Maria College of Nursing.</p>
          <p>Any unauthorized reproduction or alteration of this document is strictly prohibited.</p>
        </div>
      </div>

      {!showPrintView && (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">📋</span>
          </div>
          <h4 className="text-lg font-semibold text-gray-900 mb-2">Professional Results Table</h4>
          <p className="text-gray-600 mb-4">
            Click "Show Print View" to see the formatted results table with university branding and security features.
          </p>
          <p className="text-sm text-gray-500">
            The table includes anti-replication security patterns and official university formatting.
          </p>
        </div>
      )}
    </div>
  );
};

// Student Enrollment Modal Component
const StudentEnrollmentModal = ({
  course,
  students,
  onClose,
  onEnroll,
  isLoading
}: {
  course: any;
  students: any[];
  onClose: () => void;
  onEnroll: (studentId: string, courseId: string) => void;
  isLoading: boolean;
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);

  // Filter students who are not already enrolled in this course
  const availableStudents = students.filter(student => {
    const isAlreadyEnrolled = course.course_enrollments?.some(
      (enrollment: any) => enrollment.student_id === student.id
    );
    const matchesSearch = searchTerm === '' ||
      student.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.student_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase());

    return !isAlreadyEnrolled && matchesSearch;
  });

  const handleStudentToggle = (studentId: string) => {
    setSelectedStudents(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleEnrollSelected = async () => {
    for (const studentId of selectedStudents) {
      await onEnroll(studentId, course.id);
    }
    setSelectedStudents([]);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 text-white p-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Enroll Students</h2>
              <p className="text-blue-100 mt-1">
                Course: {course.course_code} - {course.course_name}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Search Bar */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Students
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, student ID, or email..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Selected Students Count */}
          {selectedStudents.length > 0 && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                {selectedStudents.length} student(s) selected for enrollment
              </p>
            </div>
          )}

          {/* Students List */}
          <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
            {availableStudents.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-lg">👥</span>
                </div>
                <p className="text-gray-500">
                  {searchTerm ? 'No students found matching your search.' : 'All students are already enrolled in this course.'}
                </p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        checked={selectedStudents.length === availableStudents.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedStudents(availableStudents.map(s => s.id));
                          } else {
                            setSelectedStudents([]);
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Program
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {availableStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedStudents.includes(student.id)}
                          onChange={() => handleStudentToggle(student.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {student.student_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {student.first_name} {student.last_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {student.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {student.program}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {availableStudents.length} student(s) available for enrollment
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleEnrollSelected}
              disabled={selectedStudents.length === 0 || isLoading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
            >
              {isLoading ? 'Enrolling...' : `Enroll ${selectedStudents.length} Student(s)`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const LecturerDashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<LecturerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [courses, setCourses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [enrollmentLoading, setEnrollmentLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();

  // Real-time updates for courses and enrollments
  useRealTimeUpdates('courses', () => {
    if (profile?.id) {
      fetchCourses();
    }
  });

  useRealTimeUpdates('course_enrollments', () => {
    if (profile?.id) {
      fetchCourses();
    }
  });

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (profile?.id) {
      fetchCourses();
      fetchStudents();
      fetchQuizzes();
    }
  }, [profile]);

  // Additional useEffect to try loading profile from localStorage if not loaded
  useEffect(() => {
    if (!profile && !loading) {
      const storedProfile = localStorage.getItem('user_profile');
      if (storedProfile) {
        try {
          const parsedProfile = JSON.parse(storedProfile);
          setProfile(parsedProfile);
        } catch (error) {
          console.error('Error parsing stored profile:', error);
        }
      }
    }
  }, [profile, loading]);

  const checkAuth = async () => {
    try {
      console.log('checkAuth: Starting authentication check');
      const currentUser = authAPI.getCurrentUser();
      console.log('checkAuth: Current user from localStorage:', currentUser);

      if (!currentUser || currentUser.role !== 'lecturer') {
        console.log('checkAuth: No valid lecturer user found, redirecting to home');
        router.push('/');
        return;
      }
      setUser(currentUser);

      // Fetch fresh lecturer profile from database
      console.log('checkAuth: Fetching lecturer profile for user ID:', currentUser.id);
      await fetchLecturerProfile(currentUser.id);
    } catch (error) {
      console.error('checkAuth: Error during authentication:', error);
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const fetchLecturerProfile = async (userId: string) => {
    try {
      console.log('fetchLecturerProfile: Fetching lecturer profile for user ID:', userId);
      const { data, error } = await supabase
        .rpc('get_lecturer_profile', { p_user_id: userId });

      console.log('fetchLecturerProfile: Lecturer profile response:', { data, error });

      if (error) {
        console.error('fetchLecturerProfile: RPC error:', error);
        throw error;
      }
      if (data) {
        console.log('fetchLecturerProfile: Setting lecturer profile data:', data);
        console.log('fetchLecturerProfile: Profile ID that will be used for courses:', data.id);
        setProfile(data);
        // Update localStorage with fresh data
        localStorage.setItem('user_profile', JSON.stringify(data));
      } else {
        console.warn('fetchLecturerProfile: No profile data returned');
      }
    } catch (error) {
      console.error('fetchLecturerProfile: Failed to fetch lecturer profile:', error);
    }
  };

  const fetchCourses = async () => {
    if (!profile?.id) {
      console.log('fetchCourses: No profile ID available', profile);
      return;
    }

    try {
      console.log('fetchCourses: Fetching courses for lecturer ID:', profile.id);
      const data = await lecturerAPI.getAssignedCourses(profile.id);
      console.log('fetchCourses: Received courses data:', data);
      setCourses(data || []);
    } catch (error) {
      console.error('Failed to fetch courses:', error);
      setError('Failed to load courses');
    }
  };

  const fetchStudents = async () => {
    try {
      // For enrollment modal, we need all students to allow enrollment
      const data = await lecturerAPI.getStudentsForEnrollment();
      setStudents(data || []);
    } catch (error) {
      console.error('Failed to fetch students:', error);
    }
  };

  const fetchQuizzes = async () => {
    try {
      if (profile?.id) {
        const data = await lecturerAPI.getQuizzes(profile.id);
        setQuizzes(data || []);
      }
    } catch (error) {
      console.error('Error fetching quizzes:', error);
    }
  };

  const handleEnrollStudent = async (studentId: string, courseId: string) => {
    setEnrollmentLoading(true);
    setError('');
    setSuccess('');

    try {
      await lecturerAPI.enrollStudentInCourse(studentId, courseId);
      setSuccess('Student enrolled successfully!');
      fetchCourses(); // Refresh courses to show updated enrollment
      setShowEnrollModal(false);
    } catch (error: any) {
      setError(error.message || 'Failed to enroll student');
    } finally {
      setEnrollmentLoading(false);
    }
  };

  const handleRemoveStudent = async (studentId: string, courseId: string) => {
    if (!confirm('Are you sure you want to remove this student from the course?')) {
      return;
    }

    try {
      await lecturerAPI.removeStudentFromCourse(studentId, courseId);
      setSuccess('Student removed successfully!');
      fetchCourses(); // Refresh courses
    } catch (error: any) {
      setError(error.message || 'Failed to remove student');
    }
  };

  const handleLogout = () => {
    authAPI.logout();
    router.push('/');
  };




  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div>
            <h2 className="text-xl lg:text-2xl font-bold text-gray-900 mb-4 lg:mb-6">Lecturer Overview</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6 lg:mb-8">
              <div className="bg-blue-50 rounded-lg p-4 lg:p-6 border border-blue-200">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 lg:w-8 lg:h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                      <span className="text-white text-base lg:text-sm">📚</span>
                    </div>
                  </div>
                  <div className="ml-3 lg:ml-4">
                    <p className="text-sm font-medium text-blue-600">My Courses</p>
                    <p className="text-xl lg:text-2xl font-bold text-blue-900">{courses.length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 rounded-lg p-4 lg:p-6 border border-green-200">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 lg:w-8 lg:h-8 bg-green-600 rounded-lg flex items-center justify-center">
                      <span className="text-white text-base lg:text-sm">👥</span>
                    </div>
                  </div>
                  <div className="ml-3 lg:ml-4">
                    <p className="text-sm font-medium text-green-600">Total Students</p>
                    <p className="text-xl lg:text-2xl font-bold text-green-900">
                      {courses.reduce((total: number, course: any) => total + (course.course_enrollments?.length || 0), 0)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 rounded-lg p-4 lg:p-6 border border-purple-200">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 lg:w-8 lg:h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                      <span className="text-white text-base lg:text-sm">🧠</span>
                    </div>
                  </div>
                  <div className="ml-3 lg:ml-4">
                    <p className="text-sm font-medium text-purple-600">Active Quizzes</p>
                    <p className="text-xl lg:text-2xl font-bold text-purple-900">{quizzes.length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-orange-50 rounded-lg p-4 lg:p-6 border border-orange-200">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 lg:w-8 lg:h-8 bg-orange-600 rounded-lg flex items-center justify-center">
                      <span className="text-white text-base lg:text-sm">📝</span>
                    </div>
                  </div>
                  <div className="ml-3 lg:ml-4">
                    <p className="text-sm font-medium text-orange-600">Assignments</p>
                    <p className="text-xl lg:text-2xl font-bold text-orange-900">0</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4 lg:p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Lecturer Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lecturer ID</label>
                  <p className="text-gray-900 font-semibold">{profile?.lecturer_id || 'Not available'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <p className="text-gray-900">{profile?.first_name && profile?.last_name ? `${profile.first_name} ${profile.last_name}` : 'Not available'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <p className="text-gray-900">{profile?.email || 'Not available'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <p className="text-gray-900">{profile?.department || 'Not available'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Specialization</label>
                  <p className="text-gray-900">{profile?.specialization || 'Not available'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    profile?.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {profile?.status || 'Unknown'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );

      case 'courses':
        return (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">My Courses ({courses.length})</h2>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <p className="text-green-800 text-sm">{success}</p>
              </div>
            )}

            {courses.length === 0 ? (
              <div className="bg-gray-50 rounded-lg p-8 text-center">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📚</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Courses Assigned</h3>
                <p className="text-gray-600">You will see your assigned courses here once they are allocated by the admin.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {courses.map((course: any) => (
                  <div key={course.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{course.course_name}</h3>
                        <p className="text-sm text-gray-600">{course.course_code}</p>
                      </div>
                      <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
                        {course.credits} Credits
                      </span>
                    </div>

                    {course.description && (
                      <p className="text-gray-600 text-sm mb-4">{course.description}</p>
                    )}

                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Semester:</span>
                        <span className="font-medium">{course.semester} / {course.year}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Enrolled Students:</span>
                        <span className="font-medium">{course.course_enrollments?.length || 0}</span>
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setSelectedCourse(course);
                          setShowEnrollModal(true);
                        }}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        Enroll Students
                      </button>
                      <button
                        onClick={() => setActiveTab('students')}
                        className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        View Students
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'students':
        return (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Course Students</h2>

            {courses.length === 0 ? (
              <div className="bg-gray-50 rounded-lg p-8 text-center">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">👥</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Courses Assigned</h3>
                <p className="text-gray-600">You need to have courses assigned to view students.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {courses.map((course: any) => (
                  <div key={course.id} className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{course.course_name}</h3>
                        <p className="text-sm text-gray-600">{course.course_code}</p>
                      </div>
                      <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
                        {course.course_enrollments?.length || 0} Students
                      </span>
                    </div>

                    {course.course_enrollments && course.course_enrollments.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Student ID
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Name
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Email
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Enrolled Date
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {course.course_enrollments.map((enrollment: any) => (
                              <tr key={enrollment.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {enrollment.students?.student_id}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {enrollment.students?.first_name} {enrollment.students?.last_name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {enrollment.students?.email}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {new Date(enrollment.enrollment_date).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                  <button
                                    onClick={() => handleRemoveStudent(enrollment.student_id, course.id)}
                                    className="text-red-600 hover:text-red-900"
                                  >
                                    Remove
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
                          <span className="text-lg">👥</span>
                        </div>
                        <p className="text-gray-500 text-sm">No students enrolled in this course yet.</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'ca-results':
        return <CAResultsManager profile={profile} courses={courses} />;

      case 'exam-results':
        return <FinalResultsManager profile={profile} courses={courses} />;

      case 'quizzes':
        return (
          <LazyComponentWrapper fallback={<FormSkeleton />}>
            <EnhancedQuizDashboard profile={profile} courses={courses} />
          </LazyComponentWrapper>
        );

      case 'quiz-results':
        return (
          <LazyComponentWrapper fallback={<TableSkeleton />}>
            <QuizResultsAnalytics lecturerId={profile?.id} quizzes={[]} />
          </LazyComponentWrapper>
        );

      case 'assignments':
        return (
          <LazyComponentWrapper fallback={<FormSkeleton />}>
            <AssignmentManager profile={profile} courses={courses} />
          </LazyComponentWrapper>
        );

      default:
        return <div>Tab content not found</div>;
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'courses', label: 'My Courses', icon: '📚' },
    { id: 'students', label: 'Course Students', icon: '👥' },
    { id: 'ca-results', label: 'Manage CA Results', icon: '📈' },
    { id: 'exam-results', label: 'Manage Exam Results', icon: '📋' },
    { id: 'quizzes', label: 'Manage Quizzes', icon: '🧠' },
    { id: 'quiz-results', label: 'Quiz Results', icon: '📊' },
    { id: 'assignments', label: 'Manage Assignments', icon: '📝' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header Skeleton */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-48"></div>
              </div>
              <div className="animate-pulse">
                <div className="h-10 bg-gray-200 rounded w-20"></div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Skeleton */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar Skeleton */}
            <div className="hidden lg:block lg:w-64 flex-shrink-0">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="animate-pulse space-y-3">
                  <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-10 bg-gray-200 rounded"></div>
                  ))}
                </div>
              </div>
            </div>

            {/* Content Skeleton */}
            <div className="flex-1">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="animate-pulse space-y-6">
                  <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="bg-gray-50 rounded-lg p-6 space-y-4">
                        <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                        <div className="h-4 bg-gray-200 rounded w-full"></div>
                        <div className="flex space-x-2">
                          <div className="h-10 bg-gray-200 rounded flex-1"></div>
                          <div className="h-10 bg-gray-200 rounded flex-1"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              {/* Mobile menu button */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 mr-3"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div className="flex-shrink-0">
                <h1 className="text-lg lg:text-xl font-bold text-gray-900">Lecturer Dashboard</h1>
              </div>
            </div>
            <div className="flex items-center space-x-2 lg:space-x-4">
              <span className="text-xs lg:text-sm text-gray-700 hidden sm:block">
                Welcome, {profile?.first_name ? `Dr. ${profile.first_name} ${profile.last_name}` : 'Lecturer'}
              </span>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 lg:px-4 rounded-lg text-xs lg:text-sm font-medium transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setSidebarOpen(false)}></div>
          <div className="fixed top-0 left-0 bottom-0 w-64 bg-white shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Lecturer Menu</h3>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <nav className="p-2 overflow-y-auto h-full pb-20">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setSidebarOpen(false);
                  }}
                  className={`w-full text-left px-3 py-3 rounded-lg text-sm font-medium transition-colors mb-1 ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="mr-3 text-lg">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-8">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-8">
          {/* Desktop Sidebar Navigation */}
          <div className="hidden lg:block lg:w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 sticky top-4">
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">Lecturer Menu</h3>
              </div>
              <nav className="p-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-1 ${
                      activeTab === tab.id
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span className="mr-3">{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 min-w-0">
            {/* Mobile tab indicator */}
            <div className="lg:hidden mb-4 bg-white rounded-lg shadow-sm border border-gray-200 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-lg mr-2">{tabs.find(tab => tab.id === activeTab)?.icon}</span>
                  <span className="font-medium text-gray-900">{tabs.find(tab => tab.id === activeTab)?.label}</span>
                </div>
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 lg:p-6">
              {renderTabContent()}
            </div>
          </div>
        </div>
      </div>

      {/* Student Enrollment Modal */}
      {showEnrollModal && selectedCourse && (
        <StudentEnrollmentModal
          course={selectedCourse}
          students={students}
          onClose={() => {
            setShowEnrollModal(false);
            setSelectedCourse(null);
          }}
          onEnroll={handleEnrollStudent}
          isLoading={enrollmentLoading}
        />
      )}
    </div>
  );
};

export default LecturerDashboard;
