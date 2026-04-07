'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Mic, MicOff, Video, VideoOff, PhoneOff,
  Monitor, Clapperboard, Music, Smile,
  PictureInPicture2, MoreHorizontal, ArrowLeftRight,
} from 'lucide-react'
import type { Room } from 'livekit-client'
import { useCallStore } from '@/store/call'
import { useUIStore } from '@/store/ui'
import { sendPartyMessage } from '@/lib/partykit'
import { cn } from '@/lib/utils'

const REACTIONS = ['❤️', '😂', '🔥', '👏', '😱', '✨', '🎉', '💀']

interface CallControlsProps {
  onEndCall: () => void
  onToggleScreenShare: () => void
  onSendReaction: (emoji: string) => void
  showPip: boolean
  onTogglePip: () => void
  onSwapView: () => void
  roomRef: React.RefObject<Room | null>
}

interface ControlButtonProps {
  label: string
  onClick: () => void
  active?: boolean
  danger?: boolean
  featured?: boolean
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
}

function ControlButton({ label, onClick, active, danger, featured, children, size = 'md', disabled }: ControlButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={cn(
        'flex flex-col items-center justify-center gap-1 rounded-[16px] transition-all duration-200 active:scale-95',
        size === 'lg' ? 'w-12 h-12 sm:w-14 sm:h-14' : size === 'sm' ? 'w-8 h-8 sm:w-10 sm:h-10' : 'w-10 h-10 sm:w-12 sm:h-12',
        'disabled:opacity-40 disabled:cursor-not-allowed'
      )}
      style={{
        background: danger
          ? 'rgba(248, 113, 113, 0.2)'
          : active
          ? 'rgba(248, 113, 113, 0.15)'
          : featured
          ? 'rgba(167, 139, 250, 0.15)'
          : 'var(--glass-bg)',
        border: `1px solid ${
          danger
            ? 'rgba(248, 113, 113, 0.5)'
            : active
            ? 'rgba(248, 113, 113, 0.4)'
            : featured
            ? 'rgba(167, 139, 250, 0.4)'
            : 'var(--glass-border)'
        }`,
        color: danger
          ? 'var(--danger)'
          : active
          ? 'var(--danger)'
          : featured
          ? 'var(--accent-purple)'
          : 'var(--text-muted)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {children}
    </button>
  )
}

export default function CallControls({
  onEndCall,
  onToggleScreenShare,
  onSendReaction,
  showPip,
  onTogglePip,
  onSwapView,
  roomRef,
}: CallControlsProps) {
  const { isMicOn, isCameraOn, isScreenSharing, setMic, setCamera } = useCallStore()
  const { toggleChat, toggleTheatre, toggleMusic, isTheatreMode, isMusicOpen, isChatOpen } = useUIStore()
  const [showReactions, setShowReactions] = useState(false)
  const reactionsRef = useRef<HTMLDivElement>(null)

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Skip if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      switch (e.key.toLowerCase()) {
        case 'm':
          void handleToggleMic()
          break
        case 'v':
          void handleToggleCamera()
          break
        case 'c':
          toggleChat()
          break
        case 't':
          handleToggleTheatre()
          break
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMicOn, isCameraOn])

  // Close reactions on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (reactionsRef.current && !reactionsRef.current.contains(e.target as Node)) {
        setShowReactions(false)
      }
    }
    if (showReactions) document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [showReactions])

  const handleToggleMic = useCallback(async () => {
    const participant = roomRef.current?.localParticipant
    if (!participant) return
    const newState = !isMicOn
    try {
      await participant.setMicrophoneEnabled(newState)
      setMic(newState)
    } catch (e) { console.warn('mic toggle error', e) }
  }, [roomRef, isMicOn, setMic])

  const handleToggleCamera = useCallback(async () => {
    const participant = roomRef.current?.localParticipant
    if (!participant) return
    const newState = !isCameraOn
    try {
      await participant.setCameraEnabled(newState)
      setCamera(newState)
    } catch (e) { console.warn('camera toggle error', e) }
  }, [roomRef, isCameraOn, setCamera])

  const handleToggleTheatre = useCallback(() => {
    const newState = !isTheatreMode
    toggleTheatre()
    sendPartyMessage({ type: 'theatre_toggle', active: newState })
  }, [isTheatreMode, toggleTheatre])

  return (
    <div
      className="relative flex flex-wrap sm:flex-nowrap items-center justify-between gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-3 rounded-[22px]"
      style={{
        background: 'var(--glass-bg-strong)',
        border: '1px solid var(--glass-border)',
        backdropFilter: 'blur(24px)',
      }}
    >
      {/* Left group: features — order-1 both mobile and desktop */}
      <div className="flex items-center gap-1.5 sm:gap-2 order-1">
        <ControlButton label="Theatre mode" onClick={handleToggleTheatre} featured={isTheatreMode}>
          <Clapperboard size={18} />
        </ControlButton>
        <ControlButton label="Music" onClick={toggleMusic} featured={isMusicOpen}>
          <Music size={18} />
        </ControlButton>
        <ControlButton label="Screen share" onClick={onToggleScreenShare} featured={isScreenSharing}>
          <Monitor size={18} />
        </ControlButton>
      </div>

      {/* Right group: extras — order-2 on mobile (same row as left), order-3 on desktop */}
      <div className="flex items-center gap-1.5 sm:gap-2 order-2 sm:order-3">
        {/* Reactions */}
        <div ref={reactionsRef} className="relative">
          <ControlButton label="Reactions" onClick={() => setShowReactions(p => !p)} featured={showReactions}>
            <Smile size={18} />
          </ControlButton>
          {showReactions && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-full mb-2 right-0 sm:right-auto sm:left-1/2 sm:-translate-x-1/2 flex gap-1.5 px-3 py-2 rounded-full"
              style={{
                background: 'var(--glass-bg-strong)',
                border: '1px solid var(--glass-border)',
                backdropFilter: 'blur(24px)',
                whiteSpace: 'nowrap',
              }}
            >
              {REACTIONS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => {
                    onSendReaction(emoji)
                    setShowReactions(false)
                  }}
                  className="text-xl transition-transform duration-100 hover:scale-125 active:scale-95 cursor-pointer"
                  style={{ touchAction: 'manipulation' }}
                >
                  {emoji}
                </button>
              ))}
            </motion.div>
          )}
        </div>

        <ControlButton label="Swap cameras" onClick={onSwapView}>
          <ArrowLeftRight size={18} />
        </ControlButton>

        <ControlButton label="Toggle picture-in-picture" onClick={onTogglePip} featured={showPip}>
          <PictureInPicture2 size={18} />
        </ControlButton>

        <ControlButton label="Chat (C)" onClick={toggleChat} featured={isChatOpen}>
          <MoreHorizontal size={18} />
        </ControlButton>
      </div>

      {/* Center group: core controls — order-3 on mobile (own full row), order-2 on desktop */}
      <div className="flex items-center justify-center gap-2 sm:gap-3 order-3 sm:order-2 w-full sm:w-auto">
        <ControlButton label={isMicOn ? 'Mute mic (M)' : 'Unmute mic (M)'} onClick={() => void handleToggleMic()} active={!isMicOn}>
          {isMicOn ? <Mic size={20} /> : <MicOff size={20} />}
        </ControlButton>

        {/* End call */}
        <button
          onClick={onEndCall}
          title="End call"
          aria-label="End call"
          className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90"
          style={{
            background: 'var(--danger)',
            color: '#fff',
            boxShadow: '0 4px 20px rgba(248,113,113,0.4)',
          }}
        >
          <PhoneOff size={22} />
        </button>

        <ControlButton label={isCameraOn ? 'Turn off camera (V)' : 'Turn on camera (V)'} onClick={() => void handleToggleCamera()} active={!isCameraOn}>
          {isCameraOn ? <Video size={20} /> : <VideoOff size={20} />}
        </ControlButton>
      </div>
    </div>
  )
}
