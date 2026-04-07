'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle, AlertCircle, Info, WifiOff } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  message: string
  type: ToastType
  duration?: number
}

// Global toast emitter
type ToastListener = (toast: Toast) => void
const listeners = new Set<ToastListener>()

let toastCounter = 0

export function showToast(message: string, type: ToastType = 'info', duration = 4000): void {
  const toast: Toast = { id: `toast-${++toastCounter}`, message, type, duration }
  listeners.forEach(l => l(toast))
}

const ICON = {
  success: <CheckCircle size={16} />,
  error: <AlertCircle size={16} />,
  info: <Info size={16} />,
  warning: <WifiOff size={16} />,
}

const COLOR = {
  success: 'rgba(74, 222, 128, 0.15)',
  error: 'rgba(248, 113, 113, 0.15)',
  info: 'rgba(167, 139, 250, 0.15)',
  warning: 'rgba(251, 191, 36, 0.15)',
}

const BORDER_COLOR = {
  success: 'rgba(74, 222, 128, 0.4)',
  error: 'rgba(248, 113, 113, 0.4)',
  info: 'rgba(167, 139, 250, 0.4)',
  warning: 'rgba(251, 191, 36, 0.4)',
}

const TEXT_COLOR = {
  success: 'var(--accent-green)',
  error: 'var(--danger)',
  info: 'var(--accent-purple)',
  warning: 'var(--accent-amber)',
}

export default function ToastSystem() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  useEffect(() => {
    const listener: ToastListener = (toast) => {
      setToasts(prev => [...prev, toast])
      if (toast.duration && toast.duration > 0) {
        setTimeout(() => removeToast(toast.id), toast.duration)
      }
    }
    listeners.add(listener)
    return () => { listeners.delete(listener) }
  }, [removeToast])

  return (
    <div
      className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none"
      aria-live="polite"
    >
      <AnimatePresence>
        {toasts.map(toast => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 60, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 60, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-[16px] backdrop-blur-[24px] max-w-xs shadow-lg"
            style={{
              background: COLOR[toast.type],
              border: `1px solid ${BORDER_COLOR[toast.type]}`,
              color: TEXT_COLOR[toast.type],
            }}
          >
            <span className="flex-shrink-0">{ICON[toast.type]}</span>
            <p className="text-sm font-medium flex-1">{toast.message}</p>
            <button
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
