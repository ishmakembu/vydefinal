import { Room, Track, VideoQuality } from 'livekit-client'
import type { RTCSample, QualityTier } from '@/types'

export const QUALITY_TIERS: readonly QualityTier[] = [
  { name: 'minimal',  maxBitrate:   200_000, resolution: { w: 320,  h: 180  }, fps: 15 },
  { name: 'low',      maxBitrate:   400_000, resolution: { w: 640,  h: 360  }, fps: 20 },
  { name: 'medium',   maxBitrate:   700_000, resolution: { w: 640,  h: 360  }, fps: 30 },
  { name: 'good',     maxBitrate: 1_250_000, resolution: { w: 1280, h: 720  }, fps: 30 },
  { name: 'high',     maxBitrate: 2_000_000, resolution: { w: 1280, h: 720  }, fps: 30 },
  { name: 'ultra',    maxBitrate: 3_000_000, resolution: { w: 1920, h: 1080 }, fps: 30 },
] as const

function avg(nums: number[]): number {
  if (nums.length === 0) return 0
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

export class AdaptiveBitrateManager {
  private currentTier = 4 // start at 'high' (720p) — assume good connection until proven otherwise
  private samples: RTCSample[] = []
  private lastUpgrade = 0
  private readonly UPGRADE_COOLDOWN = 8_000 // was 4s — less thrashing on VP9 SVC
  private onTierChange?: (tier: QualityTier) => void
  private intervalId?: ReturnType<typeof setInterval>

  constructor(private room: Room) {}

  start(onTierChange?: (tier: QualityTier) => void): void {
    this.onTierChange = onTierChange
    this.intervalId = setInterval(() => {
      void this.poll()
    }, 500)
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = undefined
    }
  }

  private async poll(): Promise<void> {
    try {
      const statsMap = await this.room.localParticipant.getTrackPublication(Track.Source.Camera)
        ?.videoTrack?.sender?.getStats()
      if (!statsMap) return

      const sample = this.extractSample(statsMap)
      this.update(sample)
    } catch {
      // Stats not available
    }
  }

  private extractSample(stats: RTCStatsReport): RTCSample {
    let packetLoss = 0
    let rtt = 0
    let bitrate = 0

    stats.forEach((report: RTCStats) => {
      if (report.type === 'outbound-rtp') {
        const r = report as RTCOutboundRtpStreamStats & { targetBitrate?: number }
        bitrate = r.targetBitrate ?? 0
      }
      if (report.type === 'candidate-pair') {
        const r = report as RTCIceCandidatePairStats
        if (r.currentRoundTripTime !== undefined) {
          rtt = r.currentRoundTripTime * 1000 // to ms
        }
      }
      if (report.type === 'remote-inbound-rtp') {
        const r = report as RTCInboundRtpStreamStats & { packetsLost?: number }
        const lost = r.packetsLost ?? 0
        const received = r.packetsReceived ?? 100
        packetLoss = received > 0 ? (lost / (lost + received)) * 100 : 0
      }
    })

    return { packetLoss, rtt, bitrate, timestamp: Date.now() }
  }

  update(sample: RTCSample): void {
    this.samples = [...this.samples.slice(-2), sample]

    const avgLoss = avg(this.samples.map(s => s.packetLoss))
    const avgRtt = avg(this.samples.map(s => s.rtt))

    // Downgrade only on sustained bad conditions (>8% loss or >250ms RTT)
    // Raised from 5%/200ms — avoids dropping quality on brief network blips.
    // Floor at index 1 (low/360p) — never go below readable quality.
    if (sample.packetLoss > 8 || sample.rtt > 250) {
      this.setTier(Math.max(1, this.currentTier - 1))
      return
    }

    // Gradual upgrade (only if cooled down)
    const now = Date.now()
    if (
      avgLoss < 1 &&
      avgRtt < 80 &&
      this.samples.length === 3 &&
      now - this.lastUpgrade > this.UPGRADE_COOLDOWN
    ) {
      this.setTier(Math.min(QUALITY_TIERS.length - 1, this.currentTier + 1))
      this.lastUpgrade = now
    }
  }

  private setTier(idx: number): void {
    if (idx === this.currentTier) return
    this.currentTier = idx
    const tier = QUALITY_TIERS[idx]
    this.applyTier(tier)
    this.onTierChange?.(tier)
  }

  private applyTier(tier: QualityTier): void {
    // With VP9 SVC, LiveKit manages spatial layer selection natively via adaptiveStream.
    // We set VideoQuality hints on remote subscriptions — this tells LiveKit which
    // SVC layer to forward, working WITH its quality management instead of
    // fighting it with applyConstraints() on the raw MediaStreamTrack.
    const quality =
      tier.maxBitrate >= 1_250_000 ? VideoQuality.HIGH :
      tier.maxBitrate >= 400_000   ? VideoQuality.MEDIUM :
                                     VideoQuality.LOW

    for (const participant of this.room.remoteParticipants.values()) {
      for (const pub of participant.trackPublications.values()) {
        if (pub.kind === Track.Kind.Video && pub.isSubscribed) {
          pub.setVideoQuality(quality)
        }
      }
    }
  }

  getCurrentTier(): QualityTier {
    return QUALITY_TIERS[this.currentTier]
  }
}

export class ConnectionRecovery {
  private reconnectAttempts = 0
  private readonly MAX_ATTEMPTS = 8

  constructor(
    private room: Room,
    private onReconnecting: () => void,
    private onReconnected: () => void
  ) {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleNetworkChange())

      const nav = navigator as Navigator & {
        connection?: { addEventListener: (event: string, cb: () => void) => void }
      }
      nav.connection?.addEventListener('change', () => this.handleNetworkChange())
    }
  }

  handleNetworkChange(): void {
    // ICE restart triggers automatically via LiveKit's reconnect
    if (this.room.state !== 'connected') {
      this.onDisconnected()
    }
  }

  onDisconnected(): void {
    if (this.reconnectAttempts >= this.MAX_ATTEMPTS) return
    this.onReconnecting()

    const delay = Math.min(300 * Math.pow(1.5, this.reconnectAttempts), 8000)
    this.reconnectAttempts++

    setTimeout(async () => {
      try {
        await this.room.connect(
          process.env.NEXT_PUBLIC_LIVEKIT_URL!,
          ''
        )
        this.reconnectAttempts = 0
        this.onReconnected()
      } catch {
        this.onDisconnected()
      }
    }, delay)
  }

  reset(): void {
    this.reconnectAttempts = 0
  }
}

export function getNetworkQualityFromSample(sample: RTCSample): 'excellent' | 'good' | 'poor' {
  if (sample.packetLoss < 1 && sample.rtt < 60) return 'excellent'
  if (sample.packetLoss <= 5 && sample.rtt <= 150) return 'good'
  return 'poor'
}
