# pwa-voice-interpreter

Client-side, cross-browser speech-to-text and voice-command matching for PWAs — no native `SpeechRecognition` API dependency, works the same in iOS Safari, Android Chrome, and desktop.

## Packages

- `@pwa-voice-interpreter/core` — framework-agnostic recorder, Whisper transcription engine, command matcher.
- `@pwa-voice-interpreter/react` — `useVoiceCommand` hook + headless `<VoiceButton />`.

## Quickstart (React)

```tsx
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
```

## Development

```bash
bun install
bun test packages
```

## License

MIT
