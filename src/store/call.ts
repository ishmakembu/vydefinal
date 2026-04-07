import { create } from 'zustand'
import type { LocalParticipant, RemoteParticipant } from 'livekit-client'
import type { NetworkQuality } from '@/types'

interface CallStore {
  roomCode: string | null
  localParticipant: LocalParticipant | null
  remoteParticipant: RemoteParticipant | null
  isMicOn: boolean
  isCameraOn: boolean
  isScreenSharing: boolean
  networkQuality: NetworkQuality
  callDuration: number
  displayName: string
  remoteDisplayName: string | null
  isConnected: boolean
  isConnecting: boolean

  setRoomCode: (code: string | null) => void
  setLocalParticipant: (p: LocalParticipant | null) => void
  setRemoteParticipant: (p: RemoteParticipant | null) => void
  setMic: (on: boolean) => void
  setCamera: (on: boolean) => void
  setScreenSharing: (on: boolean) => void
  setNetworkQuality: (q: NetworkQuality) => void
  setCallDuration: (d: number) => void
  setDisplayName: (n: string) => void
  setRemoteDisplayName: (n: string | null) => void
  setConnected: (v: boolean) => void
  setConnecting: (v: boolean) => void
  reset: () => void
}

const DEFAULT_DISPLAY_NAME = typeof window !== 'undefined'
  ? (localStorage.getItem('vyde-display-name') ?? 'You')
  : 'You'

export const useCallStore = create<CallStore>((set) => ({
  roomCode: null,
  localParticipant: null,
  remoteParticipant: null,
  isMicOn: true,
  isCameraOn: true,
  isScreenSharing: false,
  networkQuality: 'disconnected',
  callDuration: 0,
  displayName: DEFAULT_DISPLAY_NAME,
  remoteDisplayName: null,
  isConnected: false,
  isConnecting: false,

  setRoomCode: (code) => set({ roomCode: code }),
  setLocalParticipant: (p) => set({ localParticipant: p }),
  setRemoteParticipant: (p) => set({ remoteParticipant: p }),
  setMic: (on) => set({ isMicOn: on }),
  setCamera: (on) => set({ isCameraOn: on }),
  setScreenSharing: (on) => set({ isScreenSharing: on }),
  setNetworkQuality: (q) => set({ networkQuality: q }),
  setCallDuration: (d) => set({ callDuration: d }),
  setDisplayName: (n) => {
    if (typeof window !== 'undefined') localStorage.setItem('vyde-display-name', n)
    set({ displayName: n })
  },
  setRemoteDisplayName: (n) => set({ remoteDisplayName: n }),
  setConnected: (v) => set({ isConnected: v }),
  setConnecting: (v) => set({ isConnecting: v }),
  reset: () => set({
    roomCode: null,
    localParticipant: null,
    remoteParticipant: null,
    isMicOn: true,
    isCameraOn: true,
    isScreenSharing: false,
    networkQuality: 'disconnected',
    callDuration: 0,
    remoteDisplayName: null,
    isConnected: false,
    isConnecting: false,
  }),
}))
