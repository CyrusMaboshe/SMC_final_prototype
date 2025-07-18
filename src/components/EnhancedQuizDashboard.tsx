'use client';

import React, { useState, useEffect } from 'react';
import { lecturerAPI, Quiz } from '@/lib/supabase';
import EnhancedQuizCreator from './EnhancedQuizCreator';
import QuizAnalyticsDashboard from './QuizAnalyticsDashboard';
import QuizNotifications from './QuizNotifications';

interface EnhancedQuizDashboardProps {
  profile: any;
  courses: any[];
}

const EnhancedQuizDashboard: React.FC<EnhancedQuizDashboardProps> = ({
  profile,
  courses
}) => {
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateQuiz, setShowCreateQuiz] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  useEffect(() => {
    loadQuizzes();
  }, [profile.id]);

  const loadQuizzes = async () => {
    try {
      setLoading(true);
      const data = await lecturerAPI.getQuizzes(profile.id);
      setQuizzes(data || []);
    } catch (err: any) {
      setError(err.message || 'Error loading quizzes');
    } finally {
      setLoading(false);
    }
  };

  const handleQuizCreated = (quiz: Quiz) => {
    setQuizzes(prev => [quiz, ...prev]);
    setShowCreateQuiz(false);
  };

  const handleToggleQuizStatus = async (quizId: string, isActive: boolean) => {
    try {
      await lecturerAPI.updateQuiz(quizId, { is_active: !isActive }, profile.id);
      setQuizzes(prev => prev.map(q => 
        q.id === quizId ? { ...q, is_active: !isActive } : q
      ));
    } catch (err: any) {
      setError(err.message || 'Error updating quiz status');
    }
  };

  const handleDeleteQuiz = async (quizId: string) => {
    if (!confirm('Are you sure you want to delete this quiz? This action cannot be undone.')) {
      return;
    }

    try {
      await lecturerAPI.deleteQuiz(quizId, profile.id);
      setQuizzes(prev => prev.filter(q => q.id !== quizId));
    } catch (err: any) {
      setError(err.message || 'Error deleting quiz');
    }
  };

  const getQuizStatusColor = (quiz: any) => {
    const now = new Date();
    const startTime = new Date(quiz.start_time);
    const endTime = new Date(quiz.end_time);

    if (!quiz.is_active) return 'bg-gray-100 text-gray-800';
    if (now < startTime) return 'bg-blue-100 text-blue-800';
    if (now > endTime) return 'bg-red-100 text-red-800';
    return 'bg-green-100 text-green-800';
  };

  const getQuizStatusText = (quiz: any) => {
    const now = new Date();
    const startTime = new Date(quiz.start_time);
    const endTime = new Date(quiz.end_time);

    if (!quiz.is_active) return 'Inactive';
    if (now < startTime) return 'Scheduled';
    if (now > endTime) return 'Ended';
    return 'Active';
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading quizzes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Quiz Management</h1>
          <p className="text-gray-600 mt-1">Create, manage, and analyze your quizzes</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <QuizNotifications 
            lecturerId={profile.id}
            onNotificationClick={(notification) => {
              // Handle notification click - could open specific quiz analytics
              if (notification.quiz_id) {
                const quiz = quizzes.find(q => q.id === notification.quiz_id);
                if (quiz) {
                  setSelectedQuiz(quiz);
                  setShowAnalytics(true);
                }
              }
            }}
          />
          
          <button
            onClick={() => setShowCreateQuiz(true)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Quiz
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}



      {/* Quiz Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {quizzes.map((quiz) => (
          <div key={quiz.id} className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-gray-900 truncate">
                  {quiz.title}
                </h3>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getQuizStatusColor(quiz)}`}>
                  {getQuizStatusText(quiz)}
                </span>
              </div>

              <div className="space-y-2 text-sm text-gray-600 mb-4">
                <p><strong>Course:</strong> {quiz.courses?.course_code}</p>
                <p><strong>Questions:</strong> {quiz.question_count}</p>
                <p><strong>Total Marks:</strong> {quiz.total_marks}</p>
                <p><strong>Time Limit:</strong> {quiz.time_limit ? `${quiz.time_limit} minutes` : 'No limit'}</p>
                <p><strong>Start:</strong> {formatDateTime(quiz.start_time)}</p>
                <p><strong>End:</strong> {formatDateTime(quiz.end_time)}</p>
              </div>

              <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
                <span>{quiz.total_attempts} attempts</span>
                <span>{quiz.completed_attempts} completed</span>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    setSelectedQuiz(quiz);
                    setShowAnalytics(true);
                  }}
                  className="flex-1 bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700"
                >
                  Analytics
                </button>
                
                <button
                  onClick={() => handleToggleQuizStatus(quiz.id, quiz.is_active)}
                  className={`px-3 py-2 rounded text-sm ${
                    quiz.is_active 
                      ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' 
                      : 'bg-green-100 text-green-800 hover:bg-green-200'
                  }`}
                >
                  {quiz.is_active ? 'Deactivate' : 'Activate'}
                </button>
                
                <button
                  onClick={() => handleDeleteQuiz(quiz.id)}
                  className="px-3 py-2 bg-red-100 text-red-800 rounded text-sm hover:bg-red-200"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {quizzes.length === 0 && (
        <div className="text-center py-12">
          <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No quizzes found</h3>
          <p className="text-gray-600 mb-4">
            Get started by creating your first quiz.
          </p>
          <button
            onClick={() => setShowCreateQuiz(true)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Create Your First Quiz
          </button>
        </div>
      )}

      {/* Modals */}
      {showCreateQuiz && (
        <EnhancedQuizCreator
          profile={profile}
          courses={courses}
          onQuizCreated={handleQuizCreated}
          onClose={() => setShowCreateQuiz(false)}
        />
      )}

      {showAnalytics && selectedQuiz && (
        <QuizAnalyticsDashboard
          profile={profile}
          quiz={selectedQuiz}
          onClose={() => {
            setShowAnalytics(false);
            setSelectedQuiz(null);
          }}
        />
      )}
    </div>
  );
};

export default EnhancedQuizDashboard;
