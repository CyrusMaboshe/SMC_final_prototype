'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { useTab } from '@/contexts/TabContext';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { activeTab, setActiveTab, preloadTab } = useTab();

  // Optimized tab switching
  const handleTabClick = useCallback((tab: string) => {
    setActiveTab(tab as any);
    setIsMenuOpen(false);
  }, [setActiveTab]);

  // Preload on hover
  const handleTabHover = useCallback((tab: string) => {
    preloadTab(tab as any);
  }, [preloadTab]);

  return (
    <header className="bg-white shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">SMC</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Sancta Maria College</h1>
              <p className="text-xs text-gray-600">Nursing and Midwifery</p>
            </div>
          </div>

          <nav className="hidden md:flex items-center space-x-4">
            <button
              onClick={() => handleTabClick('home')}
              onMouseEnter={() => handleTabHover('home')}
              className={`px-3 py-2 rounded transition-colors duration-150 ${
                activeTab === 'home' ? 'text-blue-600' : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              Home
            </button>
            <button
              onClick={() => handleTabClick('updates')}
              onMouseEnter={() => handleTabHover('updates')}
              className={`px-3 py-2 rounded transition-colors duration-150 ${
                activeTab === 'updates' ? 'text-blue-600' : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              Updates
            </button>
            <button
              onClick={() => handleTabClick('documents')}
              onMouseEnter={() => handleTabHover('documents')}
              className={`px-3 py-2 rounded transition-colors duration-150 ${
                activeTab === 'documents' ? 'text-blue-600' : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              Documents
            </button>
            <button
              onClick={() => handleTabClick('apply')}
              onMouseEnter={() => handleTabHover('apply')}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors duration-150"
            >
              Apply
            </button>
            <button
              onClick={() => handleTabClick('login')}
              onMouseEnter={() => handleTabHover('login')}
              className="border border-blue-600 text-blue-600 px-4 py-2 rounded hover:bg-blue-600 hover:text-white transition-colors duration-150"
            >
              Login
            </button>
          </nav>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-lg text-muted hover:bg-surface-hover hover:text-primary focus:outline-none transition-all duration-300"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className={`md:hidden transition-all duration-300 ease-in-out ${isMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
          <div className="bg-white border-t border-gray-200 mx-2 mt-4 p-4 space-y-2 rounded-lg shadow-lg">
            <button
              onClick={() => {
                setActiveTab('home');
                setIsMenuOpen(false);
              }}
              className={`block w-full text-left px-4 py-3 rounded-lg transition-colors duration-200 font-medium ${
                activeTab === 'home'
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
              }`}
            >
              <span className="flex items-center">
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Home
              </span>
            </button>
            <button
              onClick={() => {
                setActiveTab('updates');
                setIsMenuOpen(false);
              }}
              className={`block w-full text-left px-4 py-3 rounded-lg transition-colors duration-200 font-medium ${
                activeTab === 'updates'
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
              }`}
            >
              <span className="flex items-center">
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10m-10 0a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2" />
                </svg>
                Updates
              </span>
            </button>
            <button
              onClick={() => {
                setActiveTab('documents');
                setIsMenuOpen(false);
              }}
              className={`block w-full text-left px-4 py-3 rounded-lg transition-colors duration-200 font-medium ${
                activeTab === 'documents'
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
              }`}
            >
              <span className="flex items-center">
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Documents
              </span>
            </button>
            <button
              onClick={() => {
                setActiveTab('staffs');
                setIsMenuOpen(false);
              }}
              className={`block w-full text-left px-4 py-3 rounded-lg transition-colors duration-200 font-medium ${
                activeTab === 'staffs'
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
              }`}
            >
              <span className="flex items-center">
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Staffs
              </span>
            </button>
            <div className="pt-4 border-t border-gray-200 space-y-3">
              <button
                onClick={() => {
                  setActiveTab('apply');
                  setIsMenuOpen(false);
                }}
                className={`w-full py-3 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors duration-200 ${
                  activeTab === 'apply' ? 'bg-blue-700' : ''
                }`}
              >
                <span className="flex items-center justify-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Apply Now
                </span>
              </button>
              <button
                onClick={() => {
                  setActiveTab('login');
                  setIsMenuOpen(false);
                }}
                className={`w-full py-3 rounded-lg font-semibold border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white transition-colors duration-200 ${
                  activeTab === 'login' ? 'bg-blue-600 text-white' : ''
                }`}
              >
                <span className="flex items-center justify-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  Login
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
