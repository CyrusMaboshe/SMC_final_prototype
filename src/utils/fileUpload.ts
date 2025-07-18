import { supabase } from '@/lib/supabase';

/**
 * Check if Supabase storage is accessible
 */
export async function checkStorageConnection(): Promise<boolean> {
  try {
    const { data, error } = await supabase.storage.listBuckets();
    return !error && data !== null;
  } catch (error) {
    console.error('Storage connection check failed:', error);
    return false;
  }
}

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
 * Simple upload function for public files (fallback)
 */
export async function uploadFileSimple(
  file: File,
  bucket: string = 'documents',
  folder: string = ''
): Promise<FileUploadResult> {
  // Generate unique filename
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const fileExtension = file.name.split('.').pop();
  const fileName = `${timestamp}_${randomString}.${fileExtension}`;
  const filePath = folder ? `${folder}/${fileName}` : fileName;

  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true // Allow overwrite for simplicity
      });

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }

    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return {
      path: filePath,
      url: urlData.publicUrl,
      fileName: file.name,
      fileSize: file.size
    };
  } catch (error: any) {
    throw new Error(`Simple upload failed: ${error.message}`);
  }
}

/**
 * Upload a file to Supabase Storage with improved error handling
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

  // Generate unique filename with better randomness
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  const fileExtension = file.name.split('.').pop();
  const fileName = `${timestamp}_${randomString}.${fileExtension}`;

  // Construct file path
  const filePath = folder ? `${folder}/${fileName}` : fileName;

  // Check if user is authenticated for private buckets
  const { data: { user } } = await supabase.auth.getUser();
  if (!user && (bucket === 'applications' || bucket === 'staff-photos' || bucket === 'submissions')) {
    throw new Error('Authentication required for file upload. Please log in and try again.');
  }

  // Retry mechanism for failed uploads
  const maxRetries = 3;
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Upload attempt ${attempt}/${maxRetries} for file: ${fileName}`);

      // Use different file path for retries to avoid conflicts
      const retryFilePath = attempt > 1 ? `${folder ? folder + '/' : ''}retry_${attempt}_${fileName}` : filePath;

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(retryFilePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error(`Upload attempt ${attempt} failed:`, error);
        lastError = error;

        // Don't retry for certain errors
        if (error.message.includes('Bucket not found') ||
            error.message.includes('Invalid bucket') ||
            error.message.includes('File too large')) {
          throw error;
        }

        // Wait before retry (exponential backoff)
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          continue;
        }

        throw error;
      }

      // Success! Get public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(retryFilePath);

      const url = urlData.publicUrl;

      console.log(`Upload successful on attempt ${attempt}`);
      return {
        path: retryFilePath,
        url,
        fileName: file.name,
        fileSize: file.size
      };

    } catch (error: any) {
      lastError = error;

      // Don't retry for certain errors
      if (error.message.includes('Bucket not found') ||
          error.message.includes('Invalid bucket') ||
          error.message.includes('File too large') ||
          error.message.includes('Authentication required')) {
        break;
      }

      if (attempt === maxRetries) {
        break;
      }
    }
  }

  // All retries failed, throw the last error with user-friendly message
  console.error('All upload attempts failed:', lastError);

  if (lastError.message.includes('signature verification failed')) {
    throw new Error('File upload authentication failed. Please refresh the page and try again.');
  }
  if (lastError.message.includes('Bucket not found')) {
    throw new Error('Storage system error. Please contact support.');
  }
  if (lastError.message.includes('Network')) {
    throw new Error('Network error. Please check your connection and try again.');
  }
  if (lastError.message.includes('timeout')) {
    throw new Error('Upload timeout. Please try uploading a smaller file or check your connection.');
  }

  throw new Error(`File upload failed after ${maxRetries} attempts: ${lastError.message}`);
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
  const folder = applicantId;

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
