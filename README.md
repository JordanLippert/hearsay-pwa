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

## Development

```bash
bun install
bun test packages
```

## License

[MIT](LICENSE)
