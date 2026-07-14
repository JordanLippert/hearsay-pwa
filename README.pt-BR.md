# hearsay-pwa

[🇺🇸 English](README.md) | 🇧🇷 Português

Reconhecimento de voz e correspondência de comandos de voz 100% client-side para PWAs — sem depender da API nativa `SpeechRecognition`, funciona igual no Safari iOS, Chrome Android e desktop.

## Pacotes

- `@hearsay-pwa/core` — gravador agnóstico de framework, motor de transcrição Whisper, matcher de comandos.
- `@hearsay-pwa/react` — hook `useVoiceCommand` + `<VoiceButton />` headless.

## Início rápido (React)

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
        {status === "loading-model" ? "Carregando…" : status === "recording" ? "Gravando…" : "Segure para falar"}
      </VoiceButton>
      {error && <p role="alert">{error.message}</p>}
    </>
  );
}
```

### Valores de status

`status` é um de `"idle" | "loading-model" | "recording" | "transcribing" | "done"`. A primeira chamada de `start()` baixa/inicializa o modelo (pode levar 10–60s+ com cache frio) antes do microfone abrir — `"loading-model"` cobre essa janela pra UI mostrar um estado distinto em vez de um falso "gravando". Chamar `stop()`/`cancel()` durante `"loading-model"` é seguro: loga um `console.warn` e garante que o mic nunca abre depois que o carregamento termina.

### Só o texto transcrito, sem correspondência de intents

Se você já tem sua própria lógica de parsing de comandos e não precisa do `CommandMatcher`, passe `intents: []` — todo resultado volta como `{ status: "no_match", text }` (ou `"no_speech"` pra silêncio), e `.text` continua com a transcrição bruta.

### Tamanho do modelo

`model` usa `onnx-community/whisper-tiny` por padrão, o build mais leve do Whisper, já que essa lib é pensada pra download mobile/PWA. Passe um modelo maior (ex: `onnx-community/whisper-base`) se precisar de mais precisão e puder pagar o download extra.

## Desenvolvimento

```bash
bun install
bun test packages
```

## Licença

[MIT](LICENSE)
