'use client';

import React, { useState, useEffect } from 'react';
import { lecturerAPI, Quiz, QuizQuestion } from '@/lib/supabase';

interface QuizManagerProps {
  profile: any;
  courses: any[];
}

interface QuizFormData {
  title: string;
  description: string;
  instructions: string;
  course_id: string;
  time_limit: number;
  max_attempts: number;
  start_time: string;
  end_time: string;
}

interface QuestionFormData {
  question_text: string;
  question_type: 'multiple_choice' | 'checkbox' | 'text';
  options: string[];
  correct_answer: string;
  correct_answers?: string[]; // For checkbox questions
  marks: number;
}

const QuizManager: React.FC<QuizManagerProps> = ({ profile, courses }) => {
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQuizForm, setShowQuizForm] = useState(false);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<any>(null);
  const [selectedQuiz, setSelectedQuiz] = useState<any>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [editingQuestion, setEditingQuestion] = useState<any>(null);

  const [quizFormData, setQuizFormData] = useState<QuizFormData>({
    title: '',
    description: '',
    instructions: '',
    course_id: '',
    time_limit: 60,
    max_attempts: 1,
    start_time: '',
    end_time: ''
  });

  const [questionFormData, setQuestionFormData] = useState<QuestionFormData>({
    question_text: '',
    question_type: 'multiple_choice',
    options: ['', '', '', ''],
    correct_answer: '',
    correct_answers: [],
    marks: 1
  });

  useEffect(() => {
    if (profile?.id) {
      loadQuizzes();
    }
  }, [profile]);

  const loadQuizzes = async () => {
    try {
      setLoading(true);
      const data = await lecturerAPI.getQuizzes(profile.id);
      setQuizzes(data || []);
    } catch (error) {
      console.error('Error loading quizzes:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadQuestions = async (quizId: string) => {
    try {
      const data = await lecturerAPI.getQuizQuestions(quizId, profile.id);
      setQuestions(data || []);
    } catch (error) {
      console.error('Error loading questions:', error);
    }
  };

  const handleQuizSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingQuiz) {
        await lecturerAPI.updateQuiz(editingQuiz.id, quizFormData, profile.id);
      } else {
        await lecturerAPI.createQuiz({
          ...quizFormData,
          created_by: profile.id
        });
      }
      
      setShowQuizForm(false);
      setEditingQuiz(null);
      resetQuizForm();
      loadQuizzes();
    } catch (error: any) {
      alert(error.message || 'Error saving quiz');
    }
  };

  const handleQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const questionData = {
        ...questionFormData,
        quiz_id: selectedQuiz.id,
        order_number: questions.length + 1
      };

      if (editingQuestion) {
        await lecturerAPI.updateQuizQuestion(editingQuestion.id, questionData, profile.id);
      } else {
        await lecturerAPI.createQuizQuestion(questionData, profile.id);
      }
      
      setShowQuestionForm(false);
      setEditingQuestion(null);
      resetQuestionForm();
      loadQuestions(selectedQuiz.id);
      loadQuizzes(); // Refresh to update question count
    } catch (error: any) {
      alert(error.message || 'Error saving question');
    }
  };

  const handleDeleteQuiz = async (quizId: string) => {
    if (confirm('Are you sure you want to delete this quiz? This will also delete all questions and attempts.')) {
      try {
        await lecturerAPI.deleteQuiz(quizId, profile.id);
        loadQuizzes();
        if (selectedQuiz?.id === quizId) {
          setSelectedQuiz(null);
          setQuestions([]);
        }
      } catch (error: any) {
        alert(error.message || 'Error deleting quiz');
      }
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (confirm('Are you sure you want to delete this question?')) {
      try {
        await lecturerAPI.deleteQuizQuestion(questionId, profile.id);
        loadQuestions(selectedQuiz.id);
        loadQuizzes(); // Refresh to update question count
      } catch (error: any) {
        alert(error.message || 'Error deleting question');
      }
    }
  };

  const resetQuizForm = () => {
    setQuizFormData({
      title: '',
      description: '',
      instructions: '',
      course_id: '',
      time_limit: 60,
      max_attempts: 1,
      start_time: '',
      end_time: ''
    });
  };

  const resetQuestionForm = () => {
    setQuestionFormData({
      question_text: '',
      question_type: 'multiple_choice',
      options: ['', '', '', ''],
      correct_answer: '',
      correct_answers: [],
      marks: 1
    });
  };

  const handleEditQuiz = (quiz: any) => {
    setEditingQuiz(quiz);
    setQuizFormData({
      title: quiz.title,
      description: quiz.description || '',
      instructions: quiz.instructions || '',
      course_id: quiz.course_id,
      time_limit: quiz.time_limit || 60,
      max_attempts: quiz.max_attempts || 1,
      start_time: quiz.start_time ? new Date(quiz.start_time).toISOString().slice(0, 16) : '',
      end_time: quiz.end_time ? new Date(quiz.end_time).toISOString().slice(0, 16) : ''
    });
    setShowQuizForm(true);
  };

  const handleEditQuestion = (question: any) => {
    setEditingQuestion(question);
    setQuestionFormData({
      question_text: question.question_text,
      question_type: question.question_type,
      options: question.options || ['', '', '', ''],
      correct_answer: question.correct_answer,
      correct_answers: question.correct_answers || [],
      marks: question.marks
    });
    setShowQuestionForm(true);
  };

  const handleViewQuestions = (quiz: any) => {
    setSelectedQuiz(quiz);
    loadQuestions(quiz.id);
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
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Manage Quizzes</h2>
        <button
          onClick={() => {
            setShowQuizForm(true);
            setEditingQuiz(null);
            resetQuizForm();
          }}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          Create Quiz
        </button>
      </div>

      {/* Quiz List */}
      {!selectedQuiz && (
        <div className="grid gap-4">
          {quizzes.length === 0 ? (
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🧠</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Quizzes Created</h3>
              <p className="text-gray-600">Create your first quiz to get started.</p>
            </div>
          ) : (
            quizzes.map((quiz) => (
              <div key={quiz.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{quiz.title}</h3>
                    <p className="text-sm text-gray-600 mb-2">
                      Course: {quiz.courses?.course_code} - {quiz.courses?.course_name}
                    </p>
                    {quiz.description && (
                      <p className="text-gray-700 mb-3">{quiz.description}</p>
                    )}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Questions:</span> {quiz.question_count}
                      </div>
                      <div>
                        <span className="font-medium">Total Marks:</span> {quiz.total_marks}
                      </div>
                      <div>
                        <span className="font-medium">Time Limit:</span> {quiz.time_limit || 'No limit'} min
                      </div>
                      <div>
                        <span className="font-medium">Attempts:</span> {quiz.completed_attempts}/{quiz.total_attempts}
                      </div>
                    </div>
                    <div className="mt-3 text-sm">
                      <span className="font-medium">Active:</span> 
                      <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                        quiz.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {quiz.is_active ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>
                  <div className="flex space-x-2 ml-4">
                    <button
                      onClick={() => handleViewQuestions(quiz)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
                    >
                      Questions
                    </button>
                    <button
                      onClick={() => handleEditQuiz(quiz)}
                      className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded text-sm transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteQuiz(quiz.id)}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Question Management View */}
      {selectedQuiz && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <div>
              <button
                onClick={() => {
                  setSelectedQuiz(null);
                  setQuestions([]);
                }}
                className="text-blue-600 hover:text-blue-800 mb-2 flex items-center"
              >
                ← Back to Quizzes
              </button>
              <h3 className="text-xl font-bold text-gray-900">
                Questions for: {selectedQuiz.title}
              </h3>
              <p className="text-sm text-gray-600">
                Total Marks: {selectedQuiz.total_marks} | Questions: {questions.length}
              </p>
            </div>
            <button
              onClick={() => {
                setShowQuestionForm(true);
                setEditingQuestion(null);
                resetQuestionForm();
              }}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Add Question
            </button>
          </div>

          {/* Questions List */}
          <div className="space-y-4">
            {questions.length === 0 ? (
              <div className="bg-gray-50 rounded-lg p-8 text-center">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">❓</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Questions Added</h3>
                <p className="text-gray-600">Add questions to make this quiz available to students.</p>
              </div>
            ) : (
              questions.map((question, index) => (
                <div key={question.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full mr-2">
                          Q{index + 1}
                        </span>
                        <span className="bg-gray-100 text-gray-800 text-xs font-medium px-2 py-1 rounded-full mr-2">
                          {question.question_type === 'multiple_choice' ? 'Multiple Choice' :
                           question.question_type === 'checkbox' ? 'Checkbox (Multiple)' : 'Text Answer'}
                        </span>
                        <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
                          {question.marks} marks
                        </span>
                      </div>
                      <p className="text-gray-900 font-medium mb-3">{question.question_text}</p>

                      {question.question_type === 'multiple_choice' && question.options && (
                        <div className="space-y-1 mb-3">
                          {question.options.map((option, optIndex) => (
                            <div key={optIndex} className={`text-sm p-2 rounded ${
                              option === question.correct_answer
                                ? 'bg-green-50 text-green-800 border border-green-200'
                                : 'bg-gray-50 text-gray-700'
                            }`}>
                              {String.fromCharCode(65 + optIndex)}. {option}
                              {option === question.correct_answer && (
                                <span className="ml-2 text-green-600 font-medium">✓ Correct</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {question.question_type === 'checkbox' && question.options && (
                        <div className="space-y-1 mb-3">
                          {question.options.map((option, optIndex) => {
                            const correctAnswers = question.correct_answer ? question.correct_answer.split('|') : [];
                            const isCorrect = correctAnswers.includes(option);
                            return (
                              <div key={optIndex} className={`text-sm p-2 rounded ${
                                isCorrect
                                  ? 'bg-green-50 text-green-800 border border-green-200'
                                  : 'bg-gray-50 text-gray-700'
                              }`}>
                                {String.fromCharCode(65 + optIndex)}. {option}
                                {isCorrect && (
                                  <span className="ml-2 text-green-600 font-medium">✓ Correct</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {question.question_type === 'text' && (
                        <div className="text-sm bg-green-50 text-green-800 p-2 rounded border border-green-200 mb-3">
                          <strong>Correct Answer:</strong> {question.correct_answer}
                        </div>
                      )}
                    </div>
                    <div className="flex space-x-2 ml-4">
                      <button
                        onClick={() => handleEditQuestion(question)}
                        className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded text-sm transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteQuestion(question.id)}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Quiz Form Modal */}
      {showQuizForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {editingQuiz ? 'Edit Quiz' : 'Create New Quiz'}
            </h3>
            <form onSubmit={handleQuizSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quiz Title *
                </label>
                <input
                  type="text"
                  required
                  value={quizFormData.title}
                  onChange={(e) => setQuizFormData({...quizFormData, title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Course *
                </label>
                <select
                  required
                  value={quizFormData.course_id}
                  onChange={(e) => setQuizFormData({...quizFormData, course_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a course</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.course_code} - {course.course_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={quizFormData.description}
                  onChange={(e) => setQuizFormData({...quizFormData, description: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Instructions
                </label>
                <textarea
                  value={quizFormData.instructions}
                  onChange={(e) => setQuizFormData({...quizFormData, instructions: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Instructions for students taking this quiz..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Time Limit (minutes)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={quizFormData.time_limit}
                    onChange={(e) => setQuizFormData({...quizFormData, time_limit: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Attempts
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={quizFormData.max_attempts}
                    onChange={(e) => setQuizFormData({...quizFormData, max_attempts: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Time *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={quizFormData.start_time}
                    onChange={(e) => setQuizFormData({...quizFormData, start_time: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Time *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={quizFormData.end_time}
                    onChange={(e) => setQuizFormData({...quizFormData, end_time: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowQuizForm(false);
                    setEditingQuiz(null);
                    resetQuizForm();
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors"
                >
                  {editingQuiz ? 'Update Quiz' : 'Create Quiz'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Question Form Modal */}
      {showQuestionForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {editingQuestion ? 'Edit Question' : 'Add New Question'}
            </h3>
            <form onSubmit={handleQuestionSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Question Text *
                </label>
                <textarea
                  required
                  value={questionFormData.question_text}
                  onChange={(e) => setQuestionFormData({...questionFormData, question_text: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your question here..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Question Type *
                  </label>
                  <select
                    value={questionFormData.question_type}
                    onChange={(e) => {
                      const type = e.target.value as 'multiple_choice' | 'checkbox' | 'text';
                      setQuestionFormData({
                        ...questionFormData,
                        question_type: type,
                        options: (type === 'multiple_choice' || type === 'checkbox') ? ['', '', '', ''] : [],
                        correct_answer: type === 'text' ? '' : '',
                        correct_answers: type === 'checkbox' ? [] : undefined
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="multiple_choice">Multiple Choice</option>
                    <option value="checkbox">Checkbox (Multiple Answers)</option>
                    <option value="text">Text Answer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Marks *
                  </label>
                  <input
                    type="number"
                    min="0.5"
                    step="0.5"
                    required
                    value={questionFormData.marks}
                    onChange={(e) => setQuestionFormData({...questionFormData, marks: parseFloat(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {questionFormData.question_type === 'multiple_choice' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Answer Options *
                  </label>
                  <div className="space-y-2">
                    {questionFormData.options.map((option, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-600 w-6">
                          {String.fromCharCode(65 + index)}.
                        </span>
                        <input
                          type="text"
                          required
                          value={option}
                          onChange={(e) => {
                            const newOptions = [...questionFormData.options];
                            newOptions[index] = e.target.value;
                            setQuestionFormData({...questionFormData, options: newOptions});
                          }}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder={`Option ${String.fromCharCode(65 + index)}`}
                        />
                        <input
                          type="radio"
                          name="correct_answer"
                          checked={questionFormData.correct_answer === option}
                          onChange={() => setQuestionFormData({...questionFormData, correct_answer: option})}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className="text-sm text-gray-600">Correct</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Select the radio button next to the correct answer
                  </p>
                </div>
              )}

              {questionFormData.question_type === 'checkbox' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Answer Options * (Select all correct answers)
                  </label>
                  <div className="space-y-2">
                    {questionFormData.options.map((option, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-600 w-6">
                          {String.fromCharCode(65 + index)}.
                        </span>
                        <input
                          type="text"
                          required
                          value={option}
                          onChange={(e) => {
                            const newOptions = [...questionFormData.options];
                            newOptions[index] = e.target.value;
                            setQuestionFormData({...questionFormData, options: newOptions});
                          }}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder={`Option ${String.fromCharCode(65 + index)}`}
                        />
                        <input
                          type="checkbox"
                          checked={questionFormData.correct_answers?.includes(option) || false}
                          onChange={(e) => {
                            const currentAnswers = questionFormData.correct_answers || [];
                            let newAnswers;
                            if (e.target.checked) {
                              newAnswers = [...currentAnswers, option];
                            } else {
                              newAnswers = currentAnswers.filter(ans => ans !== option);
                            }
                            setQuestionFormData({
                              ...questionFormData,
                              correct_answers: newAnswers,
                              correct_answer: newAnswers.join('|') // Store as pipe-separated string for compatibility
                            });
                          }}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className="text-sm text-gray-600">Correct</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Check all boxes next to the correct answers
                  </p>
                </div>
              )}

              {questionFormData.question_type === 'text' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Correct Answer *
                  </label>
                  <input
                    type="text"
                    required
                    value={questionFormData.correct_answer}
                    onChange={(e) => setQuestionFormData({...questionFormData, correct_answer: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter the correct answer (case-insensitive)"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Answer matching will be case-insensitive
                  </p>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowQuestionForm(false);
                    setEditingQuestion(null);
                    resetQuestionForm();
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
                >
                  {editingQuestion ? 'Update Question' : 'Add Question'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizManager;
