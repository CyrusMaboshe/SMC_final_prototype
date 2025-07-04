'use client';

import React, { useState, useEffect } from 'react';
import { calendarAPI, CalendarEvent } from '@/lib/supabase';

interface CalendarManagementProps {
  user: any;
}

const CalendarManagement: React.FC<CalendarManagementProps> = ({ user }) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [currentView, setCurrentView] = useState<'month' | 'week' | 'day' | 'list'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filterType, setFilterType] = useState<string>('all');

  // Form data
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_type: 'academic',
    start_date: '',
    end_date: '',
    start_time: '',
    end_time: '',
    location: '',
    course_id: '',
    lecturer_id: ''
  });

  // Real-time subscription
  useEffect(() => {
    const subscription = calendarAPI.subscribeToEvents((payload) => {
      console.log('Calendar event update:', payload);
      loadEvents(); // Reload events when changes occur
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Load events
  const loadEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let data;
      if (filterType === 'all') {
        data = await calendarAPI.getAllEvents();
      } else {
        data = await calendarAPI.getEventsByType(filterType);
      }
      
      setEvents(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load calendar events');
      console.error('Error loading events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [filterType]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      setSuccess(null);

      // Prepare data with proper null handling for UUID fields
      const eventData = {
        ...formData,
        course_id: formData.course_id || null,
        lecturer_id: formData.lecturer_id || null,
        end_date: formData.end_date || null,
        start_time: formData.start_time || null,
        end_time: formData.end_time || null,
        location: formData.location || null
      };

      console.log('Submitting event data:', eventData);

      if (selectedEvent) {
        // Update existing event
        await calendarAPI.updateEvent(selectedEvent.id, eventData);
        setSuccess('Event updated successfully!');
        setShowEditForm(false);
      } else {
        // Create new event
        await calendarAPI.createEvent({
          ...eventData,
          created_by: user.id
        });
        setSuccess('Event created successfully!');
        setShowCreateForm(false);
      }

      // Reset form
      setFormData({
        title: '',
        description: '',
        event_type: 'academic',
        start_date: '',
        end_date: '',
        start_time: '',
        end_time: '',
        location: '',
        course_id: '',
        lecturer_id: ''
      });
      setSelectedEvent(null);
      
      // Reload events
      loadEvents();
    } catch (err: any) {
      setError(err.message || 'Failed to save event');
    }
  };

  // Handle delete
  const handleDelete = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;

    try {
      await calendarAPI.deleteEvent(eventId);
      setSuccess('Event deleted successfully!');
      loadEvents();
    } catch (err: any) {
      setError(err.message || 'Failed to delete event');
    }
  };

  // Handle edit
  const handleEdit = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setFormData({
      title: event.title,
      description: event.description || '',
      event_type: event.event_type,
      start_date: event.start_date,
      end_date: event.end_date || '',
      start_time: event.start_time || '',
      end_time: event.end_time || '',
      location: event.location || '',
      course_id: event.course_id || '',
      lecturer_id: event.lecturer_id || ''
    });
    setShowEditForm(true);
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Format time for display
  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Get event type color
  const getEventTypeColor = (type: string) => {
    const colors = {
      academic: 'bg-blue-100 text-blue-800',
      exam: 'bg-red-100 text-red-800',
      assignment: 'bg-yellow-100 text-yellow-800',
      meeting: 'bg-green-100 text-green-800',
      holiday: 'bg-purple-100 text-purple-800',
      announcement: 'bg-gray-100 text-gray-800'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading calendar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Calendar Management</h1>
            <p className="mt-2 text-gray-600">Manage academic calendar events and schedules</p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add Event
          </button>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Filters and View Controls */}
      <div className="mb-6 flex flex-wrap gap-4 items-center">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Type</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Events</option>
            <option value="academic">Academic</option>
            <option value="exam">Exams</option>
            <option value="assignment">Assignments</option>
            <option value="meeting">Meetings</option>
            <option value="holiday">Holidays</option>
            <option value="announcement">Announcements</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">View</label>
          <div className="flex rounded-lg border border-gray-300 overflow-hidden">
            {['month', 'week', 'day', 'list'].map((view) => (
              <button
                key={view}
                onClick={() => setCurrentView(view as any)}
                className={`px-3 py-2 text-sm font-medium capitalize ${
                  currentView === view
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {view}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Events List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Calendar Events ({events.length})
          </h2>
        </div>
        
        {events.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">📅</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Events Found</h3>
            <p className="text-gray-600">Create your first calendar event to get started.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {events.map((event) => (
              <div key={event.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{event.title}</h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getEventTypeColor(event.event_type)}`}>
                        {event.event_type}
                      </span>
                    </div>
                    
                    {event.description && (
                      <p className="text-gray-600 mb-3">{event.description}</p>
                    )}
                    
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                      <span>📅 {formatDate(event.start_date)}</span>
                      {event.end_date && event.end_date !== event.start_date && (
                        <span>→ {formatDate(event.end_date)}</span>
                      )}
                      {event.start_time && (
                        <span>🕐 {formatTime(event.start_time)}</span>
                      )}
                      {event.end_time && (
                        <span>→ {formatTime(event.end_time)}</span>
                      )}
                      {event.location && (
                        <span>📍 {event.location}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleEdit(event)}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(event.id)}
                      className="text-red-600 hover:text-red-800 font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Event Modal */}
      {(showCreateForm || showEditForm) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                {selectedEvent ? 'Edit Event' : 'Create New Event'}
              </h2>
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setShowEditForm(false);
                  setSelectedEvent(null);
                  setFormData({
                    title: '',
                    description: '',
                    event_type: 'academic',
                    start_date: '',
                    end_date: '',
                    start_time: '',
                    end_time: '',
                    location: '',
                    course_id: '',
                    lecturer_id: ''
                  });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Event Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Event Type *
                </label>
                <select
                  value={formData.event_type}
                  onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="academic">Academic</option>
                  <option value="exam">Exam</option>
                  <option value="assignment">Assignment</option>
                  <option value="meeting">Meeting</option>
                  <option value="holiday">Holiday</option>
                  <option value="announcement">Announcement</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Main Hall, Room 101, Online"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setShowEditForm(false);
                    setSelectedEvent(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {selectedEvent ? 'Update Event' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarManagement;
