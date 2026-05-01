import { create } from 'zustand'

export type ViewMode = 'home' | 'player' | 'admin'

export interface VideoData {
  id: string
  title: string
  description: string
  category: string
  filePath: string
  thumbnail: string
  hlsPath: string
  duration: string
  views: number
  likes: number
  size: number
  status: string
  createdAt: string
  updatedAt: string
}

export interface CategoryData {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

export interface AdminStats {
  totalVideos: number
  totalCategories: number
  totalViews: number
  totalLikes: number
  storageUsed: number
  recentVideos: VideoData[]
  categoryStats: { category: string; count: number }[]
}

interface AppState {
  currentView: ViewMode
  selectedVideoId: string | null
  selectedCategory: string
  videos: VideoData[]
  videosLoading: boolean
  videosTotal: number
  categories: CategoryData[]
  isAdmin: boolean
  adminToken: string | null
  adminTab: string
  showAdminLogin: boolean
  searchQuery: string
  heroVideoIndex: number

  setCurrentView: (view: ViewMode) => void
  setSelectedVideoId: (id: string | null) => void
  setSelectedCategory: (category: string) => void
  setVideos: (videos: VideoData[]) => void
  setVideosLoading: (loading: boolean) => void
  setVideosTotal: (total: number) => void
  setCategories: (categories: CategoryData[]) => void
  setIsAdmin: (isAdmin: boolean) => void
  setAdminToken: (token: string | null) => void
  setAdminTab: (tab: string) => void
  setShowAdminLogin: (show: boolean) => void
  setSearchQuery: (query: string) => void
  setHeroVideoIndex: (index: number) => void
  openPlayer: (videoId: string) => void
  goHome: () => void
  logoutAdmin: () => void
}

export const useAppStore = create<AppState>((set) => ({
  currentView: 'home',
  selectedVideoId: null,
  selectedCategory: 'All',
  videos: [],
  videosLoading: false,
  videosTotal: 0,
  categories: [],
  isAdmin: false,
  adminToken: null,
  adminTab: 'dashboard',
  showAdminLogin: false,
  searchQuery: '',
  heroVideoIndex: 0,

  setCurrentView: (currentView) => set({ currentView }),
  setSelectedVideoId: (selectedVideoId) => set({ selectedVideoId }),
  setSelectedCategory: (selectedCategory) => set({ selectedCategory }),
  setVideos: (videos) => set({ videos }),
  setVideosLoading: (videosLoading) => set({ videosLoading }),
  setVideosTotal: (videosTotal) => set({ videosTotal }),
  setCategories: (categories) => set({ categories }),
  setIsAdmin: (isAdmin) => set({ isAdmin }),
  setAdminToken: (adminToken) => {
    if (typeof window !== 'undefined') {
      if (adminToken) {
        localStorage.setItem('xtube-admin-token', adminToken)
      } else {
        localStorage.removeItem('xtube-admin-token')
      }
    }
    set({ adminToken })
  },
  setAdminTab: (adminTab) => set({ adminTab }),
  setShowAdminLogin: (showAdminLogin) => set({ showAdminLogin }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setHeroVideoIndex: (heroVideoIndex) => set({ heroVideoIndex }),
  openPlayer: (videoId) => set({ currentView: 'player', selectedVideoId: videoId }),
  goHome: () => set({ currentView: 'home', selectedVideoId: null }),
  logoutAdmin: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('xtube-admin-token')
    }
    set({ isAdmin: false, adminToken: null, currentView: 'home' })
  },
}))
