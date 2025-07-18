-- Access Control System Database Schema
-- This file contains tables and functions for payment-based access and semester registration control

-- Drop existing tables if they exist
DROP TABLE IF EXISTS student_semester_registrations CASCADE;
DROP TABLE IF EXISTS payment_approvals CASCADE;
DROP TABLE IF EXISTS semester_periods CASCADE;
DROP TABLE IF EXISTS access_control_logs CASCADE;

-- Create semester_periods table to manage active semesters
CREATE TABLE semester_periods (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    semester_name VARCHAR(100) NOT NULL,
    academic_year VARCHAR(20) NOT NULL,
    semester_number INTEGER NOT NULL CHECK (semester_number IN (1, 2)),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    registration_start_date DATE NOT NULL,
    registration_end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT false,
    is_registration_open BOOLEAN DEFAULT false,
    created_by UUID REFERENCES accountants(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT check_dates CHECK (end_date > start_date AND registration_end_date >= registration_start_date),
    CONSTRAINT unique_active_semester EXCLUDE (is_active WITH =) WHERE (is_active = true)
);

-- Create payment_approvals table to manage payment approvals with access periods
CREATE TABLE payment_approvals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
    amount_paid DECIMAL(10,2) NOT NULL CHECK (amount_paid > 0),
    payment_reference VARCHAR(100),
    payment_date DATE NOT NULL,
    approved_by UUID REFERENCES accountants(id),
    approval_date TIMESTAMP WITH TIME ZONE,
    access_valid_from DATE NOT NULL,
    access_valid_until DATE NOT NULL,
    approval_status VARCHAR(20) DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'expired', 'revoked')),
    approval_notes TEXT,
    auto_expire BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT check_access_dates CHECK (access_valid_until > access_valid_from),
    CONSTRAINT check_approval_date CHECK (approval_date IS NULL OR approval_date >= created_at)
);

-- Create student_semester_registrations table to manage semester registrations
CREATE TABLE student_semester_registrations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    semester_period_id UUID NOT NULL REFERENCES semester_periods(id) ON DELETE CASCADE,
    registration_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_by UUID REFERENCES accountants(id),
    approval_date TIMESTAMP WITH TIME ZONE,
    registration_status VARCHAR(20) DEFAULT 'pending' CHECK (registration_status IN ('pending', 'approved', 'rejected', 'cancelled')),
    payment_approval_id UUID REFERENCES payment_approvals(id),
    registration_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, semester_period_id)
);

-- Create access_control_logs table for audit trail
CREATE TABLE access_control_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL, -- 'login_attempt', 'access_granted', 'access_denied', 'auto_expire', 'manual_revoke'
    reason VARCHAR(100), -- 'payment_not_approved', 'semester_not_registered', 'access_expired', 'semester_ended'
    payment_approval_id UUID REFERENCES payment_approvals(id),
    semester_registration_id UUID REFERENCES student_semester_registrations(id),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_payment_approvals_student_id ON payment_approvals(student_id);
CREATE INDEX idx_payment_approvals_status ON payment_approvals(approval_status);
CREATE INDEX idx_payment_approvals_dates ON payment_approvals(access_valid_from, access_valid_until);
CREATE INDEX idx_semester_periods_active ON semester_periods(is_active) WHERE is_active = true;
CREATE INDEX idx_semester_periods_dates ON semester_periods(start_date, end_date);
CREATE INDEX idx_student_registrations_student_id ON student_semester_registrations(student_id);
CREATE INDEX idx_student_registrations_semester ON student_semester_registrations(semester_period_id);
CREATE INDEX idx_student_registrations_status ON student_semester_registrations(registration_status);
CREATE INDEX idx_access_logs_student_id ON access_control_logs(student_id);
CREATE INDEX idx_access_logs_created_at ON access_control_logs(created_at);

-- Function to automatically expire payment approvals
CREATE OR REPLACE FUNCTION auto_expire_payment_approvals()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    expired_count INTEGER := 0;
BEGIN
    -- Update expired payment approvals
    UPDATE payment_approvals 
    SET 
        approval_status = 'expired',
        updated_at = NOW()
    WHERE 
        approval_status = 'approved' 
        AND access_valid_until < CURRENT_DATE
        AND auto_expire = true;
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    
    -- Log the expiration events
    INSERT INTO access_control_logs (student_id, action_type, reason, payment_approval_id)
    SELECT 
        student_id, 
        'auto_expire', 
        'access_period_ended',
        id
    FROM payment_approvals 
    WHERE approval_status = 'expired' AND updated_at >= NOW() - INTERVAL '1 minute';
    
    RETURN expired_count;
END;
$$;

-- Function to check if a student has valid access (simplified - payment approval only)
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
        COALESCE(SUM(fr.balance), 0.00)
    INTO v_has_financial_statements, v_total_balance
    FROM financial_records fr
    WHERE fr.student_id = p_student_id;

    v_financial_balance := v_total_balance;

    -- Check payment approval status (this is now the primary access control)
    SELECT
        CASE WHEN COUNT(*) > 0 THEN true ELSE false END,
        MAX(pa.access_valid_until)
    INTO v_payment_approved, v_access_valid_until
    FROM payment_approvals pa
    WHERE pa.student_id = p_student_id
        AND pa.approval_status = 'approved'
        AND pa.access_valid_from <= CURRENT_DATE
        AND pa.access_valid_until >= CURRENT_DATE;
    
    -- Check semester registration status
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
    
    -- Simplified denial reason logic - payment approval is sufficient
    IF v_has_financial_statements AND v_financial_balance = 0.00 AND NOT v_payment_approved THEN
        v_denial_reason := 'Access denied: You have a zero balance but no payment approval. Please pay and get approval from the Accounts Office.';
    ELSIF NOT v_payment_approved THEN
        v_denial_reason := 'Payment not approved or access period expired. Please contact the Accounts Office.';
    END IF;

    -- Simplified access logic: Payment approval is sufficient for access
    -- Access is granted if:
    -- 1. Payment is approved (primary requirement)
    -- 2. OR if student has financial statements with balance > 0 (they can view their statements)
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

-- Enhanced authenticate_user function with access control
CREATE OR REPLACE FUNCTION authenticate_user(p_username TEXT, p_password TEXT)
RETURNS TABLE (
    id UUID,
    username TEXT,
    role TEXT,
    is_active BOOLEAN,
    last_login TIMESTAMP WITH TIME ZONE,
    access_denied BOOLEAN,
    denial_reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_user_role TEXT;
    v_is_active BOOLEAN;
    v_last_login TIMESTAMP WITH TIME ZONE;
    v_student_id UUID;
    v_access_status RECORD;
BEGIN
    -- First, authenticate the user credentials
    SELECT su.id, su.role, su.is_active, su.last_login
    INTO v_user_id, v_user_role, v_is_active, v_last_login
    FROM system_users su
    WHERE su.username = p_username
    AND su.password_hash = crypt(p_password, su.password_hash)
    AND su.is_active = true;

    -- If no user found or inactive, return empty
    IF v_user_id IS NULL OR NOT v_is_active THEN
        RETURN;
    END IF;

    -- For non-student users, return without access control checks
    IF v_user_role != 'student' THEN
        RETURN QUERY SELECT
            v_user_id,
            p_username,
            v_user_role,
            v_is_active,
            v_last_login,
            false::BOOLEAN,
            NULL::TEXT;
        RETURN;
    END IF;

    -- For students, check access control
    SELECT s.id INTO v_student_id
    FROM students s
    WHERE s.user_id = v_user_id;

    -- If student record not found, deny access
    IF v_student_id IS NULL THEN
        RETURN QUERY SELECT
            v_user_id,
            p_username,
            v_user_role,
            v_is_active,
            v_last_login,
            true::BOOLEAN,
            'Student record not found'::TEXT;
        RETURN;
    END IF;

    -- Check student access using the enhanced function
    SELECT * INTO v_access_status
    FROM check_student_access(v_student_id);

    -- Return user data with access control information
    RETURN QUERY SELECT
        v_user_id,
        p_username,
        v_user_role,
        v_is_active,
        v_last_login,
        NOT v_access_status.has_access,
        v_access_status.denial_reason;
END;
$$;

-- Function to get active semester
CREATE OR REPLACE FUNCTION get_active_semester()
RETURNS TABLE (
    id UUID,
    semester_name VARCHAR,
    academic_year VARCHAR,
    semester_number INTEGER,
    start_date DATE,
    end_date DATE,
    is_registration_open BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sp.id,
        sp.semester_name,
        sp.academic_year,
        sp.semester_number,
        sp.start_date,
        sp.end_date,
        sp.is_registration_open
    FROM semester_periods sp
    WHERE sp.is_active = true
        AND sp.start_date <= CURRENT_DATE
        AND sp.end_date >= CURRENT_DATE
    ORDER BY sp.start_date DESC
    LIMIT 1;
END;
$$;

-- Function to approve payment with access period
CREATE OR REPLACE FUNCTION approve_payment_access(
    p_student_id UUID,
    p_payment_id UUID,
    p_amount_paid DECIMAL,
    p_payment_reference VARCHAR,
    p_payment_date DATE,
    p_access_valid_from DATE,
    p_access_valid_until DATE,
    p_approved_by UUID,
    p_approval_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_approval_id UUID;
BEGIN
    -- Insert or update payment approval
    INSERT INTO payment_approvals (
        student_id,
        payment_id,
        amount_paid,
        payment_reference,
        payment_date,
        access_valid_from,
        access_valid_until,
        approved_by,
        approval_date,
        approval_status,
        approval_notes
    ) VALUES (
        p_student_id,
        p_payment_id,
        p_amount_paid,
        p_payment_reference,
        p_payment_date,
        p_access_valid_from,
        p_access_valid_until,
        p_approved_by,
        NOW(),
        'approved',
        p_approval_notes
    )
    RETURNING id INTO v_approval_id;
    
    -- Log the approval
    INSERT INTO access_control_logs (student_id, action_type, reason, payment_approval_id)
    VALUES (p_student_id, 'access_granted', 'payment_approved', v_approval_id);
    
    RETURN v_approval_id;
END;
$$;

-- Function to approve semester registration
CREATE OR REPLACE FUNCTION approve_semester_registration(
    p_student_id UUID,
    p_semester_period_id UUID,
    p_approved_by UUID,
    p_payment_approval_id UUID DEFAULT NULL,
    p_registration_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_registration_id UUID;
BEGIN
    -- Insert or update semester registration
    INSERT INTO student_semester_registrations (
        student_id,
        semester_period_id,
        approved_by,
        approval_date,
        registration_status,
        payment_approval_id,
        registration_notes
    ) VALUES (
        p_student_id,
        p_semester_period_id,
        p_approved_by,
        NOW(),
        'approved',
        p_payment_approval_id,
        p_registration_notes
    )
    ON CONFLICT (student_id, semester_period_id)
    DO UPDATE SET
        approved_by = p_approved_by,
        approval_date = NOW(),
        registration_status = 'approved',
        payment_approval_id = p_payment_approval_id,
        registration_notes = p_registration_notes,
        updated_at = NOW()
    RETURNING id INTO v_registration_id;
    
    -- Log the approval
    INSERT INTO access_control_logs (student_id, action_type, reason, semester_registration_id)
    VALUES (p_student_id, 'access_granted', 'semester_approved', v_registration_id);
    
    RETURN v_registration_id;
END;
$$;

-- Function to verify student payment approval for registration
CREATE OR REPLACE FUNCTION verify_student_payment_approval(p_student_id UUID)
RETURNS TABLE (
    has_valid_payment BOOLEAN,
    payment_status VARCHAR(20),
    denial_reason TEXT,
    access_valid_until DATE,
    amount_paid DECIMAL(10,2),
    payment_reference VARCHAR(100),
    approval_date TIMESTAMP WITH TIME ZONE,
    approved_by_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_payment_record RECORD;
    v_accountant_name TEXT;
BEGIN
    -- Check for valid payment approval
    SELECT
        pa.approval_status,
        pa.access_valid_until,
        pa.amount_paid,
        pa.payment_reference,
        pa.approval_date,
        pa.approved_by
    INTO v_payment_record
    FROM payment_approvals pa
    WHERE pa.student_id = p_student_id
        AND pa.approval_status = 'approved'
        AND pa.access_valid_until >= CURRENT_DATE
        AND pa.access_valid_from <= CURRENT_DATE
    ORDER BY pa.approval_date DESC
    LIMIT 1;

    -- Get accountant name if payment exists
    IF v_payment_record.approved_by IS NOT NULL THEN
        SELECT CONCAT(a.first_name, ' ', a.last_name)
        INTO v_accountant_name
        FROM accountants a
        WHERE a.id = v_payment_record.approved_by;
    END IF;

    -- Return verification result
    IF v_payment_record IS NOT NULL THEN
        RETURN QUERY SELECT
            true,
            v_payment_record.approval_status,
            'Payment verification successful'::TEXT,
            v_payment_record.access_valid_until,
            v_payment_record.amount_paid,
            v_payment_record.payment_reference,
            v_payment_record.approval_date,
            COALESCE(v_accountant_name, 'Unknown')::TEXT;
    ELSE
        -- Check if student has any payment approvals at all
        SELECT COUNT(*) > 0
        INTO v_payment_record
        FROM payment_approvals pa
        WHERE pa.student_id = p_student_id;

        IF v_payment_record THEN
            -- Has payments but none are valid
            RETURN QUERY SELECT
                false,
                'expired'::VARCHAR(20),
                'No valid payment approval found. Payment may be expired, rejected, or access period ended.'::TEXT,
                NULL::DATE,
                NULL::DECIMAL(10,2),
                NULL::VARCHAR(100),
                NULL::TIMESTAMP WITH TIME ZONE,
                NULL::TEXT;
        ELSE
            -- No payments at all
            RETURN QUERY SELECT
                false,
                'none'::VARCHAR(20),
                'No payment approval found. Student must make payment and get approval from Accounts Office.'::TEXT,
                NULL::DATE,
                NULL::DECIMAL(10,2),
                NULL::VARCHAR(100),
                NULL::TIMESTAMP WITH TIME ZONE,
                NULL::TEXT;
        END IF;
    END IF;
END;
$$;

-- Function to verify and register student with payment approval check
CREATE OR REPLACE FUNCTION register_student_with_payment_verification(
    p_student_id UUID,
    p_semester_period_id UUID,
    p_registered_by UUID,
    p_registration_notes TEXT DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    registration_id UUID,
    message TEXT,
    payment_verification JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_payment_verification RECORD;
    v_registration_id UUID;
    v_existing_registration UUID;
BEGIN
    -- First, verify payment approval through database
    SELECT * INTO v_payment_verification
    FROM verify_student_payment_approval(p_student_id)
    LIMIT 1;

    -- Check if payment verification failed
    IF NOT v_payment_verification.has_valid_payment THEN
        RETURN QUERY SELECT
            false,
            NULL::UUID,
            CONCAT('Registration denied: ', v_payment_verification.denial_reason),
            jsonb_build_object(
                'has_valid_payment', false,
                'payment_status', v_payment_verification.payment_status,
                'denial_reason', v_payment_verification.denial_reason
            );
        RETURN;
    END IF;

    -- Check if student is already registered for this semester
    SELECT id INTO v_existing_registration
    FROM student_semester_registrations
    WHERE student_id = p_student_id
        AND semester_period_id = p_semester_period_id;

    IF v_existing_registration IS NOT NULL THEN
        RETURN QUERY SELECT
            false,
            v_existing_registration,
            'Student is already registered for this semester',
            jsonb_build_object(
                'has_valid_payment', true,
                'payment_status', v_payment_verification.payment_status,
                'message', 'Already registered'
            );
        RETURN;
    END IF;

    -- Payment verification passed, proceed with registration
    INSERT INTO student_semester_registrations (
        student_id,
        semester_period_id,
        registration_status,
        approved_by,
        approval_date,
        registration_notes
    ) VALUES (
        p_student_id,
        p_semester_period_id,
        'pending',
        p_registered_by,
        NOW(),
        p_registration_notes
    )
    RETURNING id INTO v_registration_id;

    -- Log the registration attempt
    INSERT INTO access_control_logs (
        student_id,
        action_type,
        reason,
        semester_registration_id
    ) VALUES (
        p_student_id,
        'registration_requested',
        'payment_verified_registration_pending',
        v_registration_id
    );

    RETURN QUERY SELECT
        true,
        v_registration_id,
        'Student registered successfully. Payment verification passed.',
        jsonb_build_object(
            'has_valid_payment', true,
            'payment_status', v_payment_verification.payment_status,
            'access_valid_until', v_payment_verification.access_valid_until,
            'amount_paid', v_payment_verification.amount_paid,
            'payment_reference', v_payment_verification.payment_reference,
            'approved_by_name', v_payment_verification.approved_by_name
        );
END;
$$;

-- Trigger to automatically update payment approval status
CREATE OR REPLACE FUNCTION update_payment_approval_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Auto-expire if past valid date
    IF NEW.access_valid_until < CURRENT_DATE AND NEW.approval_status = 'approved' THEN
        NEW.approval_status := 'expired';
        NEW.updated_at := NOW();
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_payment_approval_status
    BEFORE UPDATE ON payment_approvals
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_approval_status();

-- Create a scheduled job to run auto-expiration (this would typically be set up as a cron job)
-- For now, we'll create a function that can be called periodically
CREATE OR REPLACE FUNCTION run_access_control_maintenance()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    expired_payments INTEGER;
    result_text TEXT;
BEGIN
    -- Run auto-expiration
    SELECT auto_expire_payment_approvals() INTO expired_payments;
    
    result_text := format('Access control maintenance completed. Expired %s payment approvals.', expired_payments);
    
    RETURN result_text;
END;
$$;
