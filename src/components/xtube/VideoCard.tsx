'use client'

import { useAppStore, VideoData } from '@/store/useAppStore'
import { Play, Clock, MoreVertical, CheckCircle2 } from 'lucide-react'
import { useState, useRef, useCallback, useEffect } from 'react'

interface VideoCardProps {
  video: VideoData
}

export default function VideoCard({ video }: VideoCardProps) {
  const openPlayer = useAppStore((s) => s.openPlayer)

  const [isHovering, setIsHovering] = useState(false)
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false)
  const [imgError, setImgError] = useState(false)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
      if (videoRef.current) {
        videoRef.current.pause()
        videoRef.current.removeAttribute('src')
        videoRef.current.load()
      }
    }
  }, [])

  const handleMouseEnter = useCallback(() => {
    // Only enable hover preview on desktop
    if (typeof window !== 'undefined' && window.innerWidth < 768) return

    setIsHovering(true)

    // Start video preview after 800ms delay
    hoverTimeoutRef.current = setTimeout(() => {
      setIsPreviewPlaying(true)
    }, 800)
  }, [])

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false)
    setIsPreviewPlaying(false)

    // Clear the hover timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }

    // Stop and destroy video element
    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.removeAttribute('src')
      videoRef.current.load()
      videoRef.current = null
    }
  }, [])

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      // Start preview from 30% of duration
      videoRef.current.currentTime = videoRef.current.duration * 0.3
      videoRef.current.muted = true
      videoRef.current.play().catch(() => {
        // Autoplay may be blocked, silently ignore
      })
    }
  }, [])

  const handleClick = useCallback(() => {
    openPlayer(video.id)
  }, [openPlayer, video.id])

  const formatViews = (views: number): string => {
    if (views >= 1_000_000) {
      return `${(views / 1_000_000).toFixed(1)}M views`
    }
    if (views >= 1_000) {
      return `${(views / 1_000).toFixed(1)}K views`
    }
    return `${views} views`
  }

  return (
    <div
      className="group cursor-pointer flex flex-col gap-3"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {/* Thumbnail container */}
      <div className="aspect-video relative rounded-2xl overflow-hidden bg-gray-200 shadow-sm transition-all duration-300 group-hover:scale-[1.02] group-hover:shadow-xl z-0 group-hover:z-10">
        {!imgError ? (
          <img
            src={video.thumbnail}
            alt={video.title}
            className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 ${
              isPreviewPlaying ? 'opacity-0' : 'opacity-100'
            }`}
            loading="lazy"
            draggable={false}
            onError={() => setImgError(true)}
          />
        ) : (
          <video
            src={`${video.filePath}#t=1`}
            className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 ${
              isPreviewPlaying ? 'opacity-0' : 'opacity-100'
            }`}
            muted
            playsInline
            preload="metadata"
          />
        )}

        {/* Video preview layer */}
        {isPreviewPlaying && (
          <div className="absolute inset-0 z-20">
            <video
              ref={videoRef}
              src={video.filePath}
              className="w-full h-full object-cover"
              muted
              playsInline
              loop
              onLoadedMetadata={handleLoadedMetadata}
            />
          </div>
        )}

        {/* Duration badge */}
        <div className="absolute bottom-2.5 right-2.5 bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-sm z-30">
          {video.duration}
        </div>
      </div>

      {/* Info Section */}
      <div className="flex gap-4 px-1">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-500 text-sm border border-gray-100">
            {video.category[0].toUpperCase()}
          </div>
        </div>

        {/* Text details */}
        <div className="flex-1 min-w-0">
          <h3 className="text-[15px] font-bold text-gray-900 line-clamp-2 leading-tight group-hover:text-[#6d9bc3] transition-colors mb-1">
            {video.title}
          </h3>
          <div className="flex flex-col text-[13px] text-gray-500 font-bold">
            <div className="flex items-center gap-1">
              <span>XTube Studio</span>
              <CheckCircle2 className="w-3 h-3 text-[#6d9bc3]" />
            </div>
            <div className="flex items-center gap-1.5 text-gray-400">
              <span>{formatViews(video.views)}</span>
              <span className="w-1 h-1 rounded-full bg-gray-200" />
              <span>{new Date(video.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
