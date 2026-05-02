'use client'

import { useAppStore, VideoData } from '@/store/useAppStore'
import { Play, Info } from 'lucide-react'
import { useState, useEffect, useCallback, useRef } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import Image from 'next/image'

const AUTO_ADVANCE_INTERVAL = 6000
const MAX_HERO_SLIDES = 5

export default function HeroSection() {
  const videos = useAppStore((s) => s.videos)
  const videosLoading = useAppStore((s) => s.videosLoading)
  const heroVideoIndex = useAppStore((s) => s.heroVideoIndex)
  const setHeroVideoIndex = useAppStore((s) => s.setHeroVideoIndex)
  const openPlayer = useAppStore((s) => s.openPlayer)

  const heroSlides = videos.slice(0, MAX_HERO_SLIDES)
  const currentIndex = heroVideoIndex
  const [isTransitioning, setIsTransitioning] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Clear and restart the auto-advance timer
  const resetTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (heroSlides.length > 1) {
      timerRef.current = setInterval(() => {
        setIsTransitioning(true)
        setTimeout(() => {
          setHeroVideoIndex((prev) => (prev + 1) % heroSlides.length)
          setIsTransitioning(false)
        }, 500)
      }, AUTO_ADVANCE_INTERVAL)
    }
  }, [heroSlides.length, setHeroVideoIndex])

  // Start auto-advance on mount and when slides change
  useEffect(() => {
    resetTimer()
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [resetTimer])

  // Reset timer on manual dot click
  const goToSlide = useCallback(
    (index: number) => {
      if (index === currentIndex) return
      setIsTransitioning(true)
      setTimeout(() => {
        setHeroVideoIndex(index)
        setIsTransitioning(false)
      }, 500)
      resetTimer()
    },
    [currentIndex, setHeroVideoIndex, resetTimer]
  )

  // Loading skeleton
  if (videosLoading) {
    return (
      <div className="relative w-full h-[50vh] sm:h-[60vh] md:h-[70vh] lg:h-[80vh] bg-[#0b0f1a] overflow-hidden">
        <Skeleton className="absolute inset-0 bg-white/5" />
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12 lg:p-16 space-y-4">
          <Skeleton className="h-8 w-24 rounded-full bg-white/10" />
          <Skeleton className="h-12 w-3/4 bg-white/10" />
          <Skeleton className="h-4 w-1/2 bg-white/10" />
          <Skeleton className="h-4 w-2/3 bg-white/10" />
          <div className="flex gap-3 pt-2">
            <Skeleton className="h-12 w-36 rounded-lg bg-white/10" />
            <Skeleton className="h-12 w-36 rounded-lg bg-white/10" />
          </div>
        </div>
      </div>
    )
  }

  // No videos placeholder
  if (heroSlides.length === 0) {
    return (
      <div className="relative w-full h-[50vh] sm:h-[60vh] md:h-[70vh] lg:h-[80vh] bg-[#0b0f1a] overflow-hidden flex items-center justify-center">
        {/* Animated background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#ff2d2d]/30 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#ff2d2d]/20 rounded-full blur-[100px] animate-pulse [animation-delay:2s]" />
        </div>
        <div className="text-center space-y-4 z-10">
          <Play className="w-16 h-16 text-[#ff2d2d]/40 mx-auto" />
          <p className="text-2xl md:text-3xl font-bold text-white/40">No videos yet</p>
          <p className="text-sm text-gray-500">Content will appear here once uploaded</p>
        </div>
      </div>
    )
  }

  const currentVideo = heroSlides[currentIndex]

  return (
    <div className="relative w-full h-[50vh] sm:h-[60vh] md:h-[70vh] lg:h-[80vh] overflow-hidden group">
      {/* Background images - stacked for crossfade */}
      {heroSlides.map((video, index) => (
        <div
          key={video.id}
          className="absolute inset-0 transition-all duration-700 ease-in-out"
          style={{
            opacity: index === currentIndex ? (isTransitioning ? 0 : 1) : 0,
            transform: index === currentIndex
              ? isTransitioning
                ? 'scale(1.05)'
                : 'scale(1)'
              : 'scale(1.05)',
          }}
        >
          {/* Fallback gradient behind image */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460]" />
          {/* Thumbnail */}
          {(video.thumbnail && !video.thumbnail.includes('placeholder')) ? (
            <Image
              src={video.thumbnail}
              alt={video.title}
              fill
              priority={index === currentIndex}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <video
              src={`${video.filePath}#t=1`}
              className="absolute inset-0 w-full h-full object-cover"
              muted
              playsInline
              preload="metadata"
            />
          )}
        </div>
      ))}

      {/* Bottom gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0b0f1a] via-[#0b0f1a]/60 to-transparent pointer-events-none" />

      {/* Side gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#0b0f1a]/90 via-transparent to-transparent pointer-events-none" />

      {/* Content overlay */}
      <div
        className="absolute bottom-0 left-0 right-0 p-6 md:p-12 lg:p-16 pb-12 md:pb-14 z-10 transition-all duration-700 ease-in-out"
        style={{
          opacity: isTransitioning ? 0 : 1,
          transform: isTransitioning ? 'translateY(20px)' : 'translateY(0)',
        }}
      >
        {currentVideo && (
          <div className="space-y-3 md:space-y-4 max-w-2xl">
            {/* Category badge */}
            <span className="inline-block bg-[#ff2d2d] text-white text-xs font-semibold px-3 py-1 rounded-full">
              {currentVideo.category}
            </span>

            {/* Title */}
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight drop-shadow-lg">
              {currentVideo.title}
            </h2>

            {/* Description */}
            <p className="text-sm md:text-base text-gray-300 max-w-xl line-clamp-2 drop-shadow">
              {currentVideo.description}
            </p>

            {/* Video meta info */}
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span>{currentVideo.duration}</span>
              <span className="w-1 h-1 rounded-full bg-gray-500" />
              <span>{currentVideo.views.toLocaleString()} views</span>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={() => openPlayer(currentVideo.id)}
                className="bg-[#ff2d2d] hover:bg-[#e62626] text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
                aria-label={`Watch ${currentVideo.title}`}
              >
                <Play className="w-5 h-5 fill-white" />
                <span>Watch Now</span>
              </button>
              <button
                onClick={() => openPlayer(currentVideo.id)}
                className="bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 backdrop-blur-sm transition-all active:scale-95"
                aria-label={`More info about ${currentVideo.title}`}
              >
                <Info className="w-5 h-5" />
                <span>More Info</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Dot indicators */}
      {heroSlides.length > 1 && (
        <div className="absolute bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20">
          {heroSlides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`transition-all duration-300 rounded-full ${
                index === currentIndex
                  ? 'w-6 h-2.5 bg-[#ff2d2d]'
                  : 'w-2.5 h-2.5 bg-white/30 hover:bg-white/50'
              }`}
              aria-label={`Go to slide ${index + 1}`}
              aria-current={index === currentIndex ? 'true' : undefined}
            />
          ))}
        </div>
      )}

      {/* Progress bar for auto-advance */}
      {heroSlides.length > 1 && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/5 z-20">
          <div
            key={currentIndex}
            className="h-full bg-[#ff2d2d]/60 origin-left"
            style={{
              animation: `progress ${AUTO_ADVANCE_INTERVAL}ms linear forwards`,
            }}
          />
        </div>
      )}
    </div>
  )
}
