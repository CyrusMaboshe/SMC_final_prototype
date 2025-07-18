'use client';

import React, { useState, useEffect } from 'react';
import ResponsiveDashboardLayout, { ResponsiveNav, ResponsiveCardGrid, ResponsiveTable, ResponsiveModal } from '@/components/ResponsiveDashboardLayout';

const ResponsiveTestPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [screenSize, setScreenSize] = useState({ width: 0, height: 0 });
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const updateScreenSize = () => {
      setScreenSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    updateScreenSize();
    window.addEventListener('resize', updateScreenSize);
    return () => window.removeEventListener('resize', updateScreenSize);
  }, []);

  const getBreakpointInfo = () => {
    const width = screenSize.width;
    if (width <= 320) return { name: 'XS', color: 'bg-red-100 text-red-800' };
    if (width <= 375) return { name: 'SM', color: 'bg-orange-100 text-orange-800' };
    if (width <= 425) return { name: 'MD', color: 'bg-yellow-100 text-yellow-800' };
    if (width <= 768) return { name: 'LG', color: 'bg-green-100 text-green-800' };
    if (width <= 1024) return { name: 'XL', color: 'bg-blue-100 text-blue-800' };
    return { name: '2XL', color: 'bg-purple-100 text-purple-800' };
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'cards', label: 'Card Grids', icon: '🃏' },
    { id: 'tables', label: 'Tables', icon: '📋' },
    { id: 'forms', label: 'Forms', icon: '📝' },
    { id: 'modals', label: 'Modals', icon: '🪟' },
    { id: 'typography', label: 'Typography', icon: '📝' }
  ];

  const renderOverview = () => {
    const breakpoint = getBreakpointInfo();
    
    return (
      <div className="space-y-6">
        <div className="responsive-card">
          <h2 className="responsive-text-2xl font-bold text-gray-900 responsive-m-b-md">
            Responsive Design Test
          </h2>
          
          <div className="responsive-grid responsive-grid-2">
            <div>
              <h3 className="responsive-text-lg font-semibold text-gray-700 responsive-m-b-sm">
                Current Screen Info
              </h3>
              <div className="space-y-2">
                <div className="responsive-flex responsive-flex-between">
                  <span className="responsive-text-sm text-gray-600">Width:</span>
                  <span className="responsive-text-sm font-medium">{screenSize.width}px</span>
                </div>
                <div className="responsive-flex responsive-flex-between">
                  <span className="responsive-text-sm text-gray-600">Height:</span>
                  <span className="responsive-text-sm font-medium">{screenSize.height}px</span>
                </div>
                <div className="responsive-flex responsive-flex-between">
                  <span className="responsive-text-sm text-gray-600">Breakpoint:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${breakpoint.color}`}>
                    {breakpoint.name}
                  </span>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="responsive-text-lg font-semibold text-gray-700 responsive-m-b-sm">
                Breakpoint Ranges
              </h3>
              <div className="space-y-1">
                <div className="responsive-text-xs text-gray-600">XS: ≤320px</div>
                <div className="responsive-text-xs text-gray-600">SM: 321-375px</div>
                <div className="responsive-text-xs text-gray-600">MD: 376-425px</div>
                <div className="responsive-text-xs text-gray-600">LG: 426-768px</div>
                <div className="responsive-text-xs text-gray-600">XL: 769-1024px</div>
                <div className="responsive-text-xs text-gray-600">2XL: ≥1025px</div>
              </div>
            </div>
          </div>
        </div>

        <div className="responsive-card">
          <h3 className="responsive-text-lg font-semibold text-gray-900 responsive-m-b-md">
            Responsive Features Test
          </h3>
          <div className="responsive-grid responsive-grid-3">
            <div className="responsive-p-md border rounded">
              <h4 className="responsive-text-base font-medium text-gray-800 responsive-m-b-sm">
                Fluid Typography
              </h4>
              <div className="space-y-2">
                <div className="responsive-text-xs">Extra Small Text</div>
                <div className="responsive-text-sm">Small Text</div>
                <div className="responsive-text-base">Base Text</div>
                <div className="responsive-text-lg">Large Text</div>
                <div className="responsive-text-xl">Extra Large Text</div>
              </div>
            </div>
            
            <div className="responsive-p-md border rounded">
              <h4 className="responsive-text-base font-medium text-gray-800 responsive-m-b-sm">
                Responsive Spacing
              </h4>
              <div className="space-y-2">
                <div className="responsive-p-xs bg-blue-100 rounded">XS Padding</div>
                <div className="responsive-p-sm bg-green-100 rounded">SM Padding</div>
                <div className="responsive-p-md bg-yellow-100 rounded">MD Padding</div>
              </div>
            </div>
            
            <div className="responsive-p-md border rounded">
              <h4 className="responsive-text-base font-medium text-gray-800 responsive-m-b-sm">
                Responsive Buttons
              </h4>
              <div className="space-y-2">
                <button className="responsive-btn responsive-btn-primary w-full">
                  Primary Button
                </button>
                <button className="responsive-btn responsive-btn-secondary w-full">
                  Secondary Button
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCards = () => (
    <div className="space-y-6">
      <h2 className="responsive-text-2xl font-bold text-gray-900">Card Grid Tests</h2>
      
      <div>
        <h3 className="responsive-text-lg font-semibold text-gray-700 responsive-m-b-md">
          2-Column Grid
        </h3>
        <ResponsiveCardGrid columns={2}>
          <div className="responsive-card bg-blue-50">
            <h4 className="responsive-text-base font-medium">Card 1</h4>
            <p className="responsive-text-sm text-gray-600">This is a test card in a 2-column grid.</p>
          </div>
          <div className="responsive-card bg-green-50">
            <h4 className="responsive-text-base font-medium">Card 2</h4>
            <p className="responsive-text-sm text-gray-600">This is another test card in a 2-column grid.</p>
          </div>
        </ResponsiveCardGrid>
      </div>

      <div>
        <h3 className="responsive-text-lg font-semibold text-gray-700 responsive-m-b-md">
          3-Column Grid
        </h3>
        <ResponsiveCardGrid columns={3}>
          <div className="responsive-card bg-purple-50">
            <h4 className="responsive-text-base font-medium">Card A</h4>
            <p className="responsive-text-sm text-gray-600">3-column grid card.</p>
          </div>
          <div className="responsive-card bg-yellow-50">
            <h4 className="responsive-text-base font-medium">Card B</h4>
            <p className="responsive-text-sm text-gray-600">3-column grid card.</p>
          </div>
          <div className="responsive-card bg-red-50">
            <h4 className="responsive-text-base font-medium">Card C</h4>
            <p className="responsive-text-sm text-gray-600">3-column grid card.</p>
          </div>
        </ResponsiveCardGrid>
      </div>

      <div>
        <h3 className="responsive-text-lg font-semibold text-gray-700 responsive-m-b-md">
          4-Column Grid
        </h3>
        <ResponsiveCardGrid columns={4}>
          {[1, 2, 3, 4].map(num => (
            <div key={num} className="responsive-card bg-gray-50">
              <h4 className="responsive-text-base font-medium">Card {num}</h4>
              <p className="responsive-text-sm text-gray-600">4-column grid.</p>
            </div>
          ))}
        </ResponsiveCardGrid>
      </div>
    </div>
  );

  const renderTables = () => (
    <div className="space-y-6">
      <h2 className="responsive-text-2xl font-bold text-gray-900">Responsive Table Test</h2>
      
      <ResponsiveTable 
        headers={['Name', 'Role', 'Status', 'Created', 'Actions']}
      >
        <tr>
          <td className="font-medium">John Doe</td>
          <td>
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Student
            </span>
          </td>
          <td>
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Active
            </span>
          </td>
          <td className="responsive-text-sm text-gray-600">2024-01-15</td>
          <td>
            <button className="responsive-btn responsive-btn-secondary responsive-text-xs">
              Edit
            </button>
          </td>
        </tr>
        <tr>
          <td className="font-medium">Jane Smith</td>
          <td>
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              Lecturer
            </span>
          </td>
          <td>
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Active
            </span>
          </td>
          <td className="responsive-text-sm text-gray-600">2024-01-10</td>
          <td>
            <button className="responsive-btn responsive-btn-secondary responsive-text-xs">
              Edit
            </button>
          </td>
        </tr>
      </ResponsiveTable>
    </div>
  );

  const renderForms = () => (
    <div className="space-y-6">
      <h2 className="responsive-text-2xl font-bold text-gray-900">Responsive Form Test</h2>
      
      <div className="responsive-card">
        <form className="space-y-4">
          <div className="responsive-form-group">
            <label className="responsive-form-label">Full Name</label>
            <input 
              type="text" 
              className="responsive-form-input" 
              placeholder="Enter your full name"
            />
          </div>
          
          <div className="responsive-grid responsive-grid-2">
            <div className="responsive-form-group">
              <label className="responsive-form-label">Email</label>
              <input 
                type="email" 
                className="responsive-form-input" 
                placeholder="Enter your email"
              />
            </div>
            
            <div className="responsive-form-group">
              <label className="responsive-form-label">Phone</label>
              <input 
                type="tel" 
                className="responsive-form-input" 
                placeholder="Enter your phone"
              />
            </div>
          </div>
          
          <div className="responsive-form-group">
            <label className="responsive-form-label">Message</label>
            <textarea 
              className="responsive-form-input" 
              rows={4}
              placeholder="Enter your message"
            />
          </div>
          
          <div className="responsive-flex responsive-flex-between">
            <button type="button" className="responsive-btn responsive-btn-secondary">
              Cancel
            </button>
            <button type="submit" className="responsive-btn responsive-btn-primary">
              Submit Form
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const renderModals = () => (
    <div className="space-y-6">
      <h2 className="responsive-text-2xl font-bold text-gray-900">Modal Test</h2>
      
      <div className="responsive-card">
        <p className="responsive-text-base text-gray-700 responsive-m-b-md">
          Test the responsive modal component:
        </p>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="responsive-btn responsive-btn-primary"
        >
          Open Modal
        </button>
      </div>

      <ResponsiveModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Responsive Modal Test"
      >
        <div className="space-y-4">
          <p className="responsive-text-base text-gray-700">
            This modal should be responsive across all screen sizes while maintaining
            its visual integrity and functionality.
          </p>
          
          <div className="responsive-form-group">
            <label className="responsive-form-label">Test Input</label>
            <input 
              type="text" 
              className="responsive-form-input" 
              placeholder="Test input in modal"
            />
          </div>
          
          <div className="responsive-flex responsive-flex-between">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="responsive-btn responsive-btn-secondary"
            >
              Cancel
            </button>
            <button className="responsive-btn responsive-btn-primary">
              Save Changes
            </button>
          </div>
        </div>
      </ResponsiveModal>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'cards':
        return renderCards();
      case 'tables':
        return renderTables();
      case 'forms':
        return renderForms();
      case 'modals':
        return renderModals();
      default:
        return <div>Content for {activeTab} coming soon...</div>;
    }
  };

  return (
    <ResponsiveDashboardLayout
      title="Responsive Design Test"
      subtitle="Testing responsive components across all breakpoints"
      sidebar={
        <ResponsiveNav
          title="Test Sections"
          items={tabs.map(tab => ({
            ...tab,
            active: activeTab === tab.id,
            onClick: () => setActiveTab(tab.id)
          }))}
        />
      }
    >
      {renderContent()}
    </ResponsiveDashboardLayout>
  );
};

export default ResponsiveTestPage;
