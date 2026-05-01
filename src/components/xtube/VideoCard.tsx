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
      className="group cursor-pointer"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {/* Thumbnail container */}
      <div className="aspect-video relative rounded-2xl overflow-hidden bg-[#1a1a1a] shadow-lg transition-all duration-300 group-hover:rounded-none group-hover:scale-105 group-hover:shadow-2xl z-0 group-hover:z-10">
        {!imgError ? (
          <img
            src={video.thumbnail}
            alt={video.title}
            className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 ${
              isPreviewPlaying ? 'opacity-0' : 'opacity-100'
            }`}
            loading="lazy"
            draggable={false}
            onError={() => setImgError(true)}
          />
        ) : (
          <video
            src={`${video.filePath}#t=1`}
            className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 ${
              isPreviewPlaying ? 'opacity-0' : 'opacity-100'
            }`}
            muted
            playsInline
            preload="metadata"
          />
        )}

        {/* Video preview layer */}
        {isPreviewPlaying && (
          <div className="absolute inset-0">
            <video
              ref={videoRef}
              src={video.filePath}
              className="w-full h-full object-cover"
              muted
              playsInline
              onLoadedMetadata={handleLoadedMetadata}
              preload="none"
            />
          </div>
        )}

        {/* Duration badge */}
        <div className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded backdrop-blur-md">
          {video.duration}
        </div>

        {/* Quality Badge (Optional Pro) */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="bg-[#ff0000] text-white text-[9px] font-bold px-1.5 py-0.5 rounded">4K</span>
        </div>
      </div>

      {/* Info Section */}
      <div className="flex gap-3 mt-3">
        {/* Avatar */}
        <div className="flex-shrink-0 mt-1">
          <div className="w-9 h-9 rounded-full bg-[#272727] flex items-center justify-center font-bold text-white text-xs border border-white/5">
            {video.category[0].toUpperCase()}
          </div>
        </div>

        {/* Text details */}
        <div className="flex-1 min-w-0 pr-4 relative">
          <h3 className="text-[15px] font-bold text-white line-clamp-2 leading-tight mb-1 group-hover:text-[#ff0000] transition-colors">
            {video.title}
          </h3>
          <div className="flex flex-col text-[13px] text-gray-400 font-medium">
            <div className="flex items-center gap-1 hover:text-white transition-colors">
              <span>XTube Studio</span>
              <CheckCircle2 className="w-3 h-3 text-gray-500 fill-gray-500" />
            </div>
            <div className="flex items-center gap-1.5">
              <span>{formatViews(video.views)}</span>
              <span className="w-0.5 h-0.5 rounded-full bg-gray-500" />
              <span>12 hours ago</span>
            </div>
          </div>

          {/* 3-dot menu */}
          <button className="absolute -right-1 top-0 p-1 text-gray-400 opacity-0 group-hover:opacity-100 hover:text-white transition-all">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
