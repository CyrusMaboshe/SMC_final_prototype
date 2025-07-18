import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create service role client for server-side operations
const supabaseServiceRole = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: applicationId } = await params;

    if (!applicationId) {
      return NextResponse.json({ error: 'Application ID is required' }, { status: 400 });
    }

    // Get application files using service role client (bypasses RLS)
    const { data, error } = await supabaseServiceRole
      .from('application_files')
      .select('*')
      .eq('application_id', applicationId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Application files fetch error:', error);
      return NextResponse.json({ error: `Failed to fetch application files: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      files: data || []
    });

  } catch (error: any) {
    console.error('Admin application files API error:', error);
    return NextResponse.json({ error: `Failed to fetch application files: ${error.message}` }, { status: 500 });
  }
}
