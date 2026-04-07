'use client'

import { useEffect, useRef } from 'react'
import { type RemoteVideoTrack, type LocalVideoTrack } from 'livekit-client'
import SpeakingIndicator from './SpeakingIndicator'

interface VideoTileProps {
  track: RemoteVideoTrack | LocalVideoTrack | null
  isSpeaking?: boolean
  label?: string
  isCameraOff?: boolean
  displayName?: string
  className?: string
  mirrored?: boolean
  muted?: boolean
}

function AvatarFallback({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold"
        style={{
          background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-blue))',
          fontFamily: 'var(--font-display)',
          animation: 'speak-pulse 3s ease-in-out infinite',
        }}
      >
        {initials || '?'}
      </div>
    </div>
  )
}

export default function VideoTile({
  track,
  isSpeaking = false,
  label,
  isCameraOff = false,
  displayName = 'User',
  className = '',
  mirrored = false,
  muted = false,
}: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const el = videoRef.current
    if (!el || !track) return
    track.attach(el)
    return () => { track.detach(el) }
  }, [track])

  return (
    <div className={`relative overflow-hidden bg-black/40 ${className}`}>
      <SpeakingIndicator isSpeaking={isSpeaking} />

      {!isCameraOff && track ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={muted}
          style={{
            width: '100%',
            height: '100%',
            // Always contain — never crop/zoom regardless of portrait or landscape.
            // 'cover' fills the tile but cuts off the edges which feels intrusive.
            objectFit: 'contain',
            transform: mirrored ? 'scaleX(-1)' : 'none',
          }}
        />
      ) : (
        <AvatarFallback name={displayName} />
      )}

      {label && (
        <div
          className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs flex items-center gap-1.5"
          style={{
            background: 'var(--glass-bg-strong)',
            border: '1px solid var(--glass-border)',
            backdropFilter: 'blur(12px)',
            color: 'var(--text-primary)',
          }}
        >
          {isSpeaking && (
            <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: 'var(--accent-green)' }} />
          )}
          {label}
        </div>
      )}
    </div>
  )
}
