'use client'

import { useAppStore, VideoData, CategoryData } from '@/store/useAppStore'
import Navbar from '@/components/xtube/Navbar'
import HeroSection from '@/components/xtube/HeroSection'
import ContentRow from '@/components/xtube/ContentRow'
import PlayerView from '@/components/xtube/PlayerView'
import AdminPanel from '@/components/xtube/AdminPanel'
import { Flame, Clock, Star, TrendingUp, Film, MoreVertical, CheckCircle2 } from 'lucide-react'
import { useEffect, useMemo, useCallback, useState } from 'react'
import VideoCard from '@/components/xtube/VideoCard'
import { Skeleton } from '@/components/ui/skeleton'

export default function Home() {
  const {
    currentView,
    selectedCategory,
    setSelectedCategory,
    videos,
    setVideos,
    categories,
    setCategories,
    videosLoading,
    setVideosLoading,
    searchQuery,
    isAdmin,
    showAdminLogin,
    setShowAdminLogin,
    setIsAdmin,
    setAdminToken,
  } = useAppStore()

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
  const categoryGroups = useMemo(() => {
    const groups: Record<string, VideoData[]> = {}
    videos.forEach((v) => {
      if (!groups[v.category]) groups[v.category] = []
      groups[v.category].push(v)
    })
    return groups
  }, [videos])

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
    <div className="min-h-screen bg-[#f3f4f6] text-[#1f2937]">
      <Navbar />

      {/* Admin Login Modal */}
      {showAdminLogin && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#111827] border border-white/10 rounded-2xl p-8 w-full max-w-md mx-4 shadow-2xl">
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
        <main className="pt-20 pb-10">
          {/* Category Tabs */}
          <div className="sticky top-16 z-30 bg-[#f3f4f6]/80 backdrop-blur-md px-4 md:px-8 lg:px-12 py-3 border-b border-gray-200 overflow-x-auto no-scrollbar">
            <div className="max-w-[2000px] mx-auto flex items-center gap-3">
              <button
                onClick={() => setSelectedCategory('All')}
                className={`flex-shrink-0 px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                  selectedCategory === 'All'
                    ? 'bg-[#6d9bc3] text-white shadow-lg shadow-[#6d9bc3]/30'
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
              >
                All
              </button>
              {['Gaming', 'Music', 'Live', 'Tech', 'News', 'Recently Uploaded'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`flex-shrink-0 px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                    selectedCategory === cat
                      ? 'bg-[#6d9bc3] text-white shadow-lg shadow-[#6d9bc3]/30'
                      : 'bg-white text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.name)}
                  className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    selectedCategory === cat.name
                      ? 'bg-white text-black shadow-lg'
                      : 'bg-[#272727] text-white hover:bg-[#3f3f3f]'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          <div className="max-w-[2400px] mx-auto px-4 md:px-8 lg:px-12 mt-6">
            {/* Unified Video Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-x-4 gap-y-10">
              {videosLoading ? (
                Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="aspect-video w-full rounded-2xl bg-[#272727]" />
                    <div className="flex gap-3">
                      <Skeleton className="w-10 h-10 rounded-full bg-[#272727] flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-full bg-[#272727]" />
                        <Skeleton className="h-3 w-2/3 bg-[#272727]" />
                      </div>
                    </div>
                  </div>
                ))
              ) : videos.length > 0 ? (
                videos.map((v) => (
                  <VideoCard key={v.id} video={v} />
                ))
              ) : (
                <div className="col-span-full flex flex-col items-center justify-center py-20 opacity-50">
                  <Film className="w-20 h-20 mb-4" />
                  <h3 className="text-xl font-bold">No Videos Found</h3>
                  <p className="text-sm">Try another category or search term.</p>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <footer className="mt-20 border-t border-white/5 px-4 md:px-12 py-12">
            <div className="max-w-[2000px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[#ff0000] rounded-lg flex items-center justify-center font-bold text-white italic">X</div>
                <span className="text-xl font-bold text-white tracking-tight">tube</span>
              </div>
              <div className="flex items-center gap-8 text-gray-500 text-sm font-medium">
                <span className="hover:text-white cursor-pointer transition-colors">Privacy</span>
                <span className="hover:text-white cursor-pointer transition-colors">Terms</span>
                <span className="hover:text-white cursor-pointer transition-colors">Contact</span>
                <span className="hover:text-white cursor-pointer transition-colors">Advertise</span>
              </div>
              <p className="text-gray-600 text-xs">
                © 2024 Xtube Platform. All rights reserved.
              </p>
            </div>
          </footer>
        </main>
      )}
    </div>
  )
}
