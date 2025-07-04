'use client';

import React, { useState, useEffect } from 'react';
import { calendarAPI, CalendarEvent } from '@/lib/supabase';

interface CalendarViewProps {
  user?: any;
  showAdminControls?: boolean;
}

const CalendarView: React.FC<CalendarViewProps> = ({ user, showAdminControls = false }) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week' | 'list'>('month');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [todaysEvents, setTodaysEvents] = useState<CalendarEvent[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([]);

  // Real-time subscription
  useEffect(() => {
    const subscription = calendarAPI.subscribeToEvents((payload) => {
      console.log('Calendar update received:', payload);
      loadEvents();
      loadTodaysEvents();
      loadUpcomingEvents();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Load all events
  const loadEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await calendarAPI.getAllEvents();
      setEvents(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load calendar events');
      console.error('Error loading events:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load today's events
  const loadTodaysEvents = async () => {
    try {
      const data = await calendarAPI.getTodaysEvents();
      setTodaysEvents(data || []);
    } catch (err: any) {
      console.error('Error loading today\'s events:', err);
    }
  };

  // Load upcoming events
  const loadUpcomingEvents = async () => {
    try {
      const data = await calendarAPI.getUpcomingEvents(5);
      setUpcomingEvents(data || []);
    } catch (err: any) {
      console.error('Error loading upcoming events:', err);
    }
  };

  useEffect(() => {
    loadEvents();
    loadTodaysEvents();
    loadUpcomingEvents();
  }, []);

  // Get events for a specific date
  const getEventsForDate = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    return events.filter(event => event.start_date === dateString);
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
      academic: 'bg-blue-100 text-blue-800 border-blue-200',
      exam: 'bg-red-100 text-red-800 border-red-200',
      assignment: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      meeting: 'bg-green-100 text-green-800 border-green-200',
      holiday: 'bg-purple-100 text-purple-800 border-purple-200',
      announcement: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  // Generate calendar days for month view
  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days = [];
    const current = new Date(startDate);

    for (let i = 0; i < 42; i++) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return days;
  };

  // Navigate calendar
  const navigateCalendar = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (view === 'month') {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    } else if (view === 'week') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    }
    setCurrentDate(newDate);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading calendar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Academic Calendar</h1>
            <p className="text-gray-600">Stay updated with important dates and events</p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* View Toggle */}
            <div className="flex rounded-lg border border-gray-300 overflow-hidden">
              {['month', 'week', 'list'].map((viewType) => (
                <button
                  key={viewType}
                  onClick={() => setView(viewType as any)}
                  className={`px-3 py-2 text-sm font-medium capitalize ${
                    view === viewType
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {viewType}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Calendar */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow">
            {/* Calendar Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900">
                  {currentDate.toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long' 
                  })}
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => navigateCalendar('prev')}
                    className="p-2 text-gray-400 hover:text-gray-600"
                  >
                    ←
                  </button>
                  <button
                    onClick={() => setCurrentDate(new Date())}
                    className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                  >
                    Today
                  </button>
                  <button
                    onClick={() => navigateCalendar('next')}
                    className="p-2 text-gray-400 hover:text-gray-600"
                  >
                    →
                  </button>
                </div>
              </div>
            </div>

            {/* Calendar Body */}
            <div className="p-6">
              {view === 'month' && (
                <div>
                  {/* Day Headers */}
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                      <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-1">
                    {generateCalendarDays().map((date, index) => {
                      const dayEvents = getEventsForDate(date);
                      const isCurrentMonth = date.getMonth() === currentDate.getMonth();
                      const isToday = date.toDateString() === new Date().toDateString();

                      return (
                        <div
                          key={index}
                          className={`min-h-[100px] p-2 border border-gray-100 ${
                            isCurrentMonth ? 'bg-white' : 'bg-gray-50'
                          } ${isToday ? 'bg-blue-50 border-blue-200' : ''}`}
                        >
                          <div className={`text-sm font-medium mb-1 ${
                            isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                          } ${isToday ? 'text-blue-600' : ''}`}>
                            {date.getDate()}
                          </div>
                          
                          <div className="space-y-1">
                            {dayEvents.slice(0, 2).map((event) => (
                              <div
                                key={event.id}
                                className={`text-xs p-1 rounded border ${getEventTypeColor(event.event_type)}`}
                                title={event.title}
                              >
                                <div className="truncate">{event.title}</div>
                                {event.start_time && (
                                  <div className="text-xs opacity-75">
                                    {formatTime(event.start_time)}
                                  </div>
                                )}
                              </div>
                            ))}
                            {dayEvents.length > 2 && (
                              <div className="text-xs text-gray-500">
                                +{dayEvents.length - 2} more
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {view === 'list' && (
                <div className="space-y-4">
                  {events.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-2xl">📅</span>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No Events</h3>
                      <p className="text-gray-600">No calendar events found.</p>
                    </div>
                  ) : (
                    events.map((event) => (
                      <div key={event.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-semibold text-gray-900">{event.title}</h3>
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getEventTypeColor(event.event_type)}`}>
                                {event.event_type}
                              </span>
                            </div>
                            
                            {event.description && (
                              <p className="text-gray-600 mb-2">{event.description}</p>
                            )}
                            
                            <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                              <span>📅 {formatDate(event.start_date)}</span>
                              {event.start_time && (
                                <span>🕐 {formatTime(event.start_time)}</span>
                              )}
                              {event.location && (
                                <span>📍 {event.location}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Today's Events */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Today's Events</h3>
            {todaysEvents.length === 0 ? (
              <p className="text-gray-500 text-sm">No events today</p>
            ) : (
              <div className="space-y-3">
                {todaysEvents.map((event) => (
                  <div key={event.id} className={`p-3 rounded-lg border ${getEventTypeColor(event.event_type)}`}>
                    <div className="font-medium text-sm">{event.title}</div>
                    {event.start_time && (
                      <div className="text-xs opacity-75 mt-1">
                        {formatTime(event.start_time)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Events */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Events</h3>
            {upcomingEvents.length === 0 ? (
              <p className="text-gray-500 text-sm">No upcoming events</p>
            ) : (
              <div className="space-y-3">
                {upcomingEvents.map((event) => (
                  <div key={event.id} className="border-l-4 border-blue-400 pl-3">
                    <div className="font-medium text-sm text-gray-900">{event.title}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {formatDate(event.start_date)}
                      {event.start_time && ` at ${formatTime(event.start_time)}`}
                    </div>
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

export default CalendarView;
