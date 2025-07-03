import { supabase } from '@/lib/supabase';

export interface FileUploadResult {
  path: string;
  url: string;
  fileName: string;
  fileSize: number;
}

export interface FileUploadOptions {
  bucket: 'assignments' | 'submissions' | 'updates' | 'documents';
  folder?: string;
  allowedTypes?: string[];
  maxSize?: number; // in bytes
}

/**
 * Upload a file to Supabase Storage
 */
export async function uploadFile(
  file: File,
  options: FileUploadOptions
): Promise<FileUploadResult> {
  const {
    bucket,
    folder = '',
    allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    maxSize = 50 * 1024 * 1024 // 50MB default
  } = options;

  // Validate file type
  if (!allowedTypes.includes(file.type)) {
    throw new Error(`File type ${file.type} is not allowed. Allowed types: ${allowedTypes.join(', ')}`);
  }

  // Validate file size
  if (file.size > maxSize) {
    throw new Error(`File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds maximum allowed size of ${(maxSize / 1024 / 1024).toFixed(2)}MB`);
  }

  // Generate unique filename
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const fileExtension = file.name.split('.').pop();
  const fileName = `${timestamp}_${randomString}.${fileExtension}`;
  
  // Construct file path
  const filePath = folder ? `${folder}/${fileName}` : fileName;

  try {
    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }

    // Get public URL (for assignments, updates, and documents) or signed URL (for submissions)
    let url: string;
    if (bucket === 'assignments' || bucket === 'updates' || bucket === 'documents') {
      // Assignments, updates, and documents can be publicly accessible
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);
      url = urlData.publicUrl;
    } else {
      // Submissions should be private with signed URLs
      const { data: urlData, error: urlError } = await supabase.storage
        .from(bucket)
        .createSignedUrl(filePath, 3600 * 24 * 7); // 7 days expiry

      if (urlError) {
        throw new Error(`Failed to create signed URL: ${urlError.message}`);
      }
      url = urlData.signedUrl;
    }

    return {
      path: filePath,
      url,
      fileName: file.name,
      fileSize: file.size
    };
  } catch (error: any) {
    throw new Error(`File upload failed: ${error.message}`);
  }
}

/**
 * Delete a file from Supabase Storage
 */
export async function deleteFile(bucket: string, filePath: string): Promise<void> {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);

    if (error) {
      throw new Error(`Delete failed: ${error.message}`);
    }
  } catch (error: any) {
    throw new Error(`File deletion failed: ${error.message}`);
  }
}

/**
 * Get a signed URL for a private file
 */
export async function getSignedUrl(
  bucket: string,
  filePath: string,
  expiresIn: number = 3600
): Promise<string> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      throw new Error(`Failed to create signed URL: ${error.message}`);
    }

    return data.signedUrl;
  } catch (error: any) {
    throw new Error(`Failed to get signed URL: ${error.message}`);
  }
}

/**
 * Download a file from Supabase Storage
 */
export async function downloadFile(bucket: string, filePath: string): Promise<Blob> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .download(filePath);

    if (error) {
      throw new Error(`Download failed: ${error.message}`);
    }

    return data;
  } catch (error: any) {
    throw new Error(`File download failed: ${error.message}`);
  }
}

/**
 * Validate file before upload
 */
export function validateFile(
  file: File,
  allowedTypes: string[] = ['application/pdf'],
  maxSize: number = 50 * 1024 * 1024
): { isValid: boolean; error?: string } {
  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: `File type ${file.type} is not allowed. Please upload: ${allowedTypes.map(type => {
        if (type === 'application/pdf') return 'PDF';
        if (type === 'application/msword') return 'DOC';
        if (type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'DOCX';
        return type;
      }).join(', ')} files only.`
    };
  }

  if (file.size > maxSize) {
    return {
      isValid: false,
      error: `File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds maximum allowed size of ${(maxSize / 1024 / 1024).toFixed(2)}MB`
    };
  }

  return { isValid: true };
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get file type icon
 */
export function getFileIcon(fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'pdf':
      return '📄';
    case 'doc':
    case 'docx':
      return '📝';
    case 'txt':
      return '📃';
    case 'jpg':
    case 'jpeg':
    case 'png':
      return '🖼️';
    default:
      return '📁';
  }
}
