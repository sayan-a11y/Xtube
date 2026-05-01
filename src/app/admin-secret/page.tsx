'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store/useAppStore'

export default function AdminSecretPage() {
  const router = useRouter()
  const setShowAdminLogin = useAppStore((s) => s.setShowAdminLogin)

  useEffect(() => {
    // Show admin login modal and redirect home
    setShowAdminLogin(true)
    router.replace('/')
  }, [router, setShowAdminLogin])

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
      <div className="animate-pulse flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-2 border-[#ff0000] border-t-transparent animate-spin" />
        <p className="text-[#ff0000] font-bold tracking-widest text-sm uppercase">Redirecting to Admin Access...</p>
      </div>
    </div>
  )
}
