'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface NavigationItem {
  id: string;
  label: string;
  icon: string;
  path?: string;
  onClick?: () => void;
  active?: boolean;
  badge?: number;
  children?: NavigationItem[];
}

interface SwipeGesture {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  startTime: number;
}

interface EnhancedResponsiveNavigationProps {
  items: NavigationItem[];
  title?: string;
  onItemClick?: (id: string) => void;
  showBreadcrumbs?: boolean;
  enableSwipeGestures?: boolean;
  collapsible?: boolean;
}

const EnhancedResponsiveNavigation: React.FC<EnhancedResponsiveNavigationProps> = ({
  items,
  title,
  onItemClick,
  showBreadcrumbs = true,
  enableSwipeGestures = true,
  collapsible = true
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const navRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [swipeGesture, setSwipeGesture] = useState<SwipeGesture | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [breadcrumbs, setBreadcrumbs] = useState<NavigationItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredItems, setFilteredItems] = useState<NavigationItem[]>(items);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Update breadcrumbs based on current path
  useEffect(() => {
    const findBreadcrumbs = (items: NavigationItem[], path: string): NavigationItem[] => {
      for (const item of items) {
        if (item.path === path) {
          return [item];
        }
        if (item.children) {
          const childBreadcrumbs = findBreadcrumbs(item.children, path);
          if (childBreadcrumbs.length > 0) {
            return [item, ...childBreadcrumbs];
          }
        }
      }
      return [];
    };

    setBreadcrumbs(findBreadcrumbs(items, pathname));
  }, [items, pathname]);

  // Filter items based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredItems(items);
      return;
    }

    const filterItems = (items: NavigationItem[]): NavigationItem[] => {
      return items.filter(item => {
        const matchesSearch = item.label.toLowerCase().includes(searchQuery.toLowerCase());
        const hasMatchingChildren = item.children && filterItems(item.children).length > 0;
        return matchesSearch || hasMatchingChildren;
      }).map(item => ({
        ...item,
        children: item.children ? filterItems(item.children) : undefined
      }));
    };

    setFilteredItems(filterItems(items));
  }, [items, searchQuery]);

  // Handle swipe gestures
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enableSwipeGestures || !isMobile) return;

    const touch = e.touches[0];
    setSwipeGesture({
      startX: touch.clientX,
      startY: touch.clientY,
      currentX: touch.clientX,
      currentY: touch.clientY,
      startTime: Date.now()
    });
  }, [enableSwipeGestures, isMobile]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!swipeGesture || !enableSwipeGestures) return;

    const touch = e.touches[0];
    setSwipeGesture(prev => prev ? {
      ...prev,
      currentX: touch.clientX,
      currentY: touch.clientY
    } : null);

    // Prevent scrolling during horizontal swipe
    const deltaX = Math.abs(touch.clientX - swipeGesture.startX);
    const deltaY = Math.abs(touch.clientY - swipeGesture.startY);
    
    if (deltaX > deltaY && deltaX > 10) {
      e.preventDefault();
    }
  }, [swipeGesture, enableSwipeGestures]);

  const handleTouchEnd = useCallback(() => {
    if (!swipeGesture || !enableSwipeGestures) return;

    const deltaX = swipeGesture.currentX - swipeGesture.startX;
    const deltaY = Math.abs(swipeGesture.currentY - swipeGesture.startY);
    const deltaTime = Date.now() - swipeGesture.startTime;

    // Swipe right to open (from left edge)
    if (deltaX > 50 && deltaY < 100 && deltaTime < 300 && swipeGesture.startX < 50) {
      setIsOpen(true);
    }
    // Swipe left to close
    else if (deltaX < -50 && deltaY < 100 && deltaTime < 300 && isOpen) {
      setIsOpen(false);
    }

    setSwipeGesture(null);
  }, [swipeGesture, enableSwipeGestures, isOpen]);

  // Handle item click
  const handleItemClick = useCallback((item: NavigationItem) => {
    if (item.children && item.children.length > 0) {
      // Toggle expansion for items with children
      setExpandedItems(prev => {
        const newSet = new Set(prev);
        if (newSet.has(item.id)) {
          newSet.delete(item.id);
        } else {
          newSet.add(item.id);
        }
        return newSet;
      });
    } else {
      // Handle navigation
      if (item.path) {
        router.push(item.path);
      }
      if (item.onClick) {
        item.onClick();
      }
      if (onItemClick) {
        onItemClick(item.id);
      }
      
      // Close mobile menu after navigation
      if (isMobile) {
        setIsOpen(false);
      }
    }
  }, [router, onItemClick, isMobile]);

  // Render navigation item
  const renderNavigationItem = (item: NavigationItem, level: number = 0) => {
    const isExpanded = expandedItems.has(item.id);
    const hasChildren = item.children && item.children.length > 0;
    const isActive = item.active || item.path === pathname;

    return (
      <div key={item.id} className="responsive-nav-item-container">
        <button
          onClick={() => handleItemClick(item)}
          className={`responsive-nav-item ${isActive ? 'active' : ''}`}
          style={{ paddingLeft: `${(level * 16) + 16}px` }}
        >
          <span className="responsive-nav-item-icon">{item.icon}</span>
          <span className="flex-1 text-left">{item.label}</span>
          
          {item.badge && item.badge > 0 && (
            <span className="responsive-nav-badge">
              {item.badge > 99 ? '99+' : item.badge}
            </span>
          )}
          
          {hasChildren && (
            <span className={`responsive-nav-chevron ${isExpanded ? 'expanded' : ''}`}>
              ▼
            </span>
          )}
        </button>

        {hasChildren && isExpanded && (
          <div className="responsive-nav-submenu">
            {item.children!.map(child => renderNavigationItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isMobile && isOpen && (
        <div
          className="mobile-overlay active"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Navigation Container */}
      <nav
        ref={navRef}
        className={`enhanced-responsive-nav ${isOpen ? 'mobile-open' : ''}`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Navigation Header */}
        <div className="responsive-nav-header">
          {isMobile && (
            <button
              onClick={() => setIsOpen(false)}
              className="responsive-nav-close-btn"
              aria-label="Close navigation"
            >
              ✕
            </button>
          )}
          
          {title && (
            <h3 className="responsive-nav-title">{title}</h3>
          )}
        </div>

        {/* Search Bar */}
        <div className="responsive-nav-search">
          <div className="responsive-nav-search-container">
            <span className="responsive-nav-search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search navigation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="responsive-nav-search-input"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="responsive-nav-search-clear"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Breadcrumbs */}
        {showBreadcrumbs && breadcrumbs.length > 0 && (
          <div className="responsive-nav-breadcrumbs">
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={crumb.id}>
                {index > 0 && <span className="responsive-nav-breadcrumb-separator">›</span>}
                <button
                  onClick={() => handleItemClick(crumb)}
                  className="responsive-nav-breadcrumb"
                >
                  <span className="responsive-nav-breadcrumb-icon">{crumb.icon}</span>
                  {crumb.label}
                </button>
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Navigation Items */}
        <div className="responsive-nav-items">
          {filteredItems.length > 0 ? (
            filteredItems.map(item => renderNavigationItem(item))
          ) : (
            <div className="responsive-nav-no-results">
              <span className="responsive-nav-no-results-icon">🔍</span>
              <p className="responsive-nav-no-results-text">No items found</p>
              <button
                onClick={() => setSearchQuery('')}
                className="responsive-nav-no-results-clear"
              >
                Clear search
              </button>
            </div>
          )}
        </div>

        {/* Navigation Footer */}
        <div className="responsive-nav-footer">
          <div className="responsive-nav-footer-info">
            <span className="responsive-text-xs text-gray-500">
              {filteredItems.length} items
            </span>
            {enableSwipeGestures && isMobile && (
              <span className="responsive-text-xs text-gray-400">
                Swipe to navigate
              </span>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile Menu Button */}
      {isMobile && (
        <button
          onClick={() => setIsOpen(true)}
          className="responsive-mobile-menu-btn"
          aria-label="Open navigation menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      )}

      <style jsx>{`
        .enhanced-responsive-nav {
          position: fixed;
          top: 0;
          left: 0;
          height: 100vh;
          width: 280px;
          background: white;
          border-right: 1px solid #e5e7eb;
          display: flex;
          flex-direction: column;
          z-index: 100;
          transition: transform 0.3s ease-in-out;
          overflow: hidden;
        }

        @media (max-width: 768px) {
          .enhanced-responsive-nav {
            transform: translateX(-100%);
            box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
          }

          .enhanced-responsive-nav.mobile-open {
            transform: translateX(0);
          }
        }

        .responsive-nav-header {
          padding: var(--space-md);
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .responsive-nav-close-btn {
          padding: var(--space-xs);
          border: none;
          background: none;
          font-size: var(--text-lg);
          cursor: pointer;
          color: #6b7280;
        }

        .responsive-nav-title {
          font-size: var(--text-lg);
          font-weight: 600;
          color: #111827;
          margin: 0;
        }

        .responsive-nav-search {
          padding: var(--space-md);
          border-bottom: 1px solid #e5e7eb;
        }

        .responsive-nav-search-container {
          position: relative;
          display: flex;
          align-items: center;
        }

        .responsive-nav-search-icon {
          position: absolute;
          left: var(--space-sm);
          color: #6b7280;
          font-size: var(--text-sm);
        }

        .responsive-nav-search-input {
          width: 100%;
          padding: var(--space-sm) var(--space-sm) var(--space-sm) var(--space-xl);
          border: 1px solid #d1d5db;
          border-radius: var(--space-sm);
          font-size: var(--text-sm);
          background: #f9fafb;
        }

        .responsive-nav-search-clear {
          position: absolute;
          right: var(--space-sm);
          padding: var(--space-xs);
          border: none;
          background: none;
          color: #6b7280;
          cursor: pointer;
        }

        .responsive-nav-breadcrumbs {
          padding: var(--space-sm) var(--space-md);
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: var(--space-xs);
          background: #f9fafb;
        }

        .responsive-nav-breadcrumb {
          display: flex;
          align-items: center;
          gap: var(--space-xs);
          padding: var(--space-xs);
          border: none;
          background: none;
          color: #6b7280;
          font-size: var(--text-xs);
          cursor: pointer;
          border-radius: var(--space-xs);
        }

        .responsive-nav-breadcrumb:hover {
          background: #e5e7eb;
        }

        .responsive-nav-breadcrumb-separator {
          color: #9ca3af;
          font-size: var(--text-xs);
        }

        .responsive-nav-items {
          flex: 1;
          overflow-y: auto;
          padding: var(--space-sm);
        }

        .responsive-nav-item-container {
          margin-bottom: var(--space-xs);
        }

        .responsive-nav-badge {
          background: #ef4444;
          color: white;
          font-size: var(--text-xs);
          font-weight: 600;
          padding: 2px 6px;
          border-radius: 10px;
          min-width: 18px;
          text-align: center;
        }

        .responsive-nav-chevron {
          font-size: var(--text-xs);
          color: #6b7280;
          transition: transform 0.2s ease;
        }

        .responsive-nav-chevron.expanded {
          transform: rotate(180deg);
        }

        .responsive-nav-submenu {
          margin-top: var(--space-xs);
          border-left: 2px solid #e5e7eb;
          margin-left: var(--space-md);
        }

        .responsive-nav-no-results {
          text-align: center;
          padding: var(--space-xl);
          color: #6b7280;
        }

        .responsive-nav-no-results-icon {
          font-size: var(--text-2xl);
          display: block;
          margin-bottom: var(--space-sm);
        }

        .responsive-nav-no-results-text {
          font-size: var(--text-sm);
          margin-bottom: var(--space-md);
        }

        .responsive-nav-no-results-clear {
          padding: var(--space-sm) var(--space-md);
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: var(--space-sm);
          font-size: var(--text-sm);
          cursor: pointer;
        }

        .responsive-nav-footer {
          padding: var(--space-md);
          border-top: 1px solid #e5e7eb;
          background: #f9fafb;
        }

        .responsive-nav-footer-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .responsive-mobile-menu-btn {
          position: fixed;
          top: var(--space-md);
          left: var(--space-md);
          z-index: 101;
          padding: var(--space-sm);
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: var(--space-sm);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          cursor: pointer;
        }

        @media (min-width: 769px) {
          .responsive-mobile-menu-btn {
            display: none;
          }
        }
      `}</style>
    </>
  );
};

export default EnhancedResponsiveNavigation;
