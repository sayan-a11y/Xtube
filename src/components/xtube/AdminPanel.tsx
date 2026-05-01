'use client'

import { useAppStore, VideoData, CategoryData, AdminStats } from '@/store/useAppStore'
import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  LayoutDashboard, Upload, Film, FolderOpen, Users, BarChart3, MessageSquare, Settings,
  LogOut, Menu, X, Eye, Heart, HardDrive, Play, Trash2, Edit3, Search, Plus, Check,
  Lock, Info, ChevronRight, FileVideo, AlertTriangle, Filter, MoreVertical,
  CheckCircle2, Clock, Share2, ArrowUpRight, Download, Maximize2
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'
import { Progress } from '@/components/ui/progress'
import { toast } from '@/hooks/use-toast'

// ─── Constants & Mock Data ───────────────────────────────────────────────────

const COLORS = ['#ff2d2d', '#3b82f6', '#f59e0b', '#10b981', '#8b5cf6']

const VIEW_DATA = [
  { name: 'Mon', views: 4000 },
  { name: 'Tue', views: 3000 },
  { name: 'Wed', views: 2000 },
  { name: 'Thu', views: 2780 },
  { name: 'Fri', views: 1890 },
  { name: 'Sat', views: 2390 },
  { name: 'Sun', views: 3490 },
]

const USER_ACTIVITY_DATA = [
  { name: 'Desktop', value: 400 },
  { name: 'Mobile', value: 300 },
  { name: 'Tablet', value: 100 },
]

// ─── Format Helpers ──────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function formatNumber(num: number): string {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M'
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K'
  return num.toString()
}

// ─── Main Admin Component ────────────────────────────────────────────────────

export default function AdminPanel() {
  const { isAdmin, showAdminLogin, logoutAdmin, adminTab, setAdminTab } = useAppStore()
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [scrolled, setScrolled] = useState(false)

  // Auto-close sidebar on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) setIsSidebarOpen(false)
      else setIsSidebarOpen(true)
    }
    window.addEventListener('resize', handleResize)
    handleResize()
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  if (!isAdmin) return null

  return (
    <div className="min-h-screen bg-[#0b0f1a] text-white flex overflow-hidden">
      {/* Sidebar Overlay (Mobile) */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 0, opacity: isSidebarOpen ? 1 : 0 }}
        className="fixed lg:relative h-screen bg-[#121826]/80 backdrop-blur-2xl border-r border-white/10 z-50 flex flex-col overflow-hidden"
      >
        <div className="p-6 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-gradient-to-br from-[#ff2d2d] to-[#ff6b6b] rounded-xl flex items-center justify-center font-black text-white italic text-xl shadow-[0_0_20px_rgba(255,45,45,0.3)]">
              X
            </div>
            <span className="text-2xl font-black text-white tracking-tighter">tube</span>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 hover:bg-white/5 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <nav className="flex-1 py-6 px-4 space-y-2 overflow-y-auto no-scrollbar">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'videos', label: 'All Videos', icon: Film },
            { id: 'categories', label: 'Categories', icon: FolderOpen },
            { id: 'upload', label: 'Upload Video', icon: Upload },
            { id: 'users', label: 'Users', icon: Users },
            { id: 'analytics', label: 'Analytics', icon: BarChart3 },
            { id: 'comments', label: 'Comments', icon: MessageSquare },
            { id: 'settings', label: 'Settings', icon: Settings },
          ].map((item) => {
            const Icon = item.icon
            const isActive = adminTab === item.id
            return (
              <button
                key={item.id}
                onClick={() => setAdminTab(item.id)}
                className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 relative group overflow-hidden ${
                  isActive
                    ? 'text-white bg-[#ff2d2d]/10'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {isActive && (
                  <motion.div 
                    layoutId="active-tab"
                    className="absolute left-0 top-0 bottom-0 w-1 bg-[#ff2d2d] rounded-r-full shadow-[0_0_15px_#ff2d2d]"
                  />
                )}
                <Icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${isActive ? 'text-[#ff2d2d]' : ''}`} />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="p-4 border-t border-white/5">
          <button
            onClick={logoutAdmin}
            className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-semibold text-gray-400 hover:text-[#ff2d2d] hover:bg-[#ff2d2d]/10 transition-all transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className={`h-16 px-6 flex items-center justify-between border-b border-white/5 transition-all ${scrolled ? 'bg-[#0b0f1a]/80 backdrop-blur-md' : 'bg-transparent'}`}>
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className={`lg:hidden p-2 hover:bg-white/5 rounded-lg transition-colors ${isSidebarOpen ? 'hidden' : 'block'}`}>
              <Menu className="w-5 h-5 text-gray-400" />
            </button>
            <h1 className="text-lg font-bold text-white capitalize">{adminTab}</h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input 
                type="text" 
                placeholder="Search command..." 
                className="bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-1.5 text-sm text-white focus:outline-none focus:border-[#ff2d2d]/50 transition-all w-48 focus:w-64"
              />
            </div>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#ff2d2d] to-purple-600 flex items-center justify-center font-bold text-xs">
              AD
            </div>
          </div>
        </header>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div
              key={adminTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {adminTab === 'dashboard' && <DashboardTab />}
              {adminTab === 'videos' && <VideosTab />}
              {adminTab === 'categories' && <CategoriesTab />}
              {adminTab === 'upload' && <UploadTab />}
              {['users', 'analytics', 'comments', 'settings'].includes(adminTab) && (
                <div className="flex flex-col items-center justify-center py-40 opacity-30">
                  <BarChart3 className="w-20 h-20 mb-4" />
                  <h3 className="text-xl font-bold">Work in Progress</h3>
                  <p className="text-sm">The {adminTab} module will be available in the next update.</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}

// ─── Sub-Tabs Implementation ─────────────────────────────────────────────────

function DashboardTab() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/stats')
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchStats() }, [fetchStats])

  const statCards = useMemo(() => [
    { label: 'Total Users', value: '12.8K', icon: Users, color: '#ff2d2d', growth: '+12%' },
    { label: 'Total Videos', value: stats?.totalVideos || '0', icon: Film, color: '#3b82f6', growth: '+5%' },
    { label: 'Total Views', value: formatNumber(stats?.totalViews || 0), icon: Eye, color: '#10b981', growth: '+18%' },
    { label: 'Storage Used', value: formatBytes(stats?.storageUsed || 0), icon: HardDrive, color: '#f59e0b', growth: '92% full' },
  ], [stats])

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="bg-[#121826]/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 relative group hover:border-white/20 transition-all shadow-[0_8px_32px_rgba(0,0,0,0.2)]"
          >
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <card.icon className="w-20 h-20" />
            </div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${card.color}20` }}>
                <card.icon className="w-6 h-6" style={{ color: card.color }} />
              </div>
              <span className={`text-[10px] font-black px-2 py-1 rounded-full ${card.growth.startsWith('+') ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                {card.growth}
              </span>
            </div>
            <p className="text-sm font-bold text-gray-400 mb-1">{card.label}</p>
            <h3 className="text-3xl font-black text-white tracking-tighter">{card.value}</h3>
          </motion.div>
        ))}
      </div>

      {/* Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-[#121826]/60 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-bold text-white">Views Performance</h3>
              <p className="text-sm text-gray-500">Real-time engagement tracking</p>
            </div>
            <div className="flex gap-2">
              <button className="px-4 py-1.5 rounded-lg bg-white/10 text-xs font-bold hover:bg-[#ff2d2d] transition-colors">Daily</button>
              <button className="px-4 py-1.5 rounded-lg bg-white/5 text-xs font-bold hover:bg-white/10 transition-colors">Monthly</button>
            </div>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={VIEW_DATA}>
                <defs>
                  <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ff2d2d" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ff2d2d" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#ffffff20" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                  dy={10}
                />
                <YAxis 
                  stroke="#ffffff20" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(val) => `${val/1000}k`}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#121826', border: '1px solid #ffffff10', borderRadius: '12px', fontSize: '12px' }}
                  itemStyle={{ color: '#ff2d2d' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="views" 
                  stroke="#ff2d2d" 
                  strokeWidth={4}
                  fillOpacity={1} 
                  fill="url(#colorViews)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#121826]/60 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          <h3 className="text-xl font-bold text-white mb-2">User Activity</h3>
          <p className="text-sm text-gray-500 mb-8">Access devices breakdown</p>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={USER_ACTIVITY_DATA}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {USER_ACTIVITY_DATA.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                   contentStyle={{ backgroundColor: '#121826', border: '1px solid #ffffff10', borderRadius: '12px', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-8 space-y-4">
            {USER_ACTIVITY_DATA.map((entry, i) => (
              <div key={entry.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-sm font-bold text-gray-400">{entry.name}</span>
                </div>
                <span className="text-sm font-black text-white">{entry.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="bg-[#121826]/60 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-8 border-b border-white/5 flex items-center justify-between">
           <h3 className="text-xl font-bold text-white">Live Activity Feed</h3>
           <div className="flex items-center gap-2 text-green-500 text-[10px] font-black uppercase tracking-widest">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Real-time
           </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="px-8 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Video</th>
                <th className="px-8 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-8 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Views</th>
                <th className="px-8 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-8 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {(stats?.recentVideos || []).map((video) => (
                <tr key={video.id} className="hover:bg-white/[0.03] transition-colors group">
                  <td className="px-8 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-8 rounded-lg overflow-hidden bg-black/40 shrink-0">
                         <img src={video.thumbnail} className="w-full h-full object-cover" />
                      </div>
                      <span className="text-sm font-bold text-white truncate max-w-[200px]">{video.title}</span>
                    </div>
                  </td>
                  <td className="px-8 py-4">
                    <span className="px-3 py-1 rounded-full bg-white/5 text-[11px] font-bold text-gray-400 group-hover:bg-[#ff2d2d]/10 group-hover:text-[#ff2d2d] transition-colors">
                      {video.category}
                    </span>
                  </td>
                  <td className="px-8 py-4">
                    <div className="flex items-center gap-1.5">
                       <Eye className="w-3.5 h-3.5 text-blue-500" />
                       <span className="text-sm font-black text-white">{formatNumber(video.views)}</span>
                    </div>
                  </td>
                  <td className="px-8 py-4">
                    <div className="flex items-center gap-2 text-green-500 text-[11px] font-bold">
                       <CheckCircle2 className="w-3.5 h-3.5" />
                       Ready
                    </div>
                  </td>
                  <td className="px-8 py-4 text-right text-xs font-medium text-gray-500">
                    {new Date(video.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function VideosTab() {
  const [videos, setVideos] = useState<VideoData[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [categories, setCategories] = useState<CategoryData[]>([])
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const fetchVideos = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      params.set('limit', '100')
      const res = await fetch(`/api/videos?${params}`)
      if (res.ok) {
        const data = await res.json()
        setVideos(data.videos || [])
      }
    } catch (err) {
      console.error('Failed to fetch videos:', err)
    } finally {
      setLoading(false)
    }
  }, [search])

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/categories')
      if (res.ok) {
        const data = await res.json()
        setCategories(data.categories || [])
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err)
    }
  }, [])

  useEffect(() => { fetchVideos() }, [fetchVideos])
  useEffect(() => { fetchCategories() }, [fetchCategories])

  const handleEdit = (video: VideoData) => {
    setEditingId(video.id)
    setEditTitle(video.title)
    setEditDesc(video.description)
    setEditCategory(video.category)
  }

  const handleSaveEdit = async (id: string) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/videos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle, description: editDesc, category: editCategory }),
      })
      if (res.ok) {
        toast({ title: 'Video updated', description: `"${editTitle}" has been updated.` })
        setEditingId(null)
        fetchVideos()
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/videos/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast({ title: 'Video deleted', description: 'The video has been removed.' })
        setDeleteId(null)
        fetchVideos()
      }
    } catch {}
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
           <h2 className="text-3xl font-black text-white tracking-tighter">All Videos</h2>
           <p className="text-sm text-gray-500">Manage and optimize your content library</p>
        </div>
        <div className="flex items-center gap-4">
           <div className="relative group">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-[#ff2d2d] transition-colors" />
             <input 
               type="text" 
               value={search}
               onChange={(e) => setSearch(e.target.value)}
               placeholder="Search videos..." 
               className="bg-[#121826]/60 backdrop-blur-xl border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#ff2d2d]/50 transition-all w-full md:w-64"
             />
           </div>
           <div className="flex p-1 bg-white/5 rounded-xl border border-white/5">
              <button 
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-[#ff2d2d] text-white' : 'text-gray-500 hover:text-white'}`}
              >
                 <LayoutDashboard className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-[#ff2d2d] text-white' : 'text-gray-500 hover:text-white'}`}
              >
                 <Filter className="w-4 h-4" />
              </button>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {videos.map((video) => (
          <motion.div
            key={video.id}
            layout
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-[#121826]/60 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden group hover:border-white/20 transition-all shadow-xl flex flex-col"
          >
            <div className="relative aspect-video bg-black/40 overflow-hidden">
               <img src={video.thumbnail} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
               <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <button onClick={() => useAppStore.getState().openPlayer(video.id)} className="p-3 bg-[#ff2d2d] rounded-full shadow-lg shadow-[#ff2d2d]/40">
                     <Play className="w-5 h-5 fill-white" />
                  </button>
               </div>
               <span className="absolute bottom-3 right-3 bg-black/80 backdrop-blur-md text-[10px] font-black px-2 py-1 rounded-lg border border-white/10">
                 {video.duration}
               </span>
            </div>
            
            <div className="p-5 flex-1 flex flex-col">
              <div className="flex items-start justify-between gap-3 mb-3">
                <h4 className="text-sm font-bold text-white line-clamp-2 leading-snug">{video.title}</h4>
                <div className="relative group/menu">
                   <button className="p-1 hover:bg-white/5 rounded-lg">
                      <MoreVertical className="w-4 h-4 text-gray-500" />
                   </button>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 mb-4">
                 <span className="px-2 py-0.5 rounded-lg bg-[#ff2d2d]/10 text-[#ff2d2d] text-[10px] font-black">{video.category}</span>
                 <span className="px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-500 text-[10px] font-black">{formatBytes(video.size)}</span>
                 {video.status === 'processing' && (
                   <span className="px-2 py-0.5 rounded-lg bg-yellow-500/10 text-yellow-500 text-[10px] font-black animate-pulse">Processing...</span>
                 )}
                 {video.status === 'failed' && (
                   <span className="px-2 py-0.5 rounded-lg bg-red-500/10 text-red-500 text-[10px] font-black">Failed</span>
                 )}
                 {video.status === 'ready' && (
                   <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-lg bg-green-500/10 text-green-500 text-[10px] font-black">Ready</span>
                      <span className="px-2 py-0.5 rounded-lg bg-[#ff2d2d]/20 text-[#ff2d2d] text-[10px] font-black border border-[#ff2d2d]/30">4K Ready</span>
                   </div>
                 )}
              </div>

              <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
                 <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Eye className="w-3.5 h-3.5" />
                    <span>{formatNumber(video.views)}</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <button onClick={() => handleEdit(video)} className="p-2 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl transition-all">
                       <Edit3 className="w-4 h-4" />
                    </button>
                    <button onClick={() => setDeleteId(video.id)} className="p-2 hover:bg-[#ff2d2d]/10 text-gray-400 hover:text-[#ff2d2d] rounded-xl transition-all">
                       <Trash2 className="w-4 h-4" />
                    </button>
                 </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Delete Confirmation */}
      {deleteId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md">
           <div className="bg-[#121826] border border-white/10 rounded-3xl p-8 w-full max-w-sm text-center">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                 <Trash2 className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Delete Video?</h3>
              <p className="text-sm text-gray-500 mb-8">This action is permanent and cannot be undone.</p>
              <div className="flex gap-4">
                 <button onClick={() => setDeleteId(null)} className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 rounded-2xl font-bold transition-all">Cancel</button>
                 <button onClick={() => handleDelete(deleteId)} className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 rounded-2xl font-bold transition-all">Delete</button>
              </div>
           </div>
        </div>
      )}
    </div>
  )
}

function CategoriesTab() {
  const [categories, setCategories] = useState<CategoryData[]>([])
  const [loading, setLoading] = useState(true)
  const [newCatName, setNewCatName] = useState('')
  const [creating, setCreating] = useState(false)

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/categories')
      if (res.ok) {
        const data = await res.json()
        setCategories(data.categories || [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchCategories() }, [fetchCategories])

  const handleCreate = async () => {
    if (!newCatName) return
    setCreating(true)
    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCatName }),
      })
      if (res.ok) {
        toast({ title: 'Category created', description: `"${newCatName}" has been added.` })
        setNewCatName('')
        fetchCategories()
      }
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure? This will uncategorize related videos.')) return
    const res = await fetch(`/api/admin/categories/${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast({ title: 'Category deleted' })
      fetchCategories()
    }
  }

  return (
    <div className="space-y-8">
      <div>
         <h2 className="text-3xl font-black text-white tracking-tighter">Content Categories</h2>
         <p className="text-sm text-gray-500">Organize your library for better discovery</p>
      </div>

      <div className="bg-[#121826]/60 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
         <h3 className="text-lg font-bold text-white mb-6">Create New Category</h3>
         <div className="flex gap-4">
            <div className="relative flex-1">
               <FolderOpen className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
               <input 
                  type="text" 
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Category name (e.g. Action, Drama, Tech)..." 
                  className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-[#ff2d2d]/50 transition-all"
               />
            </div>
            <button 
              onClick={handleCreate}
              disabled={creating || !newCatName}
              className="px-8 py-4 bg-[#ff2d2d] hover:bg-[#e62626] rounded-2xl font-bold shadow-lg shadow-[#ff2d2d]/30 transition-all disabled:opacity-50"
            >
               {creating ? 'Creating...' : 'Create'}
            </button>
         </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
         {categories.map((cat) => (
           <motion.div 
             key={cat.id}
             whileHover={{ y: -5 }}
             className="bg-[#121826]/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 relative group overflow-hidden"
           >
              <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                 <FolderOpen className="w-24 h-24" />
              </div>
              <div className="flex items-start justify-between mb-8">
                 <div className="w-12 h-12 bg-[#ff2d2d]/10 rounded-2xl flex items-center justify-center">
                    <FolderOpen className="w-6 h-6 text-[#ff2d2d]" />
                 </div>
                 <button onClick={() => handleDelete(cat.id)} className="p-2 hover:bg-red-500/10 text-gray-500 hover:text-red-500 rounded-xl transition-all">
                    <Trash2 className="w-4 h-4" />
                 </button>
              </div>
              <h4 className="text-lg font-bold text-white mb-1">{cat.name}</h4>
              <p className="text-xs text-gray-500">Created {new Date(cat.createdAt).toLocaleDateString()}</p>
           </motion.div>
         ))}
      </div>
    </div>
  )
}

function UploadTab() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('Uncategorized')
  const [categories, setCategories] = useState<CategoryData[]>([])
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [dragActive, setDragActive] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/admin/categories')
      .then(res => res.json())
      .then(data => { if (data.categories) setCategories(data.categories) })
  }, [])

  const handleFile = (file: File) => {
    if (file.type.startsWith('video/')) {
      setVideoFile(file)
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
    } else {
      toast({ title: 'Invalid file', description: 'Please select a video file', variant: 'destructive' })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!videoFile || !title) return

    setUploading(true)
    setUploadProgress(0)

    try {
      const presignedRes = await fetch('/api/admin/upload/presigned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: videoFile.name, contentType: videoFile.type || 'video/mp4' })
      })

      if (!presignedRes.ok) throw new Error('Failed to get upload URL')
      const { uploadUrl, publicUrl, videoId } = await presignedRes.json()

      const xhr = new XMLHttpRequest()
      xhr.open('PUT', uploadUrl)
      xhr.setRequestHeader('Content-Type', videoFile.type || 'video/mp4')

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100))
      })

      xhr.onload = async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          await fetch('/api/admin/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: videoId, title, description, category,
              filePath: publicUrl, size: videoFile.size, duration: '0:00'
            })
          })
          toast({ title: 'Success!', description: 'Video uploaded and processing.' })
          setTitle(''); setDescription(''); setVideoFile(null); setPreviewUrl(null); setUploadProgress(0)
        } else {
          throw new Error('Upload failed')
        }
        setUploading(false)
      }
      xhr.send(videoFile)
    } catch (err: any) {
      setUploading(false)
      toast({ title: 'Failed', description: err.message, variant: 'destructive' })
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <div className="flex items-center justify-between">
         <div>
            <h2 className="text-3xl font-black text-white tracking-tighter">Publish Content</h2>
            <p className="text-sm text-gray-500">Upload and optimize for the global audience</p>
         </div>
         <div className="flex items-center gap-4 bg-[#121826]/60 backdrop-blur-xl border border-white/10 rounded-2xl px-6 py-3">
            <HardDrive className="w-5 h-5 text-blue-500" />
            <div className="flex flex-col">
               <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Cloud Storage</span>
               <span className="text-xs font-bold text-white">42.8 GB / 100 GB</span>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         {/* Upload Zone */}
         <div className="space-y-6">
            {!videoFile ? (
              <motion.div
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onDragEnter={() => setDragActive(true)}
                onDragLeave={() => setDragActive(false)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); setDragActive(false); handleFile(e.dataTransfer.files[0]) }}
                onClick={() => fileInputRef.current?.click()}
                className={`aspect-video rounded-3xl border-2 border-dashed flex flex-col items-center justify-center gap-6 cursor-pointer transition-all duration-500 relative overflow-hidden group ${
                  dragActive ? 'border-[#ff2d2d] bg-[#ff2d2d]/10' : 'border-white/10 bg-[#121826]/40 hover:border-white/30'
                }`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-[#ff2d2d]/5 to-blue-500/5 pointer-events-none" />
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                   <Upload className="w-10 h-10 text-gray-400 group-hover:text-[#ff2d2d] transition-colors" />
                </div>
                <div className="text-center relative z-10">
                   <h3 className="text-xl font-bold text-white mb-2">Drag & Drop Video</h3>
                   <p className="text-sm text-gray-500">MP4, MKV, MOV up to 2GB</p>
                </div>
                <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
              </motion.div>
            ) : (
              <div className="space-y-6">
                 <div className="aspect-video rounded-3xl bg-black overflow-hidden relative border border-white/10 shadow-2xl group">
                    {previewUrl && <video src={previewUrl} className="w-full h-full object-contain" muted controls />}
                    <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-[10px] font-black text-white flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full bg-[#ff2d2d] animate-pulse" />
                       LIVE PREVIEW
                    </div>
                    <button onClick={() => {setVideoFile(null); setPreviewUrl(null)}} className="absolute top-4 right-4 p-2 bg-black/80 backdrop-blur-md hover:bg-red-500/80 rounded-xl border border-white/10 transition-all opacity-0 group-hover:opacity-100">
                       <Trash2 className="w-4 h-4 text-white" />
                    </button>
                 </div>
                 <div className="bg-[#121826]/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
                       <FileVideo className="w-6 h-6 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                       <p className="text-sm font-bold text-white truncate">{videoFile.name}</p>
                       <p className="text-[10px] text-gray-500 font-black uppercase">{formatBytes(videoFile.size)} • READY TO PUBLISH</p>
                    </div>
                    <div className="flex items-center gap-1.5 text-green-500 font-black text-[10px]">
                       <CheckCircle2 className="w-4 h-4" />
                       VALIDATED
                    </div>
                 </div>
              </div>
            )}

            <div className="bg-[#121826]/60 backdrop-blur-xl border border-white/10 rounded-3xl p-8 space-y-6">
               <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-[#ff2d2d]" />
                  Quality Pipeline
               </h3>
               <div className="grid grid-cols-3 gap-3">
                  {['360p', '480p', '720p', '1080p', '2K', '4K'].map((q) => (
                    <div key={q} className="p-3 bg-white/5 border border-white/5 rounded-xl flex flex-col items-center gap-2">
                       <span className="text-[10px] font-black text-gray-500">{q}</span>
                       <span className="text-[10px] font-bold text-white/40">Pending</span>
                    </div>
                  ))}
               </div>
               <div className="p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10 flex items-start gap-3">
                  <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-gray-400 leading-relaxed italic">
                    The video will be automatically optimized for multi-resolution HLS streaming after upload. This process ensures high-quality playback on all connection speeds.
                  </p>
               </div>
            </div>
         </div>

         {/* Form Section */}
         <div className="bg-[#121826]/60 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl h-fit space-y-6">
            <h3 className="text-xl font-bold text-white">Video Details</h3>
            <form onSubmit={handleSubmit} className="space-y-6">
               <div className="space-y-2">
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest px-1">Title</label>
                  <input 
                    type="text" 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    placeholder="Catchy title for your content..." 
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-[#ff2d2d]/50 transition-all placeholder:text-gray-600 font-medium"
                  />
               </div>
               <div className="space-y-2">
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest px-1">Description</label>
                  <textarea 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={6}
                    placeholder="Tell your viewers what the video is about..." 
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-[#ff2d2d]/50 transition-all placeholder:text-gray-600 font-medium resize-none"
                  />
               </div>
               <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                     <label className="text-xs font-black text-gray-500 uppercase tracking-widest px-1">Category</label>
                     <select 
                       value={category}
                       onChange={(e) => setCategory(e.target.value)}
                       className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-[#ff2d2d]/50 transition-all appearance-none cursor-pointer font-medium"
                     >
                        <option value="Uncategorized">Select Category</option>
                        {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                     </select>
                  </div>
                  <div className="space-y-2">
                     <label className="text-xs font-black text-gray-500 uppercase tracking-widest px-1">Tags</label>
                     <input 
                       placeholder="Action, Viral, 4K..." 
                       className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-[#ff2d2d]/50 transition-all placeholder:text-gray-600 font-medium"
                     />
                  </div>
               </div>

               {uploading && (
                 <div className="space-y-3 pt-4">
                    <div className="flex items-center justify-between text-xs font-black px-1">
                       <span className="text-blue-500 uppercase tracking-tighter animate-pulse">UPLOADING DATA PACKETS...</span>
                       <span className="text-white">{uploadProgress}%</span>
                    </div>
                    <div className="h-2.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                       <motion.div 
                         className="h-full bg-gradient-to-r from-[#ff2d2d] to-purple-600 rounded-full"
                         initial={{ width: 0 }}
                         animate={{ width: `${uploadProgress}%` }}
                         transition={{ duration: 0.5 }}
                       />
                    </div>
                 </div>
               )}

               <button 
                  type="submit"
                  disabled={uploading || !videoFile || !title}
                  className="w-full bg-gradient-to-r from-[#ff2d2d] to-[#ff6b6b] hover:from-[#e62626] hover:to-[#ff2d2d] py-5 rounded-2xl font-black text-white shadow-xl shadow-[#ff2d2d]/30 transition-all disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-3 active:scale-[0.98]"
               >
                  <Upload className="w-6 h-6" />
                  {uploading ? 'PROCESSING UPLOAD...' : 'START PUBLISHING'}
               </button>
            </form>
         </div>
      </div>
    </div>
  )
}
