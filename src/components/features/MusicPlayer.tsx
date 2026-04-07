'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, SkipForward, Play, Pause, Music2, GripVertical } from 'lucide-react'
import { useUIStore } from '@/store/ui'
import { sendPartyMessage } from '@/lib/partykit'
import type { MusicTrack } from '@/types'
import { nanoid } from 'nanoid'
import GlassCard from '@/components/ui/GlassCard'

function detectSource(url: string): 'youtube' | 'soundcloud' | null {
  if (/youtube\.com|youtu\.be/.test(url)) return 'youtube'
  if (/soundcloud\.com/.test(url)) return 'soundcloud'
  return null
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /youtube\.com\/watch\?v=([^&\s]+)/,
    /youtu\.be\/([^?\s]+)/,
    /youtube\.com\/embed\/([^?\s]+)/,
  ]
  for (const p of patterns) {
    const m = p.exec(url)
    if (m) return m[1]
  }
  return null
}

function TrackItem({ track, isPlaying, onSkip }: { track: MusicTrack; isPlaying: boolean; onSkip: () => void }) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-[12px] transition-colors duration-200"
      style={{
        background: isPlaying ? 'rgba(167,139,250,0.1)' : 'transparent',
        border: `1px solid ${isPlaying ? 'rgba(167,139,250,0.3)' : 'transparent'}`,
      }}
    >
      <GripVertical size={14} style={{ color: 'var(--text-faint)', flexShrink: 0 }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>{track.title}</p>
        <p className="text-xs capitalize" style={{ color: 'var(--text-muted)' }}>{track.type}</p>
      </div>
      {isPlaying && (
        <button
          onClick={onSkip}
          className="p-1 rounded-full transition-colors duration-200 hover:bg-white/10"
          style={{ color: 'var(--text-muted)' }}
          aria-label="Skip track"
        >
          <SkipForward size={14} />
        </button>
      )}
    </div>
  )
}

export default function MusicPlayer() {
  const { isMusicOpen, toggleMusic, musicQueue, addToQueue, setMusicQueue } = useUIStore()
  const [urlInput, setUrlInput] = useState('')
  const [isPlaying, setIsPlaying] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const currentTrack = musicQueue[0]

  const handleAddUrl = useCallback(async () => {
    const url = urlInput.trim()
    if (!url) return
    const source = detectSource(url)
    if (!source) {
      setAddError('Paste a YouTube or SoundCloud URL')
      return
    }
    setAddError(null)

    let title = url
    let id: string | null = null

    if (source === 'youtube') {
      id = extractYouTubeId(url)
      if (!id) { setAddError('Invalid YouTube URL'); return }
      // Fetch title via oEmbed (no API key needed)
      try {
        const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`)
        if (res.ok) {
          const data = await res.json() as { title: string }
          title = data.title
        }
      } catch { /* use URL as title */ }
    } else {
      title = decodeURIComponent(url.split('/').slice(-1)[0] ?? url)
    }

    const track: MusicTrack = {
      id: nanoid(),
      url,
      title,
      type: source,
      addedBy: 'me',
    }

    addToQueue(track)
    sendPartyMessage({ type: 'music_add', track })
    setUrlInput('')
  }, [urlInput, addToQueue])

  const handlePlay = () => {
    setIsPlaying(true)
    sendPartyMessage({ type: 'music_play', ts: Date.now() })
  }

  const handlePause = () => {
    setIsPlaying(false)
    sendPartyMessage({ type: 'music_pause', ts: Date.now() })
  }

  const handleSkip = () => {
    const newQueue = musicQueue.slice(1)
    setMusicQueue(newQueue)
    setIsPlaying(false)
    sendPartyMessage({ type: 'music_skip' })
  }

  const getEmbedUrl = (track: MusicTrack): string => {
    if (track.type === 'youtube') {
      const id = extractYouTubeId(track.url)
      return `https://www.youtube.com/embed/${id}?enablejsapi=1&autoplay=${isPlaying ? 1 : 0}`
    }
    if (track.type === 'soundcloud') {
      return `https://w.soundcloud.com/player/?url=${encodeURIComponent(track.url)}&auto_play=${isPlaying}`
    }
    return ''
  }

  return (
    <AnimatePresence>
      {isMusicOpen && (
        <motion.div
          initial={{ opacity: 0, x: '100%' }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: '100%' }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="absolute right-0 top-0 bottom-0 z-40 flex flex-col"
          style={{ width: 300 }}
        >
          <GlassCard strong rounded="lg" className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--glass-border)' }}>
              <div className="flex items-center gap-2">
                <Music2 size={16} style={{ color: 'var(--accent-purple)' }} />
                <span className="font-semibold text-sm" style={{ fontFamily: 'var(--font-display)' }}>Shared Music</span>
              </div>
              <button
                onClick={toggleMusic}
                className="p-1 rounded-[8px] transition-colors duration-200 hover:bg-white/10"
                style={{ color: 'var(--text-muted)' }}
                aria-label="Close music player"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* Player */}
              {currentTrack && (
                <div className="p-3" style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  {(currentTrack.type === 'youtube' || currentTrack.type === 'soundcloud') && (
                    <div className="rounded-[12px] overflow-hidden mb-3" style={{ height: currentTrack.type === 'youtube' ? 160 : 80 }}>
                      <iframe
                        ref={iframeRef}
                        src={getEmbedUrl(currentTrack)}
                        width="100%"
                        height="100%"
                        allow="autoplay; encrypted-media"
                        title={currentTrack.title}
                        style={{ border: 'none' }}
                      />
                    </div>
                  )}
                  <p className="text-sm font-medium truncate mb-2" style={{ color: 'var(--text-primary)' }}>
                    {currentTrack.title}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={isPlaying ? handlePause : handlePlay}
                      className="flex-1 py-2 rounded-[10px] flex items-center justify-center gap-2 text-sm font-medium transition-all duration-200 active:scale-95"
                      style={{
                        background: 'rgba(167,139,250,0.15)',
                        border: '1px solid rgba(167,139,250,0.4)',
                        color: 'var(--accent-purple)',
                      }}
                    >
                      {isPlaying ? <><Pause size={16} /> Pause</> : <><Play size={16} /> Play</>}
                    </button>
                    <button
                      onClick={handleSkip}
                      className="p-2 rounded-[10px] transition-all duration-200 active:scale-95"
                      style={{
                        background: 'var(--glass-bg)',
                        border: '1px solid var(--glass-border)',
                        color: 'var(--text-muted)',
                      }}
                      aria-label="Skip"
                    >
                      <SkipForward size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* Queue */}
              <div className="px-3 py-2">
                <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
                  Queue ({musicQueue.length})
                </p>
                <div className="flex flex-col gap-1">
                  {musicQueue.map((track, i) => (
                    <TrackItem
                      key={track.id}
                      track={track}
                      isPlaying={i === 0}
                      onSkip={handleSkip}
                    />
                  ))}
                  {musicQueue.length === 0 && (
                    <p className="text-xs py-4 text-center" style={{ color: 'var(--text-faint)' }}>
                      Add a YouTube or SoundCloud link below
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Add track */}
            <div className="px-3 py-3" style={{ borderTop: '1px solid var(--glass-border)' }}>
              <div className="flex gap-2">
                <input
                  value={urlInput}
                  onChange={e => { setUrlInput(e.target.value); setAddError(null) }}
                  onKeyDown={e => { if (e.key === 'Enter') void handleAddUrl() }}
                  placeholder="YouTube or SoundCloud URL"
                  className="flex-1 px-3 py-2 rounded-[10px] text-xs outline-none"
                  style={{
                    background: 'var(--glass-bg)',
                    border: `1px solid ${addError ? 'rgba(248,113,113,0.5)' : 'var(--glass-border)'}`,
                    color: 'var(--text-primary)',
                    touchAction: 'manipulation',
                  }}
                />
                <button
                  onClick={() => void handleAddUrl()}
                  className="p-2 rounded-[10px] transition-all duration-200 active:scale-95"
                  style={{
                    background: 'rgba(167,139,250,0.2)',
                    border: '1px solid rgba(167,139,250,0.4)',
                    color: 'var(--accent-purple)',
                  }}
                  aria-label="Add track"
                >
                  <Plus size={16} />
                </button>
              </div>
              {addError && (
                <p className="text-[10px] mt-1" style={{ color: 'var(--danger)' }}>{addError}</p>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                className="hidden"
                aria-label="Upload audio file"
              />
            </div>
          </GlassCard>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
