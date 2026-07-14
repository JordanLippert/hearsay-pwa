# Waveform Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add live amplitude level monitoring during recording and post-recording waveform computation to `@hearsay-pwa/core`, expose both (plus the raw recorded `Blob`) through `useVoiceCommand`, and relocate both packages' test files from co-located `src/*.test.ts` to a sibling `tests/` directory.

**Architecture:** `AudioRecorder.start()` gains an optional `onLevel` callback driven by a `Web Audio API` `AnalyserNode` running alongside the existing `MediaRecorder`; a new standalone `Waveform.ts` module exposes a pure `computeWaveform(blob, barCount)` function independent of `AudioRecorder`'s internal state; `useVoiceCommand` wires both into new `level`/`waveform`/`audioBlob` state fields without changing any existing behavior.

**Tech Stack:** Bun test, Web Audio API (`AudioContext`, `AnalyserNode`), React 18/19, TypeScript.

---

## File Structure

```
packages/core/
├── tsconfig.json                    — modified: include tests/
├── src/
│   ├── types.ts                     — modified: add WaveformError
│   ├── AudioRecorder.ts             — modified: add onLevel support
│   ├── Waveform.ts                  — new: computeWaveform()
│   ├── index.ts                     — modified: export computeWaveform, WaveformError
│   ├── CommandMatcher.ts            — unchanged
│   └── TranscriptionEngine.ts       — unchanged
└── tests/                           — new directory
    ├── types.test.ts                — moved + extended (WaveformError)
    ├── AudioRecorder.test.ts        — moved + extended (onLevel)
    ├── Waveform.test.ts             — new
    ├── CommandMatcher.test.ts       — moved, unchanged content
    └── TranscriptionEngine.test.ts  — moved, unchanged content

packages/react/
├── tsconfig.json                    — modified: include tests/
├── src/
│   ├── useVoiceCommand.ts           — modified: level/waveform/audioBlob
│   └── VoiceButton.tsx              — unchanged
└── tests/                           — new directory
    ├── useVoiceCommand.test.tsx     — moved + extended
    └── VoiceButton.test.tsx         — moved, unchanged content
```

`happydom.setup.ts` and both `bunfig.toml` files stay exactly where they are (package root) — they're config, not tests, and none of their relative paths reference the moved files.

---

## Task 1: Relocate core package's test files to `tests/`

**Files:**
- Move: `packages/core/src/AudioRecorder.test.ts` → `packages/core/tests/AudioRecorder.test.ts`
- Move: `packages/core/src/CommandMatcher.test.ts` → `packages/core/tests/CommandMatcher.test.ts`
- Move: `packages/core/src/TranscriptionEngine.test.ts` → `packages/core/tests/TranscriptionEngine.test.ts`
- Move: `packages/core/src/types.test.ts` → `packages/core/tests/types.test.ts`
- Modify: `packages/core/tsconfig.json`

Pure relocation — no behavior change. Each moved file needs its relative imports updated from `./X` to `../src/X` (including the cache-busted dynamic `import()` calls).

- [ ] **Step 1: Create the directory and move the files**

```bash
mkdir -p packages/core/tests
git mv packages/core/src/AudioRecorder.test.ts packages/core/tests/AudioRecorder.test.ts
git mv packages/core/src/CommandMatcher.test.ts packages/core/tests/CommandMatcher.test.ts
git mv packages/core/src/TranscriptionEngine.test.ts packages/core/tests/TranscriptionEngine.test.ts
git mv packages/core/src/types.test.ts packages/core/tests/types.test.ts
```

- [ ] **Step 2: Fix imports in `packages/core/tests/AudioRecorder.test.ts`**

Replace the two import lines at the top:

```typescript
import { MicPermissionError } from "./types";
```

with:

```typescript
import { MicPermissionError } from "../src/types";
```

And replace every occurrence of `` `./AudioRecorder?t=${Date.now()}` `` (there are 5) with `` `../src/AudioRecorder?t=${Date.now()}` ``.

- [ ] **Step 3: Fix imports in `packages/core/tests/CommandMatcher.test.ts`**

Replace:

```typescript
import { CommandMatcher } from "./CommandMatcher";
```

with:

```typescript
import { CommandMatcher } from "../src/CommandMatcher";
```

(This file has no dynamic imports — only this one static import needs updating.)

- [ ] **Step 4: Fix imports in `packages/core/tests/TranscriptionEngine.test.ts`**

Replace:

```typescript
import { ModelLoadError } from "./types";
```

with:

```typescript
import { ModelLoadError } from "../src/types";
```

And replace every occurrence of `` `./TranscriptionEngine?t=${Date.now()}` `` (there are 6) with `` `../src/TranscriptionEngine?t=${Date.now()}` ``.

- [ ] **Step 5: Fix imports in `packages/core/tests/types.test.ts`**

Replace:

```typescript
import { MicPermissionError, ModelLoadError } from "./types";
```

with:

```typescript
import { MicPermissionError, ModelLoadError } from "../src/types";
```

- [ ] **Step 6: Update `packages/core/tsconfig.json` to type-check the new directory**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "dist" },
  "include": ["src", "tests"]
}
```

- [ ] **Step 7: Verify the full core suite still passes from the new location**

Run: `bun test packages/core`
Expected: `19 pass, 0 fail` across 4 files (2 types + 5 CommandMatcher + 5 AudioRecorder + 7 TranscriptionEngine — same tests as before, just relocated; this is Task 1's baseline, before Waveform/AudioRecorder additions land in later tasks).

- [ ] **Step 8: Commit**

```bash
git add packages/core/tests packages/core/tsconfig.json
git commit -m "refactor(core): move test files from src/ to a sibling tests/ directory"
```

---

## Task 2: Relocate react package's test files to `tests/`

**Files:**
- Move: `packages/react/src/useVoiceCommand.test.tsx` → `packages/react/tests/useVoiceCommand.test.tsx`
- Move: `packages/react/src/VoiceButton.test.tsx` → `packages/react/tests/VoiceButton.test.tsx`
- Modify: `packages/react/tsconfig.json`

- [ ] **Step 1: Create the directory and move the files**

```bash
mkdir -p packages/react/tests
git mv packages/react/src/useVoiceCommand.test.tsx packages/react/tests/useVoiceCommand.test.tsx
git mv packages/react/src/VoiceButton.test.tsx packages/react/tests/VoiceButton.test.tsx
```

- [ ] **Step 2: Fix imports in `packages/react/tests/useVoiceCommand.test.tsx`**

Replace every occurrence of `` `./useVoiceCommand?t=${Date.now()}` `` (there are 4) with `` `../src/useVoiceCommand?t=${Date.now()}` ``.

(This file has no static import of the module under test — it only uses the cache-busted dynamic import. Its other imports — `bun:test`, `@testing-library/react` — are package imports, unaffected by the move.)

- [ ] **Step 3: Fix imports in `packages/react/tests/VoiceButton.test.tsx`**

Replace:

```typescript
import { VoiceButton } from "./VoiceButton";
```

with:

```typescript
import { VoiceButton } from "../src/VoiceButton";
```

- [ ] **Step 4: Update `packages/react/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "dist", "jsx": "react-jsx" },
  "include": ["src", "tests"]
}
```

- [ ] **Step 5: Verify the full workspace suite still passes**

Run: `bun test packages` (from repo root)
Expected: `27 pass, 0 fail` across 6 files — identical count to before the move, just relocated.

- [ ] **Step 6: Commit**

```bash
git add packages/react/tests packages/react/tsconfig.json
git commit -m "refactor(react): move test files from src/ to a sibling tests/ directory"
```

---

## Task 3: `WaveformError` type

**Files:**
- Modify: `packages/core/src/types.ts`
- Modify: `packages/core/tests/types.test.ts`

- [ ] **Step 1: Write the failing test**

Add this test to the end of `packages/core/tests/types.test.ts` (after the existing `ModelLoadError` test):

```typescript
test("WaveformError is an Error with the right name", () => {
  const err = new WaveformError("decode failed");
  expect(err).toBeInstanceOf(Error);
  expect(err).toBeInstanceOf(WaveformError);
  expect(err.name).toBe("WaveformError");
  expect(err.message).toBe("decode failed");
});
```

And update the import line at the top of that file to:

```typescript
import { MicPermissionError, ModelLoadError, WaveformError } from "../src/types";
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/core/tests/types.test.ts`
Expected: FAIL — `WaveformError` is not exported from `../src/types`.

- [ ] **Step 3: Write the implementation**

Add this class to `packages/core/src/types.ts`, after `ModelLoadError`:

```typescript
export class WaveformError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "WaveformError";
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test packages/core/tests/types.test.ts`
Expected: PASS (3 tests: `MicPermissionError`, `ModelLoadError`, `WaveformError`).

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/types.ts packages/core/tests/types.test.ts
git commit -m "feat(core): add WaveformError type"
```

---

## Task 4: `computeWaveform` (Waveform.ts)

**Files:**
- Create: `packages/core/src/Waveform.ts`
- Create: `packages/core/tests/Waveform.test.ts`

A standalone, pure function — no dependency on `AudioRecorder`. Decodes any audio `Blob` via the Web Audio API and summarizes it into exactly `barCount` RMS-amplitude values (0–1), regardless of the audio's duration. `barCount` has no default at this layer (the hook adds a default one layer up, in Task 7).

- [ ] **Step 1: Write the failing test**

```typescript
// packages/core/tests/Waveform.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/core/tests/Waveform.test.ts`
Expected: FAIL — `packages/core/src/Waveform.ts` does not exist yet.

- [ ] **Step 3: Write the implementation**

```typescript
// packages/core/src/Waveform.ts
import { WaveformError } from "./types";

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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test packages/core/tests/Waveform.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/Waveform.ts packages/core/tests/Waveform.test.ts
git commit -m "feat(core): add computeWaveform for post-recording waveform data"
```

---

## Task 5: `AudioRecorder.start(onLevel?)` — live amplitude monitoring

**Files:**
- Modify: `packages/core/src/AudioRecorder.ts`
- Modify: `packages/core/tests/AudioRecorder.test.ts`

`start()` gains an optional second parameter. When provided, a `Web Audio API` `AnalyserNode` runs alongside the existing `MediaRecorder`, calling `onLevel` with a normalized 0–1 RMS amplitude on every animation frame. If setting up the `AudioContext`/`AnalyserNode` fails, the failure is logged via `console.warn` (not silent) but does **not** prevent `start()` from succeeding — the actual recording must never be blocked by a visualization nicety.

- [ ] **Step 1: Write the failing test**

Replace the entire contents of `packages/core/tests/AudioRecorder.test.ts` with:

```typescript
// packages/core/tests/AudioRecorder.test.ts
import { test, expect, beforeEach, afterAll, spyOn } from "bun:test";
import { MicPermissionError } from "../src/types";

// Bun runs all test files in one process, so globalThis mutations below would
// otherwise leak into files that run after this one (e.g. React component
// tests that rely on happy-dom's real `navigator`/`window`). Snapshot
// whatever was there before we start faking, and put it back in afterAll.
const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
const originalMediaRecorder = Object.getOwnPropertyDescriptor(globalThis, "MediaRecorder");
const originalAudioContext = Object.getOwnPropertyDescriptor(globalThis, "AudioContext");
const originalRaf = Object.getOwnPropertyDescriptor(globalThis, "requestAnimationFrame");
const originalCaf = Object.getOwnPropertyDescriptor(globalThis, "cancelAnimationFrame");

class FakeMediaRecorder {
  static instances: FakeMediaRecorder[] = [];
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  state: "inactive" | "recording" = "inactive";

  constructor(public stream: unknown) {
    FakeMediaRecorder.instances.push(this);
  }

  start() {
    this.state = "recording";
  }

  stop() {
    this.state = "inactive";
    this.ondataavailable?.({ data: new Blob(["fake-audio"], { type: "audio/webm" }) });
    this.onstop?.();
  }
}

class FakeAnalyserNode {
  frequencyBinCount = 4;
  getByteTimeDomainData(arr: Uint8Array) {
    arr.fill(200); // consistently off-center -> predictable non-zero level
  }
}

class FakeAudioContext {
  static instances: FakeAudioContext[] = [];
  closed = false;
  constructor() {
    FakeAudioContext.instances.push(this);
  }
  createMediaStreamSource(_stream: unknown) {
    return { connect: () => {} };
  }
  createAnalyser() {
    return new FakeAnalyserNode();
  }
  close() {
    this.closed = true;
    return Promise.resolve();
  }
}

function installFakes(getUserMediaImpl: () => Promise<unknown>) {
  FakeMediaRecorder.instances = [];
  FakeAudioContext.instances = [];
  (globalThis as any).MediaRecorder = FakeMediaRecorder;
  (globalThis as any).AudioContext = FakeAudioContext;
  // requestAnimationFrame via a real (tiny) setTimeout so the recursive scheduling
  // in AudioRecorder's level-monitoring loop doesn't recurse synchronously.
  (globalThis as any).requestAnimationFrame = (cb: (t: number) => void) =>
    setTimeout(() => cb(0), 0) as unknown as number;
  (globalThis as any).cancelAnimationFrame = (id: number) => clearTimeout(id);
  // Use defineProperty instead of direct assignment: once happy-dom's global
  // preload (packages/react/happydom.setup.ts, wired via the root bunfig.toml
  // for React component tests) registers a getter-only `navigator` on
  // globalThis, a plain `globalThis.navigator = ...` throws
  // "Attempted to assign to readonly property". defineProperty with
  // configurable:true works whether or not that preload ran.
  Object.defineProperty(globalThis, "navigator", {
    value: { mediaDevices: { getUserMedia: getUserMediaImpl } },
    configurable: true,
    writable: true,
  });
}

afterAll(() => {
  if (originalNavigator) {
    Object.defineProperty(globalThis, "navigator", originalNavigator);
  } else {
    delete (globalThis as any).navigator;
  }
  if (originalMediaRecorder) {
    Object.defineProperty(globalThis, "MediaRecorder", originalMediaRecorder);
  } else {
    delete (globalThis as any).MediaRecorder;
  }
  if (originalAudioContext) {
    Object.defineProperty(globalThis, "AudioContext", originalAudioContext);
  } else {
    delete (globalThis as any).AudioContext;
  }
  if (originalRaf) {
    Object.defineProperty(globalThis, "requestAnimationFrame", originalRaf);
  } else {
    delete (globalThis as any).requestAnimationFrame;
  }
  if (originalCaf) {
    Object.defineProperty(globalThis, "cancelAnimationFrame", originalCaf);
  } else {
    delete (globalThis as any).cancelAnimationFrame;
  }
});

beforeEach(() => {
  installFakes(async () => ({ id: "fake-stream", getTracks: () => [] }));
});

test("start() requests mic and begins recording", async () => {
  const { AudioRecorder } = await import(`../src/AudioRecorder?t=${Date.now()}`);
  const recorder = new AudioRecorder();
  await recorder.start();
  expect(FakeMediaRecorder.instances[0].state).toBe("recording");
});

test("stop() returns the recorded audio blob", async () => {
  const { AudioRecorder } = await import(`../src/AudioRecorder?t=${Date.now()}`);
  const recorder = new AudioRecorder();
  await recorder.start();
  const blob = await recorder.stop();
  expect(blob).toBeInstanceOf(Blob);
});

test("start() throws MicPermissionError when getUserMedia rejects", async () => {
  installFakes(async () => {
    throw new DOMException("denied", "NotAllowedError");
  });
  const { AudioRecorder } = await import(`../src/AudioRecorder?t=${Date.now()}`);
  const recorder = new AudioRecorder();
  await expect(recorder.start()).rejects.toBeInstanceOf(MicPermissionError);
});

test("cancel() discards the recording without returning a blob", async () => {
  const { AudioRecorder } = await import(`../src/AudioRecorder?t=${Date.now()}`);
  const recorder = new AudioRecorder();
  await recorder.start();
  recorder.cancel();
  expect(FakeMediaRecorder.instances[0].state).toBe("inactive");
});

test("start() throws when called again while already recording", async () => {
  const { AudioRecorder } = await import(`../src/AudioRecorder?t=${Date.now()}`);
  const recorder = new AudioRecorder();
  await recorder.start();
  await expect(recorder.start()).rejects.toThrow(
    "AudioRecorder.start() called while already recording",
  );
});

test("onLevel is called with amplitude values while recording", async () => {
  const { AudioRecorder } = await import(`../src/AudioRecorder?t=${Date.now()}`);
  const recorder = new AudioRecorder();
  const levels: number[] = [];
  await recorder.start((level: number) => levels.push(level));

  // Let a couple of the fake-rAF-driven ticks fire.
  await new Promise((resolve) => setTimeout(resolve, 20));
  await recorder.stop();

  expect(levels.length).toBeGreaterThan(0);
  expect(levels[0]).toBeGreaterThan(0);
});

test("a level-monitoring setup failure logs a warning and does not prevent start()", async () => {
  const workingAudioContext = (globalThis as any).AudioContext;
  (globalThis as any).AudioContext = class {
    constructor() {
      throw new Error("Web Audio API unavailable");
    }
  };
  const warnSpy = spyOn(console, "warn").mockImplementation(() => {});

  const { AudioRecorder } = await import(`../src/AudioRecorder?t=${Date.now()}`);
  const recorder = new AudioRecorder();
  await recorder.start(() => {});

  expect(FakeMediaRecorder.instances[0].state).toBe("recording");
  expect(warnSpy).toHaveBeenCalled();

  warnSpy.mockRestore();
  (globalThis as any).AudioContext = workingAudioContext;
});
```

- [ ] **Step 2: Run test to verify the new tests fail**

Run: `bun test packages/core/tests/AudioRecorder.test.ts`
Expected: the 5 pre-existing tests PASS (unchanged behavior), the 2 new tests FAIL (`start()` doesn't accept an `onLevel` argument yet, so `levels.length` stays `0` and `console.warn` is never called).

- [ ] **Step 3: Write the implementation**

Replace the entire contents of `packages/core/src/AudioRecorder.ts` with:

```typescript
import { MicPermissionError } from "./types";

export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private levelFrameId: number | null = null;

  async start(onLevel?: (level: number) => void): Promise<void> {
    if (this.mediaRecorder && this.mediaRecorder.state === "recording") {
      throw new Error("AudioRecorder.start() called while already recording");
    }

    try {
      this.stream = (await navigator.mediaDevices.getUserMedia({
        audio: true,
      })) as MediaStream;
    } catch (cause) {
      throw new MicPermissionError("Microphone permission denied or unavailable", { cause });
    }

    if (onLevel) {
      this.startLevelMonitoring(onLevel);
    }

    try {
      this.chunks = [];
      this.mediaRecorder = new MediaRecorder(this.stream);
      this.mediaRecorder.ondataavailable = (e: { data: Blob }) => {
        this.chunks.push(e.data);
      };
      this.mediaRecorder.start();
    } catch (err) {
      this.releaseStream();
      throw err;
    }
  }

  stop(): Promise<Blob> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder) {
        this.releaseStream();
        resolve(new Blob());
        return;
      }
      if (this.mediaRecorder.state === "inactive") {
        this.releaseStream();
        resolve(new Blob(this.chunks, { type: "audio/webm" }));
        return;
      }
      this.mediaRecorder.onstop = () => {
        resolve(new Blob(this.chunks, { type: "audio/webm" }));
        this.releaseStream();
      };
      this.mediaRecorder.stop();
    });
  }

  cancel(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      this.mediaRecorder.stop();
    }
    this.releaseStream();
  }

  private startLevelMonitoring(onLevel: (level: number) => void): void {
    try {
      this.audioContext = new AudioContext();
      const source = this.audioContext.createMediaStreamSource(this.stream!);
      const analyser = this.audioContext.createAnalyser();
      source.connect(analyser);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        analyser.getByteTimeDomainData(dataArray);
        let sumSquares = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const normalized = (dataArray[i] - 128) / 128;
          sumSquares += normalized * normalized;
        }
        const rms = Math.sqrt(sumSquares / dataArray.length);
        onLevel(Math.min(1, rms));
        this.levelFrameId = requestAnimationFrame(tick);
      };
      this.levelFrameId = requestAnimationFrame(tick);
    } catch (cause) {
      console.warn("AudioRecorder: level monitoring unavailable, continuing without it.", cause);
    }
  }

  private stopLevelMonitoring(): void {
    if (this.levelFrameId !== null) {
      cancelAnimationFrame(this.levelFrameId);
      this.levelFrameId = null;
    }
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
  }

  private releaseStream(): void {
    this.stopLevelMonitoring();
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test packages/core/tests/AudioRecorder.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/AudioRecorder.ts packages/core/tests/AudioRecorder.test.ts
git commit -m "feat(core): add onLevel live amplitude monitoring to AudioRecorder.start()"
```

---

## Task 6: Core public API barrel

**Files:**
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Update the barrel export**

Replace the entire contents of `packages/core/src/index.ts` with:

```typescript
export { CommandMatcher } from "./CommandMatcher";
export { AudioRecorder } from "./AudioRecorder";
export { TranscriptionEngine } from "./TranscriptionEngine";
export type { ModelLoadProgress, TranscriptionEngineOptions } from "./TranscriptionEngine";
export type { VoiceResult, IntentDefinition } from "./types";
export { MicPermissionError, ModelLoadError, WaveformError } from "./types";
export { computeWaveform } from "./Waveform";
```

- [ ] **Step 2: Verify the full core suite still passes**

Run: `bun test packages/core`
Expected: `24 pass, 0 fail` across 5 files (19 from Task 1 + 1 new `WaveformError` test in `types.test.ts` (Task 3) + 2 in the new `Waveform.test.ts` (Task 4) + 2 new tests in `AudioRecorder.test.ts` (Task 5) = 24 — this step only adds barrel exports, no new behavior of its own).

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/index.ts
git commit -m "feat(core): export computeWaveform and WaveformError from the public barrel"
```

---

## Task 7: `useVoiceCommand` — level, waveform, audioBlob

**Files:**
- Modify: `packages/react/src/useVoiceCommand.ts`
- Modify: `packages/react/tests/useVoiceCommand.test.tsx`

Adds a `waveformBars` option (default `50`, applied at this layer only — `computeWaveform` itself has no default). Adds `level`/`waveform`/`audioBlob` to the returned state. A `computeWaveform` failure never blocks `transcribe()` — `waveform` simply stays `null`.

- [ ] **Step 1: Write the failing test**

Replace the entire contents of `packages/react/tests/useVoiceCommand.test.tsx` with:

```tsx
// packages/react/tests/useVoiceCommand.test.tsx
import { test, expect, mock, beforeEach, afterEach } from "bun:test";
import { renderHook, act, waitFor, cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});

const startMock = mock(async (_onLevel?: (level: number) => void) => {});
const stopMock = mock(async () => new Blob(["fake-audio"]));
const transcribeMock = mock(async () => "adicionar três maçãs");
const loadMock = mock(async (_onProgress?: (p: unknown) => void) => {});
const cancelMock = mock(() => {});
const computeWaveformMock = mock(async (_blob: Blob, _barCount: number) => [0, 0, 0]);

beforeEach(() => {
  startMock.mockClear();
  stopMock.mockClear();
  transcribeMock.mockClear();
  cancelMock.mockClear();
  computeWaveformMock.mockClear();
  // Restore default (successful) implementations, since a prior test's
  // mockImplementationOnce override otherwise persists across tests.
  startMock.mockImplementation(async () => {});
  stopMock.mockImplementation(async () => new Blob(["fake-audio"]));
  transcribeMock.mockImplementation(async () => "adicionar três maçãs");
  computeWaveformMock.mockImplementation(async () => [0, 0, 0]);
  loadMock.mockClear();
  loadMock.mockImplementation(async (_onProgress?: (p: unknown) => void) => {});
  mock.module("@hearsay-pwa/core", () => ({
    AudioRecorder: class {
      start = startMock;
      stop = stopMock;
      cancel = cancelMock;
    },
    TranscriptionEngine: class {
      load = loadMock;
      transcribe = transcribeMock;
    },
    CommandMatcher: class {
      constructor(public intents: unknown[]) {}
      match(text: string) {
        return { status: "matched", intent: "add_item", text, params: { item: "três maçãs" } };
      }
    },
    computeWaveform: computeWaveformMock,
  }));
});

test("start() moves status to recording, stop() resolves to matched result", async () => {
  const { useVoiceCommand } = await import(`../src/useVoiceCommand?t=${Date.now()}`);
  const { result } = renderHook(() =>
    useVoiceCommand({ intents: [{ intent: "add_item", patterns: ["adicionar {item}"] }] }),
  );

  expect(result.current.status).toBe("idle");

  await act(async () => {
    await result.current.start();
  });
  expect(result.current.status).toBe("recording");

  await act(async () => {
    await result.current.stop();
  });

  await waitFor(() => expect(result.current.status).toBe("done"));
  expect(result.current.result).toEqual({
    status: "matched",
    text: "adicionar três maçãs",
    intent: "add_item",
    params: { item: "três maçãs" },
  });
});

test("start() rejecting resets status to idle and surfaces the error", async () => {
  startMock.mockImplementation(async () => {
    throw new Error("mic permission denied");
  });
  const { useVoiceCommand } = await import(`../src/useVoiceCommand?t=${Date.now()}`);
  const { result } = renderHook(() =>
    useVoiceCommand({ intents: [{ intent: "add_item", patterns: ["adicionar {item}"] }] }),
  );

  await act(async () => {
    await result.current.start();
  });

  expect(result.current.status).toBe("idle");
  expect(result.current.error).toBeInstanceOf(Error);
  expect(result.current.error?.message).toBe("mic permission denied");
});

test("stop() rejecting resets status to idle and surfaces the error", async () => {
  transcribeMock.mockImplementation(async () => {
    throw new Error("model load failed");
  });
  const { useVoiceCommand } = await import(`../src/useVoiceCommand?t=${Date.now()}`);
  const { result } = renderHook(() =>
    useVoiceCommand({ intents: [{ intent: "add_item", patterns: ["adicionar {item}"] }] }),
  );

  await act(async () => {
    await result.current.start();
  });
  expect(result.current.status).toBe("recording");

  await act(async () => {
    await result.current.stop();
  });

  expect(result.current.status).toBe("idle");
  expect(result.current.error).toBeInstanceOf(Error);
  expect(result.current.error?.message).toBe("model load failed");
});

test("loadProgress updates as the engine's load() reports progress", async () => {
  loadMock.mockImplementation(async (onProgress?: (p: unknown) => void) => {
    onProgress?.({ status: "progress", progress: 42 });
  });
  const { useVoiceCommand } = await import(`../src/useVoiceCommand?t=${Date.now()}`);
  const { result } = renderHook(() =>
    useVoiceCommand({ intents: [{ intent: "add_item", patterns: ["adicionar {item}"] }] }),
  );

  expect(result.current.loadProgress).toBeNull();

  await act(async () => {
    await result.current.start();
  });

  expect(result.current.loadProgress).toEqual({ status: "progress", progress: 42 });
});

test("a rapid second start() call while already recording is a no-op", async () => {
  const { useVoiceCommand } = await import(`../src/useVoiceCommand?t=${Date.now()}`);
  const { result } = renderHook(() =>
    useVoiceCommand({ intents: [{ intent: "add_item", patterns: ["adicionar {item}"] }] }),
  );

  await act(async () => {
    // Fire both without awaiting the first before starting the second, to simulate
    // a rapid double-press.
    const first = result.current.start();
    const second = result.current.start();
    await Promise.all([first, second]);
  });

  expect(startMock).toHaveBeenCalledTimes(1);
  expect(result.current.status).toBe("recording");
});

test("level updates as the recorder's onLevel callback fires during start()", async () => {
  startMock.mockImplementation(async (onLevel?: (level: number) => void) => {
    onLevel?.(0.75);
  });
  const { useVoiceCommand } = await import(`../src/useVoiceCommand?t=${Date.now()}`);
  const { result } = renderHook(() =>
    useVoiceCommand({ intents: [{ intent: "add_item", patterns: ["adicionar {item}"] }] }),
  );

  expect(result.current.level).toBe(0);

  await act(async () => {
    await result.current.start();
  });

  expect(result.current.level).toBe(0.75);
});

test("stop() populates waveform and audioBlob from the recorded audio", async () => {
  computeWaveformMock.mockImplementation(async () => [0.1, 0.2, 0.3]);
  const { useVoiceCommand } = await import(`../src/useVoiceCommand?t=${Date.now()}`);
  const { result } = renderHook(() =>
    useVoiceCommand({ intents: [{ intent: "add_item", patterns: ["adicionar {item}"] }] }),
  );

  await act(async () => {
    await result.current.start();
  });
  await act(async () => {
    await result.current.stop();
  });

  await waitFor(() => expect(result.current.status).toBe("done"));
  expect(result.current.waveform).toEqual([0.1, 0.2, 0.3]);
  expect(result.current.audioBlob).toBeInstanceOf(Blob);
});

test("a computeWaveform failure does not block transcribe() from completing", async () => {
  computeWaveformMock.mockImplementation(async () => {
    throw new Error("decode failed");
  });
  const { useVoiceCommand } = await import(`../src/useVoiceCommand?t=${Date.now()}`);
  const { result } = renderHook(() =>
    useVoiceCommand({ intents: [{ intent: "add_item", patterns: ["adicionar {item}"] }] }),
  );

  await act(async () => {
    await result.current.start();
  });
  await act(async () => {
    await result.current.stop();
  });

  await waitFor(() => expect(result.current.status).toBe("done"));
  expect(result.current.waveform).toBeNull();
  expect(result.current.result).toEqual({
    status: "matched",
    text: "adicionar três maçãs",
    intent: "add_item",
    params: { item: "três maçãs" },
  });
});
```

- [ ] **Step 2: Run test to verify the new tests fail**

Run: `bun test packages/react/tests/useVoiceCommand.test.tsx`
Expected: the 5 pre-existing tests PASS, the 3 new tests FAIL (`result.current.level`/`waveform`/`audioBlob` are `undefined`, not the expected values, since the hook doesn't return them yet).

- [ ] **Step 3: Write the implementation**

Replace the entire contents of `packages/react/src/useVoiceCommand.ts` with:

```typescript
import { useCallback, useRef, useState } from "react";
import {
  AudioRecorder,
  TranscriptionEngine,
  CommandMatcher,
  computeWaveform,
  type IntentDefinition,
  type VoiceResult,
  type ModelLoadProgress,
} from "@hearsay-pwa/core";

export type VoiceCommandStatus = "idle" | "recording" | "transcribing" | "done";

export interface UseVoiceCommandOptions {
  intents: IntentDefinition[];
  model?: string;
  language?: string;
  waveformBars?: number;
}

export function useVoiceCommand(options: UseVoiceCommandOptions) {
  const [status, setStatus] = useState<VoiceCommandStatus>("idle");
  const [result, setResult] = useState<VoiceResult | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loadProgress, setLoadProgress] = useState<ModelLoadProgress | null>(null);
  const [level, setLevel] = useState(0);
  const [waveform, setWaveform] = useState<number[] | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  const recorderRef = useRef<AudioRecorder | undefined>(undefined);
  const engineRef = useRef<TranscriptionEngine | undefined>(undefined);
  const matcherRef = useRef<CommandMatcher | undefined>(undefined);
  // Mirrors `status` synchronously so the start()/stop() guards below always see the
  // latest value even though the callbacks have an empty dependency array (React state
  // read via closure would be stale between renders).
  const statusRef = useRef<VoiceCommandStatus>("idle");

  if (!recorderRef.current) recorderRef.current = new AudioRecorder();
  if (!engineRef.current)
    engineRef.current = new TranscriptionEngine({ model: options.model, language: options.language });
  if (!matcherRef.current) matcherRef.current = new CommandMatcher(options.intents);

  const updateStatus = useCallback((next: VoiceCommandStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  const start = useCallback(async () => {
    // No-op if a recording/transcription is already in flight.
    if (statusRef.current !== "idle" && statusRef.current !== "done") return;
    updateStatus("recording");
    setResult(null);
    setError(null);
    setWaveform(null);
    setAudioBlob(null);
    try {
      await engineRef.current!.load((p) => setLoadProgress(p));
      await recorderRef.current!.start((lvl) => setLevel(lvl));
    } catch (err) {
      updateStatus("idle");
      setLevel(0);
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, [updateStatus]);

  const stop = useCallback(async () => {
    // Only meaningful once a recording is actually in progress.
    if (statusRef.current !== "recording") return;
    updateStatus("transcribing");
    setLevel(0);
    try {
      const audio = await recorderRef.current!.stop();
      setAudioBlob(audio);
      try {
        const bars = await computeWaveform(audio, options.waveformBars ?? 50);
        setWaveform(bars);
      } catch {
        // Waveform is a visualization nicety -- never let it block transcription.
        setWaveform(null);
      }
      const text = await engineRef.current!.transcribe(audio);
      const matched = matcherRef.current!.match(text);
      setResult(matched);
      updateStatus("done");
    } catch (err) {
      updateStatus("idle");
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, [updateStatus, options.waveformBars]);

  const cancel = useCallback(() => {
    recorderRef.current!.cancel();
    setLevel(0);
    updateStatus("idle");
  }, [updateStatus]);

  return {
    start,
    stop,
    cancel,
    status,
    result,
    error,
    loadProgress,
    level,
    waveform,
    audioBlob,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test packages/react/tests/useVoiceCommand.test.tsx`
Expected: PASS (8 tests).

- [ ] **Step 5: Run the full workspace suite**

Run: `bun test packages` (from repo root)
Expected: `35 pass, 0 fail` across 7 files (24 in `packages/core` from Task 6 + 11 in `packages/react`: 8 in `useVoiceCommand.test.tsx` after this task's 3 additions, 3 in `VoiceButton.test.tsx`, unchanged).

- [ ] **Step 6: Commit**

```bash
git add packages/react/src/useVoiceCommand.ts packages/react/tests/useVoiceCommand.test.tsx
git commit -m "feat(react): expose level, waveform, and audioBlob from useVoiceCommand"
```

---

## Plan Self-Review Notes

**Spec coverage:**
- Live level monitoring, non-blocking + non-silent failure → Task 5.
- `computeWaveform`, no default `barCount`, typed `WaveformError` → Task 4.
- Hook's `level`/`waveform`/`audioBlob`/`waveformBars`, default 50 at the hook layer only, waveform failure never blocks `transcribe()` → Task 7.
- Core barrel exports the two new public symbols → Task 6.
- Test file relocation (both packages) → Tasks 1–2.

**Type/name consistency check:** `AudioRecorder.start(onLevel?: (level: number) => void)` (Task 5) matches exactly how the hook calls it in Task 7 (`recorderRef.current!.start((lvl) => setLevel(lvl))`). `computeWaveform(blob: Blob, barCount: number)` (Task 4) matches its only call site in Task 7 (`computeWaveform(audio, options.waveformBars ?? 50)`). `WaveformError` (Task 3) is the type thrown by `Waveform.ts` (Task 4) and re-exported by the barrel (Task 6) — no other file constructs or catches it by name (the hook's `catch {}` around `computeWaveform` is intentionally untyped, since it treats any failure the same way).

**No unaddressed spec requirements found.**
