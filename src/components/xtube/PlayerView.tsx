'use client'

import { useAppStore, VideoData } from '@/store/useAppStore'
import Hls from 'hls.js'
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Volume1,
  Maximize,
  Minimize,
  ChevronLeft,
  ThumbsUp,
  Share2,
  Clock,
  Eye,
  Settings,
  SkipForward,
  Loader2,
} from 'lucide-react'
import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return '0:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatViews(views: number): string {
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M views`
  if (views >= 1_000) return `${(views / 1_000).toFixed(1)}K views`
  return `${views} views`
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
    return `${Math.floor(diffDays / 365)} years ago`
  } catch {
    return ''
  }
}

// ── Quality Options ──────────────────────────────────────────────────────────

const QUALITY_OPTIONS = [
  { label: 'Auto', value: 'auto' },
  { label: '360p', value: '360' },
  { label: '480p', value: '480' },
  { label: '720p', value: '720' },
  { label: '1080p', value: '1080' },
  { label: '2K', value: '1440' },
  { label: '4K', value: '2160' },
]

// ── Main Component ───────────────────────────────────────────────────────────

export default function PlayerView() {
  const selectedVideoId = useAppStore((s) => s.selectedVideoId)
  const videos = useAppStore((s) => s.videos)
  const goHome = useAppStore((s) => s.goHome)
  const openPlayer = useAppStore((s) => s.openPlayer)

  // ── Local State ──────────────────────────────────────────────────────────
  // Combined fetch/player state to avoid cascading renders from multiple setState in effects
  const [playerState, setPlayerState] = useState({
    video: null as VideoData | null,
    loading: true,
    error: null as string | null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    isBuffering: true,
    buffered: 0,
    liked: false,
    likeCount: 0,
    showCountdown: false,
    countdown: 5,
  })

  // UI state (doesn't reset on video change)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [selectedQuality, setSelectedQuality] = useState('auto')
  const [showQualityMenu, setShowQualityMenu] = useState(false)
  const [descriptionExpanded, setDescriptionExpanded] = useState(false)
  const [autoplay, setAutoplay] = useState(true)

  // Destructure for convenience
  const { video, loading, error, isPlaying, currentTime, duration, isBuffering, buffered, liked, likeCount, showCountdown, countdown } = playerState

  // ── Refs ─────────────────────────────────────────────────────────────────
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const playerContainerRef = useRef<HTMLDivElement>(null)
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const seekRef = useRef<HTMLDivElement>(null)
  const volumeSliderRef = useRef<HTMLDivElement>(null)
  const qualityMenuRef = useRef<HTMLDivElement>(null)

  // ── Related Videos ───────────────────────────────────────────────────────
  const relatedVideos = useMemo(() => {
    if (!video) return videos
    // Same category first, then others, excluding current video
    const sameCategory = videos.filter((v) => v.category === video.category && v.id !== video.id)
    const otherVideos = videos.filter((v) => v.category !== video.category && v.id !== video.id)
    return [...sameCategory, ...otherVideos]
  }, [videos, video])

  // ── Fetch Video Details ──────────────────────────────────────────────────
  const fetchedIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!selectedVideoId) return

    const controller = new AbortController()
    let cancelled = false

    // Mark as fetching this ID
    fetchedIdRef.current = selectedVideoId

    // Reset player state via microtask to avoid synchronous setState in effect
    Promise.resolve().then(() => {
      if (fetchedIdRef.current !== selectedVideoId) return
      setPlayerState({
        video: null,
        loading: true,
        error: null,
        isPlaying: false,
        currentTime: 0,
        duration: 0,
        isBuffering: true,
        buffered: 0,
        liked: false,
        likeCount: 0,
        showCountdown: false,
        countdown: 5,
      })
    })

    fetch(`/api/videos/${selectedVideoId}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error('Video not found')
        return res.json()
      })
      .then((data) => {
        if (!cancelled) {
          setPlayerState((prev) => ({
            ...prev,
            video: data,
            likeCount: data.likes,
            loading: false,
          }))
        }
      })
      .catch((err) => {
        if (!cancelled && err.name !== 'AbortError') {
          setPlayerState((prev) => ({
            ...prev,
            error: err.message || 'Failed to load video',
            loading: false,
          }))
        }
      })

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [selectedVideoId])

  // ── HLS.js Setup ─────────────────────────────────────────────────────────
  useEffect(() => {
    const vid = videoRef.current
    if (!vid || !video) return

    // Cleanup previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }

    if (video.hlsPath && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      })
      hlsRef.current = hls
      hls.loadSource(video.hlsPath)
      hls.attachMedia(vid)
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        // Auto play after manifest parsed
        vid.play().catch(() => {
          // Autoplay may be blocked
        })
      })
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad()
              break
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError()
              break
            default:
              hls.destroy()
              break
          }
        }
      })
    } else if (video.hlsPath && vid.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari native HLS
      vid.src = video.hlsPath
      vid.play().catch(() => {})
    } else {
      // Fallback to MP4
      vid.src = video.filePath
      vid.play().catch(() => {})
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
    }
  }, [video])

  // ── Auto Next Video Handler (defined before use) ──────────────────────────
  const handleVideoEnded = useCallback(() => {
    if (!autoplay || relatedVideos.length === 0) return

    setPlayerState((prev) => ({ ...prev, showCountdown: true, countdown: 5 }))
  }, [autoplay, relatedVideos])

  // ── Video Event Handlers ─────────────────────────────────────────────────
  useEffect(() => {
    const vid = videoRef.current
    if (!vid) return

    const onPlay = () => setPlayerState((prev) => ({ ...prev, isPlaying: true }))
    const onPause = () => setPlayerState((prev) => ({ ...prev, isPlaying: false }))
    const onTimeUpdate = () => setPlayerState((prev) => ({ ...prev, currentTime: vid.currentTime }))
    const onDurationChange = () => setPlayerState((prev) => ({ ...prev, duration: vid.duration }))
    const onWaiting = () => setPlayerState((prev) => ({ ...prev, isBuffering: true }))
    const onPlaying = () => setPlayerState((prev) => ({ ...prev, isBuffering: false }))
    const onCanPlay = () => setPlayerState((prev) => ({ ...prev, isBuffering: false }))
    const onProgress = () => {
      if (vid.buffered.length > 0 && vid.duration > 0) {
        setPlayerState((prev) => ({ ...prev, buffered: (vid.buffered.end(vid.buffered.length - 1) / vid.duration) * 100 }))
      }
    }
    const onEnded = () => handleVideoEnded()

    vid.addEventListener('play', onPlay)
    vid.addEventListener('pause', onPause)
    vid.addEventListener('timeupdate', onTimeUpdate)
    vid.addEventListener('durationchange', onDurationChange)
    vid.addEventListener('waiting', onWaiting)
    vid.addEventListener('playing', onPlaying)
    vid.addEventListener('canplay', onCanPlay)
    vid.addEventListener('progress', onProgress)
    vid.addEventListener('ended', onEnded)

    return () => {
      vid.removeEventListener('play', onPlay)
      vid.removeEventListener('pause', onPause)
      vid.removeEventListener('timeupdate', onTimeUpdate)
      vid.removeEventListener('durationchange', onDurationChange)
      vid.removeEventListener('waiting', onWaiting)
      vid.removeEventListener('playing', onPlaying)
      vid.removeEventListener('canplay', onCanPlay)
      vid.removeEventListener('progress', onProgress)
      vid.removeEventListener('ended', onEnded)
    }
  }, [handleVideoEnded])

  // ── Volume Sync ──────────────────────────────────────────────────────────
  useEffect(() => {
    const vid = videoRef.current
    if (!vid) return
    vid.volume = isMuted ? 0 : volume
    vid.muted = isMuted
  }, [volume, isMuted])

  // ── Controls Auto-hide ───────────────────────────────────────────────────
  const resetControlsTimeout = useCallback(() => {
    setShowControls(true)
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current)
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false)
        setShowQualityMenu(false)
      }
    }, 3000)
  }, [isPlaying])

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }
    }
  }, [])

  // ── Close quality menu on outside click ──────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (qualityMenuRef.current && !qualityMenuRef.current.contains(e.target as Node)) {
        setShowQualityMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // ── Player Controls ──────────────────────────────────────────────────────
  const togglePlay = useCallback(() => {
    const vid = videoRef.current
    if (!vid) return
    if (vid.paused) {
      vid.play().catch(() => {})
    } else {
      vid.pause()
    }
    resetControlsTimeout()
  }, [resetControlsTimeout])

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev)
  }, [])

  const toggleFullscreen = useCallback(() => {
    const container = playerContainerRef.current
    if (!container) return

    if (!document.fullscreenElement) {
      container.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {})
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {})
    }
  }, [])

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  // ── Seek Bar Interaction ─────────────────────────────────────────────────
  const handleSeekClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const vid = videoRef.current
      const bar = seekRef.current
      if (!vid || !bar || !duration) return

      const rect = bar.getBoundingClientRect()
      const pos = (e.clientX - rect.left) / rect.width
      vid.currentTime = pos * duration
      resetControlsTimeout()
    },
    [duration, resetControlsTimeout]
  )

  // ── Volume Slider Interaction ────────────────────────────────────────────
  const handleVolumeClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const vid = videoRef.current
      const bar = volumeSliderRef.current
      if (!vid || !bar) return

      const rect = bar.getBoundingClientRect()
      const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
      setVolume(pos)
      if (pos > 0) setIsMuted(false)
      else setIsMuted(true)
    },
    []
  )

  // ── Like Handler ─────────────────────────────────────────────────────────
  const handleLike = useCallback(async () => {
    if (!video || liked) return
    try {
      const res = await fetch('/api/admin/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId: video.id }),
      })
      const data = await res.json()
      if (data.success) {
        setPlayerState((prev) => ({ ...prev, liked: true, likeCount: data.likes }))
      }
    } catch {
      // silently fail
    }
  }, [video, liked])

  // ── Share Handler ────────────────────────────────────────────────────────
  const handleShare = useCallback(async () => {
    if (!video) return
    const url = `${window.location.origin}?v=${video.id}`
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      // fallback
    }
  }, [video])

  useEffect(() => {
    if (!showCountdown) return

    if (countdown <= 0) {
      // Play next video - use microtask to avoid synchronous setState in effect
      Promise.resolve().then(() => {
        setPlayerState((prev) => ({ ...prev, showCountdown: false }))
        const nextVideo = relatedVideos[0]
        if (nextVideo) {
          openPlayer(nextVideo.id)
        }
      })
      return
    }

    const timer = setTimeout(() => {
      setPlayerState((prev) => {
        const newCountdown = prev.countdown - 1
        if (newCountdown <= 0) {
          // Play next video on next tick
          const nextVideo = relatedVideos[0]
          if (nextVideo) {
            // Use microtask to avoid calling openPlayer during render
            Promise.resolve().then(() => openPlayer(nextVideo.id))
          }
          return { ...prev, showCountdown: false, countdown: 0 }
        }
        return { ...prev, countdown: newCountdown }
      })
    }, 1000)

    return () => clearTimeout(timer)
  }, [showCountdown, countdown, relatedVideos, openPlayer])

  const cancelCountdown = useCallback(() => {
    setPlayerState((prev) => ({ ...prev, showCountdown: false }))
  }, [])

  // ── Keyboard Shortcuts ───────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const vid = videoRef.current
      if (!vid) return

      // Ignore if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return
      }

      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault()
          togglePlay()
          break
        case 'f':
          e.preventDefault()
          toggleFullscreen()
          break
        case 'm':
          e.preventDefault()
          toggleMute()
          break
        case 'ArrowRight':
          e.preventDefault()
          vid.currentTime = Math.min(vid.currentTime + 10, vid.duration)
          resetControlsTimeout()
          break
        case 'ArrowLeft':
          e.preventDefault()
          vid.currentTime = Math.max(vid.currentTime - 10, 0)
          resetControlsTimeout()
          break
        case 'ArrowUp':
          e.preventDefault()
          setVolume((prev) => Math.min(1, prev + 0.1))
          setIsMuted(false)
          break
        case 'ArrowDown':
          e.preventDefault()
          setVolume((prev) => Math.max(0, prev - 0.1))
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [togglePlay, toggleFullscreen, toggleMute, resetControlsTimeout])

  // ── Volume Icon ──────────────────────────────────────────────────────────
  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2

  // ── Seek Progress ────────────────────────────────────────────────────────
  const seekProgress = duration > 0 ? (currentTime / duration) * 100 : 0

  // ── Loading State ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0f1a] pt-20">
        <div className="max-w-[1800px] mx-auto px-4 md:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Player skeleton */}
            <div className="flex-1">
              <Skeleton className="w-full aspect-video rounded-xl bg-white/[0.02]" />
              <div className="mt-4 space-y-3">
                <Skeleton className="h-8 w-3/4 rounded-lg bg-white/[0.02]" />
                <Skeleton className="h-5 w-1/2 rounded-lg bg-white/[0.02]" />
                <Skeleton className="h-16 w-full rounded-lg bg-white/[0.02]" />
              </div>
            </div>
            {/* Sidebar skeleton */}
            <div className="w-full lg:w-96 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-3 p-2">
                  <Skeleton className="w-40 h-[90px] rounded-lg bg-white/[0.02]" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-full rounded bg-white/[0.02]" />
                    <Skeleton className="h-3 w-2/3 rounded bg-white/[0.02]" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Error State ──────────────────────────────────────────────────────────
  if (error || !video) {
    return (
      <div className="min-h-screen bg-[#0b0f1a] pt-20 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-2xl font-bold text-white">{error || 'Video not found'}</p>
          <button
            onClick={goHome}
            className="text-[#ff2d2d] hover:underline font-medium"
          >
            Go back home
          </button>
        </div>
      </div>
    )
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0b0f1a] pt-20">
      <div className="max-w-[1800px] mx-auto px-4 md:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* ── Main Content ──────────────────────────────────────────────── */}
          <div className="flex-1 min-w-0">
            {/* ── Player Area ──────────────────────────────────────────────── */}
            <div
              ref={playerContainerRef}
              className="relative w-full aspect-video bg-black rounded-xl overflow-hidden group cursor-none"
              onMouseMove={resetControlsTimeout}
              onMouseLeave={() => {
                if (isPlaying) setShowControls(false)
              }}
              style={{ cursor: showControls ? 'default' : 'none' }}
            >
              {/* Video Element */}
              <video
                ref={videoRef}
                className="w-full h-full object-contain"
                playsInline
                onClick={togglePlay}
                onDoubleClick={toggleFullscreen}
              />

              {/* Buffering Indicator */}
              {isBuffering && isPlaying && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
                  <Loader2 className="w-16 h-16 text-[#ff2d2d] animate-spin" />
                </div>
              )}

              {/* Big Play Button (when paused) */}
              {!isPlaying && !isBuffering && (
                <div
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                  onClick={togglePlay}
                >
                  <div className="w-20 h-20 rounded-full bg-[#ff2d2d]/90 flex items-center justify-center shadow-2xl transition-transform hover:scale-110">
                    <Play className="w-8 h-8 text-white fill-white ml-1" />
                  </div>
                </div>
              )}

              {/* Countdown Overlay */}
              {showCountdown && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-30">
                  <div className="text-center space-y-4">
                    <p className="text-white text-lg font-medium">Up next in</p>
                    <p className="text-7xl font-bold text-[#ff2d2d]">{countdown}</p>
                    <div className="flex gap-4">
                      <button
                        onClick={cancelCountdown}
                        className="px-6 py-2 rounded-lg bg-white/20 text-white font-medium hover:bg-white/30 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          setPlayerState((prev) => ({ ...prev, showCountdown: false }))
                          const nextVideo = relatedVideos[0]
                          if (nextVideo) openPlayer(nextVideo.id)
                        }}
                        className="px-6 py-2 rounded-lg bg-[#ff2d2d] text-white font-medium hover:bg-[#e62626] transition-colors"
                      >
                        Play Now
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Controls Overlay ───────────────────────────────────────── */}
              <div
                className="absolute inset-0 transition-opacity duration-300 pointer-events-none"
                style={{ opacity: showControls ? 1 : 0 }}
              >
                {/* Top Bar - Back button */}
                <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/60 to-transparent p-4 pointer-events-auto">
                  <button
                    onClick={goHome}
                    className="flex items-center gap-2 text-white/90 hover:text-white transition-colors"
                    aria-label="Back to home"
                  >
                    <ChevronLeft className="w-6 h-6" />
                    <span className="text-sm font-medium">Back</span>
                  </button>
                </div>

                {/* Bottom Controls */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/70 to-transparent p-4 pt-32 pointer-events-auto drop-shadow-2xl">
                  {/* Seek Bar */}
                  <div
                    ref={seekRef}
                    className="w-full h-1.5 bg-white/10 rounded-full cursor-pointer group/seek mb-3 hover:h-2.5 transition-all"
                    onClick={handleSeekClick}
                    role="slider"
                    aria-label="Seek"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(seekProgress)}
                    tabIndex={0}
                  >
                    {/* Buffered */}
                    <div
                      className="absolute top-0 left-0 h-full bg-white/15 rounded-full pointer-events-none"
                      style={{ width: `${buffered}%` }}
                    />
                    {/* Progress */}
                    <div
                      className="h-full bg-[#ff2d2d] rounded-full relative transition-none"
                      style={{ width: `${seekProgress}%` }}
                    >
                      {/* Thumb */}
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-[#ff2d2d] rounded-full shadow-lg opacity-0 group-hover/seek:opacity-100 transition-opacity" />
                    </div>
                  </div>

                  {/* Control Buttons Row */}
                  <div className="flex items-center justify-between gap-2">
                    {/* Left controls */}
                    <div className="flex items-center gap-2 md:gap-3">
                      {/* Play/Pause */}
                      <button
                        onClick={togglePlay}
                        className="text-white hover:text-[#ff2d2d] transition-colors p-1"
                        aria-label={isPlaying ? 'Pause' : 'Play'}
                      >
                        {isPlaying ? (
                          <Pause className="w-6 h-6" />
                        ) : (
                          <Play className="w-6 h-6 fill-white" />
                        )}
                      </button>

                      {/* Skip forward */}
                      <button
                        onClick={() => {
                          if (videoRef.current) {
                            videoRef.current.currentTime = Math.min(
                              videoRef.current.currentTime + 10,
                              videoRef.current.duration
                            )
                          }
                        }}
                        className="text-white/80 hover:text-white transition-colors p-1 hidden sm:block"
                        aria-label="Skip forward 10 seconds"
                      >
                        <SkipForward className="w-5 h-5" />
                      </button>

                      {/* Volume */}
                      <div className="flex items-center gap-1 group/vol">
                        <button
                          onClick={toggleMute}
                          className="text-white hover:text-[#ff2d2d] transition-colors p-1"
                          aria-label={isMuted ? 'Unmute' : 'Mute'}
                        >
                          <VolumeIcon className="w-5 h-5" />
                        </button>
                        <div
                          ref={volumeSliderRef}
                          className="w-0 group-hover/vol:w-20 overflow-hidden transition-all duration-300 h-1.5 bg-white/20 rounded-full cursor-pointer relative"
                          onClick={handleVolumeClick}
                          role="slider"
                          aria-label="Volume"
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={Math.round((isMuted ? 0 : volume) * 100)}
                        >
                          <div
                            className="h-full bg-white rounded-full"
                            style={{ width: `${(isMuted ? 0 : volume) * 100}%` }}
                          />
                        </div>
                      </div>

                      {/* Time */}
                      <span className="text-white text-xs md:text-sm font-medium tabular-nums select-none">
                        {formatTime(currentTime)} / {formatTime(duration)}
                      </span>
                    </div>

                    {/* Right controls */}
                    <div className="flex items-center gap-2 md:gap-3">
                      {/* Quality Selector */}
                      <div className="relative" ref={qualityMenuRef}>
                        <button
                          onClick={() => setShowQualityMenu((prev) => !prev)}
                          className="text-white/80 hover:text-white transition-colors p-1 flex items-center gap-1"
                          aria-label="Quality settings"
                          aria-expanded={showQualityMenu}
                        >
                          <Settings className="w-5 h-5" />
                          <span className="text-xs font-medium hidden md:inline">
                            {selectedQuality === 'auto' ? 'Auto' : selectedQuality + 'p'}
                          </span>
                        </button>

                        {/* Quality Dropdown */}
                        {showQualityMenu && (
                          <div className="absolute bottom-full right-0 mb-2 w-40 bg-[#1a1f2e]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                            <div className="p-2 border-b border-white/10">
                              <p className="text-xs text-gray-400 font-medium px-2">Quality</p>
                            </div>
                            <div className="p-1">
                              {QUALITY_OPTIONS.map((opt) => (
                                <button
                                  key={opt.value}
                                  onClick={() => {
                                    setSelectedQuality(opt.value)
                                    setShowQualityMenu(false)
                                  }}
                                  className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
                                    selectedQuality === opt.value
                                      ? 'text-[#ff2d2d] bg-[#ff2d2d]/10 font-medium'
                                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                                  }`}
                                >
                                  {opt.label}
                                  {selectedQuality === opt.value && (
                                    <span className="float-right">●</span>
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Fullscreen */}
                      <button
                        onClick={toggleFullscreen}
                        className="text-white/80 hover:text-white transition-colors p-1"
                        aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                      >
                        {isFullscreen ? (
                          <Minimize className="w-5 h-5" />
                        ) : (
                          <Maximize className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Video Info Section ────────────────────────────────────────── */}
            <div className="mt-5">
              {/* Title */}
              <h1 className="text-xl md:text-2xl font-bold text-white leading-tight">
                {video.title}
              </h1>

              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-3 mt-3">
                <div className="flex items-center gap-1.5 text-gray-400 text-sm">
                  <Eye className="w-4 h-4" />
                  <span>{formatViews(video.views)}</span>
                </div>
                <span className="w-1 h-1 rounded-full bg-gray-600" />
                <div className="flex items-center gap-1.5 text-gray-400 text-sm">
                  <Clock className="w-4 h-4" />
                  <span>{formatDate(video.createdAt)}</span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-4 mt-4">
                {/* Like Button */}
                <button
                  onClick={handleLike}
                  className={`flex items-center gap-2 transition-colors px-4 py-2 rounded-full ${
                    liked
                      ? 'text-[#ff2d2d] bg-[#ff2d2d]/10'
                      : 'text-gray-400 hover:text-[#ff2d2d] hover:bg-white/5'
                  }`}
                  aria-label={liked ? 'Liked' : 'Like this video'}
                >
                  <ThumbsUp className={`w-5 h-5 ${liked ? 'fill-[#ff2d2d]' : ''}`} />
                  <span className="text-sm font-medium">{likeCount.toLocaleString()}</span>
                </button>

                {/* Share Button */}
                <button
                  onClick={handleShare}
                  className="flex items-center gap-2 text-gray-400 hover:text-white hover:bg-white/5 transition-colors px-4 py-2 rounded-full"
                  aria-label="Share video"
                >
                  <Share2 className="w-5 h-5" />
                  <span className="text-sm font-medium">Share</span>
                </button>
              </div>

              {/* Description */}
              {video.description && (
                <div className="mt-4 bg-white/5 rounded-xl p-4">
                  <div
                    className={`text-gray-300 text-sm leading-relaxed ${
                      !descriptionExpanded ? 'line-clamp-2' : ''
                    }`}
                  >
                    {video.description}
                  </div>
                  <button
                    onClick={() => setDescriptionExpanded((prev) => !prev)}
                    className="text-[#ff2d2d] text-sm font-medium mt-2 hover:underline"
                  >
                    {descriptionExpanded ? 'Show less' : 'Show more'}
                  </button>
                </div>
              )}

              {/* Tags / Category */}
              <div className="flex flex-wrap gap-2 mt-4">
                <span className="px-3 py-1 bg-[#ff2d2d]/20 text-[#ff2d2d] text-xs font-medium rounded-full">
                  {video.category}
                </span>
              </div>
            </div>
          </div>

          {/* ── Right Sidebar ──────────────────────────────────────────────── */}
          <div className="w-full lg:w-96 flex-shrink-0">
            <div className="bg-[#111827] rounded-xl p-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold text-lg">Up Next</h3>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-xs">Autoplay</span>
                  <Switch
                    checked={autoplay}
                    onCheckedChange={setAutoplay}
                    className="data-[state=checked]:bg-[#ff2d2d]"
                  />
                </div>
              </div>

              {/* Related Videos List */}
              <div className="max-h-[calc(100vh-260px)] overflow-y-auto custom-scrollbar space-y-1">
                {relatedVideos.length === 0 && (
                  <p className="text-gray-500 text-sm text-center py-8">No related videos</p>
                )}
                {relatedVideos.map((rv) => (
                  <RelatedVideoItem
                    key={rv.id}
                    video={rv}
                    isCurrent={rv.id === video.id}
                    onClick={() => openPlayer(rv.id)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Related Video Item ────────────────────────────────────────────────────────

interface RelatedVideoItemProps {
  video: VideoData
  isCurrent: boolean
  onClick: () => void
}

function RelatedVideoItem({ video, isCurrent, onClick }: RelatedVideoItemProps) {
  return (
    <div
      className={`flex gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
        isCurrent
          ? 'bg-[#ff2d2d]/10 border border-[#ff2d2d]/20'
          : 'hover:bg-white/5'
      }`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`Play ${video.title}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
    >
      {/* Thumbnail */}
      <div className="relative w-40 flex-shrink-0 aspect-video rounded-md overflow-hidden bg-[#1a1f2e]">
        <img
          src={video.thumbnail}
          alt={video.title}
          className="w-full h-full object-cover"
          loading="lazy"
          draggable={false}
        />
        <div className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded flex items-center gap-0.5">
          <Clock className="w-2.5 h-2.5" />
          {video.duration}
        </div>
        {isCurrent && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <div className="w-8 h-8 rounded-full bg-[#ff2d2d]/90 flex items-center justify-center">
              <Pause className="w-4 h-4 text-white fill-white" />
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 py-0.5">
        <h4 className="text-sm font-medium text-white line-clamp-2 leading-snug">
          {video.title}
        </h4>
        <p className="text-xs text-gray-400 mt-1">{formatViews(video.views)}</p>
        <p className="text-xs text-gray-500 mt-0.5">{video.category}</p>
      </div>
    </div>
  )
}
