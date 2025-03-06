/**
 * Interface for storage providers (local filesystem or cloud storage)
 */
export interface StorageService {
  /**
   * Upload a file to storage
   * @param filePath Local path to the file to upload
   * @param destinationPath Path where the file should be stored
   * @param options Additional upload options
   * @returns Promise resolving to the URL of the uploaded file
   */
  uploadFile(
    filePath: string,
    destinationPath: string,
    options?: UploadOptions
  ): Promise<string>;

  /**
   * Upload a buffer to storage
   * @param buffer Buffer containing file data
   * @param destinationPath Path where the file should be stored
   * @param options Additional upload options
   * @returns Promise resolving to the URL of the uploaded file
   */
  uploadBuffer(
    buffer: Buffer,
    destinationPath: string,
    options?: UploadOptions
  ): Promise<string>;

  /**
   * Delete a file from storage
   * @param filePath Path to the file to delete
   * @returns Promise resolving when the file is deleted
   */
  deleteFile(filePath: string): Promise<void>;

  /**
   * Check if a file exists in storage
   * @param filePath Path to the file to check
   * @returns Promise resolving to true if the file exists, false otherwise
   */
  fileExists(filePath: string): Promise<boolean>;

  /**
   * Get the URL for a file in storage
   * @param filePath Path to the file
   * @returns URL for accessing the file
   */
  getFileUrl(filePath: string): string;
}

/**
 * Options for file uploads
 */
export interface UploadOptions {
  /**
   * Content type of the file
   */
  contentType?: string;
  
  /**
   * Whether the file should be publicly accessible
   */
  isPublic?: boolean;
  
  /**
   * Additional metadata for the file
   */
  metadata?: Record<string, string>;
} 