'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Clapperboard, Play, Pause, SkipBack, SkipForward, Shield, Users } from 'lucide-react'
import { useUIStore } from '@/store/ui'
import { useCallStore } from '@/store/call'
import { sendPartyMessage } from '@/lib/partykit'
import GlassCard from '@/components/ui/GlassCard'

const SYNC_TOLERANCE_S = 2

export default function WatchParty() {
  const { isTheatreMode, watchState, setWatchState } = useUIStore()
  const { localParticipant } = useCallStore.getState()
  const [urlInput, setUrlInput] = useState('')
  const [inputVisible, setInputVisible] = useState(false)
  const [estimatedPosition, setEstimatedPosition] = useState(0)
  
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const lastSyncUrlRef = useRef<string | null>(null)
  const localTimeRef = useRef<number>(0)
  
  const myId = localParticipant?.identity || 'anonymous'
  const isController = watchState?.controllerId === myId

  // ── 1. Estimated Time Sync ────────────────────────────────
  useEffect(() => {
    if (!watchState) return
    
    const updateTime = () => {
      if (watchState.playing) {
        const elapsed = (Date.now() - watchState.lastSyncAt) / 1000
        const current = watchState.position + elapsed
        setEstimatedPosition(current)
        localTimeRef.current = current
      } else {
        setEstimatedPosition(watchState.position)
        localTimeRef.current = watchState.position
      }
    }

    updateTime()
    const timer = setInterval(updateTime, 500)
    return () => clearInterval(timer)
  }, [watchState])

  // ── 2. Heartbeat (Controller Only) ────────────────────────
  useEffect(() => {
    if (!isTheatreMode || !watchState || !isController) return

    const heartbeat = setInterval(() => {
      // Small optimization: only heartbeat if playing to keep everyone in sync
      if (watchState.playing) {
        sendPartyMessage({ 
          type: 'watch_heartbeat', 
          position: localTimeRef.current, 
          playing: true, 
          ts: Date.now(),
          userId: myId
        })
      }
    }, 5000)

    return () => clearInterval(heartbeat)
  }, [isTheatreMode, watchState, isController, myId])

  // ── 3. Iframe Source Management (Drift Correction) ────────
  const embedUrl = watchState?.url
    ? `${watchState.url}${watchState.url.includes('?') ? '&' : '?'}autoplay=${watchState.playing ? 1 : 0}&t=${Math.floor(estimatedPosition)}`
    : null

  useEffect(() => {
    if (!isTheatreMode || !watchState?.url) return

    const drift = Math.abs(localTimeRef.current - estimatedPosition)
    const urlChanged = watchState.url !== lastSyncUrlRef.current?.split('?')[0]
    
    // Only update iframe src if:
    // 1. The main URL changed (new video)
    // 2. We joined/resumed and haven't synced yet
    // 3. The drift is massive (> SYNC_TOLERANCE_S)
    if (urlChanged || !lastSyncUrlRef.current || drift > SYNC_TOLERANCE_S) {
      lastSyncUrlRef.current = embedUrl
      if (iframeRef.current) iframeRef.current.src = embedUrl || ''
    }
  }, [isTheatreMode, watchState?.url, watchState?.playing, estimatedPosition, embedUrl])

  const handleLoadUrl = useCallback(() => {
    const url = urlInput.trim()
    if (!url) return
    const newState = { url, playing: false, position: 0, lastSyncAt: Date.now(), controllerId: myId }
    setWatchState(newState)
    sendPartyMessage({ type: 'watch_url', url, userId: myId })
    setUrlInput('')
    setInputVisible(false)
  }, [urlInput, setWatchState, myId])

  const handlePlay = useCallback(() => {
    if (!watchState) return
    const pos = localTimeRef.current
    setWatchState({ ...watchState, playing: true, position: pos, lastSyncAt: Date.now(), controllerId: myId })
    sendPartyMessage({ type: 'watch_play', position: pos, ts: Date.now(), userId: myId })
  }, [watchState, setWatchState, myId])

  const handlePause = useCallback(() => {
    if (!watchState) return
    const pos = localTimeRef.current
    setWatchState({ ...watchState, playing: false, position: pos, controllerId: myId })
    sendPartyMessage({ type: 'watch_pause', position: pos, userId: myId })
  }, [watchState, setWatchState, myId])

  const handleSeek = useCallback((delta: number) => {
    if (!watchState) return
    const newPos = Math.max(0, localTimeRef.current + delta)
    setWatchState({ ...watchState, position: newPos, lastSyncAt: Date.now(), controllerId: myId })
    sendPartyMessage({ type: 'watch_seek', position: newPos, userId: myId })
  }, [watchState, setWatchState, myId])

  if (!isTheatreMode) return null

  return (
    <div className="absolute inset-0 z-10 flex flex-col" style={{ background: '#000' }}>
      {/* Cinema mode badge */}
      <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
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

        {watchState?.url && (
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
            style={{
              background: isController ? 'rgba(167, 139, 250, 0.15)' : 'var(--glass-bg-strong)',
              border: `1px solid ${isController ? 'rgba(167, 139, 250, 0.4)' : 'var(--glass-border)'}`,
              backdropFilter: 'blur(12px)',
            }}
          >
            {isController ? (
              <Shield size={12} style={{ color: 'var(--accent-purple)' }} />
            ) : (
              <Users size={12} style={{ color: 'var(--text-muted)' }} />
            )}
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: isController ? 'var(--accent-purple)' : 'var(--text-muted)', fontFamily: 'var(--font-display)' }}>
              {isController ? 'Sync Leader' : 'Synced'}
            </span>
          </div>
        )}
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
            style={{ border: 'none', maxHeight: 'calc(100dvh - 120px)' }}
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
