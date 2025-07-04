-- Staff Management System Database Schema
-- This file contains the SQL commands to create the necessary tables for staff management

-- Create staff table
CREATE TABLE IF NOT EXISTS staff (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    staff_id VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    department VARCHAR(100) NOT NULL,
    job_title VARCHAR(100) NOT NULL,
    academic_qualifications TEXT,
    specialization VARCHAR(200),
    profile_photo_path VARCHAR(500),
    profile_photo_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create staff audit logs table
CREATE TABLE IF NOT EXISTS staff_audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    action VARCHAR(20) NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'activated', 'deactivated')),
    changes JSONB,
    performed_by UUID NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT
);

-- Create application_files table for file uploads
CREATE TABLE IF NOT EXISTS application_files (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    file_type VARCHAR(20) NOT NULL CHECK (file_type IN ('nrc_photo', 'grade12_results', 'payment_receipt')),
    file_path VARCHAR(500) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size INTEGER NOT NULL,
    file_url VARCHAR(500),
    authenticity_score INTEGER NOT NULL CHECK (authenticity_score >= 0 AND authenticity_score <= 100),
    authenticity_flags TEXT[] DEFAULT '{}',
    requires_review BOOLEAN DEFAULT false,
    reviewed_by UUID,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_staff_department ON staff(department);
CREATE INDEX IF NOT EXISTS idx_staff_job_title ON staff(job_title);
CREATE INDEX IF NOT EXISTS idx_staff_is_active ON staff(is_active);
CREATE INDEX IF NOT EXISTS idx_staff_created_at ON staff(created_at);
CREATE INDEX IF NOT EXISTS idx_staff_email ON staff(email);
CREATE INDEX IF NOT EXISTS idx_staff_staff_id ON staff(staff_id);

CREATE INDEX IF NOT EXISTS idx_staff_audit_logs_staff_id ON staff_audit_logs(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_audit_logs_action ON staff_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_staff_audit_logs_timestamp ON staff_audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_staff_audit_logs_performed_by ON staff_audit_logs(performed_by);

CREATE INDEX IF NOT EXISTS idx_application_files_application_id ON application_files(application_id);
CREATE INDEX IF NOT EXISTS idx_application_files_file_type ON application_files(file_type);
CREATE INDEX IF NOT EXISTS idx_application_files_requires_review ON application_files(requires_review);
CREATE INDEX IF NOT EXISTS idx_application_files_created_at ON application_files(created_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_staff_updated_at 
    BEFORE UPDATE ON staff 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_application_files_updated_at 
    BEFORE UPDATE ON application_files 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS) for staff table
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_files ENABLE ROW LEVEL SECURITY;

-- RLS Policies for staff table
-- Admin users can see all staff
CREATE POLICY "Admin can view all staff" ON staff
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Admin users can insert staff
CREATE POLICY "Admin can insert staff" ON staff
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Admin users can update staff
CREATE POLICY "Admin can update staff" ON staff
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Admin users can delete staff
CREATE POLICY "Admin can delete staff" ON staff
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Public can view active staff (for staff directory)
CREATE POLICY "Public can view active staff" ON staff
    FOR SELECT USING (is_active = true);

-- RLS Policies for staff_audit_logs table
-- Admin users can view all audit logs
CREATE POLICY "Admin can view all audit logs" ON staff_audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Admin users can insert audit logs
CREATE POLICY "Admin can insert audit logs" ON staff_audit_logs
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- RLS Policies for application_files table
-- Admin users can view all application files
CREATE POLICY "Admin can view all application files" ON application_files
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Users can view their own application files
CREATE POLICY "Users can view own application files" ON application_files
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM applications 
            WHERE applications.id = application_files.application_id 
            AND applications.email = auth.jwt()->>'email'
        )
    );

-- System can insert application files
CREATE POLICY "System can insert application files" ON application_files
    FOR INSERT WITH CHECK (true);

-- Admin users can update application files
CREATE POLICY "Admin can update application files" ON application_files
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Create storage buckets for file uploads (if not exists)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('applications', 'applications', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('staff-photos', 'staff-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for applications bucket
CREATE POLICY "Admin can upload to applications bucket" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'applications' AND
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

CREATE POLICY "System can upload to applications bucket" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'applications');

CREATE POLICY "Admin can view applications bucket" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'applications' AND
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Storage policies for staff-photos bucket
CREATE POLICY "Admin can upload to staff-photos bucket" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'staff-photos' AND
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

CREATE POLICY "Public can view staff photos" ON storage.objects
    FOR SELECT USING (bucket_id = 'staff-photos');

CREATE POLICY "Admin can update staff photos" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'staff-photos' AND
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

CREATE POLICY "Admin can delete staff photos" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'staff-photos' AND
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Insert sample departments and job titles for reference
-- This can be used to populate dropdowns in the admin interface
CREATE TABLE IF NOT EXISTS staff_departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS staff_job_titles (
    id SERIAL PRIMARY KEY,
    title VARCHAR(100) UNIQUE NOT NULL,
    department_id INTEGER REFERENCES staff_departments(id),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert sample data
INSERT INTO staff_departments (name, description) VALUES
    ('Nursing', 'Nursing education and clinical instruction'),
    ('Administration', 'Administrative and support staff'),
    ('Academic', 'Academic affairs and curriculum development'),
    ('Clinical', 'Clinical supervision and practice coordination'),
    ('Support', 'Technical and maintenance support'),
    ('Management', 'Leadership and management positions')
ON CONFLICT (name) DO NOTHING;

INSERT INTO staff_job_titles (title, description) VALUES
    ('Principal', 'Head of the institution'),
    ('Vice Principal', 'Assistant to the principal'),
    ('Senior Lecturer', 'Senior teaching position'),
    ('Lecturer', 'Teaching position'),
    ('Clinical Instructor', 'Clinical teaching and supervision'),
    ('Registrar', 'Student records and registration'),
    ('Librarian', 'Library management'),
    ('IT Support', 'Information technology support'),
    ('Administrative Assistant', 'Administrative support'),
    ('Accountant', 'Financial management'),
    ('Security Officer', 'Campus security'),
    ('Maintenance Staff', 'Facility maintenance')
ON CONFLICT (title) DO NOTHING;
