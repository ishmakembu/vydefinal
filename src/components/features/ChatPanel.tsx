'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, MessageCircle } from 'lucide-react'
import { useUIStore } from '@/store/ui'
import { useCallStore } from '@/store/call'
import { sendPartyMessage } from '@/lib/partykit'
import type { ChatMessage } from '@/types'
import { nanoid } from 'nanoid'
import GlassCard from '@/components/ui/GlassCard'

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60_000) return 'just now'
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`
  return `${Math.floor(diff / 3600_000)}h ago`
}

function MessageBubble({ msg, isOwn }: { msg: ChatMessage; isOwn: boolean }) {
  const [, forceUpdate] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => forceUpdate(n => n + 1), 30_000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className={`flex flex-col gap-0.5 ${isOwn ? 'items-end' : 'items-start'}`}>
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-medium" style={{ color: isOwn ? 'var(--accent-purple)' : 'var(--accent-blue)' }}>
          {msg.displayName}
        </span>
        <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>{timeAgo(msg.ts)}</span>
      </div>
      <div
        className="max-w-[220px] px-3 py-2 rounded-[14px] text-sm break-words"
        style={{
          background: isOwn ? 'rgba(167,139,250,0.15)' : 'var(--glass-bg)',
          border: `1px solid ${isOwn ? 'rgba(167,139,250,0.3)' : 'var(--glass-border)'}`,
          color: 'var(--text-primary)',
          borderBottomRightRadius: isOwn ? 4 : 14,
          borderBottomLeftRadius: isOwn ? 14 : 4,
        }}
      >
        {msg.text}
      </div>
    </div>
  )
}

export default function ChatPanel() {
  const { isChatOpen, toggleChat, messages, addMessage, clearUnread } = useUIStore()
  const { displayName } = useCallStore()
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const userId = useRef(nanoid())

  // Auto-scroll on new messages
  useEffect(() => {
    if (isChatOpen) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      clearUnread()
    }
  }, [messages, isChatOpen, clearUnread])

  const handleSend = useCallback(() => {
    const text = input.trim()
    if (!text) return
    const msg: ChatMessage = {
      id: nanoid(),
      userId: userId.current,
      displayName,
      text,
      ts: Date.now(),
    }
    // Add optimistically so sender sees message immediately
    addMessage(msg)
    sendPartyMessage({ type: 'chat', ...msg })
    setInput('')
  }, [input, displayName, addMessage])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <AnimatePresence>
      {isChatOpen && (
        <motion.div
          initial={{ opacity: 0, x: '100%' }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: '100%' }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="absolute right-0 top-0 bottom-0 z-40 flex flex-col"
          style={{ width: 280 }}
        >
          <GlassCard strong rounded="lg" className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--glass-border)' }}>
              <div className="flex items-center gap-2">
                <MessageCircle size={16} style={{ color: 'var(--accent-purple)' }} />
                <span className="font-semibold text-sm" style={{ fontFamily: 'var(--font-display)' }}>Chat</span>
              </div>
              <button
                onClick={toggleChat}
                className="p-1 rounded-[8px] transition-colors duration-200 hover:bg-white/10"
                style={{ color: 'var(--text-muted)' }}
                aria-label="Close chat"
              >
                <X size={16} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-3">
              {messages.length === 0 && (
                <p className="text-center text-xs py-8" style={{ color: 'var(--text-faint)' }}>
                  Say hello! 👋
                </p>
              )}
              {messages.map(msg => (
                <MessageBubble
                  key={msg.id}
                  msg={msg}
                  isOwn={msg.userId === userId.current}
                />
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-3 py-3" style={{ borderTop: '1px solid var(--glass-border)' }}>
              <div className="flex items-end gap-2">
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Message…"
                  rows={1}
                  maxLength={1000}
                  className="flex-1 resize-none px-3 py-2 rounded-[12px] text-sm outline-none transition-all duration-200"
                  style={{
                    background: 'var(--glass-bg)',
                    border: '1px solid var(--glass-border)',
                    color: 'var(--text-primary)',
                    minHeight: 36,
                    maxHeight: 100,
                    touchAction: 'manipulation',
                  }}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="p-2 rounded-[10px] transition-all duration-200 active:scale-95 disabled:opacity-40"
                  style={{
                    background: 'rgba(167,139,250,0.2)',
                    border: '1px solid rgba(167,139,250,0.4)',
                    color: 'var(--accent-purple)',
                  }}
                  aria-label="Send message"
                >
                  <Send size={16} />
                </button>
              </div>
              <p className="text-[10px] mt-1.5" style={{ color: 'var(--text-faint)' }}>
                Enter to send · Shift+Enter for newline
              </p>
            </div>
          </GlassCard>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
