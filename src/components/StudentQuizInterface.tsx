'use client';

import React, { useState, useEffect } from 'react';
import { studentAPI } from '@/lib/supabase';

interface StudentQuizInterfaceProps {
  studentId: string;
}

interface Quiz {
  id: string;
  title: string;
  description?: string;
  instructions?: string;
  time_limit?: number;
  max_attempts?: number;
  total_marks: number;
  start_time: string;
  end_time: string;
  courses: {
    course_code: string;
    course_name: string;
  };
  quiz_attempts: any[];
  attempts_used?: number;
  attempts_remaining?: number;
}

const StudentQuizInterface: React.FC<StudentQuizInterfaceProps> = ({ studentId }) => {
  const [availableQuizzes, setAvailableQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuiz, setSelectedQuiz] = useState<any>(null);
  const [currentAttempt, setCurrentAttempt] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [completionResult, setCompletionResult] = useState<any>(null);

  useEffect(() => {
    if (studentId) {
      loadAvailableQuizzes();
    }
  }, [studentId]);

  // Timer effect
  useEffect(() => {
    if (timeRemaining !== null && timeRemaining > 0 && quizStarted && !quizCompleted) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev && prev <= 1) {
            // Auto-submit when time runs out
            handleSubmitQuiz();
            return 0;
          }
          return prev ? prev - 1 : 0;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [timeRemaining, quizStarted, quizCompleted]);

  const loadAvailableQuizzes = async () => {
    try {
      setLoading(true);
      const data = await studentAPI.getAvailableQuizzes(studentId);
      setAvailableQuizzes(data || []);
    } catch (error) {
      console.error('Error loading available quizzes:', error);
    } finally {
      setLoading(false);
    }
  };

  const startQuiz = async (quiz: Quiz) => {
    try {
      // Get quiz details with questions
      const quizData = await studentAPI.getQuizForAttempt(quiz.id, studentId);
      setSelectedQuiz(quizData);
      setQuestions(quizData.quiz_questions || []);

      // Start the attempt
      const attempt = await studentAPI.startQuizAttempt(quiz.id, studentId);
      setCurrentAttempt(attempt);
      
      // Set timer if quiz has time limit
      if (quizData.time_limit) {
        setTimeRemaining(quizData.time_limit * 60); // Convert minutes to seconds
      }

      setQuizStarted(true);
      setCurrentQuestionIndex(0);
      setAnswers({});
    } catch (error: any) {
      alert(error.message || 'Error starting quiz');
    }
  };

  const saveAnswer = async (questionId: string, answer: string) => {
    try {
      setAnswers(prev => ({ ...prev, [questionId]: answer }));
      if (currentAttempt) {
        await studentAPI.saveQuizAnswer(currentAttempt.id, questionId, answer);
      }
    } catch (error) {
      console.error('Error saving answer:', error);
    }
  };

  const handleSubmitQuiz = async () => {
    if (!currentAttempt) return;

    try {
      const result = await studentAPI.submitQuizAttempt(currentAttempt.id);
      setCompletionResult(result);
      setQuizCompleted(true);
      setQuizStarted(false);
    } catch (error: any) {
      alert(error.message || 'Error submitting quiz');
    }
  };

  const resetQuizState = () => {
    setSelectedQuiz(null);
    setCurrentAttempt(null);
    setQuestions([]);
    setAnswers({});
    setCurrentQuestionIndex(0);
    setTimeRemaining(null);
    setQuizStarted(false);
    setQuizCompleted(false);
    setCompletionResult(null);
    loadAvailableQuizzes();
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeColor = (seconds: number, totalSeconds: number) => {
    const percentage = (seconds / totalSeconds) * 100;
    if (percentage <= 10) return 'text-red-600';
    if (percentage <= 25) return 'text-yellow-600';
    return 'text-green-600';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Quiz completion screen
  if (quizCompleted && completionResult) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">✅</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Quiz Completed!</h2>
          <div className="space-y-3 mb-6">
            <div className="text-lg">
              <span className="font-medium">Score:</span> {completionResult.score}/{selectedQuiz?.total_marks}
            </div>
            <div className="text-lg">
              <span className="font-medium">Percentage:</span> {completionResult.percentage.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">
              <span className="font-medium">Time Taken:</span> {formatTime(completionResult.time_taken)}
            </div>
          </div>
          <button
            onClick={resetQuizState}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Back to Quizzes
          </button>
        </div>
      </div>
    );
  }

  // Quiz taking interface
  if (quizStarted && selectedQuiz && questions.length > 0) {
    const currentQuestion = questions[currentQuestionIndex];
    const totalQuestions = questions.length;

    return (
      <div className="max-w-4xl mx-auto">
        {/* Quiz Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{selectedQuiz.title}</h2>
              <p className="text-sm text-gray-600">
                Question {currentQuestionIndex + 1} of {totalQuestions}
              </p>
            </div>
            <div className="text-right">
              {timeRemaining !== null && (
                <div className={`text-lg font-bold ${getTimeColor(timeRemaining, selectedQuiz.time_limit * 60)}`}>
                  Time: {formatTime(timeRemaining)}
                </div>
              )}
              <div className="text-sm text-gray-600">
                Total Marks: {selectedQuiz.total_marks}
              </div>
            </div>
          </div>
        </div>

        {/* Question */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
                Question {currentQuestionIndex + 1}
              </span>
              <span className="bg-green-100 text-green-800 text-sm font-medium px-3 py-1 rounded-full">
                {currentQuestion.marks} marks
              </span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {currentQuestion.question_text}
            </h3>
          </div>

          {/* Answer Input */}
          {currentQuestion.question_type === 'multiple_choice' ? (
            <div className="space-y-3">
              {currentQuestion.options?.map((option: string, index: number) => (
                <label key={index} className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name={`question_${currentQuestion.id}`}
                    value={option}
                    checked={answers[currentQuestion.id] === option}
                    onChange={(e) => saveAnswer(currentQuestion.id, e.target.value)}
                    className="w-4 h-4 text-blue-600 mr-3"
                  />
                  <span className="font-medium text-gray-700 mr-2">
                    {String.fromCharCode(65 + index)}.
                  </span>
                  <span className="text-gray-900">{option}</span>
                </label>
              ))}
            </div>
          ) : currentQuestion.question_type === 'checkbox' ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 mb-3">Select all correct answers:</p>
              {currentQuestion.options?.map((option: string, index: number) => {
                const currentAnswers = answers[currentQuestion.id] ? answers[currentQuestion.id].split('|') : [];
                return (
                  <label key={index} className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={currentAnswers.includes(option)}
                      onChange={(e) => {
                        let newAnswers;
                        if (e.target.checked) {
                          newAnswers = [...currentAnswers, option];
                        } else {
                          newAnswers = currentAnswers.filter(ans => ans !== option);
                        }
                        saveAnswer(currentQuestion.id, newAnswers.join('|'));
                      }}
                      className="w-4 h-4 text-blue-600 mr-3"
                    />
                    <span className="font-medium text-gray-700 mr-2">
                      {String.fromCharCode(65 + index)}.
                    </span>
                    <span className="text-gray-900">{option}</span>
                  </label>
                );
              })}
            </div>
          ) : (
            <div>
              <input
                type="text"
                value={answers[currentQuestion.id] || ''}
                onChange={(e) => saveAnswer(currentQuestion.id, e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your answer here..."
              />
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center">
            <button
              onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
              disabled={currentQuestionIndex === 0}
              className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            <div className="flex space-x-2">
              {questions.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentQuestionIndex(index)}
                  className={`w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                    index === currentQuestionIndex
                      ? 'bg-blue-600 text-white'
                      : answers[questions[index].id]
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {index + 1}
                </button>
              ))}
            </div>

            <div className="flex space-x-3">
              {currentQuestionIndex < totalQuestions - 1 ? (
                <button
                  onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to submit your quiz? You cannot change your answers after submission.')) {
                      handleSubmitQuiz();
                    }
                  }}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
                >
                  Submit Quiz
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Available quizzes list
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Available Quizzes</h2>

      {availableQuizzes.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">✏️</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Quizzes Available</h3>
          <p className="text-gray-600">Available quizzes will appear here when published by your lecturers.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {availableQuizzes.map((quiz) => {
            const now = new Date();
            const startTime = new Date(quiz.start_time);
            const endTime = new Date(quiz.end_time);
            const isActive = now >= startTime && now <= endTime;
            const hasStarted = now >= startTime;
            const hasEnded = now > endTime;

            // Count completed attempts
            const completedAttempts = quiz.quiz_attempts?.filter(attempt => attempt.status === 'completed').length || 0;
            const canAttempt = quiz.max_attempts ? completedAttempts < quiz.max_attempts : true;

            return (
              <div key={quiz.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{quiz.title}</h3>
                    <p className="text-sm text-gray-600 mb-3">
                      Course: {quiz.courses.course_code} - {quiz.courses.course_name}
                    </p>

                    {quiz.description && (
                      <p className="text-gray-700 mb-4">{quiz.description}</p>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                      <div>
                        <span className="font-medium text-gray-600">Total Marks:</span>
                        <div className="text-gray-900">{quiz.total_marks}</div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Time Limit:</span>
                        <div className="text-gray-900">
                          {quiz.time_limit ? `${quiz.time_limit} minutes` : 'No limit'}
                        </div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Attempts:</span>
                        <div className="text-gray-900">
                          {completedAttempts}/{quiz.max_attempts || '∞'}
                        </div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Status:</span>
                        <div className={`font-medium ${
                          hasEnded ? 'text-red-600' :
                          isActive ? 'text-green-600' :
                          'text-yellow-600'
                        }`}>
                          {hasEnded ? 'Ended' : isActive ? 'Active' : 'Not Started'}
                        </div>
                      </div>
                    </div>

                    <div className="text-sm text-gray-600 mb-4">
                      <div>
                        <span className="font-medium">Start:</span> {new Date(quiz.start_time).toLocaleString()}
                      </div>
                      <div>
                        <span className="font-medium">End:</span> {new Date(quiz.end_time).toLocaleString()}
                      </div>
                    </div>

                    {quiz.instructions && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                        <h4 className="font-medium text-blue-900 mb-1">Instructions:</h4>
                        <p className="text-blue-800 text-sm">{quiz.instructions}</p>
                      </div>
                    )}
                  </div>

                  <div className="ml-6">
                    {isActive && canAttempt ? (
                      <button
                        onClick={() => startQuiz(quiz)}
                        className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                      >
                        Start Quiz
                      </button>
                    ) : (
                      <div className="text-center">
                        <button
                          disabled
                          className="bg-gray-300 text-gray-500 px-6 py-2 rounded-lg font-medium cursor-not-allowed"
                        >
                          {hasEnded ? 'Quiz Ended' :
                           !hasStarted ? 'Not Started' :
                           !canAttempt ? 'Max Attempts Reached' : 'Unavailable'}
                        </button>
                        {!canAttempt && !hasEnded && (
                          <p className="text-xs text-gray-500 mt-1">
                            You have used all {quiz.max_attempts} attempts
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StudentQuizInterface;
