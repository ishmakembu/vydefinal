import type { NextConfig } from 'next'

const isDev = process.env.NODE_ENV !== 'production'

// LiveKit uses regional multi-level subdomains e.g. wss://x.region.production.livekit.cloud
// so we need both *.livekit.cloud and *.production.livekit.cloud
const livekitConnect = [
  'wss://*.livekit.cloud', 'https://*.livekit.cloud',
  'wss://*.production.livekit.cloud', 'https://*.production.livekit.cloud',
].join(' ')

const partykitConnect = 'wss://*.partykit.dev https://*.partykit.dev'

// In dev allow local PartyKit server (runs on LAN IP / localhost)
const devConnect = isDev ? 'ws://localhost:* ws://127.0.0.1:* ws://192.168.*.*:*' : ''

const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.youtube.com https://w.soundcloud.com",
  "frame-src https://www.youtube.com https://shelflix.vercel.app https://w.soundcloud.com",
  `connect-src 'self' ${livekitConnect} ${partykitConnect} https://fonts.googleapis.com https://www.youtube.com/oembed ${devConnect}`.trimEnd(),
  "img-src 'self' data: https://i.ytimg.com https://*.ytimg.com",
  "font-src 'self' https://fonts.gstatic.com",
  "media-src 'self' blob:",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
].join('; ')

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.100.222'],
  reactStrictMode: true,
  experimental: {
    serverActions: { allowedOrigins: ['vydefinal.onrender.com'] },
  },
  async redirects() {
    return [
      {
        source: '/room/:path*',
        destination: '/call/:path*',
        permanent: true,
      },
    ]
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Content-Security-Policy', value: csp },
        ],
      },
    ]
  },
}

export default nextConfig
