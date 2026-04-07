'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Clapperboard, Play, Pause, SkipBack, SkipForward } from 'lucide-react'
import { useUIStore } from '@/store/ui'
import { sendPartyMessage } from '@/lib/partykit'
import GlassCard from '@/components/ui/GlassCard'

const SYNC_TOLERANCE_S = 3

export default function WatchParty() {
  const { isTheatreMode, watchState, setWatchState } = useUIStore()
  const [urlInput, setUrlInput] = useState('')
  const [inputVisible, setInputVisible] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const playerRef = useRef<{ currentTime: number; playing: boolean }>({
    currentTime: 0,
    playing: false,
  })
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Periodic sync check (every 2s)
  useEffect(() => {
    if (!isTheatreMode || !watchState) return

    syncIntervalRef.current = setInterval(() => {
      // Drift check would be here with a real embedded player API
      // For iframe-based players, we rely on PartyKit sync messages
    }, 2000)

    return () => {
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current)
    }
  }, [isTheatreMode, watchState])

  const handleLoadUrl = useCallback(() => {
    const url = urlInput.trim()
    if (!url) return
    const newState = { url, playing: false, position: 0, lastSyncAt: Date.now() }
    setWatchState(newState)
    sendPartyMessage({ type: 'watch_url', url, userId: 'me' })
    setUrlInput('')
    setInputVisible(false)
  }, [urlInput, setWatchState])

  const handlePlay = useCallback(() => {
    if (!watchState) return
    const pos = playerRef.current.currentTime
    const updated = { ...watchState, playing: true, position: pos, lastSyncAt: Date.now() }
    setWatchState(updated)
    sendPartyMessage({ type: 'watch_play', position: pos, ts: Date.now() })
  }, [watchState, setWatchState])

  const handlePause = useCallback(() => {
    if (!watchState) return
    const pos = playerRef.current.currentTime
    const updated = { ...watchState, playing: false, position: pos }
    setWatchState(updated)
    sendPartyMessage({ type: 'watch_pause', position: pos })
  }, [watchState, setWatchState])

  const handleSeek = useCallback((delta: number) => {
    if (!watchState) return
    const newPos = Math.max(0, watchState.position + delta)
    const updated = { ...watchState, position: newPos }
    setWatchState(updated)
    sendPartyMessage({ type: 'watch_seek', position: newPos })
  }, [watchState, setWatchState])

  if (!isTheatreMode) return null

  const embedUrl = watchState?.url
    ? `${watchState.url}${watchState.url.includes('?') ? '&' : '?'}autoplay=${watchState.playing ? 1 : 0}&t=${Math.floor(watchState.position)}`
    : null

  return (
    <div className="absolute inset-0 z-10 flex flex-col" style={{ background: '#000' }}>
      {/* Cinema mode badge */}
      <div
        className="absolute top-4 left-4 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full"
        style={{
          background: 'var(--glass-bg-strong)',
          border: '1px solid var(--glass-border)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <Clapperboard size={14} style={{ color: 'var(--accent-purple)' }} />
        <span className="text-xs font-medium" style={{ color: 'var(--accent-purple)', fontFamily: 'var(--font-display)' }}>
          Theatre Mode
        </span>
      </div>

      {/* Content area */}
      <div className="flex-1 flex items-center justify-center">
        {!watchState?.url ? (
          <div className="text-center">
            <Clapperboard size={48} className="mx-auto mb-4 opacity-30" />
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
              Paste a Shelflix or video URL to watch together
            </p>
            <AnimatePresence mode="wait">
              {!inputVisible ? (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setInputVisible(true)}
                  className="px-6 py-2.5 rounded-[14px] text-sm font-medium transition-all duration-200 active:scale-95"
                  style={{
                    background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-blue))',
                    color: '#fff',
                    fontFamily: 'var(--font-display)',
                  }}
                >
                  Add Content URL
                </motion.button>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex gap-2 max-w-sm"
                >
                  <input
                    autoFocus
                    value={urlInput}
                    onChange={e => setUrlInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleLoadUrl() }}
                    placeholder="https://shelflix.vercel.app/..."
                    className="flex-1 px-3 py-2 rounded-[10px] text-sm outline-none"
                    style={{
                      background: 'rgba(255,255,255,0.1)',
                      border: '1px solid var(--glass-border)',
                      color: 'var(--text-primary)',
                    }}
                  />
                  <button
                    onClick={handleLoadUrl}
                    className="px-4 py-2 rounded-[10px] text-sm font-medium"
                    style={{
                      background: 'rgba(167,139,250,0.2)',
                      border: '1px solid rgba(167,139,250,0.4)',
                      color: 'var(--accent-purple)',
                    }}
                  >
                    Load
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <iframe
            ref={iframeRef}
            src={embedUrl ?? ''}
            className="w-full h-full"
            allow="autoplay; fullscreen; encrypted-media"
            allowFullScreen
            title="Watch party content"
            style={{ border: 'none', maxHeight: 'calc(100vh - 120px)' }}
          />
        )}
      </div>

      {/* Controls */}
      {watchState?.url && (
        <div
          className="flex items-center justify-center gap-3 px-4 py-3"
          style={{ borderTop: '1px solid var(--glass-border)', background: 'var(--glass-bg-strong)' }}
        >
          <button
            onClick={() => handleSeek(-10)}
            className="p-2 rounded-[10px] transition-all duration-200 active:scale-95"
            style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-muted)' }}
            aria-label="Seek back 10s"
          >
            <SkipBack size={16} />
          </button>
          <button
            onClick={watchState.playing ? handlePause : handlePlay}
            className="px-6 py-2 rounded-[12px] flex items-center gap-2 text-sm font-medium transition-all duration-200 active:scale-95"
            style={{
              background: 'rgba(167,139,250,0.2)',
              border: '1px solid rgba(167,139,250,0.4)',
              color: 'var(--accent-purple)',
              fontFamily: 'var(--font-display)',
            }}
          >
            {watchState.playing ? <><Pause size={16}/> Pause</> : <><Play size={16}/> Play</>}
          </button>
          <button
            onClick={() => handleSeek(10)}
            className="p-2 rounded-[10px] transition-all duration-200 active:scale-95"
            style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-muted)' }}
            aria-label="Seek forward 10s"
          >
            <SkipForward size={16} />
          </button>
          <button
            onClick={() => {
              setWatchState(null)
              setInputVisible(false)
            }}
            className="p-2 rounded-[10px] transition-all duration-200 active:scale-95"
            style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-muted)' }}
            aria-label="Remove content"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  )
}
