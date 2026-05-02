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
  const cardRef = useRef<HTMLDivElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
      if (videoRef.current) {
        videoRef.current.pause()
        videoRef.current.removeAttribute('src')
        videoRef.current.load()
      }
    }
  }, [])

  // Handle intersection for mobile/tablet auto-preview
  useEffect(() => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024
    if (!isMobile || !cardRef.current) return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Delay preview slightly to avoid flickering while scrolling fast
            hoverTimeoutRef.current = setTimeout(() => {
              setIsPreviewPlaying(true)
            }, 600)
          } else {
            if (hoverTimeoutRef.current) {
              clearTimeout(hoverTimeoutRef.current)
            }
            setIsPreviewPlaying(false)
            if (videoRef.current) {
              videoRef.current.pause()
            }
          }
        })
      },
      {
        threshold: 0.6, // 60% visibility to trigger
        rootMargin: '0px -10% 0px -10%' // Inset from sides to focus on center
      }
    )

    observerRef.current.observe(cardRef.current)

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [])

  const handleMouseEnter = useCallback(() => {
    // Only use hover on desktop
    const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024
    if (!isDesktop) return

    setIsHovering(true)

    // Start video preview after 800ms delay
    hoverTimeoutRef.current = setTimeout(() => {
      setIsPreviewPlaying(true)
    }, 800)
  }, [])

  const handleMouseLeave = useCallback(() => {
    const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024
    if (!isDesktop) return

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
      ref={cardRef}
      className="group cursor-pointer flex flex-col gap-3 transition-all duration-300"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {/* Thumbnail container */}
      <div className="aspect-video relative rounded-xl overflow-hidden bg-white/5 transition-all duration-300 z-0">
        {(!imgError && video.thumbnail && !video.thumbnail.includes('placeholder')) ? (
          <img
            src={video.thumbnail}
            alt={video.title}
            className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 ${
              isPreviewPlaying ? 'opacity-0' : 'opacity-100'
            }`}
            loading="lazy"
            draggable={false}
            onError={() => setImgError(true)}
          />
        ) : (
          <video
            src={`${video.filePath}#t=1`}
            className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 ${
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
        <div className="absolute bottom-2 right-2 bg-black/80 text-white text-[11px] font-medium px-1.5 py-0.5 rounded-md z-30">
          {video.duration}
        </div>
      </div>

      {/* Info Section */}
      <div className="flex gap-3 px-1">
        {/* Avatar */}
        <div className="flex-shrink-0 mt-1">
          <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center font-medium text-white text-sm">
            {video.category[0].toUpperCase()}
          </div>
        </div>

        {/* Text details */}
        <div className="flex-1 min-w-0">
          <h3 className="text-[14px] font-semibold text-white line-clamp-2 leading-tight group-hover:text-white transition-colors mb-1.5">
            {video.title}
          </h3>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex items-center gap-1 hover:text-white transition-colors">
                <span>Xtube Media</span>
                <CheckCircle2 className="w-3.5 h-3.5 fill-[#aaaaaa] text-[#0f0f0f]" />
              </div>
              <span className="w-1 h-1 rounded-full bg-white/20" />
              <span className="text-[10px] font-black text-[#ff2d2d] uppercase tracking-tighter bg-[#ff2d2d]/10 px-1.5 py-0.5 rounded-md">
                {video.category}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span>{formatViews(video.views)}</span>
              <span className="w-0.5 h-0.5 rounded-full bg-[#aaaaaa]" />
              <span>{new Date(video.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
      </div>
    </div>
  )
}
