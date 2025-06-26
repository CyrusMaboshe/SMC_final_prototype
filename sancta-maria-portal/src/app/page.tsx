'use client';

import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import LoginSection from '@/components/LoginSection';
import ApplyNowForm from '@/components/ApplyNowForm';
import UpdatesSection from '@/components/UpdatesSection';
import DocumentsSection from '@/components/DocumentsSection';
import { TabProvider, useTab } from '@/contexts/TabContext';

const MainContent = () => {
  const { activeTab, setActiveTab } = useTab();

  const renderContent = () => {
    switch (activeTab) {
      case 'login':
        return <LoginSection />;
      case 'apply':
        return <ApplyNowForm />;
      case 'updates':
        return <UpdatesSection />;
      case 'documents':
        return <DocumentsSection />;
      case 'home':
      default:
        return (
          <>
            {/* Hero Section */}
            <section className="relative py-20 lg:py-32 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-900/10 to-blue-600/10"></div>
              <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="text-center max-w-4xl mx-auto">
                  <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                    Welcome to <span className="text-blue-600">Sancta Maria College</span>
                    <br />
                    <span className="text-3xl md:text-4xl text-blue-800">of Nursing</span>
                  </h1>
                  <p className="text-xl md:text-2xl text-gray-600 mb-8 leading-relaxed">
                    Shaping the future of healthcare through excellence in nursing education,
                    compassionate care, and innovative learning experiences.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                    <button
                      onClick={() => setActiveTab('apply')}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-full font-semibold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                    >
                      📝 Apply Now
                    </button>
                    <button
                      onClick={() => setActiveTab('login')}
                      className="border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white px-8 py-4 rounded-full font-semibold text-lg transition-all duration-300 transform hover:scale-105"
                    >
                      👤 Student Login
                    </button>
                  </div>
                </div>
              </div>

              {/* Floating Elements */}
              <div className="absolute top-20 left-10 w-20 h-20 bg-blue-200 rounded-full opacity-20 animate-pulse"></div>
              <div className="absolute bottom-20 right-10 w-32 h-32 bg-blue-300 rounded-full opacity-20 animate-pulse delay-1000"></div>
              <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-blue-400 rounded-full opacity-20 animate-pulse delay-500"></div>
            </section>

            {/* Quick Access Cards */}
            <section className="py-16 bg-white">
              <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">

                  {/* Login Card */}
                  <div
                    onClick={() => setActiveTab('login')}
                    className="group bg-gradient-to-br from-blue-50 to-blue-100 p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-blue-200 cursor-pointer"
                  >
                    <div className="text-center">
                      <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                        <span className="text-2xl">👤</span>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">Student Login</h3>
                      <p className="text-gray-600 mb-4">Access your student portal, grades, and academic resources</p>
                      <div className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full font-medium transition-all duration-300 transform group-hover:scale-105 inline-block">
                        Login
                      </div>
                    </div>
                  </div>

                  {/* Apply Now Card */}
                  <div
                    onClick={() => setActiveTab('apply')}
                    className="group bg-gradient-to-br from-green-50 to-green-100 p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-green-200 cursor-pointer"
                  >
                    <div className="text-center">
                      <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                        <span className="text-2xl">📝</span>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">Apply Now</h3>
                      <p className="text-gray-600 mb-4">Start your journey in nursing education with our application process</p>
                      <div className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-full font-medium transition-all duration-300 transform group-hover:scale-105 inline-block">
                        Apply
                      </div>
                    </div>
                  </div>

                  {/* Updates Card */}
                  <div
                    onClick={() => setActiveTab('updates')}
                    className="group bg-gradient-to-br from-purple-50 to-purple-100 p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-purple-200 cursor-pointer"
                  >
                    <div className="text-center">
                      <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                        <span className="text-2xl">📢</span>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">Updates</h3>
                      <p className="text-gray-600 mb-4">Stay informed with the latest news, announcements, and events</p>
                      <div className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-full font-medium transition-all duration-300 transform group-hover:scale-105 inline-block">
                        View Updates
                      </div>
                    </div>
                  </div>

                  {/* Documents Card */}
                  <div
                    onClick={() => setActiveTab('documents')}
                    className="group bg-gradient-to-br from-orange-50 to-orange-100 p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-orange-200 cursor-pointer"
                  >
                    <div className="text-center">
                      <div className="w-16 h-16 bg-orange-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                        <span className="text-2xl">📁</span>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">Documents</h3>
                      <p className="text-gray-600 mb-4">Access important forms, handbooks, and academic resources</p>
                      <div className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-full font-medium transition-all duration-300 transform group-hover:scale-105 inline-block">
                        Browse Documents
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </section>

            {/* Features Section */}
            <section className="py-16 bg-gradient-to-r from-blue-50 to-blue-100">
              <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                  <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                    Why Choose Sancta Maria College?
                  </h2>
                  <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                    Experience excellence in nursing education with our comprehensive programs,
                    state-of-the-art facilities, and dedicated faculty.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="text-center group">
                    <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                      <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Excellence in Education</h3>
                    <p className="text-gray-600">Comprehensive curriculum designed to prepare future healthcare leaders</p>
                  </div>

                  <div className="text-center group">
                    <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                      <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 7.172V5L8 4z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Modern Facilities</h3>
                    <p className="text-gray-600">State-of-the-art laboratories and simulation centers for hands-on learning</p>
                  </div>

                  <div className="text-center group">
                    <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                      <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Expert Faculty</h3>
                    <p className="text-gray-600">Learn from experienced professionals dedicated to your success</p>
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
  return (
    <TabProvider>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
        <Header />
        <MainContent />
        <Footer />
      </div>
    </TabProvider>
  );
}
