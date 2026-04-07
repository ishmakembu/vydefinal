'use client'

import { useState, useRef } from 'react'
import { Copy, Check } from 'lucide-react'
import { formatCodeForDisplay } from '@/lib/session'
import GlassCard from './GlassCard'

interface SessionBadgeProps {
  code: string
  onJoin: () => void
}

export default function SessionBadge({ code, onJoin }: SessionBadgeProps) {
  const [copied, setCopied] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col gap-3 animate-slide-up">
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
        Share this code with your friend
      </p>

      <GlassCard strong className="flex items-center justify-between gap-3 px-4 py-3">
        <span
          className="font-mono text-xl font-bold tracking-widest select-all"
          style={{ color: 'var(--accent-purple)' }}
        >
          {formatCodeForDisplay(code)}
        </span>
        <button
          onClick={handleCopy}
          aria-label="Copy code"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200"
          style={{
            background: copied ? 'rgba(74, 222, 128, 0.15)' : 'rgba(167, 139, 250, 0.15)',
            border: `1px solid ${copied ? 'rgba(74, 222, 128, 0.4)' : 'rgba(167, 139, 250, 0.4)'}`,
            color: copied ? 'var(--accent-green)' : 'var(--accent-purple)',
          }}
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </GlassCard>

      <button
        onClick={onJoin}
        className="w-full py-3 rounded-[16px] font-semibold text-sm transition-all duration-200 active:scale-95"
        style={{
          background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-blue))',
          color: '#fff',
          fontFamily: 'var(--font-display)',
        }}
      >
        Join as Host
      </button>
    </div>
  )
}
