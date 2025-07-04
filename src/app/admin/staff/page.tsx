'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, staffAPI, Staff } from '@/lib/supabase';
import { uploadFile, formatFileSize } from '@/utils/fileUpload';

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

const StaffManagement = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [filteredStaff, setFilteredStaff] = useState<Staff[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [jobTitles, setJobTitles] = useState<string[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [showAuditLogs, setShowAuditLogs] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedJobTitle, setSelectedJobTitle] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Form data
  const [formData, setFormData] = useState<StaffFormData>({
    staff_id: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    department: '',
    job_title: '',
    academic_qualifications: '',
    specialization: ''
  });
  
  // Photo upload
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (staff.length > 0) {
      filterStaff();
    }
  }, [staff, searchTerm, selectedDepartment, selectedJobTitle, statusFilter]);

  const checkAuth = () => {
    try {
      const currentUser = authAPI.getCurrentUser();
      if (!currentUser || currentUser.role !== 'admin') {
        router.push('/');
        return;
      }
      setUser(currentUser);
      fetchData();
    } catch (error) {
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [staffData, departmentsData, jobTitlesData] = await Promise.all([
        staffAPI.getAll(),
        staffAPI.getDepartments(),
        staffAPI.getJobTitles()
      ]);
      
      setStaff(staffData || []);
      setDepartments(departmentsData?.map(d => d.name) || []);
      setJobTitles(jobTitlesData || []);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch staff data:', err);
      setError('Failed to load staff data. Please check your database configuration.');
    } finally {
      setLoading(false);
    }
  };

  const filterStaff = () => {
    let filtered = [...staff];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(member =>
        member.first_name.toLowerCase().includes(term) ||
        member.last_name.toLowerCase().includes(term) ||
        member.email.toLowerCase().includes(term) ||
        member.staff_id.toLowerCase().includes(term) ||
        member.department.toLowerCase().includes(term) ||
        member.job_title.toLowerCase().includes(term)
      );
    }

    // Department filter
    if (selectedDepartment !== 'all') {
      filtered = filtered.filter(member => member.department === selectedDepartment);
    }

    // Job title filter
    if (selectedJobTitle !== 'all') {
      filtered = filtered.filter(member => member.job_title === selectedJobTitle);
    }

    // Status filter
    if (statusFilter !== 'all') {
      const isActive = statusFilter === 'active';
      filtered = filtered.filter(member => member.is_active === isActive);
    }

    setFilteredStaff(filtered);
  };

  const resetForm = () => {
    setFormData({
      staff_id: '',
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      department: '',
      job_title: '',
      academic_qualifications: '',
      specialization: ''
    });
    setSelectedPhoto(null);
    setPhotoPreview(null);
    setSelectedStaff(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image file size must be less than 5MB');
        return;
      }
      
      setSelectedPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
      setError(null);
    }
  };

  const uploadPhoto = async (staffId: string): Promise<{ path: string; url: string } | null> => {
    if (!selectedPhoto) return null;

    try {
      setUploadingPhoto(true);
      const result = await uploadFile(selectedPhoto, {
        bucket: 'staff-photos',
        folder: `staff/${staffId}`,
        allowedTypes: ['image/jpeg', 'image/png', 'image/gif'],
        maxSize: 5 * 1024 * 1024
      });

      return { path: result.path, url: result.url };
    } catch (error: any) {
      console.error('Photo upload failed:', error);
      throw new Error('Failed to upload photo: ' + error.message);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      // Validate required fields
      if (!formData.staff_id || !formData.first_name || !formData.last_name || 
          !formData.email || !formData.department || !formData.job_title) {
        throw new Error('Please fill in all required fields');
      }

      let photoPath = null;
      
      if (showEditForm && selectedStaff) {
        // Update existing staff
        const updateData: any = { ...formData };
        
        // Upload new photo if selected
        if (selectedPhoto) {
          const photoResult = await uploadPhoto(selectedStaff.id);
          if (photoResult) {
            updateData.profile_photo_path = photoResult.path;
            updateData.profile_photo_url = photoResult.url;
          }
        }
        
        await staffAPI.update(selectedStaff.id, updateData, user.id);
        setSuccess('Staff member updated successfully');
        setShowEditForm(false);
      } else {
        // Create new staff
        const staffData: any = {
          ...formData,
          created_by: user.id
        };
        
        // Create staff first to get ID
        const newStaff = await staffAPI.create(staffData);
        
        // Upload photo if selected
        if (selectedPhoto) {
          const photoResult = await uploadPhoto(newStaff.id);
          if (photoResult) {
            await staffAPI.update(newStaff.id, {
              profile_photo_path: photoResult.path,
              profile_photo_url: photoResult.url
            }, user.id);
          }
        }
        
        setSuccess('Staff member created successfully');
        setShowCreateForm(false);
      }
      
      resetForm();
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to save staff member');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (staffMember: Staff) => {
    setSelectedStaff(staffMember);
    setFormData({
      staff_id: staffMember.staff_id,
      first_name: staffMember.first_name,
      last_name: staffMember.last_name,
      email: staffMember.email,
      phone: staffMember.phone || '',
      department: staffMember.department,
      job_title: staffMember.job_title,
      academic_qualifications: staffMember.academic_qualifications || '',
      specialization: staffMember.specialization || ''
    });
    setPhotoPreview(staffMember.profile_photo_url || null);
    setShowEditForm(true);
  };

  const handleToggleStatus = async (staffMember: Staff) => {
    try {
      await staffAPI.toggleActiveStatus(staffMember.id, !staffMember.is_active, user.id);
      setSuccess(`Staff member ${!staffMember.is_active ? 'activated' : 'deactivated'} successfully`);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to update staff status');
    }
  };

  const handleViewAuditLogs = async (staffMember: Staff) => {
    try {
      setSelectedStaff(staffMember);
      const logs = await staffAPI.getAuditLogs(staffMember.id);
      setAuditLogs(logs || []);
      setShowAuditLogs(true);
    } catch (err: any) {
      setError(err.message || 'Failed to load audit logs');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/admin/dashboard')}
                className="text-blue-600 hover:text-blue-800 mr-4"
              >
                ← Back to Dashboard
              </button>
              <h1 className="text-xl font-bold text-gray-900">👥 Staff Management</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowCreateForm(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Add New Staff
              </button>
              <button
                onClick={fetchData}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Alerts */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <div className="text-red-600 mr-3">⚠️</div>
              <div>
                <h3 className="text-red-800 font-medium">Error</h3>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <div className="text-green-600 mr-3">✅</div>
              <div>
                <h3 className="text-green-800 font-medium">Success</h3>
                <p className="text-green-700">{success}</p>
              </div>
            </div>
          </div>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <span className="text-blue-600 text-xl">👥</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Staff</p>
                <p className="text-2xl font-bold text-gray-900">{staff.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <span className="text-green-600 text-xl">✅</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Staff</p>
                <p className="text-2xl font-bold text-gray-900">
                  {staff.filter(s => s.is_active).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <span className="text-yellow-600 text-xl">🏢</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Departments</p>
                <p className="text-2xl font-bold text-gray-900">{departments.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <span className="text-purple-600 text-xl">⚠️</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Inactive Staff</p>
                <p className="text-2xl font-bold text-gray-900">
                  {staff.filter(s => !s.is_active).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Filters & Search</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Staff
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name, email, ID..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Department
                </label>
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Departments</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Job Title
                </label>
                <select
                  value={selectedJobTitle}
                  onChange={(e) => setSelectedJobTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Job Titles</option>
                  {jobTitles.map(title => (
                    <option key={title} value={title}>{title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Staff List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Staff Members ({filteredStaff.length})
            </h3>
          </div>

          {filteredStaff.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-gray-400 text-6xl mb-4">👥</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Staff Found</h3>
              <p className="text-gray-600">
                {staff.length === 0
                  ? 'No staff members have been added yet.'
                  : 'No staff members match your current filters.'
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Staff Member
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Department & Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredStaff.map((staffMember) => (
                    <tr key={staffMember.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            {staffMember.profile_photo_url ? (
                              <img
                                className="h-10 w-10 rounded-full object-cover"
                                src={staffMember.profile_photo_url}
                                alt={`${staffMember.first_name} ${staffMember.last_name}`}
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                <span className="text-gray-600 font-medium">
                                  {staffMember.first_name[0]}{staffMember.last_name[0]}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {staffMember.first_name} {staffMember.last_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              ID: {staffMember.staff_id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{staffMember.email}</div>
                        <div className="text-sm text-gray-500">{staffMember.phone || 'No phone'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{staffMember.department}</div>
                        <div className="text-sm text-gray-500">{staffMember.job_title}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          staffMember.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {staffMember.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(staffMember)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleToggleStatus(staffMember)}
                            className={`${
                              staffMember.is_active
                                ? 'text-red-600 hover:text-red-900'
                                : 'text-green-600 hover:text-green-900'
                            }`}
                          >
                            {staffMember.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => handleViewAuditLogs(staffMember)}
                            className="text-gray-600 hover:text-gray-900"
                          >
                            Logs
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Staff Modal */}
      {(showCreateForm || showEditForm) && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {showEditForm ? 'Edit Staff Member' : 'Add New Staff Member'}
                </h3>
                <button
                  onClick={() => {
                    setShowCreateForm(false);
                    setShowEditForm(false);
                    resetForm();
                    setError(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

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
                    <label className="absolute bottom-0 right-0 bg-blue-600 text-white rounded-full p-2 cursor-pointer hover:bg-blue-700">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoSelect}
                        className="hidden"
                      />
                      📷
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Staff ID *
                    </label>
                    <input
                      type="text"
                      name="staff_id"
                      value={formData.staff_id}
                      onChange={handleInputChange}
                      required
                      disabled={showEditForm}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                      placeholder="e.g., SMC001"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="email@smc.edu"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name *
                    </label>
                    <input
                      type="text"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="+260-XX-XXX-XXXX"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Department *
                    </label>
                    <select
                      name="department"
                      value={formData.department}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Department</option>
                      {departments.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Job Title *
                    </label>
                    <input
                      type="text"
                      name="job_title"
                      value={formData.job_title}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., Principal, Lecturer, Clinical Instructor"
                    />
                  </div>

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

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateForm(false);
                      setShowEditForm(false);
                      resetForm();
                      setError(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || uploadingPhoto}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting || uploadingPhoto ? 'Saving...' : (showEditForm ? 'Update Staff' : 'Create Staff')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Audit Logs Modal */}
      {showAuditLogs && selectedStaff && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Audit Logs - {selectedStaff.first_name} {selectedStaff.last_name}
                </h3>
                <button
                  onClick={() => {
                    setShowAuditLogs(false);
                    setSelectedStaff(null);
                    setAuditLogs([]);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="max-h-96 overflow-y-auto">
                {auditLogs.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-gray-400 text-4xl mb-4">📋</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Audit Logs</h3>
                    <p className="text-gray-600">No audit logs found for this staff member.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {auditLogs.map((log: any, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-4 border">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full mr-3 ${
                              log.action === 'created' ? 'bg-green-100 text-green-800' :
                              log.action === 'updated' ? 'bg-blue-100 text-blue-800' :
                              log.action === 'activated' ? 'bg-green-100 text-green-800' :
                              log.action === 'deactivated' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {log.action}
                            </span>
                            <span className="text-sm font-medium text-gray-900">
                              {log.action_description || `Staff member ${log.action}`}
                            </span>
                          </div>
                          <span className="text-sm text-gray-500">
                            {new Date(log.timestamp).toLocaleString()}
                          </span>
                        </div>

                        {log.changes && (
                          <div className="mt-2">
                            <details className="text-sm">
                              <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
                                View Changes
                              </summary>
                              <pre className="mt-2 p-2 bg-white rounded border text-xs overflow-x-auto">
                                {JSON.stringify(log.changes, null, 2)}
                              </pre>
                            </details>
                          </div>
                        )}

                        <div className="mt-2 text-xs text-gray-500">
                          Action by: {log.performed_by || 'System'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-4">
                <button
                  onClick={() => {
                    setShowAuditLogs(false);
                    setSelectedStaff(null);
                    setAuditLogs([]);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffManagement;
