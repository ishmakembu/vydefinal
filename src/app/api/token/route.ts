import { AccessToken } from 'livekit-server-sdk'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const room = req.nextUrl.searchParams.get('room')
  const identity = req.nextUrl.searchParams.get('identity')

  if (!room || !identity) {
    return NextResponse.json({ error: 'missing params' }, { status: 400 })
  }

  // Validate room code format: 6 uppercase alphanumeric (no ambiguous chars)
  if (!/^[A-Z0-9]{6}$/.test(room)) {
    return NextResponse.json({ error: 'invalid room' }, { status: 400 })
  }

  const apiKey = process.env.LIVEKIT_API_KEY
  const apiSecret = process.env.LIVEKIT_API_SECRET

  if (!apiKey || !apiSecret) {
    return NextResponse.json({ error: 'server misconfigured' }, { status: 500 })
  }

  const at = new AccessToken(apiKey, apiSecret, {
    identity,
    ttl: '24h',
    metadata: JSON.stringify({ joinedAt: Date.now() }),
  })

  at.addGrant({
    roomJoin: true,
    room,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
    roomCreate: true,
  })

  return NextResponse.json({ token: await at.toJwt() })
}
