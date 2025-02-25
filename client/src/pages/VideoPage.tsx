import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { VideoService } from '../services/video.service'
import { VideoPlayer } from '../components/features/Video/VideoPlayer'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { ThumbsUp, ThumbsDown, Share2, MoreVertical } from 'lucide-react'
import type { Video } from '@/types/video.types'
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card } from "@/components/ui/card"
import { VideoDetail } from '../components/features/Video/VideoDetail'

export const VideoPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [video, setVideo] = useState<Video | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false)

  useEffect(() => {
    let mounted = true

    const fetchVideo = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await VideoService.getVideo(id!)
        
        if (mounted && data) {
          setVideo(data)
          if (data.aspectRatio === 0.5625) {
            navigate(`/shorts/${id}`)
          }
        } else {
          setError('Video not found')
        }
      } catch (error: any) {
        console.error('Error fetching video:', error)
        if (mounted) {
          setError(error?.response?.data?.message || error?.message || 'Failed to load video')
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
  }, [id, navigate])

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (error || !video) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <div className="text-red-500">{error || 'Video not found'}</div>
      </div>
    )
  }

  if (video.status === 'processing') {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <div className="w-full max-w-4xl mx-4 bg-blue-50 p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-2">{video.title}</h2>
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
            <p className="text-blue-600">Processing video... This may take a few minutes.</p>
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
      <div className="flex flex-col lg:flex-row max-w-[1920px] mx-auto">
        {/* Main Content */}
        <div className="flex-grow lg:w-[65%] xl:w-[70%]">
          <div className="w-full bg-black">
            {loading ? (
              <div className="w-full aspect-video flex items-center justify-center">
                <LoadingSpinner />
              </div>
            ) : error ? (
              <div className="w-full aspect-video flex items-center justify-center">
                <div className="text-red-500">{error}</div>
              </div>
            ) : video?.status === 'processing' ? (
              <div className="w-full aspect-video flex items-center justify-center bg-secondary/10">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <h2 className="text-xl font-semibold mb-2">{video.title}</h2>
                  <p className="text-muted-foreground">Processing video... This may take a few minutes.</p>
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

          {video && !error && video.status !== 'processing' && (
            <VideoDetail videoId={video.id} />
          )}
        </div>

        {/* Suggested Videos Sidebar */}
        <div className="lg:w-[35%] xl:w-[30%] p-4">
          <ScrollArea className="h-[calc(100vh-80px)]">
            <div className="space-y-4">
              {/* Add your suggested videos here */}
              {/* Example placeholder cards */}
              {Array.from({ length: 10 }).map((_, i) => (
                <Card key={i} className="flex gap-2 p-2 hover:bg-accent cursor-pointer">
                  <div className="w-40 aspect-video bg-secondary rounded-sm" />
                  <div className="flex-1">
                    <h3 className="font-medium line-clamp-2">Suggested Video Title</h3>
                    <p className="text-sm text-muted-foreground">Channel Name</p>
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