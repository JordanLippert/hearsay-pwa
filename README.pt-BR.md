# pwa-voice-interpreter

[🇺🇸 English](README.md) | 🇧🇷 Português

Reconhecimento de voz e correspondência de comandos de voz 100% client-side para PWAs — sem depender da API nativa `SpeechRecognition`, funciona igual no Safari iOS, Chrome Android e desktop.

## Pacotes

- `@pwa-voice-interpreter/core` — gravador agnóstico de framework, motor de transcrição Whisper, matcher de comandos.
- `@pwa-voice-interpreter/react` — hook `useVoiceCommand` + `<VoiceButton />` headless.

## Início rápido (React)

```tsx
import { useVoiceCommand } from "@pwa-voice-interpreter/react";
import { VoiceButton } from "@pwa-voice-interpreter/react";

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
        {status === "recording" ? "Gravando…" : "Segure para falar"}
      </VoiceButton>
      {error && <p role="alert">{error.message}</p>}
    </>
  );
}
```

## Desenvolvimento

```bash
bun install
bun test packages
```

## Licença

MIT
