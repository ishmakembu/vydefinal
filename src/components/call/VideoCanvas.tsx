'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeftRight } from 'lucide-react'
import type { RemoteVideoTrack, LocalVideoTrack } from 'livekit-client'
import { useUIStore } from '@/store/ui'
import { useCallStore } from '@/store/call'
import VideoTile from './SelfCamera'
import ConnectionStatus from './ConnectionStatus'
import ReactionsOverlay from '../features/ReactionsOverlay'
import NowPlayingPill from '../features/NowPlayingPill'

interface VideoCanvasProps {
  remoteTrack: RemoteVideoTrack | null
  localTrack: LocalVideoTrack | null
  remoteSpeaking: boolean
  localSpeaking: boolean
  showPip: boolean
}

// Touch/mouse drag for PiP
function useDrag(onEnd: (x: number, y: number) => void) {
  const isDragging = useRef(false)
  const startPos = useRef({ x: 0, y: 0 })
  const startOffset = useRef({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (!containerRef.current) return
    isDragging.current = true
    const rect = containerRef.current.getBoundingClientRect()
    startPos.current = { x: e.clientX, y: e.clientY }
    startOffset.current = { x: rect.left, y: rect.top }
    containerRef.current.setPointerCapture(e.pointerId)
  }, [])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current || !containerRef.current) return
    const dx = e.clientX - startPos.current.x
    const dy = e.clientY - startPos.current.y
    containerRef.current.style.left = `${startOffset.current.x + dx}px`
    containerRef.current.style.top = `${startOffset.current.y + dy}px`
  }, [])

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current || !containerRef.current) return
    isDragging.current = false
    containerRef.current.releasePointerCapture(e.pointerId)

    // Snap to nearest corner
    const rect = containerRef.current.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const margin = 16

    const snapX = rect.left + rect.width / 2 < vw / 2 ? margin : vw - rect.width - margin
    const snapY = rect.top + rect.height / 2 < vh / 2 ? margin + 64 : vh - rect.height - 80

    containerRef.current.style.transition = 'left 0.3s cubic-bezier(0.16,1,0.3,1), top 0.3s cubic-bezier(0.16,1,0.3,1)'
    containerRef.current.style.left = `${snapX}px`
    containerRef.current.style.top = `${snapY}px`
    setTimeout(() => {
      if (containerRef.current) containerRef.current.style.transition = ''
    }, 300)

    onEnd(snapX, snapY)
  }, [onEnd])

  return { containerRef, onPointerDown, onPointerMove, onPointerUp }
}

export default function VideoCanvas({
  remoteTrack,
  localTrack,
  remoteSpeaking,
  localSpeaking,
  showPip,
}: VideoCanvasProps) {
  const { mainView, swapMainView, isTheatreMode } = useUIStore()
  const { networkQuality, remoteDisplayName, displayName, isCameraOn, isConnecting, isConnected } = useCallStore()
  // During initial connect or mid-call reconnect, show spinner badge not disconnected
  const isInitialConnecting = !isConnected && isConnecting
  const isReconnecting = isConnected && isConnecting && networkQuality === 'disconnected'
  const displayQuality: typeof networkQuality = (isInitialConnecting || isReconnecting) ? 'good' : networkQuality
  const { setPipPosition } = useUIStore()

  const isPipLocal = mainView === 'remote'
  const mainTrack = isPipLocal ? remoteTrack : localTrack
  const pipTrack = isPipLocal ? localTrack : remoteTrack
  const mainLabel = isPipLocal ? (remoteDisplayName ?? 'Guest') : displayName
  const pipLabel = isPipLocal ? displayName : (remoteDisplayName ?? 'Guest')
  const mainSpeaking = isPipLocal ? remoteSpeaking : localSpeaking
  const pipSpeaking = isPipLocal ? localSpeaking : remoteSpeaking

  const { containerRef, onPointerDown, onPointerMove, onPointerUp } = useDrag((x, y) => {
    setPipPosition({ x, y })
  })

  // Set default PiP position
  useEffect(() => {
    if (!containerRef.current) return
    const vw = window.innerWidth
    const vh = window.innerHeight
    const isMobile = vw < 640
    const defaultX = vw - (isMobile ? 136 : 296) - 16
    const defaultY = vh - (isMobile ? 106 : 170) - 80
    containerRef.current.style.left = `${defaultX}px`
    containerRef.current.style.top = `${defaultY}px`
  }, [containerRef])

  if (isTheatreMode) return null

  return (
    <div className="relative w-full h-full">
      {/* Main video */}
      <VideoTile
        track={mainTrack as RemoteVideoTrack | LocalVideoTrack | null}
        isSpeaking={mainSpeaking}
        label={mainLabel}
        isCameraOff={!isPipLocal ? !isCameraOn : false}
        displayName={mainLabel}
        mirrored={!isPipLocal}
        muted={!isPipLocal} // local video tile is always muted (no echo); remote is NOT muted
        className="w-full h-full rounded-[22px] overflow-hidden"
      />

      {/* Network quality top-right */}
      <div className="absolute top-3 right-3 z-10">
        <ConnectionStatus
          quality={displayQuality}
          isConnecting={isInitialConnecting}
          isReconnecting={isReconnecting}
        />
      </div>

      {/* Now playing pill top-center */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10">
        <NowPlayingPill />
      </div>

      {/* ReactionsOverlay */}
      <ReactionsOverlay />

      {/* PiP */}
      <AnimatePresence>
        {showPip && (
          <motion.div
            ref={containerRef}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            className="absolute z-20 rounded-[16px] overflow-hidden cursor-grab active:cursor-grabbing shadow-2xl"
            style={{
              width: typeof window !== 'undefined' && window.innerWidth < 640 ? 120 : 200,
              height: typeof window !== 'undefined' && window.innerWidth < 640 ? 90 : 150,
              border: '2px solid var(--glass-border-strong)',
              position: 'fixed',
              touchAction: 'none',
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          >
            <VideoTile
              track={pipTrack as RemoteVideoTrack | LocalVideoTrack | null}
              isSpeaking={pipSpeaking}
              isCameraOff={isPipLocal ? !isCameraOn : false}
              displayName={pipLabel}
              mirrored={isPipLocal}
              muted={isPipLocal} // PiP is local when isPipLocal=true — mute to avoid echo
              className="w-full h-full"
            />
            {/* Swap button */}
            <button
              onClick={swapMainView}
              className="absolute top-1 right-1 p-1 rounded-[6px] transition-opacity duration-200 opacity-0 hover:opacity-100 focus:opacity-100"
              style={{
                background: 'var(--glass-bg-strong)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-primary)',
              }}
              aria-label="Swap main and PiP view"
            >
              <ArrowLeftRight size={12} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
