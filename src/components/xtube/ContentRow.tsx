'use client'

import { VideoData } from '@/store/useAppStore'
import VideoCard from './VideoCard'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useRef, useState, useCallback, useEffect } from 'react'

interface ContentRowProps {
  title: string
  videos: VideoData[]
  icon?: React.ReactNode
}

export default function ContentRow({ title, videos, icon }: ContentRowProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const updateScrollState = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const { scrollLeft, scrollWidth, clientWidth } = container
    // Small threshold to handle sub-pixel rounding
    const threshold = 2
    setCanScrollLeft(scrollLeft > threshold)
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - threshold)
  }, [])

  const scroll = useCallback((direction: 'left' | 'right') => {
    const container = scrollContainerRef.current
    if (!container) return

    const scrollAmount = container.clientWidth * 0.8
    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    })
  }, [])

  const handleScroll = useCallback(() => {
    updateScrollState()
  }, [updateScrollState])

  // Initialize scroll state on mount and when videos change
  useEffect(() => {
    updateScrollState()
    // Also update on resize since container width affects scrollability
    window.addEventListener('resize', updateScrollState)
    return () => window.removeEventListener('resize', updateScrollState)
  }, [updateScrollState, videos])

  // Empty state
  if (!videos || videos.length === 0) {
    return (
      <div className="mb-8 md:mb-12">
        <h2 className="text-lg md:text-xl font-bold text-white mb-4 flex items-center gap-2 px-4 md:px-12">
          {icon}
          {title}
        </h2>
        <p className="text-gray-500 text-sm px-4 md:px-12">
          No videos in this section
        </p>
      </div>
    )
  }

  return (
    <div className="relative group/row mb-8 md:mb-12">
      {/* Row Title */}
      <h2 className="text-lg md:text-xl font-bold text-white mb-4 flex items-center gap-2 px-4 md:px-12">
        {icon}
        {title}
      </h2>

      {/* Left Navigation Arrow */}
      {canScrollLeft && (
        <button
          onClick={() => scroll('left')}
          className="absolute top-1/2 -translate-y-1/2 z-10 left-2 md:left-8 w-10 h-10 md:w-12 md:h-12 bg-black/70 hover:bg-[#ff2d2d] text-white rounded-full flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-all backdrop-blur-sm border border-white/10 cursor-pointer"
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
        </button>
      )}

      {/* Right Navigation Arrow */}
      {canScrollRight && (
        <button
          onClick={() => scroll('right')}
          className="absolute top-1/2 -translate-y-1/2 z-10 right-2 md:right-8 w-10 h-10 md:w-12 md:h-12 bg-black/70 hover:bg-[#ff2d2d] text-white rounded-full flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-all backdrop-blur-sm border border-white/10 cursor-pointer"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
        </button>
      )}

      {/* Horizontal Scroll Container */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex gap-3 md:gap-4 overflow-x-auto scroll-smooth px-4 md:px-12 pb-4 no-scrollbar"
      >
        {videos.map((video) => (
          <div
            key={video.id}
            className="flex-shrink-0 w-[45%] sm:w-[30%] md:w-[22%] lg:w-[18%] xl:w-[15%]"
          >
            <VideoCard video={video} />
          </div>
        ))}
      </div>
    </div>
  )
}
