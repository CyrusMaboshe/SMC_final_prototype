'use client';

import React, { useState, useEffect } from 'react';
import { lecturerAPI } from '@/lib/supabase';

interface QuizResultsAnalyticsProps {
  lecturerId: string;
  quizzes: any[];
}

interface QuizResult {
  id: string;
  quiz_id: string;
  student_id: string;
  attempt_number: number;
  score: number;
  percentage: number;
  started_at: string;
  completed_at: string;
  time_taken: number;
  status: string;
  students: {
    student_id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  quizzes: {
    id: string;
    title: string;
    total_marks: number;
    courses: {
      id: string;
      course_code: string;
      course_name: string;
    };
  };
}

const QuizResultsAnalytics: React.FC<QuizResultsAnalyticsProps> = ({ lecturerId, quizzes }) => {
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuiz, setSelectedQuiz] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'score' | 'student'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    if (lecturerId) {
      loadQuizResults();
    }
  }, [lecturerId, selectedQuiz]);

  const loadQuizResults = async () => {
    try {
      setLoading(true);
      const quizId = selectedQuiz === 'all' ? undefined : selectedQuiz;
      const data = await lecturerAPI.getQuizResults(lecturerId, quizId);
      setQuizResults(data || []);
    } catch (error) {
      console.error('Error loading quiz results:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    return `${minutes}m ${secs}s`;
  };

  const getGradeColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 70) return 'text-blue-600';
    if (percentage >= 60) return 'text-yellow-600';
    if (percentage >= 50) return 'text-orange-600';
    return 'text-red-600';
  };

  const getGradeBadgeColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-100 text-green-800';
    if (percentage >= 70) return 'bg-blue-100 text-blue-800';
    if (percentage >= 60) return 'bg-yellow-100 text-yellow-800';
    if (percentage >= 50) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  const getGrade = (percentage: number) => {
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B';
    if (percentage >= 60) return 'C';
    if (percentage >= 50) return 'D';
    return 'F';
  };

  // Calculate analytics
  const analytics = React.useMemo(() => {
    if (quizResults.length === 0) return null;

    const totalAttempts = quizResults.length;
    const averageScore = quizResults.reduce((sum, result) => sum + result.percentage, 0) / totalAttempts;
    const highestScore = Math.max(...quizResults.map(r => r.percentage));
    const lowestScore = Math.min(...quizResults.map(r => r.percentage));
    const passRate = (quizResults.filter(r => r.percentage >= 50).length / totalAttempts) * 100;
    
    const gradeDistribution = {
      A: quizResults.filter(r => r.percentage >= 80).length,
      B: quizResults.filter(r => r.percentage >= 70 && r.percentage < 80).length,
      C: quizResults.filter(r => r.percentage >= 60 && r.percentage < 70).length,
      D: quizResults.filter(r => r.percentage >= 50 && r.percentage < 60).length,
      F: quizResults.filter(r => r.percentage < 50).length,
    };

    const averageTime = quizResults.reduce((sum, result) => sum + result.time_taken, 0) / totalAttempts;

    return {
      totalAttempts,
      averageScore,
      highestScore,
      lowestScore,
      passRate,
      gradeDistribution,
      averageTime
    };
  }, [quizResults]);

  // Sort results
  const sortedResults = React.useMemo(() => {
    const sorted = [...quizResults].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.completed_at).getTime() - new Date(b.completed_at).getTime();
          break;
        case 'score':
          comparison = a.percentage - b.percentage;
          break;
        case 'student':
          comparison = `${a.students?.first_name || ''} ${a.students?.last_name || ''}`.localeCompare(
            `${b.students?.first_name || ''} ${b.students?.last_name || ''}`
          );
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return sorted;
  }, [quizResults, sortBy, sortOrder]);

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
        <h2 className="text-2xl font-bold text-gray-900">Quiz Results & Analytics</h2>
        
        <div className="flex space-x-3">
          <select
            value={selectedQuiz}
            onChange={(e) => setSelectedQuiz(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Quizzes</option>
            {quizzes.map((quiz) => (
              <option key={quiz.id} value={quiz.id}>
                {quiz.title}
              </option>
            ))}
          </select>
          
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-');
              setSortBy(field as 'date' | 'score' | 'student');
              setSortOrder(order as 'asc' | 'desc');
            }}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="date-desc">Latest First</option>
            <option value="date-asc">Oldest First</option>
            <option value="score-desc">Highest Score</option>
            <option value="score-asc">Lowest Score</option>
            <option value="student-asc">Student A-Z</option>
            <option value="student-desc">Student Z-A</option>
          </select>
        </div>
      </div>

      {/* Analytics Dashboard */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-2xl font-bold text-gray-900 mb-1">{analytics.totalAttempts}</div>
            <div className="text-sm text-gray-600">Total Attempts</div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-2xl font-bold text-blue-600 mb-1">{analytics.averageScore.toFixed(1)}%</div>
            <div className="text-sm text-gray-600">Average Score</div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-2xl font-bold text-green-600 mb-1">{analytics.passRate.toFixed(1)}%</div>
            <div className="text-sm text-gray-600">Pass Rate (≥50%)</div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-2xl font-bold text-gray-900 mb-1">{formatTime(Math.round(analytics.averageTime))}</div>
            <div className="text-sm text-gray-600">Average Time</div>
          </div>
        </div>
      )}

      {/* Grade Distribution */}
      {analytics && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Grade Distribution</h3>
          <div className="grid grid-cols-5 gap-4">
            {Object.entries(analytics.gradeDistribution).map(([grade, count]) => (
              <div key={grade} className="text-center">
                <div className={`text-2xl font-bold mb-1 ${getGradeColor(
                  grade === 'A' ? 85 : grade === 'B' ? 75 : grade === 'C' ? 65 : grade === 'D' ? 55 : 45
                )}`}>
                  {count}
                </div>
                <div className="text-sm text-gray-600">Grade {grade}</div>
                <div className="text-xs text-gray-500">
                  {analytics.totalAttempts > 0 ? ((count / analytics.totalAttempts) * 100).toFixed(1) : 0}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results Table */}
      {quizResults.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">📊</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Quiz Results Available</h3>
          <p className="text-gray-600">Quiz results will appear here once students complete quizzes.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quiz
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Grade
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time Taken
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Completed
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Attempt
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedResults.map((result) => (
                  <tr key={result.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {result.students?.first_name || 'N/A'} {result.students?.last_name || ''}
                        </div>
                        <div className="text-sm text-gray-500">{result.students?.student_id || 'N/A'}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{result.quizzes?.title || 'N/A'}</div>
                      <div className="text-sm text-gray-500">{result.quizzes?.courses?.course_code || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {result.score}/{result.quizzes?.total_marks || 0}
                      </div>
                      <div className={`text-sm font-medium ${getGradeColor(result.percentage)}`}>
                        {result.percentage.toFixed(1)}%
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getGradeBadgeColor(result.percentage)}`}>
                        {getGrade(result.percentage)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatTime(result.time_taken)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(result.completed_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      #{result.attempt_number}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizResultsAnalytics;
