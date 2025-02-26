import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { VideoService } from '../services/video.service'
import { VideoPlayer } from '../components/features/Video/VideoPlayer'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { Button } from '../components/ui/button'
import { Avatar } from '../components/ui/avatar'
import { Separator } from '../components/ui/separator'
import { ThumbsUp, ThumbsDown, Share2, MoreVertical } from 'lucide-react'
import type { Video } from '../types/video.types'
import { ScrollArea } from "../components/ui/scroll-area"
import { Card } from "../components/ui/card"
import { VideoDetail } from '../components/features/Video/VideoDetail'
import { PrivateVideoMessage } from '../components/features/Video/PrivateVideoMessage'
import { useAuthStore } from '../stores/authStore'

export const VideoPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isAuthenticated, token, user } = useAuthStore()
  const [video, setVideo] = useState<Video | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isPrivate, setIsPrivate] = useState(false)
  const [privateMessage, setPrivateMessage] = useState('')
  const [redirectIn, setRedirectIn] = useState(5)
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false)

  useEffect(() => {
    let mounted = true

    const fetchVideo = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Log authentication status
        console.log('Authentication status:', {
          isAuthenticated,
          hasToken: !!token,
          tokenLength: token ? token.length : 0,
          userId: user?.id,
          videoId: id
        })
        
        // Check if we have a token but no user - this indicates a potential auth issue
        if (token && !user) {
          console.warn('Token exists but user is null - possible auth state inconsistency')
          // Try to parse user from localStorage directly as a fallback
          const userJson = localStorage.getItem('user')
          if (userJson) {
            try {
              const parsedUser = JSON.parse(userJson)
              console.log('Retrieved user from localStorage:', {
                userId: parsedUser.id,
                username: parsedUser.username
              })
            } catch (parseError) {
              console.error('Failed to parse user from localStorage:', parseError)
            }
          }
        }
        
        console.log('Fetching video with ID:', id)
        
        const data = await VideoService.getVideo(id!)
        
        console.log('Video data received:', {
          videoId: data?._id || data?.id,
          userId: data?.userId?._id || data?.userId,
          visibility: data?.visibility,
          status: data?.status
        })
        
        if (mounted && data) {
          setVideo(data as unknown as Video)
          if (data.aspectRatio === 0.5625) {
            navigate(`/shorts/${id}`)
          }
        } else {
          setError('Video not found')
        }
      } catch (error: any) {
        console.error('Error fetching video:', error)
        console.log('Error details:', {
          status: error?.response?.status,
          message: error?.response?.data?.message,
          data: error?.response?.data
        })
        
        if (mounted) {
          // Check if it's a private video error
          if (error?.response?.status === 403 && error?.response?.data?.message) {
            console.log('Private video detected:', error.response.data)
            setIsPrivate(true)
            setPrivateMessage(error.response.data.message)
            setRedirectIn(error.response.data.redirectIn || 5)
            
            // If user is not authenticated and trying to access a private video
            if (!isAuthenticated && error.response.data.message.includes('Please log in')) {
              console.log('Redirecting to login for private video access')
              // Redirect to login page with return URL
              const returnUrl = `/video/${id}`
              navigate(`/login?returnUrl=${encodeURIComponent(returnUrl)}`)
            }
          } else {
            setError(error?.response?.data?.message || error?.message || 'Failed to load video')
          }
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    if (id) {
      fetchVideo()
    }

    return () => {
      mounted = false
    }
  }, [id, navigate, isAuthenticated, token, user])

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <LoadingSpinner size={32} />
      </div>
    )
  }

  if (isPrivate) {
    return <PrivateVideoMessage message={privateMessage} redirectIn={redirectIn} />
  }

  if (error || !video) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <div className="text-red-500">{error || 'Video not found'}</div>
      </div>
    )
  }

  const isProcessing = video.status === 'processing' || video.status === 'processing' as any;

  if (isProcessing) {
    return (
      <div className="w-full h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-4xl mx-auto bg-blue-50 p-4 rounded-lg">
          <h2 className="text-lg sm:text-xl font-semibold mb-2">{video.title}</h2>
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
            <p className="text-blue-600 text-sm sm:text-base">Processing video... This may take a few minutes.</p>
          </div>
        </div>
      </div>
    )
  }

  const formatViews = (views: number) => {
    if (views >= 1000000) {
      return `${(views / 1000000).toFixed(1)}M`
    } else if (views >= 1000) {
      return `${(views / 1000).toFixed(1)}K`
    }
    return views.toString()
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex flex-col lg:flex-row max-w-[2000px] mx-auto">
        {/* Main Content */}
        <div className="flex-grow lg:w-[65%] xl:w-[70%]">
          <div className="w-full bg-black">
            {loading ? (
              <div className="w-full aspect-video flex items-center justify-center">
                <LoadingSpinner size={32} />
              </div>
            ) : error ? (
              <div className="w-full aspect-video flex items-center justify-center">
                <div className="text-red-500 text-sm sm:text-base">{error}</div>
              </div>
            ) : isProcessing ? (
              <div className="w-full aspect-video flex items-center justify-center bg-secondary/10 p-4">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-primary mx-auto mb-3 sm:mb-4"></div>
                  <h2 className="text-base sm:text-xl font-semibold mb-1 sm:mb-2">{video.title}</h2>
                  <p className="text-muted-foreground text-sm sm:text-base">Processing video... This may take a few minutes.</p>
                </div>
              </div>
            ) : (
              <div className="w-full aspect-video">
                <VideoPlayer 
                  src={video?.hlsUrl} 
                  poster={video?.thumbnailUrl}
                  aspectRatio={video?.aspectRatio || 16/9}
                  autoPlay
                />
              </div>
            )}
          </div>

          {video && !error && !isProcessing && (
            <div className="px-3 sm:px-4 md:px-6">
              <VideoDetail videoId={video.id} />
            </div>
          )}
        </div>

        {/* Suggested Videos Sidebar */}
        <div className="lg:w-[35%] xl:w-[30%] p-3 sm:p-4">
          <h3 className="text-base sm:text-lg font-medium mb-3 sm:mb-4 px-1">Suggested Videos</h3>
          <ScrollArea className="h-[calc(100vh-120px)] sm:h-[calc(100vh-130px)]">
            <div className="space-y-3 sm:space-y-4 pr-2">
              {/* Add your suggested videos here */}
              {/* Example placeholder cards */}
              {Array.from({ length: 10 }).map((_, i) => (
                <Card key={i} className="flex gap-2 p-2 hover:bg-accent cursor-pointer">
                  <div className="w-32 sm:w-40 aspect-video bg-secondary rounded-sm" />
                  <div className="flex-1">
                    <h3 className="text-sm sm:text-base font-medium line-clamp-2">Suggested Video Title</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">Channel Name</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <span>123K views</span>
                      <span>•</span>
                      <span>2 days ago</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  )
}

export default VideoPage;