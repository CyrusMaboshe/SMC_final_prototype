'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useTab } from '@/contexts/TabContext';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { activeTab, setActiveTab } = useTab();

  return (
    <header className="bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 shadow-2xl sticky top-0 z-50 backdrop-blur-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo and College Name */}
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg transform hover:scale-110 transition-transform duration-300">
                <span className="text-blue-900 font-bold text-xl">SMC</span>
              </div>
            </div>
            <div className="hidden md:block">
              <h1 className="text-white font-bold text-xl lg:text-2xl">
                Sancta Maria College
              </h1>
              <p className="text-blue-200 text-sm">of Nursing and Midwifery</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <button
              onClick={() => setActiveTab('home')}
              className={`text-white hover:text-blue-200 transition-colors duration-300 font-medium relative group ${
                activeTab === 'home' ? 'text-blue-200' : ''
              }`}
            >
              Home
              <span className={`absolute -bottom-1 left-0 h-0.5 bg-blue-200 transition-all duration-300 ${
                activeTab === 'home' ? 'w-full' : 'w-0 group-hover:w-full'
              }`}></span>
            </button>
            <button
              onClick={() => setActiveTab('updates')}
              className={`text-white hover:text-blue-200 transition-colors duration-300 font-medium relative group ${
                activeTab === 'updates' ? 'text-blue-200' : ''
              }`}
            >
              Updates
              <span className={`absolute -bottom-1 left-0 h-0.5 bg-blue-200 transition-all duration-300 ${
                activeTab === 'updates' ? 'w-full' : 'w-0 group-hover:w-full'
              }`}></span>
            </button>
            <button
              onClick={() => setActiveTab('documents')}
              className={`text-white hover:text-blue-200 transition-colors duration-300 font-medium relative group ${
                activeTab === 'documents' ? 'text-blue-200' : ''
              }`}
            >
              Documents
              <span className={`absolute -bottom-1 left-0 h-0.5 bg-blue-200 transition-all duration-300 ${
                activeTab === 'documents' ? 'w-full' : 'w-0 group-hover:w-full'
              }`}></span>
            </button>
            <button
              onClick={() => setActiveTab('apply')}
              className={`px-6 py-2 rounded-full font-medium transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl ${
                activeTab === 'apply'
                  ? 'bg-green-600 hover:bg-green-500 text-white'
                  : 'bg-blue-600 hover:bg-blue-500 text-white'
              }`}
            >
              Apply Now
            </button>
            <button
              onClick={() => setActiveTab('login')}
              className={`px-6 py-2 rounded-full font-medium transition-all duration-300 transform hover:scale-105 ${
                activeTab === 'login'
                  ? 'bg-white text-blue-900 border-2 border-white'
                  : 'border-2 border-white text-white hover:bg-white hover:text-blue-900'
              }`}
            >
              Login
            </button>
          </nav>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-white hover:text-blue-200 focus:outline-none focus:text-blue-200 transition-colors duration-300"
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
        <div className={`md:hidden transition-all duration-300 ease-in-out ${isMenuOpen ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
          <div className="px-2 pt-2 pb-3 space-y-1 bg-blue-800 rounded-lg mt-2 shadow-lg">
            <button
              onClick={() => {
                setActiveTab('home');
                setIsMenuOpen(false);
              }}
              className={`block w-full text-left px-3 py-2 rounded-md transition-all duration-300 ${
                activeTab === 'home'
                  ? 'text-blue-200 bg-blue-700'
                  : 'text-white hover:text-blue-200 hover:bg-blue-700'
              }`}
            >
              Home
            </button>
            <button
              onClick={() => {
                setActiveTab('updates');
                setIsMenuOpen(false);
              }}
              className={`block w-full text-left px-3 py-2 rounded-md transition-all duration-300 ${
                activeTab === 'updates'
                  ? 'text-blue-200 bg-blue-700'
                  : 'text-white hover:text-blue-200 hover:bg-blue-700'
              }`}
            >
              Updates
            </button>
            <button
              onClick={() => {
                setActiveTab('documents');
                setIsMenuOpen(false);
              }}
              className={`block w-full text-left px-3 py-2 rounded-md transition-all duration-300 ${
                activeTab === 'documents'
                  ? 'text-blue-200 bg-blue-700'
                  : 'text-white hover:text-blue-200 hover:bg-blue-700'
              }`}
            >
              Documents
            </button>
            <button
              onClick={() => {
                setActiveTab('apply');
                setIsMenuOpen(false);
              }}
              className={`block w-full px-3 py-2 rounded-md font-medium transition-all duration-300 text-center ${
                activeTab === 'apply'
                  ? 'bg-green-600 hover:bg-green-500 text-white'
                  : 'bg-blue-600 hover:bg-blue-500 text-white'
              }`}
            >
              Apply Now
            </button>
            <button
              onClick={() => {
                setActiveTab('login');
                setIsMenuOpen(false);
              }}
              className={`block w-full px-3 py-2 rounded-md font-medium transition-all duration-300 text-center ${
                activeTab === 'login'
                  ? 'bg-white text-blue-900 border-2 border-white'
                  : 'border-2 border-white text-white hover:bg-white hover:text-blue-900'
              }`}
            >
              Login
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
