import { supabase } from '@/lib/supabase';

export async function createAccessControlTables() {
  console.log('🚀 Starting table creation...');
  
  try {
    // Create semester_periods table
    console.log('Creating semester_periods table...');
    const { error: semesterError } = await supabase.sql`
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
    
    if (semesterError) {
      console.error('❌ Error creating semester_periods:', semesterError);
      throw semesterError;
    }
    console.log('✅ semester_periods table created');

    // Create payment_approvals table
    console.log('Creating payment_approvals table...');
    const { error: paymentError } = await supabase.sql`
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
    `;
    
    if (paymentError) {
      console.error('❌ Error creating payment_approvals:', paymentError);
      throw paymentError;
    }
    console.log('✅ payment_approvals table created');

    // Create student_semester_registrations table
    console.log('Creating student_semester_registrations table...');
    const { error: registrationError } = await supabase.sql`
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
    `;
    
    if (registrationError) {
      console.error('❌ Error creating student_semester_registrations:', registrationError);
      throw registrationError;
    }
    console.log('✅ student_semester_registrations table created');

    // Create access_control_logs table
    console.log('Creating access_control_logs table...');
    const { error: logsError } = await supabase.sql`
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
    `;
    
    if (logsError) {
      console.error('❌ Error creating access_control_logs:', logsError);
      throw logsError;
    }
    console.log('✅ access_control_logs table created');

    // Insert test semester
    console.log('Creating test semester...');
    const testSemester = {
      semester_name: 'Fall Semester 2024',
      academic_year: '2024-2025',
      semester_number: 1,
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      registration_start_date: new Date().toISOString().split('T')[0],
      registration_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      is_active: true,
      is_registration_open: true
    };

    const { data: semesterData, error: semesterInsertError } = await supabase
      .from('semester_periods')
      .insert(testSemester)
      .select();

    if (semesterInsertError) {
      console.error('❌ Error creating test semester:', semesterInsertError);
      // Don't throw here, table creation was successful
    } else {
      console.log('✅ Test semester created successfully');
    }

    console.log('🎉 All tables created successfully!');
    return { success: true, message: 'All access control tables created successfully!' };

  } catch (error: any) {
    console.error('❌ Error in table creation:', error);
    return { success: false, error: error.message };
  }
}

// Function to test if tables exist
export async function testTablesExist() {
  try {
    console.log('🔍 Testing if tables exist...');
    
    const tables = ['semester_periods', 'payment_approvals', 'student_semester_registrations', 'access_control_logs'];
    const results: { [key: string]: boolean } = {};
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('id')
          .limit(1);
        
        if (error) {
          console.log(`❌ Table ${table}: ${error.message}`);
          results[table] = false;
        } else {
          console.log(`✅ Table ${table}: exists and accessible`);
          results[table] = true;
        }
      } catch (err: any) {
        console.log(`❌ Table ${table}: ${err.message}`);
        results[table] = false;
      }
    }
    
    return results;
  } catch (error: any) {
    console.error('Error testing tables:', error);
    return {};
  }
}
