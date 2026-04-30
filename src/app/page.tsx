'use client'

import { useAppStore, VideoData, CategoryData } from '@/store/useAppStore'
import Navbar from '@/components/xtube/Navbar'
import HeroSection from '@/components/xtube/HeroSection'
import ContentRow from '@/components/xtube/ContentRow'
import PlayerView from '@/components/xtube/PlayerView'
import AdminPanel from '@/components/xtube/AdminPanel'
import { Flame, Clock, Star, TrendingUp, Film } from 'lucide-react'
import { useEffect, useMemo, useCallback, useState } from 'react'

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
    <div className="min-h-screen bg-[#0b0f1a] text-white">
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
        <main className="pt-16 pb-20 md:pb-8">
          {/* Hero Section */}
          <HeroSection />

          {/* Category Tabs */}
          <div className="px-4 md:px-12 mt-6 mb-2">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
              <button
                onClick={() => setSelectedCategory('All')}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedCategory === 'All'
                    ? 'bg-[#ff2d2d] text-white'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.name)}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    selectedCategory === cat.name
                      ? 'bg-[#ff2d2d] text-white'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
              {/* Also show categories from videos that might not be in the categories table */}
              {Object.keys(categoryGroups)
                .filter((cat) => cat !== 'Uncategorized' && !categories.some((c) => c.name === cat))
                .map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      selectedCategory === cat
                        ? 'bg-[#ff2d2d] text-white'
                        : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
            </div>
          </div>

          {/* Trending Now */}
          {trendingVideos.length > 0 && (
            <ContentRow
              title="Trending Now"
              videos={trendingVideos}
              icon={<Flame className="w-5 h-5 text-[#ff2d2d]" />}
            />
          )}

          {/* Recently Added */}
          {recentVideos.length > 0 && (
            <ContentRow
              title="Recently Added"
              videos={recentVideos}
              icon={<Clock className="w-5 h-5 text-blue-400" />}
            />
          )}

          {/* Top Rated */}
          {topRatedVideos.length > 0 && (
            <ContentRow
              title="Top Rated"
              videos={topRatedVideos}
              icon={<Star className="w-5 h-5 text-yellow-400" />}
            />
          )}

          {/* Category-specific rows */}
          {Object.entries(categoryGroups)
            .filter(([cat]) => cat !== 'Uncategorized')
            .map(([category, catVideos]) => (
              <ContentRow
                key={category}
                title={category}
                videos={catVideos}
                icon={<TrendingUp className="w-5 h-5 text-green-400" />}
              />
            ))}

          {/* Uncategorized */}
          {categoryGroups['Uncategorized'] && categoryGroups['Uncategorized'].length > 0 && (
            <ContentRow
              title="Other"
              videos={categoryGroups['Uncategorized']}
              icon={<Film className="w-5 h-5 text-purple-400" />}
            />
          )}

          {/* Empty State - No videos at all */}
          {videos.length === 0 && !videosLoading && (
            <div className="flex flex-col items-center justify-center py-20 px-4">
              <Film className="w-20 h-20 text-gray-700 mb-4" />
              <h3 className="text-xl font-bold text-gray-400 mb-2">No Videos Yet</h3>
              <p className="text-gray-500 text-center max-w-md">
                Videos will appear here once the admin uploads content.
                <br />
                <span className="text-gray-600 text-sm mt-1 block">
                  Tip: Click the logo 7 times to access admin panel (desktop only)
                </span>
              </p>
            </div>
          )}

          {/* Footer */}
          <footer className="mt-16 border-t border-white/5 px-4 md:px-12 py-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Film className="w-5 h-5 text-[#ff2d2d]" />
                <span className="text-lg font-bold text-[#ff2d2d]">Xtube</span>
              </div>
              <p className="text-gray-500 text-sm">
                © 2024 Xtube. Premium streaming experience.
              </p>
              <div className="flex items-center gap-4 text-gray-500 text-sm">
                <span>Privacy</span>
                <span>Terms</span>
                <span>Contact</span>
              </div>
            </div>
          </footer>
        </main>
      )}
    </div>
  )
}
