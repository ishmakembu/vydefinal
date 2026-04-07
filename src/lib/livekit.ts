import {
  Room,
  RoomOptions,
  RoomConnectOptions,
  VideoPresets,
} from 'livekit-client'

export const ROOM_OPTIONS: RoomOptions = {
  // pixelDensity:'screen' requests SVC layers sized for actual display pixels,
  // so the subscriber always gets the sharpest layer that fits the element.
  adaptiveStream: { pixelDensity: 'screen' },
  // Dynacast pauses layers no subscriber is consuming — saves bandwidth
  // without sacrificing quality for active viewers.
  dynacast: true,
  publishDefaults: {
    // VP9 activates Scalable Video Coding (SVC, L3T3_KEY) automatically.
    // SVC is strictly better than simulcast for 1:1 calls:
    //   • 23-33% more bitrate-efficient than H.264 at same visual quality
    //   • Instant layer switching (no keyframe wait like simulcast)
    //   • Single encoded stream — lower CPU than 3 simulcast encoders
    // LiveKit falls back to H.264 automatically for clients that don't support VP9.
    videoCodec: 'vp9',
    // With SVC a single stream covers all quality levels — no simulcast layers needed.
    videoSimulcastLayers: [],
    videoEncoding: {
      // LiveKit bitrate guide: 720p VP9 webcam needs ~700kbps for VMAF 90.
      // 1.5 Mbps ceiling gives headroom for fast motion while keeping CPU usage low.
      maxBitrate: 1_500_000,
      maxFramerate: 30,
    },
    dtx: true,
    red: true,
    forceStereo: false,
    stopMicTrackOnMute: false,
    screenShareSimulcastLayers: [VideoPresets.h360, VideoPresets.h720],
  },
  audioCaptureDefaults: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    // Removing strict 48k sample rate to allow the browser to negotiate the best
    // hardware-native rate, improving compatibility across diverse device mics.
    channelCount: 1,
  },
  videoCaptureDefaults: {
    // Capturing at 720p — Reduces encoding overhead by ~50% compared to 1080p,
    // which fixes the reported 5 FPS lag when combined with heavy UI blur effects.
    resolution: {
      width: 1280,
      height: 720,
      frameRate: 30,
    },
    facingMode: 'user',
  },
}

export const CONNECT_OPTIONS: RoomConnectOptions = {
  autoSubscribe: true,
  maxRetries: 3,
}

export async function fetchToken(roomCode: string, identity: string): Promise<string> {
  const res = await fetch(
    `/api/token?room=${encodeURIComponent(roomCode)}&identity=${encodeURIComponent(identity)}`
  )
  if (!res.ok) throw new Error('Failed to get token')
  const data = await res.json() as { token: string }
  return data.token
}

export function createRoom(): Room {
  return new Room(ROOM_OPTIONS)
}
