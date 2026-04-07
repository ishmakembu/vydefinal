export interface VydeRoom {
  code: string
  hostId: string
  guestId?: string
  createdAt: number
  expiresAt: number
}

export interface ChatMessage {
  id: string
  userId: string
  displayName: string
  text: string
  ts: number
}

export interface MusicTrack {
  id: string
  url: string
  title: string
  type: 'youtube' | 'soundcloud' | 'file'
  addedBy: string
  thumbnail?: string
}

export interface WatchState {
  url: string
  playing: boolean
  position: number
  lastSyncAt: number
  controllerId?: string
}

export interface Reaction {
  id: string
  userId: string
  emoji: string
  ts: number
}

export type NetworkQuality = 'excellent' | 'good' | 'poor' | 'disconnected'

export type VydeMessage =
  | { type: 'join'; userId: string; displayName: string }
  | { type: 'leave'; userId: string }
  | { type: 'welcome'; messages: ChatMessage[]; musicQueue: MusicTrack[]; watchState: WatchState | null; participants: string[] }
  | { type: 'room_full' }
  | { type: 'chat'; userId: string; displayName: string; text: string; ts: number; id: string }
  | { type: 'reaction'; userId: string; emoji: string; id: string }
  | { type: 'music_add'; track: MusicTrack }
  | { type: 'music_play'; ts: number }
  | { type: 'music_pause'; ts: number }
  | { type: 'music_seek'; position: number }
  | { type: 'music_skip' }
  | { type: 'music_reorder'; queue: MusicTrack[] }
  | { type: 'watch_url'; url: string; userId: string }
  | { type: 'watch_play'; position: number; ts: number; userId: string }
  | { type: 'watch_pause'; position: number; userId: string }
  | { type: 'watch_seek'; position: number; userId: string }
  | { type: 'watch_heartbeat'; position: number; playing: boolean; ts: number; userId: string }
  | { type: 'theatre_toggle'; active: boolean }
  | { type: 'ping' }
  | { type: 'pong' }

export interface RTCSample {
  packetLoss: number
  rtt: number
  bitrate: number
  timestamp: number
}

export type QualityTier = {
  name: 'minimal' | 'low' | 'medium' | 'good' | 'high' | 'ultra'
  maxBitrate: number
  resolution: { w: number; h: number }
  fps: number
}
