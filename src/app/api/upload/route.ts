import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create service role client for server-side operations
const supabaseServiceRole = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const bucket = formData.get('bucket') as string;
    const folder = formData.get('folder') as string;
    const allowedTypes = formData.get('allowedTypes') as string;
    const maxSize = parseInt(formData.get('maxSize') as string) || 5 * 1024 * 1024; // 5MB default

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!bucket) {
      return NextResponse.json({ error: 'No bucket specified' }, { status: 400 });
    }

    // Validate file type
    if (allowedTypes) {
      const allowedTypesArray = JSON.parse(allowedTypes);
      if (!allowedTypesArray.includes(file.type)) {
        return NextResponse.json({ 
          error: `File type ${file.type} not allowed. Allowed types: ${allowedTypesArray.join(', ')}` 
        }, { status: 400 });
      }
    }

    // Validate file size
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: `File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds maximum allowed size of ${(maxSize / 1024 / 1024).toFixed(2)}MB` 
      }, { status: 400 });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split('.').pop();
    const fileName = `${timestamp}_${randomString}.${fileExtension}`;
    
    // Construct file path
    const filePath = folder ? `${folder}/${fileName}` : fileName;

    // Convert File to ArrayBuffer for upload
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = new Uint8Array(arrayBuffer);

    // Upload file using service role client (bypasses RLS)
    const { data, error } = await supabaseServiceRole.storage
      .from(bucket)
      .upload(filePath, fileBuffer, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type
      });

    if (error) {
      console.error('Upload error:', error);
      return NextResponse.json({ error: `Upload failed: ${error.message}` }, { status: 500 });
    }

    // Get URL based on bucket type
    let url: string;
    if (bucket === 'assignments' || bucket === 'updates' || bucket === 'documents') {
      // Public buckets
      const { data: urlData } = supabaseServiceRole.storage
        .from(bucket)
        .getPublicUrl(filePath);
      url = urlData.publicUrl;
    } else {
      // Private buckets - create signed URL
      const { data: urlData, error: urlError } = await supabaseServiceRole.storage
        .from(bucket)
        .createSignedUrl(filePath, 3600 * 24 * 7); // 7 days expiry

      if (urlError) {
        console.error('Signed URL error:', urlError);
        return NextResponse.json({ error: `Failed to create signed URL: ${urlError.message}` }, { status: 500 });
      }
      url = urlData.signedUrl;
    }

    return NextResponse.json({
      path: filePath,
      url,
      fileName: file.name,
      fileSize: file.size
    });

  } catch (error: any) {
    console.error('Upload API error:', error);
    return NextResponse.json({ error: `Upload failed: ${error.message}` }, { status: 500 });
  }
}
