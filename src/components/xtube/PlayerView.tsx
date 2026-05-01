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
import { motion, AnimatePresence } from 'framer-motion'

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
  const [showSeekOverlay, setShowSeekOverlay] = useState<'left' | 'right' | null>(null)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [showSpeedMenu, setShowSpeedMenu] = useState(false)

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
  const speedMenuRef = useRef<HTMLDivElement>(null)
  const lastTapTimeRef = useRef<number>(0)

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

  // Quality Switching Logic
  useEffect(() => {
    if (!hlsRef.current) return
    if (selectedQuality === 'auto') {
      hlsRef.current.currentLevel = -1
    } else {
      const levelIndex = hlsRef.current.levels.findIndex(
        (l) => l.height.toString() === selectedQuality
      )
      if (levelIndex !== -1) {
        hlsRef.current.currentLevel = levelIndex
      }
    }
  }, [selectedQuality])

  // Playback Speed Logic
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed
    }
  }, [playbackSpeed])

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

  // ── Close menus on outside click ─────────────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (qualityMenuRef.current && !qualityMenuRef.current.contains(target)) {
        setShowQualityMenu(false)
      }
      if (speedMenuRef.current && !speedMenuRef.current.contains(target)) {
        setShowSpeedMenu(false)
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

  const handleSeek = useCallback((amount: number) => {
    const vid = videoRef.current
    if (!vid) return
    vid.currentTime = Math.max(0, Math.min(vid.currentTime + amount, vid.duration))
    setShowSeekOverlay(amount > 0 ? 'right' : 'left')
    setTimeout(() => setShowSeekOverlay(null), 800)
    resetControlsTimeout()
  }, [resetControlsTimeout])

  const handleVideoClick = (e: React.MouseEvent) => {
    const now = Date.now()
    const DOUBLE_TAP_DELAY = 300
    const timeDiff = now - lastTapTimeRef.current

    if (timeDiff < DOUBLE_TAP_DELAY) {
      // Double tap detected
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      const x = e.clientX - rect.left
      if (x < rect.width / 2) {
        handleSeek(-10)
      } else {
        handleSeek(10)
      }
      lastTapTimeRef.current = 0 // Reset
    } else {
      // Single tap
      lastTapTimeRef.current = now
      togglePlay()
    }
  }

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
    <div className="min-h-screen bg-[#0f0f0f] pt-16 md:pt-20">
      <div className="max-w-[2000px] mx-auto px-0 md:px-6 lg:px-8">
        <div className="flex flex-col lg:grid lg:grid-cols-[1fr_400px] xl:grid-cols-[1fr_420px] gap-0 md:gap-8">
          {/* ── Main Content ──────────────────────────────────────────────── */}
          <div className="flex-1 min-w-0">
            {/* ── Player Area ──────────────────────────────────────────────── */}
            <div
              ref={playerContainerRef}
              className="relative w-full aspect-video bg-black rounded-xl overflow-hidden group cursor-none select-none"
              onMouseMove={resetControlsTimeout}
              onMouseLeave={() => {
                if (isPlaying) setShowControls(false)
              }}
              style={{ 
                cursor: showControls ? 'default' : 'none',
                WebkitTapHighlightColor: 'transparent'
              }}
            >
              {/* Video Element */}
              <video
                ref={videoRef}
                className="w-full h-full object-contain relative z-0"
                playsInline
                onClick={handleVideoClick}
              />

              {/* Invisible Gesture Zones for Double Tap */}
              <div className="absolute inset-0 z-10 flex pointer-events-none">
                <div className="w-1/2 h-full pointer-events-auto bg-transparent" onClick={handleVideoClick} />
                <div className="w-1/2 h-full pointer-events-auto bg-transparent" onClick={handleVideoClick} />
              </div>

              {/* Seek Overlay (YouTube style ripple) */}
              <AnimatePresence>
                {showSeekOverlay && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className={`absolute inset-0 pointer-events-none flex items-center z-20 ${
                      showSeekOverlay === 'left' ? 'justify-start' : 'justify-end'
                    }`}
                  >
                    <div
                      className={`h-full w-1/3 bg-transparent flex flex-col items-center justify-center gap-2 ${
                        showSeekOverlay === 'left'
                          ? 'rounded-r-full'
                          : 'rounded-l-full'
                      }`}
                    >
                      <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/5 shadow-xl">
                        <span className="text-white font-black text-xl tracking-tighter">
                          {showSeekOverlay === 'left' ? '-10s' : '+10s'}
                        </span>
                      </div>
                      <div className="flex gap-1.5">
                        {[0, 1, 2].map((i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: 0 }}
                            animate={{ 
                              opacity: [0, 1, 0], 
                              x: showSeekOverlay === 'left' ? [-10, -25, -40] : [10, 25, 40] 
                            }}
                            transition={{ 
                              repeat: Infinity, 
                              duration: 0.5, 
                              delay: i * 0.1,
                              ease: "easeOut"
                            }}
                            className="text-white/60"
                          >
                            {showSeekOverlay === 'left' ? '◀' : '▶'}
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Buffering Indicator */}
              {isBuffering && isPlaying && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] z-20 pointer-events-none">
                  <div className="relative">
                    <Loader2 className="w-16 h-16 text-[#ff0000] animate-spin" />
                    <div className="absolute inset-0 blur-xl bg-[#ff0000]/20 rounded-full animate-pulse" />
                  </div>
                </div>
              )}

              {/* Big Play Button (when paused) */}
              {!isPlaying && !isBuffering && (
                <div
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                  onClick={togglePlay}
                >
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-20 h-20 rounded-full bg-[#ff0000]/90 flex items-center justify-center shadow-[0_0_50px_rgba(255,0,0,0.3)] backdrop-blur-sm"
                  >
                    <Play className="w-9 h-9 text-white fill-white ml-1.5" />
                  </motion.div>
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
                    className="w-full h-1.5 bg-white/10 rounded-full cursor-pointer group/seek mb-3 hover:h-2.5 transition-all relative z-30 overflow-hidden"
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
                      className="h-full bg-[#ff0000] rounded-full relative transition-none shadow-[0_0_15px_rgba(255,0,0,0.5)]"
                      style={{ width: `${seekProgress}%` }}
                    >
                      {/* Thumb */}
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-[#ff0000] rounded-full shadow-[0_0_10px_rgba(255,0,0,0.8)] opacity-0 group-hover/seek:opacity-100 transition-opacity ring-2 ring-white/20" />
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

                      {/* Speed Selector */}
                      <div className="relative" ref={speedMenuRef}>
                        <button
                          onClick={() => setShowSpeedMenu((prev) => !prev)}
                          className="text-white/80 hover:text-white transition-colors p-1 flex items-center gap-1"
                          aria-label="Playback speed"
                          aria-expanded={showSpeedMenu}
                        >
                          <span className="text-xs font-bold">{playbackSpeed}x</span>
                        </button>

                        {/* Speed Dropdown */}
                        {showSpeedMenu && (
                          <div className="absolute bottom-full right-0 mb-2 w-32 bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                            <div className="p-2 border-b border-white/10">
                              <p className="text-[10px] text-gray-400 font-bold uppercase px-2">Speed</p>
                            </div>
                            <div className="p-1">
                              {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
                                <button
                                  key={speed}
                                  onClick={() => {
                                    setPlaybackSpeed(speed)
                                    setShowSpeedMenu(false)
                                  }}
                                  className={`w-full text-left px-3 py-1.5 text-xs rounded-lg transition-colors ${
                                    playbackSpeed === speed
                                      ? 'text-[#ff0000] bg-[#ff0000]/10 font-bold'
                                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                                  }`}
                                >
                                  {speed === 1 ? 'Normal' : `${speed}x`}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Video Info Section ────────────────────────────────────────── */}
            <div className="mt-4 px-4 md:px-0">
              {/* Title */}
              <h1 className="text-lg md:text-xl xl:text-2xl font-bold text-white leading-tight">
                {video.title}
              </h1>

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-4">
                {/* Channel / Subscribe section */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#ff0000] flex items-center justify-center font-bold text-white text-lg">
                    {video.category[0].toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-sm md:text-base">XTube Studio</h3>
                    <p className="text-gray-400 text-xs">1.2M subscribers</p>
                  </div>
                  <button className="ml-2 px-4 py-2 bg-white text-black font-semibold rounded-full text-sm hover:bg-gray-200 transition-colors">
                    Subscribe
                  </button>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 md:pb-0">
                  {/* Like Button */}
                  <div className="flex items-center bg-[#272727] rounded-full overflow-hidden">
                    <button
                      onClick={handleLike}
                      className={`flex items-center gap-2 px-4 py-2 hover:bg-white/10 transition-colors border-r border-white/10 ${
                        liked ? 'text-[#ff0000]' : 'text-white'
                      }`}
                    >
                      <ThumbsUp className={`w-5 h-5 ${liked ? 'fill-[#ff0000]' : ''}`} />
                      <span className="text-sm font-medium">{likeCount.toLocaleString()}</span>
                    </button>
                    <button className="px-4 py-2 hover:bg-white/10 transition-colors text-white">
                      <ThumbsUp className="w-5 h-5 rotate-180" />
                    </button>
                  </div>

                  {/* Share Button */}
                  <button
                    onClick={handleShare}
                    className="flex items-center gap-2 bg-[#272727] text-white hover:bg-white/10 transition-colors px-4 py-2 rounded-full"
                  >
                    <Share2 className="w-5 h-5" />
                    <span className="text-sm font-medium">Share</span>
                  </button>

                  {/* Save/Download Button */}
                  <button className="flex items-center gap-2 bg-[#272727] text-white hover:bg-white/10 transition-colors px-4 py-2 rounded-full">
                    <Clock className="w-5 h-5" />
                    <span className="text-sm font-medium">Save</span>
                  </button>
                </div>
              </div>

              {/* Description Box */}
              <div className="mt-4 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 hover:bg-[#222222] transition-all cursor-pointer group shadow-lg" onClick={() => setDescriptionExpanded(!descriptionExpanded)}>
                <div className="flex items-center gap-3 text-white font-bold text-sm mb-2">
                  <span className="bg-white/10 px-2 py-0.5 rounded">{formatViews(video.views)}</span>
                  <span className="text-gray-400">{formatDate(video.createdAt)}</span>
                </div>
                <div className={`text-gray-200 text-sm leading-relaxed ${!descriptionExpanded ? 'line-clamp-2' : ''}`}>
                  {video.description || "No description available for this video."}
                </div>
                <button className="text-[#ff0000] text-xs font-black uppercase tracking-widest mt-2 hover:brightness-125 transition-all">
                  {descriptionExpanded ? 'Show less' : 'Read more'}
                </button>
              </div>
            </div>
          </div>

          {/* ── Right Sidebar ──────────────────────────────────────────────── */}
          <div className="w-full mt-6 lg:mt-0 px-4 md:px-0">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold text-lg">Recommended</h3>
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-xs">Autoplay</span>
                <Switch
                  checked={autoplay}
                  onCheckedChange={setAutoplay}
                  className="data-[state=checked]:bg-[#ff0000]"
                />
              </div>
            </div>

            {/* Related Videos List */}
            <div className="space-y-3">
              {relatedVideos.length === 0 && (
                <p className="text-gray-500 text-sm text-center py-8">No recommendations found</p>
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
      className={`flex gap-3 p-1.5 rounded-xl cursor-pointer transition-all duration-300 ${
        isCurrent
          ? 'bg-[#ff0000]/10 ring-1 ring-[#ff0000]/30'
          : 'hover:bg-[#272727]'
      }`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`Play ${video.title}`}
    >
      {/* Thumbnail */}
      <div className="relative w-40 md:w-32 xl:w-40 flex-shrink-0 aspect-video rounded-xl overflow-hidden bg-[#1a1a1a]">
        <img
          src={video.thumbnail}
          alt={video.title}
          className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
          loading="lazy"
          draggable={false}
        />
        <div className="absolute bottom-1.5 right-1.5 bg-black/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 backdrop-blur-sm">
          {video.duration}
        </div>
        {isCurrent && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
            <div className="w-8 h-8 rounded-full bg-[#ff0000] flex items-center justify-center shadow-lg shadow-[#ff0000]/40">
              <Play className="w-4 h-4 text-white fill-white ml-0.5" />
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 py-0.5">
        <h4 className="text-sm font-semibold text-white line-clamp-2 leading-tight group-hover:text-[#ff0000] transition-colors">
          {video.title}
        </h4>
        <div className="mt-1 space-y-0.5">
          <p className="text-xs text-gray-400 font-medium truncate">XTube Studio</p>
          <div className="flex items-center gap-1 text-[11px] text-gray-500 font-medium">
            <span>{formatViews(video.views)}</span>
            <span>•</span>
            <span>{formatDate(video.createdAt)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
