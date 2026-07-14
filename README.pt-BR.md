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

### Retorno de `useVoiceCommand`

| Campo | Descrição |
|---|---|
| `start()`, `stop()`, `cancel()` | Controlam o ciclo de vida da gravação. |
| `status` | Ver [Valores de status](#valores-de-status). |
| `result` | `VoiceResult` do `CommandMatcher` quando `status` é `"done"`. |
| `error` | `MicPermissionError \| ModelLoadError \| Error \| null`. |
| `loadProgress` | Progresso do download/init do modelo (`{ status, progress? }`), `null` antes do primeiro `start()`. |
| `level` | Amplitude do mic ao vivo (`0`-`1`), atualizada continuamente enquanto `"recording"` — use pra bolha/onda animada. |
| `waveform` | Barras de tamanho fixo (`0`-`1`) resumindo a gravação inteira, setado quando `"done"`; `null` se o decode falhar (nunca bloqueia a transcrição). Quantidade de barras via opção `waveformBars` (padrão `50`). |
| `audioBlob` | O `Blob` `audio/webm` gravado, setado quando `"done"` — a lib não controla playback; ligue num `<audio>` você mesmo se precisar. |

### Modos do `VoiceButton`

- `mode="press-release"` — `onStart`/`onStop` disparam no press/release.
- `mode="press-drag-lock"` — arrastar o ponteiro pra cima passando `lockThreshold` px (padrão `80`) trava a gravação ao soltar; `onLockChange?.(true)` dispara uma vez, e a UI de região de trava do próprio consumidor fica responsável por chamar `stop()` pra encerrar (não tem caminho de destravar embutido).

## Instalação (ainda sem registro no npm)

Esse monorepo não é publicado no npm — releases são só tags do git + GitHub Releases (ver [CONTRIBUTING.md](CONTRIBUTING.md)). Duas consequências pra consumir de outro projeto:

- `bun add github:JordanLippert/hearsay-pwa` (ou equivalente npm/yarn/pnpm) não funciona: instaladores de Git sempre puxam o `package.json` da **raiz do repo**, que é `private` e não é um pacote utilizável sozinho — não existe como apontar pra uma subpasta tipo `packages/react`.
- A dependência de `@hearsay-pwa/react` em `@hearsay-pwa/core` é declarada como `workspace:*`, que só resolve dentro de um workspace de verdade — não como dependência instalada avulsa num projeto qualquer.

O jeito suportado de consumir (testado e confirmado funcionando com Bun): clone esse repo como sibling/submodule do seu projeto, e adicione o `packages/*` dele no **seu próprio** array `workspaces`, pra virarem membros reais do seu workspace Bun.

```jsonc
// seu-app/package.json (raiz)
{
  "name": "seu-app",
  "workspaces": ["app", "vendor/hearsay-pwa/packages/*"]
}
```

```bash
git submodule add https://github.com/JordanLippert/hearsay-pwa.git vendor/hearsay-pwa
# ou: git clone https://github.com/JordanLippert/hearsay-pwa.git vendor/hearsay-pwa
```

```jsonc
// app/package.json
{
  "dependencies": { "@hearsay-pwa/react": "workspace:*" }
}
```

Aí `bun install` na sua raiz — o Bun resolve `@hearsay-pwa/react` como membro do workspace, e a dependência dele em `@hearsay-pwa/core` (`workspace:*`) resolve do mesmo jeito (dentro de `packages/react/node_modules/@hearsay-pwa/core`), sem nenhum registro npm envolvido. Puxar uma tag nova no submodule e rodar `bun install` de novo já pega a atualização.

Isso exige que seu projeto use Bun (ou outro gerenciador com workspaces configurado igual) — npm/yarn/pnpm workspaces devem funcionar de forma análoga, mas só o caminho com Bun acima foi testado contra esse repo.

## Desenvolvimento

```bash
bun install
bun test packages
```

## Licença

[MIT](LICENSE)
