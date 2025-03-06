import fs from 'fs/promises';
import path from 'path';
import { StorageService, UploadOptions } from './storage.interface';
import { config } from '../../config/environment';

/**
 * Local filesystem implementation of StorageService
 */
export class LocalStorageService implements StorageService {
  private baseDir: string;
  private baseUrl: string;

  constructor() {
    this.baseDir = path.resolve(process.cwd(), config.uploadDir);
    this.baseUrl = `${config.baseUrl}/${config.uploadDir}`;
  }

  /**
   * Upload a file to local storage
   */
  async uploadFile(
    filePath: string,
    destinationPath: string,
    options?: UploadOptions
  ): Promise<string> {
    const destPath = path.join(this.baseDir, destinationPath);
    
    // Ensure directory exists
    await fs.mkdir(path.dirname(destPath), { recursive: true });
    
    // Copy file to destination
    await fs.copyFile(filePath, destPath);
    
    // Return URL to the file
    return this.getFileUrl(destinationPath);
  }

  /**
   * Upload a buffer to local storage
   */
  async uploadBuffer(
    buffer: Buffer,
    destinationPath: string,
    options?: UploadOptions
  ): Promise<string> {
    const destPath = path.join(this.baseDir, destinationPath);
    
    // Ensure directory exists
    await fs.mkdir(path.dirname(destPath), { recursive: true });
    
    // Write buffer to file
    await fs.writeFile(destPath, buffer);
    
    // Return URL to the file
    return this.getFileUrl(destinationPath);
  }

  /**
   * Delete a file from local storage
   */
  async deleteFile(filePath: string): Promise<void> {
    const fullPath = path.join(this.baseDir, filePath);
    
    try {
      await fs.unlink(fullPath);
    } catch (error) {
      // Ignore if file doesn't exist
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  /**
   * Check if a file exists in local storage
   */
  async fileExists(filePath: string): Promise<boolean> {
    const fullPath = path.join(this.baseDir, filePath);
    
    try {
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the URL for a file in local storage
   */
  getFileUrl(filePath: string): string {
    // Replace backslashes with forward slashes for URLs
    const normalizedPath = filePath.replace(/\\/g, '/');
    return `${this.baseUrl}/${normalizedPath}`;
  }

  /**
   * Delete all files with a given prefix (simulates directory deletion)
   * For local storage, this is an actual directory deletion
   * @param prefix Directory prefix to delete
   * @returns Promise resolving when all files are deleted
   */
  async deleteDirectory(prefix: string): Promise<void> {
    console.log(`Deleting directory: ${prefix}`);
    
    try {
      const fullPath = path.join(this.baseDir, prefix);
      
      // Check if directory exists
      try {
        await fs.access(fullPath);
      } catch (error) {
        console.log(`Directory does not exist: ${fullPath}`);
        return;
      }
      
      // Create a recursive function to delete all files and subdirectories
      const deleteRecursive = async (dirPath: string) => {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        
        // Delete all files and subdirectories
        for (const entry of entries) {
          const entryPath = path.join(dirPath, entry.name);
          
          if (entry.isDirectory()) {
            // Recursively delete subdirectory
            await deleteRecursive(entryPath);
          } else {
            // Delete file
            await fs.unlink(entryPath);
          }
        }
        
        // Delete the empty directory
        await fs.rmdir(dirPath);
      };
      
      // Start recursive deletion
      await deleteRecursive(fullPath);
      console.log(`Successfully deleted directory: ${fullPath}`);
    } catch (error) {
      console.error(`Error deleting directory ${prefix}:`, error);
      throw error;
    }
  }
} 