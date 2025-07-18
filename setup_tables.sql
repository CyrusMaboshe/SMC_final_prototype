-- Quick Setup Script for Access Control Tables
-- Copy and paste this into your Supabase SQL Editor

-- Create semester_periods table
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

-- Create payment_approvals table
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

-- Create student_semester_registrations table
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

-- Create access_control_logs table
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

-- Create site_settings table
CREATE TABLE IF NOT EXISTS site_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    setting_key TEXT UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    setting_type TEXT DEFAULT 'text' CHECK (setting_type IN ('text', 'number', 'boolean', 'json')),
    description TEXT,
    category TEXT DEFAULT 'general' CHECK (category IN ('footer', 'header', 'general', 'contact', 'homepage')),
    is_editable BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default site settings
INSERT INTO site_settings (setting_key, setting_value, setting_type, description, category, is_editable) VALUES
-- Homepage settings
('welcome_message', 'Welcome to Sancta Maria College of Nursing and Midwifery', 'text', 'Main welcome message on homepage', 'homepage', true),
('hero_subtitle', 'Shaping the future of healthcare through excellence in nursing education, compassionate care, and innovative learning experiences.', 'text', 'Subtitle text on homepage hero section', 'homepage', true),

-- Footer settings
('college_name', 'Sancta Maria College', 'text', 'College name in footer', 'footer', true),
('college_subtitle', 'of Nursing and Midwifery', 'text', 'College subtitle in footer', 'footer', true),
('college_description', 'Excellence in nursing education, compassionate care, and professional development for future healthcare leaders.', 'text', 'College description in footer', 'footer', true),
('contact_address_line1', '123 Healthcare Avenue', 'text', 'First line of contact address', 'footer', true),
('contact_address_line2', 'Medical District, City', 'text', 'Second line of contact address', 'footer', true),
('contact_phone', '+1 (555) 123-4567', 'text', 'Contact phone number', 'footer', true),
('contact_email', 'info@sanctamaria.edu', 'text', 'Contact email address', 'footer', true),
('copyright_text', '© 2024 Sancta Maria College of Nursing and Midwifery. All rights reserved.', 'text', 'Copyright text in footer', 'footer', true),

-- Contact settings
('main_phone', '+1 (555) 123-4567', 'text', 'Main contact phone', 'contact', true),
('main_email', 'info@sanctamaria.edu', 'text', 'Main contact email', 'contact', true),
('admissions_email', 'admissions@sanctamaria.edu', 'text', 'Admissions contact email', 'contact', true),
('support_email', 'support@sanctamaria.edu', 'text', 'Support contact email', 'contact', true)

ON CONFLICT (setting_key) DO NOTHING;

-- Insert a test semester period
INSERT INTO semester_periods (
    semester_name,
    academic_year,
    semester_number,
    start_date,
    end_date,
    registration_start_date,
    registration_end_date,
    is_active,
    is_registration_open
) VALUES (
    'Fall Semester 2024',
    '2024-2025',
    1,
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '90 days',
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '30 days',
    true,
    true
) ON CONFLICT DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payment_approvals_student_id ON payment_approvals(student_id);
CREATE INDEX IF NOT EXISTS idx_payment_approvals_status ON payment_approvals(approval_status);
CREATE INDEX IF NOT EXISTS idx_semester_periods_active ON semester_periods(is_active);
CREATE INDEX IF NOT EXISTS idx_student_registrations_student_id ON student_semester_registrations(student_id);

-- Success message
SELECT 'Access control tables created successfully!' as result;
