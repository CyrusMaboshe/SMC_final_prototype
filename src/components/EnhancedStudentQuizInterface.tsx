'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { studentAPI, Quiz, QuizQuestion } from '@/lib/supabase';

interface EnhancedStudentQuizInterfaceProps {
  studentId: string;
}

interface QuizAnswer {
  questionId: string;
  selectedOption: string;
  answeredAt: Date;
}

const EnhancedStudentQuizInterface: React.FC<EnhancedStudentQuizInterfaceProps> = ({
  studentId
}) => {
  const [availableQuizzes, setAvailableQuizzes] = useState<Quiz[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, QuizAnswer>>({});
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [currentAttempt, setCurrentAttempt] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [autoSaving, setAutoSaving] = useState(false);

  // Initialize quiz
  useEffect(() => {
    loadAvailableQuizzes();
  }, [studentId]);

  useEffect(() => {
    if (selectedQuiz?.id && studentId) {
      loadQuizData();
    }
  }, [selectedQuiz?.id, studentId]);

  // Timer effect
  useEffect(() => {
    if (quizStarted && timeRemaining > 0 && !quizCompleted) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            // Auto-submit when time runs out
            handleAutoSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [quizStarted, timeRemaining, quizCompleted]);

  // Auto-save answers every 30 seconds
  useEffect(() => {
    if (quizStarted && !quizCompleted && currentAttempt) {
      const autoSaveTimer = setInterval(() => {
        autoSaveAnswers();
      }, 30000); // Auto-save every 30 seconds

      return () => clearInterval(autoSaveTimer);
    }
  }, [quizStarted, quizCompleted, currentAttempt, answers]);

  const loadAvailableQuizzes = async () => {
    try {
      setLoading(true);
      const quizzes = await studentAPI.getAvailableQuizzes(studentId);
      setAvailableQuizzes(quizzes);
    } catch (err: any) {
      setError(err.message || 'Error loading quizzes');
    } finally {
      setLoading(false);
    }
  };

  const loadQuizData = async () => {
    if (!selectedQuiz?.id || !studentId) return;

    try {
      setLoading(true);
      const quizData = await studentAPI.getQuizForAttempt(selectedQuiz.id, studentId);
      setQuestions(quizData.quiz_questions || []);
    } catch (err: any) {
      setError(err.message || 'Error loading quiz');
    } finally {
      setLoading(false);
    }
  };

  const startQuiz = async () => {
    try {
      setLoading(true);
      const attempt = await studentAPI.startQuizAttempt(selectedQuiz.id, studentId);
      setCurrentAttempt(attempt);

      if (selectedQuiz.time_limit) {
        setTimeRemaining(selectedQuiz.time_limit * 60); // Convert minutes to seconds
      }
      
      setQuizStarted(true);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Error starting quiz');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (questionId: string, selectedOption: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: {
        questionId,
        selectedOption,
        answeredAt: new Date()
      }
    }));
  };

  const autoSaveAnswers = async () => {
    if (!currentAttempt || Object.keys(answers).length === 0) return;

    try {
      setAutoSaving(true);
      // Convert answers to the format expected by the API
      const formattedAnswers = Object.values(answers).reduce((acc, answer) => {
        acc[answer.questionId] = answer.selectedOption;
        return acc;
      }, {} as Record<string, string>);

      // Update the attempt with current answers
      await studentAPI.updateQuizAttempt(currentAttempt.id, {
        answers: formattedAnswers
      });
    } catch (err) {
      console.error('Auto-save failed:', err);
    } finally {
      setAutoSaving(false);
    }
  };

  const handleAutoSubmit = useCallback(async () => {
    if (quizCompleted || !currentAttempt) return;
    
    try {
      await submitQuiz();
    } catch (err) {
      console.error('Auto-submit failed:', err);
    }
  }, [quizCompleted, currentAttempt]);

  const submitQuiz = async () => {
    if (!currentAttempt) return;

    try {
      setLoading(true);
      
      // Convert answers to the format expected by the API
      const formattedAnswers = Object.values(answers).reduce((acc, answer) => {
        acc[answer.questionId] = answer.selectedOption;
        return acc;
      }, {} as Record<string, string>);

      const result = await studentAPI.submitQuizAttempt(currentAttempt.id, formattedAnswers);

      setQuizCompleted(true);
    } catch (err: any) {
      setError(err.message || 'Error submitting quiz');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getTimeColor = () => {
    if (timeRemaining > 300) return 'text-green-600'; // > 5 minutes
    if (timeRemaining > 60) return 'text-yellow-600';  // > 1 minute
    return 'text-red-600'; // < 1 minute
  };

  const currentQuestion = questions[currentQuestionIndex];
  const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;
  const answeredCount = Object.keys(answers).length;

  if (loading && !quizStarted) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (error && !quizStarted) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-red-800 mb-2">Error</h3>
            <p className="text-red-600">{error}</p>
            <button
              onClick={() => {
                setSelectedQuiz(null);
                setError('');
                setQuizStarted(false);
                setQuizCompleted(false);
              }}
              className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Back to Quiz Selection
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show quiz selection if no quiz is selected
  if (!selectedQuiz) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg border border-gray-200">
          <div className="bg-blue-600 text-white p-6 rounded-t-lg">
            <h1 className="text-2xl font-bold">Available Quizzes</h1>
            <p className="text-blue-100 mt-2">Select a quiz to begin</p>
          </div>

          <div className="p-6">
            {availableQuizzes.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Quizzes Available</h3>
                <p className="text-gray-600">There are no active quizzes available at this time.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {availableQuizzes.map((quiz) => (
                  <div key={quiz.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">{quiz.title}</h3>
                        <p className="text-gray-600 mt-1">{quiz.description}</p>
                        <div className="flex items-center space-x-4 mt-3 text-sm text-gray-500">
                          <span>📚 {quiz.courses?.course_name}</span>
                          <span>⏱️ {quiz.time_limit ? `${quiz.time_limit} min` : 'No limit'}</span>
                          <span>📝 {quiz.total_marks} marks</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedQuiz(quiz)}
                        className="ml-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                      >
                        Start Quiz
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!quizStarted) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg border border-gray-200">
          <div className="bg-blue-600 text-white p-6 rounded-t-lg">
            <h1 className="text-2xl font-bold">{selectedQuiz.title}</h1>
            <p className="text-blue-100 mt-2">{selectedQuiz.description}</p>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-2">Quiz Information</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <p><strong>Questions:</strong> {questions.length}</p>
                  <p><strong>Total Marks:</strong> {selectedQuiz.total_marks}</p>
                  <p><strong>Time Limit:</strong> {selectedQuiz.time_limit ? `${selectedQuiz.time_limit} minutes` : 'No limit'}</p>
                  <p><strong>Attempts Allowed:</strong> {selectedQuiz.max_attempts || 'Unlimited'}</p>
                </div>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <h3 className="font-semibold text-yellow-800 mb-2">Important Notes</h3>
                <ul className="space-y-1 text-sm text-yellow-700">
                  <li>• Your answers are auto-saved every 30 seconds</li>
                  <li>• Quiz will auto-submit when time expires</li>
                  <li>• You can navigate between questions freely</li>
                  <li>• Make sure you have a stable internet connection</li>
                </ul>
              </div>
            </div>

            {selectedQuiz.instructions && (
              <div className="bg-blue-50 p-4 rounded-lg mb-6 border border-blue-200">
                <h3 className="font-semibold text-blue-800 mb-2">Instructions</h3>
                <p className="text-blue-700 whitespace-pre-wrap">{selectedQuiz.instructions}</p>
              </div>
            )}

            <div className="flex justify-center">
              <button
                onClick={startQuiz}
                disabled={loading}
                className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-semibold"
              >
                {loading ? 'Starting...' : 'Start Quiz'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (quizCompleted) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg border border-gray-200">
          <div className="bg-green-600 text-white p-6 rounded-t-lg text-center">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold">Quiz Completed!</h1>
            <p className="text-green-100 mt-2">Your answers have been submitted successfully</p>
          </div>

          <div className="p-6 text-center">
            <p className="text-gray-600 mb-6">
              Thank you for completing the quiz. Your results will be available once the instructor has reviewed all submissions.
            </p>
            
            <button
              onClick={() => {
                setSelectedQuiz(null);
                setQuizStarted(false);
                setQuizCompleted(false);
                setAnswers({});
                setCurrentQuestionIndex(0);
              }}
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
            >
              Take Another Quiz
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main quiz interface
  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200">
        {/* Header with timer and progress */}
        <div className="bg-blue-600 text-white p-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold">{selectedQuiz.title}</h1>
              <p className="text-blue-100 text-sm">
                Question {currentQuestionIndex + 1} of {questions.length}
              </p>
            </div>

            <div className="text-right">
              {selectedQuiz.time_limit && (
                <div className={`text-2xl font-bold ${getTimeColor()}`}>
                  {formatTime(timeRemaining)}
                </div>
              )}
              <div className="text-blue-100 text-sm">
                {autoSaving && 'Auto-saving...'}
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="bg-blue-500 rounded-full h-2">
              <div
                className="bg-white rounded-full h-2 transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-blue-100 mt-1">
              <span>Progress: {Math.round(progress)}%</span>
              <span>Answered: {answeredCount}/{questions.length}</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4">
            <div className="text-red-700">{error}</div>
          </div>
        )}

        {/* Question content */}
        {currentQuestion && (
          <div className="p-6">
            <div className="mb-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-lg font-semibold text-gray-800">
                  Question {currentQuestionIndex + 1}
                </h2>
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                  {currentQuestion.marks} {currentQuestion.marks === 1 ? 'mark' : 'marks'}
                </span>
              </div>

              <p className="text-gray-700 text-lg leading-relaxed whitespace-pre-wrap">
                {currentQuestion.question_text}
              </p>
            </div>

            {/* Multiple choice options */}
            {currentQuestion.question_type === 'multiple_choice' && currentQuestion.options && (
              <div className="space-y-3">
                {currentQuestion.options.map((option: string, index: number) => {
                  const optionLetter = String.fromCharCode(97 + index); // a, b, c, d
                  const isSelected = answers[currentQuestion.id]?.selectedOption === optionLetter;

                  return (
                    <label
                      key={index}
                      className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`question-${currentQuestion.id}`}
                        value={optionLetter}
                        checked={isSelected}
                        onChange={(e) => handleAnswerSelect(currentQuestion.id, e.target.value)}
                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <span className="ml-3 text-gray-700 flex-1">
                        <span className="font-medium mr-2">{optionLetter.toUpperCase()}.</span>
                        {option}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Navigation and submit */}
        <div className="bg-gray-50 px-6 py-4 flex justify-between items-center">
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
              disabled={currentQuestionIndex === 0}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            <button
              onClick={() => setCurrentQuestionIndex(Math.min(questions.length - 1, currentQuestionIndex + 1))}
              disabled={currentQuestionIndex === questions.length - 1}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>

          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              {answeredCount} of {questions.length} answered
            </span>

            <button
              onClick={submitQuiz}
              disabled={loading}
              className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 font-semibold"
            >
              {loading ? 'Submitting...' : 'Submit Quiz'}
            </button>
          </div>
        </div>

        {/* Question navigation grid */}
        <div className="border-t border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Question Navigation</h3>
          <div className="grid grid-cols-10 gap-2">
            {questions.map((_, index) => {
              const isAnswered = Object.keys(answers).includes(questions[index].id);
              const isCurrent = index === currentQuestionIndex;

              return (
                <button
                  key={index}
                  onClick={() => setCurrentQuestionIndex(index)}
                  className={`w-8 h-8 rounded text-sm font-medium transition-all ${
                    isCurrent
                      ? 'bg-blue-600 text-white'
                      : isAnswered
                      ? 'bg-green-100 text-green-800 border border-green-300'
                      : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'
                  }`}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>

          <div className="flex items-center space-x-4 mt-3 text-xs text-gray-600">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-600 rounded mr-1"></div>
              Current
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-100 border border-green-300 rounded mr-1"></div>
              Answered
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-gray-100 border border-gray-300 rounded mr-1"></div>
              Not answered
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedStudentQuizInterface;
