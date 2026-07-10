# pwa-voice-interpreter — Design (v1)

## Motivation

iOS Safari has no `SpeechRecognition` Web API. This surfaced while building a voice-command feature for Pracomprá ([[Market_List_Generator]]), which shipped using OS-level dictation as a workaround. This project solves the underlying gap properly: an open-source (MIT), client-side speech-to-text library that runs the same way in any browser — iOS Safari, Android Chrome, desktop — with no native API dependency and no server round-trip.

Scope is explicitly PWA-only. Native apps (Expo/React Native) already have audio/speech coverage through their own ecosystem; this library exists for the "web-only, no native wrapper" case.

Whisper is OpenAI's open-source (MIT) speech model — weights and code are public, run entirely locally. This is unrelated to OpenAI's paid Whisper API (a hosted cloud service); this library never calls out to OpenAI or any server.

## Goals / Non-goals

- **Goal:** short-utterance voice commands (push-to-talk), not continuous dictation.
- **Goal:** works consistently across iOS Safari and Android Chrome without relying on any browser's native speech API.
- **Goal:** PT + EN transcription support in v1.
- **Non-goal (v1):** real-time streaming transcription (partial results while speaking).
- **Non-goal (v1):** automatic silence/VAD-based stop detection — recording start/stop is explicit, driven by the consuming app (e.g., a WhatsApp-style hold-to-record button).
- **Non-goal (v1):** smart parameter normalization (e.g., spoken numbers → digits). Matched parameters are returned as raw strings; normalization is left to the consumer.

## Architecture

Monorepo (Bun workspaces), two packages:

```
packages/core   @pwa-voice-interpreter/core   — framework-agnostic TS
packages/react  @pwa-voice-interpreter/react  — React hook + headless UI component
```

### `@pwa-voice-interpreter/core`

- **`AudioRecorder`** — wraps `getUserMedia`/`MediaRecorder`. Explicit `start()`/`stop()`/`cancel()`, no automatic silence detection. Returns the recorded audio buffer on `stop()`.
- **`TranscriptionEngine`** — wraps transformers.js (ONNX Runtime Web) running a quantized Whisper model (base, PT+EN). `load(onProgress)` downloads/caches the model (browser Cache API) and reports progress; `transcribe(buffer)` returns transcribed text. Prefers WebGPU backend when available, falls back to WASM silently otherwise.
- **`CommandMatcher`** — takes a list of consumer-defined intent templates (e.g. `"adicionar {item}"`, `"add {item}"`) and matches transcribed text against them via simple fuzzy template matching. Captured placeholders are returned as raw strings, no type coercion or normalization.

### `@pwa-voice-interpreter/react`

- **`useVoiceCommand(intents)`** — hook wrapping the core pieces: exposes `start`/`stop`/`cancel`, a `status` state machine (`idle | recording | transcribing | done`), and the last `VoiceResult`.
- **`<VoiceButton />`** — headless/unstyled component providing the recording gesture (press-and-release, press-and-drag-to-lock, or other modes via a `mode` prop), with no imposed styling — consumer controls appearance via className/render props.

## Engine choice: transformers.js

Chosen over hand-building a whisper.cpp WASM binding (too much toolchain/maintenance burden for a solo-maintained project) or Vosk-browser (weaker accuracy for PT-BR, less actively maintained). transformers.js provides ONNX Runtime Web, pre-converted/quantized Whisper models via the Hugging Face Hub, built-in model caching, and both WASM and WebGPU backends — letting this library focus on its actual differentiator (DX, PT+EN defaults, built-in command matching, headless UI) rather than reimplementing an inference engine.

## Result shape

`transcribe()` + `match()` together resolve to one of four explicit states — never a bare `null`, so the consumer can always distinguish what happened:

```ts
type VoiceResult =
  | { status: 'no_speech' }                                              // silence/empty transcription
  | { status: 'no_match'; text: string }                                 // transcribed, no intent matched
  | { status: 'matched'; text: string; intent: string; params: Record<string, string> }
  | { status: 'unknown' };                                                // engine returned something incoherent (defensive case)
```

## Error handling

- **Infrastructure failures** (mic permission denied, model download failed, storage quota exceeded) → typed exceptions (`MicPermissionError`, `ModelLoadError`) the consumer can catch and handle (retry, fallback UI).
- **Semantic outcomes** (no speech, no command match) → never exceptions, always a `VoiceResult` value — these are normal flow, not failures.
- **WebGPU unavailable** → silent fallback to WASM, no error surfaced.

## Testing

- **Unit** (Bun test): `CommandMatcher`, param extraction, hook/`VoiceButton` behavior (Testing Library) — all with the engine mocked. Fast, runs on every PR.
- **E2E** (Playwright, Dockerized): real Chromium, fake media device with a pre-recorded audio file (`--use-fake-device-for-media-stream` / `--use-file-for-fake-audio-capture`), runs actual WASM inference against fixture audio, asserts transcription/intent. Catches regressions in real inference + matching logic in CI.
- **Manual, pre-release**: real Safari iOS + Chrome Android devices. This is not replaceable by Docker/Playwright (no real WebKit-iOS in Linux containers) and is the actual target environment the library exists for.

## Open items for v1 implementation

- Final library/package name (currently placeholder: `pwa-voice-interpreter`).
- Exact Whisper model variant/quantization size to ship as default (tiny vs base — tradeoff between download size and PT accuracy) — to be validated empirically during implementation, not decided upfront.
