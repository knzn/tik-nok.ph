import { StorageService } from './storage.interface';
import { LocalStorageService } from './local-storage.service';
import { SpacesStorageService } from './spaces-storage.service';

/**
 * Factory class for creating the appropriate storage service
 */
export class StorageFactory {
  private static instance: StorageService;

  /**
   * Get the appropriate storage service based on environment configuration
   */
  static getStorageService(): StorageService {
    if (!this.instance) {
      // Check if DigitalOcean Spaces should be used
      const useSpaces = process.env.USE_SPACES_STORAGE === 'true';
      
      try {
        if (useSpaces) {
          console.log('Using DigitalOcean Spaces for storage');
          console.log(`- Endpoint: ${process.env.DO_SPACES_ENDPOINT}`);
          console.log(`- Bucket: ${process.env.DO_SPACES_BUCKET}`);
          console.log(`- CDN Enabled: ${process.env.DO_CDN_ENABLED}`);
          
          this.instance = new SpacesStorageService();
        } else {
          console.log('Using local filesystem for storage');
          this.instance = new LocalStorageService();
        }
      } catch (error) {
        console.error('Failed to initialize storage service:', error);
        console.log('Falling back to local filesystem storage');
        this.instance = new LocalStorageService();
      }
    }
    
    return this.instance;
  }
} 