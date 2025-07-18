import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { siteSettingsAPI, supabase } from '@/lib/supabase';

const Footer = () => {
  const [footerSettings, setFooterSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFooterSettings();

    // Set up real-time subscription for site_settings changes
    const subscription = supabase
      .channel('site_settings_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'site_settings',
          filter: 'category=eq.footer'
        },
        (payload) => {
          console.log('Footer settings updated:', payload);
          fetchFooterSettings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const fetchFooterSettings = async () => {
    try {
      const settings = await siteSettingsAPI.getFooterSettings();
      setFooterSettings(settings);
    } catch (error) {
      console.error('Failed to fetch footer settings:', error);
      // Use default values if fetch fails
      setFooterSettings({
        college_name: 'Sancta Maria College',
        college_subtitle: 'of Nursing and Midwifery',
        college_description: 'Excellence in nursing education, compassionate care, and professional development for future healthcare leaders.',
        contact_address_line1: '123 Healthcare Avenue',
        contact_address_line2: 'Medical District, City',
        contact_phone: '+1 (555) 123-4567',
        contact_email: 'info@sanctamaria.edu',
        copyright_text: '© 2024 Sancta Maria College of Nursing and Midwifery. All rights reserved.',
        privacy_policy_link: '#privacy',
        terms_service_link: '#terms',
        accessibility_link: '#accessibility',
        programs_bachelor: 'Bachelor of Nursing',
        programs_diploma: 'Diploma in Nursing',
        programs_certificate: 'Certificate Programs',
        programs_continuing: 'Continuing Education',
        programs_professional: 'Professional Development'
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <footer className="bg-gradient-dark text-foreground">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-blue"></div>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="bg-gray-900 text-white relative">
      <div className="bg-blue-600 h-1"></div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* College Information */}
          <div className="space-y-4 animate-fadeInUp">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">SMC</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">
                  {footerSettings.college_name || 'Sancta Maria College'}
                </h3>
                <p className="text-gray-300 text-sm">{footerSettings.college_subtitle || 'of Nursing and Midwifery'}</p>
              </div>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed">
              {footerSettings.college_description || 'Excellence in nursing education, compassionate care, and professional development for future healthcare leaders.'}
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-white">
              Quick Links
            </h4>
            <ul className="space-y-2">
              <li>
                <Link href="#home" className="text-gray-300 hover:text-white transition-colors duration-300 text-sm">
                  Home
                </Link>
              </li>
              <li>
                <Link href="#apply" className="text-gray-300 hover:text-white transition-colors duration-300 text-sm">
                  Apply Now
                </Link>
              </li>
              <li>
                <Link href="#updates" className="text-gray-300 hover:text-white transition-colors duration-200 text-sm">
                  Updates
                </Link>
              </li>
              <li>
                <Link href="#documents" className="text-white/70 hover:text-neon-cyan transition-all duration-300 text-sm hover:translate-x-1 inline-block">
                  Documents
                </Link>
              </li>
              <li>
                <Link href="#login" className="text-white/70 hover:text-neon-cyan transition-all duration-300 text-sm hover:translate-x-1 inline-block">
                  Student Login
                </Link>
              </li>
            </ul>
          </div>

          {/* Academic Programs */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-white">Programs</h4>
            <ul className="space-y-2">
              <li className="text-blue-200 text-sm">{footerSettings.programs_bachelor || 'Bachelor of Nursing'}</li>
              <li className="text-blue-200 text-sm">{footerSettings.programs_diploma || 'Diploma in Nursing'}</li>
              <li className="text-blue-200 text-sm">{footerSettings.programs_certificate || 'Certificate Programs'}</li>
              <li className="text-blue-200 text-sm">{footerSettings.programs_continuing || 'Continuing Education'}</li>
              <li className="text-blue-200 text-sm">{footerSettings.programs_professional || 'Professional Development'}</li>
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
                  <p className="text-blue-200 text-sm">{footerSettings.contact_address_line1 || '123 Healthcare Avenue'}</p>
                  <p className="text-blue-200 text-sm">{footerSettings.contact_address_line2 || 'Medical District, City'}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-blue-300" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                </svg>
                <p className="text-blue-200 text-sm">{footerSettings.contact_phone || '+1 (555) 123-4567'}</p>
              </div>

              <div className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-blue-300" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
                <p className="text-blue-200 text-sm">{footerSettings.contact_email || 'info@sanctamaria.edu'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-neon-cyan/30 mt-8 pt-8 relative">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-cyber opacity-60"></div>
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0 animate-fade-in-up" style={{animationDelay: '0.4s'}}>
            <div className="text-white/70 text-sm">
              {footerSettings.copyright_text || '© 2024 Sancta Maria College of Nursing and Midwifery. All rights reserved.'}
            </div>
            <div className="flex space-x-6">
              <Link href={footerSettings.privacy_policy_link || '#privacy'} className="text-white/70 hover:text-neon-cyan transition-all duration-300 text-sm hover:translate-y-[-1px]">
                Privacy Policy
              </Link>
              <Link href={footerSettings.terms_service_link || '#terms'} className="text-white/70 hover:text-neon-cyan transition-all duration-300 text-sm hover:translate-y-[-1px]">
                Terms of Service
              </Link>
              <Link href={footerSettings.accessibility_link || '#accessibility'} className="text-blue-200 hover:text-white transition-colors duration-300 text-sm">
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
