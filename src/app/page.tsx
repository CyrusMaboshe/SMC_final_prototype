'use client';

import React, { useState, useEffect, lazy, Suspense, useMemo, useCallback } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { TabProvider, useTab } from '@/contexts/TabContext';
import { siteSettingsAPI } from '@/lib/supabase';
import { initPerformanceOptimizations } from '@/utils/performanceOptimizations';

// Lazy load components for better performance
const LoginSection = lazy(() => import('@/components/LoginSection'));
const ApplyNowForm = lazy(() => import('@/components/ApplyNowForm'));
const UpdatesSection = lazy(() => import('@/components/UpdatesSection'));
const DocumentsSection = lazy(() => import('@/components/DocumentsSection'));
const StaffsSection = lazy(() => import('@/components/StaffsSection'));

// Fast loading skeleton
const QuickSkeleton = () => (
  <div className="animate-pulse p-8">
    <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
    <div className="space-y-3">
      <div className="h-4 bg-gray-200 rounded w-full"></div>
      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
    </div>
  </div>
);

const MainContent = () => {
  const { activeTab, setActiveTab, preloadedTabs, preloadTab } = useTab();
  const [homepageSettings, setHomepageSettings] = useState<any>({});

  useEffect(() => {
    fetchHomepageSettings();
  }, []);

  const fetchHomepageSettings = async () => {
    try {
      const settings = await siteSettingsAPI.getHomepageSettings();
      setHomepageSettings(settings);
    } catch (error) {
      console.error('Failed to fetch homepage settings:', error);
      // Use default values if fetch fails
      setHomepageSettings({
        welcome_message: 'Welcome to Sancta Maria College of Nursing and Midwifery'
      });
    }
  };

  // Preload components on hover for instant switching
  const handleTabHover = useCallback((tab: string) => {
    preloadTab(tab as any);
  }, [preloadTab]);

  // Optimized tab switching with instant response
  const handleTabClick = useCallback((tab: string) => {
    setActiveTab(tab as any);
  }, [setActiveTab]);

  const renderContent = () => {
    switch (activeTab) {
      case 'login':
        return (
          <Suspense fallback={<QuickSkeleton />}>
            <LoginSection />
          </Suspense>
        );
      case 'apply':
        return (
          <Suspense fallback={<QuickSkeleton />}>
            <ApplyNowForm />
          </Suspense>
        );
      case 'updates':
        return (
          <Suspense fallback={<QuickSkeleton />}>
            <UpdatesSection />
          </Suspense>
        );
      case 'documents':
        return (
          <Suspense fallback={<QuickSkeleton />}>
            <DocumentsSection />
          </Suspense>
        );
      case 'staffs':
        return (
          <Suspense fallback={<QuickSkeleton />}>
            <StaffsSection />
          </Suspense>
        );
      case 'home':
      default:
        return (
          <>
            {/* Hero Section */}
            <section className="bg-blue-600 text-white py-20">
              <div className="container mx-auto px-4 text-center">
                <h1 className="text-4xl md:text-6xl font-bold mb-6">
                  {homepageSettings.welcome_message || 'Welcome to Sancta Maria College'}
                </h1>
                <p className="text-xl mb-8">
                  Excellence in Nursing Education
                </p>
                <div className="space-x-4">
                  <button
                    onClick={() => handleTabClick('apply')}
                    onMouseEnter={() => handleTabHover('apply')}
                    className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors duration-150"
                  >
                    Apply Now
                  </button>
                  <button
                    onClick={() => handleTabClick('login')}
                    onMouseEnter={() => handleTabHover('login')}
                    className="border border-white text-white px-6 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors duration-150"
                  >
                    Student Login
                  </button>
                </div>
              </div>
            </section>

            {/* Quick Access Cards */}
            <section className="py-16 bg-gray-800">
              <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div
                    onClick={() => handleTabClick('login')}
                    onMouseEnter={() => handleTabHover('login')}
                    className="bg-gray-700 p-6 rounded-lg shadow-lg cursor-pointer hover:bg-gray-600 transition-all duration-200 border border-gray-600"
                  >
                    <div className="text-center">
                      <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-white text-xl">👤</span>
                      </div>
                      <h3 className="text-lg font-semibold mb-2 text-white">Student Login</h3>
                      <p className="text-gray-300 text-sm">Access your portal</p>
                    </div>
                  </div>

                  <div
                    onClick={() => handleTabClick('apply')}
                    onMouseEnter={() => handleTabHover('apply')}
                    className="bg-gray-700 p-6 rounded-lg shadow-lg cursor-pointer hover:bg-gray-600 transition-all duration-200 border border-gray-600"
                  >
                    <div className="text-center">
                      <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-white text-xl">📝</span>
                      </div>
                      <h3 className="text-lg font-semibold mb-2 text-white">Apply Now</h3>
                      <p className="text-gray-300 text-sm">Start your application</p>
                    </div>
                  </div>

                  <div
                    onClick={() => handleTabClick('updates')}
                    onMouseEnter={() => handleTabHover('updates')}
                    className="bg-gray-700 p-6 rounded-lg shadow-lg cursor-pointer hover:bg-gray-600 transition-all duration-200 border border-gray-600"
                  >
                    <div className="text-center">
                      <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-white text-xl">📢</span>
                      </div>
                      <h3 className="text-lg font-semibold mb-2 text-white">Updates</h3>
                      <p className="text-gray-300 text-sm">Latest news</p>
                    </div>
                  </div>

                  <div
                    onClick={() => handleTabClick('documents')}
                    onMouseEnter={() => handleTabHover('documents')}
                    className="bg-gray-700 p-6 rounded-lg shadow-lg cursor-pointer hover:bg-gray-600 transition-all duration-200 border border-gray-600"
                  >
                    <div className="text-center">
                      <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-white text-xl">📁</span>
                      </div>
                      <h3 className="text-lg font-semibold mb-2 text-white">Documents</h3>
                      <p className="text-gray-300 text-sm">Important files</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>


          </>
        );
    }
  };

  return (
    <div className="py-8">
      {renderContent()}
    </div>
  );
};

export default function Home() {
  // Initialize performance optimizations
  useEffect(() => {
    initPerformanceOptimizations();
  }, []);

  return (
    <TabProvider>
      <div className="min-h-screen bg-white">
        <div>
          <Header />
          <MainContent />
          <Footer />
        </div>
      </div>
    </TabProvider>
  );
}
