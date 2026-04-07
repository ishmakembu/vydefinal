'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Video, Zap } from 'lucide-react'
import { generateCode } from '@/lib/session'
import GlassCard from '@/components/ui/GlassCard'
import SessionBadge from '@/components/ui/SessionBadge'
import CodeEntry from '@/components/ui/CodeEntry'
import ToastSystem from '@/components/ui/ToastSystem'

function BackgroundOrbs() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <div className="absolute -top-48 -left-24 w-[600px] h-[600px] rounded-full animate-orb-drift"
        style={{ background: 'radial-gradient(circle,rgba(139,92,246,0.18) 0%,transparent 70%)', filter: 'blur(80px)' }} />
      <div className="absolute -bottom-36 -right-24 w-[500px] h-[500px] rounded-full animate-orb-drift"
        style={{ background: 'radial-gradient(circle,rgba(59,130,246,0.14) 0%,transparent 70%)', filter: 'blur(80px)', animationDelay: '-8s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full animate-orb-drift"
        style={{ background: 'radial-gradient(circle,rgba(244,114,182,0.09) 0%,transparent 70%)', filter: 'blur(80px)', animationDelay: '-15s' }} />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 80% 60% at 20% 10%,#1e1045,transparent),radial-gradient(ellipse 60% 50% at 80% 80%,#0f1e40,transparent),#0a0814' }} />
    </div>
  )
}

export default function HomePage() {
  const [generatedCode, setGeneratedCode] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState('You')
  const router = useRouter()

  useEffect(() => {
    const saved = localStorage.getItem('vyde-display-name')
    if (saved) setDisplayName(saved)
  }, [])

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDisplayName(e.target.value)
    localStorage.setItem('vyde-display-name', e.target.value)
  }

  const handleGenerate = () => {
    setGeneratedCode(generateCode())
  }

  const handleJoinAsHost = () => {
    if (generatedCode) router.push(`/call/${generatedCode}`)
  }

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center p-4" style={{ overflowY: 'auto', overflow: 'auto' }}>
      <BackgroundOrbs />
      <ToastSystem />

      <div className="w-full max-w-[420px] animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-[12px] flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-blue))' }}>
              <Video size={20} color="#fff" />
            </div>
            <h1 className="text-4xl font-bold gradient-text" style={{ fontFamily: 'var(--font-display)' }}>
              Vyde
            </h1>
          </div>
          <p className="text-sm italic font-light" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
            Your place, together.
          </p>
        </div>

        <GlassCard strong rounded="xl" className="overflow-hidden">
          {/* Name field */}
          <div className="px-6 pt-6 pb-4">
            <label className="block text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
              Your display name
            </label>
            <input
              value={displayName}
              onChange={handleNameChange}
              maxLength={30}
              placeholder="Your name"
              className="w-full px-3 py-2 rounded-[10px] text-sm outline-none transition-all duration-200"
              style={{
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-primary)',
                touchAction: 'manipulation',
              }}
            />
          </div>

          {/* Divider */}
          <div className="h-px mx-6" style={{ background: 'var(--glass-border)' }} />

          {/* Start a call */}
          <div className="px-6 py-5">
            <div className="flex items-center gap-2 mb-4">
              <Zap size={16} style={{ color: 'var(--accent-purple)' }} />
              <h2 className="font-semibold text-sm" style={{ fontFamily: 'var(--font-display)' }}>Start a call</h2>
            </div>

            {!generatedCode ? (
              <button
                onClick={handleGenerate}
                className="w-full py-3 rounded-[16px] font-semibold text-sm transition-all duration-200 active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-blue))',
                  color: '#fff',
                  fontFamily: 'var(--font-display)',
                }}
              >
                Generate Call Code
              </button>
            ) : (
              <SessionBadge code={generatedCode} onJoin={handleJoinAsHost} />
            )}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 px-6">
            <div className="flex-1 h-px" style={{ background: 'var(--glass-border)' }} />
            <span className="text-xs" style={{ color: 'var(--text-faint)' }}>or</span>
            <div className="flex-1 h-px" style={{ background: 'var(--glass-border)' }} />
          </div>

          {/* Join a call */}
          <div className="px-6 py-5">
            <div className="flex items-center gap-2 mb-4">
              <Video size={16} style={{ color: 'var(--accent-blue)' }} />
              <h2 className="font-semibold text-sm" style={{ fontFamily: 'var(--font-display)' }}>Join a call</h2>
            </div>
            <CodeEntry />
          </div>
        </GlassCard>

        <p className="text-center text-xs mt-6" style={{ color: 'var(--text-faint)' }}>
          No account needed · No data stored · Peer-to-peer
        </p>
      </div>
    </main>
  )
}
