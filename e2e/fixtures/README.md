# E2E audio fixtures

- `adicionar-tres-macas.wav` — 16kHz mono WAV, spoken PT-BR phrase "adicionar três maçãs".
  Used by `voice-flow.spec.ts` as fake microphone input via Chromium's
  `--use-file-for-fake-audio-capture` flag. Regenerate with:
  `ffmpeg -i <recording> -ar 16000 -ac 1 adicionar-tres-macas.wav`
