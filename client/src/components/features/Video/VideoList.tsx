import { useQuery } from '@tanstack/react-query'
import { VideoService } from '@/services/video.service'
import { VideoCard } from './VideoCard'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import type { Video } from '@video-app/shared/types/video.types'

export function VideoList() {
  const { data: videos, isLoading, error } = useQuery<Video[], Error>({
    queryKey: ['videos'],
    queryFn: () => VideoService.getVideos(),
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    return (
      <ErrorMessage 
        title="Failed to load videos" 
        message={error.message || 'Unknown error'} 
      />
    )
  }

  if (!videos || videos.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        No videos found
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {videos.map((video) => (
        <VideoCard key={video.id} video={video} />
      ))}
    </div>
  )
} 