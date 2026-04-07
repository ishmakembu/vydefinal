import {
  Room,
  RoomOptions,
  RoomConnectOptions,
  VideoPresets,
} from 'livekit-client'

export const ROOM_OPTIONS: RoomOptions = {
  // pixelDensity:'screen' requests layers sized for actual display pixels,
  // preventing the adaptive stream from dropping to the lowest layer.
  adaptiveStream: { pixelDensity: 'screen' },
  dynacast: true,
  publishDefaults: {
    // Start at 360p minimum — 180p (320×180) is unusable
    videoSimulcastLayers: [
      VideoPresets.h360,
      VideoPresets.h720,
    ],
    videoEncoding: {
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
    sampleRate: 48000,
    channelCount: 1,
  },
  videoCaptureDefaults: {
    // No fixed resolution — let the device use its natural orientation.
    // A hardcoded 1280×720 landscape resolution breaks portrait phone cameras.
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
