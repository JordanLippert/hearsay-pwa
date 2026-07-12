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
        {status === "recording" ? "Recording…" : "Hold to talk"}
      </VoiceButton>
      {error && <p role="alert">{error.message}</p>}
    </>
  );
}
```

## Development

```bash
bun install
bun test packages
```

## License

MIT
