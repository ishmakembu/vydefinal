'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { validateCode, normalizeCode } from '@/lib/session'
import GlassCard from './GlassCard'

export default function CodeEntry() {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const normalized = normalizeCode(e.target.value)
    setValue(normalized)
    if (error) setError(null)
  }

  const handleJoin = async () => {
    const code = value.trim()
    if (!validateCode(code)) {
      setError('Enter a valid 6-character code')
      inputRef.current?.focus()
      return
    }
    setLoading(true)
    setError(null)
    router.push(`/call/${code}`)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') void handleJoin()
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <input
          ref={inputRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="ENTER CODE"
          maxLength={6}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          className="w-full px-4 py-3 rounded-[16px] font-mono text-lg tracking-widest text-center outline-none transition-all duration-200 placeholder:opacity-30"
          style={{
            background: 'var(--glass-bg)',
            border: `1px solid ${error ? 'rgba(248, 113, 113, 0.5)' : 'var(--glass-border)'}`,
            backdropFilter: 'blur(12px)',
            color: 'var(--text-primary)',
            touchAction: 'manipulation',
          }}
          aria-label="Enter call code"
          aria-invalid={!!error}
          aria-describedby={error ? 'code-error' : undefined}
        />
        {value.length === 6 && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: 'var(--accent-green)' }}>
            ✓
          </span>
        )}
      </div>

      {error && (
        <p id="code-error" className="text-xs text-center" style={{ color: 'var(--danger)' }}>
          {error}
        </p>
      )}

      <button
        onClick={() => void handleJoin()}
        disabled={loading || value.length === 0}
        className="w-full py-3 rounded-[16px] font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-200 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
        style={{
          background: value.length === 6
            ? 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))'
            : 'var(--glass-bg-strong)',
          border: '1px solid var(--glass-border)',
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-display)',
        }}
      >
        {loading ? (
          <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <>
            Join Call
            <ArrowRight size={16} />
          </>
        )}
      </button>
    </div>
  )
}
