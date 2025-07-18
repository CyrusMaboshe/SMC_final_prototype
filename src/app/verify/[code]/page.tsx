'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface VerificationData {
  student_name: string;
  student_id: string;
  program: string;
  verification_date: string;
  is_valid: boolean;
}

const VerificationPage: React.FC = () => {
  const params = useParams();
  const code = params.code as string;
  const [verificationData, setVerificationData] = useState<VerificationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (code) {
      verifyTranscript();
    }
  }, [code]);

  const verifyTranscript = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Verifying transcript with code:', code);

      // Query the transcript_verifications table
      const { data, error: queryError } = await supabase
        .from('transcript_verifications')
        .select(`
          *,
          students(
            first_name,
            last_name,
            student_id,
            program
          )
        `)
        .eq('verification_code', code)
        .eq('is_active', true)
        .single();

      console.log('Verification query result:', { data, error: queryError });

      if (queryError) {
        console.error('Database query error:', queryError);
        setError('Invalid or expired verification code');
        return;
      }

      if (!data) {
        console.log('No verification data found for code:', code);
        setError('Invalid or expired verification code');
        return;
      }

      if (!data.students) {
        console.error('Student data not found for verification:', data);
        setError('Student information not found');
        return;
      }

      console.log('Verification successful:', data);

      setVerificationData({
        student_name: `${data.students.first_name} ${data.students.last_name}`,
        student_id: data.students.student_id,
        program: data.students.program,
        verification_date: data.created_at,
        is_valid: true
      });

    } catch (err: any) {
      console.error('Verification error:', err);
      setError('Failed to verify transcript');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Verifying Transcript</h2>
            <p className="text-gray-600">Please wait while we verify the transcript...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-red-900 mb-2">Verification Failed</h2>
            <p className="text-red-600 mb-4">{error}</p>
            <p className="text-sm text-gray-500">
              Please check the QR code and try again, or contact the institution for assistance.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-lg w-full mx-4">
        <div className="text-center">
          {/* Success Icon */}
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          {/* Main Message */}
          <h1 className="text-2xl font-bold text-green-900 mb-2">
            Transcript Available in the System
          </h1>
          
          <p className="text-gray-600 mb-6">
            This transcript has been successfully verified and is authentic.
          </p>

          {/* Student Information */}
          {verificationData && (
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Student Information</h3>
              <div className="space-y-3 text-left">
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600">Student Name:</span>
                  <span className="text-gray-900">{verificationData.student_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600">Student ID:</span>
                  <span className="text-gray-900">{verificationData.student_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600">Program:</span>
                  <span className="text-gray-900">{verificationData.program}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600">Verified On:</span>
                  <span className="text-gray-900">
                    {new Date(verificationData.verification_date).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Institution Information */}
          <div className="border-t pt-6">
            <div className="flex items-center justify-center mb-4">
              <img 
                src="/logo.png" 
                alt="Sancta Maria College" 
                className="h-12 w-auto"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
            <h4 className="font-semibold text-gray-900">Sancta Maria College</h4>
            <p className="text-sm text-gray-600">Official Transcript Verification System</p>
          </div>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t text-xs text-gray-500">
            <p>This verification confirms the authenticity of the academic transcript.</p>
            <p>For any inquiries, please contact the institution directly.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerificationPage;
