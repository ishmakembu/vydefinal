import PartySocket from 'partysocket'
import type { VydeMessage } from '@/types'

export type VydeMessageHandler = (msg: VydeMessage) => void

let socket: PartySocket | null = null
const handlers: Set<VydeMessageHandler> = new Set()

export function connectPartyKit(roomCode: string): PartySocket {
  if (socket) {
    socket.close()
  }

  const host = process.env.NEXT_PUBLIC_PARTYKIT_HOST
  if (!host) throw new Error('NEXT_PUBLIC_PARTYKIT_HOST is not set')

  socket = new PartySocket({
    host,
    room: `vyde-${roomCode.toUpperCase()}`,
    party: 'main',
  })

  socket.addEventListener('message', (event: MessageEvent) => {
    try {
      const msg = JSON.parse(event.data as string) as VydeMessage
      handlers.forEach(h => h(msg))
    } catch {
      // ignore malformed messages
    }
  })

  return socket
}

export function disconnectPartyKit(): void {
  if (socket) {
    socket.close()
    socket = null
  }
  handlers.clear()
}

export function sendPartyMessage(msg: VydeMessage): void {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(msg))
  }
}

export function addMessageHandler(handler: VydeMessageHandler): () => void {
  handlers.add(handler)
  return () => handlers.delete(handler)
}

export function getSocket(): PartySocket | null {
  return socket
}
