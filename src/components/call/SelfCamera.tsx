'use client'

import { useEffect, useRef, useState } from 'react'
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
}: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPortrait, setIsPortrait] = useState(false)

  useEffect(() => {
    const el = videoRef.current
    if (!el || !track) return

    track.attach(el)
    return () => {
      track.detach(el)
    }
  }, [track])

  // Reactively detect portrait from actual video stream dimensions once playing
  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    const update = () => {
      if (el.videoWidth && el.videoHeight) {
        setIsPortrait(el.videoHeight > el.videoWidth)
      }
    }
    el.addEventListener('loadedmetadata', update)
    el.addEventListener('resize', update)
    return () => {
      el.removeEventListener('loadedmetadata', update)
      el.removeEventListener('resize', update)
    }
  }, [])

  return (
    <div className={`relative overflow-hidden bg-black/40 ${className}`}>
      <SpeakingIndicator isSpeaking={isSpeaking} />

      {!isCameraOff && track ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: '100%',
            height: '100%',
            objectFit: isPortrait ? 'contain' : 'cover',
            transform: mirrored ? 'scaleX(-1)' : 'none',
            transition: 'object-fit 0.2s ease',
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
