'use client';

import React, { useState, useEffect } from 'react';
import { lecturerAPI, Assignment, AssignmentSubmission } from '@/lib/supabase';

interface AssignmentManagerProps {
  profile: any;
  courses: any[];
}

interface AssignmentWithSubmissions extends Assignment {
  courses?: {
    course_code: string;
    course_name: string;
  };
  assignment_submissions?: any[];
}

interface AssignmentFormData {
  title: string;
  description: string;
  instructions: string;
  course_id: string;
  max_score: number;
  due_date: string;
}

const AssignmentManager: React.FC<AssignmentManagerProps> = ({ profile, courses }) => {
  const [assignments, setAssignments] = useState<AssignmentWithSubmissions[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<AssignmentWithSubmissions | null>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [grading, setGrading] = useState(false);
  const [gradeData, setGradeData] = useState({ score: '', feedback: '' });
  const [formData, setFormData] = useState<AssignmentFormData>({
    title: '',
    description: '',
    instructions: '',
    course_id: '',
    max_score: 100,
    due_date: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadAssignments();
  }, [profile.id]);

  const loadAssignments = async () => {
    try {
      setLoading(true);
      const data = await lecturerAPI.getAssignments(profile.id);
      setAssignments(data || []);
    } catch (error: any) {
      console.error('Error loading assignments:', error);
      setError('Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError('');
      await lecturerAPI.createAssignment({
        ...formData,
        created_by: profile.id
      });
      setSuccess('Assignment created successfully!');
      setShowCreateForm(false);
      setFormData({
        title: '',
        description: '',
        instructions: '',
        course_id: '',
        max_score: 100,
        due_date: ''
      });
      loadAssignments();
    } catch (error: any) {
      setError(error.message || 'Failed to create assignment');
    }
  };

  const loadSubmissions = async (assignment: AssignmentWithSubmissions) => {
    try {
      setLoadingSubmissions(true);
      const data = await lecturerAPI.getAssignmentSubmissions(assignment.id, profile.id);
      setSubmissions(data.submissions || []);
      setSelectedAssignment(assignment);
    } catch (error: any) {
      console.error('Error loading submissions:', error);
      setError('Failed to load submissions');
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSubmissionStats = (assignment: AssignmentWithSubmissions) => {
    const totalSubmissions = assignment.assignment_submissions?.length || 0;
    const gradedSubmissions = assignment.assignment_submissions?.filter(s => s.status === 'graded').length || 0;
    return { total: totalSubmissions, graded: gradedSubmissions };
  };

  const handleGradeSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubmission) return;

    try {
      setGrading(true);
      setError('');

      await lecturerAPI.gradeAssignmentSubmission(selectedSubmission.id, {
        score: parseFloat(gradeData.score),
        feedback: gradeData.feedback.trim() || undefined,
        graded_by: profile.id
      });

      setSuccess('Assignment graded successfully!');
      setSelectedSubmission(null);
      setGradeData({ score: '', feedback: '' });

      // Reload submissions to show updated status
      if (selectedAssignment) {
        loadSubmissions(selectedAssignment);
      }
    } catch (error: any) {
      setError(error.message || 'Failed to grade assignment');
    } finally {
      setGrading(false);
    }
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
        <h2 className="text-2xl font-bold text-gray-900">Manage Assignments</h2>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          Create Assignment
        </button>
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

      {selectedAssignment ? (
        <div>
          <div className="flex items-center mb-6">
            <button
              onClick={() => {
                setSelectedAssignment(null);
                setSubmissions([]);
              }}
              className="text-blue-600 hover:text-blue-800 mr-4"
            >
              ← Back to Assignments
            </button>
            <h3 className="text-xl font-bold text-gray-900">{selectedAssignment.title}</h3>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p><span className="font-medium">Course:</span> {selectedAssignment.courses?.course_code}</p>
                <p><span className="font-medium">Max Score:</span> {selectedAssignment.max_score} points</p>
              </div>
              <div>
                <p><span className="font-medium">Due Date:</span> {formatDate(selectedAssignment.due_date)}</p>
                <p><span className="font-medium">Created:</span> {formatDate(selectedAssignment.created_at)}</p>
              </div>
              <div>
                <p><span className="font-medium">Total Submissions:</span> {submissions.length}</p>
                <p><span className="font-medium">Graded:</span> {submissions.filter(s => s.status === 'graded').length}</p>
              </div>
            </div>
          </div>

          {loadingSubmissions ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : submissions.length === 0 ? (
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📝</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Submissions Yet</h3>
              <p className="text-gray-600">Student submissions will appear here when they submit their assignments.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {submissions.map((submission) => (
                <div key={submission.id} className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">
                        {submission.students?.first_name} {submission.students?.last_name}
                      </h4>
                      <p className="text-sm text-gray-600 mb-1">
                        <span className="font-medium">Student ID:</span> {submission.students?.student_id}
                      </p>
                      <p className="text-sm text-gray-600 mb-1">
                        <span className="font-medium">Submitted:</span> {formatDate(submission.submitted_at)}
                      </p>
                      {submission.graded_at && (
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Graded:</span> {formatDate(submission.graded_at)}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end space-y-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        submission.status === 'graded' ? 'bg-green-100 text-green-800' :
                        submission.status === 'submitted' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
                      </span>
                      {submission.score !== null && submission.score !== undefined && (
                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-900">
                            {submission.score}/{selectedAssignment.max_score}
                          </div>
                          <div className="text-sm text-gray-600">
                            {((submission.score / selectedAssignment.max_score) * 100).toFixed(1)}%
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {submission.submission_text && (
                    <div className="mb-4">
                      <h5 className="font-medium text-gray-900 mb-2">Submission:</h5>
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                        <p className="text-gray-700 text-sm line-clamp-3">{submission.submission_text}</p>
                      </div>
                    </div>
                  )}

                  {submission.feedback && (
                    <div className="mb-4">
                      <h5 className="font-medium text-gray-900 mb-2">Feedback:</h5>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-gray-700 text-sm">{submission.feedback}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <div className="flex space-x-2">
                      {submission.file_path && (
                        <button className="text-green-600 hover:text-green-800 text-sm font-medium">
                          Download File
                        </button>
                      )}
                    </div>
                    {submission.status !== 'graded' && (
                      <button
                        onClick={() => {
                          setSelectedSubmission(submission);
                          setGradeData({ score: '', feedback: '' });
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                      >
                        Grade Submission
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          {assignments.length === 0 ? (
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📝</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Assignments Created</h3>
              <p className="text-gray-600">Create and manage assignments for your courses here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {assignments.map((assignment) => {
                const stats = getSubmissionStats(assignment);
                return (
                  <div key={assignment.id} className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{assignment.title}</h3>
                    <p className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">Course:</span> {assignment.courses?.course_code}
                    </p>
                    <p className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">Due:</span> {formatDate(assignment.due_date)}
                    </p>
                    <p className="text-sm text-gray-600 mb-4">
                      <span className="font-medium">Max Score:</span> {assignment.max_score} points
                    </p>
                    
                    <div className="flex justify-between items-center mb-4">
                      <div className="text-sm">
                        <span className="font-medium">Submissions:</span> {stats.total}
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">Graded:</span> {stats.graded}
                      </div>
                    </div>

                    <button
                      onClick={() => loadSubmissions(assignment)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium transition-colors"
                    >
                      View Submissions
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Create Assignment Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Create New Assignment</h3>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">Close</span>
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleCreateAssignment} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Assignment Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Course *
                  </label>
                  <select
                    value={formData.course_id}
                    onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Score *
                    </label>
                    <input
                      type="number"
                      value={formData.max_score}
                      onChange={(e) => setFormData({ ...formData, max_score: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      min="1"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Due Date *
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.due_date}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Instructions
                  </label>
                  <textarea
                    value={formData.instructions}
                    onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Provide detailed instructions for students..."
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Create Assignment
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Grading Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Grade Assignment Submission</h3>
                <button
                  onClick={() => {
                    setSelectedSubmission(null);
                    setGradeData({ score: '', feedback: '' });
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">Close</span>
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Student Information</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Name:</span> {selectedSubmission.students?.first_name} {selectedSubmission.students?.last_name}</p>
                    <p><span className="font-medium">Student ID:</span> {selectedSubmission.students?.student_id}</p>
                    <p><span className="font-medium">Email:</span> {selectedSubmission.students?.email}</p>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Submission Details</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Submitted:</span> {formatDate(selectedSubmission.submitted_at)}</p>
                    <p><span className="font-medium">Status:</span> {selectedSubmission.status}</p>
                    <p><span className="font-medium">Max Score:</span> {selectedAssignment?.max_score} points</p>
                  </div>
                </div>
              </div>

              {selectedSubmission.submission_text && (
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-2">Text Submission</h4>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-60 overflow-y-auto">
                    <p className="text-gray-700 whitespace-pre-wrap">{selectedSubmission.submission_text}</p>
                  </div>
                </div>
              )}

              {selectedSubmission.file_path && (
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-2">File Submission</h4>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <svg className="w-8 h-8 text-gray-400 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {selectedSubmission.file_path.split('/').pop()}
                          </p>
                          <p className="text-xs text-gray-500">Submitted file</p>
                        </div>
                      </div>
                      <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                        Download
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleGradeSubmission} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Score (out of {selectedAssignment?.max_score}) *
                    </label>
                    <input
                      type="number"
                      value={gradeData.score}
                      onChange={(e) => setGradeData({ ...gradeData, score: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      min="0"
                      max={selectedAssignment?.max_score}
                      step="0.1"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Percentage
                    </label>
                    <input
                      type="text"
                      value={gradeData.score ? `${((parseFloat(gradeData.score) / (selectedAssignment?.max_score || 100)) * 100).toFixed(1)}%` : ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                      readOnly
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Feedback
                  </label>
                  <textarea
                    value={gradeData.feedback}
                    onChange={(e) => setGradeData({ ...gradeData, feedback: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Provide feedback for the student..."
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSubmission(null);
                      setGradeData({ score: '', feedback: '' });
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={grading}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    {grading ? 'Grading...' : 'Submit Grade'}
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

export default AssignmentManager;
