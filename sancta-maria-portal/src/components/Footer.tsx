import React from 'react';
import Link from 'next/link';

const Footer = () => {
  return (
    <footer className="bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 text-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* College Information */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                <span className="text-blue-900 font-bold text-lg">SMC</span>
              </div>
              <div>
                <h3 className="text-xl font-bold">Sancta Maria College</h3>
                <p className="text-blue-200 text-sm">of Nursing</p>
              </div>
            </div>
            <p className="text-blue-200 text-sm leading-relaxed">
              Excellence in nursing education, compassionate care, and professional development for future healthcare leaders.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-white">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link href="#home" className="text-blue-200 hover:text-white transition-colors duration-300 text-sm">
                  Home
                </Link>
              </li>
              <li>
                <Link href="#apply" className="text-blue-200 hover:text-white transition-colors duration-300 text-sm">
                  Apply Now
                </Link>
              </li>
              <li>
                <Link href="#updates" className="text-blue-200 hover:text-white transition-colors duration-300 text-sm">
                  Updates
                </Link>
              </li>
              <li>
                <Link href="#documents" className="text-blue-200 hover:text-white transition-colors duration-300 text-sm">
                  Documents
                </Link>
              </li>
              <li>
                <Link href="#login" className="text-blue-200 hover:text-white transition-colors duration-300 text-sm">
                  Student Login
                </Link>
              </li>
            </ul>
          </div>

          {/* Academic Programs */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-white">Programs</h4>
            <ul className="space-y-2">
              <li className="text-blue-200 text-sm">Bachelor of Nursing</li>
              <li className="text-blue-200 text-sm">Diploma in Nursing</li>
              <li className="text-blue-200 text-sm">Certificate Programs</li>
              <li className="text-blue-200 text-sm">Continuing Education</li>
              <li className="text-blue-200 text-sm">Professional Development</li>
            </ul>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-white">Contact Us</h4>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <svg className="w-5 h-5 text-blue-300 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-blue-200 text-sm">123 Healthcare Avenue</p>
                  <p className="text-blue-200 text-sm">Medical District, City</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-blue-300" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                </svg>
                <p className="text-blue-200 text-sm">+1 (555) 123-4567</p>
              </div>
              
              <div className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-blue-300" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
                <p className="text-blue-200 text-sm">info@sanctamaria.edu</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-blue-700 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-blue-200 text-sm">
              © 2024 Sancta Maria College of Nursing. All rights reserved.
            </div>
            <div className="flex space-x-6">
              <Link href="#privacy" className="text-blue-200 hover:text-white transition-colors duration-300 text-sm">
                Privacy Policy
              </Link>
              <Link href="#terms" className="text-blue-200 hover:text-white transition-colors duration-300 text-sm">
                Terms of Service
              </Link>
              <Link href="#accessibility" className="text-blue-200 hover:text-white transition-colors duration-300 text-sm">
                Accessibility
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
