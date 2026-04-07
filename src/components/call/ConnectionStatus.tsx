'use client'

import type { NetworkQuality } from '@/types'

interface ConnectionStatusProps {
  quality: NetworkQuality
  isConnecting?: boolean
  isReconnecting?: boolean
}

const LABELS: Record<NetworkQuality, string> = {
  excellent: 'Excellent',
  good: 'Good',
  poor: 'Poor connection — optimizing…',
  disconnected: 'Reconnecting…',
}

export default function ConnectionStatus({ quality, isConnecting, isReconnecting }: ConnectionStatusProps) {
  const bars = [1, 2, 3, 4]

  const litCount: Record<NetworkQuality, number> = {
    excellent: 4,
    good: 3,
    poor: 1,
    disconnected: 0,
  }

  const barColor: Record<NetworkQuality, string> = {
    excellent: 'var(--accent-green)',
    good: 'var(--accent-amber)',
    poor: 'var(--danger)',
    disconnected: 'var(--text-faint)',
  }

  const lit = litCount[quality]
  const color = barColor[quality]

  if (isReconnecting) {
    return (
      <div
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs"
        style={{
          background: 'var(--glass-bg-strong)',
          border: '1px solid var(--glass-border)',
          backdropFilter: 'blur(12px)',
          color: 'var(--text-muted)',
        }}
        title="Reconnecting…"
      >
        <span
          className="inline-block w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin"
          aria-hidden="true"
        />
        <span>Reconnecting</span>
      </div>
    )
  }

  if (isConnecting) {
    return (
      <div
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs"
        style={{
          background: 'var(--glass-bg-strong)',
          border: '1px solid var(--glass-border)',
          backdropFilter: 'blur(12px)',
          color: 'var(--text-muted)',
        }}
        title="Connecting…"
      >
        <span
          className="inline-block w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin"
          aria-hidden="true"
        />
        <span>Connecting</span>
      </div>
    )
  }

  // quality === 'disconnected' only shows if somehow reached without isReconnecting flag
  if (quality === 'disconnected') return null

  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full"
      style={{
        background: 'var(--glass-bg-strong)',
        border: '1px solid var(--glass-border)',
        backdropFilter: 'blur(12px)',
      }}
      title={LABELS[quality]}
      aria-label={`Connection quality: ${LABELS[quality]}`}
    >
      {bars.map(b => (
        <div
          key={b}
          className="rounded-[1px] transition-colors duration-300"
          style={{
            width: 3,
            height: 4 + b * 2,
            background: b <= lit ? color : 'var(--glass-border-strong)',
          }}
        />
      ))}
    </div>
  )
}
