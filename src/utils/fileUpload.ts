import { supabase } from '@/lib/supabase';

export interface FileUploadResult {
  path: string;
  url: string;
  fileName: string;
  fileSize: number;
}

export interface FileUploadOptions {
  bucket: 'assignments' | 'submissions' | 'updates' | 'documents' | 'applications' | 'staff-photos';
  folder?: string;
  allowedTypes?: string[];
  maxSize?: number; // in bytes
}

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
  warnings?: string[];
  authenticityScore?: number; // 0-100 score for authenticity
  authenticityFlags?: string[];
}

export interface ApplicationFileMetadata {
  applicant_id: string;
  file_type: 'nrc_photo' | 'grade12_results' | 'payment_receipt';
  file_path: string;
  file_name: string;
  file_size: number;
  authenticity_score: number;
  authenticity_flags: string[];
  uploaded_at: string;
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
    // For admin-only buckets (staff-photos, applications), use server-side API to bypass RLS
    if (bucket === 'staff-photos' || bucket === 'applications') {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bucket', bucket);
      if (folder) formData.append('folder', folder);
      if (allowedTypes) formData.append('allowedTypes', JSON.stringify(allowedTypes));
      formData.append('maxSize', maxSize.toString());

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      return await response.json();
    }

    // For public buckets, use direct Supabase upload
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
 * Validate National Registration Card photo
 */
export async function validateNRCPhoto(file: File): Promise<FileValidationResult> {
  const allowedTypes = ['image/jpeg', 'image/png'];
  const maxSize = 3 * 1024 * 1024; // 3MB

  // Basic file validation
  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: 'NRC photo must be in JPG or PNG format'
    };
  }

  if (file.size > maxSize) {
    return {
      isValid: false,
      error: `File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds 3MB limit`
    };
  }

  // Image quality and authenticity checks
  return new Promise((resolve) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);

      const warnings: string[] = [];
      const authenticityFlags: string[] = [];
      let authenticityScore = 100;

      // Check image dimensions (NRC should be roughly card-sized)
      const aspectRatio = img.width / img.height;
      if (aspectRatio < 1.4 || aspectRatio > 1.8) {
        warnings.push('Image aspect ratio does not match standard NRC dimensions');
        authenticityScore -= 15;
        authenticityFlags.push('unusual_aspect_ratio');
      }

      // Check minimum resolution
      if (img.width < 400 || img.height < 250) {
        warnings.push('Image resolution is too low for clear verification');
        authenticityScore -= 20;
        authenticityFlags.push('low_resolution');
      }

      // Check if image is too large (might be a scan of multiple documents)
      if (img.width > 2000 || img.height > 1500) {
        warnings.push('Image resolution is unusually high - ensure it shows only the NRC');
        authenticityScore -= 10;
        authenticityFlags.push('high_resolution');
      }

      resolve({
        isValid: true,
        warnings: warnings.length > 0 ? warnings : undefined,
        authenticityScore,
        authenticityFlags: authenticityFlags.length > 0 ? authenticityFlags : undefined
      });
    };

    img.onerror = () => {
      resolve({
        isValid: false,
        error: 'Invalid image file or corrupted data'
      });
    };

    img.src = URL.createObjectURL(file);
  });
}

/**
 * Validate Grade 12 examination results
 */
export async function validateGrade12Results(file: File): Promise<FileValidationResult> {
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
  const maxSize = 3 * 1024 * 1024; // 3MB

  // Basic file validation
  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: 'Grade 12 results must be in PDF, JPG, or PNG format'
    };
  }

  if (file.size > maxSize) {
    return {
      isValid: false,
      error: `File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds 3MB limit`
    };
  }

  const warnings: string[] = [];
  const authenticityFlags: string[] = [];
  let authenticityScore = 85; // Start with lower score for document verification

  // Check file name for common patterns
  const fileName = file.name.toLowerCase();
  const suspiciousPatterns = ['copy', 'edited', 'modified', 'fake', 'template'];
  const validPatterns = ['grade12', 'results', 'certificate', 'transcript', 'examination'];

  if (suspiciousPatterns.some(pattern => fileName.includes(pattern))) {
    warnings.push('File name contains suspicious keywords');
    authenticityScore -= 25;
    authenticityFlags.push('suspicious_filename');
  }

  if (!validPatterns.some(pattern => fileName.includes(pattern))) {
    warnings.push('File name does not indicate Grade 12 results document');
    authenticityScore -= 10;
    authenticityFlags.push('unclear_filename');
  }

  // For image files, perform additional checks
  if (file.type.startsWith('image/')) {
    return new Promise((resolve) => {
      const img = new Image();

      img.onload = () => {
        // Check if image is too small (might be a thumbnail or low-quality scan)
        if (img.width < 600 || img.height < 800) {
          warnings.push('Image resolution may be too low for document verification');
          authenticityScore -= 15;
          authenticityFlags.push('low_resolution_document');
        }

        // Check aspect ratio for document-like proportions
        const aspectRatio = img.width / img.height;
        if (aspectRatio < 0.6 || aspectRatio > 1.4) {
          warnings.push('Image proportions do not match typical document format');
          authenticityScore -= 10;
          authenticityFlags.push('unusual_document_ratio');
        }

        resolve({
          isValid: true,
          warnings: warnings.length > 0 ? warnings : undefined,
          authenticityScore,
          authenticityFlags: authenticityFlags.length > 0 ? authenticityFlags : undefined
        });
      };

      img.onerror = () => {
        resolve({
          isValid: false,
          error: 'Invalid image file or corrupted data'
        });
      };

      img.src = URL.createObjectURL(file);
    });
  }

  // For PDF files, return basic validation
  return Promise.resolve({
    isValid: true,
    warnings: warnings.length > 0 ? warnings : undefined,
    authenticityScore,
    authenticityFlags: authenticityFlags.length > 0 ? authenticityFlags : undefined
  });
}

/**
 * Validate payment receipt
 */
export async function validatePaymentReceipt(file: File): Promise<FileValidationResult> {
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
  const maxSize = 5 * 1024 * 1024; // 5MB

  // Basic file validation
  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: 'Payment receipt must be in PDF, JPG, or PNG format'
    };
  }

  if (file.size > maxSize) {
    return {
      isValid: false,
      error: `File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds 5MB limit`
    };
  }

  const warnings: string[] = [];
  const authenticityFlags: string[] = [];
  let authenticityScore = 90; // Start with high score for receipt verification

  // Check file name for payment-related patterns
  const fileName = file.name.toLowerCase();
  const paymentPatterns = ['receipt', 'payment', 'transaction', 'bank', 'transfer', 'deposit'];
  const suspiciousPatterns = ['fake', 'edited', 'modified', 'template', 'sample'];

  if (suspiciousPatterns.some(pattern => fileName.includes(pattern))) {
    warnings.push('File name contains suspicious keywords');
    authenticityScore -= 30;
    authenticityFlags.push('suspicious_filename');
  }

  if (!paymentPatterns.some(pattern => fileName.includes(pattern))) {
    warnings.push('File name does not clearly indicate a payment receipt');
    authenticityScore -= 5;
    authenticityFlags.push('unclear_payment_filename');
  }

  // For image files, perform additional checks
  if (file.type.startsWith('image/')) {
    return new Promise((resolve) => {
      const img = new Image();

      img.onload = () => {
        // Check if image is too small (might be a thumbnail)
        if (img.width < 300 || img.height < 400) {
          warnings.push('Image resolution may be too low for receipt verification');
          authenticityScore -= 15;
          authenticityFlags.push('low_resolution_receipt');
        }

        // Check if image is extremely large (might be multiple receipts or documents)
        if (img.width > 3000 || img.height > 4000) {
          warnings.push('Image is very large - ensure it contains only one receipt');
          authenticityScore -= 5;
          authenticityFlags.push('oversized_receipt');
        }

        resolve({
          isValid: true,
          warnings: warnings.length > 0 ? warnings : undefined,
          authenticityScore,
          authenticityFlags: authenticityFlags.length > 0 ? authenticityFlags : undefined
        });
      };

      img.onerror = () => {
        resolve({
          isValid: false,
          error: 'Invalid image file or corrupted data'
        });
      };

      img.src = URL.createObjectURL(file);
    });
  }

  // For PDF files, return basic validation
  return Promise.resolve({
    isValid: true,
    warnings: warnings.length > 0 ? warnings : undefined,
    authenticityScore,
    authenticityFlags: authenticityFlags.length > 0 ? authenticityFlags : undefined
  });
}

/**
 * Upload application file with metadata tracking
 */
export async function uploadApplicationFile(
  file: File,
  applicantId: string,
  fileType: 'nrc_photo' | 'grade12_results' | 'payment_receipt',
  validationResult: FileValidationResult
): Promise<FileUploadResult & { metadata: ApplicationFileMetadata }> {
  const folder = `applications/${applicantId}`;

  const uploadResult = await uploadFile(file, {
    bucket: 'applications',
    folder,
    allowedTypes: fileType === 'nrc_photo'
      ? ['image/jpeg', 'image/png']
      : ['application/pdf', 'image/jpeg', 'image/png'],
    maxSize: fileType === 'payment_receipt' ? 5 * 1024 * 1024 : 3 * 1024 * 1024
  });

  const metadata: ApplicationFileMetadata = {
    applicant_id: applicantId,
    file_type: fileType,
    file_path: uploadResult.path,
    file_name: uploadResult.fileName,
    file_size: uploadResult.fileSize,
    authenticity_score: validationResult.authenticityScore || 0,
    authenticity_flags: validationResult.authenticityFlags || [],
    uploaded_at: new Date().toISOString()
  };

  return {
    ...uploadResult,
    metadata
  };
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
 * Generate URL from file path for staff photos using server-side API
 */
export async function generateStaffPhotoUrl(filePath: string): Promise<string> {
  try {
    // Use server-side API to generate signed URL (bypasses RLS)
    const response = await fetch('/api/generate-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bucket: 'staff-photos',
        filePath: filePath,
        expiresIn: 3600 * 24 * 7 // 7 days
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to generate URL');
    }

    const data = await response.json();
    return data.url;
  } catch (error: any) {
    throw new Error(`Failed to generate staff photo URL: ${error.message}`);
  }
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
