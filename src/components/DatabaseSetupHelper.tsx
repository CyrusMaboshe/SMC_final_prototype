'use client';

import React, { useState } from 'react';
import { setupAccessControlTables } from '@/utils/setupAccessControlTables';
import { accountantAPI } from '@/lib/supabase';

const DatabaseSetupHelper: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [updateLoading, setUpdateLoading] = useState(false);

  const handleSetup = async () => {
    try {
      setLoading(true);
      setError('');
      setResult('');

      const setupResult = await setupAccessControlTables();
      
      if (setupResult.success) {
        setResult('✅ Access control tables have been set up successfully!');
      } else {
        setError(`❌ Setup failed: ${setupResult.error}`);
      }
    } catch (err: any) {
      setError(`❌ Setup error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAccessControl = async () => {
    try {
      setUpdateLoading(true);
      setError('');
      setResult('');

      // First try the direct API method
      try {
        const directResult = await accountantAPI.updateAccessControlToSimplified();
        if (directResult.success) {
          setResult('✅ Access control updated to simplified logic! Students can now login with payment approval only.');
          return;
        }
      } catch (directError) {
        console.log('Direct update failed, trying setup method:', directError);
      }

      // Fallback to setup method
      const updateResult = await setupAccessControlTables();

      if (updateResult.success) {
        setResult('✅ Access control updated to simplified logic! Students can now login with payment approval only.');
      } else {
        setError(`❌ Update failed: ${updateResult.error}`);
      }
    } catch (err: any) {
      setError(`❌ Update error: ${err.message}`);
    } finally {
      setUpdateLoading(false);
    }
  };

  const sqlScript = `-- Access Control Tables Setup Script
-- Copy and paste this into your Supabase SQL Editor

-- Create semester_periods table
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

-- Create payment_approvals table
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
    approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'expired', 'revoked')),
    approval_notes TEXT,
    auto_expire BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create student_semester_registrations table
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

-- Create access_control_logs table
CREATE TABLE IF NOT EXISTS access_control_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL,
    action_type TEXT NOT NULL,
    reason TEXT,
    payment_approval_id UUID,
    semester_registration_id UUID,
    performed_by UUID,
    notes TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert a default active semester
INSERT INTO semester_periods (
    semester_name,
    academic_year,
    semester_number,
    start_date,
    end_date,
    registration_start_date,
    registration_end_date,
    is_active,
    is_registration_open
) 
SELECT 
    'Fall Semester 2024',
    '2024-2025',
    1,
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '90 days',
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '30 days',
    true,
    true
WHERE NOT EXISTS (
    SELECT 1 FROM semester_periods WHERE is_active = true
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payment_approvals_student_id ON payment_approvals(student_id);
CREATE INDEX IF NOT EXISTS idx_payment_approvals_status ON payment_approvals(approval_status);
CREATE INDEX IF NOT EXISTS idx_semester_periods_active ON semester_periods(is_active);
CREATE INDEX IF NOT EXISTS idx_student_registrations_student_id ON student_semester_registrations(student_id);

-- Success message
SELECT 'Access control tables created successfully!' as result;`;

  return (
    <div className="space-y-6">
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-red-900 mb-4">🚨 URGENT: Fix Student Login Issue</h3>
        <p className="text-red-800 mb-4">
          If students are getting "must be registered for current semester" errors, click the button below to apply the simplified access control fix.
        </p>
        <button
          onClick={handleUpdateAccessControl}
          disabled={loading || updateLoading}
          className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors disabled:opacity-50 font-medium"
        >
          {updateLoading ? 'Fixing Login Issue...' : '🔧 FIX STUDENT LOGIN NOW'}
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">🔧 Database Setup Helper</h3>
        <p className="text-blue-800 mb-4">
          This tool helps set up the required access control tables for the accounts system.
        </p>
        
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleSetup}
              disabled={loading || updateLoading}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50"
            >
              {loading ? 'Setting up...' : 'Setup Access Control Tables'}
            </button>

            <button
              onClick={handleUpdateAccessControl}
              disabled={loading || updateLoading}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors disabled:opacity-50"
            >
              {updateLoading ? 'Updating...' : 'Apply Simplified Access Control'}
            </button>
          </div>

          {result && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800">{result}</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{error}</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">📋 Manual Setup (Alternative)</h4>
        <p className="text-gray-700 mb-4">
          If the automatic setup doesn't work, you can manually run this SQL script in your Supabase dashboard:
        </p>
        
        <div className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto">
          <pre className="text-sm whitespace-pre-wrap">{sqlScript}</pre>
        </div>
        
        <div className="mt-4">
          <button
            onClick={() => navigator.clipboard.writeText(sqlScript)}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
          >
            📋 Copy SQL Script
          </button>
        </div>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <h4 className="text-lg font-semibold text-green-900 mb-2">✅ Simplified Access Control</h4>
        <p className="text-green-800 mb-3">
          The system now uses simplified access control where <strong>payment approval is sufficient for student login</strong>.
        </p>
        <ul className="text-green-700 space-y-1 text-sm">
          <li>• Students can login with payment approval only</li>
          <li>• Semester registration is optional (for record keeping)</li>
          <li>• No more "must be registered" error messages</li>
          <li>• Terminated students can login again after new payment approval</li>
        </ul>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h4 className="text-lg font-semibold text-yellow-900 mb-2">⚠️ Important Notes</h4>
        <ul className="text-yellow-800 space-y-2">
          <li>• Make sure you have admin access to your Supabase project</li>
          <li>• The setup will create tables if they don't exist (safe to run multiple times)</li>
          <li>• A default active semester will be created for testing</li>
          <li>• All tables include proper indexes for performance</li>
          <li>• Access control functions are automatically updated to simplified logic</li>
        </ul>
      </div>
    </div>
  );
};

export default DatabaseSetupHelper;
