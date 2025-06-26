'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, adminAPI, applicationAPI } from '@/lib/supabase';

const AdminDashboard = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [counts, setCounts] = useState({
    students: 0,
    lecturers: 0,
    courses: 0,
    applications: 0
  });
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = () => {
    try {
      const currentUser = authAPI.getCurrentUser();
      if (!currentUser || currentUser.role !== 'admin') {
        router.push('/');
        return;
      }
      setUser(currentUser);
      fetchCounts();
    } catch (error) {
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const fetchCounts = async () => {
    try {
      console.log('Fetching counts...');
      const [studentsData, lecturersData, coursesData, applicationsData] = await Promise.all([
        adminAPI.getAllStudents(),
        adminAPI.getAllLecturers(),
        adminAPI.getAllCourses(),
        applicationAPI.getAll()
      ]);

      console.log('Data fetched:', {
        students: studentsData?.length || 0,
        lecturers: lecturersData?.length || 0,
        courses: coursesData?.length || 0,
        applications: applicationsData?.length || 0
      });

      setCounts({
        students: studentsData?.length || 0,
        lecturers: lecturersData?.length || 0,
        courses: coursesData?.length || 0,
        applications: applicationsData?.length || 0
      });
    } catch (error) {
      console.error('Failed to fetch counts:', error);
    }
  };

  const handleLogout = () => {
    authAPI.logout();
    router.push('/');
  };



  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg border-r border-gray-200 flex-shrink-0">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">Admin Panel</h1>
          <p className="text-sm text-gray-600">Sancta Maria College</p>
        </div>

        <nav className="mt-6">
          <div className="px-3">
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors mb-1 ${
                activeTab === 'overview'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="mr-3">📊</span>
              Overview
            </button>

            <button
              onClick={() => router.push('/admin/students')}
              className="w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors mb-1 text-gray-700 hover:bg-gray-100"
            >
              <span className="mr-3">👥</span>
              Manage Students
            </button>

            <button
              onClick={() => router.push('/admin/lecturers')}
              className="w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors mb-1 text-gray-700 hover:bg-gray-100"
            >
              <span className="mr-3">👨‍🏫</span>
              Manage Lecturers
            </button>

            <button
              onClick={() => router.push('/admin/courses')}
              className="w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors mb-1 text-gray-700 hover:bg-gray-100"
            >
              <span className="mr-3">📚</span>
              Manage Courses
            </button>

            <button
              onClick={() => setActiveTab('system')}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors mb-1 ${
                activeTab === 'system'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="mr-3">🔍</span>
              System Logs
            </button>
          </div>
        </nav>

        <div className="absolute bottom-0 w-64 p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-6 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {activeTab === 'overview' ? 'System Overview' : 'System Logs'}
                </h2>
                <p className="text-sm text-gray-600">Welcome, Administrator</p>
              </div>
              <button
                onClick={fetchCounts}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Refresh Data
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'overview' && (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                          <span className="text-white text-sm">👥</span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-blue-600">Total Students</p>
                        <p className="text-2xl font-bold text-blue-900">{counts.students}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-50 rounded-lg p-6 border border-green-200">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                          <span className="text-white text-sm">👨‍🏫</span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-green-600">Total Lecturers</p>
                        <p className="text-2xl font-bold text-green-900">{counts.lecturers}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-purple-50 rounded-lg p-6 border border-purple-200">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                          <span className="text-white text-sm">📚</span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-purple-600">Active Courses</p>
                        <p className="text-2xl font-bold text-purple-900">{counts.courses}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-orange-50 rounded-lg p-6 border border-orange-200">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center">
                          <span className="text-white text-sm">📝</span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-orange-600">Applications</p>
                        <p className="text-2xl font-bold text-orange-900">{counts.applications}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'system' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">System Logs</h2>
                <div className="bg-gray-50 rounded-lg p-8 text-center">
                  <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">🔍</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No System Logs</h3>
                  <p className="text-gray-600">System activity logs will appear here.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
