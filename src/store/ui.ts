import { create } from 'zustand'
import type { ChatMessage, MusicTrack, WatchState } from '@/types'

type ActivePanel = 'chat' | 'music' | 'watch' | null

interface UIStore {
  isChatOpen: boolean
  isTheatreMode: boolean
  isMusicOpen: boolean
  pipPosition: { x: number; y: number }
  mainView: 'remote' | 'self'
  activePanel: ActivePanel
  unreadCount: number
  messages: ChatMessage[]
  musicQueue: MusicTrack[]
  watchState: WatchState | null
  reactions: { id: string; emoji: string; userId: string; ts: number }[]

  toggleChat: () => void
  toggleTheatre: () => void
  toggleMusic: () => void
  setPipPosition: (pos: { x: number; y: number }) => void
  swapMainView: () => void
  setActivePanel: (panel: ActivePanel) => void
  incrementUnread: () => void
  clearUnread: () => void
  addMessage: (msg: ChatMessage) => void
  setMessages: (msgs: ChatMessage[]) => void
  setMusicQueue: (queue: MusicTrack[]) => void
  addToQueue: (track: MusicTrack) => void
  setWatchState: (state: WatchState | null) => void
  addReaction: (reaction: { id: string; emoji: string; userId: string; ts: number }) => void
  removeReaction: (id: string) => void
  reset: () => void
}

export const useUIStore = create<UIStore>((set, get) => ({
  isChatOpen: false,
  isTheatreMode: false,
  isMusicOpen: false,
  pipPosition: { x: 0, y: 0 },
  mainView: 'remote',
  activePanel: null,
  unreadCount: 0,
  messages: [],
  musicQueue: [],
  watchState: null,
  reactions: [],

  toggleChat: () => {
    const { isChatOpen } = get()
    set({ isChatOpen: !isChatOpen, unreadCount: 0 })
  },
  toggleTheatre: () => set(s => ({ isTheatreMode: !s.isTheatreMode })),
  toggleMusic: () => set(s => ({ isMusicOpen: !s.isMusicOpen })),
  setPipPosition: (pos) => set({ pipPosition: pos }),
  swapMainView: () => set(s => ({ mainView: s.mainView === 'remote' ? 'self' : 'remote' })),
  setActivePanel: (panel) => set({ activePanel: panel }),
  incrementUnread: () => set(s => ({ unreadCount: s.unreadCount + 1 })),
  clearUnread: () => set({ unreadCount: 0 }),
  addMessage: (msg) => set(s => ({ messages: [...s.messages, msg] })),
  setMessages: (msgs) => set({ messages: msgs }),
  setMusicQueue: (queue) => set({ musicQueue: queue }),
  addToQueue: (track) => set(s => ({ musicQueue: [...s.musicQueue, track] })),
  setWatchState: (state) => set({ watchState: state }),
  addReaction: (reaction) => set(s => ({ reactions: [...s.reactions, reaction] })),
  removeReaction: (id) => set(s => ({ reactions: s.reactions.filter(r => r.id !== id) })),
  reset: () => set({
    isChatOpen: false,
    isTheatreMode: false,
    isMusicOpen: false,
    mainView: 'remote',
    activePanel: null,
    unreadCount: 0,
    messages: [],
    musicQueue: [],
    watchState: null,
    reactions: [],
  }),
}))
