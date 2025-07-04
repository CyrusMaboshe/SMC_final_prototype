'use client';

import React, { useState, useEffect } from 'react';
import { Staff, staffAPI } from '@/lib/supabase';

const StaffsSection = () => {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [filteredStaff, setFilteredStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [departments, setDepartments] = useState<string[]>([]);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const data = await staffAPI.getAll();
      setStaff(data || []);
      setError(null);
    } catch (err: any) {
      console.warn('Failed to fetch staff, using sample data:', err);
      // Provide sample staff data when database is not set up
      setStaff([
        {
          id: 'sample-1',
          staff_id: 'SMC001',
          first_name: 'Dr. Sarah',
          last_name: 'Johnson',
          email: 'sarah.johnson@smc.edu',
          phone: '+260-97-123-4567',
          department: 'Nursing',
          job_title: 'Principal',
          academic_qualifications: 'PhD in Nursing Education, MSc in Clinical Nursing',
          specialization: 'Nursing Education & Administration',
          profile_photo_url: null,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'sample-2',
          staff_id: 'SMC002',
          first_name: 'Prof. Michael',
          last_name: 'Banda',
          email: 'michael.banda@smc.edu',
          phone: '+260-97-234-5678',
          department: 'Academic',
          job_title: 'Senior Lecturer',
          academic_qualifications: 'PhD in Medical Sciences, MSc in Public Health',
          specialization: 'Community Health & Research',
          profile_photo_url: null,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'sample-3',
          staff_id: 'SMC003',
          first_name: 'Ms. Grace',
          last_name: 'Mwanza',
          email: 'grace.mwanza@smc.edu',
          phone: '+260-97-345-6789',
          department: 'Clinical',
          job_title: 'Clinical Instructor',
          academic_qualifications: 'BSc in Nursing, Diploma in Midwifery',
          specialization: 'Maternal & Child Health',
          profile_photo_url: null,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]);
      setError('Database not configured. Showing sample data. Please set up the database schema.');
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const data = await staffAPI.getDepartments();
      // Extract department names from the objects returned by the API
      const departmentNames = data?.map((dept: { name: string }) => dept.name) || [];
      setDepartments(departmentNames);
    } catch (err: any) {
      console.warn('Failed to fetch departments, using fallback:', err);
      // Fallback departments if database is not set up
      setDepartments([
        'Nursing',
        'Administration',
        'Academic',
        'Clinical',
        'Support',
        'Management'
      ]);
    }
  };

  useEffect(() => {
    fetchStaff();
    fetchDepartments();
  }, []);

  useEffect(() => {
    let filtered = staff.filter(member => member.is_active);

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(member =>
        member.first_name.toLowerCase().includes(term) ||
        member.last_name.toLowerCase().includes(term) ||
        member.email.toLowerCase().includes(term) ||
        member.job_title.toLowerCase().includes(term) ||
        member.department.toLowerCase().includes(term)
      );
    }

    if (selectedDepartment !== 'all') {
      filtered = filtered.filter(member => member.department === selectedDepartment);
    }

    setFilteredStaff(filtered);
  }, [staff, searchTerm, selectedDepartment]);

  const getDepartmentIcon = (department: string) => {
    const icons: Record<string, string> = {
      'nursing': '🏥',
      'administration': '📋',
      'academic': '📚',
      'clinical': '⚕️',
      'support': '🔧',
      'management': '👔'
    };
    return icons[department.toLowerCase()] || '👤';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    const isDatabaseError = error.includes('Database not configured') || error.includes('table not found');

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`${isDatabaseError ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'} border rounded-lg p-6`}>
            <div className={`${isDatabaseError ? 'text-yellow-600' : 'text-red-600'} mb-4 text-center`}>
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isDatabaseError ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                )}
              </svg>
            </div>

            {isDatabaseError ? (
              <div className="text-center">
                <h3 className="text-lg font-semibold text-yellow-800 mb-2">Database Setup Required</h3>
                <p className="text-yellow-700 mb-4">The staff management database tables haven't been created yet.</p>
                <div className="bg-white rounded-lg p-4 mb-4 text-left">
                  <h4 className="font-semibold text-gray-900 mb-2">Setup Instructions:</h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
                    <li>Go to your Supabase project dashboard</li>
                    <li>Navigate to the SQL Editor</li>
                    <li>Copy and paste the contents of <code className="bg-gray-100 px-1 rounded">database/staff_management_schema.sql</code></li>
                    <li>Execute the SQL script</li>
                    <li>Refresh this page</li>
                  </ol>
                </div>
                <p className="text-sm text-yellow-600 mb-4">
                  For now, showing sample staff data to demonstrate the interface.
                </p>
              </div>
            ) : (
              <div className="text-center">
                <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Staff Directory</h3>
                <p className="text-red-700 mb-4">{error}</p>
              </div>
            )}

            <div className="text-center">
              <button
                onClick={fetchStaff}
                className={`${isDatabaseError ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-red-600 hover:bg-red-700'} text-white px-4 py-2 rounded-lg font-medium transition-colors`}
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Our <span className="text-blue-600">Staff Directory</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Meet our dedicated team of professionals committed to excellence in nursing education and healthcare.
          </p>
        </div>

        {/* Database Setup Notice */}
        {staff.length > 0 && staff[0].id === 'sample-1' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
            <div className="flex items-center">
              <div className="text-blue-600 mr-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-blue-800 font-medium">Showing Sample Data</p>
                <p className="text-blue-700 text-sm">Database not configured. Set up the database schema to manage real staff data.</p>
              </div>
            </div>
          </div>
        )}

        {/* Search and Filter Controls */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                Search Staff
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name, email, title, or department..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="md:w-64">
              <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Department
              </label>
              <select
                id="department"
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value="all">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Staff Count */}
        <div className="mb-6">
          <p className="text-gray-600">
            Showing <span className="font-semibold text-blue-600">{filteredStaff.length}</span> of{' '}
            <span className="font-semibold">{staff.filter(s => s.is_active).length}</span> active staff members
          </p>
        </div>

        {/* Staff Grid */}
        {filteredStaff.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Staff Found</h3>
            <p className="text-gray-600">
              {searchTerm || selectedDepartment !== 'all'
                ? 'Try adjusting your search criteria or filters.'
                : 'No staff members are currently available.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredStaff.map((member) => (
              <div
                key={member.id}
                className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100 overflow-hidden"
              >
                <div className="p-6">
                  <div className="text-center mb-4">
                    {member.profile_photo_url ? (
                      <img
                        src={member.profile_photo_url}
                        alt={`${member.first_name} ${member.last_name}`}
                        className="w-20 h-20 rounded-full mx-auto object-cover border-4 border-blue-100"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full mx-auto bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-2xl font-bold">
                        {member.first_name.charAt(0)}{member.last_name.charAt(0)}
                      </div>
                    )}
                  </div>
                  
                  <div className="text-center">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">
                      {member.first_name} {member.last_name}
                    </h3>
                    <p className="text-blue-600 font-medium mb-2">{member.job_title}</p>
                    
                    <div className="flex items-center justify-center mb-3">
                      <span className="text-lg mr-2">{getDepartmentIcon(member.department)}</span>
                      <span className="text-sm text-gray-600">{member.department}</span>
                    </div>
                    
                    {member.specialization && (
                      <p className="text-sm text-gray-500 mb-3 italic">
                        Specialization: {member.specialization}
                      </p>
                    )}
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-center text-sm text-gray-600">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        {member.email}
                      </div>
                      
                      {member.phone && (
                        <div className="flex items-center justify-center text-sm text-gray-600">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          {member.phone}
                        </div>
                      )}
                    </div>
                    
                    {member.academic_qualifications && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <p className="text-xs text-gray-500 font-medium mb-1">Academic Qualifications</p>
                        <p className="text-sm text-gray-700">{member.academic_qualifications}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffsSection;
