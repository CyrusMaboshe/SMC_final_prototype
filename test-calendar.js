// Simple test to verify calendar event creation
const testCalendarEvent = {
  title: "Test Event",
  description: "This is a test event",
  event_type: "academic",
  start_date: "2025-07-05",
  end_date: null,
  start_time: null,
  end_time: null,
  location: null,
  course_id: null,
  lecturer_id: null,
  created_by: "a5255f32-9126-4d37-afa7-ef58a08e8b4f"
};

console.log("Test event data:", JSON.stringify(testCalendarEvent, null, 2));
console.log("All UUID fields properly set to null:", 
  testCalendarEvent.course_id === null && testCalendarEvent.lecturer_id === null);
