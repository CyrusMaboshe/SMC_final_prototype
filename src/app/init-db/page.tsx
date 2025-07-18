'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function InitDbPage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [error, setError] = useState('');

  const addResult = (message: string) => {
    setResults(prev => [...prev, message]);
    console.log(message);
  };

  const initializeDatabase = async () => {
    setLoading(true);
    setResults([]);
    setError('');

    try {
      addResult('🚀 Starting database initialization via API...');

      const response = await fetch('/api/setup-db', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        addResult('✅ Database setup completed successfully!');
        addResult('✅ All access control tables created');
        addResult('✅ Test semester period added');
        addResult('🎉 You can now use the Access Control features!');
        addResult('🔄 Please refresh the accountant dashboard to see the changes.');
      } else {
        addResult(`❌ Database setup failed: ${data.error}`);
        setError(`Setup failed: ${data.error}`);
      }

    } catch (error: any) {
      setError(`Initialization failed: ${error.message}`);
      addResult(`❌ Initialization failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testTables = async () => {
    setLoading(true);
    setResults([]);
    setError('');

    try {
      addResult('🔍 Testing table existence...');

      const response = await fetch('/api/setup-db', {
        method: 'GET',
      });

      const data = await response.json();

      if (data.success) {
        addResult('📊 Table Status:');
        Object.entries(data.tables).forEach(([table, exists]) => {
          addResult(`${exists ? '✅' : '❌'} ${table}: ${exists ? 'exists' : 'missing'}`);
        });
      } else {
        addResult(`❌ Test failed: ${data.error}`);
        setError(`Test failed: ${data.error}`);
      }

    } catch (error: any) {
      setError(`Test failed: ${error.message}`);
      addResult(`❌ Test failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Database Initialization</h1>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-blue-900 mb-2">🛠️ Setup Required</h2>
            <p className="text-blue-800 mb-4">
              The access control system requires database tables to be created. 
              Click the button below to initialize the database with all required tables.
            </p>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Creates semester_periods table</li>
              <li>• Creates payment_approvals table</li>
              <li>• Creates student_semester_registrations table</li>
              <li>• Creates access_control_logs table</li>
              <li>• Adds a test semester period</li>
            </ul>
          </div>

          <div className="mb-6 space-x-4">
            <button
              onClick={testTables}
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-colors text-lg font-medium"
            >
              {loading ? '🔄 Testing...' : '🔍 Test Tables'}
            </button>

            <button
              onClick={initializeDatabase}
              disabled={loading}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 transition-colors text-lg font-medium"
            >
              {loading ? '🔄 Initializing Database...' : '🚀 Initialize Database'}
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {results.length > 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Initialization Results:</h3>
              <div className="space-y-2 font-mono text-sm max-h-96 overflow-y-auto">
                {results.map((result, index) => (
                  <div key={index} className="text-gray-700">
                    {result}
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.length > 0 && !loading && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-semibold text-green-900 mb-2">✅ Next Steps:</h4>
              <ol className="text-sm text-green-800 space-y-1">
                <li>1. Go back to the accountant dashboard</li>
                <li>2. Navigate to the "Access Control" tab</li>
                <li>3. You should now be able to create semester periods and manage payments</li>
                <li>4. The error messages should be gone</li>
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
