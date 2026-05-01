'use client'

import { useAppStore } from '@/store/useAppStore'
import { Search, Bell, Home, Grid3X3, User, Play } from 'lucide-react'
import { useState, useRef, useCallback, useEffect } from 'react'

const NAV_ITEMS = [
  { label: 'Home', key: 'home' },
  { label: 'Movies', key: 'movies' },
  { label: 'Categories', key: 'categories' },
  { label: 'My List', key: 'mylist' },
] as const

type NavKey = (typeof NAV_ITEMS)[number]['key']

export default function Navbar() {
  const { searchQuery, setSearchQuery, setShowAdminLogin, goHome, setCurrentView } = useAppStore()

  const [scrolled, setScrolled] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [activeNav, setActiveNav] = useState<NavKey>('home')

  // Hidden admin access: track rapid clicks on logo
  const clickCountRef = useRef(0)
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Scroll listener
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close mobile search on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileSearchOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleLogoClick = useCallback(() => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

    if (isMobile) {
      // On mobile, clicking logo just refreshes the page
      window.location.reload()
      return
    }

    // Desktop: hidden admin access logic
    clickCountRef.current += 1

    // Clear any existing timer
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current)
    }

    // Reset click count after 2 seconds
    clickTimerRef.current = setTimeout(() => {
      clickCountRef.current = 0
    }, 2000)

    // If 7 clicks within 2 seconds, trigger admin login
    if (clickCountRef.current >= 7) {
      clickCountRef.current = 0
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current)
        clickTimerRef.current = null
      }
      setShowAdminLogin(true)
      return
    }

    // Normal logo click behavior: go home
    goHome()
  }, [goHome, setShowAdminLogin])

  const handleNavClick = useCallback(
    (key: NavKey) => {
      setActiveNav(key)
      if (key === 'home') {
        goHome()
      } else if (key === 'categories') {
        setCurrentView('home')
      } else if (key === 'movies') {
        setCurrentView('home')
      } else if (key === 'mylist') {
        setCurrentView('home')
      }
    },
    [goHome, setCurrentView]
  )

  const handleMobileNavClick = useCallback(
    (key: string) => {
      if (key === 'home') {
        setActiveNav('home')
        goHome()
      } else if (key === 'search') {
        setMobileSearchOpen((prev) => !prev)
      } else if (key === 'categories') {
        setActiveNav('categories')
        setCurrentView('home')
      } else if (key === 'profile') {
        // Profile action placeholder
      }
    },
    [goHome, setCurrentView]
  )

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-white/80 backdrop-blur-xl border-b border-gray-100 h-16">
      <div className="flex items-center justify-between px-4 md:px-8 h-full max-w-[2400px] mx-auto gap-4">
        {/* Left: Logo */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleLogoClick}
            className="flex items-center gap-2 group cursor-pointer select-none"
            aria-label="Xtube Home"
          >
            <div className="w-8 h-8 bg-[#6d9bc3] rounded-lg flex items-center justify-center font-bold text-white italic text-lg shadow-lg shadow-[#6d9bc3]/20">
              X
            </div>
            <span className="text-xl font-bold text-gray-900 tracking-tight hidden sm:block">
              tube
            </span>
          </button>
        </div>

        {/* Center: Search Bar */}
        <div className="flex-1 max-w-2xl hidden md:block">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#6d9bc3] transition-colors" />
            <input
              type="text"
              placeholder="Search content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-100 border-none rounded-full pl-11 pr-4 py-2.5 text-gray-900 text-sm placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-[#6d9bc3]/20 transition-all outline-none"
            />
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 md:gap-4">
          <button
            onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
            className="md:hidden p-2 text-gray-400 hover:text-gray-900 transition-colors"
          >
            <Search className="w-5 h-5" />
          </button>
          
          <button 
            onClick={() => useAppStore.getState().setShowAdminLogin(true)}
            className="flex items-center gap-2 px-3 md:px-5 py-2 bg-[#6d9bc3]/10 text-[#6d9bc3] font-bold rounded-full text-xs md:text-sm hover:bg-[#6d9bc3]/20 transition-all"
          >
            <User className="w-3.5 h-3.5 md:w-4 md:h-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </button>

          <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gray-200 border-2 border-white shadow-sm flex items-center justify-center overflow-hidden flex-shrink-0">
            <User className="w-4 h-4 md:w-5 md:h-5 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Mobile Search Dropdown */}
      {mobileSearchOpen && (
        <div className="md:hidden px-4 pb-4 bg-white border-b border-gray-100 animate-in slide-in-from-top duration-200">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-100 border-none rounded-xl pl-11 pr-4 py-3 text-gray-900 text-sm focus:bg-white focus:ring-2 focus:ring-[#6d9bc3]/20 outline-none"
            />
          </div>
        </div>
      )}
    </nav>
  )
}
