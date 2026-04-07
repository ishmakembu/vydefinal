'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Room, RoomEvent, ConnectionState, Track, VideoQuality,
  type RemoteTrackPublication, type RemoteParticipant,
  type LocalVideoTrack, type RemoteVideoTrack,
} from 'livekit-client'
import { useCallStore } from '@/store/call'
import { useUIStore } from '@/store/ui'
import { connectPartyKit, disconnectPartyKit, addMessageHandler, sendPartyMessage } from '@/lib/partykit'
import { createRoom, CONNECT_OPTIONS, fetchToken } from '@/lib/livekit'
import { validateCode } from '@/lib/session'
import { showToast } from '@/components/ui/ToastSystem'
import type { VydeMessage, ChatMessage } from '@/types'
import { nanoid } from 'nanoid'
import VideoCanvas from '@/components/call/VideoCanvas'
import CallControls from '@/components/call/CallControls'
import ChatPanel from '@/components/features/ChatPanel'
import MusicPlayer from '@/components/features/MusicPlayer'
import WatchParty from '@/components/features/WatchParty'
import ToastSystem from '@/components/ui/ToastSystem'
import { AdaptiveBitrateManager } from '@/lib/streaming'

function BackgroundOrbs() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <div className="absolute -top-48 -left-24 w-[600px] h-[600px] rounded-full animate-orb-drift"
        style={{ background: 'radial-gradient(circle,rgba(139,92,246,0.18) 0%,transparent 70%)', filter: 'blur(80px)' }} />
      <div className="absolute -bottom-36 -right-24 w-[500px] h-[500px] rounded-full animate-orb-drift"
        style={{ background: 'radial-gradient(circle,rgba(59,130,246,0.14) 0%,transparent 70%)', filter: 'blur(80px)', animationDelay: '-8s' }} />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 80% 60% at 20% 10%,#1e1045,transparent),radial-gradient(ellipse 60% 50% at 80% 80%,#0f1e40,transparent),#0a0814' }} />
    </div>
  )
}

function ConnectingScreen({ code }: { code: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block w-12 h-12 rounded-full border-2 border-white/20 border-t-purple-400 animate-spin mb-4" />
        <p className="font-semibold" style={{ fontFamily: 'var(--font-display)' }}>Connecting to VYDE-{code}&hellip;</p>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Setting up secure connection</p>
      </div>
    </div>
  )
}

function ErrorScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="glass-strong rounded-[32px] p-8 max-w-sm w-full text-center">
        <div className="text-5xl mb-4">⚠️</div>
        <h2 className="text-lg font-semibold mb-2" style={{ fontFamily: 'var(--font-display)' }}>
          Connection Problem
        </h2>
        <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>{message}</p>
        <button
          onClick={onRetry}
          className="w-full py-3 rounded-[16px] font-semibold"
          style={{ background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-blue))', color: '#fff', fontFamily: 'var(--font-display)' }}
        >
          Try Again
        </button>
      </div>
    </div>
  )
}

export default function CallPage() {
  const params = useParams()
  const router = useRouter()
  const code = (params.code as string).toUpperCase()

  const {
    setRoomCode, setLocalParticipant, setRemoteParticipant,
    setNetworkQuality, setConnected, setConnecting,
    setRemoteDisplayName, setMic, setCamera,
    displayName, reset: resetCall,
  } = useCallStore()
  const { setMessages, setMusicQueue, setWatchState, addReaction, isChatOpen, toggleTheatre, reset: resetUI } = useUIStore()

  const roomRef = useRef<Room | null>(null)
  const abrRef = useRef<AdaptiveBitrateManager | null>(null)
  const durationRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const userIdRef = useRef(nanoid())
  const cleanupRef = useRef<(() => void) | null>(null)
  const wasConnectedRef = useRef(false)

  const [localVideoTrack, setLocalVideoTrack] = useState<LocalVideoTrack | null>(null)
  const [remoteVideoTrack, setRemoteVideoTrack] = useState<RemoteVideoTrack | null>(null)
  const [remoteSpeaking, setRemoteSpeaking] = useState(false)
  const [localSpeaking, setLocalSpeaking] = useState(false)
  const [isConnectingLocal, setIsConnectingLocal] = useState(true)
  const [showPip, setShowPip] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [callDuration, setCallDuration] = useState(0)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)

  // Wake lock
  useEffect(() => {
    const req = async () => {
      try {
        if ('wakeLock' in navigator) wakeLockRef.current = await navigator.wakeLock.request('screen')
      } catch { /* not critical */ }
    }
    void req()
    return () => { void wakeLockRef.current?.release() }
  }, [])

  // Browser compat
  useEffect(() => {
    if (!navigator.mediaDevices || !window.RTCPeerConnection) {
      showToast('Use Chrome, Safari, or Firefox for calls', 'error')
      setTimeout(() => router.replace('/'), 3000)
    }
  }, [router])

  const initCall = useCallback(async () => {
    if (!validateCode(code)) {
      showToast('Invalid call code', 'error')
      router.replace('/')
      return
    }

    setIsConnectingLocal(true)
    setConnecting(true)
    setErrorMessage(null)
    setRoomCode(code)

    // ── 1. PartyKit ────────────────────────────────────────────
    const socket = connectPartyKit(code)

    const msgUnsub = addMessageHandler((msg: VydeMessage) => {
      switch (msg.type) {
        case 'room_full':
          showToast('This call is full (max 2 people)', 'error')
          disconnectPartyKit()
          router.replace('/')
          break
        case 'welcome':
          setMessages(msg.messages)
          setMusicQueue(msg.musicQueue)
          if (msg.watchState) setWatchState(msg.watchState)
          break
        case 'chat': {
          // Only add if not already in store (optimistic dedup by id)
          const store = useUIStore.getState()
          if (!store.messages.find(m => m.id === msg.id)) {
            const chatMsg: ChatMessage = {
              id: msg.id, userId: msg.userId,
              displayName: msg.displayName, text: msg.text, ts: msg.ts,
            }
            store.addMessage(chatMsg)
            if (!store.isChatOpen) store.incrementUnread()
          }
          break
        }
        case 'reaction':
          addReaction({ id: msg.id, emoji: msg.emoji, userId: msg.userId, ts: Date.now() })
          break
        case 'join':
          setRemoteDisplayName(msg.displayName)
          showToast(`${msg.displayName} joined`, 'success')
          break
        case 'leave':
          showToast(`${useCallStore.getState().remoteDisplayName ?? 'Guest'} left the call`, 'warning')
          setRemoteDisplayName(null)
          break
        case 'music_add':
          useUIStore.getState().addToQueue(msg.track)
          break
        case 'music_skip':
          useUIStore.getState().setMusicQueue(useUIStore.getState().musicQueue.slice(1))
          break
        case 'watch_url':
          setWatchState({ url: msg.url, playing: false, position: 0, lastSyncAt: Date.now(), controllerId: msg.userId })
          break
        case 'watch_play':
          setWatchState({ ...useUIStore.getState().watchState!, playing: true, position: msg.position, lastSyncAt: msg.ts, controllerId: msg.userId })
          break
        case 'watch_pause':
          setWatchState({ ...useUIStore.getState().watchState!, playing: false, position: msg.position, controllerId: msg.userId })
          break
        case 'watch_seek':
          setWatchState({ ...useUIStore.getState().watchState!, position: msg.position, lastSyncAt: Date.now(), controllerId: msg.userId })
          break
        case 'watch_heartbeat':
          // Only sync from heartbeat if we are not the one who sent it
          if (msg.userId !== userIdRef.current) {
            setWatchState({ ...useUIStore.getState().watchState!, playing: msg.playing, position: msg.position, lastSyncAt: msg.ts, controllerId: msg.userId })
          }
          break
        case 'theatre_toggle':
          if (msg.active !== useUIStore.getState().isTheatreMode) toggleTheatre()
          break
      }
    })

    // Announce join once socket is open
    const announceJoin = () => sendPartyMessage({ type: 'join', userId: userIdRef.current, displayName })
    if (socket.readyState === WebSocket.OPEN) {
      announceJoin()
    } else {
      socket.addEventListener('open', announceJoin, { once: true })
    }

    // ── 2. LiveKit ─────────────────────────────────────────────
    try {
      const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL
      if (!livekitUrl) throw new Error('NEXT_PUBLIC_LIVEKIT_URL is not configured')

      if (!window.isSecureContext) {
        throw new Error('Media devices require a secure connection (HTTPS). Please access this app over HTTPS.')
      }

      const token = await fetchToken(code, displayName || 'Guest')

      const room = createRoom()
      roomRef.current = room

      room.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
        if (state === ConnectionState.Connected) {
          wasConnectedRef.current = true
          // Clear any pending reconnect timeout
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current)
            reconnectTimeoutRef.current = null
          }
          setConnected(true)
          setConnecting(false)
          setIsConnectingLocal(false)
          setNetworkQuality('good')
          setLocalParticipant(room.localParticipant)

          // Start ABR
          const abr = new AdaptiveBitrateManager(room)
          abr.start()
          abrRef.current = abr

          // Duration timer
          const start = Date.now()
          durationRef.current = setInterval(() => setCallDuration(Math.floor((Date.now() - start) / 1000)), 1000)
        }
        if (state === ConnectionState.Disconnected) {
          setNetworkQuality('disconnected')
          setConnected(false)
          // If we had previously connected (mid-call drop), attempt full re-init
          // with a fresh token instead of showing spinner indefinitely
          if (wasConnectedRef.current) {
            wasConnectedRef.current = false
            if (reconnectTimeoutRef.current) {
              clearTimeout(reconnectTimeoutRef.current)
              reconnectTimeoutRef.current = null
            }
            // Give brief grace to avoid re-entry if already cleaning up
            reconnectTimeoutRef.current = setTimeout(() => {
              if (roomRef.current?.state === ConnectionState.Disconnected) {
                setIsConnectingLocal(false)
                setConnecting(false)
                setErrorMessage('Connection lost. Check your network and try again.')
              }
            }, 2_000)
          }
        }
        if (state === ConnectionState.Reconnecting) {
          setNetworkQuality('disconnected')
          setConnecting(true) // show the Connecting spinner badge during reconnect
          // Timeout: if not back up in 20s, surface error screen
          if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
          reconnectTimeoutRef.current = setTimeout(() => {
            if (roomRef.current?.state !== ConnectionState.Connected) {
              setIsConnectingLocal(false)
              setConnecting(false)
              setErrorMessage('Reconnection timed out. Check your network and try again.')
            }
          }, 20_000)
        }
      })

      room.on(RoomEvent.TrackSubscribed, (track, pub: RemoteTrackPublication, participant: RemoteParticipant) => {
        if (track.kind === Track.Kind.Video) {
          // Request the highest SVC layer immediately — don't wait for ABR to ramp up.
          // VideoQuality.HIGH maps to the top spatial layer in VP9 SVC (L3T3_KEY).
          pub.setVideoQuality(VideoQuality.HIGH)
          setRemoteVideoTrack(track as RemoteVideoTrack)
          setRemoteParticipant(participant)
          setRemoteDisplayName(participant.identity)
        }
      })

      room.on(RoomEvent.TrackUnsubscribed, (track) => {
        if (track.kind === Track.Kind.Video) setRemoteVideoTrack(null)
      })

      room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
        const myId = room.localParticipant.identity
        setLocalSpeaking(speakers.some(s => s.identity === myId))
        setRemoteSpeaking(speakers.some(s => s.identity !== myId))
      })

      room.on(RoomEvent.LocalTrackPublished, (pub) => {
        if (pub.kind === Track.Kind.Video && pub.videoTrack) {
          setLocalVideoTrack(pub.videoTrack as LocalVideoTrack)
        }
      })

      room.on(RoomEvent.LocalTrackUnpublished, (pub) => {
        if (pub.kind === Track.Kind.Video) setLocalVideoTrack(null)
      })

      room.on(RoomEvent.Disconnected, () => {
        setConnected(false)
        setNetworkQuality('disconnected')
      })

      // Connect – no media yet
      await room.connect(livekitUrl, token, CONNECT_OPTIONS)

      // Enable mic first (always available, less likely to fail)
      try {
        await room.localParticipant.setMicrophoneEnabled(true)
        setMic(true)
      } catch (err) {
        console.warn('Mic error:', err)
        setMic(false)
      }

      // Try camera – fail gracefully; call continues audio-only
      try {
        await room.localParticipant.setCameraEnabled(true)
        setCamera(true)
        const camPub = room.localParticipant.getTrackPublication(Track.Source.Camera)
        if (camPub?.videoTrack) setLocalVideoTrack(camPub.videoTrack as LocalVideoTrack)
      } catch (err) {
        console.warn('Camera not available – audio-only mode:', err)
        setCamera(false)
        showToast('Camera unavailable – audio only', 'info')
      }

      cleanupRef.current = () => {
        msgUnsub()
      }
    } catch (err) {
      const error = err as Error
      console.error('Call init error:', error)
      setIsConnectingLocal(false)
      setConnecting(false)
      setErrorMessage(error.message || 'Failed to connect. Check your connection and try again.')
    }
  }, [
    code, displayName, router,
    setRoomCode, setConnected, setConnecting, setLocalParticipant,
    setRemoteParticipant, setNetworkQuality, setRemoteDisplayName,
    setMic, setCamera,
    setMessages, setMusicQueue, setWatchState, addReaction,
    toggleTheatre,
  ])

  useEffect(() => {
    void initCall()
    return () => {
      cleanupRef.current?.()
      abrRef.current?.stop()
      if (durationRef.current) clearInterval(durationRef.current)
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
      roomRef.current?.disconnect()
      disconnectPartyKit()
      resetCall()
      resetUI()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleEndCall = useCallback(() => {
    sendPartyMessage({ type: 'leave', userId: userIdRef.current })
    setTimeout(() => router.replace(`/?ended=1&duration=${callDuration}`), 300)
  }, [router, callDuration])

  const wasCameraEnabledRef = useRef(false)
  const handleToggleScreenShare = useCallback(async () => {
    if (!roomRef.current) return
    const { isScreenSharing, setScreenSharing, isCameraOn } = useCallStore.getState()
    const newState = !isScreenSharing

    try {
      if (newState) {
        // Turning screen share ON: remember camera state
        wasCameraEnabledRef.current = isCameraOn
      }

      await roomRef.current.localParticipant.setScreenShareEnabled(newState)
      setScreenSharing(newState)

      // Restoration: if we turned screen share OFF, and camera was previously ON, resume it.
      if (!newState && wasCameraEnabledRef.current) {
        // Brief delay ensures the browser has released the screen share lock before 
        // attempting to re-acquire the camera.
        setTimeout(async () => {
          try {
            await roomRef.current?.localParticipant.setCameraEnabled(true)
            setCamera(true)
          } catch (e) { console.warn('camera resume error', e) }
        }, 300)
      }
    } catch { /* user cancelled or not supported */ }
  }, [setCamera])

  const handleSendReaction = useCallback((emoji: string) => {
    const id = nanoid()
    sendPartyMessage({ type: 'reaction', userId: userIdRef.current, emoji, id })
    addReaction({ id, emoji, userId: userIdRef.current, ts: Date.now() })
  }, [addReaction])

  if (errorMessage) {
    return (
      <>
        <BackgroundOrbs />
        <ToastSystem />
        <ErrorScreen
          message={errorMessage}
          onRetry={() => { setErrorMessage(null); setIsConnectingLocal(true); void initCall() }}
        />
      </>
    )
  }

  if (isConnectingLocal) {
    return (
      <>
        <BackgroundOrbs />
        <ToastSystem />
        <ConnectingScreen code={code} />
      </>
    )
  }

  return (
    <div
      className="w-full flex flex-col overflow-hidden"
      style={{ background: 'var(--bg-base)', height: '100dvh' }}
    >
      <BackgroundOrbs />
      <ToastSystem />

      <div className="flex-1 flex overflow-hidden p-3 gap-3 relative">
        {/* Video area */}
        <div className="flex-1 relative min-w-0">
          <VideoCanvas
            remoteTrack={remoteVideoTrack}
            localTrack={localVideoTrack}
            remoteSpeaking={remoteSpeaking}
            localSpeaking={localSpeaking}
            showPip={showPip}
          />
          <WatchParty />
        </div>

        {/* Side panels */}
        <div className="relative flex-shrink-0" style={{ width: isChatOpen ? 280 : 0 }}>
          <ChatPanel />
          <MusicPlayer />
        </div>
      </div>

      {/* Controls */}
      <div className="flex-shrink-0 px-3 pb-3">
        <CallControls
          onEndCall={handleEndCall}
          onToggleScreenShare={() => void handleToggleScreenShare()}
          onSendReaction={handleSendReaction}
          showPip={showPip}
          onTogglePip={() => setShowPip(p => !p)}
          onSwapView={useUIStore.getState().swapMainView}
          roomRef={roomRef}
        />
      </div>
    </div>
  )
}