import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { VideoService } from '../../../services/video.service'
import { useToast } from '../../../components/ui/use-toast'
import { Bell } from 'lucide-react'
import axios from 'axios'
import { Button } from '../../../components/ui/button'

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
  const [isVisible, setIsVisible] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const navigate = useNavigate()
  const pollingRef = useRef<{ [key: string]: boolean }>({})

  // Use useCallback for functions to prevent unnecessary re-renders
  const checkProcessingVideos = useCallback(async () => {
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
    } catch (error) {
      console.error('Error checking processing videos:', error)
    }
  }, [])

  // Use useCallback for the polling function
  const pollVideoStatus = useCallback(async (videoId: string) => {
    try {
      setIsLoading(true)
      await VideoService.pollVideoStatus(videoId)
      await checkProcessingVideos()
    } catch (error) {
      console.error('Error polling video status:', error)
    } finally {
      setIsLoading(false)
    }
  }, [checkProcessingVideos])

  // Add a method to check all processing videos
  const checkAllProcessingVideos = useCallback(async () => {
    console.log('Manually checking all processing videos')
    try {
      const storedVideos = JSON.parse(localStorage.getItem('processingVideos') || '[]')
      if (storedVideos.length === 0) {
        console.log('No processing videos to check')
        return
      }
      
      console.log(`Found ${storedVideos.length} processing videos to check`)
      
      // Check each video in sequence
      for (const video of storedVideos) {
        console.log(`Checking status for video: ${video.id}`)
        await pollVideoStatus(video.id)
        // Small delay between checks to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    } catch (error) {
      console.error('Error checking all processing videos:', error)
    }
  }, [pollVideoStatus])

  useEffect(() => {
    // Handle video processing completion
    const handleVideoProcessed = (event: CustomEvent) => {
      console.log('Video processed event received:', event.detail)
      const { videoId, title, isPrivate } = event.detail
      if (videoId) {
        console.log(`Removing video ${videoId} from processing videos`)
        // Remove from processing videos
        const storedVideos = JSON.parse(localStorage.getItem('processingVideos') || '[]')
        const updatedVideos = storedVideos.filter((v: ProcessingVideo) => v.id !== videoId)
        localStorage.setItem('processingVideos', JSON.stringify(updatedVideos))
        setProcessingVideos(updatedVideos)
        
        // Show toast notification with action button
        toast({
          title: isPrivate ? "Private Video Ready" : "Video Processing Complete",
          description: `Your video "${title}" is now ready to view.`,
          variant: "default",
          action: (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate(`/video/${videoId}`)}
              className="bg-primary text-white hover:bg-primary/90 border-none"
            >
              View Now
            </Button>
          )
        })
      }
    }

    // Add event listener for video processing completion
    window.addEventListener('videoProcessed' as any, handleVideoProcessed as EventListener)
    console.log('Added videoProcessed event listener')

    // Initial check
    checkProcessingVideos()
    
    // Also do an immediate check of all processing videos
    checkAllProcessingVideos()

    // Set up interval to check processing videos
    const interval = setInterval(checkProcessingVideos, 30000) // Check every 30 seconds
    console.log('Set up interval to check processing videos')
    
    // Set up interval to check all processing videos
    const pollInterval = setInterval(checkAllProcessingVideos, 60000) // Check all videos every minute

    // Update visibility based on processing videos
    setIsVisible(processingVideos.length > 0)

    return () => {
      window.removeEventListener('videoProcessed' as any, handleVideoProcessed as EventListener)
      clearInterval(interval)
      clearInterval(pollInterval)
      console.log('Cleaned up event listener and intervals')
    }
  }, [processingVideos.length, checkProcessingVideos, checkAllProcessingVideos, toast, navigate])

  // Use useMemo to prevent unnecessary re-renders
  const hasProcessingVideos = useMemo(() => processingVideos.length > 0, [processingVideos.length])

  if (!hasProcessingVideos) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="relative group">
        <button 
          className="bg-primary text-white p-2 rounded-full hover:bg-primary/90 transition-colors animate-pulse"
          onClick={() => checkAllProcessingVideos()}
          title="Check processing videos"
        >
          <Bell className="h-6 w-6 animate-bounce" />
          <span className="absolute -top-1 -right-1 bg-red-500 text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {processingVideos.length}
          </span>
        </button>
        
        {/* Dropdown panel */}
        <div className="absolute bottom-full right-0 mb-2 w-64 bg-white dark:bg-gray-800 rounded-md shadow-lg p-3 hidden group-hover:block border border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium mb-2 flex justify-between items-center">
            <span>Processing Videos</span>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                checkAllProcessingVideos();
              }}
              className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded"
              disabled={isLoading}
            >
              {isLoading ? 'Checking...' : 'Refresh'}
            </button>
          </h4>
          
          <div className="max-h-60 overflow-y-auto">
            {processingVideos.map(video => (
              <div key={video.id} className="py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                <div 
                  className="text-sm font-medium truncate hover:text-primary cursor-pointer"
                  onClick={() => navigate(`/video/${video.id}`)}
                >
                  {video.title}
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-gray-500">
                    {new Date(video.timestamp).toLocaleString()}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      pollVideoStatus(video.id);
                    }}
                    className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-0.5 rounded"
                    disabled={isLoading}
                  >
                    Check
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}