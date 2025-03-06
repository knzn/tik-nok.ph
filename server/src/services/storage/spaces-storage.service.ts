import AWS from 'aws-sdk';
import fs from 'fs/promises';
import path from 'path';
import { StorageService, UploadOptions } from './storage.interface';

/**
 * DigitalOcean Spaces implementation of StorageService
 */
export class SpacesStorageService implements StorageService {
  private s3: AWS.S3;
  private bucket: string;
  private endpoint: string;
  private cdnEnabled: boolean;
  private cdnEndpoint: string;

  constructor() {
    // Configure AWS SDK for DigitalOcean Spaces
    this.endpoint = process.env.DO_SPACES_ENDPOINT || '';
    this.bucket = process.env.DO_SPACES_BUCKET || '';
    this.cdnEnabled = process.env.DO_CDN_ENABLED === 'true';
    this.cdnEndpoint = process.env.DO_CDN_ENDPOINT || '';

    // Validate required environment variables
    if (!this.endpoint || !this.bucket) {
      throw new Error('DigitalOcean Spaces configuration is missing. Please check your environment variables.');
    }

    // Initialize S3 client
    this.s3 = new AWS.S3({
      endpoint: `https://${this.endpoint}`,
      accessKeyId: process.env.DO_SPACES_KEY,
      secretAccessKey: process.env.DO_SPACES_SECRET,
      // Required for DigitalOcean Spaces compatibility
      s3ForcePathStyle: false,
      signatureVersion: 'v4'
    });
  }

  /**
   * Upload a file to DigitalOcean Spaces
   */
  async uploadFile(
    filePath: string,
    destinationPath: string,
    options?: UploadOptions
  ): Promise<string> {
    // Read file content
    const fileContent = await fs.readFile(filePath);
    
    // Upload to Spaces
    return this.uploadBuffer(fileContent, destinationPath, options);
  }

  /**
   * Upload a buffer to DigitalOcean Spaces
   */
  async uploadBuffer(
    buffer: Buffer,
    destinationPath: string,
    options?: UploadOptions
  ): Promise<string> {
    // Normalize path (replace backslashes with forward slashes)
    const normalizedPath = destinationPath.replace(/\\/g, '/');
    
    // Set upload parameters
    const params: AWS.S3.PutObjectRequest = {
      Bucket: this.bucket,
      Key: normalizedPath,
      Body: buffer,
      ACL: options?.isPublic ? 'public-read' : 'private',
      ContentType: options?.contentType,
      Metadata: options?.metadata
    };
    
    // Upload to Spaces
    await this.s3.putObject(params).promise();
    
    // Return URL to the file
    return this.getFileUrl(normalizedPath);
  }

  /**
   * Delete a file from DigitalOcean Spaces
   */
  async deleteFile(filePath: string): Promise<void> {
    // Normalize path
    const normalizedPath = filePath.replace(/\\/g, '/');
    
    // Delete from Spaces
    await this.s3.deleteObject({
      Bucket: this.bucket,
      Key: normalizedPath
    }).promise();
  }

  /**
   * Check if a file exists in DigitalOcean Spaces
   */
  async fileExists(filePath: string): Promise<boolean> {
    // Normalize path
    const normalizedPath = filePath.replace(/\\/g, '/');
    
    try {
      // Check if object exists
      await this.s3.headObject({
        Bucket: this.bucket,
        Key: normalizedPath
      }).promise();
      
      return true;
    } catch (error) {
      // If error is 404, file doesn't exist
      if ((error as AWS.AWSError).statusCode === 404) {
        return false;
      }
      
      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Get the URL for a file in DigitalOcean Spaces
   */
  getFileUrl(filePath: string): string {
    // Normalize path
    const normalizedPath = filePath.replace(/\\/g, '/');
    
    // Use CDN endpoint if enabled, otherwise use regular endpoint
    if (this.cdnEnabled && this.cdnEndpoint) {
      console.log(`Using CDN URL: https://${this.cdnEndpoint}/${normalizedPath}`);
      return `https://${this.cdnEndpoint}/${normalizedPath}`;
    }
    
    console.log(`Using standard Spaces URL: https://${this.bucket}.${this.endpoint}/${normalizedPath}`);
    return `https://${this.bucket}.${this.endpoint}/${normalizedPath}`;
  }
} 