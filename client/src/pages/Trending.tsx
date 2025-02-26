import { useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { VideoService } from '../services/video.service'
import { VideoCard } from '../components/features/Video/VideoCard'
import { Button } from '../components/ui/button'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'

const SCROLL_DISTANCE = 300

interface CategoryProps {
  title: string
  type: 'liked' | 'viewed' | 'commented'
}

const VideoCategory = ({ title, type }: CategoryProps) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  
  const { data: videos, isLoading } = useQuery({
    queryKey: ['topVideos', type],
    queryFn: () => VideoService.getTopVideos(type)
  })

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current
      const scrollAmount = direction === 'left' ? -SCROLL_DISTANCE : SCROLL_DISTANCE
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-6 sm:py-10">
        <LoadingSpinner />
      </div>
    )
  }

  if (!videos?.length) {
    return null
  }

  return (
    <div className="relative">
      <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-3 sm:mb-4">{title}</h2>
      
      <div className="group relative">
        {/* Left scroll button */}
        <Button
          variant="outline"
          size="icon"
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:flex"
          onClick={() => scroll('left')}
        >
          <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
        </Button>

        {/* Videos container */}
        <div
          ref={scrollContainerRef}
          className="flex overflow-x-auto scrollbar-hide gap-3 sm:gap-4 pb-4 px-1 sm:px-0"
          style={{ scrollSnapType: 'x mandatory' }}
        >
          {videos.map((video) => {
            // Get a safe video ID
            const videoId = video.id || video._id || '';
            
            return (
              <motion.div
                key={videoId}
                className="flex-none w-[220px] xs:w-[250px] sm:w-[280px] md:w-[300px]"
                style={{ scrollSnapAlign: 'start' }}
                whileHover={{ scale: 1.03 }}
                transition={{ duration: 0.2 }}
              >
                <VideoCard video={video as any} />
              </motion.div>
            );
          })}
        </div>

        {/* Right scroll button */}
        <Button
          variant="outline"
          size="icon"
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:flex"
          onClick={() => scroll('right')}
        >
          <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
        </Button>
      </div>
    </div>
  )
}

export default function Trending() {
  return (
    <div className="w-full max-w-[2000px] mx-auto py-4 px-3 sm:py-6 sm:px-4 md:px-6 space-y-8 sm:space-y-10 md:space-y-12">
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6 sm:mb-8">Trending</h1>
      
      <VideoCategory 
        title="Most Liked Videos" 
        type="liked" 
      />
      
      <VideoCategory 
        title="Most Viewed Videos" 
        type="viewed" 
      />
      
      <VideoCategory 
        title="Most Commented Videos" 
        type="commented" 
      />
    </div>
  )
}