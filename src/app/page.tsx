'use client'

import { useAppStore, VideoData } from '@/store/useAppStore'
import Navbar from '@/components/xtube/Navbar'
import PlayerView from '@/components/xtube/PlayerView'
import AdminPanel from '@/components/xtube/AdminPanel'
import { Film } from 'lucide-react'
import { useEffect, useCallback, useState } from 'react'
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

  useEffect(() => { setMounted(true) }, [])

  // ── Fetch videos ──────────────────────────────────────────────────────────
  const fetchVideos = useCallback(async () => {
    setVideosLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedCategory && selectedCategory !== 'All') params.set('category', selectedCategory)
      if (searchQuery) params.set('search', searchQuery)
      const res = await fetch(`/api/videos?${params.toString()}`)
      const data = await res.json()
      setVideos(data.videos || [])
    } catch (err) {
      console.error('Failed to fetch videos:', err)
    } finally {
      setVideosLoading(false)
    }
  }, [selectedCategory, searchQuery, setVideos, setVideosLoading])

  // ── Fetch categories ──────────────────────────────────────────────────────
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
    if (mounted) { fetchVideos(); fetchCategories() }
  }, [mounted, fetchVideos, fetchCategories])

  // ── Restore admin session ─────────────────────────────────────────────────
  useEffect(() => {
    if (mounted) {
      const token = localStorage.getItem('xtube-admin-token')
      if (token) { setIsAdmin(true); setAdminToken(token) }
    }
  }, [mounted, setIsAdmin, setAdminToken])

  // ── Admin login ───────────────────────────────────────────────────────────
  const handleAdminLogin = useCallback(async (password: string) => {
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
  }, [setIsAdmin, setAdminToken, setShowAdminLogin])

  // ── Combined static + DB category tabs ───────────────────────────────────
  const STATIC_CATS = ['Gaming', 'Music', 'Live', 'Tech', 'News']
  const allCategoryNames = [
    'All',
    ...STATIC_CATS,
    ...categories.map((c) => c.name).filter((n) => !STATIC_CATS.includes(n)),
  ]

  // ── Loading splash ────────────────────────────────────────────────────────
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#ff2d2d] to-[#ff3c1a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 border-4 border-white border-t-transparent rounded-full animate-spin" />
          <p className="text-white/80 text-sm font-semibold tracking-wider uppercase">Loading Xtube…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#ff2d2d] to-[#ff3c1a] text-[#1f2937]">
      <Navbar />

      {/* ── Admin Login Modal ────────────────────────────────────────────── */}
      {showAdminLogin && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="bg-[#111827] border border-white/10 rounded-2xl p-8 w-full max-w-md shadow-2xl">
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
                placeholder="Enter password…"
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
                  className="flex-1 bg-[#ff2d2d] hover:bg-[#e62626] text-white py-3 rounded-xl font-bold transition-all"
                >
                  Login
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Main Content ─────────────────────────────────────────────────── */}
      {currentView === 'admin' && isAdmin ? (
        <AdminPanel />
      ) : currentView === 'player' ? (
        <PlayerView />
      ) : (
        <main className="pt-16">
          {/* ── Category Pills ────────────────────────────────────────── */}
          <div className="sticky top-16 z-30 py-4 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-2.5 px-4 sm:px-6 md:px-10 max-w-[1400px] mx-auto w-max">
              {allCategoryNames.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`flex-shrink-0 px-5 py-2 rounded-full text-sm font-bold transition-all shadow-md whitespace-nowrap ${
                    selectedCategory === cat || (cat === 'All' && !selectedCategory)
                      ? 'bg-white text-[#ff2d2d] shadow-white/30'
                      : 'bg-white/20 text-white backdrop-blur-sm hover:bg-white/30 hover:shadow-white/20'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* ── Video Grid Card ───────────────────────────────────────── */}
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-10 pb-10 mt-2">
            <div className="bg-white rounded-[20px] p-4 sm:p-6 md:p-10 shadow-[0_10px_40px_rgba(0,0,0,0.25)]">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {videosLoading
                  ? Array.from({ length: 12 }).map((_, i) => (
                      <div key={i} className="space-y-3">
                        <Skeleton className="aspect-video w-full rounded-2xl bg-gray-100" />
                        <div className="flex gap-3 px-1">
                          <Skeleton className="w-10 h-10 rounded-full bg-gray-100 flex-shrink-0" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-full bg-gray-100" />
                            <Skeleton className="h-3 w-2/3 bg-gray-100" />
                          </div>
                        </div>
                      </div>
                    ))
                  : videos.length > 0
                  ? videos.map((v) => <VideoCard key={v.id} video={v} />)
                  : (
                      <div className="col-span-full flex flex-col items-center justify-center py-24 opacity-50">
                        <Film className="w-20 h-20 mb-4 text-gray-300" />
                        <h3 className="text-xl font-bold text-gray-500">No Videos Found</h3>
                        <p className="text-sm text-gray-400 mt-1">Try another category or search term.</p>
                      </div>
                    )}
              </div>
            </div>
          </div>

          {/* ── Footer ───────────────────────────────────────────────── */}
          <footer className="bg-white border-t border-gray-100 px-4 sm:px-6 md:px-10 py-10 mt-4">
            <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[#ff2d2d] rounded-lg flex items-center justify-center font-black text-white italic shadow-md">
                  X
                </div>
                <span className="text-xl font-black text-gray-900 tracking-tight">tube</span>
              </div>
              <div className="flex items-center gap-6 text-[#9ca3af] text-sm font-medium flex-wrap justify-center">
                {['Privacy', 'Terms', 'Contact', 'Advertise'].map((link) => (
                  <span key={link} className="hover:text-[#ff2d2d] cursor-pointer transition-colors">
                    {link}
                  </span>
                ))}
              </div>
              <p className="text-gray-400 text-xs text-center">© 2026 Xtube Platform. All rights reserved.</p>
            </div>
          </footer>
        </main>
      )}
    </div>
  )
}
