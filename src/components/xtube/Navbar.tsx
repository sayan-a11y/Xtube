'use client'

import { useAppStore } from '@/store/useAppStore'
import { Search, Bell, Home, Grid3X3, User, Play, Cast } from 'lucide-react'
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
    // Mobile: Refresh website
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      window.location.reload()
      return
    }

    // Tablet/PC: 7-tap secret admin access
    clickCountRef.current += 1
    
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current)
    }

    clickTimerRef.current = setTimeout(() => {
      clickCountRef.current = 0
    }, 2000)

    if (clickCountRef.current >= 7) {
      setShowAdminLogin(true)
      clickCountRef.current = 0
    } else {
      goHome()
    }
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
    <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-[#0f0f0f]/95 backdrop-blur-md border-b border-white/5 h-14">
      <div className="flex items-center justify-between px-4 md:px-6 h-full max-w-[2400px] mx-auto gap-4">
        {/* Left: Logo */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleLogoClick}
            className="flex items-center gap-2 group cursor-pointer select-none"
            aria-label="Xtube Home"
          >
            <div className="w-8 h-8 bg-[#ff2d2d] rounded-lg flex items-center justify-center font-bold text-white italic text-lg shadow-lg shadow-[#ff2d2d]/20">
              X
            </div>
            <span className="text-xl font-bold text-white tracking-tight hidden sm:block">
              tube
            </span>
          </button>
        </div>

        {/* Center: Search Bar */}
        <div className="flex-1 max-w-2xl hidden md:block">
          <div className="relative group flex items-center">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#121212] border border-white/10 rounded-l-full pl-6 pr-4 py-2 text-white text-base placeholder:text-gray-500 focus:outline-none focus:border-[#3ea6ff] transition-all"
              />
            </div>
            <button className="bg-white/5 border border-l-0 border-white/10 rounded-r-full px-5 py-2 hover:bg-white/10 transition-colors">
              <Search className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 md:gap-2">
          <button
            onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
            className="md:hidden p-2 text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <Search className="w-5 h-5" />
          </button>
          
          <button className="p-2 text-white hover:bg-white/10 rounded-full transition-colors hidden sm:block">
            <Cast className="w-5 h-5" />
          </button>

          <button className="p-2 text-white hover:bg-white/10 rounded-full transition-colors hidden sm:block">
            <Bell className="w-5 h-5" />
          </button>

          <button 
            onClick={() => useAppStore.getState().setShowAdminLogin(true)}
            className="flex items-center gap-2 px-3 md:px-4 py-1.5 ml-2 bg-white/10 text-white font-medium rounded-full text-xs md:text-sm hover:bg-white/20 transition-all border border-white/10"
          >
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">Sign in</span>
          </button>
        </div>
      </div>

      {/* Mobile Search Dropdown */}
      {mobileSearchOpen && (
        <div className="md:hidden px-4 pb-4 bg-[#0f0f0f] border-b border-white/10 animate-in slide-in-from-top duration-200">
          <div className="relative flex items-center mt-2">
            <input
              type="text"
              placeholder="Search"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#121212] border border-white/10 rounded-full pl-6 pr-12 py-2.5 text-white text-base focus:outline-none focus:border-[#3ea6ff]"
            />
            <Search className="absolute right-4 w-5 h-5 text-gray-500" />
          </div>
        </div>
      )}
    </nav>
  )
}
