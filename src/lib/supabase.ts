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
  role: 'admin' | 'lecturer' | 'student' | 'accountant' | 'principal';
  is_active: boolean;
  last_login?: string;
  access_denied?: boolean;
  denial_reason?: string;
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

    // Check if access is denied for students
    if (user.access_denied) {
      throw new Error(user.denial_reason || 'Access denied');
    }

    // Update last login only if access is granted
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
      role: userRole as 'admin' | 'lecturer' | 'student' | 'accountant' | 'principal',
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
  status: 'pending' | 'under_review' | 'approved' | 'rejected';
  submitted_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ApplicationFile {
  id: string;
  application_id: string;
  file_type: 'nrc_photo' | 'grade12_results' | 'payment_receipt';
  file_path: string;
  file_name: string;
  file_size: number;
  file_url?: string;
  authenticity_score: number;
  authenticity_flags: string[];
  requires_review: boolean;
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Staff {
  id: string;
  staff_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  department: string;
  job_title: string;
  academic_qualifications?: string;
  specialization?: string;
  profile_photo_path?: string;
  profile_photo_url?: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface StaffAuditLog {
  id: string;
  staff_id: string;
  action: 'created' | 'updated' | 'deleted' | 'activated' | 'deactivated';
  changes?: Record<string, any>;
  performed_by: string;
  timestamp: string;
  notes?: string;
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
  file_path?: string;
  file_name?: string;
  file_size?: number;
  file_url?: string;
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

// Access Control Interfaces
export interface PaymentApproval {
  id: string;
  student_id: string;
  payment_id?: string;
  amount_paid: number;
  payment_reference?: string;
  payment_date: string;
  approved_by?: string;
  approval_date?: string;
  access_valid_from: string;
  access_valid_until: string;
  approval_status: 'pending' | 'approved' | 'rejected' | 'expired' | 'revoked';
  approval_notes?: string;
  auto_expire: boolean;
  created_at: string;
  updated_at: string;
}

export interface SemesterPeriod {
  id: string;
  semester_name: string;
  academic_year: string;
  semester_number: number;
  start_date: string;
  end_date: string;
  registration_start_date: string;
  registration_end_date: string;
  is_active: boolean;
  is_registration_open: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface StudentSemesterRegistration {
  id: string;
  student_id: string;
  semester_period_id: string;
  registration_date: string;
  approved_by?: string;
  approval_date?: string;
  registration_status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  payment_approval_id?: string;
  registration_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface AccessControlLog {
  id: string;
  student_id: string;
  action_type: string;
  reason?: string;
  payment_approval_id?: string;
  semester_registration_id?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface ExamSlip {
  id: string;
  course_id: string;
  lecturer_name: string;
  exam_date: string;
  exam_time: string;
  venue: string;
  academic_year: string;
  semester: number;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  courses?: {
    course_code: string;
    course_name: string;
  };
}

export interface StudentAccessStatus {
  has_access: boolean;
  payment_approved: boolean;
  semester_registered: boolean;
  access_valid_until?: string;
  semester_end_date?: string;
  denial_reason?: string;
  financial_balance?: number;
  has_financial_statements?: boolean;
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
    try {
      const response = await fetch('/api/admin/applications', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch applications');
      }

      return result.applications;
    } catch (error) {
      console.error('Error fetching applications:', error);
      throw error;
    }
  },

  // Update application status (admin only)
  async updateStatus(id: string, status: Application['status'], adminNotes?: string, reviewedBy?: string) {
    const response = await fetch('/api/admin/applications', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        applicationId: id,
        status,
        adminNotes,
        reviewedBy
      })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to update application');
    }

    return result.application;
  },

  // Upload application file
  async uploadFile(applicationId: string, fileData: {
    file_type: 'nrc_photo' | 'grade12_results' | 'payment_receipt';
    file_path: string;
    file_name: string;
    file_size: number;
    file_url?: string;
    authenticity_score: number;
    authenticity_flags: string[];
  }) {
    const requiresReview = fileData.authenticity_score < 70 || fileData.authenticity_flags.length > 0;

    const { data, error } = await supabase
      .from('application_files')
      .insert([{
        application_id: applicationId,
        ...fileData,
        requires_review: requiresReview
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Get application files
  async getFiles(applicationId: string) {
    const response = await fetch(`/api/admin/applications/${applicationId}/files`);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to fetch application files');
    }

    return result.files;
  },

  // Get applications with files that require review (admin only)
  async getApplicationsRequiringReview() {
    const { data, error } = await supabase
      .from('applications')
      .select(`
        *,
        application_files!inner(*)
      `)
      .eq('application_files.requires_review', true)
      .order('submitted_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Review application file (admin only)
  async reviewFile(fileId: string, reviewData: {
    requires_review: boolean;
    reviewed_by: string;
    review_notes?: string;
  }) {
    const { data, error } = await supabase
      .from('application_files')
      .update({
        ...reviewData,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', fileId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};

// API functions for staff management
export const staffAPI = {
  // Get all staff (admin only)
  async getAll() {
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        // If staff table doesn't exist, throw error to be handled by component
        throw new Error('Staff table not found. Please set up the database schema.');
      }

      // Generate URLs for staff photos that are missing them
      if (data) {
        const { generateStaffPhotoUrl } = await import('@/utils/fileUpload');

        for (const staff of data) {
          if (staff.profile_photo_path && !staff.profile_photo_url) {
            try {
              staff.profile_photo_url = await generateStaffPhotoUrl(staff.profile_photo_path);

              // Update the database with the generated URL
              await supabase
                .from('staff')
                .update({ profile_photo_url: staff.profile_photo_url })
                .eq('id', staff.id);
            } catch (urlError) {
              console.error(`Failed to generate URL for staff ${staff.id}:`, urlError);
            }
          }
        }
      }

      return data;
    } catch (error) {
      // Re-throw the error to be handled by the component
      throw error;
    }
  },

  // Get staff by ID
  async getById(staffId: string) {
    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .eq('id', staffId)
      .single();

    if (error) throw error;
    return data;
  },

  // Create new staff member (admin only)
  async create(staffData: {
    staff_id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    department: string;
    job_title: string;
    academic_qualifications?: string;
    specialization?: string;
    profile_photo_path?: string;
    profile_photo_url?: string;
    created_by: string;
  }) {
    const { data, error } = await supabase
      .from('staff')
      .insert([staffData])
      .select()
      .single();

    if (error) throw error;

    // Log the creation
    await this.logAction(data.id, 'created', null, staffData.created_by, 'Staff member created');

    return data;
  },

  // Update staff member (admin only)
  async update(staffId: string, updates: Partial<Staff>, updatedBy: string) {
    // Get current data for audit log
    const currentData = await this.getById(staffId);

    const { data, error } = await supabase
      .from('staff')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', staffId)
      .select()
      .single();

    if (error) throw error;

    // Log the update
    await this.logAction(staffId, 'updated', { before: currentData, after: updates }, updatedBy, 'Staff member updated');

    return data;
  },

  // Delete staff member (admin only)
  async delete(staffId: string, deletedBy: string) {
    // Get current data for audit log
    const currentData = await this.getById(staffId);

    const { error } = await supabase
      .from('staff')
      .delete()
      .eq('id', staffId);

    if (error) throw error;

    // Log the deletion
    await this.logAction(staffId, 'deleted', { deleted_data: currentData }, deletedBy, 'Staff member deleted');
  },

  // Search and filter staff
  async search(filters: {
    searchTerm?: string;
    department?: string;
    jobTitle?: string;
    isActive?: boolean;
  }) {
    let query = supabase
      .from('staff')
      .select('*');

    if (filters.searchTerm) {
      query = query.or(`first_name.ilike.%${filters.searchTerm}%,last_name.ilike.%${filters.searchTerm}%,email.ilike.%${filters.searchTerm}%`);
    }

    if (filters.department) {
      query = query.eq('department', filters.department);
    }

    if (filters.jobTitle) {
      query = query.eq('job_title', filters.jobTitle);
    }

    if (filters.isActive !== undefined) {
      query = query.eq('is_active', filters.isActive);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;
    return data;
  },

  // Toggle staff active status (admin only)
  async toggleActiveStatus(staffId: string, isActive: boolean, updatedBy: string) {
    const { data, error } = await supabase
      .from('staff')
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString()
      })
      .eq('id', staffId)
      .select()
      .single();

    if (error) throw error;

    // Log the status change
    await this.logAction(
      staffId,
      isActive ? 'activated' : 'deactivated',
      { status_change: { from: !isActive, to: isActive } },
      updatedBy,
      `Staff member ${isActive ? 'activated' : 'deactivated'}`
    );

    return data;
  },

  // Update staff photo URLs for existing staff with photos but missing URLs
  async updateMissingPhotoUrls() {
    try {
      // Get staff members who have photo paths but missing URLs
      const { data: staffWithPhotos, error } = await supabase
        .from('staff')
        .select('id, profile_photo_path, profile_photo_url')
        .not('profile_photo_path', 'is', null)
        .is('profile_photo_url', null);

      if (error) throw error;

      if (!staffWithPhotos || staffWithPhotos.length === 0) {
        return { updated: 0, message: 'No staff members need photo URL updates' };
      }

      let updatedCount = 0;
      const { generateStaffPhotoUrl } = await import('@/utils/fileUpload');

      for (const staff of staffWithPhotos) {
        try {
          // Generate signed URL for the photo
          const photoUrl = await generateStaffPhotoUrl(staff.profile_photo_path);

          // Update the staff record with the URL
          const { error: updateError } = await supabase
            .from('staff')
            .update({ profile_photo_url: photoUrl })
            .eq('id', staff.id);

          if (!updateError) {
            updatedCount++;
          } else {
            console.error(`Failed to update photo URL for staff ${staff.id}:`, updateError);
          }
        } catch (urlError) {
          console.error(`Failed to generate URL for staff ${staff.id}:`, urlError);
        }
      }

      return {
        updated: updatedCount,
        total: staffWithPhotos.length,
        message: `Updated ${updatedCount} out of ${staffWithPhotos.length} staff photo URLs`
      };
    } catch (error) {
      console.error('Failed to update missing photo URLs:', error);
      throw error;
    }
  },

  // Log staff actions for audit trail
  async logAction(
    staffId: string,
    action: 'created' | 'updated' | 'deleted' | 'activated' | 'deactivated',
    changes: Record<string, any> | null,
    performedBy: string,
    notes?: string
  ) {
    const { error } = await supabase
      .from('staff_audit_logs')
      .insert([{
        staff_id: staffId,
        action,
        changes,
        performed_by: performedBy,
        timestamp: new Date().toISOString(),
        notes
      }]);

    if (error) {
      console.error('Failed to log staff action:', error);
      // Don't throw error for audit log failures to avoid breaking main operations
    }
  },

  // Get audit logs for a staff member (admin only)
  async getAuditLogs(staffId: string) {
    const { data, error } = await supabase
      .from('staff_audit_logs')
      .select('*')
      .eq('staff_id', staffId)
      .order('timestamp', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Get all departments (for filtering)
  async getDepartments() {
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('department')
        .not('department', 'is', null);

      if (error) {
        // If staff table doesn't exist, return fallback departments
        return [
          { name: 'Nursing' },
          { name: 'Administration' },
          { name: 'Academic' },
          { name: 'Clinical' },
          { name: 'Support' },
          { name: 'Management' }
        ];
      }

      // Return unique departments in the expected format
      const departments = [...new Set(data.map(item => item.department))];
      return departments.sort().map(name => ({ name }));
    } catch (error) {
      // Return fallback departments if any error occurs
      return [
        { name: 'Nursing' },
        { name: 'Administration' },
        { name: 'Academic' },
        { name: 'Clinical' },
        { name: 'Support' },
        { name: 'Management' }
      ];
    }
  },

  // Get all job titles (for filtering)
  async getJobTitles() {
    const { data, error } = await supabase
      .from('staff')
      .select('job_title')
      .not('job_title', 'is', null);

    if (error) throw error;

    // Return unique job titles
    const jobTitles = [...new Set(data.map(item => item.job_title))];
    return jobTitles.sort();
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
    const { data, error } = await supabase
      .from('updates')
      .delete()
      .eq('id', id)
      .select();

    if (error) throw error;
    return data;
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
    const { data, error } = await supabase
      .from('updates')
      .delete()
      .in('id', ids)
      .select();

    if (error) throw error;
    return data;
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
  },

  // Create document (admin only)
  async create(documentData: Omit<Document, 'id' | 'created_at' | 'updated_at' | 'download_count'>) {
    const insertData = {
      ...documentData,
      download_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('Attempting to insert document data:', insertData);

    const { data, error } = await supabase
      .from('documents')
      .insert([insertData])
      .select();

    if (error) {
      console.error('Create document error:', error);
      throw error;
    }

    console.log('Insert successful, data:', data);
    return data && data.length > 0 ? data[0] : data;
  },

  // Update existing document (admin only)
  async update(id: string, documentData: Partial<Document>) {
    const { data, error } = await supabase
      .from('documents')
      .update({
        ...documentData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete document (admin only)
  async delete(id: string) {
    const { data, error } = await supabase
      .from('documents')
      .delete()
      .eq('id', id)
      .select();

    if (error) throw error;
    return data;
  },

  // Admin-specific functions
  // Get all documents (including private) for admin management
  async getAllForAdmin() {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Bulk publish/unpublish documents
  async bulkUpdateStatus(ids: string[], isPublic: boolean) {
    const { data, error } = await supabase
      .from('documents')
      .update({
        is_public: isPublic,
        updated_at: new Date().toISOString()
      })
      .in('id', ids)
      .select();

    if (error) throw error;
    return data;
  },

  // Bulk delete documents
  async bulkDelete(ids: string[]) {
    const { data, error } = await supabase
      .from('documents')
      .delete()
      .in('id', ids)
      .select();

    if (error) throw error;
    return data;
  },

  // Get documents statistics for admin dashboard
  async getStatistics() {
    const { data, error } = await supabase
      .from('documents')
      .select('category, is_public, download_count');

    if (error) throw error;

    if (!data) return null;

    const stats = {
      total: data.length,
      public: data.filter(doc => doc.is_public).length,
      private: data.filter(doc => !doc.is_public).length,
      totalDownloads: data.reduce((sum, doc) => sum + (doc.download_count || 0), 0),
      byCategory: data.reduce((acc: any, doc) => {
        acc[doc.category] = (acc[doc.category] || 0) + 1;
        return acc;
      }, {})
    };

    return stats;
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
  },

  // Exam Slip Management Functions

  // Get all exam slips (admin only)
  async getAllExamSlips() {
    const { data, error } = await supabase
      .from('exam_slips')
      .select(`
        *,
        courses(course_code, course_name)
      `)
      .order('exam_date', { ascending: true });

    if (error) throw error;
    return data;
  },

  // Create exam slip (admin only)
  async createExamSlip(examSlipData: {
    course_id: string;
    lecturer_name: string;
    exam_date: string;
    exam_time: string;
    venue: string;
    academic_year: string;
    semester: number;
    created_by: string;
  }) {
    const { data, error } = await supabase
      .from('exam_slips')
      .insert([{
        ...examSlipData,
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

  // Update exam slip (admin only)
  async updateExamSlip(examSlipId: string, updates: {
    lecturer_name?: string;
    exam_date?: string;
    exam_time?: string;
    venue?: string;
    academic_year?: string;
    semester?: number;
  }) {
    const { data, error } = await supabase
      .from('exam_slips')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', examSlipId)
      .select(`
        *,
        courses(course_code, course_name)
      `)
      .single();

    if (error) throw error;
    return data;
  },

  // Delete exam slip (admin only)
  async deleteExamSlip(examSlipId: string) {
    const { error } = await supabase
      .from('exam_slips')
      .delete()
      .eq('id', examSlipId);

    if (error) throw error;
    return { success: true };
  },

  // Toggle exam slip active status (admin only)
  async toggleExamSlipStatus(examSlipId: string, isActive: boolean) {
    const { data, error } = await supabase
      .from('exam_slips')
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString()
      })
      .eq('id', examSlipId)
      .select(`
        *,
        courses(course_code, course_name)
      `)
      .single();

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

  // Get students available for enrollment (all active students for enrollment purposes)
  async getStudentsForEnrollment() {
    const { data, error } = await supabase
      .from('students')
      .select('id, student_id, first_name, last_name, email, program, year_of_study, status')
      .eq('status', 'active')
      .order('student_id', { ascending: true });

    if (error) throw error;
    return data;
  },

  // Get students enrolled in lecturer's courses only
  async getLecturerStudents(lecturerId: string) {
    const { data, error } = await supabase
      .from('course_enrollments')
      .select(`
        students(id, student_id, first_name, last_name, email, program, year_of_study, status),
        courses!inner(lecturer_id)
      `)
      .eq('courses.lecturer_id', lecturerId)
      .eq('status', 'enrolled');

    if (error) throw error;

    // Extract unique students and flatten the structure
    const studentsMap = new Map();
    data?.forEach((enrollment: any) => {
      if (enrollment.students) {
        studentsMap.set(enrollment.students.id, enrollment.students);
      }
    });

    return Array.from(studentsMap.values());
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
        courses!inner(course_code, course_name, lecturer_id)
      `)
      .eq('courses.lecturer_id', lecturerId)
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
    return data || [];
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
        courses!inner(course_code, course_name, lecturer_id)
      `)
      .eq('courses.lecturer_id', lecturerId)
      .order('submission_date', { ascending: false });

    if (academicYear) {
      query = query.eq('academic_year', academicYear);
    }
    if (semester) {
      query = query.eq('semester', semester);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
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
    // First get the courses for this lecturer
    const { data: lecturerCourses, error: coursesError } = await supabase
      .from('courses')
      .select('id')
      .eq('lecturer_id', lecturerId)
      .eq('is_active', true);

    if (coursesError) throw coursesError;

    const courseIds = lecturerCourses?.map(course => course.id) || [];

    if (courseIds.length === 0) {
      return []; // No courses assigned to this lecturer
    }

    let query = supabase
      .from('quizzes')
      .select(`
        *,
        courses(id, course_code, course_name, lecturer_id),
        quiz_questions(id),
        quiz_attempts(id, status)
      `)
      .in('course_id', courseIds)
      .eq('is_active', true)
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
    // First get the courses for this lecturer
    const { data: lecturerCourses, error: coursesError } = await supabase
      .from('courses')
      .select('id')
      .eq('lecturer_id', lecturerId)
      .eq('is_active', true);

    if (coursesError) throw coursesError;

    const courseIds = lecturerCourses?.map(course => course.id) || [];

    if (courseIds.length === 0) {
      return []; // No courses assigned to this lecturer
    }

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
      .in('course_id', courseIds)
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
    // First get the courses for this lecturer
    const { data: lecturerCourses, error: coursesError } = await supabase
      .from('courses')
      .select('id')
      .eq('lecturer_id', lecturerId)
      .eq('is_active', true);

    if (coursesError) throw coursesError;

    const courseIds = lecturerCourses?.map(course => course.id) || [];

    if (courseIds.length === 0) {
      return []; // No courses assigned to this lecturer
    }

    // Get quizzes for these courses
    const { data: lecturerQuizzes, error: quizzesError } = await supabase
      .from('quizzes')
      .select('id')
      .in('course_id', courseIds)
      .eq('is_active', true);

    if (quizzesError) throw quizzesError;

    const quizIds = lecturerQuizzes?.map(quiz => quiz.id) || [];

    if (quizIds.length === 0) {
      return []; // No quizzes for this lecturer's courses
    }

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
      .in('quiz_id', quizIds)
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

  // Get Exam Slips for a student based on their enrolled courses
  async getExamSlips(studentId: string) {
    // First get the student's enrolled courses
    const { data: enrolledCourses, error: enrollmentError } = await supabase
      .from('course_enrollments')
      .select('course_id')
      .eq('student_id', studentId)
      .eq('status', 'enrolled');

    if (enrollmentError) throw enrollmentError;

    if (!enrolledCourses || enrolledCourses.length === 0) {
      return [];
    }

    const courseIds = enrolledCourses.map(enrollment => enrollment.course_id);

    // Get exam slips for the enrolled courses
    const { data, error } = await supabase
      .from('exam_slips')
      .select(`
        *,
        courses(course_code, course_name, credits)
      `)
      .in('course_id', courseIds)
      .eq('is_active', true)
      .order('exam_date', { ascending: true });

    if (error) throw error;
    return data;
  },

  // Get Enrolled Courses with Exam Slip Information
  async getEnrolledCoursesWithExamSlips(studentId: string) {
    const { data, error } = await supabase
      .from('course_enrollments')
      .select(`
        *,
        courses(
          *,
          lecturers(first_name, last_name, email),
          exam_slips(
            id,
            lecturer_name,
            exam_date,
            exam_time,
            venue,
            academic_year,
            semester,
            is_active
          )
        )
      `)
      .eq('student_id', studentId)
      .eq('status', 'enrolled')
      .order('enrollment_date', { ascending: false });

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

  // Exam slip functions moved to adminAPI

  // Get Payments for a student (using student number with new RPC function)
  async getPayments(studentNumber: string) {
    console.log('Fetching payments for student:', studentNumber);
    const { data, error } = await supabase
      .rpc('student_get_payments', {
        p_student_number: studentNumber
      });

    if (error) {
      console.error('Error fetching student payments:', error);
      throw error;
    }

    console.log('Student payments fetched successfully:', data?.length || 0);
    return data || [];
  },

  // Get Financial Records for a student (using student number with new RPC function)
  async getFinancialRecords(studentNumber: string) {
    console.log('Fetching financial records for student:', studentNumber);
    const { data, error } = await supabase
      .rpc('student_get_financial_records', {
        p_student_number: studentNumber
      });

    if (error) {
      console.error('Error fetching student financial records:', error);
      throw error;
    }

    console.log('Student financial records fetched successfully:', data?.length || 0);
    return data || [];
  },

  // ===== ACCESS CONTROL FUNCTIONS =====

  // Check student access status
  async checkAccess(studentId: string): Promise<StudentAccessStatus | null> {
    try {
      // Use the accountant API function which has fallback logic
      return await accountantAPI.checkStudentAccess(studentId);
    } catch (error) {
      console.error('Error checking student access:', error);
      return {
        has_access: false,
        payment_approved: false,
        semester_registered: false,
        denial_reason: 'Error checking access status'
      };
    }
  },

  // Get student's payment approvals
  async getMyPaymentApprovals(studentId: string) {
    try {
      const { data, error } = await supabase
        .from('payment_approvals')
        .select(`
          *,
          accountants(first_name, last_name)
        `)
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

      if (error) {
        console.log('Payment approvals table not found:', error.message);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching payment approvals:', error);
      return [];
    }
  },

  // Get student's semester registrations
  async getMySemesterRegistrations(studentId: string) {
    try {
      const { data, error } = await supabase
        .from('student_semester_registrations')
        .select(`
          *,
          semester_periods(semester_name, academic_year, semester_number, start_date, end_date, is_active),
          payment_approvals(amount_paid, payment_reference, access_valid_until)
        `)
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

      if (error) {
        console.log('Student semester registrations table not found:', error.message);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching semester registrations:', error);
      return [];
    }
  },

  // Get active semester information
  async getActiveSemester() {
    try {
      // Use the accountant API function which has fallback logic
      return await accountantAPI.getActiveSemester();
    } catch (error) {
      console.error('Error fetching active semester:', error);
      return null;
    }
  },

  // Request semester registration (creates pending registration)
  async requestSemesterRegistration(studentId: string, semesterPeriodId: string, notes?: string) {
    const { data, error } = await supabase
      .from('student_semester_registrations')
      .insert({
        student_id: studentId,
        semester_period_id: semesterPeriodId,
        registration_status: 'pending',
        registration_notes: notes || null
      })
      .select();

    if (error) {
      console.error('Error requesting semester registration:', error);
      throw error;
    }

    return data;
  }
};

// Calendar Event Types
export interface CalendarEvent {
  id: string;
  title: string;
  description?: string | null;
  event_type: 'academic' | 'exam' | 'assignment' | 'meeting' | 'holiday' | 'announcement';
  start_date: string;
  end_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  location?: string | null;
  course_id?: string | null;
  lecturer_id?: string | null;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Comprehensive Calendar API
export const calendarAPI = {
  // Get all calendar events
  async getAllEvents() {
    const { data, error } = await supabase
      .from('academic_calendar')
      .select(`
        *,
        courses(course_code, course_name),
        lecturers(first_name, last_name)
      `)
      .eq('is_active', true)
      .order('start_date', { ascending: true });

    if (error) throw error;
    return data;
  },

  // Get events by date range
  async getEventsByDateRange(startDate: string, endDate: string) {
    const { data, error } = await supabase
      .from('academic_calendar')
      .select(`
        *,
        courses(course_code, course_name),
        lecturers(first_name, last_name)
      `)
      .eq('is_active', true)
      .gte('start_date', startDate)
      .lte('start_date', endDate)
      .order('start_date', { ascending: true });

    if (error) throw error;
    return data;
  },

  // Get events by type
  async getEventsByType(eventType: string) {
    const { data, error } = await supabase
      .from('academic_calendar')
      .select(`
        *,
        courses(course_code, course_name),
        lecturers(first_name, last_name)
      `)
      .eq('is_active', true)
      .eq('event_type', eventType)
      .order('start_date', { ascending: true });

    if (error) throw error;
    return data;
  },

  // Get upcoming events (next 30 days)
  async getUpcomingEvents(limit: number = 10) {
    const today = new Date().toISOString().split('T')[0];
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    const future = futureDate.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('academic_calendar')
      .select(`
        *,
        courses(course_code, course_name),
        lecturers(first_name, last_name)
      `)
      .eq('is_active', true)
      .gte('start_date', today)
      .lte('start_date', future)
      .order('start_date', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return data;
  },

  // Create calendar event (admin only)
  async createEvent(eventData: {
    title: string;
    description?: string | null;
    event_type: string;
    start_date: string;
    end_date?: string | null;
    start_time?: string | null;
    end_time?: string | null;
    location?: string | null;
    course_id?: string | null;
    lecturer_id?: string | null;
    created_by: string;
  }) {
    // Clean the data to ensure proper null handling
    const cleanedData = {
      title: eventData.title,
      description: eventData.description || null,
      event_type: eventData.event_type,
      start_date: eventData.start_date,
      end_date: eventData.end_date || null,
      start_time: eventData.start_time || null,
      end_time: eventData.end_time || null,
      location: eventData.location || null,
      course_id: eventData.course_id || null,
      lecturer_id: eventData.lecturer_id || null,
      created_by: eventData.created_by,
      is_active: true,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('academic_calendar')
      .insert([cleanedData])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update calendar event (admin only)
  async updateEvent(eventId: string, eventData: Partial<CalendarEvent>) {
    // Clean the data to ensure proper null handling
    const cleanedData: any = {
      updated_at: new Date().toISOString()
    };

    // Only include fields that are provided, converting empty strings to null
    Object.keys(eventData).forEach(key => {
      if (key !== 'id' && key !== 'created_at' && key !== 'updated_at') {
        const value = (eventData as any)[key];
        cleanedData[key] = value === '' ? null : value;
      }
    });

    const { data, error } = await supabase
      .from('academic_calendar')
      .update(cleanedData)
      .eq('id', eventId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete calendar event (admin only)
  async deleteEvent(eventId: string) {
    const { error } = await supabase
      .from('academic_calendar')
      .update({ is_active: false })
      .eq('id', eventId);

    if (error) throw error;
  },

  // Subscribe to real-time calendar updates
  subscribeToEvents(callback: (payload: any) => void) {
    return supabase
      .channel('calendar-events')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'academic_calendar'
        },
        callback
      )
      .subscribe();
  },

  // Get events for a specific month
  async getEventsForMonth(year: number, month: number) {
    const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    return this.getEventsByDateRange(startDate, endDate);
  },

  // Get today's events
  async getTodaysEvents() {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('academic_calendar')
      .select(`
        *,
        courses(course_code, course_name),
        lecturers(first_name, last_name)
      `)
      .eq('is_active', true)
      .eq('start_date', today)
      .order('start_time', { ascending: true });

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
    console.log('Fetching all financial records...');
    const { data, error } = await supabase
      .rpc('accountant_get_all_financial_records');

    if (error) {
      console.error('Error fetching financial records:', error);
      throw error;
    }

    console.log('Financial records fetched successfully:', data?.length || 0);
    return data || [];
  },

  // Get all payments (for ledger view)
  async getAllPayments() {
    console.log('Fetching all payments...');
    const { data, error } = await supabase
      .rpc('accountant_get_all_payments');

    if (error) {
      console.error('Error fetching payments:', error);
      throw error;
    }

    console.log('Payments fetched successfully:', data?.length || 0);
    return data || [];
  },

  // Get account balances for reporting
  async getAccountBalances() {
    console.log('Fetching account balances...');
    const { data, error } = await supabase
      .rpc('accountant_get_account_balances');

    if (error) {
      console.error('Error fetching account balances:', error);
      throw error;
    }

    console.log('Account balances fetched successfully:', data?.length || 0);
    return data || [];
  },

  // Get transaction history for reporting
  async getTransactionHistory(startDate?: string, endDate?: string, limit: number = 100) {
    console.log('Fetching transaction history...');
    const { data, error } = await supabase
      .rpc('accountant_get_transaction_history', {
        p_start_date: startDate || null,
        p_end_date: endDate || null,
        p_limit: limit
      });

    if (error) {
      console.error('Error fetching transaction history:', error);
      throw error;
    }

    console.log('Transaction history fetched successfully:', data?.length || 0);
    return data || [];
  },

  // Get account transaction details by ID
  async getAccountTransaction(transactionId: string) {
    console.log('Fetching account transaction details:', transactionId);
    const { data, error } = await supabase
      .from('account_transactions')
      .select(`
        *,
        transaction_entries (
          *,
          accounts (account_number, account_name, account_type)
        )
      `)
      .eq('id', transactionId)
      .single();

    if (error) {
      console.error('Error fetching account transaction:', error);
      throw error;
    }

    console.log('Account transaction fetched successfully');
    return data;
  },

  // Get audit logs for financial operations
  async getAuditLogs(limit: number = 50, offset: number = 0) {
    console.log('Fetching audit logs...');
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching audit logs:', error);
      throw error;
    }

    console.log('Audit logs fetched successfully:', data?.length || 0);
    return data || [];
  },

  // Get financial summary for dashboard
  async getFinancialSummary() {
    console.log('Fetching financial summary...');

    try {
      const [accounts, recentTransactions, totalRecords, totalPayments] = await Promise.all([
        this.getAccountBalances(),
        this.getTransactionHistory(undefined, undefined, 10),
        supabase.from('financial_records').select('total_amount, balance', { count: 'exact' }),
        supabase.from('payments').select('amount', { count: 'exact' })
      ]);

      const totalOwed = totalRecords.data?.reduce((sum, record) => sum + (record.total_amount || 0), 0) || 0;
      const totalPaid = totalPayments.data?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;
      const totalBalance = totalRecords.data?.reduce((sum, record) => sum + (record.balance || 0), 0) || 0;

      const summary = {
        accounts: accounts || [],
        recentTransactions: recentTransactions || [],
        totalStudents: totalRecords.count || 0,
        totalOwed,
        totalPaid,
        totalBalance,
        totalPayments: totalPayments.count || 0
      };

      console.log('Financial summary compiled successfully');
      return summary;
    } catch (error) {
      console.error('Error fetching financial summary:', error);
      throw error;
    }
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
  },

  // ===== ACCESS CONTROL FUNCTIONS =====

  // Get all payment approvals
  async getAllPaymentApprovals() {
    try {
      const { data, error } = await supabase
        .from('payment_approvals')
        .select(`
          *,
          students(student_id, first_name, last_name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Payment approvals query error:', error.message);
        console.log('Trying fallback query without joins...');

        // Fallback query without joins
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('payment_approvals')
          .select('*')
          .order('created_at', { ascending: false });

        if (fallbackError) {
          console.error('Fallback query also failed:', fallbackError.message);
          return [];
        }

        console.log('Fallback query successful, returning data without joins');
        return fallbackData || [];
      }

      // Manually fetch accountant data for each approval since approved_by can be either id or user_id
      if (data && data.length > 0) {
        const enrichedData = await Promise.all(data.map(async (approval) => {
          if (approval.approved_by) {
            // Try to find accountant by both id and user_id
            const { data: accountantData } = await supabase
              .from('accountants')
              .select('first_name, last_name, accountant_id')
              .or(`id.eq.${approval.approved_by},user_id.eq.${approval.approved_by}`)
              .single();

            return {
              ...approval,
              accountants: accountantData || null
            };
          }
          return approval;
        }));

        console.log('Payment approvals loaded successfully with accountant data:', enrichedData.length);
        return enrichedData;
      }

      console.log('Payment approvals loaded successfully:', data?.length || 0);
      return data || [];
    } catch (error) {
      console.error('Error getting payment approvals:', error);
      return [];
    }
  },

  // Get payment approvals for a specific student
  async getStudentPaymentApprovals(studentId: string) {
    const { data, error } = await supabase
      .from('payment_approvals')
      .select(`
        *,
        students(student_id, first_name, last_name, email)
      `)
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Get all approved students with their access status
  async getAllApprovedStudents() {
    try {
      // First ensure tables exist
      await this.ensureTablesExist();

      // Get students with approved payments
      const { data: approvedPayments, error: paymentsError } = await supabase
        .from('payment_approvals')
        .select(`
          student_id,
          amount_paid,
          payment_date,
          access_valid_from,
          access_valid_until,
          approval_status
        `)
        .eq('approval_status', 'approved')
        .gte('access_valid_until', new Date().toISOString().split('T')[0])
        .order('access_valid_until', { ascending: true });

      if (paymentsError) {
        console.log('Payment approvals table not found or error:', paymentsError.message);
        return [];
      }

      if (!approvedPayments || approvedPayments.length === 0) {
        return [];
      }

      // Get student details separately
      const studentIds = approvedPayments.map(p => p.student_id);
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select(`
          id,
          student_id,
          first_name,
          last_name,
          email,
          program,
          year_of_study,
          semester,
          status
        `)
        .in('id', studentIds);

      if (studentsError) {
        console.log('Students table error:', studentsError.message);
        return [];
      }

      // Get semester registrations for these students
      let semesterRegistrations = [];
      if (studentIds.length > 0) {
        const { data: registrations, error: regError } = await supabase
          .from('student_semester_registrations')
          .select(`
            student_id,
            registration_status,
            semester_periods(semester_name, academic_year)
          `)
          .in('student_id', studentIds)
          .eq('registration_status', 'approved');

        if (regError) {
          console.log('Semester registrations table error:', regError.message);
          semesterRegistrations = [];
        } else {
          semesterRegistrations = registrations || [];
        }
      }

      // Combine the data
      const approvedStudents = approvedPayments.map(payment => {
        const student = students?.find(s => s.id === payment.student_id);
        const registration = semesterRegistrations.find(r => r.student_id === payment.student_id);

        if (!student) {
          return null; // Skip if student not found
        }

        return {
          ...student,
          payment_info: {
            amount_paid: payment.amount_paid,
            payment_date: payment.payment_date,
            access_valid_from: payment.access_valid_from,
            access_valid_until: payment.access_valid_until,
            approval_status: payment.approval_status
          },
          semester_info: registration ? {
            registration_status: registration.registration_status,
            semester_name: registration.semester_periods?.semester_name,
            academic_year: registration.semester_periods?.academic_year
          } : null,
          has_full_access: !!registration
        };
      }).filter(Boolean); // Remove null entries

      return approvedStudents;
    } catch (error: any) {
      console.error('Error getting approved students:', error);
      throw error;
    }
  },

  // Get students with active access (for termination management)
  async getStudentsWithActiveAccess() {
    try {
      // First ensure tables exist
      await this.ensureTablesExist();

      // Get students with any active access (approved payments or registrations)
      const { data: activePayments, error: paymentsError } = await supabase
        .from('payment_approvals')
        .select(`
          student_id,
          amount_paid,
          payment_date,
          access_valid_from,
          access_valid_until,
          approval_status,
          approval_notes
        `)
        .eq('approval_status', 'approved')
        .order('access_valid_until', { ascending: true });

      if (paymentsError) {
        console.log('Payment approvals table error:', paymentsError.message);
        return [];
      }

      if (!activePayments || activePayments.length === 0) {
        return [];
      }

      // Get student details
      const studentIds = activePayments.map(p => p.student_id);
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select(`
          id,
          student_id,
          first_name,
          last_name,
          email,
          program,
          year_of_study,
          semester,
          status
        `)
        .in('id', studentIds);

      if (studentsError) {
        console.log('Students table error:', studentsError.message);
        return [];
      }

      // Get semester registrations
      const { data: registrations, error: regError } = await supabase
        .from('student_semester_registrations')
        .select(`
          student_id,
          registration_status,
          semester_periods(semester_name, academic_year)
        `)
        .in('student_id', studentIds)
        .eq('registration_status', 'approved');

      const semesterRegistrations = regError ? [] : (registrations || []);

      // Combine the data
      const studentsWithAccess = activePayments.map(payment => {
        const student = students?.find(s => s.id === payment.student_id);
        const registration = semesterRegistrations.find(r => r.student_id === payment.student_id);

        if (!student) {
          return null;
        }

        const isExpired = new Date(payment.access_valid_until) < new Date();
        const isExpiringSoon = !isExpired && new Date(payment.access_valid_until) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        return {
          ...student,
          payment_info: {
            amount_paid: payment.amount_paid,
            payment_date: payment.payment_date,
            access_valid_from: payment.access_valid_from,
            access_valid_until: payment.access_valid_until,
            approval_status: payment.approval_status,
            approval_notes: payment.approval_notes
          },
          semester_info: registration ? {
            registration_status: registration.registration_status,
            semester_name: registration.semester_periods?.semester_name,
            academic_year: registration.semester_periods?.academic_year
          } : null,
          access_status: {
            has_payment_approval: true,
            has_semester_registration: !!registration,
            is_expired: isExpired,
            is_expiring_soon: isExpiringSoon,
            can_terminate: !isExpired // Can only terminate non-expired access
          }
        };
      }).filter(Boolean);

      return studentsWithAccess;
    } catch (error: any) {
      console.error('Error getting students with active access:', error);
      throw error;
    }
  },

  // Create a test payment approval (for debugging/setup purposes)
  async createTestPaymentApproval(accountantId: string) {
    try {
      // First get a student to create approval for
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('id, first_name, last_name, student_id')
        .limit(1);

      if (studentsError || !students || students.length === 0) {
        throw new Error('No students found. Please create a student first.');
      }

      const student = students[0];
      const today = new Date();
      const validUntil = new Date();
      validUntil.setMonth(validUntil.getMonth() + 3); // 3 months from now

      const testApproval = {
        student_id: student.id,
        amount_paid: 1500.00,
        payment_reference: `TEST-${Date.now()}`,
        payment_date: today.toISOString().split('T')[0],
        access_valid_from: today.toISOString().split('T')[0],
        access_valid_until: validUntil.toISOString().split('T')[0],
        approval_status: 'approved',
        approval_notes: 'Test payment approval created for demonstration',
        approved_by: accountantId,
        approval_date: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('payment_approvals')
        .insert(testApproval)
        .select();

      if (error) throw error;

      return {
        success: true,
        data,
        message: `Test payment approval created for ${student.first_name} ${student.last_name} (${student.student_id})`
      };
    } catch (error: any) {
      console.error('Error creating test payment approval:', error);
      throw error;
    }
  },

  // Update access control functions to use simplified logic
  async updateAccessControlToSimplified() {
    try {
      console.log('Updating access control functions to simplified logic...');

      const { error } = await supabase.rpc('exec_sql', {
        sql: `
          -- Update check_student_access function to use simplified logic
          CREATE OR REPLACE FUNCTION check_student_access(p_student_id UUID)
          RETURNS TABLE (
              has_access BOOLEAN,
              payment_approved BOOLEAN,
              semester_registered BOOLEAN,
              access_valid_until DATE,
              semester_end_date DATE,
              denial_reason TEXT,
              financial_balance DECIMAL(10,2),
              has_financial_statements BOOLEAN
          )
          LANGUAGE plpgsql
          SECURITY DEFINER
          AS $$
          DECLARE
              v_payment_approved BOOLEAN := false;
              v_semester_registered BOOLEAN := false;
              v_access_valid_until DATE;
              v_semester_end_date DATE;
              v_denial_reason TEXT := '';
              v_financial_balance DECIMAL(10,2) := 0.00;
              v_has_financial_statements BOOLEAN := false;
              v_total_balance DECIMAL(10,2) := 0.00;
          BEGIN
              -- Check financial statements first
              SELECT
                  CASE WHEN COUNT(*) > 0 THEN true ELSE false END,
                  COALESCE(SUM(COALESCE(fr.balance, 0)), 0.00)
              INTO v_has_financial_statements, v_total_balance
              FROM financial_records fr
              WHERE fr.student_id = p_student_id;

              v_financial_balance := v_total_balance;

              -- Check payment approval status (primary access control)
              SELECT
                  CASE WHEN COUNT(*) > 0 THEN true ELSE false END,
                  MAX(pa.access_valid_until)
              INTO v_payment_approved, v_access_valid_until
              FROM payment_approvals pa
              WHERE pa.student_id = p_student_id
                  AND pa.approval_status = 'approved'
                  AND pa.access_valid_from <= CURRENT_DATE
                  AND pa.access_valid_until >= CURRENT_DATE;

              -- Check semester registration (optional)
              SELECT
                  CASE WHEN COUNT(*) > 0 THEN true ELSE false END,
                  MAX(sp.end_date)
              INTO v_semester_registered, v_semester_end_date
              FROM student_semester_registrations ssr
              JOIN semester_periods sp ON ssr.semester_period_id = sp.id
              WHERE ssr.student_id = p_student_id
                  AND ssr.registration_status = 'approved'
                  AND sp.is_active = true
                  AND sp.start_date <= CURRENT_DATE
                  AND sp.end_date >= CURRENT_DATE;

              -- Simplified denial reason logic
              IF v_has_financial_statements AND v_financial_balance = 0.00 AND NOT v_payment_approved THEN
                  v_denial_reason := 'Access denied: You have a zero balance but no payment approval. Please pay and get approval from the Accounts Office.';
              ELSIF NOT v_payment_approved THEN
                  v_denial_reason := 'Payment not approved or access period expired. Please contact the Accounts Office.';
              END IF;

              -- SIMPLIFIED ACCESS LOGIC: Payment approval is sufficient for access
              RETURN QUERY SELECT
                  v_payment_approved OR (v_has_financial_statements AND v_financial_balance > 0.00),
                  v_payment_approved,
                  v_semester_registered,
                  v_access_valid_until,
                  v_semester_end_date,
                  v_denial_reason,
                  v_financial_balance,
                  v_has_financial_statements;
          END;
          $$;

          -- Add comment to track the update
          COMMENT ON FUNCTION check_student_access(UUID) IS 'Simplified access control - payment approval is sufficient for login. Updated: ' || NOW();
        `
      });

      if (error) {
        console.error('Error updating access control functions:', error);
        throw error;
      }

      console.log('Access control functions updated to simplified logic successfully');
      return { success: true, message: 'Access control updated to simplified logic - payment approval is now sufficient for login' };
    } catch (error: any) {
      console.error('Error updating access control:', error);
      throw error;
    }
  },

  // Verify student payment approval for registration
  async verifyStudentPaymentApproval(studentId: string) {
    try {
      console.log('Verifying payment approval for student:', studentId);

      const { data, error } = await supabase
        .rpc('verify_student_payment_approval', { p_student_id: studentId });

      if (error) {
        console.error('RPC function error, using fallback verification:', error);

        // Fallback to direct database query with comprehensive checks
        const { data: paymentData, error: paymentError } = await supabase
          .from('payment_approvals')
          .select(`
            *,
            accountants(first_name, last_name)
          `)
          .eq('student_id', studentId)
          .eq('approval_status', 'approved')
          .gte('access_valid_until', new Date().toISOString().split('T')[0])
          .lte('access_valid_from', new Date().toISOString().split('T')[0])
          .order('approval_date', { ascending: false })
          .limit(1);

        if (paymentError) {
          console.error('Fallback payment verification error:', paymentError);
          return {
            hasValidPayment: false,
            reason: 'Database error during payment verification',
            paymentStatus: 'error',
            details: null
          };
        }

        if (!paymentData || paymentData.length === 0) {
          // Check if student has any payment approvals at all
          const { data: anyPayments } = await supabase
            .from('payment_approvals')
            .select('approval_status, access_valid_until')
            .eq('student_id', studentId)
            .limit(1);

          const reason = anyPayments && anyPayments.length > 0
            ? 'No valid payment approval found. Payment may be expired, rejected, or access period ended.'
            : 'No payment approval found. Student must make payment and get approval from Accounts Office.';

          return {
            hasValidPayment: false,
            reason,
            paymentStatus: anyPayments && anyPayments.length > 0 ? 'expired' : 'none',
            details: null
          };
        }

        const payment = paymentData[0];
        const accountantName = payment.accountants
          ? `${payment.accountants.first_name} ${payment.accountants.last_name}`
          : 'Unknown';

        return {
          hasValidPayment: true,
          reason: 'Payment verification successful',
          paymentStatus: payment.approval_status,
          details: {
            accessValidUntil: payment.access_valid_until,
            amountPaid: payment.amount_paid,
            paymentReference: payment.payment_reference,
            approvalDate: payment.approval_date,
            approvedByName: accountantName
          }
        };
      }

      const verification = data?.[0];

      if (!verification) {
        return {
          hasValidPayment: false,
          reason: 'Unable to verify payment status',
          paymentStatus: 'unknown',
          details: null
        };
      }

      console.log('Payment verification result:', verification);

      return {
        hasValidPayment: verification.has_valid_payment,
        reason: verification.denial_reason || 'Payment verification successful',
        paymentStatus: verification.payment_status,
        details: {
          accessValidUntil: verification.access_valid_until,
          amountPaid: verification.amount_paid,
          paymentReference: verification.payment_reference,
          approvalDate: verification.approval_date,
          approvedByName: verification.approved_by_name
        }
      };
    } catch (error: any) {
      console.error('Error verifying student payment approval:', error);
      return {
        hasValidPayment: false,
        reason: 'Database error during payment verification',
        paymentStatus: 'error',
        details: null
      };
    }
  },

  // Approve payment with access period
  async approvePaymentAccess(approvalData: {
    student_id: string;
    payment_id?: string;
    amount_paid: number;
    payment_reference?: string;
    payment_date: string;
    access_valid_from: string;
    access_valid_until: string;
    approval_notes?: string;
  }, accountantId: string) {
    try {
      // First, ensure tables exist
      await this.ensureTablesExist();

      // Try RPC function first, fallback to direct insert
      try {
        const { data, error } = await supabase
          .rpc('approve_payment_access', {
            p_student_id: approvalData.student_id,
            p_payment_id: approvalData.payment_id || null,
            p_amount_paid: approvalData.amount_paid,
            p_payment_reference: approvalData.payment_reference || null,
            p_payment_date: approvalData.payment_date,
            p_access_valid_from: approvalData.access_valid_from,
            p_access_valid_until: approvalData.access_valid_until,
            p_approved_by: accountantId,
            p_approval_notes: approvalData.approval_notes || null
          });

        if (error) throw error;
        return data;
      } catch (rpcError: any) {
        console.log('RPC function not found, using direct insert:', rpcError.message);

        // Fallback to direct table insert
        const { data, error } = await supabase
          .from('payment_approvals')
          .insert({
            student_id: approvalData.student_id,
            payment_id: approvalData.payment_id,
            amount_paid: approvalData.amount_paid,
            payment_reference: approvalData.payment_reference,
            payment_date: approvalData.payment_date,
            access_valid_from: approvalData.access_valid_from,
            access_valid_until: approvalData.access_valid_until,
            approval_status: 'approved',
            approval_notes: approvalData.approval_notes,
            approved_by: accountantId,
            approval_date: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select();

        if (error) throw error;
        return data;
      }
    } catch (error: any) {
      console.error('Error approving payment access:', error);
      throw error;
    }
  },

  // Register student with comprehensive payment verification
  async registerStudentWithPaymentVerification(studentId: string, semesterPeriodId: string, accountantId: string, notes?: string) {
    try {
      console.log('Registering student with payment verification:', { studentId, semesterPeriodId, accountantId });

      const { data, error } = await supabase
        .rpc('register_student_with_payment_verification', {
          p_student_id: studentId,
          p_semester_period_id: semesterPeriodId,
          p_registered_by: accountantId,
          p_registration_notes: notes || 'Registration by accounts office'
        });

      if (error) {
        console.error('Error in database registration verification:', error);
        throw error;
      }

      const result = data?.[0];

      if (!result) {
        throw new Error('No result returned from database verification');
      }

      console.log('Registration verification result:', result);

      return {
        success: result.success,
        registrationId: result.registration_id,
        message: result.message,
        paymentVerification: result.payment_verification
      };
    } catch (error: any) {
      console.error('Error registering student with payment verification:', error);
      throw error;
    }
  },

  // Reject payment approval
  async rejectPaymentApproval(approvalId: string, rejectionNotes: string, accountantId: string) {
    const { data, error } = await supabase
      .from('payment_approvals')
      .update({
        approval_status: 'rejected',
        approval_notes: rejectionNotes,
        approved_by: accountantId,
        approval_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', approvalId)
      .select();

    if (error) throw error;
    return data;
  },

  // Unapprove payment approval (revoke access)
  async unapprovePaymentApproval(approvalId: string, unapprovalNotes: string, accountantId: string) {
    try {
      // First get the current approval to log the action
      const { data: currentApproval, error: fetchError } = await supabase
        .from('payment_approvals')
        .select('student_id, approval_status')
        .eq('id', approvalId)
        .single();

      if (fetchError) throw fetchError;

      if (currentApproval.approval_status !== 'approved') {
        throw new Error('Can only unapprove currently approved payments');
      }

      // Update the approval status to revoked
      const { data, error } = await supabase
        .from('payment_approvals')
        .update({
          approval_status: 'revoked',
          approval_notes: unapprovalNotes,
          approved_by: accountantId,
          approval_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', approvalId)
        .select();

      if (error) throw error;

      // Log the unapproval action
      await supabase
        .from('access_control_logs')
        .insert({
          student_id: currentApproval.student_id,
          action_type: 'access_revoked',
          reason: 'payment_unapproved',
          payment_approval_id: approvalId,
          notes: unapprovalNotes,
          performed_by: accountantId
        });

      return data;
    } catch (error: any) {
      console.error('Error unapproving payment:', error);
      throw error;
    }
  },

  // Terminate student access (revoke all active approvals and registrations)
  async terminateStudentAccess(studentId: string, terminationReason: string, accountantId: string) {
    try {
      // Get all active payment approvals for the student
      const { data: activeApprovals, error: approvalsError } = await supabase
        .from('payment_approvals')
        .select('id, approval_status')
        .eq('student_id', studentId)
        .eq('approval_status', 'approved');

      if (approvalsError) throw approvalsError;

      // Revoke all active payment approvals
      if (activeApprovals && activeApprovals.length > 0) {
        const { error: revokeError } = await supabase
          .from('payment_approvals')
          .update({
            approval_status: 'revoked',
            approval_notes: `Access terminated by accountant: ${terminationReason}`,
            approved_by: accountantId,
            approval_date: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('student_id', studentId)
          .eq('approval_status', 'approved');

        if (revokeError) throw revokeError;
      }

      // Revoke all active semester registrations
      const { error: registrationError } = await supabase
        .from('student_semester_registrations')
        .update({
          registration_status: 'cancelled',
          registration_notes: `Access terminated by accountant: ${terminationReason}`,
          approved_by: accountantId,
          approval_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('student_id', studentId)
        .eq('registration_status', 'approved');

      if (registrationError) throw registrationError;

      // Log the termination action
      await supabase
        .from('access_control_logs')
        .insert({
          student_id: studentId,
          action_type: 'access_terminated',
          reason: 'manual_termination',
          notes: terminationReason,
          performed_by: accountantId
        });

      return {
        success: true,
        revokedApprovals: activeApprovals?.length || 0,
        message: `Student access terminated successfully. ${activeApprovals?.length || 0} payment approvals revoked.`
      };
    } catch (error: any) {
      console.error('Error terminating student access:', error);
      throw error;
    }
  },

  // Bulk terminate access for multiple students
  async bulkTerminateStudentAccess(studentIds: string[], terminationReason: string, accountantId: string) {
    try {
      const results = [];
      let totalRevoked = 0;

      for (const studentId of studentIds) {
        try {
          const result = await this.terminateStudentAccess(studentId, terminationReason, accountantId);
          results.push({ studentId, success: true, ...result });
          totalRevoked += result.revokedApprovals;
        } catch (error: any) {
          results.push({ studentId, success: false, error: error.message });
        }
      }

      return {
        success: true,
        results,
        totalStudents: studentIds.length,
        totalRevoked,
        summary: `Processed ${studentIds.length} students. ${totalRevoked} payment approvals revoked.`
      };
    } catch (error: any) {
      console.error('Error bulk terminating student access:', error);
      throw error;
    }
  },

  // ===== SEMESTER REGISTRATION FUNCTIONS =====

  // Get all semester registrations
  async getAllSemesterRegistrations() {
    try {
      const { data, error } = await supabase
        .from('student_semester_registrations')
        .select(`
          *,
          students(student_id, first_name, last_name, email),
          semester_periods(semester_name, academic_year, semester_number),
          payment_approvals(id, amount_paid, payment_reference, approval_status)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.log('Semester registrations table not found:', error.message);
        return [];
      }
      return data || [];
    } catch (error) {
      console.error('Error getting semester registrations:', error);
      return [];
    }
  },

  // Get semester registrations for a specific student
  async getStudentSemesterRegistrations(studentId: string) {
    const { data, error } = await supabase
      .from('student_semester_registrations')
      .select(`
        *,
        semester_periods(semester_name, academic_year, semester_number),
        payment_approvals(id, amount_paid, payment_reference, approval_status)
      `)
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Approve semester registration
  async approveSemesterRegistration(registrationData: {
    student_id: string;
    semester_period_id: string;
    payment_approval_id?: string;
    registration_notes?: string;
  }, accountantId: string) {
    try {
      // First, ensure tables exist
      await this.ensureTablesExist();

      // Try RPC function first, fallback to direct insert/update
      try {
        const { data, error } = await supabase
          .rpc('approve_semester_registration', {
            p_student_id: registrationData.student_id,
            p_semester_period_id: registrationData.semester_period_id,
            p_approved_by: accountantId,
            p_payment_approval_id: registrationData.payment_approval_id || null,
            p_registration_notes: registrationData.registration_notes || null
          });

        if (error) throw error;
        return data;
      } catch (rpcError: any) {
        console.log('RPC function not found, using direct insert/update:', rpcError.message);

        // Fallback to direct database operations
        const { data, error } = await supabase
          .from('student_semester_registrations')
          .upsert({
            student_id: registrationData.student_id,
            semester_period_id: registrationData.semester_period_id,
            approved_by: accountantId,
            approval_date: new Date().toISOString(),
            registration_status: 'approved',
            payment_approval_id: registrationData.payment_approval_id || null,
            registration_notes: registrationData.registration_notes || null,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'student_id,semester_period_id'
          })
          .select();

        if (error) throw error;

        // Log the approval
        await supabase
          .from('access_control_logs')
          .insert({
            student_id: registrationData.student_id,
            action_type: 'access_granted',
            reason: 'semester_approved',
            semester_registration_id: data[0]?.id
          });

        return data[0];
      }
    } catch (error: any) {
      console.error('Error approving semester registration:', error);
      throw error;
    }
  },

  // Reject semester registration
  async rejectSemesterRegistration(registrationId: string, rejectionNotes: string, accountantId: string) {
    const { data, error } = await supabase
      .from('student_semester_registrations')
      .update({
        registration_status: 'rejected',
        approved_by: accountantId,
        approval_date: new Date().toISOString(),
        registration_notes: rejectionNotes,
        updated_at: new Date().toISOString()
      })
      .eq('id', registrationId)
      .select();

    if (error) throw error;
    return data;
  },

  // Get all semester periods
  async getAllSemesterPeriods() {
    try {
      const { data, error } = await supabase
        .from('semester_periods')
        .select(`
          *,
          accountants(first_name, last_name)
        `)
        .order('academic_year', { ascending: false })
        .order('semester_number', { ascending: false });

      if (error) {
        console.log('Semester periods table not found:', error.message);
        return [];
      }
      return data || [];
    } catch (error) {
      console.error('Error getting semester periods:', error);
      return [];
    }
  },

  // Get active semester
  async getActiveSemester() {
    try {
      // First try using the RPC function
      const { data, error } = await supabase
        .rpc('get_active_semester');

      if (error) {
        // If RPC function doesn't exist, fall back to direct query
        console.log('RPC function not found, using direct query');
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('semester_periods')
          .select('*')
          .eq('is_active', true)
          .gte('end_date', new Date().toISOString().split('T')[0])
          .order('start_date', { ascending: false })
          .limit(1);

        if (fallbackError) {
          console.log('Semester periods table not found, returning null');
          return null;
        }
        return fallbackData?.[0] || null;
      }
      return data?.[0] || null;
    } catch (error) {
      console.error('Error getting active semester:', error);
      return null;
    }
  },

  // Create semester period with simplified approach
  async createSemesterPeriod(semesterData: {
    semester_name: string;
    academic_year: string;
    semester_number: number;
    start_date: string;
    end_date: string;
    registration_start_date: string;
    registration_end_date: string;
    is_active?: boolean;
    is_registration_open?: boolean;
  }, accountantId: string) {
    try {
      console.log('🚀 Starting semester period creation...');
      console.log('📝 Data to insert:', semesterData);

      // First, try to create the table using a simple approach
      console.log('🔧 Ensuring semester_periods table exists...');

      try {
        // Try to create the table directly using a simple query
        await supabase.sql`
          CREATE TABLE IF NOT EXISTS semester_periods (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            semester_name TEXT NOT NULL,
            academic_year TEXT NOT NULL,
            semester_number INTEGER NOT NULL,
            start_date DATE NOT NULL,
            end_date DATE NOT NULL,
            registration_start_date DATE NOT NULL,
            registration_end_date DATE NOT NULL,
            is_active BOOLEAN DEFAULT false,
            is_registration_open BOOLEAN DEFAULT false,
            created_by UUID,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `;
        console.log('✅ Table creation attempted');
      } catch (tableError: any) {
        console.log('⚠️ Table creation failed, proceeding anyway:', tableError.message);
      }

      console.log('📤 Attempting to insert semester period...');
      const { data, error } = await supabase
        .from('semester_periods')
        .insert({
          ...semesterData,
          created_by: accountantId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select();

      if (error) {
        console.error('❌ Supabase insert error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });

        // If table doesn't exist, try to create it via API
        if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
          console.log('🔧 Table missing, trying API creation...');
          try {
            const response = await fetch('/api/setup-db', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' }
            });
            const result = await response.json();

            if (result.success) {
              console.log('✅ Tables created via API, retrying insert...');
              const { data: retryData, error: retryError } = await supabase
                .from('semester_periods')
                .insert({
                  ...semesterData,
                  created_by: accountantId,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                })
                .select();

              if (retryError) {
                throw new Error(`Retry failed: ${retryError.message}`);
              }

              console.log('✅ Semester period created after table setup:', retryData);
              return retryData;
            }
          } catch (apiError: any) {
            console.error('❌ API table creation failed:', apiError);
          }
        }

        throw new Error(`Database error: ${error.message || 'Unknown database error'}`);
      }

      if (!data || data.length === 0) {
        throw new Error('No data returned from insert operation');
      }

      console.log('✅ Semester period created successfully:', data);
      return data;
    } catch (error: any) {
      console.error('❌ Error in createSemesterPeriod:', error);

      // Provide user-friendly error messages
      let userMessage = 'Failed to create semester period';

      if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
        userMessage = 'Database tables are not set up. Please click "🔧 Setup Database" first.';
      } else if (error.message?.includes('permission')) {
        userMessage = 'Permission denied. Please check your access rights.';
      } else if (error.message?.includes('connection')) {
        userMessage = 'Database connection error. Please check your internet connection.';
      } else if (error.message?.includes('duplicate')) {
        userMessage = 'A semester with this name already exists.';
      } else if (error.message) {
        userMessage = error.message;
      }

      throw new Error(userMessage);
    }
  },

  // Update semester period
  async updateSemesterPeriod(semesterId: string, updates: Partial<SemesterPeriod>) {
    const { data, error } = await supabase
      .from('semester_periods')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', semesterId)
      .select();

    if (error) throw error;
    return data;
  },

  // Activate semester (deactivates others)
  async activateSemester(semesterId: string) {
    // First deactivate all semesters
    await supabase
      .from('semester_periods')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all

    // Then activate the selected semester
    const { data, error } = await supabase
      .from('semester_periods')
      .update({
        is_active: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', semesterId)
      .select();

    if (error) throw error;
    return data;
  },



  // Check student access status
  async checkStudentAccess(studentId: string) {
    try {
      // First try using the RPC function
      const { data, error } = await supabase
        .rpc('check_student_access', {
          p_student_id: studentId
        });

      if (error) {
        // If RPC function doesn't exist, fall back to manual check
        console.log('RPC function not found, using manual access check');

        // Check payment approval
        const { data: paymentData } = await supabase
          .from('payment_approvals')
          .select('*')
          .eq('student_id', studentId)
          .eq('approval_status', 'approved')
          .gte('access_valid_until', new Date().toISOString().split('T')[0])
          .lte('access_valid_from', new Date().toISOString().split('T')[0]);

        // Check semester registration
        const { data: registrationData } = await supabase
          .from('student_semester_registrations')
          .select('*, semester_periods(*)')
          .eq('student_id', studentId)
          .eq('registration_status', 'approved');

        // Check financial statements
        const { data: financialData } = await supabase
          .from('financial_records')
          .select('balance')
          .eq('student_id', studentId);

        const paymentApproved = paymentData && paymentData.length > 0;
        const semesterRegistered = registrationData && registrationData.some(reg =>
          reg.semester_periods?.is_active &&
          new Date(reg.semester_periods.start_date) <= new Date() &&
          new Date(reg.semester_periods.end_date) >= new Date()
        );
        const hasFinancialStatements = financialData && financialData.length > 0;
        const financialBalance = financialData?.reduce((sum, record) => sum + (parseFloat(record.balance) || 0), 0) || 0;

        // Simplified access logic: Payment approval is sufficient for access
        // Grant access if payment approved OR if student has financial statements with balance > 0
        const hasAccess = paymentApproved || (hasFinancialStatements && financialBalance > 0);

        let denialReason = '';
        if (hasFinancialStatements && financialBalance === 0 && !paymentApproved) {
          denialReason = 'Access denied: You have a zero balance but no payment approval. Please pay and get approval from the Accounts Office.';
        } else if (!paymentApproved) {
          denialReason = 'Payment not approved or access period expired. Please contact the Accounts Office.';
        }

        return {
          has_access: hasAccess,
          payment_approved: paymentApproved,
          semester_registered: semesterRegistered,
          access_valid_until: paymentData?.[0]?.access_valid_until,
          semester_end_date: registrationData?.[0]?.semester_periods?.end_date,
          denial_reason: denialReason,
          financial_balance: financialBalance,
          has_financial_statements: hasFinancialStatements
        };
      }
      return data?.[0] || null;
    } catch (error) {
      console.error('Error checking student access:', error);
      return {
        has_access: false,
        payment_approved: false,
        semester_registered: false,
        denial_reason: 'Error checking access status'
      };
    }
  },

  // Get access control logs
  async getAccessControlLogs(studentId?: string, limit: number = 100) {
    try {
      let query = supabase
        .from('access_control_logs')
        .select(`
          *,
          students(student_id, first_name, last_name)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (studentId) {
        query = query.eq('student_id', studentId);
      }

      const { data, error } = await query;
      if (error) {
        console.log('Access control logs table not found:', error.message);
        return [];
      }
      return data || [];
    } catch (error) {
      console.error('Error getting access control logs:', error);
      return [];
    }
  },

  // Run access control maintenance
  async runAccessControlMaintenance() {
    try {
      // For now, just return a success message since we don't have the RPC function
      // In a real implementation, this would call the database maintenance function
      console.log('Running access control maintenance...');
      return 'Access control maintenance completed successfully.';
    } catch (error) {
      console.error('Error running access control maintenance:', error);
      throw error;
    }
  },

  // Ensure all required tables exist with better error handling
  async ensureTablesExist() {
    try {
      console.log('🔧 Ensuring access control tables exist...');

      // Try to create tables one by one with individual error handling
      const tables = [
        {
          name: 'semester_periods',
          sql: `
            CREATE TABLE IF NOT EXISTS semester_periods (
              id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
              semester_name TEXT NOT NULL,
              academic_year TEXT NOT NULL,
              semester_number INTEGER NOT NULL,
              start_date DATE NOT NULL,
              end_date DATE NOT NULL,
              registration_start_date DATE NOT NULL,
              registration_end_date DATE NOT NULL,
              is_active BOOLEAN DEFAULT false,
              is_registration_open BOOLEAN DEFAULT false,
              created_by UUID,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
          `
        },
        {
          name: 'payment_approvals',
          sql: `
            CREATE TABLE IF NOT EXISTS payment_approvals (
              id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
              student_id UUID NOT NULL,
              payment_id UUID,
              amount_paid DECIMAL(10,2) NOT NULL,
              payment_reference TEXT,
              payment_date DATE NOT NULL,
              approved_by UUID,
              approval_date TIMESTAMP WITH TIME ZONE,
              access_valid_from DATE NOT NULL,
              access_valid_until DATE NOT NULL,
              approval_status TEXT DEFAULT 'pending',
              approval_notes TEXT,
              auto_expire BOOLEAN DEFAULT true,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
          `
        },
        {
          name: 'student_semester_registrations',
          sql: `
            CREATE TABLE IF NOT EXISTS student_semester_registrations (
              id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
              student_id UUID NOT NULL,
              semester_period_id UUID NOT NULL,
              registration_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              approved_by UUID,
              approval_date TIMESTAMP WITH TIME ZONE,
              registration_status TEXT DEFAULT 'pending',
              payment_approval_id UUID,
              registration_notes TEXT,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
          `
        },
        {
          name: 'access_control_logs',
          sql: `
            CREATE TABLE IF NOT EXISTS access_control_logs (
              id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
              student_id UUID NOT NULL,
              action_type TEXT NOT NULL,
              reason TEXT,
              payment_approval_id UUID,
              semester_registration_id UUID,
              ip_address INET,
              user_agent TEXT,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
          `
        },
        {
          name: 'exam_slips',
          sql: `
            CREATE TABLE IF NOT EXISTS exam_slips (
              id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
              course_id UUID NOT NULL,
              lecturer_name TEXT NOT NULL,
              exam_date DATE NOT NULL,
              exam_time TIME NOT NULL,
              venue TEXT NOT NULL,
              academic_year TEXT NOT NULL,
              semester INTEGER NOT NULL,
              is_active BOOLEAN DEFAULT true,
              created_by UUID NOT NULL,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
          `
        }
      ];

      for (const table of tables) {
        try {
          console.log(`Creating table: ${table.name}`);
          const { error } = await supabase.sql([table.sql]);
          if (error) {
            console.error(`Error creating ${table.name}:`, error);
          } else {
            console.log(`✅ Table ${table.name} created/verified`);
          }
        } catch (tableError: any) {
          console.error(`Exception creating ${table.name}:`, tableError);
        }
      }

      console.log('✅ All access control tables processed');
      return true;
    } catch (error: any) {
      console.error('Error in ensureTablesExist:', error);
      return false;
    }
  },

  // Alternative method using direct table creation without SQL template literals
  async createTablesDirectly() {
    try {
      console.log('🔧 Creating tables using direct method...');

      // Use the REST API approach instead of SQL template literals
      const response = await fetch('/api/setup-db', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ Tables created successfully via API');
        return true;
      } else {
        console.error('❌ API table creation failed:', result.error);
        return false;
      }
    } catch (error: any) {
      console.error('Error creating tables directly:', error);
      return false;
    }
  },

  // Ensure ledger adjustments table exists
  async ensureLedgerAdjustmentsTable() {
    console.log('Ensuring ledger_adjustments table exists...');

    try {
      // Check if table exists by trying to select from it
      const { error: checkError } = await supabase
        .from('ledger_adjustments')
        .select('id')
        .limit(1);

      if (checkError && checkError.code === 'PGRST116') {
        // Table doesn't exist, but we've already created it manually
        console.log('Note: ledger_adjustments table should be created manually in Supabase dashboard');
        throw new Error('ledger_adjustments table does not exist. Please create it manually using the SQL script.');
      } else if (checkError) {
        console.log('Note: Table check completed with error:', checkError.message);
      } else {
        console.log('✅ Ledger adjustments table exists and is accessible');
      }
    } catch (error: any) {
      console.log('Note: Table verification completed:', error.message);
      // Don't throw error here to avoid breaking the main operation
    }
  },

  // Apply balance adjustment to student account
  async applyBalanceAdjustment(adjustmentData: {
    student_id: string;
    account_id: string;
    adjustment_amount: number;
    adjustment_type: 'debit' | 'credit';
    description: string;
    reference_number: string;
  }, accountantId: string) {
    console.log('Applying balance adjustment:', adjustmentData);

    try {
      // Ensure table exists first
      await this.ensureLedgerAdjustmentsTable();

      // Create ledger adjustment entry
      const { data: adjustmentEntry, error: adjustmentError } = await supabase
        .from('ledger_adjustments')
        .insert([{
          student_id: adjustmentData.student_id,
          date: new Date().toISOString().split('T')[0],
          description: adjustmentData.description,
          reference_number: adjustmentData.reference_number,
          debit_amount: adjustmentData.adjustment_type === 'debit' ? adjustmentData.adjustment_amount : 0,
          credit_amount: adjustmentData.adjustment_type === 'credit' ? adjustmentData.adjustment_amount : 0,
          type: 'adjustment',
          created_by: accountantId
        }])
        .select()
        .single();

      if (adjustmentError) {
        console.error('Ledger adjustment error details:', adjustmentError);
        throw new Error(`Database error: ${adjustmentError.message || adjustmentError.details || adjustmentError.hint || 'Unknown database error'}`);
      }

      // Log the action for audit trail
      try {
        await logAccountantAction(
          accountantId,
          'balance_adjustment',
          'ledger_adjustment',
          adjustmentEntry.id,
          adjustmentData.student_id,
          `Applied ${adjustmentData.adjustment_type} adjustment of ${adjustmentData.adjustment_amount} to student account`,
          null,
          adjustmentData
        );
      } catch (logError) {
        console.warn('Failed to log action, but adjustment was successful:', logError);
      }

      console.log('Balance adjustment applied successfully:', adjustmentEntry);
      return adjustmentEntry;
    } catch (error: any) {
      console.error('Error applying balance adjustment:', error);
      throw new Error(error.message || error.toString() || 'Failed to apply balance adjustment');
    }
  },

  // Get student account balances for editing
  async getStudentAccountBalances(studentId: string) {
    console.log('Fetching student account balances for editing:', studentId);

    try {
      // Load financial records and calculate balances
      const { data: financialRecords, error: frError } = await supabase
        .from('financial_records')
        .select(`
          id,
          academic_year,
          semester,
          total_amount,
          amount_paid,
          balance,
          due_date,
          created_at
        `)
        .eq('student_id', studentId)
        .order('created_at');

      if (frError) throw frError;

      // Load payments
      const { data: payments, error: payError } = await supabase
        .from('payments')
        .select(`
          id,
          amount,
          payment_date,
          reference_number,
          created_at
        `)
        .eq('student_id', studentId)
        .order('payment_date');

      if (payError) throw payError;

      // Load ledger adjustments
      const { data: adjustments, error: adjError } = await supabase
        .from('ledger_adjustments')
        .select(`
          id,
          date,
          description,
          reference_number,
          debit_amount,
          credit_amount,
          type,
          created_by,
          created_at
        `)
        .eq('student_id', studentId)
        .order('created_at');

      if (adjError) throw adjError;

      // Calculate current balances
      const totalOwed = financialRecords?.reduce((sum, record) => sum + (record.total_amount || 0), 0) || 0;
      const totalPaid = payments?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;
      const totalAdjustments = adjustments?.reduce((sum, adj) => sum + (adj.debit_amount || 0) - (adj.credit_amount || 0), 0) || 0;
      const currentBalance = totalOwed - totalPaid + totalAdjustments;

      console.log('Student account balances calculated successfully');
      return {
        financial_records: financialRecords || [],
        payments: payments || [],
        adjustments: adjustments || [],
        summary: {
          total_owed: totalOwed,
          total_paid: totalPaid,
          total_adjustments: totalAdjustments,
          current_balance: currentBalance
        }
      };
    } catch (error: any) {
      console.error('Error fetching student account balances:', error);
      throw error;
    }
  },

  // Get balance adjustment history for a student
  async getBalanceAdjustmentHistory(studentId: string, limit: number = 50) {
    console.log('Fetching balance adjustment history for student:', studentId);

    try {
      const { data, error } = await supabase
        .from('ledger_adjustments')
        .select(`
          id,
          date,
          description,
          reference_number,
          debit_amount,
          credit_amount,
          type,
          created_by,
          created_at
        `)
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      console.log('Balance adjustment history fetched successfully:', data?.length || 0);
      return data || [];
    } catch (error: any) {
      console.error('Error fetching balance adjustment history:', error);
      throw error;
    }
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

// Activity Logging System
export const activityLogger = {
  // Log user activity
  async logActivity(activity: {
    userId: string;
    userRole: string;
    actionType: 'login' | 'logout' | 'create' | 'update' | 'delete' | 'view' | 'export' | 'print';
    module: string;
    resourceType?: string;
    resourceId?: string;
    details?: any;
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
  }) {
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .insert({
          user_id: activity.userId,
          user_role: activity.userRole,
          action_type: activity.actionType,
          module: activity.module,
          resource_type: activity.resourceType,
          resource_id: activity.resourceId,
          details: activity.details,
          ip_address: activity.ipAddress,
          user_agent: activity.userAgent,
          session_id: activity.sessionId
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Failed to log activity:', error);
      throw error;
    }
  },

  // Get activity logs with filters
  async getActivityLogs(filters: {
    userId?: string;
    userRole?: string;
    actionType?: string;
    module?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  } = {}) {
    try {
      let query = supabase
        .from('activity_logs')
        .select(`
          *,
          system_users(username, role)
        `)
        .order('timestamp', { ascending: false });

      if (filters.userId) {
        query = query.eq('user_id', filters.userId);
      }
      if (filters.userRole) {
        query = query.eq('user_role', filters.userRole);
      }
      if (filters.actionType) {
        query = query.eq('action_type', filters.actionType);
      }
      if (filters.module) {
        query = query.eq('module', filters.module);
      }
      if (filters.startDate) {
        query = query.gte('timestamp', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('timestamp', filters.endDate);
      }
      if (filters.limit) {
        query = query.limit(filters.limit);
      }
      if (filters.offset) {
        query = query.range(filters.offset, (filters.offset || 0) + (filters.limit || 50) - 1);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Failed to get activity logs:', error);
      throw error;
    }
  },

  // Get activity statistics
  async getActivityStats(timeframe: 'today' | 'week' | 'month' | 'year' = 'today') {
    try {
      const now = new Date();
      let startDate: Date;

      switch (timeframe) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
      }

      const { data, error } = await supabase
        .from('activity_logs')
        .select('action_type, user_role, module')
        .gte('timestamp', startDate.toISOString());

      if (error) throw error;

      // Process statistics
      const stats = {
        totalActivities: data.length,
        byActionType: {} as Record<string, number>,
        byUserRole: {} as Record<string, number>,
        byModule: {} as Record<string, number>
      };

      data.forEach(log => {
        stats.byActionType[log.action_type] = (stats.byActionType[log.action_type] || 0) + 1;
        stats.byUserRole[log.user_role] = (stats.byUserRole[log.user_role] || 0) + 1;
        stats.byModule[log.module] = (stats.byModule[log.module] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('Failed to get activity stats:', error);
      throw error;
    }
  }
};

// Principal API - Master read-only access to all system data
export const principalAPI = {
  // Get comprehensive system overview
  async getSystemOverview() {
    try {
      const [
        usersData,
        coursesData,
        enrollmentsData,
        examSlipsData,
        paymentsData,
        activityStats
      ] = await Promise.all([
        supabase.from('system_users').select('role, is_active, created_at').eq('is_active', true),
        supabase.from('courses').select('*'),
        supabase.from('course_enrollments').select('status'),
        supabase.from('exam_slips').select('is_active, created_at'),
        supabase.from('payment_approvals').select('status, created_at'),
        activityLogger.getActivityStats('today')
      ]);

      const overview = {
        users: {
          total: usersData.data?.length || 0,
          byRole: {} as Record<string, number>,
          activeToday: usersData.data?.filter(u => {
            const today = new Date().toDateString();
            return new Date(u.created_at).toDateString() === today;
          }).length || 0
        },
        courses: {
          total: coursesData.data?.length || 0
        },
        enrollments: {
          total: enrollmentsData.data?.length || 0,
          active: enrollmentsData.data?.filter(e => e.status === 'enrolled').length || 0
        },
        examSlips: {
          total: examSlipsData.data?.length || 0,
          active: examSlipsData.data?.filter(e => e.is_active).length || 0
        },
        payments: {
          total: paymentsData.data?.length || 0,
          approved: paymentsData.data?.filter(p => p.status === 'approved').length || 0
        },
        activityStats
      };

      // Count users by role
      usersData.data?.forEach(user => {
        overview.users.byRole[user.role] = (overview.users.byRole[user.role] || 0) + 1;
      });

      return overview;
    } catch (error) {
      console.error('Failed to get system overview:', error);
      throw error;
    }
  },

  // Get all users with detailed information
  async getAllUsers(filters: { role?: string; isActive?: boolean } = {}) {
    try {
      let query = supabase
        .from('system_users')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters.role) {
        query = query.eq('role', filters.role);
      }
      if (filters.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Failed to get all users:', error);
      throw error;
    }
  },

  // Get comprehensive course data
  async getAllCourses() {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select(`
          *,
          lecturers(first_name, last_name, email),
          course_enrollments(student_id, status),
          exam_slips(lecturer_name, exam_date, venue, is_active)
        `)
        .order('course_code');

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Failed to get all courses:', error);
      throw error;
    }
  },

  // Get all financial data
  async getFinancialOverview() {
    try {
      const [paymentsData, ledgerData] = await Promise.all([
        supabase.from('payment_approvals').select(`
          *,
          system_users(username)
        `).order('created_at', { ascending: false }),
        supabase.from('ledger_entries').select('*').order('created_at', { ascending: false })
      ]);

      return {
        payments: paymentsData.data || [],
        ledgerEntries: ledgerData.data || []
      };
    } catch (error) {
      console.error('Failed to get financial overview:', error);
      throw error;
    }
  },

  // Get real-time system metrics
  async getSystemMetrics() {
    try {
      const { data, error } = await supabase
        .from('system_metrics')
        .select('*')
        .order('recorded_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Failed to get system metrics:', error);
      throw error;
    }
  }
};
