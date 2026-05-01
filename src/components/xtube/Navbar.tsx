'use client'

import { useAppStore } from '@/store/useAppStore'
import { Search, User, X } from 'lucide-react'
import { useState, useRef, useCallback, useEffect } from 'react'

export default function Navbar() {
  const { searchQuery, setSearchQuery, setShowAdminLogin, goHome } = useAppStore()

  const [scrolled, setScrolled] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)

  // Hidden admin access: track rapid clicks on logo
  const clickCountRef = useRef(0)
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Scroll listener
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close mobile search on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileSearchOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleLogoClick = useCallback(() => {
    // Hidden admin: 7 rapid clicks triggers login
    clickCountRef.current += 1
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current)
    clickTimerRef.current = setTimeout(() => { clickCountRef.current = 0 }, 2000)

    if (clickCountRef.current >= 7) {
      clickCountRef.current = 0
      if (clickTimerRef.current) { clearTimeout(clickTimerRef.current); clickTimerRef.current = null }
      setShowAdminLogin(true)
      return
    }
    goHome()
  }, [goHome, setShowAdminLogin])

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/95 backdrop-blur-xl shadow-md border-b border-gray-100'
          : 'bg-white/80 backdrop-blur-md border-b border-gray-100'
      } h-16`}
    >
      <div className="flex items-center justify-between px-4 sm:px-6 md:px-10 h-full max-w-[1400px] mx-auto gap-3">

        {/* ── Logo ─────────────────────────────────────────────────── */}
        <button
          onClick={handleLogoClick}
          className="flex items-center gap-1.5 group cursor-pointer select-none flex-shrink-0"
          aria-label="Xtube Home"
        >
          <div className="w-8 h-8 bg-[#ff2d2d] rounded-lg flex items-center justify-center font-black text-white italic text-lg shadow-lg shadow-[#ff2d2d]/30 group-hover:brightness-110 transition-all">
            X
          </div>
          <span className="text-xl font-black text-gray-900 tracking-tight hidden sm:block">
            tube
          </span>
        </button>

        {/* ── Desktop Search ────────────────────────────────────────── */}
        <div className="flex-1 max-w-xl hidden md:block">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#ff2d2d] transition-colors" />
            <input
              type="text"
              placeholder="Search Xtube..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-100 rounded-full pl-11 pr-4 py-2.5 text-gray-900 text-sm placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-[#ff2d2d]/20 transition-all outline-none border border-transparent focus:border-[#ff2d2d]/20"
            />
          </div>
        </div>

        {/* ── Right Actions ─────────────────────────────────────────── */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Mobile search toggle */}
          <button
            onClick={() => setMobileSearchOpen((v) => !v)}
            className="md:hidden p-2 rounded-full text-gray-500 hover:text-[#ff2d2d] hover:bg-[#ff2d2d]/10 transition-all"
            aria-label="Search"
          >
            {mobileSearchOpen ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
          </button>

          {/* Dashboard / Admin button */}
          <button
            onClick={() => useAppStore.getState().setShowAdminLogin(true)}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-[#ff2d2d]/10 text-[#ff2d2d] font-bold rounded-full text-xs sm:text-sm hover:bg-[#ff2d2d]/20 transition-all"
          >
            <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
            <span className="hidden sm:inline whitespace-nowrap">Dashboard</span>
          </button>

          {/* Avatar */}
          <div className="w-8 h-8 rounded-full bg-[#ff2d2d]/10 border-2 border-white shadow-sm flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 text-[#ff2d2d]" />
          </div>
        </div>
      </div>

      {/* ── Mobile Search Dropdown ────────────────────────────────── */}
      {mobileSearchOpen && (
        <div className="md:hidden px-4 pb-3 pt-1 bg-white border-b border-gray-100 shadow-lg animate-in slide-in-from-top-2 duration-200">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search Xtube..."
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-100 rounded-xl pl-11 pr-4 py-3 text-gray-900 text-sm focus:bg-white focus:ring-2 focus:ring-[#ff2d2d]/20 outline-none transition-all"
            />
          </div>
        </div>
      )}
    </nav>
  )
}
