'use client';

import React, { useState, useEffect } from 'react';
import { studentAPI, AssignmentSubmission } from '@/lib/supabase';
import { useRealTimeUpdates } from '@/hooks/useRealTimeUpdates';

interface StudentAssignmentResultsProps {
  studentId: string;
}

interface AssignmentSubmissionWithDetails extends AssignmentSubmission {
  assignments?: {
    title: string;
    max_score: number;
    courses?: {
      course_code: string;
      course_name: string;
    };
  };
  lecturers?: {
    first_name: string;
    last_name: string;
  };
}

const StudentAssignmentResults: React.FC<StudentAssignmentResultsProps> = ({ studentId }) => {
  const [submissions, setSubmissions] = useState<AssignmentSubmissionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<AssignmentSubmissionWithDetails | null>(null);

  useEffect(() => {
    loadAssignmentResults();
  }, [studentId]);

  // Set up real-time updates
  useRealTimeUpdates(studentId, () => {
    loadAssignmentResults();
  });

  const loadAssignmentResults = async () => {
    try {
      setLoading(true);
      const data = await studentAPI.getAssignmentResults(studentId);
      setSubmissions(data || []);
    } catch (error: any) {
      console.error('Error loading assignment results:', error);
    } finally {
      setLoading(false);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'graded':
        return 'bg-green-100 text-green-800';
      case 'submitted':
        return 'bg-yellow-100 text-yellow-800';
      case 'late':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getGradeColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
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
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Assignment Results</h2>

      {submissions.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">📄</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Assignment Results Available</h3>
          <p className="text-gray-600">Your assignment results and feedback will appear here once graded.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {submissions.map((submission) => (
            <div key={submission.id} className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {submission.assignments?.title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">Course:</span> {submission.assignments?.courses?.course_code} - {submission.assignments?.courses?.course_name}
                  </p>
                  <p className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">Submitted:</span> {formatDate(submission.submitted_at)}
                  </p>
                  {submission.graded_at && (
                    <p className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">Graded:</span> {formatDate(submission.graded_at)}
                    </p>
                  )}
                  {submission.lecturers && (
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Graded by:</span> {submission.lecturers.first_name} {submission.lecturers.last_name}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end space-y-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(submission.status)}`}>
                    {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
                  </span>
                  {submission.score !== null && submission.score !== undefined && (
                    <div className="text-right">
                      <div className={`text-lg font-bold ${getGradeColor(submission.score, submission.assignments?.max_score || 100)}`}>
                        {submission.score}/{submission.assignments?.max_score}
                      </div>
                      <div className="text-sm text-gray-600">
                        {((submission.score / (submission.assignments?.max_score || 100)) * 100).toFixed(1)}%
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {submission.feedback && (
                <div className="mb-4">
                  <h4 className="font-medium text-gray-900 mb-2">Feedback:</h4>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-gray-700 text-sm">{submission.feedback}</p>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center">
                <button
                  onClick={() => setSelectedSubmission(submission)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  View Details
                </button>
                {submission.file_path && (
                  <button className="text-green-600 hover:text-green-800 text-sm font-medium">
                    Download Submission
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Details Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Assignment Submission Details</h3>
                <button
                  onClick={() => setSelectedSubmission(null)}
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
                  <h4 className="font-medium text-gray-900 mb-2">Assignment Information</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Title:</span> {selectedSubmission.assignments?.title}</p>
                    <p><span className="font-medium">Course:</span> {selectedSubmission.assignments?.courses?.course_code} - {selectedSubmission.assignments?.courses?.course_name}</p>
                    <p><span className="font-medium">Max Score:</span> {selectedSubmission.assignments?.max_score} points</p>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Submission Information</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Submitted:</span> {formatDate(selectedSubmission.submitted_at)}</p>
                    <p><span className="font-medium">Status:</span> 
                      <span className={`ml-2 px-2 py-1 rounded text-xs ${getStatusColor(selectedSubmission.status)}`}>
                        {selectedSubmission.status.charAt(0).toUpperCase() + selectedSubmission.status.slice(1)}
                      </span>
                    </p>
                    {selectedSubmission.graded_at && (
                      <p><span className="font-medium">Graded:</span> {formatDate(selectedSubmission.graded_at)}</p>
                    )}
                    {selectedSubmission.score !== null && selectedSubmission.score !== undefined && (
                      <p><span className="font-medium">Score:</span> 
                        <span className={`ml-1 font-bold ${getGradeColor(selectedSubmission.score, selectedSubmission.assignments?.max_score || 100)}`}>
                          {selectedSubmission.score}/{selectedSubmission.assignments?.max_score} ({((selectedSubmission.score / (selectedSubmission.assignments?.max_score || 100)) * 100).toFixed(1)}%)
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {selectedSubmission.submission_text && (
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-2">Text Submission</h4>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
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

              {selectedSubmission.feedback && (
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-2">Lecturer Feedback</h4>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-gray-700 whitespace-pre-wrap">{selectedSubmission.feedback}</p>
                    {selectedSubmission.lecturers && (
                      <p className="text-sm text-gray-600 mt-2">
                        - {selectedSubmission.lecturers.first_name} {selectedSubmission.lecturers.last_name}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={() => setSelectedSubmission(null)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentAssignmentResults;
