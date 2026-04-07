import {
  Room,
  RoomOptions,
  RoomConnectOptions,
  VideoPresets,
} from 'livekit-client'

export const ROOM_OPTIONS: RoomOptions = {
  adaptiveStream: {
    pauseVideoInBackground: false,
  },
  dynacast: true,
  publishDefaults: {
    // H264 baseline: universally supported, no hardware encoder required
    videoSimulcastLayers: [
      VideoPresets.h180,
      VideoPresets.h360,
      VideoPresets.h720,
    ],
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
    resolution: VideoPresets.h720.resolution,
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
