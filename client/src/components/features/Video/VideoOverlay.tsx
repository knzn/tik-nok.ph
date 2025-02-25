import { useEffect, useRef } from 'react'
import { VideoPlayer } from './VideoPlayer'
import type { Video } from '@video-app/shared/types/video.types'

interface VideoOverlayProps {
  video: Video
  onClose: () => void
}

export const VideoOverlay = ({ video, onClose }: VideoOverlayProps) => {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  return (
    <div 
      ref={overlayRef}
      className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
      onClick={(e) => e.target === overlayRef.current && onClose()}
    >
      <div className="relative max-w-3xl w-full h-[80vh]">
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 text-white hover:text-gray-300"
        >
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <VideoPlayer src={video.hlsUrl} poster={video.thumbnailUrl} />
        
        <div className="mt-4 text-white">
          <h2 className="text-2xl font-bold">{video.title}</h2>
          {video.description && (
            <p className="mt-2 text-gray-300">{video.description}</p>
          )}
          <div className="mt-2 text-sm text-gray-400">
            <span>{video.views?.toLocaleString() || 0} views</span>
            <span className="mx-2">•</span>
            <span>{new Date(video.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </div>
  )
} 