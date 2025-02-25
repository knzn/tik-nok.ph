import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { VideoService } from '@/services/video.service'
import { VideoCard } from '@/components/features/Video/VideoCard'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import type { Video } from '@video-app/shared/types/video.types'

export function ShortsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [currentVideo, setCurrentVideo] = useState<Video | null>(null)
  const [nextVideos, setNextVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setLoading(true)
        const [currentVideo, { data: videos }] = await Promise.all([
          VideoService.getVideo(id!),
          VideoService.getVideos({ limit: 10 })
        ])
        
        setCurrentVideo(currentVideo)
        setNextVideos(videos.filter(v => v.id !== id))
      } catch (error) {
        console.error('Failed to load videos:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchVideos()
  }, [id])

  const handleVideoEnd = () => {
    if (nextVideos.length > 0) {
      navigate(`/shorts/${nextVideos[0].id}`)
    }
  }

  if (loading || !currentVideo) {
    return (
      <div className="h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="h-screen bg-black">
      <VideoCard
        video={currentVideo}
        isActive={true}
        onVideoEnd={handleVideoEnd}
      />
    </div>
  )
} 