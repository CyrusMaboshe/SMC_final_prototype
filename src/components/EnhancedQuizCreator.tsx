'use client';

import React, { useState, useEffect } from 'react';
import { lecturerAPI, Quiz, QuizQuestion } from '@/lib/supabase';

interface EnhancedQuizCreatorProps {
  profile: any;
  courses: any[];
  onQuizCreated?: (quiz: Quiz) => void;
  onClose?: () => void;
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

interface QuestionData {
  id?: string;
  question_text: string;
  question_type: 'multiple_choice';
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: 'a' | 'b' | 'c' | 'd';
  marks: number;
  order_number: number;
}

const EnhancedQuizCreator: React.FC<EnhancedQuizCreatorProps> = ({ 
  profile, 
  courses, 
  onQuizCreated, 
  onClose 
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [quizData, setQuizData] = useState<QuizFormData>({
    title: '',
    description: '',
    instructions: '',
    course_id: '',
    time_limit: 60,
    max_attempts: 1,
    start_time: '',
    end_time: ''
  });

  const [questions, setQuestions] = useState<QuestionData[]>([
    {
      question_text: '',
      question_type: 'multiple_choice',
      option_a: '',
      option_b: '',
      option_c: '',
      option_d: '',
      correct_option: 'a',
      marks: 1,
      order_number: 1
    }
  ]);

  const [createdQuiz, setCreatedQuiz] = useState<Quiz | null>(null);

  // Set default dates
  useEffect(() => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    setQuizData(prev => ({
      ...prev,
      start_time: now.toISOString().slice(0, 16),
      end_time: tomorrow.toISOString().slice(0, 16)
    }));
  }, []);

  const handleQuizDataChange = (field: keyof QuizFormData, value: any) => {
    setQuizData(prev => ({
      ...prev,
      [field]: value
    }));
    setError('');
  };

  const handleQuestionChange = (index: number, field: keyof QuestionData, value: any) => {
    setQuestions(prev => prev.map((q, i) => 
      i === index ? { ...q, [field]: value } : q
    ));
    setError('');
  };

  const addQuestion = () => {
    setQuestions(prev => [...prev, {
      question_text: '',
      question_type: 'multiple_choice',
      option_a: '',
      option_b: '',
      option_c: '',
      option_d: '',
      correct_option: 'a',
      marks: 1,
      order_number: prev.length + 1
    }]);
  };

  const removeQuestion = (index: number) => {
    if (questions.length > 1) {
      setQuestions(prev => prev.filter((_, i) => i !== index)
        .map((q, i) => ({ ...q, order_number: i + 1 })));
    }
  };

  const validateQuizData = () => {
    if (!quizData.title.trim()) return 'Quiz title is required';
    if (!quizData.course_id) return 'Please select a course';
    if (!quizData.start_time) return 'Start time is required';
    if (!quizData.end_time) return 'End time is required';
    if (new Date(quizData.start_time) >= new Date(quizData.end_time)) {
      return 'End time must be after start time';
    }
    return null;
  };

  const validateQuestions = () => {
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question_text.trim()) return `Question ${i + 1}: Question text is required`;
      if (!q.option_a.trim()) return `Question ${i + 1}: Option A is required`;
      if (!q.option_b.trim()) return `Question ${i + 1}: Option B is required`;
      if (!q.option_c.trim()) return `Question ${i + 1}: Option C is required`;
      if (!q.option_d.trim()) return `Question ${i + 1}: Option D is required`;
      if (q.marks <= 0) return `Question ${i + 1}: Marks must be greater than 0`;
    }
    return null;
  };

  const createQuiz = async () => {
    const quizError = validateQuizData();
    if (quizError) {
      setError(quizError);
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Create the quiz
      const quiz = await lecturerAPI.createQuiz({
        ...quizData,
        created_by: profile.id
      });

      setCreatedQuiz(quiz);
      setCurrentStep(2);
      setSuccess('Quiz created successfully! Now add your questions.');
    } catch (err: any) {
      setError(err.message || 'Error creating quiz');
    } finally {
      setLoading(false);
    }
  };

  const saveAllQuestions = async () => {
    if (!createdQuiz) return;

    const questionsError = validateQuestions();
    if (questionsError) {
      setError(questionsError);
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Create all questions
      for (const questionData of questions) {
        const formattedQuestion = {
          quiz_id: createdQuiz.id,
          question_text: questionData.question_text,
          question_type: 'multiple_choice' as const,
          options: [
            questionData.option_a,
            questionData.option_b,
            questionData.option_c,
            questionData.option_d
          ],
          correct_answer: questionData.correct_option,
          marks: questionData.marks,
          order_number: questionData.order_number
        };

        await lecturerAPI.createQuizQuestion(formattedQuestion, profile.id);
      }

      // Update quiz total marks
      const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);
      await lecturerAPI.updateQuiz(createdQuiz.id, { total_marks: totalMarks }, profile.id);

      setCurrentStep(3);
      setSuccess(`Quiz "${createdQuiz.title}" created successfully with ${questions.length} questions!`);
      
      if (onQuizCreated) {
        onQuizCreated({ ...createdQuiz, total_marks: totalMarks });
      }
    } catch (err: any) {
      setError(err.message || 'Error saving questions');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-blue-600 text-white p-6 rounded-t-lg">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Create New Quiz</h2>
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
          
          {/* Progress Steps */}
          <div className="mt-4 flex items-center space-x-4">
            <div className={`flex items-center ${currentStep >= 1 ? 'text-white' : 'text-blue-300'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 1 ? 'bg-white text-blue-600' : 'bg-blue-500'}`}>
                1
              </div>
              <span className="ml-2">Quiz Details</span>
            </div>
            <div className={`w-8 h-1 ${currentStep >= 2 ? 'bg-white' : 'bg-blue-400'}`}></div>
            <div className={`flex items-center ${currentStep >= 2 ? 'text-white' : 'text-blue-300'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 2 ? 'bg-white text-blue-600' : 'bg-blue-500'}`}>
                2
              </div>
              <span className="ml-2">Add Questions</span>
            </div>
            <div className={`w-8 h-1 ${currentStep >= 3 ? 'bg-white' : 'bg-blue-400'}`}></div>
            <div className={`flex items-center ${currentStep >= 3 ? 'text-white' : 'text-blue-300'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 3 ? 'bg-white text-blue-600' : 'bg-blue-500'}`}>
                3
              </div>
              <span className="ml-2">Complete</span>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Error/Success Messages */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          
          {success && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
              {success}
            </div>
          )}

          {/* Step 1: Quiz Details */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold mb-4">Quiz Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quiz Title *
                  </label>
                  <input
                    type="text"
                    value={quizData.title}
                    onChange={(e) => handleQuizDataChange('title', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter quiz title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Course *
                  </label>
                  <select
                    value={quizData.course_id}
                    onChange={(e) => handleQuizDataChange('course_id', e.target.value)}
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
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={quizData.description}
                  onChange={(e) => handleQuizDataChange('description', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Brief description of the quiz"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Instructions
                </label>
                <textarea
                  value={quizData.instructions}
                  onChange={(e) => handleQuizDataChange('instructions', e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Instructions for students taking the quiz"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Time Limit (minutes)
                  </label>
                  <input
                    type="number"
                    value={quizData.time_limit}
                    onChange={(e) => handleQuizDataChange('time_limit', parseInt(e.target.value) || 0)}
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Attempts
                  </label>
                  <input
                    type="number"
                    value={quizData.max_attempts}
                    onChange={(e) => handleQuizDataChange('max_attempts', parseInt(e.target.value) || 1)}
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Time *
                  </label>
                  <input
                    type="datetime-local"
                    value={quizData.start_time}
                    onChange={(e) => handleQuizDataChange('start_time', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Time *
                  </label>
                  <input
                    type="datetime-local"
                    value={quizData.end_time}
                    onChange={(e) => handleQuizDataChange('end_time', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={createQuiz}
                  disabled={loading}
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {loading ? 'Creating...' : 'Next: Add Questions'}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Add Questions */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold">Add Questions</h3>
                <button
                  onClick={addQuestion}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Question
                </button>
              </div>

              <div className="space-y-6">
                {questions.map((question, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-lg font-medium">Question {index + 1}</h4>
                      {questions.length > 1 && (
                        <button
                          onClick={() => removeQuestion(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Question Text *
                        </label>
                        <textarea
                          value={question.question_text}
                          onChange={(e) => handleQuestionChange(index, 'question_text', e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter your question here..."
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Option A *
                          </label>
                          <input
                            type="text"
                            value={question.option_a}
                            onChange={(e) => handleQuestionChange(index, 'option_a', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Option A"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Option B *
                          </label>
                          <input
                            type="text"
                            value={question.option_b}
                            onChange={(e) => handleQuestionChange(index, 'option_b', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Option B"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Option C *
                          </label>
                          <input
                            type="text"
                            value={question.option_c}
                            onChange={(e) => handleQuestionChange(index, 'option_c', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Option C"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Option D *
                          </label>
                          <input
                            type="text"
                            value={question.option_d}
                            onChange={(e) => handleQuestionChange(index, 'option_d', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Option D"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Correct Answer *
                          </label>
                          <select
                            value={question.correct_option}
                            onChange={(e) => handleQuestionChange(index, 'correct_option', e.target.value as 'a' | 'b' | 'c' | 'd')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="a">Option A</option>
                            <option value="b">Option B</option>
                            <option value="c">Option C</option>
                            <option value="d">Option D</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Marks *
                          </label>
                          <input
                            type="number"
                            value={question.marks}
                            onChange={(e) => handleQuestionChange(index, 'marks', parseInt(e.target.value) || 1)}
                            min="1"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="bg-gray-500 text-white px-6 py-2 rounded-md hover:bg-gray-600"
                >
                  Back
                </button>
                <button
                  onClick={saveAllQuestions}
                  disabled={loading}
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {loading ? 'Saving...' : `Save ${questions.length} Questions`}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Complete */}
          {currentStep === 3 && (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <h3 className="text-2xl font-bold text-gray-900">Quiz Created Successfully!</h3>

              {createdQuiz && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-left">
                  <h4 className="font-semibold text-blue-900 mb-2">Quiz Summary:</h4>
                  <div className="space-y-2 text-blue-800">
                    <p><strong>Title:</strong> {createdQuiz.title}</p>
                    <p><strong>Questions:</strong> {questions.length}</p>
                    <p><strong>Total Marks:</strong> {questions.reduce((sum, q) => sum + q.marks, 0)}</p>
                    <p><strong>Time Limit:</strong> {quizData.time_limit} minutes</p>
                    <p><strong>Available:</strong> {new Date(quizData.start_time).toLocaleString()} - {new Date(quizData.end_time).toLocaleString()}</p>
                  </div>
                </div>
              )}

              <div className="flex justify-center space-x-4">
                {onClose && (
                  <button
                    onClick={onClose}
                    className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
                  >
                    Close
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedQuizCreator;
