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
    const hls = hlsRef.current
    const vid = videoRef.current
    if (!hls || !vid) return

    if (selectedQuality === 'auto') {
      hls.currentLevel = -1
    } else {
      // Find the index that matches the height
      const levelIndex = hls.levels.findIndex(
        (l) => l.height.toString() === selectedQuality || l.name === selectedQuality
      )
      if (levelIndex !== -1) {
        hls.currentLevel = levelIndex
        // For immediate effect on some browsers
        hls.loadLevel = levelIndex
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
      // Force hide controls slightly faster on play
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
      controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 2000)
    } else {
      vid.pause()
      setShowControls(true)
    }
  }, [])

  const handleSeek = useCallback((amount: number) => {
    const vid = videoRef.current
    if (!vid) return
    vid.currentTime = Math.max(0, Math.min(vid.currentTime + amount, vid.duration))
    setShowSeekOverlay(amount > 0 ? 'right' : 'left')
    setTimeout(() => setShowSeekOverlay(null), 800)
    resetControlsTimeout()
  }, [resetControlsTimeout])

  const handleVideoClick = (e: React.MouseEvent | React.TouchEvent) => {
    const now = Date.now()
    const DOUBLE_TAP_DELAY = 300
    const timeDiff = now - lastTapTimeRef.current

    // Show controls on any tap/touch
    resetControlsTimeout()

    if (timeDiff < DOUBLE_TAP_DELAY) {
      // Double tap detected
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      let clientX = 0
      if ('clientX' in e) {
        clientX = e.clientX
      } else if ('changedTouches' in e) {
        clientX = e.changedTouches[0].clientX
      }

      const x = clientX - rect.left
      if (x < rect.width / 2) {
        handleSeek(-10)
      } else {
        handleSeek(10)
      }
      lastTapTimeRef.current = 0 
    } else {
      // Single tap
      lastTapTimeRef.current = now
      // On mobile, first tap shows controls, second tap (if controls visible) toggles play
      if (!showControls) {
        setShowControls(true)
      } else {
        togglePlay()
      }
    }
  }

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev)
  }, [])

  const toggleFullscreen = useCallback(() => {
    const container = playerContainerRef.current
    const video = videoRef.current
    if (!container || !video) return

    if (!document.fullscreenElement) {
      if (container.requestFullscreen) {
        container.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {})
      } else if ((video as any).webkitEnterFullscreen) {
        // iOS Safari fix
        (video as any).webkitEnterFullscreen()
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {})
      }
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
    <div className="min-h-screen bg-[#f3f4f6] pt-16 md:pt-20">
      <div className="max-w-[2000px] mx-auto px-0 md:px-6 lg:px-8">
        <div className="flex flex-col lg:grid lg:grid-cols-[1fr_400px] xl:grid-cols-[1fr_420px] gap-0 md:gap-10">
          {/* ── Main Content ──────────────────────────────────────────────── */}
          <div className="flex-1 min-w-0">
            {/* ── Player Area ──────────────────────────────────────────────── */}
            <div
              ref={playerContainerRef}
              className="relative w-full aspect-video bg-black rounded-3xl overflow-hidden group cursor-none shadow-2xl"
              onMouseMove={resetControlsTimeout}
              onTouchStart={resetControlsTimeout}
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
                    className="w-24 h-24 rounded-full border-2 border-white/80 flex items-center justify-center backdrop-blur-[2px] shadow-2xl"
                  >
                    <Play className="w-10 h-10 text-white fill-white ml-2" />
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

                {/* Bottom Controls - Solid Bar Style matching image */}
                <div className="absolute bottom-0 left-0 right-0 bg-[#272727]/90 backdrop-blur-md px-6 py-4 pointer-events-auto border-t border-white/5">
                  {/* Seek Bar (Integrated) */}
                  <div
                    ref={seekRef}
                    className="absolute top-0 left-0 right-0 h-1 bg-white/10 cursor-pointer group/seek"
                    onClick={handleSeekClick}
                  >
                    <div className="h-full bg-[#6d9bc3] transition-none" style={{ width: `${seekProgress}%` }}>
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover/seek:opacity-100 shadow-xl" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-6">
                      <button onClick={togglePlay} className="text-white hover:text-[#6d9bc3] transition-colors">
                        {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-white" />}
                      </button>
                      <SkipForward className="w-5 h-5 text-white/80 cursor-pointer hover:text-white" onClick={() => handleSeek(10)} />
                      <span className="text-white/90 text-sm font-medium tabular-nums">
                        {formatTime(currentTime)} / {formatTime(duration)}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-3 group/vol">
                        <VolumeIcon className="w-5 h-5 text-white cursor-pointer" onClick={toggleMute} />
                        <div className="w-0 group-hover:w-20 transition-all duration-300 h-1 bg-white/20 rounded-full overflow-hidden">
                          <div className="h-full bg-white" style={{ width: `${(isMuted ? 0 : volume) * 100}%` }} />
                        </div>
                      </div>
                      <Settings className="w-5 h-5 text-white/80 cursor-pointer hover:text-white" onClick={() => setShowQualityMenu(!showQualityMenu)} />
                      <Maximize className="w-5 h-5 text-white/80 cursor-pointer hover:text-white" onClick={toggleFullscreen} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Video Info Section ────────────────────────────────────────── */}
            <div className="mt-8 px-4 md:px-0">
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 leading-tight">
                {video.title}
              </h1>

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mt-6 pb-6 border-b border-gray-200">
                {/* Channel / Subscribe section */}
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-600 text-xl border-2 border-white shadow-sm">
                    {video.category[0].toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-gray-900 font-bold text-base">XTube Studio</h3>
                    <p className="text-gray-500 text-sm">1.2M subscribers</p>
                  </div>
                  <button className="ml-4 px-8 py-2 bg-[#6d9bc3] text-white font-bold rounded-full text-sm hover:brightness-110 shadow-lg shadow-[#6d9bc3]/20 transition-all">
                    Subscribe
                  </button>
                </div>

                {/* Action buttons - Pill Style from image */}
                <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-1 md:pb-0">
                  <button className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-6 py-2 rounded-full transition-all shadow-sm font-semibold text-sm">
                    <ThumbsUp className="w-4 h-4" />
                    <span>{likeCount.toLocaleString()}</span>
                  </button>
                  <button className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-6 py-2 rounded-full transition-all shadow-sm font-semibold text-sm">
                    <Share2 className="w-4 h-4" />
                    <span>Share</span>
                  </button>
                  <button className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-6 py-2 rounded-full transition-all shadow-sm font-semibold text-sm">
                    <Clock className="w-4 h-4" />
                    <span>Save</span>
                  </button>
                </div>
              </div>

              {/* Description Box */}
              <div className="mt-6 bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-md transition-all cursor-pointer group" onClick={() => setDescriptionExpanded(!descriptionExpanded)}>
                <div className="flex items-center gap-3 text-gray-900 font-bold text-sm mb-3">
                  <span className="bg-gray-100 px-3 py-1 rounded-full">{formatViews(video.views)}</span>
                  <span className="text-gray-400">{formatDate(video.createdAt)}</span>
                </div>
                <div className={`text-gray-600 text-sm leading-relaxed ${!descriptionExpanded ? 'line-clamp-2' : ''}`}>
                  {video.description || "No description available for this video."}
                </div>
                <button className="text-[#6d9bc3] text-sm font-bold mt-4 hover:underline">
                  {descriptionExpanded ? 'Show less' : 'Show more'}
                </button>
              </div>
            </div>
          </div>

          {/* ── Right Sidebar ──────────────────────────────────────────────── */}
          <div className="w-full mt-10 lg:mt-0 px-4 md:px-0">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-gray-900 font-bold text-lg">Recommended</h3>
              <div className="flex items-center gap-3">
                <span className="text-gray-500 text-xs font-medium">Autoplay</span>
                <Switch
                  checked={autoplay}
                  onCheckedChange={setAutoplay}
                  className="data-[state=checked]:bg-[#6d9bc3]"
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
      className={`flex gap-4 p-2 rounded-2xl cursor-pointer transition-all duration-300 ${
        isCurrent
          ? 'bg-white shadow-lg border border-gray-100 ring-2 ring-[#6d9bc3]/20'
          : 'hover:bg-white hover:shadow-md border border-transparent hover:border-gray-100'
      }`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`Play ${video.title}`}
    >
      {/* Thumbnail */}
      <div className="relative w-40 md:w-32 xl:w-44 flex-shrink-0 aspect-video rounded-xl overflow-hidden bg-gray-200 shadow-sm">
        <img
          src={video.thumbnail}
          alt={video.title}
          className="w-full h-full object-cover transition-transform duration-700 hover:scale-110"
          loading="lazy"
          draggable={false}
        />
        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-sm">
          {video.duration}
        </div>
        {isCurrent && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#6d9bc3]/20 backdrop-blur-[1px]">
            <div className="w-10 h-10 rounded-full bg-[#6d9bc3] flex items-center justify-center shadow-xl">
              <Play className="w-5 h-5 text-white fill-white ml-0.5" />
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 py-1">
        <h4 className="text-sm font-bold text-gray-900 line-clamp-2 leading-tight hover:text-[#6d9bc3] transition-colors">
          {video.title}
        </h4>
        <div className="mt-2 space-y-1">
          <p className="text-xs text-gray-500 font-bold">XTube Studio</p>
          <div className="flex items-center gap-2 text-[11px] text-gray-400 font-semibold">
            <span>{formatViews(video.views)}</span>
            <span className="w-1 h-1 rounded-full bg-gray-300" />
            <span>{formatDate(video.createdAt)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
