import { supabase } from '@/lib/supabase';

export async function setupAccessControlTables() {
  try {
    console.log('Setting up access control tables with simplified access logic...');

    // Create semester_periods table
    const { error: semesterError } = await supabase.rpc('exec_sql', {
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
    });

    if (semesterError) {
      console.log('Semester periods table setup:', semesterError.message);
    }

    // Create payment_approvals table
    const { error: paymentError } = await supabase.rpc('exec_sql', {
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
          approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'expired', 'revoked')),
          approval_notes TEXT,
          auto_expire BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });

    if (paymentError) {
      console.log('Payment approvals table setup:', paymentError.message);
    }

    // Create student_semester_registrations table
    const { error: registrationError } = await supabase.rpc('exec_sql', {
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
    });

    if (registrationError) {
      console.log('Student registrations table setup:', registrationError.message);
    }

    // Create access_control_logs table
    const { error: logsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS access_control_logs (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          student_id UUID NOT NULL,
          action_type TEXT NOT NULL,
          reason TEXT,
          payment_approval_id UUID,
          semester_registration_id UUID,
          performed_by UUID,
          notes TEXT,
          ip_address INET,
          user_agent TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });

    if (logsError) {
      console.log('Access control logs table setup:', logsError.message);
    }

    // Insert a default active semester if none exists
    const { error: insertError } = await supabase.rpc('exec_sql', {
      sql: `
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
        ) 
        SELECT 
          'Fall Semester 2024',
          '2024-2025',
          1,
          CURRENT_DATE,
          CURRENT_DATE + INTERVAL '90 days',
          CURRENT_DATE,
          CURRENT_DATE + INTERVAL '30 days',
          true,
          true
        WHERE NOT EXISTS (
          SELECT 1 FROM semester_periods WHERE is_active = true
        );
      `
    });

    if (insertError) {
      console.log('Default semester insert:', insertError.message);
    }

    // Create indexes for better performance
    const { error: indexError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE INDEX IF NOT EXISTS idx_payment_approvals_student_id ON payment_approvals(student_id);
        CREATE INDEX IF NOT EXISTS idx_payment_approvals_status ON payment_approvals(approval_status);
        CREATE INDEX IF NOT EXISTS idx_semester_periods_active ON semester_periods(is_active);
        CREATE INDEX IF NOT EXISTS idx_student_registrations_student_id ON student_semester_registrations(student_id);
      `
    });

    if (indexError) {
      console.log('Indexes setup:', indexError.message);
    }

    // Update access control functions to use simplified logic
    const { error: functionsError } = await supabase.rpc('exec_sql', {
      sql: `
        -- Simplified access control function - payment approval is sufficient
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
      `
    });

    if (functionsError) {
      console.log('Access control functions setup:', functionsError.message);
    }

    console.log('Access control tables and simplified functions setup completed');
    return { success: true };

  } catch (error: any) {
    console.error('Error setting up access control tables:', error);
    return { success: false, error: error.message };
  }
}

// Alternative setup using direct table creation (if RPC is not available)
export async function setupAccessControlTablesAlternative() {
  try {
    console.log('Setting up access control tables (alternative method)...');

    // Check if tables exist by trying to query them
    const { error: checkError } = await supabase
      .from('payment_approvals')
      .select('id')
      .limit(1);

    if (checkError && checkError.message.includes('relation')) {
      console.log('Access control tables do not exist. Please set them up manually in Supabase.');
      return { 
        success: false, 
        error: 'Access control tables not found. Please run the SQL setup script in your Supabase dashboard.',
        setupRequired: true
      };
    }

    return { success: true };

  } catch (error: any) {
    console.error('Error checking access control tables:', error);
    return { success: false, error: error.message };
  }
}
