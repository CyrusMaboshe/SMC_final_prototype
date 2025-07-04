'use client';

import React, { useState } from 'react';
import { Staff } from '@/lib/supabase';

interface StaffFormData {
  staff_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  department: string;
  job_title: string;
  academic_qualifications: string;
  specialization: string;
}

interface StaffFormProps {
  isEdit?: boolean;
  initialData?: Staff;
  departments: string[];
  onSubmit: (data: StaffFormData, photo?: File) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const StaffForm: React.FC<StaffFormProps> = ({
  isEdit = false,
  initialData,
  departments,
  onSubmit,
  onCancel,
  isSubmitting = false
}) => {
  const [formData, setFormData] = useState<StaffFormData>({
    staff_id: initialData?.staff_id || '',
    first_name: initialData?.first_name || '',
    last_name: initialData?.last_name || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    department: initialData?.department || '',
    job_title: initialData?.job_title || '',
    academic_qualifications: initialData?.academic_qualifications || '',
    specialization: initialData?.specialization || ''
  });

  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(
    initialData?.profile_photo_url || null
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({
          ...prev,
          photo: 'Please select a valid image file'
        }));
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({
          ...prev,
          photo: 'Image file size must be less than 5MB'
        }));
        return;
      }
      
      setSelectedPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
      setErrors(prev => ({
        ...prev,
        photo: ''
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required field validation
    if (!formData.staff_id.trim()) {
      newErrors.staff_id = 'Staff ID is required';
    }
    if (!formData.first_name.trim()) {
      newErrors.first_name = 'First name is required';
    }
    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Last name is required';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!formData.department) {
      newErrors.department = 'Department is required';
    }
    if (!formData.job_title.trim()) {
      newErrors.job_title = 'Job title is required';
    }

    // Phone validation (optional but must be valid if provided)
    if (formData.phone && !/^[\+]?[0-9\-\s\(\)]+$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(formData, selectedPhoto || undefined);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Photo Upload */}
      <div className="flex justify-center mb-6">
        <div className="relative">
          {photoPreview ? (
            <img
              src={photoPreview}
              alt="Preview"
              className="w-24 h-24 rounded-full object-cover border-4 border-gray-200"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center border-4 border-gray-200">
              <span className="text-gray-500 text-2xl">👤</span>
            </div>
          )}
          <label className="absolute bottom-0 right-0 bg-blue-600 text-white rounded-full p-2 cursor-pointer hover:bg-blue-700 transition-colors">
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoSelect}
              className="hidden"
            />
            📷
          </label>
        </div>
        {errors.photo && (
          <p className="text-red-600 text-sm mt-2">{errors.photo}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Staff ID */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Staff ID *
          </label>
          <input
            type="text"
            name="staff_id"
            value={formData.staff_id}
            onChange={handleInputChange}
            disabled={isEdit}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              isEdit ? 'bg-gray-100 cursor-not-allowed' : ''
            } ${errors.staff_id ? 'border-red-500' : 'border-gray-300'}`}
            placeholder="e.g., SMC001"
          />
          {errors.staff_id && (
            <p className="text-red-600 text-sm mt-1">{errors.staff_id}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email *
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.email ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="email@smc.edu"
          />
          {errors.email && (
            <p className="text-red-600 text-sm mt-1">{errors.email}</p>
          )}
        </div>

        {/* First Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            First Name *
          </label>
          <input
            type="text"
            name="first_name"
            value={formData.first_name}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.first_name ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.first_name && (
            <p className="text-red-600 text-sm mt-1">{errors.first_name}</p>
          )}
        </div>

        {/* Last Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Last Name *
          </label>
          <input
            type="text"
            name="last_name"
            value={formData.last_name}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.last_name ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.last_name && (
            <p className="text-red-600 text-sm mt-1">{errors.last_name}</p>
          )}
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone
          </label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.phone ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="+260-XX-XXX-XXXX"
          />
          {errors.phone && (
            <p className="text-red-600 text-sm mt-1">{errors.phone}</p>
          )}
        </div>

        {/* Department */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Department *
          </label>
          <select
            name="department"
            value={formData.department}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.department ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">Select Department</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
          {errors.department && (
            <p className="text-red-600 text-sm mt-1">{errors.department}</p>
          )}
        </div>

        {/* Job Title */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Job Title *
          </label>
          <input
            type="text"
            name="job_title"
            value={formData.job_title}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.job_title ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="e.g., Principal, Lecturer, Clinical Instructor"
          />
          {errors.job_title && (
            <p className="text-red-600 text-sm mt-1">{errors.job_title}</p>
          )}
        </div>

        {/* Academic Qualifications */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Academic Qualifications
          </label>
          <textarea
            name="academic_qualifications"
            value={formData.academic_qualifications}
            onChange={handleInputChange}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g., PhD in Nursing Education, MSc in Clinical Nursing"
          />
        </div>

        {/* Specialization */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Specialization
          </label>
          <textarea
            name="specialization"
            value={formData.specialization}
            onChange={handleInputChange}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g., Nursing Education & Administration, Maternal & Child Health"
          />
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Saving...' : (isEdit ? 'Update Staff' : 'Create Staff')}
        </button>
      </div>
    </form>
  );
};

export default StaffForm;
