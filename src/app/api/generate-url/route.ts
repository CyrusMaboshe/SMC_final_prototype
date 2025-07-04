import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create service role client for server-side operations
const supabaseServiceRole = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { bucket, filePath, expiresIn = 3600 } = await request.json();

    if (!bucket || !filePath) {
      return NextResponse.json({ error: 'Bucket and filePath are required' }, { status: 400 });
    }

    // Generate URL based on bucket type
    let url: string;

    if (bucket === 'assignments' || bucket === 'updates' || bucket === 'documents') {
      // Public buckets - use public URL
      const { data: urlData } = supabaseServiceRole.storage
        .from(bucket)
        .getPublicUrl(filePath);
      url = urlData.publicUrl;
    } else {
      // Private buckets - use signed URL
      const { data, error } = await supabaseServiceRole.storage
        .from(bucket)
        .createSignedUrl(filePath, expiresIn);

      if (error) {
        console.error('Signed URL generation error:', error);
        return NextResponse.json({ error: `Failed to generate URL: ${error.message}` }, { status: 500 });
      }
      url = data.signedUrl;
    }

    return NextResponse.json({
      url
    });

  } catch (error: any) {
    console.error('Generate URL API error:', error);
    return NextResponse.json({ error: `Failed to generate URL: ${error.message}` }, { status: 500 });
  }
}
