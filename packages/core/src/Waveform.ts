import { WaveformError } from "./types";

/**
 * Summarizes an audio Blob into `barCount` RMS-amplitude bars (0-1).
 *
 * Reads channel 0 only -- fine for the mono mic input `AudioRecorder` produces, but
 * a stereo blob's other channel(s) are silently ignored. Decodes the entire buffer
 * into memory up front, which is fine for short voice-command utterances but would
 * be wasteful for long-form audio.
 *
 * Throws `WaveformError` (wrapping the original cause) if the audio can't be decoded.
 */
export async function computeWaveform(blob: Blob, barCount: number): Promise<number[]> {
  const arrayBuffer = await blob.arrayBuffer();
  const audioContext = new AudioContext();
  let audioBuffer: AudioBuffer;
  try {
    audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  } catch (cause) {
    throw new WaveformError("Failed to decode audio for waveform computation", { cause });
  } finally {
    await audioContext.close().catch(() => {});
  }

  const samples = audioBuffer.getChannelData(0);
  const chunkSize = Math.max(1, Math.floor(samples.length / barCount));
  const bars: number[] = [];

  for (let i = 0; i < barCount; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, samples.length);
    let sumSquares = 0;
    let count = 0;
    for (let j = start; j < end; j++) {
      sumSquares += samples[j] * samples[j];
      count++;
    }
    bars.push(count > 0 ? Math.min(1, Math.sqrt(sumSquares / count)) : 0);
  }

  return bars;
}
