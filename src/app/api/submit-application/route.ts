import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create service role client for server-side operations
const supabaseServiceRole = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const applicationData = await request.json();

    // Validate required fields
    const requiredFields = [
      'first_name', 'last_name', 'email', 'phone', 'date_of_birth',
      'address', 'program_interest', 'education_background', 'motivation_statement',
      'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relationship'
    ];

    for (const field of requiredFields) {
      if (!applicationData[field]) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
      }
    }

    // Prepare application data with default values
    const insertData = {
      ...applicationData,
      status: 'pending',
      submitted_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Insert application using service role client (bypasses RLS)
    const { data, error } = await supabaseServiceRole
      .from('applications')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.error('Application submission error:', error);
      return NextResponse.json({ error: `Failed to submit application: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      application: data
    });

  } catch (error: any) {
    console.error('Submit application API error:', error);
    return NextResponse.json({ error: `Failed to submit application: ${error.message}` }, { status: 500 });
  }
}
