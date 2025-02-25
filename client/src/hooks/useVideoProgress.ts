import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export const useVideoProgress = (videoId: string) => {
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<'processing' | 'ready' | 'failed'>('processing')
  const navigate = useNavigate()
  
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:3000')
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.videoId === videoId) {
        if (data.type === 'progress') {
          setProgress(data.progress)
        }
        if (data.type === 'status') {
          setStatus(data.status)
          if (data.status === 'ready') {
            navigate(`/video/${videoId}`)
          }
        }
      }
    }
    
    return () => ws.close()
  }, [videoId, navigate])
  
  return { progress, status }
} 