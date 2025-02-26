import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import { promises as fs } from 'fs';
import { VideoController } from '../controllers/video.controller';
import { authMiddleware } from '../middleware/auth';
import ffmpeg from 'fluent-ffmpeg';

// Create upload directories
const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');
const TEMP_UPLOAD_DIR = path.resolve(process.cwd(), 'uploads', 'temp');

// Ensure upload directories exist
async function ensureUploadDirs() {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    await fs.mkdir(TEMP_UPLOAD_DIR, { recursive: true });
    console.log('Upload directories created');
  } catch (error) {
    console.error('Failed to create upload directories:', error);
  }
}

// Create upload directories when module loads
ensureUploadDirs();

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, TEMP_UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

// Helper function to get video duration using ffprobe
const getVideoDuration = (filePath: string): Promise<number> => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      resolve(metadata.format.duration || 0);
    });
  });
};

// Configure multer upload
const upload = multer({
  storage,
  fileFilter: async (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Not a video file'));
    }
  },
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  }
});

// Create router
const router = Router();

// Duration check middleware
const checkVideoDuration = async (req: any, res: any, next: any) => {
  try {
    if (!req.file) {
      return next();
    }

    const duration = await getVideoDuration(req.file.path);
    
    if (duration > 120) { // 120 seconds = 2 minutes
      // Delete the uploaded file
      await fs.unlink(req.file.path).catch(console.error);
      return res.status(400).json({ 
        error: 'Video duration exceeds the 2-minute limit',
        details: {
          duration: Math.round(duration),
          maxDuration: 120
        }
      });
    }
    
    // Add duration to request for later use
    req.videoDuration = duration;
    next();
  } catch (error) {
    console.error('Error checking video duration:', error);
    next(error);
  }
};

// Upload route with proper typing
router.post('/upload', 
  authMiddleware, 
  upload.single('video'), 
  checkVideoDuration,
  (req: Request, res: Response, next: NextFunction) => {
    VideoController.uploadVideo(req as any, res)
      .catch((error: Error) => next(error));
  }
);

export default router; 