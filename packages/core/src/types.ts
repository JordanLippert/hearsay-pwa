export class MicPermissionError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "MicPermissionError";
  }
}

export class ModelLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ModelLoadError";
  }
}

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
