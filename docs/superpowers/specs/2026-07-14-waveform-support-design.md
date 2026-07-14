# Waveform support — Design

## Motivation

Consumers of `@hearsay-pwa/react` want to build voice-message-style UI (e.g. a WhatsApp-style recording bubble with a live level indicator, and a static waveform for a "listen before you send" screen) without having to hand-roll Web Audio API plumbing themselves. Today `AudioRecorder` wraps `MediaRecorder` only — no amplitude data of any kind is captured or exposed anywhere in the stack.

This adds two independent pieces of data — a live amplitude level during recording, and a downsampled waveform array computed from the finished recording — while keeping the library's existing headless philosophy: it exposes data, not a rendered waveform component. How the consumer draws bars/colors/sizes is entirely up to them.

Actual audio playback (play/pause of the recorded clip) is explicitly out of scope — trivial to do natively via `<audio>`, and adding it would turn this into a media-player library, which isn't this project's job.

## Architecture

Two additions to `@hearsay-pwa/core`, no new packages:

### `AudioRecorder.start(onLevel?)`

`start()` gains an optional second parameter, `onLevel?: (level: number) => void`. When provided, `AudioRecorder` creates a `AudioContext` + `AnalyserNode` wired to the same `MediaStream` used by `MediaRecorder`, and runs a `requestAnimationFrame` loop for the duration of the recording, calling `onLevel` with a normalized 0–1 amplitude value each frame. Nothing changes for callers that don't pass `onLevel` — zero overhead, fully backward compatible.

If creating the `AudioContext`/`AnalyserNode` fails, the recording is **not** aborted (the actual recording is the important part, not the visualization), but the failure is **not silent** either: it's logged via `console.warn()` with the underlying cause, so a developer debugging "why isn't my level meter moving" finds the answer immediately instead of guessing. `onLevel` simply never fires in that case.

### `computeWaveform(blob, barCount)` — new file `Waveform.ts`

A standalone, pure async function, independent of `AudioRecorder`'s internal state — it can be called with any audio `Blob`, not just one produced by this library's own recorder:

```ts
function computeWaveform(blob: Blob, barCount: number): Promise<number[]>;
```

Decodes the blob via the Web Audio API's `AudioContext.decodeAudioData`, then summarizes the decoded PCM samples into exactly `barCount` values (0–1, RMS amplitude per chunk) — regardless of the recording's duration. `barCount` has **no default** at this layer — the caller must always decide, so nothing is hidden. (A sensible default of 50 lives one layer up, in the React hook's options, not here — see below.)

If `decodeAudioData` fails (corrupted or unsupported audio), `computeWaveform` rejects with a typed `WaveformError` (same pattern as `MicPermissionError`/`ModelLoadError`, wrapping the original error as `cause`). Unlike the level-monitoring case, there's no sensible non-error fallback for audio that can't be decoded at all — this one is a real, thrown failure.

## React integration

`useVoiceCommand` gains:

- A new option: `waveformBars?: number` (default `50`) — used when the hook calls `computeWaveform` internally after `stop()`.
- Three new fields in its returned state:
  - `level: number` — live amplitude during `"recording"`, resets to `0` outside that state.
  - `waveform: number[] | null` — populated right after `stop()` resolves, reset to `null` at the start of the next `start()`.
  - `audioBlob: Blob | null` — the raw recorded audio, exposed alongside the pre-computed `waveform` specifically so a consumer isn't locked into the hook's `waveformBars` choice. A consumer who wants time-based resolution (e.g. proportional to the actual recording length, known only after `stop()`) can call `computeWaveform(audioBlob, ownComputedCount)` themselves, completely bypassing the hook's built-in call — the hook's `waveform` field is a convenience default, not the only path.

If `computeWaveform` throws inside the hook (a real `WaveformError`), that failure does **not** block transcription — `waveform` stays `null`, and the existing `start()`/`stop()`/`transcribe()` flow proceeds exactly as it does today. Waveform is a visualization enhancement; it must never be able to prevent the core voice-command flow from completing.

## Test file relocation (structural change, bundled with this work)

Existing and new test files move from being co-located with source (`packages/*/src/*.test.ts`) to a sibling `tests/` directory in each package (`packages/*/tests/*.test.ts`), at the user's request. This is a pure file-organization preference — Bun's test runner finds files matching `*.test.ts` recursively regardless of folder depth, so no `bunfig.toml`/config changes are needed, only updated relative import paths inside the moved files (including the cache-busting dynamic `import()` calls already used throughout the core test suite). `happydom.setup.ts` and both `bunfig.toml` files stay where they are — they're config, not tests.

Affected files: `packages/core/src/{AudioRecorder,CommandMatcher,TranscriptionEngine,types}.test.ts` → `packages/core/tests/`, `packages/react/src/{useVoiceCommand,VoiceButton}.test.tsx` → `packages/react/tests/`. The new `Waveform.test.ts` and any new/updated tests for `AudioRecorder`/`useVoiceCommand` land directly in the new `tests/` locations.

## Testing

Same mocking approach already proven in this codebase (happy-dom doesn't implement the Web Audio API, so `AudioContext`/`AnalyserNode`/`decodeAudioData` are faked on `globalThis`, snapshotted and restored in `afterAll` — identical pattern to the existing `navigator`/`MediaRecorder` mocks):

- `AudioRecorder`: `onLevel` is called with values during a recording (mocked `AnalyserNode`); a level-monitoring setup failure logs a `console.warn` and does not throw or prevent `start()` from succeeding.
- `Waveform.ts`: `computeWaveform` resolves an array of exactly `barCount` length from a mocked `decodeAudioData`; a decode failure rejects with `WaveformError` wrapping the original cause.
- `useVoiceCommand`: `level`/`waveform`/`audioBlob` update at the right points in the lifecycle; a thrown `WaveformError` from `computeWaveform` doesn't prevent `transcribe()` from running and resolving `result` normally.

## Open items

None — scope, error handling, and file layout were all explicitly resolved during brainstorming. `barCount`'s hook-level default (50) and the test relocation are both settled, not deferred.
