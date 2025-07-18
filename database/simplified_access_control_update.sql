-- Simplified Access Control Update
-- This script updates the access control system to make payment approval sufficient for login
-- Run this in your Supabase SQL Editor to apply the changes

-- Update the check_student_access function to use simplified logic
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

    -- Check semester registration (optional - for record keeping only)
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

-- Update the authenticate_user function to use simplified access control
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
    
    -- For students, check access control using simplified logic
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
    
    -- Check student access using the simplified function
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

-- Add a comment to track this update
COMMENT ON FUNCTION check_student_access(UUID) IS 'Simplified access control - payment approval is sufficient for login access. Updated for simplified workflow.';
COMMENT ON FUNCTION authenticate_user(TEXT, TEXT) IS 'User authentication with simplified student access control - payment approval only required.';

-- Success message
SELECT 'Simplified access control functions updated successfully! Students can now login with payment approval only.' as result;
