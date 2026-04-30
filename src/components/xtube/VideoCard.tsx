'use client'

import { useAppStore, VideoData } from '@/store/useAppStore'
import { Play, Clock } from 'lucide-react'
import { useState, useRef, useCallback, useEffect } from 'react'

interface VideoCardProps {
  video: VideoData
}

export default function VideoCard({ video }: VideoCardProps) {
  const openPlayer = useAppStore((s) => s.openPlayer)

  const [isHovering, setIsHovering] = useState(false)
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false)

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
      className="relative group cursor-pointer rounded-xl overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(255,45,45,0.15)] hover:z-10"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label={`Play ${video.title}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleClick()
        }
      }}
    >
      {/* Thumbnail container */}
      <div className="aspect-video relative overflow-hidden bg-[#1a1f2e]">
        {/* Thumbnail image */}
        <img
          src={video.thumbnail}
          alt={video.title}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            isPreviewPlaying ? 'opacity-0' : 'opacity-100'
          }`}
          loading="lazy"
          draggable={false}
        />

        {/* Video preview layer */}
        {isPreviewPlaying && (
          <div
            className="absolute inset-0 transition-opacity duration-300"
            style={{ opacity: isPreviewPlaying ? 1 : 0 }}
          >
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

        {/* Play icon overlay (on hover) */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-[#ff2d2d]/90 flex items-center justify-center shadow-lg">
              <Play className="w-5 h-5 text-white fill-white ml-0.5" />
            </div>
            <span className="text-white text-sm font-medium">Watch Now</span>
          </div>
        </div>

        {/* Duration badge */}
        <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-0.5 rounded flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {video.duration}
        </div>

        {/* Category badge */}
        <div className="absolute top-2 left-2 bg-[#ff2d2d] text-white text-xs px-2 py-0.5 rounded-full">
          {video.category}
        </div>
      </div>

      {/* Title & info below thumbnail */}
      <div className="p-2">
        <h3 className="text-sm font-medium text-white mt-2 truncate" title={video.title}>
          {video.title}
        </h3>
        <p className="text-xs text-gray-400 mt-1">{formatViews(video.views)}</p>
      </div>
    </div>
  )
}
