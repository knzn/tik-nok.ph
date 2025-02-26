import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSocket } from './useSocket'

export const useVideoProgress = (videoId: string) => {
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<'processing' | 'ready' | 'failed'>('processing')
  const navigate = useNavigate()
  const socket = useSocket()
  
  useEffect(() => {
    if (!socket || !videoId) return
    
    // Join video-specific room
    socket.emit('join-video', videoId)
    
    // Listen for progress updates
    socket.on('video:progress', (data: any) => {
      if (data.videoId === videoId) {
        setProgress(data.progress * 100) // Convert from 0-1 to 0-100
      }
    })
    
    // Listen for status updates
    socket.on('video:status', (data: any) => {
      if (data.videoId === videoId) {
        setStatus(data.status)
        if (data.status === 'ready') {
          navigate(`/video/${videoId}`)
        }
      }
    })
    
    // Clean up event listeners
    return () => {
      socket.off('video:progress')
      socket.off('video:status')
    }
  }, [socket, videoId, navigate])
  
  return { progress, status }
} 