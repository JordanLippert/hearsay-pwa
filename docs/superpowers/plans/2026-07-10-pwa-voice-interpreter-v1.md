# pwa-voice-interpreter v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a v1 of the `pwa-voice-interpreter` monorepo — a framework-agnostic client-side speech-to-text + voice-command-matching core package, plus a React hook and headless `<VoiceButton />` component, per `docs/superpowers/specs/2026-07-10-pwa-voice-interpreter-design.md`.

**Architecture:** Bun workspaces monorepo with two packages: `@pwa-voice-interpreter/core` (AudioRecorder, TranscriptionEngine wrapping `@huggingface/transformers` Whisper ASR, CommandMatcher) and `@pwa-voice-interpreter/react` (useVoiceCommand hook, headless VoiceButton). Push-to-talk only (no VAD), typed 4-state `VoiceResult`, typed exceptions only for infra failures.

**Tech Stack:** Bun (runtime/test/build), TypeScript 7, `@huggingface/transformers` (ONNX Runtime Web), React 18+, `@testing-library/react`, Playwright (Dockerized E2E).

---

## File Structure

```
pwa-voice-interpreter/
├── package.json                 — root workspace config
├── tsconfig.base.json           — shared TS compiler options
├── packages/
│   ├── core/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── types.ts             — VoiceResult, MicPermissionError, ModelLoadError
│   │       ├── CommandMatcher.ts
│   │       ├── CommandMatcher.test.ts
│   │       ├── AudioRecorder.ts
│   │       ├── AudioRecorder.test.ts
│   │       ├── TranscriptionEngine.ts
│   │       ├── TranscriptionEngine.test.ts
│   │       └── index.ts
│   └── react/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── useVoiceCommand.ts
│           ├── useVoiceCommand.test.tsx
│           ├── VoiceButton.tsx
│           ├── VoiceButton.test.tsx
│           └── index.ts
├── e2e/
│   ├── playwright.config.ts
│   ├── fixtures/adicionar-tres-macas.wav   — manually recorded fixture (Task 9)
│   └── voice-flow.spec.ts
└── .github/workflows/ci.yml
```

Each package exposes one responsibility per file; `CommandMatcher`/`AudioRecorder`/`TranscriptionEngine` have no dependency on each other and can be tested in isolation. The React package only depends on `@pwa-voice-interpreter/core`'s public types, never on its internals.

---

## Task 1: Monorepo scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.base.json`
- Create: `packages/core/package.json`
- Create: `packages/core/tsconfig.json`
- Create: `packages/react/package.json`
- Create: `packages/react/tsconfig.json`

- [ ] **Step 1: Create root `package.json` with Bun workspaces**

```json
{
  "name": "pwa-voice-interpreter",
  "private": true,
  "workspaces": ["packages/*"],
  "scripts": {
    "test": "bun test"
  },
  "devDependencies": {
    "typescript": "^7.0.0"
  }
}
```

- [ ] **Step 2: Create `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "declaration": true,
    "skipLibCheck": true,
    "esModuleInterop": true
  }
}
```

- [ ] **Step 3: Create `packages/core/package.json`**

```json
{
  "name": "@pwa-voice-interpreter/core",
  "version": "0.1.0",
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "license": "MIT",
  "dependencies": {
    "@huggingface/transformers": "^3.0.0"
  }
}
```

- [ ] **Step 4: Create `packages/core/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "dist" },
  "include": ["src"]
}
```

- [ ] **Step 5: Create `packages/react/package.json`**

```json
{
  "name": "@pwa-voice-interpreter/react",
  "version": "0.1.0",
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "license": "MIT",
  "dependencies": {
    "@pwa-voice-interpreter/core": "workspace:*",
    "react": "^18.0.0"
  },
  "devDependencies": {
    "@testing-library/react": "^16.0.0",
    "@types/react": "^18.0.0"
  }
}
```

- [ ] **Step 6: Create `packages/react/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "dist", "jsx": "react-jsx" },
  "include": ["src"]
}
```

- [ ] **Step 7: Verify install works**

Run: `bun install`
Expected: resolves workspace packages, no errors, creates `bun.lockb`.

- [ ] **Step 8: Commit**

```bash
git add package.json tsconfig.base.json packages/core/package.json packages/core/tsconfig.json packages/react/package.json packages/react/tsconfig.json bun.lockb
git commit -m "chore: scaffold Bun workspaces monorepo"
```

---

## Task 2: Core types and error classes

**Files:**
- Create: `packages/core/src/types.ts`
- Test: `packages/core/src/types.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/core/src/types.test.ts
import { test, expect } from "bun:test";
import { MicPermissionError, ModelLoadError } from "./types";

test("MicPermissionError is an Error with the right name", () => {
  const err = new MicPermissionError("mic denied");
  expect(err).toBeInstanceOf(Error);
  expect(err.name).toBe("MicPermissionError");
  expect(err.message).toBe("mic denied");
});

test("ModelLoadError is an Error with the right name", () => {
  const err = new ModelLoadError("download failed");
  expect(err).toBeInstanceOf(Error);
  expect(err.name).toBe("ModelLoadError");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/core/src/types.test.ts`
Expected: FAIL — `types.ts` does not exist yet.

- [ ] **Step 3: Write implementation**

```typescript
// packages/core/src/types.ts
export class MicPermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MicPermissionError";
  }
}

export class ModelLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ModelLoadError";
  }
}

export type VoiceResult =
  | { status: "no_speech" }
  | { status: "no_match"; text: string }
  | { status: "matched"; text: string; intent: string; params: Record<string, string> }
  | { status: "unknown" };

export interface IntentDefinition {
  intent: string;
  patterns: string[];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test packages/core/src/types.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/types.ts packages/core/src/types.test.ts
git commit -m "feat(core): add VoiceResult type and typed infra errors"
```

---

## Task 3: CommandMatcher

**Files:**
- Create: `packages/core/src/CommandMatcher.ts`
- Test: `packages/core/src/CommandMatcher.test.ts`

Patterns use `{name}` placeholders (e.g. `"adicionar {item}"`). Matching is case-insensitive, whitespace-trimmed, and a placeholder captures one or more words greedily to the end of its segment.

- [ ] **Step 1: Write the failing test**

```typescript
// packages/core/src/CommandMatcher.test.ts
import { test, expect } from "bun:test";
import { CommandMatcher } from "./CommandMatcher";

const matcher = new CommandMatcher([
  { intent: "add_item", patterns: ["adicionar {item}", "add {item}"] },
  { intent: "remove_item", patterns: ["remover {item}"] },
  { intent: "confirm", patterns: ["confirmar", "confirm"] },
]);

test("matches a pattern with a captured param", () => {
  const result = matcher.match("adicionar três maçãs");
  expect(result).toEqual({
    status: "matched",
    text: "adicionar três maçãs",
    intent: "add_item",
    params: { item: "três maçãs" },
  });
});

test("is case-insensitive and trims whitespace", () => {
  const result = matcher.match("  ADICIONAR Pão  ");
  expect(result).toEqual({
    status: "matched",
    text: "  ADICIONAR Pão  ",
    intent: "add_item",
    params: { item: "Pão" },
  });
});

test("matches a pattern with no placeholder", () => {
  const result = matcher.match("confirmar");
  expect(result).toEqual({
    status: "matched",
    text: "confirmar",
    intent: "confirm",
    params: {},
  });
});

test("returns no_match when nothing fits", () => {
  const result = matcher.match("que horas são");
  expect(result).toEqual({ status: "no_match", text: "que horas são" });
});

test("returns no_speech for empty text", () => {
  expect(matcher.match("")).toEqual({ status: "no_speech" });
  expect(matcher.match("   ")).toEqual({ status: "no_speech" });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/core/src/CommandMatcher.test.ts`
Expected: FAIL — `CommandMatcher.ts` does not exist yet.

- [ ] **Step 3: Write implementation**

```typescript
// packages/core/src/CommandMatcher.ts
import type { IntentDefinition, VoiceResult } from "./types";

interface CompiledPattern {
  intent: string;
  regex: RegExp;
  paramNames: string[];
}

function compilePattern(intent: string, pattern: string): CompiledPattern {
  const paramNames: string[] = [];
  const escaped = pattern
    .split(/(\{[a-zA-Z_]+\})/g)
    .map((part) => {
      const match = part.match(/^\{([a-zA-Z_]+)\}$/);
      if (match) {
        paramNames.push(match[1]);
        return "(.+)";
      }
      return part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    })
    .join("");
  return { intent, regex: new RegExp(`^${escaped}$`, "i"), paramNames };
}

export class CommandMatcher {
  private compiled: CompiledPattern[];

  constructor(intents: IntentDefinition[]) {
    this.compiled = intents.flatMap((intent) =>
      intent.patterns.map((pattern) => compilePattern(intent.intent, pattern)),
    );
  }

  match(text: string): VoiceResult {
    const trimmed = text.trim();
    if (trimmed.length === 0) {
      return { status: "no_speech" };
    }

    for (const { intent, regex, paramNames } of this.compiled) {
      const result = regex.exec(trimmed);
      if (result) {
        const params: Record<string, string> = {};
        paramNames.forEach((name, i) => {
          params[name] = result[i + 1].trim();
        });
        return { status: "matched", text, intent, params };
      }
    }

    return { status: "no_match", text };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test packages/core/src/CommandMatcher.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/CommandMatcher.ts packages/core/src/CommandMatcher.test.ts
git commit -m "feat(core): add CommandMatcher with template pattern matching"
```

---

## Task 4: AudioRecorder

**Files:**
- Create: `packages/core/src/AudioRecorder.ts`
- Test: `packages/core/src/AudioRecorder.test.ts`

Wraps `getUserMedia` + `MediaRecorder`. Explicit `start()`/`stop()`/`cancel()`. Bun's test environment has no browser APIs, so the test installs minimal fakes on `globalThis` before importing the module.

- [ ] **Step 1: Write the failing test**

```typescript
// packages/core/src/AudioRecorder.test.ts
import { test, expect, beforeEach } from "bun:test";
import { MicPermissionError } from "./types";

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

function installFakes(getUserMediaImpl: () => Promise<unknown>) {
  FakeMediaRecorder.instances = [];
  (globalThis as any).MediaRecorder = FakeMediaRecorder;
  (globalThis as any).navigator = {
    mediaDevices: { getUserMedia: getUserMediaImpl },
  };
}

beforeEach(() => {
  installFakes(async () => ({ id: "fake-stream" }));
});

test("start() requests mic and begins recording", async () => {
  const { AudioRecorder } = await import(`./AudioRecorder?t=${Date.now()}`);
  const recorder = new AudioRecorder();
  await recorder.start();
  expect(FakeMediaRecorder.instances[0].state).toBe("recording");
});

test("stop() returns the recorded audio blob", async () => {
  const { AudioRecorder } = await import(`./AudioRecorder?t=${Date.now()}`);
  const recorder = new AudioRecorder();
  await recorder.start();
  const blob = await recorder.stop();
  expect(blob).toBeInstanceOf(Blob);
});

test("start() throws MicPermissionError when getUserMedia rejects", async () => {
  installFakes(async () => {
    throw new DOMException("denied", "NotAllowedError");
  });
  const { AudioRecorder } = await import(`./AudioRecorder?t=${Date.now()}`);
  const recorder = new AudioRecorder();
  await expect(recorder.start()).rejects.toBeInstanceOf(MicPermissionError);
});

test("cancel() discards the recording without returning a blob", async () => {
  const { AudioRecorder } = await import(`./AudioRecorder?t=${Date.now()}`);
  const recorder = new AudioRecorder();
  await recorder.start();
  recorder.cancel();
  expect(FakeMediaRecorder.instances[0].state).toBe("inactive");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/core/src/AudioRecorder.test.ts`
Expected: FAIL — `AudioRecorder.ts` does not exist yet.

- [ ] **Step 3: Write implementation**

```typescript
// packages/core/src/AudioRecorder.ts
import { MicPermissionError } from "./types";

export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private stream: MediaStream | null = null;

  async start(): Promise<void> {
    try {
      this.stream = (await (navigator as any).mediaDevices.getUserMedia({
        audio: true,
      })) as MediaStream;
    } catch (cause) {
      throw new MicPermissionError("Microphone permission denied or unavailable");
    }

    this.chunks = [];
    this.mediaRecorder = new (globalThis as any).MediaRecorder(this.stream);
    this.mediaRecorder!.ondataavailable = (e: { data: Blob }) => {
      this.chunks.push(e.data);
    };
    this.mediaRecorder!.start();
  }

  stop(): Promise<Blob> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder) {
        resolve(new Blob());
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
    this.mediaRecorder?.stop();
    this.releaseStream();
  }

  private releaseStream(): void {
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test packages/core/src/AudioRecorder.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/AudioRecorder.ts packages/core/src/AudioRecorder.test.ts
git commit -m "feat(core): add AudioRecorder with manual start/stop/cancel"
```

---

## Task 5: TranscriptionEngine

**Files:**
- Create: `packages/core/src/TranscriptionEngine.ts`
- Test: `packages/core/src/TranscriptionEngine.test.ts`

Wraps `@huggingface/transformers`'s `automatic-speech-recognition` pipeline. Tries `device: "webgpu"` first, falls back to `device: "wasm"` silently on failure. Model defaults to `onnx-community/whisper-base` (multilingual, covers PT+EN) — **validate this exact model id/size empirically during implementation** (open item from the design spec); swap for a different `onnx-community/whisper-*` checkpoint if size/accuracy tradeoff doesn't hold up.

- [ ] **Step 1: Write the failing test**

```typescript
// packages/core/src/TranscriptionEngine.test.ts
import { test, expect, mock, beforeEach } from "bun:test";
import { ModelLoadError } from "./types";

const transcribeFn = mock(async (_audio: unknown) => ({ text: "adicionar três maçãs" }));
const pipelineFn = mock(async (_task: string, _model: string, opts: any) => {
  opts.progress_callback?.({ status: "progress", progress: 50 });
  return transcribeFn;
});

beforeEach(() => {
  pipelineFn.mockClear();
  transcribeFn.mockClear();
  mock.module("@huggingface/transformers", () => ({ pipeline: pipelineFn }));
});

test("load() tries webgpu first and reports progress", async () => {
  const { TranscriptionEngine } = await import(`./TranscriptionEngine?t=${Date.now()}`);
  const engine = new TranscriptionEngine();
  const progress: number[] = [];
  await engine.load((p) => progress.push(p.progress ?? 0));
  expect(pipelineFn.mock.calls[0][2].device).toBe("webgpu");
  expect(progress).toContain(50);
});

test("load() falls back to wasm when webgpu pipeline creation fails", async () => {
  pipelineFn.mockImplementationOnce(async () => {
    throw new Error("webgpu unsupported");
  });
  const { TranscriptionEngine } = await import(`./TranscriptionEngine?t=${Date.now()}`);
  const engine = new TranscriptionEngine();
  await engine.load(() => {});
  expect(pipelineFn.mock.calls[1][2].device).toBe("wasm");
});

test("load() throws ModelLoadError when both backends fail", async () => {
  pipelineFn.mockImplementation(async () => {
    throw new Error("network down");
  });
  const { TranscriptionEngine } = await import(`./TranscriptionEngine?t=${Date.now()}`);
  const engine = new TranscriptionEngine();
  await expect(engine.load(() => {})).rejects.toBeInstanceOf(ModelLoadError);
});

test("transcribe() returns trimmed text from the pipeline", async () => {
  const { TranscriptionEngine } = await import(`./TranscriptionEngine?t=${Date.now()}`);
  const engine = new TranscriptionEngine();
  await engine.load(() => {});
  const text = await engine.transcribe(new Blob(["fake-audio"]));
  expect(text).toBe("adicionar três maçãs");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/core/src/TranscriptionEngine.test.ts`
Expected: FAIL — `TranscriptionEngine.ts` does not exist yet.

- [ ] **Step 3: Write implementation**

```typescript
// packages/core/src/TranscriptionEngine.ts
import { pipeline } from "@huggingface/transformers";
import { ModelLoadError } from "./types";

export interface ModelLoadProgress {
  status: string;
  progress?: number;
}

export interface TranscriptionEngineOptions {
  model?: string;
  languages?: string[];
}

type Transcriber = (audio: unknown) => Promise<{ text: string }>;

export class TranscriptionEngine {
  private model: string;
  private transcriber: Transcriber | null = null;

  constructor(options: TranscriptionEngineOptions = {}) {
    this.model = options.model ?? "onnx-community/whisper-base";
  }

  async load(onProgress: (p: ModelLoadProgress) => void): Promise<void> {
    try {
      this.transcriber = (await pipeline("automatic-speech-recognition", this.model, {
        device: "webgpu",
        progress_callback: onProgress,
      })) as unknown as Transcriber;
      return;
    } catch {
      // WebGPU unavailable or unsupported — fall back silently to WASM.
    }

    try {
      this.transcriber = (await pipeline("automatic-speech-recognition", this.model, {
        device: "wasm",
        progress_callback: onProgress,
      })) as unknown as Transcriber;
    } catch (cause) {
      throw new ModelLoadError("Failed to load transcription model on webgpu or wasm");
    }
  }

  async transcribe(audio: Blob): Promise<string> {
    if (!this.transcriber) {
      throw new ModelLoadError("TranscriptionEngine.load() must succeed before transcribe()");
    }
    const output = await this.transcriber(audio);
    return output.text.trim();
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test packages/core/src/TranscriptionEngine.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/TranscriptionEngine.ts packages/core/src/TranscriptionEngine.test.ts
git commit -m "feat(core): add TranscriptionEngine wrapping transformers.js Whisper pipeline"
```

---

## Task 6: Core public API barrel

**Files:**
- Create: `packages/core/src/index.ts`

- [ ] **Step 1: Write the barrel export**

```typescript
// packages/core/src/index.ts
export { CommandMatcher } from "./CommandMatcher";
export { AudioRecorder } from "./AudioRecorder";
export { TranscriptionEngine } from "./TranscriptionEngine";
export type { ModelLoadProgress, TranscriptionEngineOptions } from "./TranscriptionEngine";
export type { VoiceResult, IntentDefinition } from "./types";
export { MicPermissionError, ModelLoadError } from "./types";
```

- [ ] **Step 2: Verify it compiles and re-exports resolve**

Run: `bun test packages/core` (re-runs the full existing core suite through the package)
Expected: PASS (all prior core tests still pass — this step only adds exports, no new behavior)

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/index.ts
git commit -m "feat(core): expose public API barrel"
```

---

## Task 7: React useVoiceCommand hook

**Files:**
- Create: `packages/react/src/useVoiceCommand.ts`
- Test: `packages/react/src/useVoiceCommand.test.tsx`

State machine: `idle -> recording -> transcribing -> done` (back to `idle` on next `start()`). Depends only on `@pwa-voice-interpreter/core`'s public exports, mocked in the test.

- [ ] **Step 1: Write the failing test**

```tsx
// packages/react/src/useVoiceCommand.test.tsx
import { test, expect, mock, beforeEach } from "bun:test";
import { renderHook, act, waitFor } from "@testing-library/react";

const startMock = mock(async () => {});
const stopMock = mock(async () => new Blob(["fake-audio"]));
const transcribeMock = mock(async () => "adicionar três maçãs");
const loadMock = mock(async () => {});

beforeEach(() => {
  startMock.mockClear();
  stopMock.mockClear();
  mock.module("@pwa-voice-interpreter/core", () => ({
    AudioRecorder: class {
      start = startMock;
      stop = stopMock;
      cancel = mock(() => {});
    },
    TranscriptionEngine: class {
      load = loadMock;
      transcribe = transcribeMock;
    },
    CommandMatcher: class {
      constructor(public intents: unknown[]) {}
      match(text: string) {
        return { status: "matched", text, intent: "add_item", params: { item: "três maçãs" } };
      }
    },
  }));
});

test("start() moves status to recording, stop() resolves to matched result", async () => {
  const { useVoiceCommand } = await import(`./useVoiceCommand?t=${Date.now()}`);
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/react/src/useVoiceCommand.test.tsx`
Expected: FAIL — `useVoiceCommand.ts` does not exist yet.

- [ ] **Step 3: Write implementation**

```typescript
// packages/react/src/useVoiceCommand.ts
import { useCallback, useRef, useState } from "react";
import {
  AudioRecorder,
  TranscriptionEngine,
  CommandMatcher,
  type IntentDefinition,
  type VoiceResult,
} from "@pwa-voice-interpreter/core";

export type VoiceCommandStatus = "idle" | "recording" | "transcribing" | "done";

export interface UseVoiceCommandOptions {
  intents: IntentDefinition[];
  model?: string;
}

export function useVoiceCommand(options: UseVoiceCommandOptions) {
  const [status, setStatus] = useState<VoiceCommandStatus>("idle");
  const [result, setResult] = useState<VoiceResult | null>(null);

  const recorderRef = useRef<AudioRecorder>();
  const engineRef = useRef<TranscriptionEngine>();
  const matcherRef = useRef<CommandMatcher>();

  if (!recorderRef.current) recorderRef.current = new AudioRecorder();
  if (!engineRef.current) engineRef.current = new TranscriptionEngine({ model: options.model });
  if (!matcherRef.current) matcherRef.current = new CommandMatcher(options.intents);

  const start = useCallback(async () => {
    setStatus("recording");
    setResult(null);
    await engineRef.current!.load(() => {});
    await recorderRef.current!.start();
  }, []);

  const stop = useCallback(async () => {
    setStatus("transcribing");
    const audio = await recorderRef.current!.stop();
    const text = await engineRef.current!.transcribe(audio);
    const matched = matcherRef.current!.match(text);
    setResult(matched);
    setStatus("done");
  }, []);

  const cancel = useCallback(() => {
    recorderRef.current!.cancel();
    setStatus("idle");
  }, []);

  return { start, stop, cancel, status, result };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test packages/react/src/useVoiceCommand.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/react/src/useVoiceCommand.ts packages/react/src/useVoiceCommand.test.tsx
git commit -m "feat(react): add useVoiceCommand hook"
```

---

## Task 8: React VoiceButton headless component

**Files:**
- Create: `packages/react/src/VoiceButton.tsx`
- Test: `packages/react/src/VoiceButton.test.tsx`

Two interaction `mode`s: `"press-release"` (start on pointer down, stop on pointer up) and `"press-drag-lock"` (start on pointer down; if the pointer moves past `lockThreshold` px upward before release, stays recording until a separate lock-region click stops it — exposed via an `onLockChange` callback so the consumer can render its own lock UI). No inline styles — consumer supplies `className`/children via render props.

- [ ] **Step 1: Write the failing test**

```tsx
// packages/react/src/VoiceButton.test.tsx
import { test, expect, mock } from "bun:test";
import { render, fireEvent } from "@testing-library/react";
import { VoiceButton } from "./VoiceButton";

test("press-release mode calls onStart on pointer down and onStop on pointer up", () => {
  const onStart = mock(() => {});
  const onStop = mock(() => {});
  const { getByRole } = render(
    <VoiceButton mode="press-release" onStart={onStart} onStop={onStop}>
      Hold to talk
    </VoiceButton>,
  );
  const button = getByRole("button");

  fireEvent.pointerDown(button);
  expect(onStart).toHaveBeenCalledTimes(1);

  fireEvent.pointerUp(button);
  expect(onStop).toHaveBeenCalledTimes(1);
});

test("press-drag-lock mode fires onLockChange(true) past the lock threshold", () => {
  const onStart = mock(() => {});
  const onStop = mock(() => {});
  const onLockChange = mock(() => {});
  const { getByRole } = render(
    <VoiceButton
      mode="press-drag-lock"
      lockThreshold={50}
      onStart={onStart}
      onStop={onStop}
      onLockChange={onLockChange}
    >
      Hold to talk
    </VoiceButton>,
  );
  const button = getByRole("button");

  fireEvent.pointerDown(button, { clientY: 100 });
  fireEvent.pointerMove(button, { clientY: 30 }); // moved 70px up, past threshold of 50
  expect(onLockChange).toHaveBeenCalledWith(true);

  fireEvent.pointerUp(button);
  // locked: releasing the pointer must NOT stop the recording
  expect(onStop).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/react/src/VoiceButton.test.tsx`
Expected: FAIL — `VoiceButton.tsx` does not exist yet.

- [ ] **Step 3: Write implementation**

```tsx
// packages/react/src/VoiceButton.tsx
import { useRef, useState, type ReactNode } from "react";

export type VoiceButtonMode = "press-release" | "press-drag-lock";

export interface VoiceButtonProps {
  mode: VoiceButtonMode;
  lockThreshold?: number;
  onStart: () => void;
  onStop: () => void;
  onLockChange?: (locked: boolean) => void;
  className?: string;
  children?: ReactNode;
}

export function VoiceButton({
  mode,
  lockThreshold = 80,
  onStart,
  onStop,
  onLockChange,
  className,
  children,
}: VoiceButtonProps) {
  const startYRef = useRef<number | null>(null);
  const [locked, setLocked] = useState(false);

  const handlePointerDown = (e: React.PointerEvent) => {
    startYRef.current = e.clientY;
    setLocked(false);
    onStart();
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (mode !== "press-drag-lock" || startYRef.current === null || locked) return;
    const delta = startYRef.current - e.clientY;
    if (delta > lockThreshold) {
      setLocked(true);
      onLockChange?.(true);
    }
  };

  const handlePointerUp = () => {
    startYRef.current = null;
    if (mode === "press-drag-lock" && locked) return;
    onStop();
  };

  return (
    <button
      type="button"
      className={className}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {children}
    </button>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test packages/react/src/VoiceButton.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add packages/react/src/VoiceButton.tsx packages/react/src/VoiceButton.test.tsx
git commit -m "feat(react): add headless VoiceButton with press-release and press-drag-lock modes"
```

---

## Task 9: React public API barrel

**Files:**
- Create: `packages/react/src/index.ts`

- [ ] **Step 1: Write the barrel export**

```typescript
// packages/react/src/index.ts
export { useVoiceCommand } from "./useVoiceCommand";
export type { UseVoiceCommandOptions, VoiceCommandStatus } from "./useVoiceCommand";
export { VoiceButton } from "./VoiceButton";
export type { VoiceButtonProps, VoiceButtonMode } from "./VoiceButton";
```

- [ ] **Step 2: Verify full test suite still passes**

Run: `bun test`
Expected: PASS — every test across `packages/core` and `packages/react` (this step only adds exports).

- [ ] **Step 3: Commit**

```bash
git add packages/react/src/index.ts
git commit -m "feat(react): expose public API barrel"
```

---

## Task 10: E2E Playwright setup (Dockerized, fake mic input)

**Files:**
- Create: `e2e/playwright.config.ts`
- Create: `e2e/voice-flow.spec.ts`
- Create: `e2e/fixtures/README.md`

This exercises the real Whisper model in a real Chromium engine — it downloads the actual model on first run and is slower than the unit suite. It does **not** replace manual Safari iOS / Chrome Android testing (see spec's Testing section) — it only catches regressions in the WASM inference + matching pipeline under Chromium.

- [ ] **Step 1: Record the fixture audio (manual, one-time)**

There is no way to author a `.wav` file as plan text. Before this task's test can pass, record a short clip of someone saying "adicionar três maçãs" (any device, e.g. phone voice memo or `ffmpeg` from a mic), convert it to 16kHz mono WAV, and save it as `e2e/fixtures/adicionar-tres-macas.wav`:

```bash
ffmpeg -i raw-recording.m4a -ar 16000 -ac 1 e2e/fixtures/adicionar-tres-macas.wav
```

- [ ] **Step 2: Create `e2e/fixtures/README.md` documenting the fixture**

```markdown
# E2E audio fixtures

- `adicionar-tres-macas.wav` — 16kHz mono WAV, spoken PT-BR phrase "adicionar três maçãs".
  Used by `voice-flow.spec.ts` as fake microphone input via Chromium's
  `--use-file-for-fake-audio-capture` flag. Regenerate with:
  `ffmpeg -i <recording> -ar 16000 -ac 1 adicionar-tres-macas.wav`
```

- [ ] **Step 3: Create `e2e/playwright.config.ts`**

```typescript
import { defineConfig } from "@playwright/test";
import path from "path";

export default defineConfig({
  testDir: __dirname,
  timeout: 60_000,
  use: {
    launchOptions: {
      args: [
        "--use-fake-ui-for-media-stream",
        "--use-fake-device-for-media-stream",
        `--use-file-for-fake-audio-capture=${path.join(__dirname, "fixtures/adicionar-tres-macas.wav")}`,
      ],
    },
  },
});
```

- [ ] **Step 4: Write the E2E test**

```typescript
// e2e/voice-flow.spec.ts
import { test, expect } from "@playwright/test";

test("recording the fixture audio resolves to a matched add_item command", async ({ page, context }) => {
  await context.grantPermissions(["microphone"]);
  await page.goto("http://localhost:5173"); // demo app started separately, see README

  await page.getByRole("button", { name: /hold to talk/i }).dispatchEvent("pointerdown");
  await page.waitForTimeout(3000); // fixture clip length
  await page.getByRole("button", { name: /hold to talk/i }).dispatchEvent("pointerup");

  await expect(page.getByTestId("voice-result")).toHaveText(/add_item/, { timeout: 30_000 });
});
```

- [ ] **Step 5: Run it**

Run: `bunx playwright test --config e2e/playwright.config.ts`
Expected: PASS once a demo app serving a `VoiceButton` + result display is running on `localhost:5173` (demo app is out of scope for this plan — tracked as a follow-up; until it exists, this test is skipped in CI, see Task 11).

- [ ] **Step 6: Commit**

```bash
git add e2e/playwright.config.ts e2e/voice-flow.spec.ts e2e/fixtures/README.md
git commit -m "test(e2e): add Playwright fake-mic flow test against real Whisper inference"
```

---

## Task 11: CI workflow

**Files:**
- Create: `.github/workflows/ci.yml`

Unit tests run on every push/PR. The E2E job is separate and manually triggered (`workflow_dispatch`) since it needs the demo app from Task 10 to exist first — wiring it into the automatic PR trigger is a follow-up once that app is built.

- [ ] **Step 1: Write the workflow**

```yaml
name: CI

on:
  push:
    branches: [master]
  pull_request:

jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install
      - run: bun test

  e2e:
    runs-on: ubuntu-latest
    if: github.event_name == 'workflow_dispatch'
    container:
      image: mcr.microsoft.com/playwright:v1.48.0-jammy
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install
      - run: bunx playwright test --config e2e/playwright.config.ts

on_dispatch:
  workflow_dispatch:
```

- [ ] **Step 2: Verify the YAML is well-formed**

Run: `bunx js-yaml .github/workflows/ci.yml`
Expected: prints the parsed structure with no error.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add unit test workflow and manual e2e workflow"
```

---

## Task 12: README quickstart

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write the README**

```markdown
# pwa-voice-interpreter

Client-side, cross-browser speech-to-text and voice-command matching for PWAs — no native `SpeechRecognition` API dependency, works the same in iOS Safari, Android Chrome, and desktop.

## Packages

- `@pwa-voice-interpreter/core` — framework-agnostic recorder, Whisper transcription engine, command matcher.
- `@pwa-voice-interpreter/react` — `useVoiceCommand` hook + headless `<VoiceButton />`.

## Quickstart (React)

\`\`\`tsx
import { useVoiceCommand } from "@pwa-voice-interpreter/react";
import { VoiceButton } from "@pwa-voice-interpreter/react";

function ShoppingList() {
  const { start, stop, status, result } = useVoiceCommand({
    intents: [
      { intent: "add_item", patterns: ["adicionar {item}", "add {item}"] },
      { intent: "remove_item", patterns: ["remover {item}", "remove {item}"] },
    ],
  });

  return (
    <VoiceButton mode="press-release" onStart={start} onStop={stop}>
      {status === "recording" ? "Recording…" : "Hold to talk"}
    </VoiceButton>
  );
}
\`\`\`

## Development

\`\`\`bash
bun install
bun test
\`\`\`

## License

MIT
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README quickstart"
```

---

## Plan Self-Review Notes

- **Spec coverage:** every spec section has a task — architecture/modules (Tasks 1-9), engine choice (Task 5), result shape (Task 2), error handling (Tasks 4-5), testing strategy (unit tests inline in Tasks 2-9, E2E in Task 10, CI in Task 11), monorepo (Task 1).
- **Deferred beyond this plan (explicitly, not silently dropped):** the demo app Task 10's E2E test depends on; final npm package name; empirical validation of `onnx-community/whisper-base` as the right size/accuracy tradeoff (flagged in Task 5 and in the spec's Open Items).
