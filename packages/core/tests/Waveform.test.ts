import { test, expect, afterAll } from "bun:test";
import { WaveformError } from "../src/types";

const originalAudioContext = Object.getOwnPropertyDescriptor(globalThis, "AudioContext");

function installFakeAudioContext(samples: Float32Array, shouldFailDecode = false) {
  (globalThis as any).AudioContext = class {
    close() {
      return Promise.resolve();
    }
    async decodeAudioData(_arrayBuffer: ArrayBuffer) {
      if (shouldFailDecode) {
        throw new Error("unsupported audio format");
      }
      return {
        getChannelData: (_channel: number) => samples,
      };
    }
  };
}

afterAll(() => {
  if (originalAudioContext) {
    Object.defineProperty(globalThis, "AudioContext", originalAudioContext);
  } else {
    delete (globalThis as any).AudioContext;
  }
});

test("computeWaveform resolves an array of exactly barCount length", async () => {
  installFakeAudioContext(new Float32Array(1000).fill(0.5));
  const { computeWaveform } = await import(`../src/Waveform?t=${Date.now()}`);
  const bars = await computeWaveform(new Blob(["fake-audio"]), 10);
  expect(bars).toHaveLength(10);
  bars.forEach((bar: number) => expect(bar).toBeGreaterThan(0));
});

test("computeWaveform rejects with RangeError for a non-positive-integer barCount", async () => {
  installFakeAudioContext(new Float32Array(1000).fill(0.5));
  const { computeWaveform } = await import(`../src/Waveform?t=${Date.now()}`);
  const blob = new Blob(["fake-audio"]);

  await expect(computeWaveform(blob, 0)).rejects.toBeInstanceOf(RangeError);
  await expect(computeWaveform(blob, -5)).rejects.toBeInstanceOf(RangeError);
  await expect(computeWaveform(blob, 3.5)).rejects.toBeInstanceOf(RangeError);
  await expect(computeWaveform(blob, NaN)).rejects.toBeInstanceOf(RangeError);
  await expect(computeWaveform(blob, Infinity)).rejects.toBeInstanceOf(RangeError);
});

test("computeWaveform rejects with WaveformError wrapping the decode failure", async () => {
  installFakeAudioContext(new Float32Array(), true);
  const { computeWaveform } = await import(`../src/Waveform?t=${Date.now()}`);
  try {
    await computeWaveform(new Blob(["fake-audio"]), 10);
    expect.unreachable();
  } catch (err) {
    expect(err).toBeInstanceOf(WaveformError);
    expect((err as Error & { cause?: Error }).cause?.message).toBe("unsupported audio format");
  }
});
