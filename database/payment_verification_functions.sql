-- Payment Verification Functions for Student Registration
-- This script creates database functions to ensure payment approval verification before student registration
-- Run this in your Supabase SQL Editor to deploy the payment verification system

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

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION verify_student_payment_approval(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION register_student_with_payment_verification(UUID, UUID, UUID, TEXT) TO authenticated;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payment_approvals_student_status_dates 
ON payment_approvals(student_id, approval_status, access_valid_from, access_valid_until);

CREATE INDEX IF NOT EXISTS idx_student_registrations_student_semester 
ON student_semester_registrations(student_id, semester_period_id);

-- Add comments for documentation
COMMENT ON FUNCTION verify_student_payment_approval(UUID) IS 
'Verifies if a student has valid payment approval for system access and registration';

COMMENT ON FUNCTION register_student_with_payment_verification(UUID, UUID, UUID, TEXT) IS 
'Registers a student for a semester with mandatory payment approval verification';
