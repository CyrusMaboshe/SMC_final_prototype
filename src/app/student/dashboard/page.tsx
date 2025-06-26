'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, StudentProfile, supabase, studentAPI } from '@/lib/supabase';

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (studentId) {
      fetchCAResults();
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

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Continuous Assessment Results</h2>

      {caResults.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">📊</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No CA Results Available</h3>
          <p className="text-gray-600">Your continuous assessment results will appear here once published by lecturers.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {caResults.map((result: any) => (
            <div key={result.id} className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{result.assessment_name}</h3>
                  <p className="text-sm text-gray-600">
                    {result.courses?.course_code} - {result.courses?.course_name}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600">
                    {result.score}/{result.max_score}
                  </div>
                  <div className="text-sm text-gray-600">
                    {result.percentage?.toFixed(1)}%
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center text-sm text-gray-500 mb-3">
                <span>Assessment Date: {new Date(result.assessment_date).toLocaleDateString()}</span>
                <span>Added: {new Date(result.created_at).toLocaleDateString()}</span>
              </div>

              <div className="flex justify-between items-center mb-4">
                <div className="w-full bg-gray-200 rounded-full h-2 mr-4">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${result.percentage || 0}%` }}
                  ></div>
                </div>
                {getStatusBadge(result.percentage)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const ExamResultsTab = ({ studentId }: { studentId?: string }) => {
  const [examResults, setExamResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (studentId) {
      fetchExamResults();
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

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Final Exam Results</h2>

      {examResults.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">📋</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Final Results Available</h3>
          <p className="text-gray-600">Your final exam results will appear here once published by lecturers.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {examResults.map((result: any) => (
            <div key={result.id} className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Final Exam Result</h3>
                  <p className="text-sm text-gray-600">
                    {result.courses?.course_code} - {result.courses?.course_name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {result.academic_year} - Semester {result.semester}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600">
                    {result.final_score}%
                  </div>
                  <div className="text-sm text-gray-600">
                    Grade: {result.final_grade} | GPA: {result.gpa_points}
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center text-sm text-gray-500 mb-3">
                <span>Academic Year: {result.academic_year}</span>
                <span>Published: {new Date(result.submission_date).toLocaleDateString()}</span>
              </div>

              <div className="flex justify-between items-center mb-4">
                <div className="w-full bg-gray-200 rounded-full h-2 mr-4">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      (result.final_score || 0) >= 70 ? 'bg-green-600' :
                      (result.final_score || 0) >= 50 ? 'bg-yellow-600' : 'bg-red-600'
                    }`}
                    style={{ width: `${result.final_score || 0}%` }}
                  ></div>
                </div>
                {getStatusBadge(result.status)}
              </div>

              {result.comments && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700">
                    <strong>Comments:</strong> {result.comments}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
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
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('personal-info');
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const currentUser = authAPI.getCurrentUser();
      if (!currentUser || currentUser.role !== 'student') {
        router.push('/');
        return;
      }
      setUser(currentUser);

      // Fetch fresh student profile from database
      await fetchStudentProfile(currentUser.id);
    } catch (error) {
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentProfile = async (userId: string) => {
    try {
      console.log('Fetching student profile for user ID:', userId);
      const { data, error } = await supabase
        .rpc('get_student_profile', { p_user_id: userId });

      console.log('Student profile response:', { data, error });

      if (error) throw error;
      if (data) {
        console.log('Setting profile data:', data);
        setProfile(data);
        // Update localStorage with fresh data
        localStorage.setItem('user_profile', JSON.stringify(data));
      }
    } catch (error) {
      console.error('Failed to fetch student profile:', error);
    }
  };

  const handleLogout = () => {
    authAPI.logout();
    router.push('/');
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
        return (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Quiz Results</h2>
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🧠</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Quiz Results Available</h3>
              <p className="text-gray-600">Your quiz results will appear here after completing quizzes.</p>
            </div>
          </div>
        );

      case 'attempt-quizzes':
        return (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Available Quizzes</h2>
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">✏️</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Quizzes Available</h3>
              <p className="text-gray-600">Available quizzes will appear here when published by your lecturers.</p>
            </div>
          </div>
        );

      case 'submit-assignments':
        return (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Submit Assignments</h2>
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📝</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Assignments Available</h3>
              <p className="text-gray-600">Assignment submissions will be available here when assignments are published.</p>
            </div>
          </div>
        );

      case 'assignment-results':
        return (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Assignment Results</h2>
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📄</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Assignment Results Available</h3>
              <p className="text-gray-600">Your assignment results and feedback will appear here once graded.</p>
            </div>
          </div>
        );

      case 'exam-slips':
        return (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Exam Slips</h2>
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🎫</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Exam Slips Available</h3>
              <p className="text-gray-600">Your exam slips will be available here before exam periods.</p>
            </div>
          </div>
        );

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
        return (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Invoices</h2>
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">💰</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Invoices Available</h3>
              <p className="text-gray-600">Your invoices and billing information will appear here.</p>
            </div>
          </div>
        );

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
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
