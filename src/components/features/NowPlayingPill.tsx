'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Music } from 'lucide-react'
import { useUIStore } from '@/store/ui'

function EQBars() {
  return (
    <span className="flex items-end gap-[2px] h-3">
      {[0, 0.2, 0.4].map((delay, i) => (
        <span
          key={i}
          className="w-[3px] rounded-[1px] origin-bottom animate-eq-bar"
          style={{
            height: '100%',
            background: 'var(--accent-purple)',
            animationDelay: `${delay}s`,
          }}
        />
      ))}
    </span>
  )
}

export default function NowPlayingPill() {
  const { musicQueue } = useUIStore()
  const current = musicQueue[0]

  return (
    <AnimatePresence>
      {current && (
        <motion.div
          initial={{ opacity: 0, y: -8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.95 }}
          transition={{ duration: 0.25 }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full max-w-[220px] overflow-hidden"
          style={{
            background: 'var(--glass-bg-strong)',
            border: '1px solid var(--glass-border)',
            backdropFilter: 'blur(16px)',
          }}
        >
          <Music size={12} style={{ color: 'var(--accent-purple)', flexShrink: 0 }} />
          <EQBars />
          <span
            className="text-xs truncate"
            style={{ color: 'var(--text-primary)', maxWidth: 130 }}
          >
            {current.title}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
