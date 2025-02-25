import Queue from 'bull';
import { VideoProcessingService } from './video-processing.service';
import { config } from '../config/environment';

interface VideoProcessingJob {
  videoId: string;
  inputPath: string;
}

export class QueueService {
  private static videoQueue: Queue.Queue<VideoProcessingJob>;

  static init() {
    this.videoQueue = new Queue<VideoProcessingJob>('video-processing', {
      redis: {
        host: config.redisHost,
        port: Number(config.redisPort),
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    });

    this.videoQueue.process(async (job) => {
      const { videoId, inputPath } = job.data;
      
      try {
        await VideoProcessingService.processVideo(inputPath, videoId);
        return { success: true, videoId };
      } catch (error) {
        console.error(`Failed to process video ${videoId}:`, error);
        throw error;
      }
    });

    this.videoQueue.on('completed', (job) => {
      console.log(`Video processing completed for job ${job.id}`);
    });

    this.videoQueue.on('failed', (job, error) => {
      console.error(`Video processing failed for job ${job.id}:`, error);
    });

    console.log('Queue service initialized');
  }

  static async addVideoJob(videoId: string, inputPath: string) {
    return this.videoQueue.add({ videoId, inputPath });
  }
} 