# hearsay-pwa

🇺🇸 English | [🇧🇷 Português](README.pt-BR.md)

Client-side, cross-browser speech-to-text and voice-command matching for PWAs — no native `SpeechRecognition` API dependency, works the same in iOS Safari, Android Chrome, and desktop.

## Packages

- `@hearsay-pwa/core` — framework-agnostic recorder, Whisper transcription engine, command matcher.
- `@hearsay-pwa/react` — `useVoiceCommand` hook + headless `<VoiceButton />`.

## Quickstart (React)

```tsx
import { useVoiceCommand } from "@hearsay-pwa/react";
import { VoiceButton } from "@hearsay-pwa/react";

function ShoppingList() {
  const { start, stop, status, result, error } = useVoiceCommand({
    intents: [
      { intent: "add_item", patterns: ["adicionar {item}", "add {item}"] },
      { intent: "remove_item", patterns: ["remover {item}", "remove {item}"] },
    ],
  });

  return (
    <>
      <VoiceButton mode="press-release" onStart={start} onStop={stop}>
        {status === "loading-model" ? "Loading…" : status === "recording" ? "Recording…" : "Hold to talk"}
      </VoiceButton>
      {error && <p role="alert">{error.message}</p>}
    </>
  );
}
```

### Status values

`status` is one of `"idle" | "loading-model" | "recording" | "transcribing" | "done"`. The first call to `start()` downloads/initializes the model (can take 10–60s+ on a cold cache) before the microphone ever opens — `"loading-model"` covers that window so the UI can show a distinct state instead of a false "recording". Calling `stop()`/`cancel()` during `"loading-model"` is safe: it logs a `console.warn` and guarantees the mic is never opened once loading finishes.

### Just the transcribed text, no intent matching

If you already have your own command-parsing logic and don't need `CommandMatcher`, pass `intents: []` — every result comes back as `{ status: "no_match", text }` (or `"no_speech"` for silence), and `.text` still carries the raw transcription.

### Model size

`model` defaults to `onnx-community/whisper-tiny`, the lightest Whisper build, since this library targets mobile/PWA downloads. Pass a larger model (e.g. `onnx-community/whisper-base`) if you need better accuracy and can afford the extra download size.

### `useVoiceCommand` return values

| Field | Description |
|---|---|
| `start()`, `stop()`, `cancel()` | Control the recording lifecycle. |
| `status` | See [Status values](#status-values). |
| `result` | `VoiceResult` from `CommandMatcher` once `status` is `"done"`. |
| `error` | `MicPermissionError \| ModelLoadError \| Error \| null`. |
| `loadProgress` | Progress reported by the model download/init (`{ status, progress? }`), `null` before the first `start()`. |
| `level` | Live mic amplitude (`0`-`1`), updated continuously while `"recording"` — drive a live waveform/bubble UI with it. |
| `waveform` | Fixed-length bar heights (`0`-`1`) summarizing the whole recording, set once `"done"`; `null` if decoding failed (never blocks transcription). Bar count via `waveformBars` option (default `50`). |
| `audioBlob` | The recorded `audio/webm` `Blob`, set once `"done"` — the library does not play it back; wire it to an `<audio>` element yourself if needed. |

### `VoiceButton` modes

- `mode="press-release"` — `onStart`/`onStop` fire on press/release.
- `mode="press-drag-lock"` — dragging the pointer up past `lockThreshold` px (default `80`) locks the recording on release; `onLockChange?.(true)` fires once, and the consumer's own lock-region UI is responsible for calling `stop()` to end it (there's no built-in unlock path).

## Installing (no npm registry yet)

This monorepo isn't published to npm — releases are git tags + GitHub Releases only (see [CONTRIBUTING.md](CONTRIBUTING.md)). Two consequences for consuming it from another project:

- `bun add github:JordanLippert/hearsay-pwa` (or the npm/yarn/pnpm equivalent) won't work: Git installers always pull the **repo root**'s `package.json`, which is `private` and isn't a package on its own — there's no way to point one at a subfolder like `packages/react`.
- `@hearsay-pwa/react`'s own dependency on `@hearsay-pwa/core` is declared as `workspace:*`, which only resolves inside an actual workspace — not as a plain installed dependency in an unrelated project.

The supported way to consume it (verified working with Bun): clone this repo as a sibling/submodule of your project, and add its `packages/*` to **your own** `workspaces` array so they become real members of your Bun workspace.

```jsonc
// your-app/package.json (root)
{
  "name": "your-app",
  "workspaces": ["app", "vendor/hearsay-pwa/packages/*"]
}
```

```bash
git submodule add https://github.com/JordanLippert/hearsay-pwa.git vendor/hearsay-pwa
# or: git clone https://github.com/JordanLippert/hearsay-pwa.git vendor/hearsay-pwa
```

```jsonc
// app/package.json
{
  "dependencies": { "@hearsay-pwa/react": "workspace:*" }
}
```

Then `bun install` at your root — Bun resolves `@hearsay-pwa/react` as a workspace member, and its own `workspace:*` dependency on `@hearsay-pwa/core` resolves the same way (into `packages/react/node_modules/@hearsay-pwa/core`), with no npm registry involved. Pulling a new tag in the submodule and re-running `bun install` picks up the update.

This requires your project to use Bun (or another workspace-aware package manager configured the same way) — npm/yarn/pnpm workspaces should work analogously, but only the Bun path above has been verified against this repo.

## Development

```bash
bun install
bun test packages
```

## License

[MIT](LICENSE)
