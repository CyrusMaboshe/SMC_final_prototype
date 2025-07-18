'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';

const DatabaseSetup: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [error, setError] = useState('');

  const addResult = (message: string) => {
    setResults(prev => [...prev, message]);
  };

  const createTables = async () => {
    setLoading(true);
    setResults([]);
    setError('');

    try {
      addResult('🚀 Starting database setup...');

      // Create semester_periods table
      addResult('Creating semester_periods table...');
      const { error: semesterError } = await supabase.sql`
        CREATE TABLE IF NOT EXISTS semester_periods (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          semester_name TEXT NOT NULL,
          academic_year TEXT NOT NULL,
          semester_number INTEGER NOT NULL,
          start_date DATE NOT NULL,
          end_date DATE NOT NULL,
          registration_start_date DATE NOT NULL,
          registration_end_date DATE NOT NULL,
          is_active BOOLEAN DEFAULT false,
          is_registration_open BOOLEAN DEFAULT false,
          created_by UUID,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `;

      if (semesterError) {
        addResult(`❌ Error creating semester_periods: ${semesterError.message}`);
      } else {
        addResult('✅ semester_periods table created successfully');
      }

      // Create payment_approvals table
      addResult('Creating payment_approvals table...');
      const { error: paymentError } = await supabase.sql`
        CREATE TABLE IF NOT EXISTS payment_approvals (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          student_id UUID NOT NULL,
          payment_id UUID,
          amount_paid DECIMAL(10,2) NOT NULL,
          payment_reference TEXT,
          payment_date DATE NOT NULL,
          approved_by UUID,
          approval_date TIMESTAMP WITH TIME ZONE,
          access_valid_from DATE NOT NULL,
          access_valid_until DATE NOT NULL,
          approval_status TEXT DEFAULT 'pending',
          approval_notes TEXT,
          auto_expire BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `;

      if (paymentError) {
        addResult(`❌ Error creating payment_approvals: ${paymentError.message}`);
      } else {
        addResult('✅ payment_approvals table created successfully');
      }

      // Create student_semester_registrations table
      addResult('Creating student_semester_registrations table...');
      const { error: registrationError } = await supabase.sql`
        CREATE TABLE IF NOT EXISTS student_semester_registrations (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          student_id UUID NOT NULL,
          semester_period_id UUID NOT NULL,
          registration_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          approved_by UUID,
          approval_date TIMESTAMP WITH TIME ZONE,
          registration_status TEXT DEFAULT 'pending',
          payment_approval_id UUID,
          registration_notes TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `;

      if (registrationError) {
        addResult(`❌ Error creating student_semester_registrations: ${registrationError.message}`);
      } else {
        addResult('✅ student_semester_registrations table created successfully');
      }

      // Create access_control_logs table
      addResult('Creating access_control_logs table...');
      const { error: logsError } = await supabase.sql`
        CREATE TABLE IF NOT EXISTS access_control_logs (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          student_id UUID NOT NULL,
          action_type TEXT NOT NULL,
          reason TEXT,
          payment_approval_id UUID,
          semester_registration_id UUID,
          ip_address INET,
          user_agent TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `;

      if (logsError) {
        addResult(`❌ Error creating access_control_logs: ${logsError.message}`);
      } else {
        addResult('✅ access_control_logs table created successfully');
      }

      addResult('🎉 Database setup completed!');
      addResult('You can now create semester periods and manage payment approvals.');

    } catch (error: any) {
      setError(`Setup failed: ${error.message}`);
      addResult(`❌ Setup failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const createTestData = async () => {
    setLoading(true);
    setResults([]);
    setError('');

    try {
      addResult('🧪 Creating test data...');

      // Create a test semester
      const testSemester = {
        semester_name: 'Fall Semester 2024',
        academic_year: '2024-2025',
        semester_number: 1,
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        registration_start_date: new Date().toISOString().split('T')[0],
        registration_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        is_active: true,
        is_registration_open: true
      };

      const { data: semesterData, error: semesterError } = await supabase
        .from('semester_periods')
        .insert(testSemester)
        .select();

      if (semesterError) {
        addResult(`❌ Error creating test semester: ${semesterError.message}`);
      } else {
        addResult('✅ Test semester created successfully');
        addResult(`📅 Semester: ${testSemester.semester_name} (${testSemester.academic_year})`);
      }

      addResult('🎉 Test data creation completed!');

    } catch (error: any) {
      setError(`Test data creation failed: ${error.message}`);
      addResult(`❌ Test data creation failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const checkTables = async () => {
    setLoading(true);
    setResults([]);
    setError('');

    try {
      addResult('🔍 Checking existing tables...');

      const tables = ['semester_periods', 'payment_approvals', 'student_semester_registrations', 'access_control_logs'];

      for (const table of tables) {
        try {
          const { data, error } = await supabase
            .from(table)
            .select('id')
            .limit(1);

          if (error) {
            addResult(`❌ Table ${table}: ${error.message}`);
          } else {
            addResult(`✅ Table ${table}: exists and accessible`);
          }
        } catch (err: any) {
          addResult(`❌ Table ${table}: ${err.message}`);
        }
      }

      addResult('🔍 Table check completed!');

    } catch (error: any) {
      setError(`Table check failed: ${error.message}`);
      addResult(`❌ Table check failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Database Setup for Access Control</h2>
        
        <div className="space-y-4 mb-6">
          <button
            onClick={checkTables}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-colors mr-4"
          >
            {loading ? 'Checking...' : 'Check Tables'}
          </button>

          <button
            onClick={createTables}
            disabled={loading}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 transition-colors mr-4"
          >
            {loading ? 'Creating...' : 'Create Tables'}
          </button>

          <button
            onClick={createTestData}
            disabled={loading}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Creating...' : 'Create Test Data'}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {results.length > 0 && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Setup Results:</h3>
            <div className="space-y-1 font-mono text-sm">
              {results.map((result, index) => (
                <div key={index} className="text-gray-700">
                  {result}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-2">Instructions:</h4>
          <ol className="text-sm text-blue-800 space-y-1">
            <li>1. Click "Check Tables" to see if the access control tables exist</li>
            <li>2. Click "Create Tables" to create the necessary database tables</li>
            <li>3. Click "Create Test Data" to add a test semester period</li>
            <li>4. Once setup is complete, you can use the Access Control features</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default DatabaseSetup;
