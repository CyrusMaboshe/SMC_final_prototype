'use client';

import React, { useState } from 'react';
import { authAPI } from '@/lib/supabase';

const TestAccessControl = () => {
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await authAPI.login(credentials);
      setResult({
        success: true,
        user: response.user,
        profile: response.profile,
        message: 'Login successful!'
      });
    } catch (err: any) {
      setError(err.message);
      setResult({
        success: false,
        error: err.message
      });
    } finally {
      setLoading(false);
    }
  };

  const testCases = [
    { username: 'SMC20252025', password: 'vibranium1', description: 'Admin Account (should work)' },
    { username: 'TEST2025001', password: 'testpass123', description: 'Student with full approval (should work)' },
    { username: 'TEST2025002', password: 'testpass123', description: 'Student with no approvals (should fail)' },
    { username: 'INVALID', password: 'invalid', description: 'Invalid credentials (should fail)' }
  ];

  const runTestCase = async (testCase: any) => {
    setCredentials(testCase);
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await authAPI.login(testCase);
      setResult({
        success: true,
        user: response.user,
        profile: response.profile,
        message: 'Login successful!',
        testCase: testCase.description
      });
    } catch (err: any) {
      setError(err.message);
      setResult({
        success: false,
        error: err.message,
        testCase: testCase.description
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Access Control Test Page</h1>
          
          {/* Manual Test Form */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Manual Test</h2>
            <form onSubmit={handleTest} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  value={credentials.username}
                  onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter username"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={credentials.password}
                  onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter password"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Testing...' : 'Test Login'}
              </button>
            </form>
          </div>

          {/* Predefined Test Cases */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Predefined Test Cases</h2>
            <div className="space-y-2">
              {testCases.map((testCase, index) => (
                <button
                  key={index}
                  onClick={() => runTestCase(testCase)}
                  disabled={loading}
                  className="w-full text-left p-4 border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                  <div className="font-medium text-gray-900">{testCase.description}</div>
                  <div className="text-sm text-gray-600">
                    Username: {testCase.username} | Password: {testCase.password}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Quick Links</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <a
                href="/accountant/dashboard"
                className="p-4 border border-gray-200 rounded-md hover:bg-gray-50 text-center"
              >
                <div className="font-medium text-gray-900">Accounts Dashboard</div>
                <div className="text-sm text-gray-600">Manage payment approvals and registrations</div>
              </a>
              <a
                href="/student/dashboard"
                className="p-4 border border-gray-200 rounded-md hover:bg-gray-50 text-center"
              >
                <div className="font-medium text-gray-900">Student Dashboard</div>
                <div className="text-sm text-gray-600">View access status (login required)</div>
              </a>
            </div>
          </div>

          {/* Results */}
          {(result || error) && (
            <div className="mt-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Test Results</h2>
              
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <span className="text-red-400">❌</span>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">Authentication Failed</h3>
                      <div className="mt-2 text-sm text-red-700">
                        <p>{error}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {result && (
                <div className={`border rounded-md p-4 ${
                  result.success 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <span className={result.success ? 'text-green-400' : 'text-red-400'}>
                        {result.success ? '✅' : '❌'}
                      </span>
                    </div>
                    <div className="ml-3">
                      <h3 className={`text-sm font-medium ${
                        result.success ? 'text-green-800' : 'text-red-800'
                      }`}>
                        {result.testCase && `Test: ${result.testCase} - `}
                        {result.success ? 'Authentication Successful' : 'Authentication Failed'}
                      </h3>
                      <div className={`mt-2 text-sm ${
                        result.success ? 'text-green-700' : 'text-red-700'
                      }`}>
                        <pre className="whitespace-pre-wrap">
                          {JSON.stringify(result, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TestAccessControl;
