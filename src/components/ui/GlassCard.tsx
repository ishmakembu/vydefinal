'use client'

import { cn } from '@/lib/utils'

interface GlassCardProps {
  children: React.ReactNode
  className?: string
  strong?: boolean
  rounded?: 'sm' | 'md' | 'lg' | 'xl'
  padding?: boolean
  hoverable?: boolean
  onClick?: () => void
}

const RADIUS = {
  sm: 'rounded-[10px]',
  md: 'rounded-[16px]',
  lg: 'rounded-[22px]',
  xl: 'rounded-[32px]',
}

export default function GlassCard({
  children,
  className,
  strong = false,
  rounded = 'lg',
  padding = false,
  hoverable = false,
  onClick,
}: GlassCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        strong ? 'glass-strong' : 'glass',
        RADIUS[rounded],
        padding && 'p-5',
        hoverable && 'cursor-pointer transition-colors duration-200 hover:bg-white/10',
        className
      )}
    >
      {children}
    </div>
  )
}
