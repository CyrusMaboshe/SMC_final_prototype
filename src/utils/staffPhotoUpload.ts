import { supabase } from '@/lib/supabase';

export interface PhotoUploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export class StaffPhotoUpload {
  private static readonly BUCKET_NAME = 'staff-photos';
  private static readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  private static readonly ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  /**
   * Validate photo file before upload
   */
  static validatePhoto(file: File): { valid: boolean; error?: string } {
    // Check file type
    if (!this.ALLOWED_TYPES.includes(file.type)) {
      return {
        valid: false,
        error: 'Invalid file type. Please upload a JPEG, PNG, or WebP image.'
      };
    }

    // Check file size
    if (file.size > this.MAX_FILE_SIZE) {
      return {
        valid: false,
        error: 'File size too large. Please upload an image smaller than 5MB.'
      };
    }

    return { valid: true };
  }

  /**
   * Generate unique filename for staff photo
   */
  private static generateFileName(staffId: string, file: File): string {
    const timestamp = Date.now();
    const extension = file.name.split('.').pop() || 'jpg';
    return `${staffId}_${timestamp}.${extension}`;
  }

  /**
   * Upload staff photo to Supabase storage
   */
  static async uploadPhoto(staffId: string, file: File): Promise<PhotoUploadResult> {
    try {
      // Validate file
      const validation = this.validatePhoto(file);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error
        };
      }

      // Generate unique filename
      const fileName = this.generateFileName(staffId, file);
      const filePath = `${staffId}/${fileName}`;

      // Upload file to Supabase storage
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Upload error:', error);
        return {
          success: false,
          error: 'Failed to upload photo. Please try again.'
        };
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(filePath);

      return {
        success: true,
        url: urlData.publicUrl
      };

    } catch (error) {
      console.error('Photo upload error:', error);
      return {
        success: false,
        error: 'An unexpected error occurred during upload.'
      };
    }
  }

  /**
   * Update existing staff photo (removes old photo and uploads new one)
   */
  static async updatePhoto(staffId: string, file: File, currentPhotoUrl?: string): Promise<PhotoUploadResult> {
    try {
      // Upload new photo first
      const uploadResult = await this.uploadPhoto(staffId, file);
      
      if (!uploadResult.success) {
        return uploadResult;
      }

      // If upload successful and there's an old photo, try to delete it
      if (currentPhotoUrl) {
        await this.deletePhotoByUrl(currentPhotoUrl);
      }

      return uploadResult;

    } catch (error) {
      console.error('Photo update error:', error);
      return {
        success: false,
        error: 'Failed to update photo. Please try again.'
      };
    }
  }

  /**
   * Delete photo by URL
   */
  static async deletePhotoByUrl(photoUrl: string): Promise<boolean> {
    try {
      // Extract file path from URL
      const urlParts = photoUrl.split('/');
      const bucketIndex = urlParts.findIndex(part => part === this.BUCKET_NAME);
      
      if (bucketIndex === -1 || bucketIndex >= urlParts.length - 1) {
        console.warn('Could not extract file path from URL:', photoUrl);
        return false;
      }

      const filePath = urlParts.slice(bucketIndex + 1).join('/');
      
      const { error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .remove([filePath]);

      if (error) {
        console.error('Delete error:', error);
        return false;
      }

      return true;

    } catch (error) {
      console.error('Photo deletion error:', error);
      return false;
    }
  }

  /**
   * Delete all photos for a staff member
   */
  static async deleteAllStaffPhotos(staffId: string): Promise<boolean> {
    try {
      const { data: files, error: listError } = await supabase.storage
        .from(this.BUCKET_NAME)
        .list(staffId);

      if (listError) {
        console.error('List files error:', listError);
        return false;
      }

      if (!files || files.length === 0) {
        return true; // No files to delete
      }

      const filePaths = files.map(file => `${staffId}/${file.name}`);
      
      const { error: deleteError } = await supabase.storage
        .from(this.BUCKET_NAME)
        .remove(filePaths);

      if (deleteError) {
        console.error('Delete files error:', deleteError);
        return false;
      }

      return true;

    } catch (error) {
      console.error('Delete all photos error:', error);
      return false;
    }
  }

  /**
   * Get photo URL for staff member (latest photo)
   */
  static async getStaffPhotoUrl(staffId: string): Promise<string | null> {
    try {
      const { data: files, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .list(staffId, {
          limit: 1,
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (error || !files || files.length === 0) {
        return null;
      }

      const latestFile = files[0];
      const { data: urlData } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(`${staffId}/${latestFile.name}`);

      return urlData.publicUrl;

    } catch (error) {
      console.error('Get photo URL error:', error);
      return null;
    }
  }

  /**
   * Create photo preview URL from File object
   */
  static createPreviewUrl(file: File): string {
    return URL.createObjectURL(file);
  }

  /**
   * Revoke photo preview URL to free memory
   */
  static revokePreviewUrl(url: string): void {
    URL.revokeObjectURL(url);
  }

  /**
   * Resize image before upload (optional utility)
   */
  static async resizeImage(file: File, maxWidth: number = 400, maxHeight: number = 400, quality: number = 0.8): Promise<File> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const resizedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now()
              });
              resolve(resizedFile);
            } else {
              resolve(file); // Fallback to original file
            }
          },
          file.type,
          quality
        );
      };

      img.src = URL.createObjectURL(file);
    });
  }
}

export default StaffPhotoUpload;
