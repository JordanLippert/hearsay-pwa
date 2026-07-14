export class MicPermissionError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "MicPermissionError";
  }
}

export class ModelLoadError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ModelLoadError";
  }
}

export class WaveformError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "WaveformError";
  }
}

/**
 * If you only want the raw transcribed text and don't need intent matching, pass
 * `intents: []` to `CommandMatcher`/`useVoiceCommand` — every result comes back as
 * `{ status: "no_match", text }` (or `"no_speech"` for silence), and `.text` still
 * carries the transcription.
 */
export type VoiceResult =
  | { status: "no_speech" }
  | { status: "no_match"; text: string }
  | { status: "matched"; text: string; intent: string; params: Record<string, string> }
  | { status: "unknown" };

export interface IntentDefinition {
  intent: string;
  /** Template strings with `{name}` placeholders, e.g. `"adicionar {item}"`. Not regex or glob. */
  patterns: string[];
}
