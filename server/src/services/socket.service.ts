import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import { config } from '../config/environment';

export class SocketService {
  private static io: Server;

  static init(server: HttpServer) {
    this.io = new Server(server, {
      cors: {
        origin: config.corsOrigin || '*',
        methods: ['GET', 'POST']
      }
    });

    this.io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      // Join video-specific room
      socket.on('join-video', (videoId) => {
        socket.join(`video:${videoId}`);
        console.log(`Client ${socket.id} joined video room: video:${videoId}`);
      });

      // Join user-specific room for notifications
      socket.on('join-user', (userId) => {
        socket.join(`user:${userId}`);
        console.log(`Client ${socket.id} joined user room: user:${userId}`);
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });

    console.log('Socket.IO service initialized');
  }

  static broadcastVideoProgress(videoId: string, progress: number, stage: string, details?: any) {
    if (!this.io) return;
    
    this.io.to(`video:${videoId}`).emit('video:progress', {
      videoId,
      progress,
      stage,
      ...details,
      timestamp: Date.now()
    });
  }

  static broadcastVideoStatus(videoId: string, status: 'processing' | 'ready' | 'failed') {
    if (!this.io) return;
    
    this.io.to(`video:${videoId}`).emit('video:status', {
      videoId,
      status,
      timestamp: Date.now()
    });
  }

  // Real-time comment notifications
  static notifyNewComment(videoId: string, comment: any) {
    if (!this.io) return;
    
    this.io.to(`video:${videoId}`).emit('comment:new', comment);
  }

  // Real-time like notifications
  static notifyNewLike(videoId: string, like: any) {
    if (!this.io) return;
    
    this.io.to(`video:${videoId}`).emit('like:new', like);
  }

  // User-specific notifications
  static sendUserNotification(userId: string, notification: any) {
    if (!this.io) return;
    
    this.io.to(`user:${userId}`).emit('notification:new', notification);
  }

  // Broadcast to all connected clients
  static broadcastGlobal(event: string, data: any) {
    if (!this.io) return;
    
    this.io.emit(event, data);
  }
} 