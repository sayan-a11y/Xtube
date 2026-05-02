'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'

export default function AgeGate() {
  const [show, setShow] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const accepted = localStorage.getItem('xtube_age_verified')
    if (!accepted) {
      setShow(true)
      document.body.style.overflow = 'hidden'
    }
  }, [])

  const handleAccept = () => {
    localStorage.setItem('xtube_age_verified', 'true')
    setShow(false)
    document.body.style.overflow = 'unset'
  }

  const handleExit = () => {
    window.location.href = 'https://www.google.com'
  }

  if (!mounted) return null

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black sm:bg-black/90 sm:backdrop-blur-2xl p-4"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            className="w-full max-w-lg bg-[#0f0f0f] border border-white/10 rounded-[24px] overflow-hidden shadow-[0_0_100px_rgba(255,0,0,0.15)] relative"
          >
            {/* Red Glow Background */}
            <div className="absolute -top-24 -left-24 w-64 h-64 bg-[#ff2d2d]/10 rounded-full blur-[100px]" />
            <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-[#ff2d2d]/5 rounded-full blur-[100px]" />

            <div className="relative z-10 p-8 sm:p-12 flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-[#ff2d2d]/10 rounded-full flex items-center justify-center mb-8 border border-[#ff2d2d]/20">
                <AlertTriangle className="w-10 h-10 text-[#ff2d2d]" />
              </div>

              <h2 className="text-3xl font-black text-white mb-4 tracking-tighter uppercase">
                Age Verification Required
              </h2>
              
              <div className="h-px w-24 bg-[#ff2d2d] mb-6" />

              <p className="text-gray-400 text-lg leading-relaxed mb-10 font-medium">
                This website contains adult-themed and 18+ content. You must be at least <span className="text-white font-bold">18 years or older</span> to enter.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                <button
                  onClick={handleAccept}
                  className="flex items-center justify-center gap-3 bg-[#ff2d2d] hover:bg-[#e62626] text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-[#ff2d2d]/20 active:scale-95 group"
                >
                  <CheckCircle2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  I AM 18+ ENTER
                </button>
                <button
                  onClick={handleExit}
                  className="flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white font-black py-4 rounded-2xl border border-white/5 transition-all active:scale-95 group"
                >
                  <XCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  EXIT SITE
                </button>
              </div>

              <p className="mt-8 text-[10px] text-gray-500 uppercase tracking-[0.2em] font-black">
                By entering, you agree to our Terms of Service
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
