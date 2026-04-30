'use client'

import { useAppStore, VideoData, CategoryData, AdminStats } from '@/store/useAppStore'
import { useState, useEffect, useCallback, useRef } from 'react'
import {
  BarChart3, Upload, Film, FolderOpen, Settings, LogOut, Menu, X,
  Eye, Heart, HardDrive, Play, Trash2, Edit3, Search, Plus, Check,
  Lock, Info, ChevronRight, FileVideo, AlertTriangle
} from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Progress } from '@/components/ui/progress'
import { toast } from '@/hooks/use-toast'

// ─── Admin Login Modal ───────────────────────────────────────────────────────
function AdminLoginModal() {
  const { setShowAdminLogin, setIsAdmin, setAdminToken, setCurrentView } = useAppStore()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()

      if (res.ok && data.success) {
        setIsAdmin(true)
        setAdminToken(data.token)
        setShowAdminLogin(false)
        setCurrentView('admin')
      } else {
        setError(data.error || 'Authentication failed')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-md mx-4 bg-[#111827]/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl shadow-[#ff2d2d]/10 p-8">
        {/* Glow effect */}
        <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-br from-[#ff2d2d]/20 via-transparent to-[#ff2d2d]/10 pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-[#ff2d2d]/10 flex items-center justify-center border border-[#ff2d2d]/20">
              <Lock className="w-8 h-8 text-[#ff2d2d]" />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-white text-center mb-2">Admin Access</h2>
          <p className="text-gray-400 text-center text-sm mb-6">Enter your admin password to continue</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError('') }}
                placeholder="Enter password"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-[#ff2d2d]/50 focus:ring-1 focus:ring-[#ff2d2d]/30 transition-all"
                autoFocus
                disabled={loading}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-[#ff2d2d] text-sm bg-[#ff2d2d]/10 rounded-lg px-3 py-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full bg-[#ff2d2d] hover:bg-[#e62626] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg py-3 font-medium transition-all cursor-pointer"
            >
              {loading ? 'Authenticating...' : 'Login'}
            </button>

            <button
              type="button"
              onClick={() => setShowAdminLogin(false)}
              className="w-full text-gray-400 hover:text-white text-sm py-2 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

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

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  })
}

// ─── Sidebar Navigation ──────────────────────────────────────────────────────
const SIDEBAR_TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'upload', label: 'Upload Video', icon: Upload },
  { id: 'videos', label: 'All Videos', icon: Film },
  { id: 'categories', label: 'Categories', icon: FolderOpen },
  { id: 'settings', label: 'Settings', icon: Settings },
] as const

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { adminTab, setAdminTab, logoutAdmin } = useAppStore()

  const handleTabClick = (tabId: string) => {
    setAdminTab(tabId)
    onNavigate?.()
  }

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 py-5 border-b border-white/10">
        <Play className="w-6 h-6 text-[#ff2d2d] fill-[#ff2d2d]" />
        <span className="text-xl font-bold text-[#ff2d2d]">Xtube</span>
        <span className="text-xs text-gray-500 ml-1 bg-white/5 px-2 py-0.5 rounded">Admin</span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-4 px-3 space-y-1">
        {SIDEBAR_TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = adminTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#ff2d2d]/10 text-[#ff2d2d] border border-[#ff2d2d]/20'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{tab.label}</span>
              {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
            </button>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-white/10">
        <button
          onClick={logoutAdmin}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-400 hover:text-[#ff2d2d] hover:bg-[#ff2d2d]/5 transition-all cursor-pointer"
        >
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  )
}

// ─── Dashboard Tab ───────────────────────────────────────────────────────────
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

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white">Dashboard</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-[#111827] rounded-xl border border-white/5 p-6 animate-pulse">
              <div className="h-4 w-20 bg-white/10 rounded mb-3" />
              <div className="h-8 w-16 bg-white/10 rounded" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p>Failed to load dashboard stats</p>
        <button onClick={fetchStats} className="mt-2 text-[#ff2d2d] hover:underline cursor-pointer">Retry</button>
      </div>
    )
  }

  const statCards = [
    { label: 'Total Videos', value: stats.totalVideos, icon: Film, color: '#ff2d2d' },
    { label: 'Total Views', value: formatNumber(stats.totalViews), icon: Eye, color: '#3b82f6' },
    { label: 'Total Likes', value: formatNumber(stats.totalLikes), icon: Heart, color: '#f59e0b' },
    { label: 'Storage Used', value: formatBytes(stats.storageUsed), icon: HardDrive, color: '#10b981' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Dashboard</h2>
        <button onClick={fetchStats} className="text-gray-400 hover:text-white text-sm transition-colors cursor-pointer">
          Refresh
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <div
              key={card.label}
              className="bg-gradient-to-br from-[#111827] to-[#1a1f2e] border border-white/5 rounded-xl p-6 hover:border-white/10 transition-all group"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-400 text-sm">{card.label}</span>
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${card.color}15`, border: `1px solid ${card.color}30` }}
                >
                  <Icon className="w-5 h-5" style={{ color: card.color }} />
                </div>
              </div>
              <p className="text-3xl font-bold text-white">{card.value}</p>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <div className="bg-[#111827] rounded-xl border border-white/5 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Category Breakdown</h3>
          {stats.categoryStats.length === 0 ? (
            <p className="text-gray-500 text-sm">No categories yet</p>
          ) : (
            <div className="space-y-3">
              {stats.categoryStats.map((cat) => {
                const maxCount = Math.max(...stats.categoryStats.map(c => c.count))
                const pct = maxCount > 0 ? (cat.count / maxCount) * 100 : 0
                return (
                  <div key={cat.category} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-300">{cat.category}</span>
                      <span className="text-gray-500">{cat.count} videos</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#ff2d2d] to-[#ff6b6b] rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Recent Videos */}
        <div className="bg-[#111827] rounded-xl border border-white/5 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Recent Videos</h3>
          {stats.recentVideos.length === 0 ? (
            <p className="text-gray-500 text-sm">No videos yet</p>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar">
              {stats.recentVideos.map((video) => (
                <div key={video.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
                  <div className="w-16 h-10 rounded overflow-hidden bg-white/5 shrink-0 relative">
                    {video.thumbnail ? (
                      <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <Film className="w-4 h-4 text-gray-600" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white truncate">{video.title}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{video.views}</span>
                      <span>{video.category}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Upload Video Tab ────────────────────────────────────────────────────────
function UploadTab() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('Uncategorized')
  const [categories, setCategories] = useState<CategoryData[]>([])
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/admin/categories')
      .then(res => res.json())
      .then(data => {
        if (data.categories) setCategories(data.categories)
      })
      .catch(console.error)
  }, [])

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true)
    else if (e.type === 'dragleave') setDragActive(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('video/')) {
      setVideoFile(file)
    }
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) setVideoFile(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!videoFile || !title) return

    setUploading(true)
    setUploadProgress(0)

    const formData = new FormData()
    formData.append('video', videoFile)
    formData.append('title', title)
    formData.append('description', description)
    formData.append('category', category)

    const xhr = new XMLHttpRequest()

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100)
        setUploadProgress(percent)
      }
    })

    xhr.addEventListener('load', () => {
      setUploading(false)
      if (xhr.status >= 200 && xhr.status < 300) {
        toast({ title: 'Upload successful!', description: `"${title}" has been uploaded.` })
        setTitle('')
        setDescription('')
        setCategory('Uncategorized')
        setVideoFile(null)
        setUploadProgress(0)
        if (fileInputRef.current) fileInputRef.current.value = ''
      } else {
        try {
          const data = JSON.parse(xhr.responseText)
          toast({ title: 'Upload failed', description: data.error || 'Unknown error', variant: 'destructive' })
        } catch {
          toast({ title: 'Upload failed', description: 'Unknown error', variant: 'destructive' })
        }
      }
    })

    xhr.addEventListener('error', () => {
      setUploading(false)
      toast({ title: 'Upload failed', description: 'Network error', variant: 'destructive' })
    })

    xhr.open('POST', '/api/admin/upload')
    xhr.send(formData)
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Upload Video</h2>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        {/* Drag & Drop Zone */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
            dragActive
              ? 'border-[#ff2d2d] bg-[#ff2d2d]/5'
              : videoFile
                ? 'border-green-500/50 bg-green-500/5'
                : 'border-white/20 hover:border-white/40 bg-white/[0.02]'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          {videoFile ? (
            <div className="space-y-2">
              <FileVideo className="w-12 h-12 text-green-400 mx-auto" />
              <p className="text-white font-medium">{videoFile.name}</p>
              <p className="text-gray-400 text-sm">{formatBytes(videoFile.size)}</p>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setVideoFile(null) }}
                className="text-[#ff2d2d] text-sm hover:underline cursor-pointer"
              >
                Remove file
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className="w-12 h-12 text-gray-500 mx-auto" />
              <p className="text-gray-300">Drag & drop your video here</p>
              <p className="text-gray-500 text-sm">or click to browse files</p>
            </div>
          )}
        </div>

        {/* Max file size notice */}
        <p className="text-gray-500 text-xs -mt-4">Max recommended file size: 2GB. Supported formats: MP4, WebM, MOV, AVI</p>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Title <span className="text-[#ff2d2d]">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter video title"
            required
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-[#ff2d2d]/50 focus:ring-1 focus:ring-[#ff2d2d]/30 transition-all"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter video description (optional)"
            rows={4}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-[#ff2d2d]/50 focus:ring-1 focus:ring-[#ff2d2d]/30 transition-all resize-none"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#ff2d2d]/50 focus:ring-1 focus:ring-[#ff2d2d]/30 transition-all appearance-none cursor-pointer"
            style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.75rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.25em 1.25em' }}
          >
            <option value="Uncategorized" className="bg-[#111827]">Uncategorized</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.name} className="bg-[#111827]">{cat.name}</option>
            ))}
          </select>
        </div>

        {/* Thumbnail notice */}
        <div className="flex items-center gap-2 text-gray-400 text-sm bg-white/5 rounded-lg px-4 py-3">
          <Info className="w-4 h-4 shrink-0" />
          <span>Thumbnail will be auto-generated from the video</span>
        </div>

        {/* Upload Progress */}
        {uploading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-300">Uploading...</span>
              <span className="text-[#ff2d2d]">{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="h-2 bg-white/10 [&>div]:bg-gradient-to-r [&>div]:from-[#ff2d2d] [&>div]:to-[#ff6b6b]" />
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={uploading || !videoFile || !title}
          className="w-full bg-[#ff2d2d] hover:bg-[#e62626] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg py-3 font-medium transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          <Upload className="w-5 h-5" />
          {uploading ? 'Uploading...' : 'Upload Video'}
        </button>
      </form>
    </div>
  )
}

// ─── All Videos Tab ──────────────────────────────────────────────────────────
function VideosTab() {
  const { openPlayer } = useAppStore()
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
  useEffect(() => { fetchCategories() }, [])

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
      } else {
        const data = await res.json()
        toast({ title: 'Update failed', description: data.error || 'Unknown error', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Update failed', description: 'Network error', variant: 'destructive' })
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
      } else {
        const data = await res.json()
        toast({ title: 'Delete failed', description: data.error || 'Unknown error', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Delete failed', description: 'Network error', variant: 'destructive' })
    }
  }

  const filteredVideos = videos

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white">All Videos</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-[#111827] rounded-xl border border-white/5 animate-pulse h-64" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-white">All Videos</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search videos..."
            className="bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-[#ff2d2d]/50 transition-all w-full sm:w-64"
          />
        </div>
      </div>

      {filteredVideos.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Film className="w-16 h-16 mx-auto mb-3 opacity-30" />
          <p>No videos found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVideos.map((video) => (
            <div
              key={video.id}
              className="bg-[#111827] rounded-xl border border-white/5 overflow-hidden hover:border-white/10 transition-all group"
            >
              {/* Thumbnail */}
              <div className="relative aspect-video bg-black/50 overflow-hidden">
                {video.thumbnail ? (
                  <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Film className="w-8 h-8 text-gray-700" />
                  </div>
                )}
                {/* Duration badge */}
                <span className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded">
                  {video.duration}
                </span>
              </div>

              <div className="p-4 space-y-3">
                {editingId === video.id ? (
                  /* Inline Edit Form */
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#ff2d2d]/50 transition-all"
                    />
                    <textarea
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      rows={2}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#ff2d2d]/50 transition-all resize-none"
                    />
                    <select
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#ff2d2d]/50 transition-all appearance-none cursor-pointer"
                      style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.75rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.25em 1.25em' }}
                    >
                      <option value="Uncategorized" className="bg-[#111827]">Uncategorized</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.name} className="bg-[#111827]">{cat.name}</option>
                      ))}
                    </select>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSaveEdit(video.id)}
                        disabled={saving}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg py-2 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="flex-1 bg-white/10 hover:bg-white/20 text-gray-300 text-sm rounded-lg py-2 transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Video Info */}
                    <div>
                      <h3 className="text-white font-medium truncate">{video.title}</h3>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                        <span className="bg-white/5 px-2 py-0.5 rounded">{video.category}</span>
                        <span>{formatBytes(video.size)}</span>
                        <span>{formatDate(video.createdAt)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{video.views}</span>
                      <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{video.likes}</span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                      <button
                        onClick={() => handleEdit(video)}
                        className="flex-1 flex items-center justify-center gap-1 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-sm rounded-lg py-2 transition-all cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => setDeleteId(video.id)}
                        className="flex-1 flex items-center justify-center gap-1 bg-white/5 hover:bg-[#ff2d2d]/10 text-gray-300 hover:text-[#ff2d2d] text-sm rounded-lg py-2 transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                      <button
                        onClick={() => openPlayer(video.id)}
                        className="flex-1 flex items-center justify-center gap-1 bg-[#ff2d2d]/10 hover:bg-[#ff2d2d]/20 text-[#ff2d2d] text-sm rounded-lg py-2 transition-all cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5" /> Watch
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="bg-[#111827] border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Video?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              This action cannot be undone. The video file, thumbnail, and HLS stream will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/10 text-gray-300 border-white/10 hover:bg-white/20 hover:text-white">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              className="bg-[#ff2d2d] hover:bg-[#e62626] text-white border-none"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ─── Categories Tab ──────────────────────────────────────────────────────────
function CategoriesTab() {
  const [categories, setCategories] = useState<CategoryData[]>([])
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [newCatName, setNewCatName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)

  const fetchCategories = useCallback(async () => {
    try {
      const [catRes, vidRes] = await Promise.all([
        fetch('/api/admin/categories'),
        fetch('/api/videos?limit=1000'),
      ])
      if (catRes.ok) {
        const catData = await catRes.json()
        setCategories(catData.categories || [])
      }
      if (vidRes.ok) {
        const vidData = await vidRes.json()
        const counts: Record<string, number> = {}
        ;(vidData.videos || []).forEach((v: VideoData) => {
          counts[v.category] = (counts[v.category] || 0) + 1
        })
        setCategoryCounts(counts)
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchCategories() }, [fetchCategories])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCatName.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCatName.trim() }),
      })
      if (res.ok) {
        toast({ title: 'Category created', description: `"${newCatName}" has been added.` })
        setNewCatName('')
        fetchCategories()
      } else {
        const data = await res.json()
        toast({ title: 'Failed to create', description: data.error || 'Unknown error', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Failed to create', description: 'Network error', variant: 'destructive' })
    } finally {
      setCreating(false)
    }
  }

  const handleSaveEdit = async (id: string) => {
    if (!editName.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim() }),
      })
      if (res.ok) {
        toast({ title: 'Category updated', description: `Renamed to "${editName}".` })
        setEditingId(null)
        fetchCategories()
      } else {
        const data = await res.json()
        toast({ title: 'Update failed', description: data.error || 'Unknown error', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Update failed', description: 'Network error', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/categories/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast({ title: 'Category deleted', description: 'Videos moved to Uncategorized.' })
        setDeleteId(null)
        fetchCategories()
      } else {
        const data = await res.json()
        toast({ title: 'Delete failed', description: data.error || 'Unknown error', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Delete failed', description: 'Network error', variant: 'destructive' })
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white">Categories</h2>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-[#111827] rounded-xl border border-white/5 p-4 animate-pulse">
            <div className="h-5 w-40 bg-white/10 rounded" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Categories</h2>

      {/* Add new category */}
      <form onSubmit={handleCreate} className="flex gap-3 max-w-md">
        <input
          type="text"
          value={newCatName}
          onChange={(e) => setNewCatName(e.target.value)}
          placeholder="New category name"
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-[#ff2d2d]/50 focus:ring-1 focus:ring-[#ff2d2d]/30 transition-all"
        />
        <button
          type="submit"
          disabled={creating || !newCatName.trim()}
          className="bg-[#ff2d2d] hover:bg-[#e62626] disabled:opacity-50 text-white rounded-lg px-4 py-2.5 text-sm font-medium transition-all cursor-pointer flex items-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          Add
        </button>
      </form>

      {/* Category List */}
      {categories.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No categories yet</p>
        </div>
      ) : (
        <div className="space-y-3 max-w-2xl">
          {categories.map((cat) => {
            const count = categoryCounts[cat.name] || 0
            return (
              <div
                key={cat.id}
                className="bg-[#111827] rounded-xl border border-white/5 p-4 flex items-center gap-4 hover:border-white/10 transition-all"
              >
                {editingId === cat.id ? (
                  <>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#ff2d2d]/50 transition-all"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit(cat.id)
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                    />
                    <button
                      onClick={() => handleSaveEdit(cat.id)}
                      disabled={saving}
                      className="p-2 text-green-400 hover:bg-green-400/10 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Check className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="p-2 text-gray-400 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </>
                ) : (
                  <>
                    <FolderOpen className="w-5 h-5 text-[#ff2d2d] shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{cat.name}</p>
                      <p className="text-gray-500 text-xs">{count} video{count !== 1 ? 's' : ''}</p>
                    </div>
                    <button
                      onClick={() => { setEditingId(cat.id); setEditName(cat.name) }}
                      className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteId(cat.id)}
                      className="p-2 text-gray-400 hover:text-[#ff2d2d] hover:bg-[#ff2d2d]/10 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="bg-[#111827] border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Category?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Videos in this category will be moved to &ldquo;Uncategorized&rdquo;. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/10 text-gray-300 border-white/10 hover:bg-white/20 hover:text-white">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              className="bg-[#ff2d2d] hover:bg-[#e62626] text-white border-none"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ─── Settings Tab ────────────────────────────────────────────────────────────
function SettingsTab() {
  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-2xl font-bold text-white">Settings</h2>

      {/* Password Change (placeholder) */}
      <div className="bg-[#111827] rounded-xl border border-white/5 p-6 space-y-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Lock className="w-5 h-5 text-[#ff2d2d]" />
          Change Admin Password
        </h3>
        <div className="space-y-3">
          <input
            type="password"
            placeholder="Current password"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-[#ff2d2d]/50 transition-all"
          />
          <input
            type="password"
            placeholder="New password"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-[#ff2d2d]/50 transition-all"
          />
          <input
            type="password"
            placeholder="Confirm new password"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-[#ff2d2d]/50 transition-all"
          />
        </div>
        <button
          disabled
          className="bg-[#ff2d2d]/50 text-white rounded-lg px-6 py-2.5 text-sm font-medium cursor-not-allowed opacity-60"
        >
          Coming Soon
        </button>
      </div>

      {/* Storage Info */}
      <div className="bg-[#111827] rounded-xl border border-white/5 p-6 space-y-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <HardDrive className="w-5 h-5 text-[#ff2d2d]" />
          Storage Information
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-gray-300">
            <span>Video files</span>
            <span className="text-gray-500">/public/storage/videos/</span>
          </div>
          <div className="flex justify-between text-gray-300">
            <span>Thumbnails</span>
            <span className="text-gray-500">/public/storage/thumbnails/</span>
          </div>
          <div className="flex justify-between text-gray-300">
            <span>HLS streams</span>
            <span className="text-gray-500">/public/storage/hls/</span>
          </div>
        </div>
        <p className="text-gray-500 text-xs">
          Storage usage is calculated from the video files directory. Thumbnails and HLS segments are not included in the total.
        </p>
      </div>

      {/* About */}
      <div className="bg-[#111827] rounded-xl border border-white/5 p-6 space-y-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Info className="w-5 h-5 text-[#ff2d2d]" />
          About
        </h3>
        <div className="space-y-2 text-sm text-gray-400">
          <p><span className="text-gray-300 font-medium">Xtube</span> — Video streaming platform</p>
          <p>Version: 1.0.0</p>
          <p>Built with Next.js, Prisma, and FFmpeg</p>
        </div>
      </div>
    </div>
  )
}

// ─── Main AdminPanel Component ───────────────────────────────────────────────
export default function AdminPanel() {
  const { isAdmin, showAdminLogin, adminTab, setShowAdminLogin, goHome } = useAppStore()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Mobile block - admin panel not available on mobile
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  if (isMobile && isAdmin) {
    return (
      <div className="min-h-screen bg-[#0b0f1a] flex items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-20 h-20 rounded-full bg-[#ff2d2d]/10 flex items-center justify-center mx-auto border border-[#ff2d2d]/20">
            <Lock className="w-10 h-10 text-[#ff2d2d]" />
          </div>
          <h2 className="text-xl font-bold text-white">Admin Panel Not Available</h2>
          <p className="text-gray-400 text-sm">
            The admin panel is only accessible on desktop and tablet devices for security reasons.
          </p>
          <button
            onClick={goHome}
            className="bg-[#ff2d2d] hover:bg-[#e62626] text-white px-6 py-2.5 rounded-lg font-medium transition-all cursor-pointer"
          >
            Go Back Home
          </button>
        </div>
      </div>
    )
  }

  // Show login modal when requested
  if (showAdminLogin && !isAdmin) {
    return <AdminLoginModal />
  }

  // Not admin and not showing login — don't render
  if (!isAdmin) return null

  const renderTab = () => {
    switch (adminTab) {
      case 'dashboard': return <DashboardTab />
      case 'upload': return <UploadTab />
      case 'videos': return <VideosTab />
      case 'categories': return <CategoriesTab />
      case 'settings': return <SettingsTab />
      default: return <DashboardTab />
    }
  }

  return (
    <div className="min-h-screen bg-[#0b0f1a] flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col bg-[#111827] border-r border-white/10 fixed inset-y-0 left-0 z-40">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar (Sheet) */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="bg-[#111827] border-white/10 w-72 p-0">
          <SidebarContent onNavigate={() => setMobileMenuOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 min-h-screen">
        {/* Mobile Header */}
        <header className="md:hidden sticky top-0 z-30 bg-[#0b0f1a]/95 backdrop-blur-md border-b border-white/10 flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <Play className="w-5 h-5 text-[#ff2d2d] fill-[#ff2d2d]" />
            <span className="text-lg font-bold text-[#ff2d2d]">Xtube</span>
            <span className="text-xs text-gray-500 bg-white/5 px-1.5 py-0.5 rounded">Admin</span>
          </div>
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <button className="p-2 text-gray-400 hover:text-white transition-colors cursor-pointer">
                <Menu className="w-6 h-6" />
              </button>
            </SheetTrigger>
          </Sheet>
        </header>

        {/* Content Area */}
        <div className="p-4 md:p-8 pb-20 md:pb-8">
          {renderTab()}
        </div>
      </main>

      {/* Global styles for custom scrollbar */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.2);
        }
      `}</style>
    </div>
  )
}
