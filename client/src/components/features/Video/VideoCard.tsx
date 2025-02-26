import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Video } from '../../../types/video.types'
import { Avatar, AvatarImage, AvatarFallback } from "../../../components/ui/avatar"
import { Lock, Eye, EyeOff } from 'lucide-react'

interface VideoCardProps {
  video: Video
  onVideoClick?: () => void
  compact?: boolean // Add compact prop for suggested videos sidebar
}

// Simple function to format date
const formatTimeAgo = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (isNaN(diffInSeconds)) return 'Unknown';
    
    if (diffInSeconds < 60) return `${diffInSeconds}s`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d`;
    if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)}mo`;
    
    return `${Math.floor(diffInSeconds / 31536000)}y`;
  } catch (error) {
    return 'Unknown';
  }
};

export const VideoCard = ({ video, onVideoClick, compact = false }: VideoCardProps) => {
  // Get username safely with fallback
  const username = video.userId?.username || 'Unknown User'
  const profilePicture = video.userId?.profilePicture
  const firstLetter = username.charAt(0).toUpperCase()
  const videoId = video.id || video._id // Handle both id formats
  
  // Format the date if available
  const formattedDate = video.createdAt 
    ? formatTimeAgo(video.createdAt) 
    : 'Unknown'

  const handleClick = () => {
    if (onVideoClick) onVideoClick()
    else window.location.href = `/video/${videoId}`
  }

  // Determine if video is private or unlisted
  const isPrivate = video.visibility === 'private'
  const isUnlisted = video.visibility === 'unlisted'

  return (
    <div 
      className={`group cursor-pointer overflow-hidden ${compact ? 'mb-1.5' : 'mb-3'}`}
      onClick={handleClick}
    >
      {/* Card layout with no padding */}
      <div className="flex flex-col">
        {/* Thumbnail */}
        <div className="relative aspect-video rounded-sm overflow-hidden">
          <img 
            src={video.thumbnailUrl} 
            alt={video.title}
            className={`w-full h-full object-cover ${isPrivate ? 'opacity-80' : ''}`}
          />
          
          {/* Duration badge */}
          {video.duration && (
            <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 py-0.5 rounded">
              {video.duration}
            </div>
          )}

          {/* Visibility indicators */}
          {isPrivate && (
            <div className="absolute top-1 right-1 bg-red-500/90 text-white text-xs px-1.5 py-0.5 rounded-sm flex items-center">
              <Lock className="w-3 h-3 mr-1" />
              <span>Private</span>
            </div>
          )}
          
          {isUnlisted && (
            <div className="absolute top-1 right-1 bg-yellow-500/90 text-white text-xs px-1.5 py-0.5 rounded-sm flex items-center">
              <EyeOff className="w-3 h-3 mr-1" />
              <span>Unlisted</span>
            </div>
          )}
        </div>
        
        {/* Content area with minimal padding */}
        <div className={`flex ${compact ? 'pt-1' : 'pt-1.5'}`}>
          {/* Avatar */}
          <div className="flex-shrink-0 mr-2 mt-0.5">
            <Avatar className={`${compact ? 'h-5 w-5' : 'h-6 w-6'}`}>
              <AvatarImage src={profilePicture} alt={username} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {firstLetter}
              </AvatarFallback>
            </Avatar>
          </div>
          
          {/* Text content */}
          <div className="flex-1 min-w-0">
            {/* Title with visibility indicator for compact view */}
            <div className="flex items-center">
              <h3 className={`${compact ? 'text-sm' : 'text-base'} font-semibold tracking-tight line-clamp-2 text-gray-900 dark:text-gray-50 leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 flex-1`}>
                {video.title}
              </h3>
              
              {/* Small visibility indicators for compact view */}
              {compact && isPrivate && (
                <Lock className="w-3 h-3 text-red-500 ml-1 flex-shrink-0" />
              )}
              
              {compact && isUnlisted && (
                <EyeOff className="w-3 h-3 text-yellow-500 ml-1 flex-shrink-0" />
              )}
            </div>
            
            {/* Username */}
            <Link 
              to={`/profile/${username}`}
              className="block text-xs text-gray-600 dark:text-gray-300 truncate hover:underline mt-0.5"
              onClick={(e) => e.stopPropagation()}
            >
              @{username}
            </Link>
            
            {/* Stats */}
            <div className="flex items-center text-xs text-gray-600 dark:text-gray-300 mt-1">
              <span className="font-medium">{video.views || 0} views</span>
              <span className="mx-1.5">•</span>
              <span className="font-medium">{video.likes || 0} likes</span>
              <span className="mx-1.5">•</span>
              <span>{formattedDate}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 