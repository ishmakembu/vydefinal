import type * as Party from 'partykit/server'
import type { VydeMessage, ChatMessage, MusicTrack, WatchState } from '../src/types'

interface RoomState {
  participants: Map<string, { displayName: string; ws: Party.Connection }>
  messages: ChatMessage[]
  musicQueue: MusicTrack[]
  musicPlaying: boolean
  musicPosition: number
  musicLastSyncAt: number
  watchState: WatchState | null
  theatreMode: boolean
  createdAt: number
}

const MAX_PARTICIPANTS = 2
const MESSAGE_HISTORY_LIMIT = 50
const ROOM_TTL_MS = 24 * 60 * 60 * 1000

export default class VydeParty implements Party.Server {
  private state: RoomState = {
    participants: new Map(),
    messages: [],
    musicQueue: [],
    musicPlaying: false,
    musicPosition: 0,
    musicLastSyncAt: 0,
    watchState: null,
    theatreMode: false,
    createdAt: Date.now(),
  }

  constructor(readonly room: Party.Room) {}

  async onConnect(conn: Party.Connection) {
    // Check if room is full
    if (this.state.participants.size >= MAX_PARTICIPANTS) {
      conn.send(JSON.stringify({ type: 'room_full' } satisfies VydeMessage))
      conn.close()
      return
    }

    // Check TTL
    if (Date.now() - this.state.createdAt > ROOM_TTL_MS) {
      conn.send(JSON.stringify({ type: 'room_full' } satisfies VydeMessage))
      conn.close()
      return
    }
  }

  async onMessage(message: string, sender: Party.Connection) {
    let msg: VydeMessage
    try {
      msg = JSON.parse(message) as VydeMessage
    } catch {
      return
    }

    switch (msg.type) {
      case 'join': {
        this.state.participants.set(sender.id, {
          displayName: msg.displayName,
          ws: sender,
        })

        // Send welcome package to the joiner
        const welcomeMsg: VydeMessage = {
          type: 'welcome',
          messages: this.state.messages.slice(-MESSAGE_HISTORY_LIMIT),
          musicQueue: this.state.musicQueue,
          watchState: this.state.watchState,
          participants: Array.from(this.state.participants.values()).map(p => p.displayName),
        }
        sender.send(JSON.stringify(welcomeMsg))

        // Broadcast join to others
        this.broadcast(
          JSON.stringify({ type: 'join', userId: msg.userId, displayName: msg.displayName } satisfies VydeMessage),
          [sender.id]
        )
        break
      }

      case 'leave': {
        this.state.participants.delete(sender.id)
        this.broadcast(
          JSON.stringify({ type: 'leave', userId: msg.userId } satisfies VydeMessage)
        )
        break
      }

      case 'chat': {
        // Truncate at 1000 chars
        const truncated = msg.text.slice(0, 1000)
        const chatMsg: ChatMessage = {
          id: msg.id,
          userId: msg.userId,
          displayName: msg.displayName,
          text: truncated,
          ts: msg.ts,
        }
        this.state.messages.push(chatMsg)
        // Keep only last 50 messages
        if (this.state.messages.length > MESSAGE_HISTORY_LIMIT) {
          this.state.messages = this.state.messages.slice(-MESSAGE_HISTORY_LIMIT)
        }
        this.broadcast(JSON.stringify({ ...msg, text: truncated } satisfies VydeMessage))
        break
      }

      case 'reaction': {
        this.broadcast(JSON.stringify(msg))
        break
      }

      case 'music_add': {
        this.state.musicQueue.push(msg.track)
        this.broadcast(JSON.stringify(msg))
        break
      }

      case 'music_play': {
        this.state.musicPlaying = true
        this.state.musicLastSyncAt = msg.ts
        this.broadcast(JSON.stringify(msg))
        break
      }

      case 'music_pause': {
        this.state.musicPlaying = false
        this.state.musicPosition = msg.ts
        this.broadcast(JSON.stringify(msg))
        break
      }

      case 'music_seek': {
        this.state.musicPosition = msg.position
        this.broadcast(JSON.stringify(msg))
        break
      }

      case 'music_skip': {
        if (this.state.musicQueue.length > 0) {
          this.state.musicQueue.shift()
          this.state.musicPosition = 0
        }
        this.broadcast(JSON.stringify(msg))
        break
      }

      case 'music_reorder': {
        this.state.musicQueue = msg.queue
        this.broadcast(JSON.stringify(msg))
        break
      }

      case 'watch_url': {
        this.state.watchState = {
          url: msg.url,
          playing: false,
          position: 0,
          lastSyncAt: Date.now(),
        }
        this.broadcast(JSON.stringify(msg))
        break
      }

      case 'watch_play': {
        if (this.state.watchState) {
          this.state.watchState.playing = true
          this.state.watchState.position = msg.position
          this.state.watchState.lastSyncAt = msg.ts
        }
        this.broadcast(JSON.stringify(msg))
        break
      }

      case 'watch_pause': {
        if (this.state.watchState) {
          this.state.watchState.playing = false
          this.state.watchState.position = msg.position
        }
        this.broadcast(JSON.stringify(msg))
        break
      }

      case 'watch_seek': {
        if (this.state.watchState) {
          this.state.watchState.position = msg.position
        }
        this.broadcast(JSON.stringify(msg))
        break
      }

      case 'theatre_toggle': {
        this.state.theatreMode = msg.active
        this.broadcast(JSON.stringify(msg))
        break
      }

      case 'ping': {
        sender.send(JSON.stringify({ type: 'pong' } satisfies VydeMessage))
        break
      }
    }
  }

  async onClose(conn: Party.Connection) {
    const participant = this.state.participants.get(conn.id)
    if (participant) {
      this.state.participants.delete(conn.id)
      this.broadcast(
        JSON.stringify({ type: 'leave', userId: conn.id } satisfies VydeMessage)
      )
    }
  }

  private broadcast(message: string, exclude: string[] = []) {
    this.room.broadcast(message, exclude)
  }
}

VydeParty satisfies Party.Worker
