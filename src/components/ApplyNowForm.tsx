'use client';

import React, { useState } from 'react';
import { applicationAPI } from '@/lib/supabase';
import {
  validateNRCPhoto,
  validateGrade12Results,
  validatePaymentReceipt,
  uploadApplicationFile,
  FileValidationResult
} from '@/utils/fileUpload';

interface FormData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  address: string;
  program_interest: string;
  education_background: string;
  previous_healthcare_experience: string;
  motivation_statement: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relationship: string;
}

interface FileUploadState {
  file: File | null;
  preview: string | null;
  validation: FileValidationResult | null;
  uploading: boolean;
  uploaded: boolean;
  error: string | null;
}

const ApplyNowForm = () => {
  const [formData, setFormData] = useState<FormData>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    address: '',
    program_interest: '',
    education_background: '',
    previous_healthcare_experience: '',
    motivation_statement: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relationship: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // File upload states
  const [nrcPhoto, setNrcPhoto] = useState<FileUploadState>({
    file: null,
    preview: null,
    validation: null,
    uploading: false,
    uploaded: false,
    error: null
  });

  const [grade12Results, setGrade12Results] = useState<FileUploadState>({
    file: null,
    preview: null,
    validation: null,
    uploading: false,
    uploaded: false,
    error: null
  });

  const [paymentReceipt, setPaymentReceipt] = useState<FileUploadState>({
    file: null,
    preview: null,
    validation: null,
    uploading: false,
    uploaded: false,
    error: null
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // File upload handlers
  const handleFileUpload = async (
    file: File,
    fileType: 'nrc_photo' | 'grade12_results' | 'payment_receipt',
    setState: React.Dispatch<React.SetStateAction<FileUploadState>>,
    validator: (file: File) => Promise<FileValidationResult>
  ) => {
    setState(prev => ({ ...prev, uploading: true, error: null }));

    try {
      // Create preview
      const preview = URL.createObjectURL(file);

      // Validate file
      const validation = await validator(file);

      setState(prev => ({
        ...prev,
        file,
        preview,
        validation,
        uploading: false,
        error: validation.isValid ? null : validation.error
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        uploading: false,
        error: error.message || 'Failed to process file'
      }));
    }
  };

  const handleNRCPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file, 'nrc_photo', setNrcPhoto, validateNRCPhoto);
    }
  };

  const handleGrade12ResultsUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file, 'grade12_results', setGrade12Results, validateGrade12Results);
    }
  };

  const handlePaymentReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file, 'payment_receipt', setPaymentReceipt, validatePaymentReceipt);
    }
  };

  const removeFile = (setState: React.Dispatch<React.SetStateAction<FileUploadState>>) => {
    setState({
      file: null,
      preview: null,
      validation: null,
      uploading: false,
      uploaded: false,
      error: null
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    try {
      // Validate that all required files are uploaded and valid
      const requiredFiles = [
        { name: 'NRC Photo', state: nrcPhoto },
        { name: 'Grade 12 Results', state: grade12Results },
        { name: 'Payment Receipt', state: paymentReceipt }
      ];

      for (const { name, state } of requiredFiles) {
        if (!state.file) {
          throw new Error(`${name} is required`);
        }
        if (!state.validation?.isValid) {
          throw new Error(`${name} validation failed: ${state.validation?.errors.join(', ') || 'Invalid file'}`);
        }
      }

      // Submit application first using server-side API
      const response = await fetch('/api/submit-application', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit application');
      }

      const { application } = await response.json();

      // Upload files
      const fileUploads = [];

      if (nrcPhoto.file && nrcPhoto.validation) {
        fileUploads.push(
          uploadApplicationFile(
            nrcPhoto.file,
            'applications',
            `${application.id}/nrc_photo`,
            nrcPhoto.validation.metadata
          ).then(async result => {
            const fileResponse = await fetch('/api/upload-application-file', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                application_id: application.id,
                file_type: 'nrc_photo',
                file_path: result.path,
                file_name: nrcPhoto.file!.name,
                file_size: nrcPhoto.file!.size,
                file_url: result.url,
                authenticity_score: nrcPhoto.validation!.authenticityScore,
                authenticity_flags: nrcPhoto.validation!.authenticityFlags
              })
            });

            if (!fileResponse.ok) {
              const errorData = await fileResponse.json();
              throw new Error(errorData.error || 'Failed to upload NRC photo');
            }

            return fileResponse.json();
          })
        );
      }

      if (grade12Results.file && grade12Results.validation) {
        fileUploads.push(
          uploadApplicationFile(
            grade12Results.file,
            'applications',
            `${application.id}/grade12_results`,
            grade12Results.validation.metadata
          ).then(async result => {
            const fileResponse = await fetch('/api/upload-application-file', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                application_id: application.id,
                file_type: 'grade12_results',
                file_path: result.path,
                file_name: grade12Results.file!.name,
                file_size: grade12Results.file!.size,
                file_url: result.url,
                authenticity_score: grade12Results.validation!.authenticityScore,
                authenticity_flags: grade12Results.validation!.authenticityFlags
              })
            });

            if (!fileResponse.ok) {
              const errorData = await fileResponse.json();
              throw new Error(errorData.error || 'Failed to upload Grade 12 results');
            }

            return fileResponse.json();
          })
        );
      }

      if (paymentReceipt.file && paymentReceipt.validation) {
        fileUploads.push(
          uploadApplicationFile(
            paymentReceipt.file,
            'applications',
            `${application.id}/payment_receipt`,
            paymentReceipt.validation.metadata
          ).then(async result => {
            const fileResponse = await fetch('/api/upload-application-file', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                application_id: application.id,
                file_type: 'payment_receipt',
                file_path: result.path,
                file_name: paymentReceipt.file!.name,
                file_size: paymentReceipt.file!.size,
                file_url: result.url,
                authenticity_score: paymentReceipt.validation!.authenticityScore,
                authenticity_flags: paymentReceipt.validation!.authenticityFlags
              })
            });

            if (!fileResponse.ok) {
              const errorData = await fileResponse.json();
              throw new Error(errorData.error || 'Failed to upload payment receipt');
            }

            return fileResponse.json();
          })
        );
      }

      // Wait for all file uploads to complete
      await Promise.all(fileUploads);

      setSubmitStatus('success');

      // Reset form and file states
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        date_of_birth: '',
        address: '',
        program_interest: '',
        education_background: '',
        previous_healthcare_experience: '',
        motivation_statement: '',
        emergency_contact_name: '',
        emergency_contact_phone: '',
        emergency_contact_relationship: ''
      });

      setNrcPhoto({ file: null, preview: null, validation: null, uploading: false, uploaded: false, error: null });
      setGrade12Results({ file: null, preview: null, validation: null, uploading: false, uploaded: false, error: null });
      setPaymentReceipt({ file: null, preview: null, validation: null, uploading: false, uploaded: false, error: null });

    } catch (error: any) {
      setSubmitStatus('error');
      setErrorMessage(error.message || 'An error occurred while submitting your application.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitStatus === 'success') {
    return (
      <div className="max-w-2xl mx-auto p-8 bg-green-50 border border-green-200 rounded-2xl">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-green-800 mb-2">Application Submitted Successfully!</h3>
          <p className="text-green-700 mb-6">
            Thank you for your interest in Sancta Maria College of Nursing. We have received your application 
            and will review it carefully. You will receive an email confirmation shortly.
          </p>
          <button
            onClick={() => setSubmitStatus('idle')}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-full font-medium transition-all duration-300"
          >
            Submit Another Application
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="bg-white rounded-2xl shadow-xl border border-blue-100">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-8 rounded-t-2xl">
          <h2 className="text-3xl font-bold mb-2">Apply to Sancta Maria College of Nursing</h2>
          <p className="text-blue-100">Start your journey in nursing education with us</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {submitStatus === 'error' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <svg className="w-5 h-5 text-red-400 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div>
                  <h3 className="text-sm font-medium text-red-800">Error submitting application</h3>
                  <p className="text-sm text-red-700 mt-1">{errorMessage}</p>
                </div>
              </div>
            </div>
          )}

          {/* Personal Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-2">
                First Name *
              </label>
              <input
                type="text"
                id="first_name"
                name="first_name"
                value={formData.first_name}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Enter your first name"
              />
            </div>

            <div>
              <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-2">
                Last Name *
              </label>
              <input
                type="text"
                id="last_name"
                name="last_name"
                value={formData.last_name}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Enter your last name"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Enter your email address"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number *
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Enter your phone number"
              />
            </div>
          </div>

          <div>
            <label htmlFor="date_of_birth" className="block text-sm font-medium text-gray-700 mb-2">
              Date of Birth *
            </label>
            <input
              type="date"
              id="date_of_birth"
              name="date_of_birth"
              value={formData.date_of_birth}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>

          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
              Address *
            </label>
            <textarea
              id="address"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              required
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="Enter your complete address"
            />
          </div>

          <div>
            <label htmlFor="program_interest" className="block text-sm font-medium text-gray-700 mb-2">
              Program of Interest *
            </label>
            <select
              id="program_interest"
              name="program_interest"
              value={formData.program_interest}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            >
              <option value="">Select a program</option>
              <option value="Bachelor of Nursing">Bachelor of Nursing</option>
              <option value="Diploma in Nursing">Diploma in Nursing</option>
              <option value="Certificate in Nursing">Certificate in Nursing</option>
              <option value="Continuing Education">Continuing Education</option>
            </select>
          </div>

          <div>
            <label htmlFor="education_background" className="block text-sm font-medium text-gray-700 mb-2">
              Educational Background *
            </label>
            <textarea
              id="education_background"
              name="education_background"
              value={formData.education_background}
              onChange={handleInputChange}
              required
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="Describe your educational background, including degrees, certifications, and relevant coursework"
            />
          </div>

          <div>
            <label htmlFor="previous_healthcare_experience" className="block text-sm font-medium text-gray-700 mb-2">
              Previous Healthcare Experience
            </label>
            <textarea
              id="previous_healthcare_experience"
              name="previous_healthcare_experience"
              value={formData.previous_healthcare_experience}
              onChange={handleInputChange}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="Describe any previous healthcare experience, volunteer work, or related activities (optional)"
            />
          </div>

          <div>
            <label htmlFor="motivation_statement" className="block text-sm font-medium text-gray-700 mb-2">
              Motivation Statement *
            </label>
            <textarea
              id="motivation_statement"
              name="motivation_statement"
              value={formData.motivation_statement}
              onChange={handleInputChange}
              required
              rows={5}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="Tell us why you want to pursue nursing education and what motivates you to join our program"
            />
          </div>

          {/* Required Documents Section */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Required Documents</h3>
            <p className="text-sm text-gray-600 mb-4">
              Please upload the following required documents. All files will be verified for authenticity.
            </p>

            {/* Database Setup Notice */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <div className="text-yellow-600 mr-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-yellow-800 font-medium">File Upload Feature</p>
                  <p className="text-yellow-700 text-sm">
                    File uploads require database setup. Execute the SQL schema in <code className="bg-yellow-100 px-1 rounded">database/staff_management_schema.sql</code> to enable this feature.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {/* NRC Photo Upload */}
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-md font-semibold text-gray-900">NRC Photo</h4>
                    <p className="text-sm text-gray-600">Upload a clear photo of your National Registration Card (Max: 3MB)</p>
                  </div>
                  {nrcPhoto.validation && (
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                      nrcPhoto.validation.isValid
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      Score: {nrcPhoto.validation.authenticityScore}/100
                    </div>
                  )}
                </div>

                {!nrcPhoto.file ? (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleNRCPhotoUpload}
                      className="hidden"
                      id="nrc-photo-upload"
                    />
                    <label htmlFor="nrc-photo-upload" className="cursor-pointer">
                      <div className="text-gray-400 mb-2">
                        <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </div>
                      <p className="text-sm text-gray-600">Click to upload NRC photo</p>
                      <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 3MB</p>
                    </label>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {nrcPhoto.preview && (
                      <div className="relative">
                        <img
                          src={nrcPhoto.preview}
                          alt="NRC Photo Preview"
                          className="w-full max-w-md mx-auto rounded-lg border border-gray-300"
                        />
                        <button
                          type="button"
                          onClick={() => removeFile(setNrcPhoto)}
                          className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    )}

                    {nrcPhoto.validation && (
                      <div className="text-sm">
                        {nrcPhoto.validation.isValid ? (
                          <div className="text-green-600 flex items-center">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Document validated successfully
                          </div>
                        ) : (
                          <div className="text-red-600">
                            <div className="flex items-center mb-1">
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Validation issues found:
                            </div>
                            <ul className="list-disc list-inside ml-6 space-y-1">
                              {nrcPhoto.validation.errors.map((error, index) => (
                                <li key={index}>{error}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {nrcPhoto.validation.authenticityFlags.length > 0 && (
                          <div className="mt-2 text-orange-600">
                            <div className="font-medium">Authenticity flags:</div>
                            <ul className="list-disc list-inside ml-4 space-y-1">
                              {nrcPhoto.validation.authenticityFlags.map((flag, index) => (
                                <li key={index}>{flag}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {nrcPhoto.error && (
                      <div className="text-red-600 text-sm flex items-center">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {nrcPhoto.error}
                      </div>
                    )}
                  </div>
                )}

                {nrcPhoto.uploading && (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-sm text-gray-600">Processing...</span>
                  </div>
                )}
              </div>

              {/* Grade 12 Results Upload */}
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-md font-semibold text-gray-900">Grade 12 Results</h4>
                    <p className="text-sm text-gray-600">Upload your Grade 12 examination results (Max: 3MB)</p>
                  </div>
                  {grade12Results.validation && (
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                      grade12Results.validation.isValid
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      Score: {grade12Results.validation.authenticityScore}/100
                    </div>
                  )}
                </div>

                {!grade12Results.file ? (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleGrade12ResultsUpload}
                      className="hidden"
                      id="grade12-upload"
                    />
                    <label htmlFor="grade12-upload" className="cursor-pointer">
                      <div className="text-gray-400 mb-2">
                        <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <p className="text-sm text-gray-600">Click to upload Grade 12 results</p>
                      <p className="text-xs text-gray-500 mt-1">PDF, PNG, JPG up to 3MB</p>
                    </label>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
                      <div className="flex items-center">
                        <div className="text-blue-600 mr-3">
                          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{grade12Results.file.name}</p>
                          <p className="text-xs text-gray-500">{(grade12Results.file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(setGrade12Results)}
                        className="text-red-600 hover:text-red-700 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>

                    {grade12Results.validation && (
                      <div className="text-sm">
                        {grade12Results.validation.isValid ? (
                          <div className="text-green-600 flex items-center">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Document validated successfully
                          </div>
                        ) : (
                          <div className="text-red-600">
                            <div className="flex items-center mb-1">
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Validation issues found:
                            </div>
                            <ul className="list-disc list-inside ml-6 space-y-1">
                              {grade12Results.validation.errors.map((error, index) => (
                                <li key={index}>{error}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {grade12Results.validation.authenticityFlags.length > 0 && (
                          <div className="mt-2 text-orange-600">
                            <div className="font-medium">Authenticity flags:</div>
                            <ul className="list-disc list-inside ml-4 space-y-1">
                              {grade12Results.validation.authenticityFlags.map((flag, index) => (
                                <li key={index}>{flag}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {grade12Results.error && (
                      <div className="text-red-600 text-sm flex items-center">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {grade12Results.error}
                      </div>
                    )}
                  </div>
                )}

                {grade12Results.uploading && (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-sm text-gray-600">Processing...</span>
                  </div>
                )}
              </div>

              {/* Payment Receipt Upload */}
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-md font-semibold text-gray-900">Payment Receipt</h4>
                    <p className="text-sm text-gray-600">Upload proof of application fee payment (Max: 5MB)</p>
                  </div>
                  {paymentReceipt.validation && (
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                      paymentReceipt.validation.isValid
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      Score: {paymentReceipt.validation.authenticityScore}/100
                    </div>
                  )}
                </div>

                {!paymentReceipt.file ? (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handlePaymentReceiptUpload}
                      className="hidden"
                      id="payment-receipt-upload"
                    />
                    <label htmlFor="payment-receipt-upload" className="cursor-pointer">
                      <div className="text-gray-400 mb-2">
                        <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <p className="text-sm text-gray-600">Click to upload payment receipt</p>
                      <p className="text-xs text-gray-500 mt-1">PDF, PNG, JPG up to 5MB</p>
                    </label>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
                      <div className="flex items-center">
                        <div className="text-green-600 mr-3">
                          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{paymentReceipt.file.name}</p>
                          <p className="text-xs text-gray-500">{(paymentReceipt.file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(setPaymentReceipt)}
                        className="text-red-600 hover:text-red-700 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>

                    {paymentReceipt.validation && (
                      <div className="text-sm">
                        {paymentReceipt.validation.isValid ? (
                          <div className="text-green-600 flex items-center">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Document validated successfully
                          </div>
                        ) : (
                          <div className="text-red-600">
                            <div className="flex items-center mb-1">
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Validation issues found:
                            </div>
                            <ul className="list-disc list-inside ml-6 space-y-1">
                              {paymentReceipt.validation.errors.map((error, index) => (
                                <li key={index}>{error}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {paymentReceipt.validation.authenticityFlags.length > 0 && (
                          <div className="mt-2 text-orange-600">
                            <div className="font-medium">Authenticity flags:</div>
                            <ul className="list-disc list-inside ml-4 space-y-1">
                              {paymentReceipt.validation.authenticityFlags.map((flag, index) => (
                                <li key={index}>{flag}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {paymentReceipt.error && (
                      <div className="text-red-600 text-sm flex items-center">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {paymentReceipt.error}
                      </div>
                    )}
                  </div>
                )}

                {paymentReceipt.uploading && (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-sm text-gray-600">Processing...</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Emergency Contact Information */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Emergency Contact Information</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="emergency_contact_name" className="block text-sm font-medium text-gray-700 mb-2">
                  Emergency Contact Name *
                </label>
                <input
                  type="text"
                  id="emergency_contact_name"
                  name="emergency_contact_name"
                  value={formData.emergency_contact_name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Enter emergency contact name"
                />
              </div>

              <div>
                <label htmlFor="emergency_contact_phone" className="block text-sm font-medium text-gray-700 mb-2">
                  Emergency Contact Phone *
                </label>
                <input
                  type="tel"
                  id="emergency_contact_phone"
                  name="emergency_contact_phone"
                  value={formData.emergency_contact_phone}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Enter emergency contact phone"
                />
              </div>
            </div>

            <div>
              <label htmlFor="emergency_contact_relationship" className="block text-sm font-medium text-gray-700 mb-2">
                Relationship to Emergency Contact *
              </label>
              <select
                id="emergency_contact_relationship"
                name="emergency_contact_relationship"
                value={formData.emergency_contact_relationship}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value="">Select relationship</option>
                <option value="Parent">Parent</option>
                <option value="Guardian">Guardian</option>
                <option value="Spouse">Spouse</option>
                <option value="Sibling">Sibling</option>
                <option value="Other Family Member">Other Family Member</option>
                <option value="Friend">Friend</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {/* Submit Button */}
          <div className="border-t border-gray-200 pt-6">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-4 px-6 rounded-lg font-semibold text-lg transition-all duration-300 transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Submitting Application...
                </div>
              ) : (
                'Submit Application'
              )}
            </button>

            <p className="text-sm text-gray-600 text-center mt-4">
              By submitting this application, you agree to our terms and conditions and privacy policy.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ApplyNowForm;
