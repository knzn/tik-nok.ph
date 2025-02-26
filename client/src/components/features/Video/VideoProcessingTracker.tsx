import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { VideoService } from '../../../services/video.service'
import { useToast } from '../../../components/ui/use-toast'
import { Bell } from 'lucide-react'
import axios from 'axios'

interface ProcessingVideo {
  id: string
  title: string
  timestamp: string
}

interface Video {
  title: string
  description: string
  userId: {
    _id: string
    username: string
  }
  quality: string[]
  status: string
  hlsUrl: string
  thumbnailUrl: string
  createdAt: string
  updatedAt: string
}

interface VideoProcessingCompleteEvent extends CustomEvent {
  detail: {
    video: Video
  }
}

const extractVideoId = (video: Video): string | null => {
  // Extract ID from hlsUrl or thumbnailUrl
  // Example URL: "http://localhost:3000/uploads/67b44fbebfc8a6ff28886fc5/playlist.m3u8"
  const urlPattern = /\/uploads\/([a-f0-9]{24})\//
  const match = video.hlsUrl?.match(urlPattern) || video.thumbnailUrl?.match(urlPattern)
  return match?.[1] || null
}

export function VideoProcessingTracker() {
  const [processingVideos, setProcessingVideos] = useState<ProcessingVideo[]>([])
  const { toast } = useToast()
  const navigate = useNavigate()
  const pollingRef = useRef<{ [key: string]: boolean }>({})

  useEffect(() => {
    // Handle video processing completion
    const handleVideoComplete = (event: VideoProcessingCompleteEvent) => {
      const { video } = event.detail
      
      // Extract video ID from URLs
      const videoId = extractVideoId(video)
      if (!videoId) {
        console.error('Could not extract video ID from URLs:', video)
        return
      }

      toast({
        title: 'Video Ready!',
        description: (
          <div 
            className="cursor-pointer" 
            onClick={() => navigate(`/video/${videoId}`)}
          >
            Click here to watch "{video.title}"
          </div>
        ),
        duration: 10000,
      })

      // Update processing videos list
      setProcessingVideos(prev => prev.filter(v => v.id !== videoId))
      
      // Stop polling for this video
      if (pollingRef.current[videoId]) {
        pollingRef.current[videoId] = false
      }
    }

    // Add event listener
    window.addEventListener(
      'videoProcessingComplete', 
      handleVideoComplete as EventListener
    )

    // Initial check for processing videos
    const checkProcessingVideos = async () => {
      try {
        const storedVideos: ProcessingVideo[] = JSON.parse(
          localStorage.getItem('processingVideos') || '[]'
        )

        // First, filter out any videos that are already known to not exist
        const validVideos = storedVideos.filter(video => {
          const notFoundCache = localStorage.getItem(`video_not_found_${video.id}`)
          if (notFoundCache) {
            const { timestamp } = JSON.parse(notFoundCache)
            // If the cache is less than 5 minutes old, filter out this video
            if (Date.now() - timestamp < 5 * 60 * 1000) {
              return false
            }
            // Clear old cache
            localStorage.removeItem(`video_not_found_${video.id}`)
          }
          return true
        })

        // Then apply the other validations
        const filteredVideos = validVideos.filter(video => 
          video && 
          typeof video.id === 'string' && 
          video.id.length === 24 && 
          typeof video.title === 'string' &&
          typeof video.timestamp === 'string' &&
          // Filter out videos older than 1 hour
          Date.now() - new Date(video.timestamp).getTime() < 60 * 60 * 1000
        )

        // Update localStorage with filtered list
        localStorage.setItem('processingVideos', JSON.stringify(filteredVideos))
        setProcessingVideos(filteredVideos)

        // Start polling for each valid video
        filteredVideos.forEach(video => {
          if (!pollingRef.current[video.id]) {
            pollingRef.current[video.id] = true
            VideoService.pollVideoStatus(video.id)
              .catch((error: unknown) => {
                if (axios.isAxiosError(error)) {
                  // Handle 403 Forbidden (private video)
                  if (error.response?.status === 403) {
                    // Remove this video from processing list - it's ready but private
                    const updatedVideos = processingVideos.filter(v => v.id !== video.id)
                    setProcessingVideos(updatedVideos)
                    localStorage.setItem('processingVideos', JSON.stringify(updatedVideos))
                    
                    // Show a toast notification for private video
                    toast({
                      title: 'Private Video Ready',
                      description: `Your private video "${video.title}" is now ready.`,
                      duration: 5000,
                    })
                    return
                  }
                  
                  // Handle 404 Not Found
                  if (error.response?.status === 404) {
                    // Remove this video from processing list immediately
                    const updatedVideos = processingVideos.filter(v => v.id !== video.id)
                    setProcessingVideos(updatedVideos)
                    localStorage.setItem('processingVideos', JSON.stringify(updatedVideos))
                    
                    // Cache the 404 response
                    const notFoundCache = {
                      id: video.id,
                      timestamp: Date.now()
                    }
                    localStorage.setItem(`video_not_found_${video.id}`, JSON.stringify(notFoundCache))
                  }
                }
              })
          }
        })
      } catch (error) {
        console.error('Error loading processing videos:', error)
        localStorage.removeItem('processingVideos')
        setProcessingVideos([])
      }
    }

    checkProcessingVideos()

    return () => {
      window.removeEventListener(
        'videoProcessingComplete', 
        handleVideoComplete as EventListener
      )
      // Clean up polling
      Object.keys(pollingRef.current).forEach(key => {
        pollingRef.current[key] = false
      })
    }
  }, [navigate, toast])

  if (processingVideos.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-primary text-white p-2 rounded-full animate-pulse">
        <Bell className="h-6 w-6" />
        <span className="absolute -top-1 -right-1 bg-red-500 text-xs rounded-full h-5 w-5 flex items-center justify-center">
          {processingVideos.length}
        </span>
      </div>
    </div>
  )
}