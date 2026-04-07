'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useUIStore } from '@/store/ui'

export default function ReactionsOverlay() {
  const { reactions, removeReaction } = useUIStore()

  useEffect(() => {
    reactions.forEach(r => {
      const timeout = setTimeout(() => removeReaction(r.id), 2200)
      return () => clearTimeout(timeout)
    })
  }, [reactions, removeReaction])

  return (
    <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-30 pointer-events-none flex items-end gap-1">
      <AnimatePresence>
        {reactions.slice(-8).map((r, i) => (
          <motion.span
            key={r.id}
            initial={{ opacity: 1, y: 0, scale: 1, x: (i - 3) * 12 }}
            animate={{ opacity: 0, y: -120, scale: 1.5, x: (i - 3) * 12 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2, ease: 'easeOut' }}
            className="text-3xl select-none absolute"
            style={{ bottom: 0 }}
          >
            {r.emoji}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  )
}
