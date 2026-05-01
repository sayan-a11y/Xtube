'use client'

import { useAppStore, VideoData } from '@/store/useAppStore'
import { CheckCircle2 } from 'lucide-react'
import { useState, useRef, useCallback, useEffect } from 'react'

interface VideoCardProps {
  video: VideoData
}

function formatViews(views: number): string {
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M views`
  if (views >= 1_000) return `${(views / 1_000).toFixed(1)}K views`
  return `${views} views`
}

export default function VideoCard({ video }: VideoCardProps) {
  const openPlayer = useAppStore((s) => s.openPlayer)

  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false)
  const [imgError, setImgError] = useState(false)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
      if (videoRef.current) {
        videoRef.current.pause()
        videoRef.current.removeAttribute('src')
        videoRef.current.load()
      }
    }
  }, [])

  const handleMouseEnter = useCallback(() => {
    // Desktop only preview
    if (typeof window !== 'undefined' && window.innerWidth < 768) return
    hoverTimeoutRef.current = setTimeout(() => setIsPreviewPlaying(true), 800)
  }, [])

  const handleMouseLeave = useCallback(() => {
    setIsPreviewPlaying(false)
    if (hoverTimeoutRef.current) { clearTimeout(hoverTimeoutRef.current); hoverTimeoutRef.current = null }
    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.removeAttribute('src')
      videoRef.current.load()
      videoRef.current = null
    }
  }, [])

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = videoRef.current.duration * 0.3
      videoRef.current.muted = true
      videoRef.current.play().catch(() => {})
    }
  }, [])

  const handleClick = useCallback(() => openPlayer(video.id), [openPlayer, video.id])

  return (
    <div
      className="group cursor-pointer flex flex-col gap-3 bg-white rounded-[20px] p-3 sm:p-4 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {/* ── Thumbnail ─────────────────────────────────────────────── */}
      <div className="aspect-video relative rounded-xl sm:rounded-2xl overflow-hidden bg-gray-100 shadow-sm z-0">
        {!imgError ? (
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
          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
            <span className="text-gray-400 text-4xl font-black">{video.title[0]?.toUpperCase()}</span>
          </div>
        )}

        {/* Desktop hover video preview */}
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
        <div className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-sm z-30 tabular-nums">
          {video.duration}
        </div>

        {/* Play overlay on hover */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300 z-10 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-white/0 group-hover:bg-white/20 flex items-center justify-center transition-all duration-300 scale-75 group-hover:scale-100">
            <svg className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity fill-white ml-0.5" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      </div>

      {/* ── Info ──────────────────────────────────────────────────── */}
      <div className="flex gap-3 px-0.5">
        {/* Avatar */}
        <div className="flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#ff2d2d]/10 flex items-center justify-center font-black text-[#ff2d2d] text-sm border-2 border-white shadow-sm">
          {video.category[0]?.toUpperCase()}
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <h3 className="text-[13px] sm:text-[14px] font-bold text-gray-900 line-clamp-2 leading-tight group-hover:text-[#ff2d2d] transition-colors mb-1">
            {video.title}
          </h3>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1 text-[11px] text-[#6b7280] font-semibold">
              <span>Xtube Studio</span>
              <CheckCircle2 className="w-3 h-3 text-[#ff2d2d] flex-shrink-0" />
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-[#9ca3af]">
              <span>{formatViews(video.views)}</span>
              <span className="w-1 h-1 rounded-full bg-gray-200 flex-shrink-0" />
              <span>{new Date(video.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
