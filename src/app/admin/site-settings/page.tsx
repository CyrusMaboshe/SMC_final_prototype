'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, siteSettingsAPI, SiteSettings } from '@/lib/supabase';

const SiteSettingsManagement = () => {
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState<SiteSettings[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeCategory, setActiveCategory] = useState<'footer' | 'header' | 'general' | 'contact' | 'homepage'>('homepage');
  const [editingSettings, setEditingSettings] = useState<{[key: string]: string}>({});
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user, activeCategory]);

  const checkAuth = () => {
    try {
      const currentUser = authAPI.getCurrentUser();
      if (!currentUser || currentUser.role !== 'admin') {
        router.push('/');
        return;
      }
      setUser(currentUser);
    } catch (error) {
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      setError('');
      const data = await siteSettingsAPI.getByCategory(activeCategory);
      setSettings(data || []);
      
      // Initialize editing state
      const editingState: {[key: string]: string} = {};
      data?.forEach(setting => {
        editingState[setting.setting_key] = setting.setting_value;
      });
      setEditingSettings(editingState);
    } catch (err: any) {
      setError('Failed to fetch settings: ' + err.message);
    }
  };

  const handleInputChange = (settingKey: string, value: string) => {
    setEditingSettings(prev => ({
      ...prev,
      [settingKey]: value
    }));
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      // Update all changed settings one by one
      const changedSettings = Object.entries(editingSettings).filter(([key, value]) => {
        const originalSetting = settings.find(s => s.setting_key === key);
        return originalSetting && originalSetting.setting_value !== value;
      });

      if (changedSettings.length === 0) {
        setSuccess('No changes to save.');
        setSaving(false);
        return;
      }

      let updatedCount = 0;
      for (const [key, value] of changedSettings) {
        try {
          await siteSettingsAPI.updateSetting(key, value);
          updatedCount++;
        } catch (err: any) {
          console.error(`Failed to update ${key}:`, err);
          throw new Error(`Failed to update ${key}: ${err.message}`);
        }
      }

      setSuccess(`Successfully updated ${updatedCount} setting${updatedCount !== 1 ? 's' : ''}!`);
      await fetchSettings(); // Refresh the data

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const handleResetSettings = () => {
    // Reset to original values
    const resetState: {[key: string]: string} = {};
    settings.forEach(setting => {
      resetState[setting.setting_key] = setting.setting_value;
    });
    setEditingSettings(resetState);
    setError('');
    setSuccess('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/admin/dashboard')}
                className="text-blue-600 hover:text-blue-800 mr-4"
              >
                ← Back to Dashboard
              </button>
              <h1 className="text-xl font-bold text-gray-900">⚙️ Site Settings</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleResetSettings}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Reset Changes
              </button>
              <button
                onClick={handleSaveSettings}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Category Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { key: 'homepage', label: 'Homepage Settings', icon: '🏠' },
                { key: 'footer', label: 'Footer Settings', icon: '🦶' },
                { key: 'header', label: 'Header Settings', icon: '📄' },
                { key: 'contact', label: 'Contact Info', icon: '📞' },
                { key: 'general', label: 'General', icon: '⚙️' }
              ].map((category) => (
                <button
                  key={category.key}
                  onClick={() => setActiveCategory(category.key as any)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeCategory === category.key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="mr-2">{category.icon}</span>
                  {category.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Alert Messages */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            {success}
          </div>
        )}

        {/* Settings Form */}
        <div className="bg-white shadow-sm rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              {activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1)} Settings
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Manage your website's {activeCategory} content. Changes will be reflected immediately on the site.
            </p>
          </div>

          <div className="p-6">
            {settings.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📝</span>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Settings Found</h3>
                <p className="text-gray-600">No settings available for this category.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {settings.map((setting) => (
                  <div key={setting.id} className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      {setting.description || setting.setting_key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </label>
                    {setting.setting_type === 'text' && setting.setting_value.length > 100 ? (
                      <textarea
                        value={editingSettings[setting.setting_key] || ''}
                        onChange={(e) => handleInputChange(setting.setting_key, e.target.value)}
                        disabled={!setting.is_editable}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        placeholder={`Enter ${setting.description || setting.setting_key}`}
                      />
                    ) : (
                      <input
                        type={setting.setting_type === 'number' ? 'number' : 'text'}
                        value={editingSettings[setting.setting_key] || ''}
                        onChange={(e) => handleInputChange(setting.setting_key, e.target.value)}
                        disabled={!setting.is_editable}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        placeholder={`Enter ${setting.description || setting.setting_key}`}
                      />
                    )}
                    {!setting.is_editable && (
                      <p className="text-xs text-gray-500">This setting is not editable</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SiteSettingsManagement;
