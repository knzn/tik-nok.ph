import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Video } from '../../../types/video.types'
import { Avatar, AvatarImage, AvatarFallback } from "../../../components/ui/avatar"
import { ThumbsUp, Eye } from 'lucide-react'

interface VideoCardProps {
  video: Video
  onVideoClick?: () => void
}

export const VideoCard = ({ video, onVideoClick }: VideoCardProps) => {
  const [isHovered, setIsHovered] = useState(false)

  // Get username safely with fallback
  const username = video.userId?.username || 'Unknown User'
  const profilePicture = video.userId?.profilePicture
  const firstLetter = username.charAt(0).toUpperCase()
  const videoId = video.id || video._id // Handle both id formats

  return (
    <div 
      className="video-card group cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => {
        if (onVideoClick) onVideoClick()
        else window.location.href = `/video/${videoId}`
      }}
    >
      {/* Video Thumbnail */}
      <img 
        src={video.thumbnailUrl} 
        alt={video.title}
        className="w-full h-full object-cover"
      />

      {/* Overlay Gradient */}
      <div className="video-overlay" />

      {/* Video Info */}
      <div className="absolute bottom-20 left-4 right-16 z-10">
        <h3 className="text-white text-lg font-semibold line-clamp-2">
          {video.title}
        </h3>
        <div className="flex items-center gap-4 mt-2 text-white/80">
          <div className="flex items-center gap-1">
            <ThumbsUp className="w-4 h-4" />
            <span>{video.likes || 0}</span>
          </div>
          <div className="flex items-center gap-1">
            <Eye className="w-4 h-4" />
            <span>{video.views || 0}</span>
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className="absolute bottom-4 left-4 flex items-center gap-2 z-10">
        <Avatar className="h-10 w-10">
          <AvatarImage 
            src={profilePicture} 
            alt={username} 
          />
          <AvatarFallback className="bg-primary text-primary-foreground">
            {firstLetter}
          </AvatarFallback>
        </Avatar>
        <Link 
          to={`/profile/${username}`}
          className="text-white font-medium hover:underline"
          onClick={(e) => {
            e.stopPropagation()
          }}
        >
          @{username}
        </Link>
      </div>
    </div>
  )
} 