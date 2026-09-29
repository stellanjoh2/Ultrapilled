import { decodeAudioData, getAudioContext } from "@/lib/sound-engine";
import { getPrefs } from "../prefs";
import { resolveImpact } from "../uiSounds";
import type { ImpactHit } from "../world";

const SAMPLE_RATE = 44100;
/** AAC packets are 1024 samples — encoder padding can overrun the video by about one packet. */
export const AAC_PACKET_SAMPLES = 1024;

/** Full-length stereo bed. Uses floor so audio never outruns the video (avoids a trailing black frame). */
export function silentAudioBuffer(durationSec: number, sampleRate = SAMPLE_RATE): AudioBuffer {
  const frames = Math.max(1, Math.floor(durationSec * sampleRate + 1e-9));
  return getAudioContext().createBuffer(2, frames, sampleRate);
}

/**
 * Mix bounce hits onto a full-length silent bed so the AAC track duration
 * stays ≤ the video duration for clean loops.
 */
export async function mixBounceTrack(
  impacts: ImpactHit[],
  durationSec: number,
): Promise<AudioBuffer> {
  const prefs = getPrefs();
  const bed = silentAudioBuffer(durationSec);
  if (!prefs.soundOn || !prefs.bounceSounds || prefs.soundVolume <= 0) return bed;
  if (!impacts.length || durationSec <= 0) return bed;

  const master = prefs.soundVolume / 100;
  const length = bed.length;
  const offline = new OfflineAudioContext(2, length, SAMPLE_RATE);
  const decoded = new Map<string, AudioBuffer>();

  for (const hit of impacts) {
    const { uri, volume } = resolveImpact(hit.slotId, hit.bounceIndex, hit.speedFactor);
    let buffer = decoded.get(uri);
    if (!buffer) {
      buffer = await decodeAudioData(uri);
      decoded.set(uri, buffer);
    }
    const start = hit.timeMs / 1000;
    if (start >= durationSec) continue;
    const src = offline.createBufferSource();
    const gain = offline.createGain();
    src.buffer = buffer;
    gain.gain.value = volume * master;
    src.connect(gain);
    gain.connect(offline.destination);
    src.start(Math.max(0, start));
  }

  return offline.startRendering();
}
