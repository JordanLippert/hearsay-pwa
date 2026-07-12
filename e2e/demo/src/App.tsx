import { useVoiceCommand, VoiceButton } from "@hearsay-pwa/react";

// Minimal illustrative integration (a "Pracomprá"-style shopping list) used as the
// E2E harness target — see e2e/voice-flow.spec.ts and e2e/fixtures/README.md.
export function App() {
  const { start, stop, status, result, error, loadProgress } = useVoiceCommand({
    model: "onnx-community/whisper-tiny",
    language: "portuguese",
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
      <p data-testid="voice-result">{result ? JSON.stringify(result) : status}</p>
      <p data-testid="load-status">{loadProgress?.status ?? ""}</p>
      {error && <p role="alert">{error.message}</p>}
    </>
  );
}
