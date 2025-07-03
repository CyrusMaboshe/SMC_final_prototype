'use client';

import React, { useState, useEffect } from 'react';
import { lecturerAPI, Quiz, QuizQuestion } from '@/lib/supabase';

interface QuizAnalyticsDashboardProps {
  profile: any;
  quiz: Quiz;
  onClose?: () => void;
}

interface QuizAttempt {
  id: string;
  student_id: string;
  student_name: string;
  attempt_number: number;
  score: number;
  percentage: number;
  started_at: string;
  completed_at: string;
  time_taken: number;
  status: string;
  answers: Record<string, string>;
}

interface QuestionAnalytics {
  question_id: string;
  question_text: string;
  total_attempts: number;
  correct_answers: number;
  incorrect_answers: number;
  success_rate: number;
  option_distribution: Record<string, number>;
  average_time_spent: number;
}

const QuizAnalyticsDashboard: React.FC<QuizAnalyticsDashboardProps> = ({
  profile,
  quiz,
  onClose
}) => {
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [questionAnalytics, setQuestionAnalytics] = useState<QuestionAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'attempts' | 'questions'>('overview');

  useEffect(() => {
    loadAnalyticsData();
  }, [quiz.id]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      
      // Load quiz attempts
      const attemptsData = await lecturerAPI.getQuizAttempts(quiz.id, profile.id);
      setAttempts(attemptsData);

      // Load questions
      const questionsData = await lecturerAPI.getQuizQuestions(quiz.id, profile.id);
      setQuestions(questionsData);

      // Calculate question analytics
      const analytics = calculateQuestionAnalytics(questionsData, attemptsData);
      setQuestionAnalytics(analytics);

    } catch (err: any) {
      setError(err.message || 'Error loading analytics data');
    } finally {
      setLoading(false);
    }
  };

  const calculateQuestionAnalytics = (questions: QuizQuestion[], attempts: QuizAttempt[]): QuestionAnalytics[] => {
    return questions.map(question => {
      const questionAttempts = attempts.filter(attempt => 
        attempt.answers && attempt.answers[question.id]
      );

      const correctAnswers = questionAttempts.filter(attempt => 
        attempt.answers[question.id] === question.correct_answer
      ).length;

      const incorrectAnswers = questionAttempts.length - correctAnswers;
      const successRate = questionAttempts.length > 0 ? (correctAnswers / questionAttempts.length) * 100 : 0;

      // Calculate option distribution
      const optionDistribution: Record<string, number> = {};
      if (question.options) {
        ['a', 'b', 'c', 'd'].forEach(option => {
          optionDistribution[option] = questionAttempts.filter(attempt => 
            attempt.answers[question.id] === option
          ).length;
        });
      }

      return {
        question_id: question.id,
        question_text: question.question_text,
        total_attempts: questionAttempts.length,
        correct_answers: correctAnswers,
        incorrect_answers: incorrectAnswers,
        success_rate: successRate,
        option_distribution: optionDistribution,
        average_time_spent: 0 // This would need to be calculated from detailed timing data
      };
    });
  };

  const getOverviewStats = () => {
    const totalAttempts = attempts.length;
    const completedAttempts = attempts.filter(a => a.status === 'completed').length;
    const averageScore = completedAttempts > 0 
      ? attempts.filter(a => a.status === 'completed')
          .reduce((sum, a) => sum + a.percentage, 0) / completedAttempts 
      : 0;
    
    const highestScore = Math.max(...attempts.map(a => a.percentage), 0);
    const lowestScore = completedAttempts > 0 ? Math.min(...attempts.filter(a => a.status === 'completed').map(a => a.percentage)) : 0;

    return {
      totalAttempts,
      completedAttempts,
      averageScore: Math.round(averageScore * 10) / 10,
      highestScore,
      lowestScore
    };
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const stats = getOverviewStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-blue-600 text-white p-6 rounded-t-lg">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Quiz Analytics</h2>
              <p className="text-blue-100 mt-1">{quiz.title}</p>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="text-white hover:text-gray-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'attempts', label: 'Student Attempts' },
              { id: 'questions', label: 'Question Analysis' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h3 className="text-sm font-medium text-blue-800">Total Attempts</h3>
                  <p className="text-2xl font-bold text-blue-900">{stats.totalAttempts}</p>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <h3 className="text-sm font-medium text-green-800">Completed</h3>
                  <p className="text-2xl font-bold text-green-900">{stats.completedAttempts}</p>
                </div>
                
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <h3 className="text-sm font-medium text-purple-800">Average Score</h3>
                  <p className="text-2xl font-bold text-purple-900">{stats.averageScore}%</p>
                </div>
                
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <h3 className="text-sm font-medium text-yellow-800">Highest Score</h3>
                  <p className="text-2xl font-bold text-yellow-900">{stats.highestScore}%</p>
                </div>
                
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <h3 className="text-sm font-medium text-red-800">Lowest Score</h3>
                  <p className="text-2xl font-bold text-red-900">{stats.lowestScore}%</p>
                </div>
              </div>

              {/* Score Distribution Chart */}
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-4">Score Distribution</h3>
                <div className="space-y-2">
                  {['90-100%', '80-89%', '70-79%', '60-69%', '50-59%', 'Below 50%'].map((range, index) => {
                    const min = index === 5 ? 0 : 90 - (index * 10);
                    const max = index === 0 ? 100 : 100 - (index * 10);
                    const count = attempts.filter(a => 
                      a.status === 'completed' && a.percentage >= min && a.percentage <= max
                    ).length;
                    const percentage = stats.completedAttempts > 0 ? (count / stats.completedAttempts) * 100 : 0;
                    
                    return (
                      <div key={range} className="flex items-center">
                        <div className="w-20 text-sm text-gray-600">{range}</div>
                        <div className="flex-1 bg-gray-200 rounded-full h-4 mx-4">
                          <div 
                            className="bg-blue-500 h-4 rounded-full transition-all duration-300"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <div className="w-16 text-sm text-gray-600 text-right">
                          {count} ({Math.round(percentage)}%)
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Attempts Tab */}
          {activeTab === 'attempts' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Student Attempts</h3>
              
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Student
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Attempt
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Score
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Percentage
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Time Taken
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Completed At
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {attempts.map((attempt) => (
                      <tr key={attempt.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {attempt.student_name || 'Unknown Student'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {attempt.attempt_number}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {attempt.score}/{quiz.total_marks}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            attempt.percentage >= 80 ? 'bg-green-100 text-green-800' :
                            attempt.percentage >= 60 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {attempt.percentage}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {attempt.time_taken ? formatDuration(attempt.time_taken) : 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            attempt.status === 'completed' ? 'bg-green-100 text-green-800' :
                            attempt.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {attempt.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {attempt.completed_at ? new Date(attempt.completed_at).toLocaleString() : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Questions Tab */}
          {activeTab === 'questions' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Question Analysis</h3>
              
              {questionAnalytics.map((analytics, index) => (
                <div key={analytics.question_id} className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-800">Question {index + 1}</h4>
                      <p className="text-gray-600 mt-1">{analytics.question_text}</p>
                    </div>
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${
                        analytics.success_rate >= 80 ? 'text-green-600' :
                        analytics.success_rate >= 60 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {Math.round(analytics.success_rate)}%
                      </div>
                      <div className="text-sm text-gray-500">Success Rate</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-lg font-semibold text-gray-800">{analytics.total_attempts}</div>
                      <div className="text-sm text-gray-500">Total Attempts</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-green-600">{analytics.correct_answers}</div>
                      <div className="text-sm text-gray-500">Correct</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-red-600">{analytics.incorrect_answers}</div>
                      <div className="text-sm text-gray-500">Incorrect</div>
                    </div>
                  </div>

                  {/* Option distribution */}
                  <div>
                    <h5 className="font-medium text-gray-700 mb-2">Answer Distribution</h5>
                    <div className="space-y-2">
                      {Object.entries(analytics.option_distribution).map(([option, count]) => {
                        const percentage = analytics.total_attempts > 0 ? (count / analytics.total_attempts) * 100 : 0;
                        const question = questions.find(q => q.id === analytics.question_id);
                        const isCorrect = question?.correct_answer === option;
                        
                        return (
                          <div key={option} className="flex items-center">
                            <div className="w-8 text-sm font-medium">
                              {option.toUpperCase()}
                              {isCorrect && <span className="text-green-600 ml-1">✓</span>}
                            </div>
                            <div className="flex-1 bg-gray-200 rounded-full h-4 mx-4">
                              <div 
                                className={`h-4 rounded-full transition-all duration-300 ${
                                  isCorrect ? 'bg-green-500' : 'bg-gray-400'
                                }`}
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                            <div className="w-16 text-sm text-gray-600 text-right">
                              {count} ({Math.round(percentage)}%)
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizAnalyticsDashboard;
