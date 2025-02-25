import { useEffect, useRef, useState } from 'react'
import Hls from 'hls.js'

interface VideoPlayerProps {
  src: string
  poster?: string
  aspectRatio?: number
  onEnded?: () => void
  autoPlay?: boolean
}

export function VideoPlayer({ 
  src, 
  poster, 
  aspectRatio = 16/9,
  onEnded,
  autoPlay = false 
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video || !src) return

    const isHLSSource = src.includes('.m3u8')
    
    if (isHLSSource && Hls.isSupported()) {
      if (hlsRef.current) {
        hlsRef.current.destroy()
      }

      const hls = new Hls({
        enableWorker: true,
        debug: true, // Enable debug logs
        xhrSetup: (xhr, url) => {
          // Log XHR requests
        }
      })

      hls.attachMedia(video)
      hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        hls.loadSource(src)
      })

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false)
        if (autoPlay) {
          video.play().catch(console.error)
        }
      })

      hls.on(Hls.Events.ERROR, (_, data) => {
        console.error('HLS error:', data)
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              setError('Network error while loading video')
              break
            case Hls.ErrorTypes.MEDIA_ERROR:
              setError('Media error: failed to decode video')
              break
            default:
              setError('Failed to load video')
          }
        }
      })

      hlsRef.current = hls
      return () => {
        hls.destroy()
      }
    } else {
      // Regular video source
      video.src = src
      video.load()
    }
  }, [src, autoPlay])

  return (
    <div 
      className="relative w-full bg-black overflow-hidden"
      style={{ 
        aspectRatio: '16/9', // Force 16:9 aspect ratio like YouTube
        maxHeight: 'calc(100vh - 169px)' // YouTube's max height calculation
      }}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center text-red-500 bg-black bg-opacity-50">
          {error}
        </div>
      )}
      <video
        ref={videoRef}
        poster={poster}
        controls
        playsInline
        className="w-full h-full object-contain"
        onLoadedData={() => setIsLoading(false)}
        onError={(e) => {
          console.error('Video error:', e)
          setError('Failed to load video')
        }}
        onEnded={onEnded}
        autoPlay={autoPlay}
      />
    </div>
  )
} 