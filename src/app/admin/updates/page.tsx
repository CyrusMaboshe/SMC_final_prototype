'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, updatesAPI, Update } from '@/lib/supabase';
import { useRealTimeUpdates } from '@/hooks/useRealTimeUpdates';
import { uploadFile, validateFile, formatFileSize, getFileIcon } from '@/utils/fileUpload';

const UpdatesManagement = () => {
  const [user, setUser] = useState(null);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [filteredUpdates, setFilteredUpdates] = useState<Update[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUpdate, setEditingUpdate] = useState<Update | null>(null);
  const [selectedUpdates, setSelectedUpdates] = useState<string[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [statistics, setStatistics] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'general_updates' as Update['category'],
    priority: 'normal' as Update['priority'],
    is_published: false,
    publish_date: '',
    expiry_date: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  const categories = [
    { value: 'all', label: 'All Categories', icon: '📢' },
    { value: 'exam_announcements', label: 'Exam Announcements', icon: '📝' },
    { value: 'meeting_schedules', label: 'Meeting Schedules', icon: '📅' },
    { value: 'graduation_alerts', label: 'Graduation Alerts', icon: '🎓' },
    { value: 'general_updates', label: 'General Updates', icon: '📰' }
  ];

  const priorities = [
    { value: 'low', label: 'Low', color: 'bg-gray-100 text-gray-800' },
    { value: 'normal', label: 'Normal', color: 'bg-blue-100 text-blue-800' },
    { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-800' },
    { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-800' }
  ];

  // Real-time updates
  useRealTimeUpdates('updates', () => {
    fetchUpdates();
    fetchStatistics();
  });

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      fetchUpdates();
      fetchStatistics();
    }
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [updates, filterCategory, filterStatus]);

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

  const fetchUpdates = async () => {
    try {
      setError('');
      const data = await updatesAPI.getAllForAdmin();
      setUpdates(data || []);
    } catch (err: any) {
      setError('Failed to fetch updates: ' + err.message);
    }
  };

  const fetchStatistics = async () => {
    try {
      const stats = await updatesAPI.getStatistics();
      setStatistics(stats);
    } catch (err: any) {
      console.error('Failed to fetch statistics:', err);
    }
  };



  const applyFilters = () => {
    let filtered = [...updates];

    if (filterCategory !== 'all') {
      filtered = filtered.filter(update => update.category === filterCategory);
    }

    if (filterStatus !== 'all') {
      const isPublished = filterStatus === 'published';
      filtered = filtered.filter(update => update.is_published === isPublished);
    }

    setFilteredUpdates(filtered);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validation = validateFile(file, ['application/pdf', 'image/jpeg', 'image/png'], 50 * 1024 * 1024);
      if (!validation.isValid) {
        setError(validation.error || 'Invalid file');
        return;
      }
      setSelectedFile(file);
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      // Get the actual user UUID from database
      const currentUser = authAPI.getCurrentUser();

      let userUUID = await authAPI.getCurrentUserUUID();

      // Fallback: use known admin UUID if database query fails
      if (!userUUID && currentUser?.username === 'SMC20252025') {
        userUUID = 'a5255f32-9126-4d37-afa7-ef58a08e8b4f';
      }

      if (!userUUID) {
        setError('Unable to get user information. Please log in again.');
        setIsSubmitting(false);
        return;
      }

      let fileData = {};

      // Upload file if selected
      if (selectedFile) {
        setUploading(true);
        const uploadResult = await uploadFile(selectedFile, {
          bucket: 'updates',
          folder: `update_${Date.now()}`,
          allowedTypes: ['application/pdf', 'image/jpeg', 'image/png'],
          maxSize: 50 * 1024 * 1024
        });

        fileData = {
          file_path: uploadResult.path,
          file_name: uploadResult.fileName,
          file_size: uploadResult.fileSize,
          file_url: uploadResult.url
        };
        setUploading(false);
      }

      const updateData = {
        ...formData,
        ...fileData,
        created_by: userUUID,
        publish_date: formData.publish_date || undefined,
        expiry_date: formData.expiry_date || undefined
      };



      if (editingUpdate) {
        await updatesAPI.update(editingUpdate.id, updateData);
        setSuccess('Update modified successfully!');
      } else {
        await updatesAPI.create(updateData);
        setSuccess('Update created successfully!');
      }

      resetForm();
      await fetchUpdates();
      await fetchStatistics();
    } catch (err: any) {
      console.error('Error saving update:', err);
      setError(err.message || 'Failed to save update');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (update: Update) => {
    setEditingUpdate(update);
    setFormData({
      title: update.title,
      content: update.content,
      category: update.category,
      priority: update.priority,
      is_published: update.is_published,
      publish_date: update.publish_date?.split('T')[0] || '',
      expiry_date: update.expiry_date?.split('T')[0] || ''
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this update?')) return;

    try {
      await updatesAPI.delete(id);
      setSuccess('Update deleted successfully!');
      await fetchUpdates();
      await fetchStatistics();
    } catch (err: any) {
      setError('Failed to delete update: ' + err.message);
    }
  };

  const handleBulkAction = async (action: 'publish' | 'unpublish' | 'delete') => {
    if (selectedUpdates.length === 0) {
      setError('Please select updates to perform bulk action');
      return;
    }

    const confirmMessage = action === 'delete' 
      ? `Are you sure you want to delete ${selectedUpdates.length} update(s)?`
      : `Are you sure you want to ${action} ${selectedUpdates.length} update(s)?`;

    if (!confirm(confirmMessage)) return;

    try {
      if (action === 'delete') {
        await updatesAPI.bulkDelete(selectedUpdates);
        setSuccess(`${selectedUpdates.length} update(s) deleted successfully!`);
      } else {
        const isPublished = action === 'publish';
        await updatesAPI.bulkUpdateStatus(selectedUpdates, isPublished);
        setSuccess(`${selectedUpdates.length} update(s) ${action}ed successfully!`);
      }

      setSelectedUpdates([]);
      await fetchUpdates();
      await fetchStatistics();
    } catch (err: any) {
      setError(`Failed to ${action} updates: ` + err.message);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      category: 'general_updates',
      priority: 'normal',
      is_published: false,
      publish_date: '',
      expiry_date: ''
    });
    setSelectedFile(null);
    setEditingUpdate(null);
    setShowCreateForm(false);
  };

  const toggleSelectUpdate = (id: string) => {
    setSelectedUpdates(prev => 
      prev.includes(id) 
        ? prev.filter(updateId => updateId !== id)
        : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    setSelectedUpdates(
      selectedUpdates.length === filteredUpdates.length 
        ? [] 
        : filteredUpdates.map(update => update.id)
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getCategoryIcon = (category: string) => {
    const cat = categories.find(c => c.value === category);
    return cat?.icon || '📢';
  };

  const getPriorityColor = (priority: string) => {
    const p = priorities.find(pr => pr.value === priority);
    return p?.color || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
              <h1 className="text-xl font-bold text-gray-900">📢 Manage Updates</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowCreateForm(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                + Create Update
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics Cards */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <span className="text-white text-sm">📊</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-blue-600">Total Updates</p>
                  <p className="text-2xl font-bold text-blue-900">{statistics.total}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                    <span className="text-white text-sm">✅</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-green-600">Published</p>
                  <p className="text-2xl font-bold text-green-900">{statistics.published}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-600 rounded-lg flex items-center justify-center">
                    <span className="text-white text-sm">📝</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-yellow-600">Drafts</p>
                  <p className="text-2xl font-bold text-yellow-900">{statistics.unpublished}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
                    <span className="text-white text-sm">🚨</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-red-600">Urgent</p>
                  <p className="text-2xl font-bold text-red-900">{statistics.byPriority.urgent}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Alerts */}
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

        {/* Filters and Bulk Actions */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {categories.map(category => (
                    <option key={category.value} value={category.value}>
                      {category.icon} {category.label}
                    </option>
                  ))}
                </select>

                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="published">Published</option>
                  <option value="unpublished">Drafts</option>
                </select>
              </div>

              {selectedUpdates.length > 0 && (
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleBulkAction('publish')}
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Publish ({selectedUpdates.length})
                  </button>
                  <button
                    onClick={() => handleBulkAction('unpublish')}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Unpublish ({selectedUpdates.length})
                  </button>
                  <button
                    onClick={() => handleBulkAction('delete')}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Delete ({selectedUpdates.length})
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Updates Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Updates ({filteredUpdates.length})
              </h2>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedUpdates.length === filteredUpdates.length && filteredUpdates.length > 0}
                  onChange={toggleSelectAll}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label className="text-sm text-gray-600">Select All</label>
              </div>
            </div>
          </div>

          {filteredUpdates.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📢</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Updates Found</h3>
              <p className="text-gray-600 mb-4">
                {filterCategory !== 'all' || filterStatus !== 'all'
                  ? 'No updates match your current filters.'
                  : 'Get started by creating your first update.'}
              </p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Create Update
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Select
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Priority
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUpdates.map((update) => (
                    <tr key={update.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedUpdates.includes(update.id)}
                          onChange={() => toggleSelectUpdate(update.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900 max-w-xs truncate">
                          {update.title}
                        </div>
                        <div className="text-sm text-gray-500 max-w-xs truncate">
                          {update.content}
                        </div>
                        {update.file_name && (
                          <div className="mt-1 flex items-center text-xs text-blue-600">
                            <span className="mr-1">{getFileIcon(update.file_name)}</span>
                            <span className="truncate max-w-32">{update.file_name}</span>
                            {update.file_url && (
                              <a
                                href={update.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-1 text-blue-500 hover:text-blue-700"
                              >
                                📥
                              </a>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="mr-2">{getCategoryIcon(update.category)}</span>
                          <span className="text-sm text-gray-900">
                            {categories.find(c => c.value === update.category)?.label}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(update.priority)}`}>
                          {update.priority.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          update.is_published
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {update.is_published ? 'Published' : 'Draft'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(update.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(update)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(update.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Create/Edit Form Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    {editingUpdate ? 'Edit Update' : 'Create New Update'}
                  </h3>
                  <button
                    onClick={resetForm}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <span className="sr-only">Close</span>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Title *
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Content *
                    </label>
                    <textarea
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Category *
                      </label>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value as Update['category'] })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      >
                        {categories.filter(c => c.value !== 'all').map(category => (
                          <option key={category.value} value={category.value}>
                            {category.icon} {category.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Priority *
                      </label>
                      <select
                        value={formData.priority}
                        onChange={(e) => setFormData({ ...formData, priority: e.target.value as Update['priority'] })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      >
                        {priorities.map(priority => (
                          <option key={priority.value} value={priority.value}>
                            {priority.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Publish Date (Optional)
                      </label>
                      <input
                        type="date"
                        value={formData.publish_date}
                        onChange={(e) => setFormData({ ...formData, publish_date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Expiry Date (Optional)
                      </label>
                      <input
                        type="date"
                        value={formData.expiry_date}
                        onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Attachment (Optional)
                    </label>
                    <input
                      type="file"
                      onChange={handleFileChange}
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {selectedFile && (
                      <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <span className="text-blue-600">{getFileIcon(selectedFile.name)}</span>
                          <span className="text-sm text-blue-800 font-medium">{selectedFile.name}</span>
                          <span className="text-xs text-blue-600">({formatFileSize(selectedFile.size)})</span>
                          <button
                            type="button"
                            onClick={() => setSelectedFile(null)}
                            className="ml-auto text-red-500 hover:text-red-700"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      Upload a PDF document or image. Max size: 50MB
                    </p>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="is_published"
                      checked={formData.is_published}
                      onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="is_published" className="ml-2 text-sm text-gray-700">
                      Publish immediately
                    </label>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || uploading}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                      {uploading ? 'Uploading...' : isSubmitting ? 'Saving...' : (editingUpdate ? 'Update' : 'Create')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UpdatesManagement;
