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
} 