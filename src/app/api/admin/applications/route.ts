import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create service role client for server-side operations
const supabaseServiceRole = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // Get all applications using service role client (bypasses RLS)
    const { data, error } = await supabaseServiceRole
      .from('applications')
      .select('*')
      .order('submitted_at', { ascending: false });

    if (error) {
      console.error('Applications fetch error:', error);
      return NextResponse.json({ error: `Failed to fetch applications: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      applications: data || []
    });

  } catch (error: any) {
    console.error('Admin applications API error:', error);
    return NextResponse.json({ error: `Failed to fetch applications: ${error.message}` }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { applicationId, status, adminNotes, reviewedBy } = await request.json();

    if (!applicationId || !status) {
      return NextResponse.json({ error: 'Application ID and status are required' }, { status: 400 });
    }

    // Update application status using service role client (bypasses RLS)
    const { data, error } = await supabaseServiceRole
      .from('applications')
      .update({
        status,
        admin_notes: adminNotes,
        reviewed_by: reviewedBy,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', applicationId)
      .select()
      .single();

    if (error) {
      console.error('Application update error:', error);
      return NextResponse.json({ error: `Failed to update application: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      application: data
    });

  } catch (error: any) {
    console.error('Admin application update API error:', error);
    return NextResponse.json({ error: `Failed to update application: ${error.message}` }, { status: 500 });
  }
}
