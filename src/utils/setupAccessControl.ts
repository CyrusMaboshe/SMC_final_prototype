import { supabase } from '@/lib/supabase';

export async function setupAccessControlTables() {
  try {
    console.log('Setting up access control tables...');

    // Create semester_periods table
    const { error: semesterError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS semester_periods (
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
          created_by UUID,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          CONSTRAINT check_dates CHECK (end_date > start_date AND registration_end_date >= registration_start_date)
        );
      `
    });

    if (semesterError) {
      console.error('Error creating semester_periods table:', semesterError);
    } else {
      console.log('✅ semester_periods table created');
    }

    // Create payment_approvals table
    const { error: paymentError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS payment_approvals (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          student_id UUID NOT NULL,
          payment_id UUID,
          amount_paid DECIMAL(10,2) NOT NULL CHECK (amount_paid > 0),
          payment_reference VARCHAR(100),
          payment_date DATE NOT NULL,
          approved_by UUID,
          approval_date TIMESTAMP WITH TIME ZONE,
          access_valid_from DATE NOT NULL,
          access_valid_until DATE NOT NULL,
          approval_status VARCHAR(20) DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'expired')),
          approval_notes TEXT,
          auto_expire BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          CONSTRAINT check_access_dates CHECK (access_valid_until > access_valid_from)
        );
      `
    });

    if (paymentError) {
      console.error('Error creating payment_approvals table:', paymentError);
    } else {
      console.log('✅ payment_approvals table created');
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
          registration_status VARCHAR(20) DEFAULT 'pending' CHECK (registration_status IN ('pending', 'approved', 'rejected', 'cancelled')),
          payment_approval_id UUID,
          registration_notes TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(student_id, semester_period_id)
        );
      `
    });

    if (registrationError) {
      console.error('Error creating student_semester_registrations table:', registrationError);
    } else {
      console.log('✅ student_semester_registrations table created');
    }

    // Create access_control_logs table
    const { error: logsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS access_control_logs (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          student_id UUID NOT NULL,
          action_type VARCHAR(50) NOT NULL,
          reason VARCHAR(100),
          payment_approval_id UUID,
          semester_registration_id UUID,
          ip_address INET,
          user_agent TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });

    if (logsError) {
      console.error('Error creating access_control_logs table:', logsError);
    } else {
      console.log('✅ access_control_logs table created');
    }

    console.log('✅ Access control tables setup completed!');
    return { success: true };

  } catch (error) {
    console.error('Error setting up access control tables:', error);
    return { success: false, error };
  }
}

// Alternative approach using direct SQL execution
export async function createTablesDirectly() {
  try {
    console.log('Creating tables using direct approach...');

    // Create semester_periods table
    const { error: error1 } = await supabase
      .from('semester_periods')
      .select('id')
      .limit(1);

    if (error1 && error1.message.includes('does not exist')) {
      console.log('Creating semester_periods table...');
      // Table doesn't exist, we need to create it
      // For now, let's create a simple version
      const { error: createError } = await supabase.sql`
        CREATE TABLE semester_periods (
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
      
      if (createError) {
        console.error('Error creating semester_periods:', createError);
      } else {
        console.log('✅ semester_periods table created');
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error in createTablesDirectly:', error);
    return { success: false, error };
  }
}

// Simple function to insert a test semester
export async function createTestSemester(accountantId: string) {
  try {
    const testSemester = {
      semester_name: 'Fall Semester 2024',
      academic_year: '2024-2025',
      semester_number: 1,
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 90 days from now
      registration_start_date: new Date().toISOString().split('T')[0],
      registration_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
      is_active: true,
      is_registration_open: true,
      created_by: accountantId
    };

    const { data, error } = await supabase
      .from('semester_periods')
      .insert(testSemester)
      .select();

    if (error) {
      console.error('Error creating test semester:', error);
      return { success: false, error };
    }

    console.log('✅ Test semester created:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Error in createTestSemester:', error);
    return { success: false, error };
  }
}
