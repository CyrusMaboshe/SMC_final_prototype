'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, StudentProfile, supabase, studentAPI } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { AuthLoadingOverlay } from '@/components/AuthLoadingSpinner';
import QRCode from 'qrcode';
import StudentQuizInterface from '@/components/StudentQuizInterface';
import StudentQuizResults from '@/components/StudentQuizResults';
import StudentAssignmentSubmission from '@/components/StudentAssignmentSubmission';
import StudentAssignmentResults from '@/components/StudentAssignmentResults';
import StudentInvoices from '@/components/StudentInvoices';

const ChangePasswordForm = ({ user }: { user: any }) => {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    if (formData.newPassword !== formData.confirmPassword) {
      setError('New passwords do not match');
      setIsSubmitting(false);
      return;
    }

    if (formData.newPassword.length < 6) {
      setError('New password must be at least 6 characters long');
      setIsSubmitting(false);
      return;
    }

    try {
      await authAPI.changePassword(user.id, formData.currentPassword, formData.newPassword);
      setSuccess('Password changed successfully!');
      setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      setError(err.message || 'Failed to change password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Change Password</h2>
      <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-md">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <p className="text-green-800 text-sm">{success}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
            <input
              type="password"
              name="currentPassword"
              value={formData.currentPassword}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter current password"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
            <input
              type="password"
              name="newPassword"
              value={formData.newPassword}
              onChange={handleInputChange}
              required
              minLength={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter new password"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              required
              minLength={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Confirm new password"
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2 px-4 rounded-lg font-medium transition-colors"
          >
            {isSubmitting ? 'Changing Password...' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

const CAResultsTab = ({ studentId }: { studentId?: string }) => {
  const [caResults, setCAResults] = useState<any[]>([]);
  const [finalResults, setFinalResults] = useState<any[]>([]);
  const [studentProfile, setStudentProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (studentId) {
      fetchCAResults();
      fetchFinalResults();
      fetchStudentProfile();
    }
  }, [studentId]);

  // Real-time updates for CA results
  useEffect(() => {
    if (!studentId) return;

    const subscription = supabase
      .channel('ca_results_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ca_results',
          filter: `student_id=eq.${studentId}`
        },
        () => {
          fetchCAResults();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [studentId]);

  const fetchCAResults = async () => {
    try {
      setLoading(true);
      const data = await studentAPI.getCAResults(studentId!);
      setCAResults(data || []);
    } catch (error) {
      console.error('Failed to fetch CA results:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFinalResults = async () => {
    try {
      const data = await studentAPI.getFinalResults(studentId!);
      setFinalResults(data || []);
    } catch (error) {
      console.error('Failed to fetch final results:', error);
    }
  };

  const fetchStudentProfile = async () => {
    try {
      const profileData = JSON.parse(localStorage.getItem('user_profile') || '{}');
      setStudentProfile(profileData);
    } catch (error) {
      console.error('Failed to fetch student profile:', error);
    }
  };



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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Calculate Clear Pass status
  const calculateClearPassStatus = () => {
    if (caResults.length === 0) return null;

    // Group results by semester and academic year
    const semesterGroups = caResults.reduce((acc: any, result: any) => {
      const key = `${result.academic_year || 'Unknown'}-${result.semester || 'Unknown'}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(result);
      return acc;
    }, {});

    return Object.entries(semesterGroups).map(([key, results]: [string, any]) => {
      const [academicYear, semester] = key.split('-');
      const hasFailure = results.some((result: any) => result.percentage < 50);
      return {
        academicYear,
        semester,
        status: hasFailure ? "Incomplete - Repeat Required" : "Clear Pass",
        results: results,
        hasFailure
      };
    });
  };

  const semesterStatus = calculateClearPassStatus();

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <style jsx global>{`
        @media print {
          .print\\:hidden { display: none !important; }
          .space-y-6 > * + * { margin-top: 1rem !important; }
          .shadow-md { box-shadow: none !important; }
          .rounded-lg { border-radius: 0 !important; }
          table {
            page-break-inside: avoid;
            border-collapse: collapse;
            width: 100%;
          }
          .grid { page-break-inside: avoid; }
        }
      `}</style>
      <div className="space-y-6">
      {/* Print Button */}
      <div className="flex justify-end mb-4">
        <button
          onClick={handlePrint}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 print:hidden"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Print Report
        </button>
      </div>

      {/* Header Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center border-b pb-4 mb-4">
          <h1 className="text-2xl font-bold text-blue-800 mb-2">SANCTA MARIA COLLEGE OF NURSING</h1>
          <h2 className="text-lg font-semibold text-gray-700">CONTINUOUS ASSESSMENT (CA) RESULTS</h2>

          {/* Semester Status Display */}
          {semesterStatus && semesterStatus.length > 0 && (
            <div className="mt-4 space-y-2">
              {semesterStatus.map((status: any, index: number) => (
                <div key={index} className="flex justify-center items-center gap-4">
                  <span className="text-sm font-medium text-gray-600">
                    Academic Year: {status.academicYear} | Semester: {status.semester}
                  </span>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    status.hasFailure
                      ? 'bg-red-100 text-red-800 border border-red-200'
                      : 'bg-green-100 text-green-800 border border-green-200'
                  }`}>
                    {status.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p><span className="font-semibold">Student Name:</span> {studentProfile?.first_name} {studentProfile?.last_name}</p>
            <p><span className="font-semibold">Student ID:</span> {studentProfile?.student_id}</p>
          </div>
          <div>
            <p><span className="font-semibold">Batch:</span> {studentProfile?.batch || 'N/A'}</p>
            <p><span className="font-semibold">Program:</span> {studentProfile?.program || 'Nursing'}</p>
          </div>
          <div>
            <p><span className="font-semibold">Academic Year:</span> 2024/2025</p>
            <p><span className="font-semibold">Date:</span> {new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      {/* Academic Areas - CA Results */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="bg-blue-50 px-6 py-3 border-b">
          <h3 className="text-lg font-semibold text-gray-800">Academic Areas</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse border border-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase border border-gray-300">Subject</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase border border-gray-300">Academic Year</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase border border-gray-300">Semester</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase border border-gray-300">CA Score (%)</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase border border-gray-300">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {caResults.map((result: any) => {
                return (
                  <tr key={result.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm font-medium text-gray-900 border border-gray-300">
                      {result.courses?.course_name || result.courses?.course_code}
                    </td>
                    <td className="px-4 py-2 text-center text-sm text-gray-900 border border-gray-300">
                      {result.academic_year || 'N/A'}
                    </td>
                    <td className="px-4 py-2 text-center text-sm text-gray-900 border border-gray-300">
                      {result.semester || 'N/A'}
                    </td>
                    <td className="px-4 py-2 text-center text-sm text-gray-900 border border-gray-300">
                      {result.percentage?.toFixed(1)}%
                    </td>
                    <td className="px-4 py-2 text-center text-sm border border-gray-300">
                      {getStatusBadge(result.percentage)}
                    </td>
                  </tr>
                );
              })}

            </tbody>
          </table>
        </div>
      </div>



      {/* Grading Scale and Signatures */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Grading Scale */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <h4 className="text-sm font-semibold text-gray-800 mb-3">Activity Grade Scale: Grading scale are as follows:</h4>
          <div className="grid grid-cols-5 gap-2 text-xs">
            <div className="text-center border border-gray-300 p-1">
              <div className="font-semibold">A</div>
              <div>90-100</div>
            </div>
            <div className="text-center border border-gray-300 p-1">
              <div className="font-semibold">B</div>
              <div>80-89</div>
            </div>
            <div className="text-center border border-gray-300 p-1">
              <div className="font-semibold">C</div>
              <div>70-79</div>
            </div>
            <div className="text-center border border-gray-300 p-1">
              <div className="font-semibold">D</div>
              <div>60-69</div>
            </div>
            <div className="text-center border border-gray-300 p-1">
              <div className="font-semibold">F</div>
              <div>0-59</div>
            </div>
          </div>
          <p className="text-xs mt-3 text-gray-600">
            Activity Grade Scale: Grading scale are as follows: 5 = Excellent, 4 = Very Good, 3 = Good, 2 = Fair, 1 = Poor
          </p>
          <div className="mt-4">
            <p className="text-xs"><span className="font-semibold">Class:</span> ________________</p>
            <p className="text-xs"><span className="font-semibold">Description:</span> ________________</p>
          </div>
        </div>

        {/* Signatures */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="grid grid-cols-1 gap-6">
            <div className="text-center">
              <div className="border-b border-gray-400 mb-2 pb-8"></div>
              <p className="text-xs font-semibold">Signature of Class Teacher</p>
            </div>
            <div className="text-center">
              <div className="border-b border-gray-400 mb-2 pb-8"></div>
              <p className="text-xs font-semibold">Institution Seal</p>
            </div>
            <div className="text-center">
              <div className="border-b border-gray-400 mb-2 pb-8"></div>
              <p className="text-xs font-semibold">Principal Signature</p>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

const ExamResultsTab = ({ studentId }: { studentId?: string }) => {
  const [examResults, setExamResults] = useState<any[]>([]);
  const [caResults, setCAResults] = useState<any[]>([]);
  const [studentProfile, setStudentProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [qrCodes, setQrCodes] = useState<{[key: string]: string}>({});

  useEffect(() => {
    if (studentId) {
      fetchExamResults();
      fetchCAResults();
      fetchStudentProfile();
    }
  }, [studentId]);

  // Real-time updates for final results
  useEffect(() => {
    if (!studentId) return;

    const subscription = supabase
      .channel('final_results_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'final_results',
          filter: `student_id=eq.${studentId}`
        },
        () => {
          fetchExamResults();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [studentId]);

  const fetchExamResults = async () => {
    try {
      setLoading(true);
      const data = await studentAPI.getFinalResults(studentId!);
      setExamResults(data || []);
    } catch (error) {
      console.error('Failed to fetch final results:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCAResults = async () => {
    try {
      const data = await studentAPI.getCAResults(studentId!);
      setCAResults(data || []);
    } catch (error) {
      console.error('Failed to fetch CA results:', error);
    }
  };

  const fetchStudentProfile = async () => {
    try {
      const profileData = JSON.parse(localStorage.getItem('user_profile') || '{}');
      setStudentProfile(profileData);
    } catch (error) {
      console.error('Failed to fetch student profile:', error);
    }
  };

  // Generate QR codes for results
  const generateQRCodes = async () => {
    const codes: {[key: string]: string} = {};

    for (const result of examResults) {
      try {
        const qrData = {
          studentId: studentProfile?.student_id,
          studentName: `${studentProfile?.first_name} ${studentProfile?.last_name}`,
          courseCode: result.courses?.course_code,
          courseName: result.courses?.course_name,
          academicYear: result.academic_year,
          semester: result.semester,
          finalScore: result.final_score,
          grade: result.final_grade,
          verificationId: `SMC-${result.id.substring(0, 8).toUpperCase()}`,
          issueDate: new Date().toISOString().split('T')[0]
        };

        const qrString = await QRCode.toDataURL(JSON.stringify(qrData), {
          width: 100,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });

        codes[result.id] = qrString;
      } catch (error) {
        console.error('Error generating QR code:', error);
      }
    }

    setQrCodes(codes);
  };

  // Generate QR codes when results are loaded
  useEffect(() => {
    if (examResults.length > 0 && studentProfile) {
      generateQRCodes();
    }
  }, [examResults, studentProfile]);

  // Calculate Clear Pass status for Final Results
  const calculateFinalResultsStatus = () => {
    if (examResults.length === 0) return null;

    // Group results by semester and academic year
    const semesterGroups = examResults.reduce((acc: any, result: any) => {
      const key = `${result.academic_year || 'Unknown'}-${result.semester || 'Unknown'}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(result);
      return acc;
    }, {});

    return Object.entries(semesterGroups).map(([key, results]: [string, any]) => {
      const [academicYear, semester] = key.split('-');
      const hasFailure = results.some((result: any) => result.final_score < 50);
      return {
        academicYear,
        semester,
        status: hasFailure ? "Incomplete - Repeat Required" : "Clear Pass",
        results: results,
        hasFailure
      };
    });
  };

  const finalResultsStatus = calculateFinalResultsStatus();

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }



  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <style jsx global>{`
        @media print {
          .print\\:hidden { display: none !important; }
          .space-y-6 > * + * { margin-top: 1rem !important; }
          .shadow-md { box-shadow: none !important; }
          .rounded-lg { border-radius: 0 !important; }
          table {
            page-break-inside: avoid;
            border-collapse: collapse;
            width: 100%;
          }
          .grid { page-break-inside: avoid; }
        }
      `}</style>
      <div className="space-y-6">
        {/* Print Button */}
        <div className="flex justify-end mb-4">
          <button
            onClick={handlePrint}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 print:hidden"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Report
          </button>
        </div>

        {/* Header Section */}
        <div className="bg-white rounded-lg shadow-md p-6 relative">
          {/* QR Code in top left corner */}
          {examResults.length > 0 && Object.keys(qrCodes).length > 0 && (
            <div className="absolute top-4 left-4">
              <div className="flex flex-col items-center">
                <img
                  src={Object.values(qrCodes)[0]}
                  alt="Results QR Code"
                  className="w-20 h-20 mb-1"
                />
                <span className="text-xs text-gray-500">
                  Verification Code
                </span>
              </div>
            </div>
          )}

          <div className="text-center border-b pb-4 mb-4 ml-24">
            <h1 className="text-2xl font-bold text-blue-800 mb-2">SANCTA MARIA COLLEGE OF NURSING</h1>
            <h2 className="text-lg font-semibold text-gray-700">FINAL EXAMINATION RESULTS</h2>

            {/* Final Results Status Display */}
            {finalResultsStatus && finalResultsStatus.length > 0 && (
              <div className="mt-4 space-y-2">
                {finalResultsStatus.map((status: any, index: number) => (
                  <div key={index} className="flex justify-center items-center gap-4">
                    <span className="text-sm font-medium text-gray-600">
                      Academic Year: {status.academicYear} | Semester: {status.semester}
                    </span>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      status.hasFailure
                        ? 'bg-red-100 text-red-800 border border-red-200'
                        : 'bg-green-100 text-green-800 border border-green-200'
                    }`}>
                      {status.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm ml-24">
            <div>
              <p><span className="font-semibold">Student Name:</span> {studentProfile?.first_name} {studentProfile?.last_name}</p>
              <p><span className="font-semibold">Student ID:</span> {studentProfile?.student_id}</p>
            </div>
            <div>
              <p><span className="font-semibold">Batch:</span> {studentProfile?.batch || 'N/A'}</p>
              <p><span className="font-semibold">Program:</span> {studentProfile?.program || 'Nursing'}</p>
            </div>
            <div>
              <p><span className="font-semibold">Academic Year:</span> 2024/2025</p>
              <p><span className="font-semibold">Date:</span> {new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        {/* Final Results Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="bg-blue-50 px-6 py-3 border-b">
            <h3 className="text-lg font-semibold text-gray-800">Final Examination Results</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse border border-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase border border-gray-300">Subject</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase border border-gray-300">Academic Year</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase border border-gray-300">Semester</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase border border-gray-300">Final Score</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase border border-gray-300">Final Grade</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase border border-gray-300">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {examResults.length > 0 ? (
                  examResults.map((result: any) => {
                    return (
                      <tr key={result.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm font-medium text-gray-900 border border-gray-300">
                          {result.courses?.course_name || result.courses?.course_code}
                        </td>
                        <td className="px-4 py-2 text-center text-sm text-gray-900 border border-gray-300">
                          {result.academic_year || 'N/A'}
                        </td>
                        <td className="px-4 py-2 text-center text-sm text-gray-900 border border-gray-300">
                          {result.semester || 'N/A'}
                        </td>
                        <td className="px-4 py-2 text-center text-sm text-gray-900 border border-gray-300">
                          {result.final_score?.toFixed(1)}%
                        </td>
                        <td className="px-4 py-2 text-center text-sm text-gray-900 border border-gray-300">
                          {result.final_grade}
                        </td>
                        <td className="px-4 py-2 text-center text-sm text-gray-900 border border-gray-300">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            result.status === 'Pass' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {result.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500 border border-gray-300">
                      No final results available yet. Results will appear here once they are published by your lecturers.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Grading Scale and Signatures */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Grading Scale */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <h4 className="text-sm font-semibold text-gray-800 mb-3">Grading Scale:</h4>
            <div className="grid grid-cols-5 gap-2 text-xs">
              <div className="text-center border border-gray-300 p-1">
                <div className="font-semibold">A</div>
                <div>90-100</div>
              </div>
              <div className="text-center border border-gray-300 p-1">
                <div className="font-semibold">B</div>
                <div>80-89</div>
              </div>
              <div className="text-center border border-gray-300 p-1">
                <div className="font-semibold">C</div>
                <div>70-79</div>
              </div>
              <div className="text-center border border-gray-300 p-1">
                <div className="font-semibold">D</div>
                <div>60-69</div>
              </div>
              <div className="text-center border border-gray-300 p-1">
                <div className="font-semibold">F</div>
                <div>0-59</div>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-xs"><span className="font-semibold">Class:</span> ________________</p>
              <p className="text-xs"><span className="font-semibold">Description:</span> ________________</p>
            </div>
          </div>

          {/* Signatures */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="grid grid-cols-1 gap-6">
              <div className="text-center">
                <div className="border-b border-gray-400 mb-2 pb-8"></div>
                <p className="text-xs font-semibold">Signature of Class Teacher</p>
              </div>
              <div className="text-center">
                <div className="border-b border-gray-400 mb-2 pb-8"></div>
                <p className="text-xs font-semibold">Institution Seal</p>
              </div>
              <div className="text-center">
                <div className="border-b border-gray-400 mb-2 pb-8"></div>
                <p className="text-xs font-semibold">Principal Signature</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

const ExamSlipsTab = ({ studentId }: { studentId?: string }) => {
  const [enrolledCourses, setEnrolledCourses] = useState<any[]>([]);
  const [studentProfile, setStudentProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSemester, setSelectedSemester] = useState(1);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('2024-2025');

  useEffect(() => {
    if (studentId) {
      fetchEnrolledCourses();
      fetchStudentProfile();
    }
  }, [studentId]);

  const fetchEnrolledCourses = async () => {
    try {
      setLoading(true);
      const data = await studentAPI.getEnrolledCourses(studentId!);
      setEnrolledCourses(data || []);
    } catch (error) {
      console.error('Failed to fetch enrolled courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentProfile = async () => {
    try {
      const profileData = JSON.parse(localStorage.getItem('user_profile') || '{}');
      setStudentProfile(profileData);
    } catch (error) {
      console.error('Failed to fetch student profile:', error);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 0.5in;
          }
          body {
            margin: 0;
            font-family: 'Times New Roman', serif;
            background: linear-gradient(45deg, transparent 24%, rgba(0,0,0,0.02) 25%, rgba(0,0,0,0.02) 26%, transparent 27%, transparent 74%, rgba(0,0,0,0.02) 75%, rgba(0,0,0,0.02) 76%, transparent 77%),
                        linear-gradient(-45deg, transparent 24%, rgba(0,0,0,0.02) 25%, rgba(0,0,0,0.02) 26%, transparent 27%, transparent 74%, rgba(0,0,0,0.02) 75%, rgba(0,0,0,0.02) 76%, transparent 77%);
            background-size: 20px 20px;
          }
          .print\\:hidden { display: none !important; }
          .space-y-6 > * + * { margin-top: 1rem !important; }
          .shadow-md { box-shadow: none !important; }
          .rounded-lg { border-radius: 0 !important; }
          table {
            page-break-inside: avoid;
            border-collapse: collapse;
            width: 100%;
          }
          .grid { page-break-inside: avoid; }
          .guillotine-pattern {
            position: relative;
          }
          .guillotine-pattern::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background:
              repeating-linear-gradient(
                0deg,
                transparent,
                transparent 2px,
                rgba(0,0,0,0.03) 2px,
                rgba(0,0,0,0.03) 4px
              ),
              repeating-linear-gradient(
                90deg,
                transparent,
                transparent 2px,
                rgba(0,0,0,0.03) 2px,
                rgba(0,0,0,0.03) 4px
              );
            pointer-events: none;
            z-index: 1;
          }
          .security-watermark {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 72px;
            color: rgba(0,0,0,0.03);
            z-index: 0;
            pointer-events: none;
            font-weight: bold;
          }
        }
      `}</style>
      <div className="space-y-6 guillotine-pattern">
        {/* Security Watermark */}
        <div className="security-watermark">SANCTA MARIA COLLEGE</div>

        {/* Controls */}
        <div className="flex justify-between items-center mb-6 print:hidden">
          <h2 className="text-2xl font-bold text-gray-900">Exam Slips</h2>
          <div className="flex space-x-4">
            <select
              value={selectedAcademicYear}
              onChange={(e) => setSelectedAcademicYear(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="2024-2025">2024-2025</option>
              <option value="2023-2024">2023-2024</option>
            </select>
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value={1}>Semester 1</option>
              <option value={2}>Semester 2</option>
            </select>
            <button
              onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print Exam Slip
            </button>
          </div>
        </div>

        {/* Exam Slip */}
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="text-center border-b pb-6 mb-6">
            <h1 className="text-3xl font-bold text-blue-800 mb-2">SANCTA MARIA COLLEGE OF NURSING</h1>
            <h2 className="text-xl font-semibold text-gray-700">EXAMINATION SLIP</h2>
            <p className="text-lg text-gray-600 mt-2">Academic Year: {selectedAcademicYear} | Semester: {selectedSemester}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Student Information</h3>
              <div className="space-y-2">
                <p><span className="font-semibold">Student Name:</span> {studentProfile?.first_name} {studentProfile?.last_name}</p>
                <p><span className="font-semibold">Student ID:</span> {studentProfile?.student_id}</p>
                <p><span className="font-semibold">Program:</span> {studentProfile?.program || 'Nursing'}</p>
                <p><span className="font-semibold">Year of Study:</span> {studentProfile?.year_of_study || 'N/A'}</p>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Examination Details</h3>
              <div className="space-y-2">
                <p><span className="font-semibold">Examination Period:</span> {selectedSemester === 1 ? 'First Semester' : 'Second Semester'}</p>
                <p><span className="font-semibold">Academic Year:</span> {selectedAcademicYear}</p>
                <p><span className="font-semibold">Issue Date:</span> {new Date().toLocaleDateString()}</p>
                <p><span className="font-semibold">Status:</span> <span className="text-green-600 font-medium">Eligible</span></p>
              </div>
            </div>
          </div>

          {/* Enrolled Courses Table */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Enrolled Courses for Examination</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse border border-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase border border-gray-300">Course Code</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase border border-gray-300">Course Name</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 uppercase border border-gray-300">Credits</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase border border-gray-300">Lecturer</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 uppercase border border-gray-300">Exam Date</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 uppercase border border-gray-300">Time</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 uppercase border border-gray-300">Venue</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {enrolledCourses.map((enrollment: any) => (
                    <tr key={enrollment.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 border border-gray-300">
                        {enrollment.courses?.course_code}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 border border-gray-300">
                        {enrollment.courses?.course_name}
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-900 border border-gray-300">
                        {enrollment.courses?.credits || 3}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 border border-gray-300">
                        {enrollment.courses?.lecturers?.first_name} {enrollment.courses?.lecturers?.last_name}
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-900 border border-gray-300">
                        TBA
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-900 border border-gray-300">
                        TBA
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-900 border border-gray-300">
                        TBA
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Instructions and Signatures */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Examination Instructions</h3>
              <ul className="text-sm text-gray-700 space-y-2">
                <li>• Report to the examination venue 15 minutes before the scheduled time</li>
                <li>• Bring your student ID card and this examination slip</li>
                <li>• Mobile phones and electronic devices are not allowed</li>
                <li>• Follow all examination regulations and guidelines</li>
                <li>• Any form of academic dishonesty will result in disqualification</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Verification</h3>
              <div className="space-y-8">
                <div>
                  <p className="text-sm text-gray-600 mb-2">Academic Registrar</p>
                  <div className="border-b border-gray-300 w-48"></div>
                  <p className="text-xs text-gray-500 mt-1">Signature & Date</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-2">Student Signature</p>
                  <div className="border-b border-gray-300 w-48"></div>
                  <p className="text-xs text-gray-500 mt-1">Signature & Date</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-600">
              This examination slip is valid only for the specified academic period and must be presented during examinations.
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Generated on {new Date().toLocaleDateString()} | Sancta Maria College of Nursing
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

const EnrolledCoursesTab = ({ studentId }: { studentId?: string }) => {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (studentId) {
      fetchEnrolledCourses();
    }
  }, [studentId]);

  // Real-time updates for course enrollments
  useEffect(() => {
    if (!studentId) return;

    const subscription = supabase
      .channel('course_enrollments_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'course_enrollments',
          filter: `student_id=eq.${studentId}`
        },
        () => {
          fetchEnrolledCourses();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [studentId]);

  const fetchEnrolledCourses = async () => {
    try {
      setLoading(true);
      const data = await studentAPI.getEnrolledCourses(studentId!);
      setCourses(data || []);
    } catch (error) {
      console.error('Failed to fetch enrolled courses:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Enrolled Courses</h2>

      {courses.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">📚</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Enrolled Courses</h3>
          <p className="text-gray-600">Your enrolled courses will appear here once you are registered for courses.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((enrollment: any) => (
            <div key={enrollment.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{enrollment.courses?.course_name}</h3>
                <p className="text-sm text-gray-600">{enrollment.courses?.course_code}</p>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Credits:</span>
                  <span className="font-medium">{enrollment.courses?.credits || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Semester:</span>
                  <span className="font-medium">{enrollment.courses?.semester} / {enrollment.courses?.year}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Lecturer:</span>
                  <span className="font-medium">
                    {enrollment.courses?.lecturers ?
                      `Dr. ${enrollment.courses.lecturers.first_name} ${enrollment.courses.lecturers.last_name}` :
                      'Not assigned'
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Enrolled:</span>
                  <span className="font-medium">{new Date(enrollment.enrollment_date).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  enrollment.status === 'enrolled' ? 'bg-green-100 text-green-800' :
                  enrollment.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {enrollment.status}
                </span>
              </div>

              {enrollment.courses?.description && (
                <div className="mt-3">
                  <p className="text-sm text-gray-600 line-clamp-3">{enrollment.courses.description}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const StudentDashboard = () => {
  const [activeTab, setActiveTab] = useState('personal-info');
  const router = useRouter();
  const { user, profile, authState, logout } = useAuth();

  // Redirect if not authenticated or not a student
  useEffect(() => {
    if (authState === 'authenticated' && (!user || user.role !== 'student')) {
      router.push('/');
    }
  }, [authState, user, router]);



  const handleLogout = () => {
    logout();
  };

  const tabs = [
    { id: 'personal-info', label: 'Personal Information', icon: '👤' },
    { id: 'ca-results', label: 'Continuous Assessment', icon: '📊' },
    { id: 'exam-results', label: 'Final Results', icon: '📋' },
    { id: 'quiz-results', label: 'Quiz Results', icon: '🧠' },
    { id: 'attempt-quizzes', label: 'Attempt Quizzes', icon: '✏️' },
    { id: 'submit-assignments', label: 'Submit Assignments', icon: '📝' },
    { id: 'assignment-results', label: 'Assignment Results', icon: '📄' },
    { id: 'exam-slips', label: 'Exam Slips', icon: '🎫' },
    { id: 'enrolled-courses', label: 'Enrolled Courses', icon: '📚' },
    { id: 'calendar', label: 'Academic Calendar', icon: '📅' },
    { id: 'change-password', label: 'Change Password', icon: '🔒' },
    { id: 'invoices', label: 'Invoices', icon: '💰' },
    { id: 'financial-statements', label: 'Financial Statements', icon: '📈' }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'personal-info':
        return (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Personal Information</h2>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Student ID</label>
                  <p className="text-gray-900 font-semibold">{profile?.student_id || 'Not available'}</p>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <p className="text-gray-900">{profile?.phone || 'Not available'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                  <p className="text-gray-900">{profile?.date_of_birth ? new Date(profile.date_of_birth).toLocaleDateString() : 'Not available'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Program</label>
                  <p className="text-gray-900">{profile?.program || 'Not available'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year of Study</label>
                  <p className="text-gray-900">{profile?.year_of_study ? `Year ${profile.year_of_study}` : 'Not available'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
                  <p className="text-gray-900">{profile?.semester ? `Semester ${profile.semester}` : 'Not available'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    profile?.status === 'active' ? 'bg-green-100 text-green-800' :
                    profile?.status === 'suspended' ? 'bg-red-100 text-red-800' :
                    profile?.status === 'frozen' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {profile?.status || 'Unknown'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );

      case 'ca-results':
        return <CAResultsTab studentId={profile?.id} />;

      case 'exam-results':
        return <ExamResultsTab studentId={profile?.id} />;

      case 'quiz-results':
        return <StudentQuizResults studentId={profile?.id} />;

      case 'attempt-quizzes':
        return <StudentQuizInterface studentId={profile?.id} />;

      case 'submit-assignments':
        return <StudentAssignmentSubmission studentId={profile?.id} />;

      case 'assignment-results':
        return <StudentAssignmentResults studentId={profile?.id} />;

      case 'exam-slips':
        return <ExamSlipsTab studentId={profile?.id} />;

      case 'enrolled-courses':
        return <EnrolledCoursesTab studentId={profile?.id} />;

      case 'calendar':
        return (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Academic Calendar & Notifications</h2>
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📅</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Calendar Events</h3>
              <p className="text-gray-600">Academic calendar events and notifications will appear here.</p>
            </div>
          </div>
        );

      case 'change-password':
        return <ChangePasswordForm user={user} />;

      case 'invoices':
        return <StudentInvoices studentId={profile?.id} />;

      case 'financial-statements':
        return (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Financial Statements</h2>
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📈</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Financial Statements Available</h3>
              <p className="text-gray-600">Your financial statements and payment history will appear here.</p>
            </div>
          </div>
        );

      default:
        return <div>Tab content not found</div>;
    }
  };



  // Show loading state while checking authentication
  if (authState === 'loading' || authState === 'idle') {
    return <AuthLoadingOverlay message="Loading your dashboard..." subMessage="Please wait while we prepare your student portal" />;
  }

  // Redirect if not authenticated
  if (authState !== 'authenticated' || !user || user.role !== 'student') {
    return <AuthLoadingOverlay message="Redirecting..." subMessage="Taking you back to the login page" />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-xl font-bold text-gray-900">Student Portal</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                Welcome, {profile?.first_name || profile?.student_id || 'Student'}
              </span>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">Dashboard Menu</h3>
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

          {/* Main Content */}
          <div className="flex-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              {renderTabContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
