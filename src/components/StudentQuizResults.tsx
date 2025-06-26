'use client';

import React, { useState, useEffect } from 'react';
import { studentAPI } from '@/lib/supabase';

interface StudentQuizResultsProps {
  studentId: string;
}

interface QuizResult {
  id: string;
  quiz_id: string;
  attempt_number: number;
  score: number;
  percentage: number;
  started_at: string;
  completed_at: string;
  time_taken: number;
  status: string;
  quizzes: {
    title: string;
    total_marks: number;
    courses: {
      course_code: string;
      course_name: string;
    };
  };
}

const StudentQuizResults: React.FC<StudentQuizResultsProps> = ({ studentId }) => {
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedResult, setSelectedResult] = useState<QuizResult | null>(null);

  useEffect(() => {
    if (studentId) {
      loadQuizResults();
    }
  }, [studentId]);

  const loadQuizResults = async () => {
    try {
      setLoading(true);
      const data = await studentAPI.getQuizResults(studentId);
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

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Detailed result view
  if (selectedResult) {
    return (
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => setSelectedResult(null)}
          className="text-blue-600 hover:text-blue-800 mb-4 flex items-center"
        >
          ← Back to Results
        </button>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="border-b border-gray-200 pb-4 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {selectedResult.quizzes.title}
            </h2>
            <p className="text-gray-600">
              Course: {selectedResult.quizzes.courses.course_code} - {selectedResult.quizzes.courses.course_name}
            </p>
            <p className="text-sm text-gray-500">
              Attempt #{selectedResult.attempt_number} • Completed on {new Date(selectedResult.completed_at).toLocaleString()}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {selectedResult.score}/{selectedResult.quizzes.total_marks}
              </div>
              <div className="text-sm text-gray-600">Score</div>
            </div>
            
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className={`text-2xl font-bold mb-1 ${getGradeColor(selectedResult.percentage)}`}>
                {selectedResult.percentage.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Percentage</div>
            </div>
            
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className={`text-2xl font-bold mb-1 ${getGradeColor(selectedResult.percentage)}`}>
                {getGrade(selectedResult.percentage)}
              </div>
              <div className="text-sm text-gray-600">Grade</div>
            </div>
            
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {formatTime(selectedResult.time_taken)}
              </div>
              <div className="text-sm text-gray-600">Time Taken</div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">Performance Summary</h3>
            <p className="text-blue-800 text-sm">
              You scored {selectedResult.score} out of {selectedResult.quizzes.total_marks} marks 
              ({selectedResult.percentage.toFixed(1)}%) on this quiz. 
              {selectedResult.percentage >= 50 ? 
                'Congratulations on passing this quiz!' : 
                'Keep studying and try to improve on your next attempt.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Results list view
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Quiz Results</h2>
      
      {quizResults.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🧠</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Quiz Results Available</h3>
          <p className="text-gray-600">Your quiz results will appear here after completing quizzes.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {quizResults.map((result) => (
            <div key={result.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 mr-3">
                      {result.quizzes.title}
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getGradeBadgeColor(result.percentage)}`}>
                      {getGrade(result.percentage)} Grade
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-3">
                    Course: {result.quizzes.courses.course_code} - {result.quizzes.courses.course_name}
                  </p>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-600">Score:</span>
                      <div className="text-gray-900">{result.score}/{result.quizzes.total_marks}</div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Percentage:</span>
                      <div className={`font-medium ${getGradeColor(result.percentage)}`}>
                        {result.percentage.toFixed(1)}%
                      </div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Time Taken:</span>
                      <div className="text-gray-900">{formatTime(result.time_taken)}</div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Attempt:</span>
                      <div className="text-gray-900">#{result.attempt_number}</div>
                    </div>
                  </div>

                  <div className="mt-3 text-sm text-gray-500">
                    Completed on {new Date(result.completed_at).toLocaleString()}
                  </div>
                </div>

                <div className="ml-6">
                  <button
                    onClick={() => setSelectedResult(result)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    View Details
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentQuizResults;
