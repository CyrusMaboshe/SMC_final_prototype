import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Authentication types
export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthUser {
  id: string;
  username: string;
  role: 'admin' | 'lecturer' | 'student' | 'accountant';
  is_active: boolean;
  last_login?: string;
}

export interface StudentProfile {
  id: string;
  student_id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  date_of_birth?: string | null;
  address?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  program?: string;
  year_of_study?: number;
  semester?: number;
  status: 'active' | 'suspended' | 'frozen' | 'deactivated';
}

export interface LecturerProfile {
  id: string;
  lecturer_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  department?: string;
  specialization?: string;
  status: 'active' | 'inactive';
}

export interface AccountantProfile {
  id: string;
  accountant_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  department?: string;
  status: 'active' | 'inactive';
}

// Authentication API
export const authAPI = {
  // Login function for all user types
  async login(credentials: LoginCredentials): Promise<{ user: AuthUser; profile?: StudentProfile | LecturerProfile | AccountantProfile }> {
    const { data, error } = await supabase
      .rpc('authenticate_user', {
        p_username: credentials.username,
        p_password: credentials.password
      });

    if (error) throw error;
    if (!data || data.length === 0) throw new Error('Invalid credentials');

    const user = data[0];

    // Update last login
    await supabase
      .from('system_users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id);

    // Get profile based on role
    let profile = null;
    if (user.role === 'student') {
      const { data: studentData } = await supabase
        .from('students')
        .select('*')
        .eq('user_id', user.id)
        .single();
      profile = studentData;
    } else if (user.role === 'lecturer') {
      const { data: lecturerData } = await supabase
        .from('lecturers')
        .select('*')
        .eq('user_id', user.id)
        .single();
      profile = lecturerData;
    } else if (user.role === 'accountant') {
      const { data: accountantData } = await supabase
        .from('accountants')
        .select('*')
        .eq('user_id', user.id)
        .single();
      profile = accountantData;
    }

    return { user, profile };
  },

  // Change password
  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    const { data, error } = await supabase
      .rpc('change_user_password', {
        p_user_id: userId,
        p_old_password: oldPassword,
        p_new_password: newPassword
      });

    if (error) throw error;
    return data;
  },

  // Get current user session
  getCurrentUser(): AuthUser | null {
    // Get user data from localStorage for session management
    const userId = localStorage.getItem('user_id');
    const userRole = localStorage.getItem('user_role');
    const username = localStorage.getItem('username');

    if (!userId || !userRole || !username) return null;

    return {
      id: userId,
      username: username,
      role: userRole as 'admin' | 'lecturer' | 'student' | 'accountant',
      is_active: true
    };
  },

  // Get current user UUID from database
  async getCurrentUserUUID(): Promise<string | null> {
    const username = localStorage.getItem('username');
    if (!username) return null;

    try {
      const { data, error } = await supabase
        .from('system_users')
        .select('id')
        .eq('username', username)
        .single();

      if (error) throw error;
      return data?.id || null;
    } catch (err) {
      console.error('Error getting user UUID:', err);
      return null;
    }
  },

  // Logout
  logout() {
    localStorage.removeItem('user_id');
    localStorage.removeItem('user_role');
    localStorage.removeItem('username');
    localStorage.removeItem('user_profile');
  }
};

// Database types
export interface Application {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  address: string;
  program_interest: string;
  education_background: string;
  previous_healthcare_experience?: string;
  motivation_statement: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relationship: string;
  status: 'pending' | 'under_review' | 'accepted' | 'rejected';
  submitted_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Update {
  id: string;
  title: string;
  content: string;
  category: 'exam_announcements' | 'meeting_schedules' | 'graduation_alerts' | 'general_updates';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  is_published: boolean;
  publish_date?: string;
  expiry_date?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  title: string;
  description?: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  category: string;
  is_public: boolean;
  download_count: number;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
}

export interface Quiz {
  id: string;
  course_id: string;
  title: string;
  description?: string;
  instructions?: string;
  time_limit?: number;
  max_attempts?: number;
  total_marks: number;
  start_time: string;
  end_time: string;
  created_by: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface QuizQuestion {
  id: string;
  quiz_id: string;
  question_text: string;
  question_type: 'multiple_choice' | 'checkbox' | 'text';
  options?: string[];
  correct_answer: string;
  marks: number;
  order_number: number;
  created_at: string;
}

export interface SiteSettings {
  id: string;
  setting_key: string;
  setting_value: string;
  setting_type: 'text' | 'number' | 'boolean' | 'json';
  description?: string;
  category: 'footer' | 'header' | 'general' | 'contact' | 'homepage';
  is_editable: boolean;
  created_at: string;
  updated_at: string;
}

export interface QuizAttempt {
  id: string;
  quiz_id: string;
  student_id: string;
  attempt_number: number;
  answers: Record<string, string>;
  score?: number;
  percentage?: number;
  started_at: string;
  completed_at?: string;
  time_taken?: number;
  status: 'in_progress' | 'completed' | 'abandoned';
}

export interface Assignment {
  id: string;
  course_id: string;
  title: string;
  description?: string;
  instructions?: string;
  file_path?: string;
  file_name?: string;
  file_size?: number;
  max_score: number;
  due_date: string;
  created_by: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AssignmentSubmission {
  id: string;
  assignment_id: string;
  student_id: string;
  submission_text?: string;
  file_path?: string;
  submitted_at: string;
  score?: number;
  feedback?: string;
  graded_by?: string;
  graded_at?: string;
  status: 'submitted' | 'graded' | 'late';
}

export interface FinancialRecord {
  id: string;
  student_id: string;
  academic_year: string;
  semester: number;
  tuition_fee: number;
  accommodation_fee?: number;
  other_fees?: number;
  total_amount: number;
  amount_paid?: number;
  balance: number;
  payment_status: 'pending' | 'partial' | 'paid' | 'overdue';
  due_date: string;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  student_id: string;
  invoice_number: string;
  description: string;
  amount: number;
  due_date?: string;
  status: 'pending' | 'paid' | 'overdue';
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  financial_record_id?: string;
  student_id: string;
  amount: number;
  payment_method?: string;
  reference_number?: string;
  payment_date: string;
  processed_by?: string;
  notes?: string;
  created_at: string;
}

export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: 'super_admin' | 'admin' | 'moderator';
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

// API functions for applications
export const applicationAPI = {
  // Submit new application (public)
  async submit(applicationData: Omit<Application, 'id' | 'status' | 'submitted_at' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('applications')
      .insert([applicationData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Get all applications (admin only)
  async getAll() {
    const { data, error } = await supabase
      .from('applications')
      .select('*')
      .order('submitted_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  // Update application status (admin only)
  async updateStatus(id: string, status: Application['status'], adminNotes?: string, reviewedBy?: string) {
    const { data, error } = await supabase
      .from('applications')
      .update({
        status,
        admin_notes: adminNotes,
        reviewed_by: reviewedBy,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};

// API functions for updates
export const updatesAPI = {
  // Get published updates (public)
  async getPublished() {
    const { data, error } = await supabase
      .from('updates')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  // Get updates by category (public)
  async getByCategory(category: Update['category']) {
    const { data, error } = await supabase
      .from('updates')
      .select('*')
      .eq('category', category)
      .eq('is_published', true)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  // Create update (admin only)
  async create(updateData: Omit<Update, 'id' | 'created_at' | 'updated_at'>) {
    const insertData = {
      ...updateData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('Attempting to insert update data:', insertData);

    const { data, error } = await supabase
      .from('updates')
      .insert([insertData])
      .select();

    if (error) {
      console.error('Create update error:', error);
      throw error;
    }

    console.log('Insert successful, data:', data);
    return data && data.length > 0 ? data[0] : data;
  },

  // Update existing update (admin only)
  async update(id: string, updateData: Partial<Update>) {
    const { data, error } = await supabase
      .from('updates')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Delete update (admin only)
  async delete(id: string) {
    const { error } = await supabase
      .from('updates')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Admin-specific functions
  // Get all updates (including unpublished) for admin management
  async getAllForAdmin() {
    const { data, error } = await supabase
      .from('updates')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Get updates by category for admin (including unpublished)
  async getByCategoryForAdmin(category: Update['category']) {
    const { data, error } = await supabase
      .from('updates')
      .select('*')
      .eq('category', category)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Test function to check if updates table exists and its structure
  async testTableAccess() {
    try {
      console.log('Testing updates table access...');
      const { data, error } = await supabase
        .from('updates')
        .select('*')
        .limit(1);

      if (error) {
        console.error('Table access error:', error);
        return { success: false, error: error.message };
      }

      console.log('Table access successful, sample data:', data);
      return { success: true, data };
    } catch (err) {
      console.error('Table test failed:', err);
      return { success: false, error: err };
    }
  },

  // Get updates by status for admin
  async getByStatus(isPublished: boolean) {
    const { data, error } = await supabase
      .from('updates')
      .select('*')
      .eq('is_published', isPublished)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Bulk publish/unpublish updates
  async bulkUpdateStatus(ids: string[], isPublished: boolean) {
    const { data, error } = await supabase
      .from('updates')
      .update({
        is_published: isPublished,
        updated_at: new Date().toISOString()
      })
      .in('id', ids)
      .select();

    if (error) throw error;
    return data;
  },

  // Bulk delete updates
  async bulkDelete(ids: string[]) {
    const { error } = await supabase
      .from('updates')
      .delete()
      .in('id', ids);

    if (error) throw error;
  },

  // Get updates statistics for admin dashboard
  async getStatistics() {
    const { data, error } = await supabase
      .from('updates')
      .select('category, priority, is_published');

    if (error) throw error;

    const stats = {
      total: data?.length || 0,
      published: data?.filter(u => u.is_published).length || 0,
      unpublished: data?.filter(u => !u.is_published).length || 0,
      byCategory: {
        exam_announcements: data?.filter(u => u.category === 'exam_announcements').length || 0,
        meeting_schedules: data?.filter(u => u.category === 'meeting_schedules').length || 0,
        graduation_alerts: data?.filter(u => u.category === 'graduation_alerts').length || 0,
        general_updates: data?.filter(u => u.category === 'general_updates').length || 0
      },
      byPriority: {
        low: data?.filter(u => u.priority === 'low').length || 0,
        normal: data?.filter(u => u.priority === 'normal').length || 0,
        high: data?.filter(u => u.priority === 'high').length || 0,
        urgent: data?.filter(u => u.priority === 'urgent').length || 0
      }
    };

    return stats;
  }
};

// API functions for documents
export const documentsAPI = {
  // Get public documents
  async getPublic() {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('is_public', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Get documents by category (public)
  async getByCategory(category: string) {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('category', category)
      .eq('is_public', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Increment download count
  async incrementDownload(id: string) {
    const { error } = await supabase
      .rpc('increment_download_count', { document_id: id });

    if (error) throw error;
  }
};

// Admin API functions
export const adminAPI = {
  // Student Management
  async createStudent(studentData: {
    student_id: string;
    password: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    date_of_birth?: string | null;
    address?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    program?: string;
    year_of_study?: number;
    semester?: number;
  }) {
    const { data, error } = await supabase
      .rpc('create_student_account', {
        p_student_id: studentData.student_id,
        p_password: studentData.password,
        p_first_name: studentData.first_name,
        p_last_name: studentData.last_name,
        p_email: studentData.email,
        p_program: studentData.program
      });

    if (error) throw error;

    // Update additional student details if provided
    if (studentData.phone || studentData.date_of_birth !== undefined || studentData.address ||
        studentData.emergency_contact_name || studentData.year_of_study || studentData.semester) {
      const { error: updateError } = await supabase
        .from('students')
        .update({
          phone: studentData.phone,
          date_of_birth: studentData.date_of_birth,
          address: studentData.address,
          emergency_contact_name: studentData.emergency_contact_name,
          emergency_contact_phone: studentData.emergency_contact_phone,
          year_of_study: studentData.year_of_study,
          semester: studentData.semester
        })
        .eq('id', data);

      if (updateError) throw updateError;
    }

    return data;
  },

  async getAllStudents() {
    const { data, error } = await supabase
      .rpc('admin_get_all_students');

    if (error) throw error;

    // The RPC function returns JSON, so we can use it directly
    return data || [];
  },

  async updateStudentStatus(studentId: string, status: 'active' | 'suspended' | 'frozen' | 'deactivated') {
    const { data, error } = await supabase
      .from('students')
      .update({ status })
      .eq('id', studentId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteStudent(studentId: string) {
    // First get the user_id
    const { data: student, error: fetchError } = await supabase
      .from('students')
      .select('user_id')
      .eq('id', studentId)
      .single();

    if (fetchError) throw fetchError;

    // Delete the system user (this will cascade delete the student)
    const { error } = await supabase
      .from('system_users')
      .delete()
      .eq('id', student.user_id);

    if (error) throw error;
  },

  // Lecturer Management
  async createLecturer(lecturerData: {
    lecturer_id: string;
    username: string;
    password: string;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    department?: string;
    specialization?: string;
  }) {
    const { data, error } = await supabase
      .rpc('create_lecturer_account', {
        p_lecturer_id: lecturerData.lecturer_id,
        p_username: lecturerData.username,
        p_password: lecturerData.password,
        p_first_name: lecturerData.first_name,
        p_last_name: lecturerData.last_name,
        p_email: lecturerData.email,
        p_department: lecturerData.department,
        p_specialization: lecturerData.specialization
      });

    if (error) throw error;

    // Update phone if provided
    if (lecturerData.phone) {
      const { error: updateError } = await supabase
        .from('lecturers')
        .update({ phone: lecturerData.phone })
        .eq('id', data);

      if (updateError) throw updateError;
    }

    return data;
  },

  async getAllLecturers() {
    const { data, error } = await supabase
      .rpc('admin_get_all_lecturers');

    if (error) throw error;

    // The RPC function returns JSON, so we can use it directly
    return data || [];
  },

  async updateLecturerStatus(lecturerId: string, status: 'active' | 'inactive') {
    const { data, error } = await supabase
      .from('lecturers')
      .update({ status })
      .eq('id', lecturerId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteLecturer(lecturerId: string) {
    // First get the user_id
    const { data: lecturer, error: fetchError } = await supabase
      .from('lecturers')
      .select('user_id')
      .eq('id', lecturerId)
      .single();

    if (fetchError) throw fetchError;

    // Delete the system user (this will cascade delete the lecturer)
    const { error } = await supabase
      .from('system_users')
      .delete()
      .eq('id', lecturer.user_id);

    if (error) throw error;
  },

  // Course Management
  async createCourse(courseData: {
    course_code: string;
    course_name: string;
    description?: string;
    credits?: number;
    semester: number;
    year: number;
    lecturer_id?: string;
  }) {
    const { data, error } = await supabase
      .from('courses')
      .insert([courseData])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getAllCourses() {
    const { data, error } = await supabase
      .rpc('admin_get_all_courses');

    if (error) throw error;

    // The RPC function returns JSON, so we can use it directly
    return data || [];
  },

  async updateCourse(courseId: string, courseData: any) {
    const { data, error } = await supabase
      .from('courses')
      .update(courseData)
      .eq('id', courseId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteCourse(courseId: string) {
    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', courseId);

    if (error) throw error;
  },

  // Enrollment Management
  async enrollStudent(studentId: string, courseId: string) {
    const { data, error } = await supabase
      .from('course_enrollments')
      .insert([{ student_id: studentId, course_id: courseId }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getEnrollments(courseId?: string, studentId?: string) {
    let query = supabase
      .from('course_enrollments')
      .select(`
        *,
        students(student_id, first_name, last_name),
        courses(course_code, course_name)
      `);

    if (courseId) query = query.eq('course_id', courseId);
    if (studentId) query = query.eq('student_id', studentId);

    const { data, error } = await query.order('enrollment_date', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Update Student Profile
  async updateStudentProfile(studentId: string, profileData: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    date_of_birth?: string | null;
    address?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    program?: string;
    year_of_study?: number;
    semester?: number;
    status?: string;
  }) {
    const { data, error } = await supabase
      .rpc('admin_update_student_profile', {
        p_student_id: studentId,
        p_profile_data: profileData
      });

    if (error) throw error;
    return data;
  },

  // Update Lecturer Profile
  async updateLecturerProfile(lecturerId: string, profileData: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    department?: string;
    specialization?: string;
    status?: string;
  }) {
    const { data, error } = await supabase
      .rpc('admin_update_lecturer_profile', {
        p_lecturer_id: lecturerId,
        p_profile_data: profileData
      });

    if (error) throw error;
    return data;
  }
};

// Lecturer API functions
export const lecturerAPI = {
  // Get courses assigned to a lecturer
  async getAssignedCourses(lecturerId: string) {
    const { data, error } = await supabase
      .from('courses')
      .select(`
        *,
        course_enrollments(
          id,
          student_id,
          enrollment_date,
          status,
          students(student_id, first_name, last_name, email)
        )
      `)
      .eq('lecturer_id', lecturerId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Get all students for enrollment
  async getAllStudents() {
    const { data, error } = await supabase
      .from('students')
      .select('id, student_id, first_name, last_name, email, program, year_of_study, status')
      .eq('status', 'active')
      .order('student_id', { ascending: true });

    if (error) throw error;
    return data;
  },

  // Enroll student in course (with duplicate check)
  async enrollStudentInCourse(studentId: string, courseId: string) {
    // First check if student is already enrolled
    const { data: existingEnrollment } = await supabase
      .from('course_enrollments')
      .select('id')
      .eq('student_id', studentId)
      .eq('course_id', courseId)
      .single();

    if (existingEnrollment) {
      throw new Error('Student is already enrolled in this course');
    }

    const { data, error } = await supabase
      .from('course_enrollments')
      .insert([{
        student_id: studentId,
        course_id: courseId,
        status: 'enrolled',
        enrollment_date: new Date().toISOString()
      }])
      .select(`
        *,
        students(student_id, first_name, last_name, email),
        courses(course_code, course_name)
      `)
      .single();

    if (error) throw error;
    return data;
  },

  // Remove student from course
  async removeStudentFromCourse(studentId: string, courseId: string) {
    const { error } = await supabase
      .from('course_enrollments')
      .delete()
      .eq('student_id', studentId)
      .eq('course_id', courseId);

    if (error) throw error;
  },

  // Get course enrollments for a specific course
  async getCourseEnrollments(courseId: string) {
    const { data, error } = await supabase
      .from('course_enrollments')
      .select(`
        *,
        students(student_id, first_name, last_name, email, program, year_of_study)
      `)
      .eq('course_id', courseId)
      .eq('status', 'enrolled')
      .order('enrollment_date', { ascending: false });

    if (error) throw error;
    return data;
  },

  // CA Results Management
  async createCAResult(caData: {
    student_id: string;
    course_id: string;
    assessment_name: string;
    score: number;
    max_score: number;
    assessment_date: string;
    created_by: string;
    academic_year?: string;
    semester?: number;
  }) {
    // Verify lecturer has access to this course
    const hasAccess = await this.verifyLecturerCourseAccess(caData.created_by, caData.course_id);
    if (!hasAccess) {
      throw new Error('Access denied: You can only add results for courses assigned to you');
    }

    // Verify student is enrolled in this course
    const { data: enrollment } = await supabase
      .from('course_enrollments')
      .select('id')
      .eq('student_id', caData.student_id)
      .eq('course_id', caData.course_id)
      .eq('status', 'enrolled')
      .single();

    if (!enrollment) {
      throw new Error('Student is not enrolled in this course');
    }

    const percentage = (caData.score / caData.max_score) * 100;

    const insertData = {
      ...caData,
      percentage: percentage
    };

    const { data, error } = await supabase
      .from('ca_results')
      .insert([insertData])
      .select(`
        *,
        students(student_id, first_name, last_name),
        courses(course_code, course_name)
      `)
      .single();

    if (error) {
      console.error('Error creating CA result:', error);
      throw error;
    }
    return data;
  },

  async getCAResults(lecturerId: string, courseId?: string, academicYear?: string, semester?: number) {
    let query = supabase
      .from('ca_results')
      .select(`
        *,
        students(student_id, first_name, last_name),
        courses(course_code, course_name, lecturer_id)
      `)
      .order('created_at', { ascending: false });

    if (courseId) {
      query = query.eq('course_id', courseId);
    }

    if (academicYear) {
      query = query.eq('academic_year', academicYear);
    }

    if (semester) {
      query = query.eq('semester', semester);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Filter to only show results for courses assigned to this lecturer
    return data?.filter((result: any) => result.courses?.lecturer_id === lecturerId) || [];
  },

  // updateCAResult and deleteCAResult functions removed for security
  // Lecturers can only create new results, not modify existing ones

  // Final Results Management
  async createFinalResult(resultData: {
    student_id: string;
    course_id: string;
    academic_year: string;
    semester: number;
    final_score: number;
    final_grade: string;
    gpa_points: number;
    status: string;
    submitted_by: string;
    comments?: string;
  }) {
    // Verify lecturer has access to this course
    const hasAccess = await this.verifyLecturerCourseAccess(resultData.submitted_by, resultData.course_id);
    if (!hasAccess) {
      throw new Error('Access denied: You can only add results for courses assigned to you');
    }

    // Verify student is enrolled in this course
    const { data: enrollment } = await supabase
      .from('course_enrollments')
      .select('id')
      .eq('student_id', resultData.student_id)
      .eq('course_id', resultData.course_id)
      .eq('status', 'enrolled')
      .single();

    if (!enrollment) {
      throw new Error('Student is not enrolled in this course');
    }

    // Check for duplicate final result
    const { data: existingResult } = await supabase
      .from('final_results')
      .select('id')
      .eq('student_id', resultData.student_id)
      .eq('course_id', resultData.course_id)
      .eq('academic_year', resultData.academic_year)
      .eq('semester', resultData.semester)
      .single();

    if (existingResult) {
      throw new Error('Final result already exists for this student, course, and semester');
    }

    // Insert the final result
    const insertData = {
      ...resultData,
      submission_date: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('final_results')
      .insert([insertData])
      .select(`
        *,
        students(student_id, first_name, last_name, program),
        courses(course_code, course_name)
      `)
      .single();

    if (error) {
      console.error('Error creating final result:', error);
      throw error;
    }
    return data;
  },

  async getFinalResults(lecturerId: string, academicYear?: string, semester?: number) {
    let query = supabase
      .from('final_results')
      .select(`
        *,
        students(student_id, first_name, last_name, program),
        courses(course_code, course_name, lecturer_id)
      `)
      .order('submission_date', { ascending: false });

    if (academicYear) {
      query = query.eq('academic_year', academicYear);
    }
    if (semester) {
      query = query.eq('semester', semester);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Filter to only show results for courses assigned to this lecturer
    return data?.filter((result: any) => result.courses?.lecturer_id === lecturerId) || [];
  },

  // updateFinalResult and deleteFinalResult functions removed for security
  // Lecturers can only create new results, not modify existing ones

  // Verify lecturer has access to course
  async verifyLecturerCourseAccess(lecturerId: string, courseId: string) {
    if (!lecturerId || !courseId) {
      return false;
    }

    const { data, error } = await supabase
      .from('courses')
      .select('id')
      .eq('id', courseId)
      .eq('lecturer_id', lecturerId)
      .eq('is_active', true)
      .single();

    if (error) {
      return false;
    }
    return !!data;
  },

  // Get enrolled students for a specific course
  async getCourseStudents(courseId: string) {
    const { data, error } = await supabase
      .from('course_enrollments')
      .select(`
        id,
        student_id,
        students(id, student_id, first_name, last_name, email, program, year_of_study)
      `)
      .eq('course_id', courseId)
      .eq('status', 'enrolled')
      .order('students(student_id)');

    if (error) throw error;
    return data?.map(enrollment => enrollment.students) || [];
  },

  // Quiz Management Functions

  // Create Quiz
  async createQuiz(quizData: {
    course_id: string;
    title: string;
    description?: string;
    instructions?: string;
    time_limit?: number;
    max_attempts?: number;
    start_time: string;
    end_time: string;
    created_by: string;
  }) {
    const { data, error } = await supabase
      .from('quizzes')
      .insert([{
        ...quizData,
        total_marks: 0, // Will be updated when questions are added
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update Quiz
  async updateQuiz(quizId: string, quizData: {
    title?: string;
    description?: string;
    instructions?: string;
    time_limit?: number;
    max_attempts?: number;
    start_time?: string;
    end_time?: string;
    is_active?: boolean;
  }, lecturerId: string) {
    // Verify the quiz belongs to a course taught by this lecturer
    const { data: quiz } = await supabase
      .from('quizzes')
      .select(`
        id,
        courses!inner(lecturer_id)
      `)
      .eq('id', quizId)
      .eq('courses.lecturer_id', lecturerId)
      .single();

    if (!quiz) throw new Error('Quiz not found or access denied');

    const { data, error } = await supabase
      .from('quizzes')
      .update({
        ...quizData,
        updated_at: new Date().toISOString()
      })
      .eq('id', quizId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete Quiz
  async deleteQuiz(quizId: string, lecturerId: string) {
    // Verify the quiz belongs to a course taught by this lecturer
    const { data: quiz } = await supabase
      .from('quizzes')
      .select(`
        id,
        courses!inner(lecturer_id)
      `)
      .eq('id', quizId)
      .eq('courses.lecturer_id', lecturerId)
      .single();

    if (!quiz) throw new Error('Quiz not found or access denied');

    // Delete quiz questions first
    await supabase
      .from('quiz_questions')
      .delete()
      .eq('quiz_id', quizId);

    // Delete quiz attempts
    await supabase
      .from('quiz_attempts')
      .delete()
      .eq('quiz_id', quizId);

    // Delete the quiz
    const { error } = await supabase
      .from('quizzes')
      .delete()
      .eq('id', quizId);

    if (error) throw error;
  },

  // Get Quizzes for Lecturer
  async getQuizzes(lecturerId: string, courseId?: string) {
    let query = supabase
      .from('quizzes')
      .select(`
        *,
        courses(id, course_code, course_name, lecturer_id),
        quiz_questions(id),
        quiz_attempts(id, status)
      `)
      .eq('courses.lecturer_id', lecturerId)
      .order('created_at', { ascending: false });

    if (courseId) {
      query = query.eq('course_id', courseId);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Add question count and attempt statistics
    return data?.map(quiz => ({
      ...quiz,
      question_count: quiz.quiz_questions?.length || 0,
      total_attempts: quiz.quiz_attempts?.length || 0,
      completed_attempts: quiz.quiz_attempts?.filter((a: any) => a.status === 'completed').length || 0
    }));
  },

  // Assignment Management Functions

  // Create Assignment
  async createAssignment(assignmentData: {
    course_id: string;
    title: string;
    description?: string;
    instructions?: string;
    file_path?: string;
    file_name?: string;
    file_size?: number;
    max_score: number;
    due_date: string;
    created_by: string;
  }) {
    // Verify lecturer has access to this course
    const hasAccess = await this.verifyLecturerCourseAccess(assignmentData.created_by, assignmentData.course_id);
    if (!hasAccess) {
      throw new Error('Access denied: You can only create assignments for courses assigned to you');
    }

    const { data, error } = await supabase
      .from('assignments')
      .insert([{
        ...assignmentData,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select(`
        *,
        courses(course_code, course_name)
      `)
      .single();

    if (error) throw error;
    return data;
  },

  // Get Assignments for a lecturer
  async getAssignments(lecturerId: string) {
    const { data, error } = await supabase
      .from('assignments')
      .select(`
        *,
        courses(course_code, course_name, lecturer_id),
        assignment_submissions(
          id,
          student_id,
          status,
          submitted_at,
          score,
          students(student_id, first_name, last_name)
        )
      `)
      .eq('courses.lecturer_id', lecturerId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Get Assignment Submissions for a specific assignment
  async getAssignmentSubmissions(assignmentId: string, lecturerId: string) {
    // First verify lecturer has access to this assignment
    const { data: assignment } = await supabase
      .from('assignments')
      .select(`
        id,
        title,
        max_score,
        courses!inner(lecturer_id, course_code, course_name)
      `)
      .eq('id', assignmentId)
      .eq('courses.lecturer_id', lecturerId)
      .single();

    if (!assignment) throw new Error('Assignment not found or access denied');

    const { data, error } = await supabase
      .from('assignment_submissions')
      .select(`
        *,
        students(student_id, first_name, last_name, email)
      `)
      .eq('assignment_id', assignmentId)
      .order('submitted_at', { ascending: false });

    if (error) throw error;
    return { assignment, submissions: data };
  },

  // Grade Assignment Submission
  async gradeAssignmentSubmission(submissionId: string, gradeData: {
    score: number;
    feedback?: string;
    graded_by: string;
  }) {
    // First verify lecturer has access to this submission
    const { data: submission } = await supabase
      .from('assignment_submissions')
      .select(`
        id,
        assignments!inner(
          id,
          max_score,
          courses!inner(lecturer_id)
        )
      `)
      .eq('id', submissionId)
      .eq('assignments.courses.lecturer_id', gradeData.graded_by)
      .single();

    if (!submission) throw new Error('Submission not found or access denied');

    // Validate score
    const maxScore = (submission.assignments as any)?.max_score || 0;
    if (gradeData.score < 0 || gradeData.score > maxScore) {
      throw new Error(`Score must be between 0 and ${maxScore}`);
    }

    const { data, error } = await supabase
      .from('assignment_submissions')
      .update({
        score: gradeData.score,
        feedback: gradeData.feedback,
        graded_by: gradeData.graded_by,
        graded_at: new Date().toISOString(),
        status: 'graded'
      })
      .eq('id', submissionId)
      .select(`
        *,
        students(student_id, first_name, last_name),
        assignments(title, max_score)
      `)
      .single();

    if (error) throw error;
    return data;
  },

  // Quiz Question Management Functions

  // Create Quiz Question
  async createQuizQuestion(questionData: {
    quiz_id: string;
    question_text: string;
    question_type: 'multiple_choice' | 'checkbox' | 'text';
    options?: string[];
    correct_answer: string;
    marks: number;
    order_number: number;
  }, lecturerId: string) {
    // Verify the quiz belongs to a course taught by this lecturer
    const { data: quiz } = await supabase
      .from('quizzes')
      .select(`
        id,
        courses!inner(lecturer_id)
      `)
      .eq('id', questionData.quiz_id)
      .eq('courses.lecturer_id', lecturerId)
      .single();

    if (!quiz) throw new Error('Quiz not found or access denied');


    const { data, error } = await supabase
      .from('quiz_questions')
      .insert([{
        ...questionData,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;

    // Update quiz total marks
    await this.updateQuizTotalMarks(questionData.quiz_id);

    return data;
  },

  // Update Quiz Question
  async updateQuizQuestion(questionId: string, questionData: {
    question_text?: string;
    question_type?: 'multiple_choice' | 'text';
    options?: string[];
    correct_answer?: string;
    marks?: number;
    order_number?: number;
  }, lecturerId: string) {
    // Verify the question belongs to a quiz in a course taught by this lecturer
    const { data: question } = await supabase
      .from('quiz_questions')
      .select(`
        id,
        quiz_id,
        quizzes!inner(courses!inner(lecturer_id))
      `)
      .eq('id', questionId)
      .eq('quizzes.courses.lecturer_id', lecturerId)
      .single();

    if (!question) throw new Error('Question not found or access denied');

    const { data, error } = await supabase
      .from('quiz_questions')
      .update(questionData)
      .eq('id', questionId)
      .select()
      .single();

    if (error) throw error;

    // Update quiz total marks if marks changed
    if (questionData.marks !== undefined) {
      await this.updateQuizTotalMarks(question.quiz_id);
    }

    return data;
  },

  // Delete Quiz Question
  async deleteQuizQuestion(questionId: string, lecturerId: string) {
    // Verify the question belongs to a quiz in a course taught by this lecturer
    const { data: question } = await supabase
      .from('quiz_questions')
      .select(`
        id,
        quiz_id,
        quizzes!inner(courses!inner(lecturer_id))
      `)
      .eq('id', questionId)
      .eq('quizzes.courses.lecturer_id', lecturerId)
      .single();

    if (!question) throw new Error('Question not found or access denied');

    const { error } = await supabase
      .from('quiz_questions')
      .delete()
      .eq('id', questionId);

    if (error) throw error;

    // Update quiz total marks
    await this.updateQuizTotalMarks((question as any).quiz_id);
  },

  // Get Quiz Questions
  async getQuizQuestions(quizId: string, lecturerId: string) {
    // Verify the quiz belongs to a course taught by this lecturer
    const { data: quiz } = await supabase
      .from('quizzes')
      .select(`
        id,
        courses!inner(lecturer_id)
      `)
      .eq('id', quizId)
      .eq('courses.lecturer_id', lecturerId)
      .single();

    if (!quiz) throw new Error('Quiz not found or access denied');

    const { data, error } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('quiz_id', quizId)
      .order('order_number', { ascending: true });

    if (error) throw error;
    return data;
  },

  // Update Quiz Total Marks (helper function)
  async updateQuizTotalMarks(quizId: string) {
    const { data: questions } = await supabase
      .from('quiz_questions')
      .select('marks')
      .eq('quiz_id', quizId);

    const totalMarks = questions?.reduce((sum, q) => sum + parseFloat(q.marks), 0) || 0;

    await supabase
      .from('quizzes')
      .update({
        total_marks: totalMarks,
        updated_at: new Date().toISOString()
      })
      .eq('id', quizId);
  },

  // Get Quiz Results for Lecturer
  async getQuizResults(lecturerId: string, quizId?: string) {
    let query = supabase
      .from('quiz_attempts')
      .select(`
        *,
        students(student_id, first_name, last_name, email),
        quizzes(
          id,
          title,
          total_marks,
          courses(id, course_code, course_name, lecturer_id)
        )
      `)
      .eq('quizzes.courses.lecturer_id', lecturerId)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false });

    if (quizId) {
      query = query.eq('quiz_id', quizId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data;
  },

  // Get Quiz Attempts (including in-progress) for Analytics
  async getQuizAttempts(quizId: string, lecturerId: string) {
    // Verify the quiz belongs to a course taught by this lecturer
    const { data: quiz } = await supabase
      .from('quizzes')
      .select(`
        id,
        courses!inner(lecturer_id)
      `)
      .eq('id', quizId)
      .eq('courses.lecturer_id', lecturerId)
      .single();

    if (!quiz) throw new Error('Quiz not found or access denied');

    const { data, error } = await supabase
      .from('quiz_attempts')
      .select(`
        *,
        students(student_id, first_name, last_name, email)
      `)
      .eq('quiz_id', quizId)
      .order('started_at', { ascending: false });

    if (error) throw error;

    // Add student name for easier display
    return data?.map(attempt => ({
      ...attempt,
      student_name: attempt.students
        ? `${attempt.students.first_name} ${attempt.students.last_name}`.trim()
        : 'Unknown Student'
    })) || [];
  },

  // Update Quiz Analytics
  async updateQuizAnalytics(quizId: string, lecturerId: string) {
    // Verify access
    const { data: quiz } = await supabase
      .from('quizzes')
      .select(`
        id,
        courses!inner(lecturer_id)
      `)
      .eq('id', quizId)
      .eq('courses.lecturer_id', lecturerId)
      .single();

    if (!quiz) throw new Error('Quiz not found or access denied');

    // Get all completed attempts
    const { data: attempts } = await supabase
      .from('quiz_attempts')
      .select('*')
      .eq('quiz_id', quizId)
      .eq('status', 'completed');

    // Get all questions
    const { data: questions } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('quiz_id', quizId);

    if (!questions || !attempts) return;

    // Calculate analytics for each question
    for (const question of questions) {
      const questionAttempts = attempts.filter(attempt =>
        attempt.answers && attempt.answers[question.id]
      );

      let correctAnswers = 0;
      const optionDistribution: Record<string, number> = {};

      // Initialize option distribution
      if (question.options) {
        ['a', 'b', 'c', 'd'].forEach(option => {
          optionDistribution[option] = 0;
        });
      }

      // Count correct answers and option distribution
      questionAttempts.forEach(attempt => {
        const studentAnswer = attempt.answers[question.id];

        // Count option selection
        if (studentAnswer && optionDistribution.hasOwnProperty(studentAnswer)) {
          optionDistribution[studentAnswer]++;
        }

        // Check if correct
        if (studentAnswer === question.correct_answer) {
          correctAnswers++;
        }
      });

      // Update or insert analytics
      await supabase
        .from('quiz_analytics')
        .upsert({
          quiz_id: quizId,
          question_id: question.id,
          total_attempts: questionAttempts.length,
          correct_answers: correctAnswers,
          incorrect_answers: questionAttempts.length - correctAnswers,
          option_distribution: optionDistribution,
          difficulty_rating: questionAttempts.length > 0 ? (correctAnswers / questionAttempts.length) * 100 : 0,
          last_updated: new Date().toISOString()
        }, {
          onConflict: 'quiz_id,question_id'
        });
    }
  },

  // Real-time Notification Functions

  // Get Notifications for Lecturer
  async getNotifications(lecturerId: string, limit: number = 50) {
    const { data, error } = await supabase
      .from('quiz_notifications')
      .select(`
        *,
        quizzes(title, courses(course_name)),
        students(first_name, last_name, student_id)
      `)
      .eq('lecturer_id', lecturerId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  },

  // Mark Notification as Read
  async markNotificationAsRead(notificationId: string, lecturerId: string) {
    const { error } = await supabase
      .from('quiz_notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('lecturer_id', lecturerId);

    if (error) throw error;
  },

  // Get Unread Notification Count
  async getUnreadNotificationCount(lecturerId: string) {
    const { count, error } = await supabase
      .from('quiz_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('lecturer_id', lecturerId)
      .eq('is_read', false);

    if (error) throw error;
    return count || 0;
  },

  // Subscribe to Real-time Notifications
  subscribeToNotifications(lecturerId: string, callback: (notification: any) => void) {
    return supabase
      .channel('quiz_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'quiz_notifications',
          filter: `lecturer_id=eq.${lecturerId}`
        },
        callback
      )
      .subscribe();
  }
};

// Student API functions
export const studentAPI = {
  // Get CA Results for a student
  async getCAResults(studentId: string) {
    const { data, error } = await supabase
      .from('ca_results')
      .select(`
        *,
        courses(course_code, course_name)
      `)
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Get Final Results for a student
  async getFinalResults(studentId: string, academicYear?: string, semester?: number) {
    let query = supabase
      .from('final_results')
      .select(`
        *,
        courses(course_code, course_name, credits)
      `)
      .eq('student_id', studentId)
      .order('submission_date', { ascending: false });

    if (academicYear) {
      query = query.eq('academic_year', academicYear);
    }
    if (semester) {
      query = query.eq('semester', semester);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  // Get student results for a specific academic year and semester (for transcript)
  async getStudentTranscript(studentId: string, academicYear: string, semester: number) {
    const { data, error } = await supabase
      .from('final_results')
      .select(`
        *,
        courses(course_code, course_name, credits),
        students(student_id, first_name, last_name, program)
      `)
      .eq('student_id', studentId)
      .eq('academic_year', academicYear)
      .eq('semester', semester)
      .order('courses(course_code)');

    if (error) throw error;
    return data;
  },

  // Get Exam Results for a student
  async getExamResults(studentId: string) {
    const { data, error } = await supabase
      .from('exam_results')
      .select(`
        *,
        courses(course_code, course_name),
        lecturers(first_name, last_name)
      `)
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Get Quiz Results for a student
  async getQuizResults(studentId: string) {
    const { data, error } = await supabase
      .from('quiz_attempts')
      .select(`
        *,
        quizzes(title, total_marks, courses(course_code, course_name))
      `)
      .eq('student_id', studentId)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Get Available Quizzes for a student
  async getAvailableQuizzes(studentId: string) {
    // First get student's enrolled courses
    const { data: enrollments } = await supabase
      .from('course_enrollments')
      .select('course_id')
      .eq('student_id', studentId)
      .eq('status', 'enrolled');

    const courseIds = enrollments?.map(e => e.course_id) || [];

    const { data, error } = await supabase
      .from('quizzes')
      .select(`
        *,
        courses(course_code, course_name),
        quiz_attempts!left(id, status)
      `)
      .in('course_id', courseIds)
      .eq('is_active', true)
      .gte('end_time', new Date().toISOString())
      .order('start_time', { ascending: true });

    if (error) throw error;
    return data;
  },

  // Get Quiz Details with Questions for taking quiz
  async getQuizForAttempt(quizId: string, studentId: string) {
    // Check if student is enrolled in the course
    const { data: quiz } = await supabase
      .from('quizzes')
      .select(`
        *,
        courses(id, course_code, course_name),
        quiz_questions(id, question_text, question_type, options, marks, order_number)
      `)
      .eq('id', quizId)
      .eq('is_active', true)
      .single();

    if (!quiz) throw new Error('Quiz not found or not active');

    // Check if student is enrolled in the course
    const { data: enrollment } = await supabase
      .from('course_enrollments')
      .select('id')
      .eq('student_id', studentId)
      .eq('course_id', quiz.courses.id)
      .eq('status', 'enrolled')
      .single();

    if (!enrollment) throw new Error('Student not enrolled in this course');

    // Check if quiz is within time limits
    const now = new Date();
    const startTime = new Date(quiz.start_time);
    const endTime = new Date(quiz.end_time);

    if (now < startTime) throw new Error('Quiz has not started yet');
    if (now > endTime) throw new Error('Quiz has ended');

    // Check existing attempts
    const { data: attempts } = await supabase
      .from('quiz_attempts')
      .select('attempt_number, status')
      .eq('quiz_id', quizId)
      .eq('student_id', studentId)
      .order('attempt_number', { ascending: false });

    const completedAttempts = attempts?.filter(a => a.status === 'completed').length || 0;

    if (quiz.max_attempts && completedAttempts >= quiz.max_attempts) {
      throw new Error('Maximum attempts reached');
    }

    return {
      ...quiz,
      quiz_questions: quiz.quiz_questions.sort((a: any, b: any) => a.order_number - b.order_number),
      attempts_used: completedAttempts,
      attempts_remaining: quiz.max_attempts ? quiz.max_attempts - completedAttempts : null
    };
  },

  // Start Quiz Attempt
  async startQuizAttempt(quizId: string, studentId: string) {
    // Get next attempt number
    const { data: attempts } = await supabase
      .from('quiz_attempts')
      .select('attempt_number')
      .eq('quiz_id', quizId)
      .eq('student_id', studentId)
      .order('attempt_number', { ascending: false })
      .limit(1);

    const nextAttemptNumber = (attempts?.[0]?.attempt_number || 0) + 1;

    const { data, error } = await supabase
      .from('quiz_attempts')
      .insert([{
        quiz_id: quizId,
        student_id: studentId,
        attempt_number: nextAttemptNumber,
        started_at: new Date().toISOString(),
        status: 'in_progress',
        answers: {}
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Save Quiz Answer
  async saveQuizAnswer(attemptId: string, questionId: string, answer: string) {
    // Get current answers
    const { data: attempt } = await supabase
      .from('quiz_attempts')
      .select('answers')
      .eq('id', attemptId)
      .single();

    if (!attempt) throw new Error('Quiz attempt not found');

    const updatedAnswers = {
      ...attempt.answers,
      [questionId]: answer
    };

    const { error } = await supabase
      .from('quiz_attempts')
      .update({ answers: updatedAnswers })
      .eq('id', attemptId);

    if (error) throw error;
  },

  // Update Quiz Attempt (for auto-saving)
  async updateQuizAttempt(attemptId: string, updates: {
    answers?: Record<string, string>;
    time_taken?: number;
  }) {
    const { error } = await supabase
      .from('quiz_attempts')
      .update(updates)
      .eq('id', attemptId);

    if (error) throw error;
  },

  // Submit Quiz Attempt with Enhanced Auto-Marking
  async submitQuizAttempt(attemptId: string, finalAnswers?: Record<string, string>) {
    // Update final answers if provided
    if (finalAnswers) {
      await this.updateQuizAttempt(attemptId, { answers: finalAnswers });
    }

    // Get attempt with quiz and questions
    const { data: attempt } = await supabase
      .from('quiz_attempts')
      .select(`
        *,
        quizzes(
          id,
          total_marks,
          quiz_questions(id, correct_answer, marks, question_type, options)
        )
      `)
      .eq('id', attemptId)
      .single();

    if (!attempt) throw new Error('Quiz attempt not found');

    // Enhanced auto-marking with detailed tracking
    let totalScore = 0;
    const questions = attempt.quizzes.quiz_questions;
    const answers = finalAnswers || attempt.answers || {};
    const detailedResults: any[] = [];

    // Process each question with detailed marking
    for (const question of questions) {
      const studentAnswer = answers[question.id];
      let isCorrect = false;
      let marksAwarded = 0;

      if (studentAnswer && question.correct_answer) {
        // For text questions, do case-insensitive comparison
        if (question.question_type === 'text') {
          isCorrect = studentAnswer.toLowerCase().trim() === question.correct_answer.toLowerCase().trim();
        } else if (question.question_type === 'checkbox') {
          // For checkbox questions, compare sorted arrays
          const studentAnswers = studentAnswer.split('|').sort();
          const correctAnswers = question.correct_answer.split('|').sort();
          isCorrect = studentAnswers.length === correctAnswers.length &&
              studentAnswers.every((answer: string, index: number) => answer === correctAnswers[index]);
        } else {
          // For multiple choice questions
          isCorrect = studentAnswer === question.correct_answer;
        }

        if (isCorrect) {
          marksAwarded = parseFloat(question.marks);
          totalScore += marksAwarded;
        }
      }

      // Store detailed result for analytics
      detailedResults.push({
        question_id: question.id,
        student_answer: studentAnswer || null,
        correct_answer: question.correct_answer,
        is_correct: isCorrect,
        marks_awarded: marksAwarded,
        max_marks: parseFloat(question.marks)
      });

      // Save individual answer record
      try {
        await supabase
          .from('student_answers')
          .insert({
            attempt_id: attemptId,
            question_id: question.id,
            selected_option: studentAnswer || null,
            is_correct: isCorrect,
            marks_awarded: marksAwarded,
            answered_at: new Date().toISOString()
          });
      } catch (err) {
        console.error('Error saving student answer:', err);
      }
    }

    const percentage = (totalScore / parseFloat(attempt.quizzes.total_marks)) * 100;
    const timeTaken = Math.floor((new Date().getTime() - new Date(attempt.started_at).getTime()) / 1000);

    const { error } = await supabase
      .from('quiz_attempts')
      .update({
        completed_at: new Date().toISOString(),
        score: totalScore,
        percentage: percentage,
        time_taken: timeTaken,
        status: 'completed'
      })
      .eq('id', attemptId);

    if (error) throw error;

    // Update quiz analytics after submission
    try {
      await this.updateQuizAnalyticsAfterSubmission(attempt.quiz_id, attemptId);
    } catch (err) {
      console.error('Error updating analytics:', err);
    }

    // Send notification to lecturer
    try {
      await this.sendQuizCompletionNotification(attempt.quiz_id, attempt.student_id, {
        score: totalScore,
        percentage: percentage,
        time_taken: timeTaken
      });
    } catch (err) {
      console.error('Error sending notification:', err);
    }

    return {
      score: totalScore,
      percentage: percentage,
      time_taken: timeTaken,
      detailed_results: detailedResults
    };
  },

  // Update Quiz Analytics After Submission
  async updateQuizAnalyticsAfterSubmission(quizId: string, attemptId: string) {
    // Get the attempt with answers
    const { data: attempt } = await supabase
      .from('quiz_attempts')
      .select('answers, student_id')
      .eq('id', attemptId)
      .single();

    if (!attempt) return;

    // Get quiz questions
    const { data: questions } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('quiz_id', quizId);

    if (!questions) return;

    // Update analytics for each question
    for (const question of questions) {
      const studentAnswer = attempt.answers?.[question.id];

      if (studentAnswer) {
        // Get current analytics
        const { data: analytics } = await supabase
          .from('quiz_analytics')
          .select('*')
          .eq('quiz_id', quizId)
          .eq('question_id', question.id)
          .single();

        const isCorrect = studentAnswer === question.correct_answer;
        const currentDistribution = analytics?.option_distribution || {};

        // Update option distribution
        if (currentDistribution[studentAnswer] !== undefined) {
          currentDistribution[studentAnswer] = (currentDistribution[studentAnswer] || 0) + 1;
        }

        // Update analytics
        await supabase
          .from('quiz_analytics')
          .upsert({
            quiz_id: quizId,
            question_id: question.id,
            total_attempts: (analytics?.total_attempts || 0) + 1,
            correct_answers: (analytics?.correct_answers || 0) + (isCorrect ? 1 : 0),
            incorrect_answers: (analytics?.incorrect_answers || 0) + (isCorrect ? 0 : 1),
            option_distribution: currentDistribution,
            difficulty_rating: 0, // Will be calculated later
            last_updated: new Date().toISOString()
          }, {
            onConflict: 'quiz_id,question_id'
          });
      }
    }
  },

  // Send Quiz Completion Notification
  async sendQuizCompletionNotification(quizId: string, studentId: string, results: {
    score: number;
    percentage: number;
    time_taken: number;
  }) {
    // Get quiz and lecturer info
    const { data: quiz } = await supabase
      .from('quizzes')
      .select(`
        title,
        total_marks,
        courses(lecturer_id, course_name)
      `)
      .eq('id', quizId)
      .single();

    if (!quiz) return;

    // Get student info
    const { data: student } = await supabase
      .from('students')
      .select('first_name, last_name, student_id')
      .eq('id', studentId)
      .single();

    if (!student) return;

    // Create notification for lecturer
    await supabase
      .from('quiz_notifications')
      .insert({
        quiz_id: quizId,
        student_id: studentId,
        lecturer_id: quiz.courses.lecturer_id,
        notification_type: 'quiz_completed',
        title: 'Quiz Completed',
        message: `${student.first_name} ${student.last_name} (${student.student_id}) has completed "${quiz.title}"`,
        metadata: {
          score: results.score,
          total_marks: quiz.total_marks,
          percentage: results.percentage,
          time_taken: results.time_taken,
          course_name: quiz.courses.course_name
        },
        created_at: new Date().toISOString()
      });
  },

  // Get Assignment Results for a student
  async getAssignmentResults(studentId: string) {
    const { data, error } = await supabase
      .from('assignment_submissions')
      .select(`
        *,
        assignments(title, max_score, courses(course_code, course_name)),
        lecturers(first_name, last_name)
      `)
      .eq('student_id', studentId)
      .order('submitted_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Get Available Assignments for a student
  async getAvailableAssignments(studentId: string) {
    // First get student's enrolled courses
    const { data: enrollments } = await supabase
      .from('course_enrollments')
      .select('course_id')
      .eq('student_id', studentId)
      .eq('status', 'enrolled');

    const courseIds = enrollments?.map(e => e.course_id) || [];

    const { data, error } = await supabase
      .from('assignments')
      .select(`
        *,
        courses(course_code, course_name),
        assignment_submissions!left(id, status)
      `)
      .in('course_id', courseIds)
      .eq('is_active', true)
      .gte('due_date', new Date().toISOString())
      .order('due_date', { ascending: true });

    if (error) throw error;
    return data;
  },

  // Submit Assignment
  async submitAssignment(submissionData: {
    assignment_id: string;
    student_id: string;
    submission_text?: string;
    file_path?: string;
  }) {
    // Check if student is enrolled in the course
    const { data: assignment } = await supabase
      .from('assignments')
      .select(`
        id,
        course_id,
        due_date,
        courses(course_code, course_name)
      `)
      .eq('id', submissionData.assignment_id)
      .eq('is_active', true)
      .single();

    if (!assignment) throw new Error('Assignment not found or not active');

    // Check if due date has passed
    if (new Date() > new Date(assignment.due_date)) {
      throw new Error('Assignment submission deadline has passed');
    }

    // Check if student is enrolled in the course
    const { data: enrollment } = await supabase
      .from('course_enrollments')
      .select('id')
      .eq('student_id', submissionData.student_id)
      .eq('course_id', assignment.course_id)
      .eq('status', 'enrolled')
      .single();

    if (!enrollment) throw new Error('You are not enrolled in this course');

    // Check if student has already submitted
    const { data: existingSubmission } = await supabase
      .from('assignment_submissions')
      .select('id')
      .eq('assignment_id', submissionData.assignment_id)
      .eq('student_id', submissionData.student_id)
      .single();

    if (existingSubmission) {
      throw new Error('You have already submitted this assignment');
    }

    const { data, error } = await supabase
      .from('assignment_submissions')
      .insert([{
        ...submissionData,
        submitted_at: new Date().toISOString(),
        status: 'submitted'
      }])
      .select(`
        *,
        assignments(title, max_score, courses(course_code, course_name))
      `)
      .single();

    if (error) throw error;
    return data;
  },

  // Get Enrolled Courses for a student
  async getEnrolledCourses(studentId: string) {
    const { data, error } = await supabase
      .from('course_enrollments')
      .select(`
        *,
        courses(*, lecturers(first_name, last_name, email))
      `)
      .eq('student_id', studentId)
      .eq('status', 'enrolled')
      .order('enrollment_date', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Get Exam Slips for a student
  async getExamSlips(studentId: string) {
    const { data, error } = await supabase
      .from('exam_slips')
      .select(`
        *,
        courses(course_code, course_name)
      `)
      .eq('student_id', studentId)
      .eq('is_active', true)
      .order('exam_date', { ascending: true });

    if (error) throw error;
    return data;
  },

  // Get Academic Calendar
  async getAcademicCalendar() {
    const { data, error } = await supabase
      .from('academic_calendar')
      .select('*')
      .eq('is_active', true)
      .order('start_date', { ascending: true });

    if (error) throw error;
    return data;
  },

  // Get Notifications for a student
  async getNotifications(userId: string) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return data;
  },



  // Get Payments for a student
  async getPayments(studentId: string) {
    // First get the student UUID from the student number
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id')
      .eq('student_id', studentId)
      .single();

    if (studentError) {
      console.error('Error finding student:', studentError);
      return [];
    }

    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('student_id', student.id)
      .order('payment_date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Get Financial Records for a student
  async getFinancialRecords(studentId: string) {
    // First get the student UUID from the student number
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id')
      .eq('student_id', studentId)
      .single();

    if (studentError) {
      console.error('Error finding student:', studentError);
      return [];
    }

    const { data, error } = await supabase
      .from('financial_records')
      .select('*')
      .eq('student_id', student.id)
      .order('academic_year', { ascending: false });

    if (error) throw error;
    return data || [];
  }
};

// Logging helper function
const logAccountantAction = async (
  accountantId: string,
  actionType: string,
  entityType: string,
  entityId?: string,
  studentId?: string,
  description?: string,
  oldValues?: any,
  newValues?: any
) => {
  try {
    await supabase.rpc('log_accountant_action', {
      p_accountant_id: accountantId,
      p_action_type: actionType,
      p_entity_type: entityType,
      p_entity_id: entityId,
      p_student_id: studentId,
      p_description: description || '',
      p_old_values: oldValues,
      p_new_values: newValues,
      p_ip_address: null, // Will be set by the client if needed
      p_user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null
    });
  } catch (error) {
    console.error('Failed to log accountant action:', error);
    // Don't throw error to avoid breaking the main operation
  }
};

// Accountant API functions
export const accountantAPI = {
  // Get all students for financial management
  async getAllStudents() {
    console.log('Fetching students for accountant...');

    const { data, error } = await supabase
      .rpc('accountant_get_all_students');

    if (error) {
      console.error('Error fetching students:', error);
      throw error;
    }

    console.log('Students fetched successfully:', data?.length || 0);
    return data;
  },

  // Create financial record
  async createFinancialRecord(recordData: {
    student_id: string;
    academic_year: string;
    semester: number;
    tuition_fee: number;
    accommodation_fee?: number;
    other_fees?: number;
    due_date: string;
  }, accountantId?: string) {
    console.log('Creating financial record:', recordData);

    const { data, error } = await supabase
      .rpc('accountant_create_financial_record', {
        p_student_id: recordData.student_id,
        p_academic_year: recordData.academic_year,
        p_semester: recordData.semester,
        p_tuition_fee: recordData.tuition_fee,
        p_accommodation_fee: recordData.accommodation_fee || 0,
        p_other_fees: recordData.other_fees || 0,
        p_due_date: recordData.due_date
      });

    if (error) {
      console.error('Error creating financial record:', error);
      throw error;
    }

    // Log the action
    if (accountantId && data) {
      const totalAmount = recordData.tuition_fee + (recordData.accommodation_fee || 0) + (recordData.other_fees || 0);
      await logAccountantAction(
        accountantId,
        'create',
        'financial_record',
        data.id,
        recordData.student_id,
        `Created financial record for ${recordData.academic_year} S${recordData.semester} - Total: ZMW ${totalAmount}`,
        null,
        recordData
      );
    }

    console.log('Financial record created successfully:', data);
    return data;
  },

  // Record payment
  async recordPayment(paymentData: {
    student_id: string;
    amount: number;
    payment_method?: string;
    reference_number?: string;
    payment_date: string;
    processed_by: string;
    notes?: string;
  }, accountantId?: string) {
    console.log('Recording payment:', paymentData);

    const { data, error } = await supabase
      .rpc('accountant_record_payment', {
        p_student_id: paymentData.student_id,
        p_amount: paymentData.amount,
        p_payment_method: paymentData.payment_method || 'cash',
        p_reference_number: paymentData.reference_number || null,
        p_payment_date: paymentData.payment_date,
        p_processed_by: paymentData.processed_by,
        p_notes: paymentData.notes || null
      });

    if (error) {
      console.error('Error recording payment:', error);
      throw error;
    }

    // Log the action
    if (accountantId && data) {
      await logAccountantAction(
        accountantId,
        'create',
        'payment',
        data.id,
        paymentData.student_id,
        `Recorded payment of ZMW ${paymentData.amount} via ${paymentData.payment_method || 'cash'}${paymentData.reference_number ? ` (Ref: ${paymentData.reference_number})` : ''}`,
        null,
        paymentData
      );
    }

    console.log('Payment recorded successfully:', data);
    return data;
  },

  // Update financial record
  async updateFinancialRecord(recordId: string, updateData: {
    academic_year?: string;
    semester?: number;
    tuition_fee?: number;
    accommodation_fee?: number;
    other_fees?: number;
    due_date?: string;
  }, accountantId?: string) {
    // Get the old record for logging
    const { data: oldRecord } = await supabase
      .from('financial_records')
      .select(`
        *,
        students(student_id, first_name, last_name)
      `)
      .eq('id', recordId)
      .single();

    const { data, error } = await supabase
      .from('financial_records')
      .update({
        ...updateData,
        total_amount: (updateData.tuition_fee || 0) + (updateData.accommodation_fee || 0) + (updateData.other_fees || 0),
        updated_at: new Date().toISOString()
      })
      .eq('id', recordId)
      .select(`
        *,
        students(student_id, first_name, last_name)
      `)
      .single();

    if (error) throw error;

    // Log the action
    if (accountantId && oldRecord && data) {
      const changes = Object.keys(updateData).filter(key =>
        updateData[key as keyof typeof updateData] !== oldRecord[key]
      );
      await logAccountantAction(
        accountantId,
        'update',
        'financial_record',
        recordId,
        oldRecord.student_id,
        `Updated financial record - Changed: ${changes.join(', ')}`,
        oldRecord,
        data
      );
    }

    return data;
  },

  // Delete financial record
  async deleteFinancialRecord(recordId: string, accountantId?: string) {
    // Get the record for logging before deletion
    const { data: recordToDelete } = await supabase
      .from('financial_records')
      .select(`
        *,
        students(student_id, first_name, last_name)
      `)
      .eq('id', recordId)
      .single();

    const { error } = await supabase
      .from('financial_records')
      .delete()
      .eq('id', recordId);

    if (error) throw error;

    // Log the action
    if (accountantId && recordToDelete) {
      await logAccountantAction(
        accountantId,
        'delete',
        'financial_record',
        recordId,
        recordToDelete.student_id,
        `Deleted financial record for ${recordToDelete.academic_year} S${recordToDelete.semester} - Amount: ZMW ${recordToDelete.total_amount}`,
        recordToDelete,
        null
      );
    }

    return { success: true };
  },

  // Update payment
  async updatePayment(paymentId: string, updateData: {
    amount?: number;
    payment_method?: string;
    reference_number?: string;
    payment_date?: string;
    notes?: string;
  }, accountantId?: string) {
    // Get the old payment for logging
    const { data: oldPayment } = await supabase
      .from('payments')
      .select(`
        *,
        students(student_id, first_name, last_name)
      `)
      .eq('id', paymentId)
      .single();

    const { data, error } = await supabase
      .from('payments')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', paymentId)
      .select(`
        *,
        students(student_id, first_name, last_name)
      `)
      .single();

    if (error) throw error;

    // Log the action
    if (accountantId && oldPayment && data) {
      const changes = Object.keys(updateData).filter(key =>
        updateData[key as keyof typeof updateData] !== oldPayment[key]
      );
      await logAccountantAction(
        accountantId,
        'update',
        'payment',
        paymentId,
        oldPayment.student_id,
        `Updated payment - Changed: ${changes.join(', ')}`,
        oldPayment,
        data
      );
    }

    return data;
  },

  // Delete payment
  async deletePayment(paymentId: string, accountantId?: string) {
    // Get the payment for logging before deletion
    const { data: paymentToDelete } = await supabase
      .from('payments')
      .select(`
        *,
        students(student_id, first_name, last_name)
      `)
      .eq('id', paymentId)
      .single();

    const { error } = await supabase
      .from('payments')
      .delete()
      .eq('id', paymentId);

    if (error) throw error;

    // Log the action
    if (accountantId && paymentToDelete) {
      await logAccountantAction(
        accountantId,
        'delete',
        'payment',
        paymentId,
        paymentToDelete.student_id,
        `Deleted payment of ZMW ${paymentToDelete.amount} via ${paymentToDelete.payment_method}${paymentToDelete.reference_number ? ` (Ref: ${paymentToDelete.reference_number})` : ''}`,
        paymentToDelete,
        null
      );
    }

    return { success: true };
  },

  // Get financial records for a student
  async getStudentFinancialRecords(studentId: string) {
    const { data, error } = await supabase
      .from('financial_records')
      .select(`
        *,
        students(student_id, first_name, last_name)
      `)
      .eq('student_id', studentId)
      .order('academic_year', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Get all financial records (for ledger view)
  async getAllFinancialRecords() {
    const { data, error } = await supabase
      .rpc('accountant_get_all_financial_records');

    if (error) throw error;
    return data || [];
  },

  // Get all payments (for transaction history)
  async getAllPayments() {
    const { data, error } = await supabase
      .rpc('accountant_get_all_payments');

    if (error) throw error;
    return data || [];
  },



  // Get student financial summary
  async getStudentFinancialSummary(studentId: string) {
    // Get financial records
    const { data: records } = await supabase
      .from('financial_records')
      .select('*')
      .eq('student_id', studentId);

    // Get payments
    const { data: payments } = await supabase
      .from('payments')
      .select('*')
      .eq('student_id', studentId);

    const totalOwed = records?.reduce((sum, record) => sum + record.total_amount, 0) || 0;
    const totalPaid = payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
    const totalBalance = totalOwed - totalPaid;

    return {
      records: records || [],
      payments: payments || [],
      summary: {
        totalOwed,
        totalPaid,
        totalBalance
      }
    };
  },

  // Get accountant logs with filtering and grouping
  async getAccountantLogs(filters: {
    accountantId?: string;
    studentId?: string;
    actionType?: string;
    entityType?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  } = {}) {
    const { data, error } = await supabase
      .rpc('get_accountant_logs', {
        p_accountant_id: filters.accountantId || null,
        p_student_id: filters.studentId || null,
        p_action_type: filters.actionType || null,
        p_entity_type: filters.entityType || null,
        p_start_date: filters.startDate || null,
        p_end_date: filters.endDate || null,
        p_limit: filters.limit || 100,
        p_offset: filters.offset || 0
      });

    if (error) throw error;
    return data || [];
  },

  // Get logs grouped by date
  async getLogsGroupedByDate(filters: {
    accountantId?: string;
    startDate?: string;
    endDate?: string;
  } = {}) {
    const logs = await this.getAccountantLogs({
      ...filters,
      limit: 1000 // Get more logs for grouping
    });

    // Group logs by date
    const groupedLogs = logs.reduce((groups: any, log: any) => {
      const date = log.created_date;
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(log);
      return groups;
    }, {});

    return groupedLogs;
  },

  // Get logs grouped by month and year
  async getLogsGroupedByMonth(filters: {
    accountantId?: string;
    year?: number;
  } = {}) {
    const logs = await this.getAccountantLogs({
      ...filters,
      limit: 1000
    });

    // Group logs by month and year
    const groupedLogs = logs.reduce((groups: any, log: any) => {
      const monthYear = `${log.created_year}-${String(log.created_month).padStart(2, '0')}`;
      if (!groups[monthYear]) {
        groups[monthYear] = [];
      }
      groups[monthYear].push(log);
      return groups;
    }, {});

    return groupedLogs;
  }
};

// Site Settings API functions
export const siteSettingsAPI = {
  // Get all site settings
  async getAll() {
    const { data, error } = await supabase
      .from('site_settings')
      .select('*')
      .order('category', { ascending: true });

    if (error) throw error;
    return data;
  },

  // Get settings by category
  async getByCategory(category: 'footer' | 'header' | 'general' | 'contact' | 'homepage') {
    const { data, error } = await supabase
      .from('site_settings')
      .select('*')
      .eq('category', category)
      .order('setting_key', { ascending: true });

    if (error) throw error;
    return data;
  },

  // Get a specific setting by key
  async getByKey(settingKey: string) {
    const { data, error } = await supabase
      .from('site_settings')
      .select('*')
      .eq('setting_key', settingKey)
      .single();

    if (error) throw error;
    return data;
  },

  // Update a setting (admin only)
  async updateSetting(settingKey: string, settingValue: string) {
    console.log('Updating setting:', settingKey, 'with value:', settingValue);

    const { data, error } = await supabase
      .from('site_settings')
      .update({
        setting_value: settingValue,
        updated_at: new Date().toISOString()
      })
      .eq('setting_key', settingKey)
      .eq('is_editable', true)
      .select();

    console.log('Update result:', { data, error });

    if (error) {
      console.error('Update error:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      throw new Error(`No editable setting found with key: ${settingKey}`);
    }

    return data[0];
  },

  // Create a new setting (admin only)
  async createSetting(settingData: {
    setting_key: string;
    setting_value: string;
    setting_type: 'text' | 'number' | 'boolean' | 'json';
    description?: string;
    category: 'footer' | 'header' | 'general' | 'contact' | 'homepage';
    is_editable?: boolean;
  }) {
    const { data, error } = await supabase
      .from('site_settings')
      .insert([{
        ...settingData,
        is_editable: settingData.is_editable ?? true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete a setting (admin only)
  async deleteSetting(settingKey: string) {
    const { error } = await supabase
      .from('site_settings')
      .delete()
      .eq('setting_key', settingKey)
      .eq('is_editable', true);

    if (error) throw error;
  },

  // Get footer settings as a structured object
  async getFooterSettings() {
    const { data, error } = await supabase
      .from('site_settings')
      .select('*')
      .eq('category', 'footer')
      .order('setting_key', { ascending: true });

    if (error) throw error;

    // Convert to structured object
    const footerSettings: any = {};
    data?.forEach(setting => {
      footerSettings[setting.setting_key] = setting.setting_value;
    });

    return footerSettings;
  },

  // Get homepage settings as a structured object
  async getHomepageSettings() {
    const { data, error } = await supabase
      .from('site_settings')
      .select('*')
      .eq('category', 'homepage')
      .order('setting_key', { ascending: true });

    if (error) throw error;

    // Convert to structured object
    const homepageSettings: any = {};
    data?.forEach(setting => {
      homepageSettings[setting.setting_key] = setting.setting_value;
    });

    return homepageSettings;
  }
};
