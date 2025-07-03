'use client';

import React, { useState, useEffect } from 'react';
import { studentAPI, Assignment } from '@/lib/supabase';
import { useRealTimeUpdates } from '@/hooks/useRealTimeUpdates';
import { uploadFile, validateFile, formatFileSize, getFileIcon, getSignedUrl } from '@/utils/fileUpload';

interface StudentAssignmentSubmissionProps {
  studentId: string;
}

interface AssignmentWithSubmission extends Assignment {
  assignment_submissions?: any[];
  courses?: {
    course_code: string;
    course_name: string;
  };
}

const StudentAssignmentSubmission: React.FC<StudentAssignmentSubmissionProps> = ({ studentId }) => {
  const [assignments, setAssignments] = useState<AssignmentWithSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<AssignmentWithSubmission | null>(null);
  const [submissionText, setSubmissionText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadAssignments();
  }, [studentId]);

  // Set up real-time updates
  useRealTimeUpdates(studentId, () => {
    loadAssignments();
  });

  const loadAssignments = async () => {
    try {
      setLoading(true);
      const data = await studentAPI.getAvailableAssignments(studentId);
      setAssignments(data || []);
    } catch (error: any) {
      console.error('Error loading assignments:', error);
      setError('Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validation = validateFile(file, ['application/pdf'], 50 * 1024 * 1024);
      if (!validation.isValid) {
        setError(validation.error || 'Invalid file');
        return;
      }
      setSelectedFile(file);
      setError('');
    }
  };

  const handleSubmit = async (assignment: AssignmentWithSubmission) => {
    if (!submissionText.trim() && !selectedFile) {
      setError('Please provide either text submission or upload a file');
      return;
    }

    try {
      setSubmitting(assignment.id);
      setUploading(true);
      setError('');

      let filePath = '';
      if (selectedFile) {
        const uploadResult = await uploadFile(selectedFile, {
          bucket: 'submissions',
          folder: `assignment_${assignment.id}/student_${studentId}`,
          allowedTypes: ['application/pdf'],
          maxSize: 50 * 1024 * 1024
        });
        filePath = uploadResult.path;
      }

      await studentAPI.submitAssignment({
        assignment_id: assignment.id,
        student_id: studentId,
        submission_text: submissionText.trim() || undefined,
        file_path: filePath || undefined
      });

      setSuccess('Assignment submitted successfully!');
      setSelectedAssignment(null);
      setSubmissionText('');
      setSelectedFile(null);
      loadAssignments(); // Reload to update submission status
    } catch (error: any) {
      setError(error.message || 'Failed to submit assignment');
    } finally {
      setSubmitting(null);
      setUploading(false);
    }
  };

  const handleDownloadAssignment = async (assignment: AssignmentWithSubmission) => {
    if (!assignment.file_path) {
      setError('No assignment file to download');
      return;
    }

    try {
      const signedUrl = await getSignedUrl('assignments', assignment.file_path, 3600);
      const link = document.createElement('a');
      link.href = signedUrl;
      link.download = assignment.file_name || 'assignment.pdf';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error: any) {
      setError('Failed to download assignment: ' + error.message);
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

  const isOverdue = (dueDate: string) => {
    return new Date() > new Date(dueDate);
  };

  const hasSubmitted = (assignment: AssignmentWithSubmission) => {
    return assignment.assignment_submissions && assignment.assignment_submissions.length > 0;
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
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Submit Assignments</h2>

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

      {assignments.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">📝</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Assignments Available</h3>
          <p className="text-gray-600">Assignment submissions will be available here when assignments are published.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {assignments.map((assignment) => (
            <div key={assignment.id} className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{assignment.title}</h3>
                  <p className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">Course:</span> {assignment.courses?.course_code} - {assignment.courses?.course_name}
                  </p>
                  <p className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">Max Score:</span> {assignment.max_score} points
                  </p>
                  <p className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">Due Date:</span> 
                    <span className={isOverdue(assignment.due_date) ? 'text-red-600 font-medium' : 'text-gray-900'}>
                      {formatDate(assignment.due_date)}
                    </span>
                    {isOverdue(assignment.due_date) && (
                      <span className="ml-2 text-xs bg-red-100 text-red-800 px-2 py-1 rounded">OVERDUE</span>
                    )}
                  </p>
                </div>
                <div className="flex flex-col items-end space-y-2">
                  {hasSubmitted(assignment) ? (
                    <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                      Submitted
                    </span>
                  ) : isOverdue(assignment.due_date) ? (
                    <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
                      Overdue
                    </span>
                  ) : (
                    <button
                      onClick={() => setSelectedAssignment(assignment)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      Submit Assignment
                    </button>
                  )}
                </div>
              </div>

              {assignment.file_path && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-blue-600">{getFileIcon(assignment.file_name || '')}</span>
                      <div>
                        <p className="text-sm font-medium text-blue-800">
                          {assignment.file_name || 'Assignment File'}
                        </p>
                        <p className="text-xs text-blue-600">
                          {formatFileSize(assignment.file_size || 0)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDownloadAssignment(assignment)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                    >
                      Download PDF
                    </button>
                  </div>
                </div>
              )}

              {assignment.description && (
                <div className="mb-4">
                  <h4 className="font-medium text-gray-900 mb-2">Description:</h4>
                  <p className="text-gray-700 text-sm">{assignment.description}</p>
                </div>
              )}

              {assignment.instructions && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Instructions:</h4>
                  <p className="text-gray-700 text-sm">{assignment.instructions}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Submission Modal */}
      {selectedAssignment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Submit Assignment</h3>
                <button
                  onClick={() => {
                    setSelectedAssignment(null);
                    setSubmissionText('');
                    setSelectedFile(null);
                    setError('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">Close</span>
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-4">
                <h4 className="font-medium text-gray-900 mb-2">{selectedAssignment.title}</h4>
                <p className="text-sm text-gray-600">
                  Due: {formatDate(selectedAssignment.due_date)} | Max Score: {selectedAssignment.max_score} points
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Text Submission
                  </label>
                  <textarea
                    value={submissionText}
                    onChange={(e) => setSubmissionText(e.target.value)}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your assignment submission here..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    PDF Submission (Optional)
                  </label>
                  <input
                    type="file"
                    onChange={handleFileChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    accept=".pdf"
                  />
                  {selectedFile && (
                    <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <span className="text-green-600">{getFileIcon(selectedFile.name)}</span>
                        <span className="text-sm text-green-800 font-medium">{selectedFile.name}</span>
                        <span className="text-xs text-green-600">({formatFileSize(selectedFile.size)})</span>
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Upload your assignment answer as a PDF file. Max size: 50MB
                  </p>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setSelectedAssignment(null);
                    setSubmissionText('');
                    setSelectedFile(null);
                    setError('');
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSubmit(selectedAssignment)}
                  disabled={submitting === selectedAssignment.id || uploading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center space-x-2"
                >
                  {(submitting === selectedAssignment.id || uploading) && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  )}
                  <span>
                    {uploading ? 'Uploading...' : submitting === selectedAssignment.id ? 'Submitting...' : 'Submit Assignment'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentAssignmentSubmission;
