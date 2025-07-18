'use client';

import React, { useState, useEffect } from 'react';

interface ResponsiveDashboardLayoutProps {
  children: React.ReactNode;
  sidebar: React.ReactNode;
  header?: React.ReactNode;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

const ResponsiveDashboardLayout: React.FC<ResponsiveDashboardLayoutProps> = ({
  children,
  sidebar,
  header,
  title,
  subtitle,
  actions
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="dashboard-layout">
      {/* Professional Header */}
      <header className="dashboard-header">

        <div className="responsive-container">
          <div className="responsive-flex responsive-flex-between">
            <div className="responsive-flex" style={{ alignItems: 'center', gap: 'var(--space-md)' }}>
              {/* Enhanced Mobile Menu Button */}
              <button
                onClick={toggleMobileMenu}
                className="responsive-hidden-desktop btn-modern btn-glass"
                style={{ padding: 'var(--space-sm)' }}
                aria-label="Toggle menu"
              >
                <svg
                  className="w-6 h-6 text-neon-cyan"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>

              {/* Professional Title Section */}
              <div>
                {title && (
                  <h1 className="responsive-text-2xl font-bold text-gray-900">
                    {title}
                  </h1>
                )}
                {subtitle && (
                  <p className="responsive-text-sm text-gray-600">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            {/* Header Actions */}
            {actions && (
              <div className="responsive-flex" style={{ gap: 'var(--space-sm)' }}>
                {actions}
              </div>
            )}
          </div>
        </div>

        {/* Custom Header Content */}
        {header}
      </header>

      {/* Mobile Overlay */}
      {isMobile && (
        <div
          className={`mobile-overlay ${isMobileMenuOpen ? 'active' : ''}`}
          onClick={closeMobileMenu}
        />
      )}

      {/* Sidebar */}
      <aside className={`dashboard-sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        {/* Enhanced Mobile Close Button */}
        {isMobile && (
          <div className="responsive-p-md border-b border-neon-cyan/30">
            <button
              onClick={closeMobileMenu}
              className="btn-modern btn-glass w-full"
            >
              <svg
                className="w-5 h-5 mr-2 text-neon-cyan"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              Close Menu
            </button>
          </div>
        )}

        {/* Sidebar Content */}
        <div className="responsive-scroll-vertical" style={{ height: '100%' }}>
          {sidebar}
        </div>
      </aside>

      {/* Main Content */}
      <main className="dashboard-main">
        <div className="responsive-container">
          {children}
        </div>
      </main>
    </div>
  );
};

export default ResponsiveDashboardLayout;

// Responsive Navigation Component
interface ResponsiveNavProps {
  items: Array<{
    id: string;
    label: string;
    icon: string;
    onClick?: () => void;
    active?: boolean;
  }>;
  title?: string;
  onItemClick?: (id: string) => void;
}

export const ResponsiveNav: React.FC<ResponsiveNavProps> = ({
  items,
  title,
  onItemClick
}) => {
  return (
    <nav className="responsive-nav">
      {title && (
        <div className="responsive-p-md border-b border-neon-cyan/30 relative">
          <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-cyber opacity-60"></div>
          <h3 className="responsive-text-lg font-semibold bg-gradient-to-r from-neon-cyan to-neon-purple bg-clip-text text-transparent">
            {title}
          </h3>
        </div>
      )}

      <div className="responsive-p-sm">
        {items.map((item, index) => (
          <button
            key={item.id}
            onClick={() => {
              item.onClick?.();
              onItemClick?.(item.id);
            }}
            className={`responsive-nav-item ${item.active ? 'active' : ''} animate-fade-in-left`}
            style={{animationDelay: `${index * 0.1}s`}}
          >
            <span className="responsive-nav-item-icon">{item.icon}</span>
            {item.label}
            {item.active && (
              <div className="absolute right-2 w-2 h-2 bg-neon-cyan rounded-full animate-glow-pulse"></div>
            )}
          </button>
        ))}
      </div>
    </nav>
  );
};

// Responsive Card Grid Component
interface ResponsiveCardGridProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
  gap?: 'sm' | 'md' | 'lg';
}

export const ResponsiveCardGrid: React.FC<ResponsiveCardGridProps> = ({
  children,
  columns = 3,
  gap = 'md'
}) => {
  const gridClass = `card-grid responsive-grid-${columns}`;
  const gapStyle = {
    gap: gap === 'sm' ? 'var(--space-sm)' : gap === 'lg' ? 'var(--space-lg)' : 'var(--space-md)'
  };

  return (
    <div className={gridClass} style={gapStyle}>
      {children}
    </div>
  );
};

// Responsive Table Component
interface ResponsiveTableProps {
  headers: string[];
  children: React.ReactNode;
  className?: string;
}

export const ResponsiveTable: React.FC<ResponsiveTableProps> = ({
  headers,
  children,
  className = ''
}) => {
  return (
    <div className={`professional-table ${className}`}>
      <table className="professional-table">
        <thead>
          <tr>
            {headers.map((header, index) => (
              <th key={index}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {children}
        </tbody>
      </table>
    </div>
  );
};

// Responsive Modal Component
interface ResponsiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

export const ResponsiveModal: React.FC<ResponsiveModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'md'
}) => {
  if (!isOpen) return null;

  const maxWidthStyle = {
    maxWidth: maxWidth === 'sm' ? '400px' : 
              maxWidth === 'lg' ? '800px' : 
              maxWidth === 'xl' ? '1200px' : '600px'
  };

  return (
    <div className="responsive-modal-overlay" onClick={onClose}>
      <div 
        className="responsive-modal" 
        style={maxWidthStyle}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="responsive-m-b-lg border-b border-gray-200 responsive-p-b-md">
            <h2 className="responsive-text-xl font-bold text-gray-900">
              {title}
            </h2>
          </div>
        )}
        
        <div className="responsive-p-t-md">
          {children}
        </div>

        <button
          onClick={onClose}
          className="absolute top-4 right-4 responsive-btn responsive-btn-secondary"
          style={{ padding: 'var(--space-xs)' }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};
