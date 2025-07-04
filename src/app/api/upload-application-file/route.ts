import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create service role client for server-side operations
const supabaseServiceRole = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const fileData = await request.json();

    // Validate required fields
    const requiredFields = [
      'application_id', 'file_type', 'file_path', 'file_name', 
      'file_size', 'authenticity_score', 'authenticity_flags'
    ];

    for (const field of requiredFields) {
      if (fileData[field] === undefined || fileData[field] === null) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
      }
    }

    // Validate file_type
    const validFileTypes = ['nrc_photo', 'grade12_results', 'payment_receipt'];
    if (!validFileTypes.includes(fileData.file_type)) {
      return NextResponse.json({ error: `Invalid file_type. Must be one of: ${validFileTypes.join(', ')}` }, { status: 400 });
    }

    // Determine if file requires review
    const requiresReview = fileData.authenticity_score < 70 || fileData.authenticity_flags.length > 0;

    // Prepare file data for insertion
    const insertData = {
      application_id: fileData.application_id,
      file_type: fileData.file_type,
      file_path: fileData.file_path,
      file_name: fileData.file_name,
      file_size: fileData.file_size,
      file_url: fileData.file_url,
      authenticity_score: fileData.authenticity_score,
      authenticity_flags: fileData.authenticity_flags,
      requires_review: requiresReview,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Insert application file using service role client (bypasses RLS)
    const { data, error } = await supabaseServiceRole
      .from('application_files')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.error('Application file upload error:', error);
      return NextResponse.json({ error: `Failed to upload application file: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      file: data
    });

  } catch (error: any) {
    console.error('Upload application file API error:', error);
    return NextResponse.json({ error: `Failed to upload application file: ${error.message}` }, { status: 500 });
  }
}
