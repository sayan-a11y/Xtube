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
    <>
      {/* Top Navbar */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-[#0b0f1a]/95 backdrop-blur-md shadow-lg shadow-black/20'
            : 'bg-gradient-to-b from-[#0b0f1a]/80 to-transparent backdrop-blur-sm'
        }`}
      >
        <div className="flex items-center justify-between px-4 md:px-8 h-16">
          {/* Left: Logo + Nav */}
          <div className="flex items-center gap-6">
            {/* Logo */}
            <button
              onClick={handleLogoClick}
              className="flex items-center gap-1.5 group cursor-pointer select-none"
              aria-label="Xtube Home"
            >
              <Play className="w-5 h-5 text-[#ff2d2d] fill-[#ff2d2d] group-hover:scale-110 transition-transform" />
              <span className="text-2xl font-bold text-[#ff2d2d] tracking-tight group-hover:brightness-110 transition-all">
                Xtube
              </span>
            </button>

            {/* Desktop Navigation */}
            <ul className="hidden md:flex items-center gap-5">
              {NAV_ITEMS.map((item) => (
                <li key={item.key}>
                  <button
                    onClick={() => handleNavClick(item.key)}
                    className={`text-sm transition-colors cursor-pointer ${
                      activeNav === item.key
                        ? 'text-white font-medium'
                        : 'text-gray-300 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Right: Search + Bell + Avatar */}
          <div className="flex items-center gap-3">
            {/* Desktop Search (always visible) */}
            <div className="hidden md:block relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search videos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-white/10 border border-white/20 rounded-full pl-9 pr-4 py-2 text-white text-sm placeholder:text-gray-400 focus:outline-none focus:border-[#ff2d2d]/50 focus:bg-white/15 transition-all w-48 focus:w-64"
              />
            </div>

            {/* Mobile Search Toggle */}
            <button
              onClick={() => setMobileSearchOpen((prev) => !prev)}
              className="md:hidden p-2 text-gray-300 hover:text-white transition-colors cursor-pointer"
              aria-label="Toggle search"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Notification Bell */}
            <button
              className="p-2 text-gray-300 hover:text-white transition-colors relative cursor-pointer"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-[#ff2d2d] rounded-full" />
            </button>

            {/* Profile Avatar */}
            <button
              className="w-8 h-8 rounded-full bg-gradient-to-br from-[#ff2d2d] to-[#b91c1c] flex items-center justify-center text-white text-xs font-bold cursor-pointer hover:ring-2 hover:ring-[#ff2d2d]/50 transition-all"
              aria-label="Profile"
            >
              <User className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile Search Bar (expandable) */}
        <div
          className={`md:hidden overflow-hidden transition-all duration-300 ${
            mobileSearchOpen ? 'max-h-16 opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="px-4 pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search videos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus={mobileSearchOpen}
                className="w-full bg-white/10 border border-white/20 rounded-full pl-9 pr-4 py-2.5 text-white text-sm placeholder:text-gray-400 focus:outline-none focus:border-[#ff2d2d]/50 focus:bg-white/15 transition-all"
              />
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 bg-[#0b0f1a] border-t border-white/10 md:hidden safe-area-bottom"
        aria-label="Mobile navigation"
      >
        <div className="flex items-center justify-around h-14 px-2">
          <button
            onClick={() => handleMobileNavClick('home')}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 cursor-pointer transition-colors ${
              activeNav === 'home' && !mobileSearchOpen
                ? 'text-[#ff2d2d]'
                : 'text-gray-400 hover:text-gray-200'
            }`}
            aria-label="Home"
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px] font-medium">Home</span>
          </button>

          <button
            onClick={() => handleMobileNavClick('search')}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 cursor-pointer transition-colors ${
              mobileSearchOpen ? 'text-[#ff2d2d]' : 'text-gray-400 hover:text-gray-200'
            }`}
            aria-label="Search"
          >
            <Search className="w-5 h-5" />
            <span className="text-[10px] font-medium">Search</span>
          </button>

          <button
            onClick={() => handleMobileNavClick('categories')}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 cursor-pointer transition-colors ${
              activeNav === 'categories' && !mobileSearchOpen
                ? 'text-[#ff2d2d]'
                : 'text-gray-400 hover:text-gray-200'
            }`}
            aria-label="Categories"
          >
            <Grid3X3 className="w-5 h-5" />
            <span className="text-[10px] font-medium">Categories</span>
          </button>

          <button
            onClick={() => handleMobileNavClick('profile')}
            className="flex flex-col items-center justify-center gap-0.5 py-1 px-3 cursor-pointer text-gray-400 hover:text-gray-200 transition-colors"
            aria-label="Profile"
          >
            <User className="w-5 h-5" />
            <span className="text-[10px] font-medium">Profile</span>
          </button>
        </div>
      </nav>

      {/* Bottom spacer for mobile to prevent content behind fixed bottom nav */}
      <div className="h-14 md:hidden" />
    </>
  )
}
