'use client'

interface SpeakingIndicatorProps {
  isSpeaking: boolean
  className?: string
}

export default function SpeakingIndicator({ isSpeaking, className = '' }: SpeakingIndicatorProps) {
  if (!isSpeaking) return null

  return (
    <div
      className={`absolute inset-[-3px] rounded-inherit pointer-events-none speaking-ring ${className}`}
      style={{ borderRadius: 'inherit' }}
      aria-hidden="true"
    />
  )
}
