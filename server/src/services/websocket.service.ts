import WebSocket from 'ws'
import { Server } from 'http'

interface ProcessingProgress {
  stage: string
  progress: number
  eta?: number
  currentTask?: string
}

export class WebSocketService {
  private static wss: WebSocket.Server

  static init(server: Server) {
    this.wss = new WebSocket.Server({ server })
    console.log('WebSocket server initialized')
  }

  static broadcastProgress(videoId: string, progress: number, stage: string, details?: any) {
    if (!this.wss) return

    this.wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'progress',
          videoId,
          progress,
          stage,
          ...details,
          timestamp: Date.now()
        }))
      }
    })
  }

  static broadcastStatus(videoId: string, status: 'processing' | 'ready' | 'failed') {
    if (!this.wss) return

    this.wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'status',
          videoId,
          status,
          timestamp: Date.now()
        }))
      }
    })
  }
} 