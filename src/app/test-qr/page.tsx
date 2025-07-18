'use client';

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { supabase } from '@/lib/supabase';

const TestQRPage: React.FC = () => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [verificationCode, setVerificationCode] = useState<string>('SMC-TEST-12345');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    generateTestQR();
  }, []);

  const generateVerificationCode = (): string => {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 15);
    return `SMC-${timestamp}-${randomStr}`.toUpperCase();
  };

  const generateTestQR = async () => {
    try {
      // Check if we're on the client side
      if (typeof window === 'undefined') return;

      const verificationUrl = `${window.location.origin}/verify/${verificationCode}`;
      console.log('Generating QR code for URL:', verificationUrl);

      const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      setQrCodeUrl(qrDataUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  };

  const generateNewVerification = async () => {
    try {
      setIsGenerating(true);
      const newCode = generateVerificationCode();

      // Create new verification record
      const { data, error } = await supabase
        .from('transcript_verifications')
        .insert([{
          student_id: 'aa0bcac9-5cc0-4895-9ca2-ad849b25ec2d', // Claire2 Mukubesa2
          verification_code: newCode,
          transcript_type: 'final_results',
          is_active: true
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating verification record:', error);
        alert('Failed to create verification record');
        return;
      }

      console.log('New verification record created:', data);
      setVerificationCode(newCode);

      // Generate new QR code
      if (typeof window !== 'undefined') {
        const verificationUrl = `${window.location.origin}/verify/${newCode}`;
        const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
          width: 300,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });

        setQrCodeUrl(qrDataUrl);
      }

    } catch (error) {
      console.error('Error generating new verification:', error);
      alert('Failed to generate new verification');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          QR Code Test
        </h1>
        
        <div className="text-center mb-6">
          <p className="text-gray-600 mb-4">
            Test QR Code for verification: {verificationCode}
          </p>

          {qrCodeUrl && (
            <div className="mb-4">
              <img
                src={qrCodeUrl}
                alt="Test QR Code"
                className="mx-auto border border-gray-200 rounded"
              />
            </div>
          )}

          <div className="text-sm text-gray-500 mb-4">
            <p>Scan this QR code with your phone to test verification</p>
            <p className="mt-2">Or click the link below:</p>
          </div>

          <div className="space-y-2">
            <a
              href={typeof window !== 'undefined' ? `${window.location.origin}/verify/${verificationCode}` : '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg inline-block"
            >
              Test Verification Page
            </a>

            <br />

            <button
              onClick={generateNewVerification}
              disabled={isGenerating}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg"
            >
              {isGenerating ? 'Generating...' : 'Generate New QR Code'}
            </button>
          </div>
        </div>
        
        <div className="border-t pt-4">
          <h3 className="font-semibold text-gray-900 mb-2">Test Details:</h3>
          <div className="text-sm text-gray-600 space-y-1">
            <p><strong>Student:</strong> Claire2 Mukubesa2</p>
            <p><strong>Student ID:</strong> SMC2025002</p>
            <p><strong>Verification Code:</strong> {verificationCode}</p>
            <p><strong>URL:</strong> {typeof window !== 'undefined' ? `${window.location.origin}/verify/${verificationCode}` : 'Loading...'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestQRPage;
