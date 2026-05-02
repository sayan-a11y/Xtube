'use client'

import { useAppStore, VideoData, CategoryData } from '@/store/useAppStore'
import Navbar from '@/components/xtube/Navbar'
import dynamic from 'next/dynamic'
import { Flame, Clock, Star, TrendingUp, Film, MoreVertical, CheckCircle2 } from 'lucide-react'
import { useEffect, useMemo, useCallback, useState } from 'react'
import VideoCard from '@/components/xtube/VideoCard'
import { Skeleton } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase'

// Lazy load large components for performance
const HeroSection = dynamic(() => import('@/components/xtube/HeroSection'), { ssr: false })
const ContentRow = dynamic(() => import('@/components/xtube/ContentRow'), { ssr: false })
const PlayerView = dynamic(() => import('@/components/xtube/PlayerView'), { ssr: false })
const AdminPanel = dynamic(() => import('@/components/xtube/AdminPanel'), { ssr: false })
const AgeGate = dynamic(() => import('@/components/xtube/AgeGate'), { ssr: false })

export default function Home() {
  const currentView = useAppStore(s => s.currentView)
  const selectedCategory = useAppStore(s => s.selectedCategory)
  const setSelectedCategory = useAppStore(s => s.setSelectedCategory)
  const videos = useAppStore(s => s.videos)
  const setVideos = useAppStore(s => s.setVideos)
  const categories = useAppStore(s => s.categories)
  const setCategories = useAppStore(s => s.setCategories)
  const videosLoading = useAppStore(s => s.videosLoading)
  const setVideosLoading = useAppStore(s => s.setVideosLoading)
  const searchQuery = useAppStore(s => s.searchQuery)
  const isAdmin = useAppStore(s => s.isAdmin)
  const showAdminLogin = useAppStore(s => s.showAdminLogin)
  const setShowAdminLogin = useAppStore(s => s.setShowAdminLogin)
  const setIsAdmin = useAppStore(s => s.setIsAdmin)
  const setAdminToken = useAppStore(s => s.setAdminToken)

  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Fetch videos
  const fetchVideos = useCallback(async () => {
    setVideosLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedCategory && selectedCategory !== 'All') {
        params.set('category', selectedCategory)
      }
      if (searchQuery) {
        params.set('search', searchQuery)
      }
      const res = await fetch(`/api/videos?${params.toString()}`)
      const data = await res.json()
      setVideos(data.videos || [])
    } catch (err) {
      console.error('Failed to fetch videos:', err)
    } finally {
      setVideosLoading(false)
    }
  }, [selectedCategory, searchQuery, setVideos, setVideosLoading])

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/categories')
      const data = await res.json()
      setCategories(data.categories || [])
    } catch (err) {
      console.error('Failed to fetch categories:', err)
    }
  }, [setCategories])

  useEffect(() => {
    if (mounted) {
      fetchVideos()
      fetchCategories()
    }
  }, [mounted, fetchVideos, fetchCategories])

  // Check for existing admin session
  useEffect(() => {
    if (mounted) {
      const token = localStorage.getItem('xtube-admin-token')
      if (token) {
        setIsAdmin(true)
        setAdminToken(token)
      }
    }
  }, [mounted, setIsAdmin, setAdminToken])

  // Supabase Realtime for Public UI
  useEffect(() => {
    if (!mounted) return
    
    const channel = supabase
      .channel('public-video-updates')
      .on('postgres_changes', { event: '*', table: 'Video', schema: 'public' }, (payload) => {
        console.log('[Public Realtime] Change detected:', payload)
        if (payload.eventType === 'INSERT') {
          // Add new video if it matches current search/category (simplified: just add it)
          setVideos((prev) => [payload.new as VideoData, ...prev])
        } else if (payload.eventType === 'UPDATE') {
          setVideos((prev) => prev.map((v) => (v.id === payload.new.id ? { ...v, ...payload.new } : v)))
        } else if (payload.eventType === 'DELETE') {
          setVideos((prev) => prev.filter((v) => v.id === payload.old.id))
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [mounted, setVideos])

  // Categorize videos for rows
  const trendingVideos = useMemo(() => {
    return [...videos].sort((a, b) => b.views - a.views).slice(0, 20)
  }, [videos])

  const recentVideos = useMemo(() => {
    return [...videos].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ).slice(0, 20)
  }, [videos])

  const topRatedVideos = useMemo(() => {
    return [...videos].sort((a, b) => b.likes - a.likes).slice(0, 20)
  }, [videos])

  // Group videos by category

  // Handle admin login
  const handleAdminLogin = useCallback(
    async (password: string) => {
      try {
        const res = await fetch('/api/admin/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password }),
        })
        const data = await res.json()
        if (data.success) {
          setIsAdmin(true)
          setAdminToken(data.token)
          setShowAdminLogin(false)
          useAppStore.getState().setCurrentView('admin')
        } else {
          alert('Invalid password!')
        }
      } catch {
        alert('Login failed. Please try again.')
      }
    },
    [setIsAdmin, setAdminToken, setShowAdminLogin]
  )

  // Don't render until mounted (prevents hydration issues)
  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#0b0f1a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#ff2d2d] border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Loading Xtube...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white pb-20">
      <AgeGate />
      <Navbar />

      {/* Hero Section */}
      {currentView === 'home' && selectedCategory === 'All' && !searchQuery && (
        <HeroSection />
      )}

      {/* Admin Login Modal */}
      {showAdminLogin && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md">
          <div className="bg-[#181818] border border-white/10 rounded-2xl p-8 w-full max-w-md mx-4 shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-[#ff2d2d]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Film className="w-8 h-8 text-[#ff2d2d]" />
              </div>
              <h2 className="text-xl font-bold text-white">Admin Access</h2>
              <p className="text-sm text-gray-400 mt-1">Enter admin password to continue</p>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const form = e.target as HTMLFormElement
                const password = (form.elements.namedItem('password') as HTMLInputElement).value
                handleAdminLogin(password)
                form.reset()
              }}
            >
              <input
                type="password"
                name="password"
                placeholder="Enter password..."
                autoFocus
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-[#ff2d2d]/50 focus:ring-1 focus:ring-[#ff2d2d]/30 transition-all mb-4"
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAdminLogin(false)}
                  className="flex-1 bg-white/10 hover:bg-white/20 text-white py-3 rounded-xl font-medium transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#ff2d2d] hover:bg-[#e62626] text-white py-3 rounded-xl font-medium transition-all"
                >
                  Login
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Content */}
      {currentView === 'admin' && isAdmin ? (
        <AdminPanel />
      ) : currentView === 'player' ? (
        <PlayerView />
      ) : (
        <main className="pt-16">

          {/* Category Tabs - Dynamic from Admin */}
          <div className="sticky top-14 z-30 bg-[#0f0f0f]/95 backdrop-blur-md py-4 overflow-x-auto no-scrollbar border-b border-white/5">
            <div className="flex items-center gap-3 px-4 md:px-6 w-max mx-auto md:mx-0 min-w-full md:justify-start">
              <button
                onClick={() => setSelectedCategory('All')}
                className={`flex-shrink-0 px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                  selectedCategory === 'All'
                    ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.2)]'
                    : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                All Content
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.name)}
                  className={`flex-shrink-0 px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all border border-white/5 ${
                    selectedCategory === cat.name
                      ? 'bg-[#ff2d2d] text-white shadow-[0_0_20px_rgba(255,45,45,0.3)] border-[#ff2d2d]'
                      : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Hero Content Rows (Netflix Style) */}
          {currentView === 'home' && selectedCategory === 'All' && !searchQuery && (
            <div className="mt-8 space-y-12">
              <ContentRow title="Trending Now" videos={trendingVideos} icon={<Flame className="w-6 h-6 text-orange-500" />} />
              <ContentRow title="Recently Added" videos={recentVideos} icon={<Clock className="w-6 h-6 text-blue-500" />} />
              <ContentRow title="Top Rated" videos={topRatedVideos} icon={<Star className="w-6 h-6 text-yellow-500" />} />
            </div>
          )}

          <div className="px-4 md:px-6 lg:px-8 mt-12">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              {searchQuery ? `Search Results: ${searchQuery}` : selectedCategory !== 'All' ? `${selectedCategory} Videos` : 'All Videos'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-10">
              {videosLoading ? (
                Array.from({ length: 15 }).map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="aspect-video w-full rounded-xl bg-white/5" />
                    <div className="flex gap-3">
                      <Skeleton className="w-10 h-10 rounded-full bg-white/5 flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-full bg-white/5" />
                        <Skeleton className="h-3 w-2/3 bg-white/5" />
                      </div>
                    </div>
                  </div>
                ))
              ) : videos.length > 0 ? (
                videos.map((v) => (
                  <VideoCard key={v.id} video={v} />
                ))
              ) : (
                <div className="col-span-full flex flex-col items-center justify-center py-40 opacity-30">
                  <Film className="w-20 h-20 mb-4" />
                  <h3 className="text-xl font-bold">No Videos Found</h3>
                  <p className="text-sm">Try another category or search term.</p>
                </div>
              )}
            </div>
          </div>

          <footer className="mt-20 border-t border-white/5 px-4 md:px-12 py-12 bg-[#0f0f0f]">
            <div className="max-w-[2000px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[#ff2d2d] rounded-lg flex items-center justify-center font-bold text-white italic">X</div>
                <span className="text-xl font-bold text-white tracking-tight">tube</span>
              </div>
              <div className="flex items-center gap-8 text-gray-500 text-sm font-medium">
                <span className="hover:text-white cursor-pointer transition-colors">Privacy</span>
                <span className="hover:text-white cursor-pointer transition-colors">Terms</span>
                <span className="hover:text-white cursor-pointer transition-colors">Contact</span>
                <span className="hover:text-white cursor-pointer transition-colors">Advertise</span>
              </div>
              <p className="text-gray-600 text-xs">
                © 2026 Xtube Platform. All rights reserved.
              </p>
            </div>
          </footer>
        </main>
      )}
    </div>
  )
}
