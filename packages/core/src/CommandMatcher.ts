import type { IntentDefinition, VoiceResult } from "./types";

interface CompiledPattern {
  intent: string;
  regex: RegExp;
  paramNames: string[];
}

function compilePattern(intent: string, pattern: string): CompiledPattern {
  const paramNames: string[] = [];
  const escaped = pattern
    .split(/(\{[a-zA-Z_]+\})/g)
    .map((part) => {
      const match = part.match(/^\{([a-zA-Z_]+)\}$/);
      if (match) {
        paramNames.push(match[1]);
        return "(.+)";
      }
      return part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    })
    .join("");
  return { intent, regex: new RegExp(`^${escaped}$`, "i"), paramNames };
}

/**
 * Patterns come from developer-authored `IntentDefinition[]` config, never from
 * transcribed voice input — `match()`'s `text` argument is only ever tested against
 * compiled patterns, never compiled into one itself.
 */
export class CommandMatcher {
  private compiled: CompiledPattern[];

  constructor(intents: IntentDefinition[]) {
    this.compiled = intents.flatMap((intent) =>
      intent.patterns.map((pattern) => compilePattern(intent.intent, pattern)),
    );
  }

  match(text: string): VoiceResult {
    const trimmed = text.trim();
    if (trimmed.length === 0) {
      return { status: "no_speech" };
    }

    for (const { intent, regex, paramNames } of this.compiled) {
      const result = regex.exec(trimmed);
      if (result) {
        const params: Record<string, string> = {};
        paramNames.forEach((name, i) => {
          params[name] = result[i + 1].trim();
        });
        return { status: "matched", text, intent, params };
      }
    }

    return { status: "no_match", text };
  }
}
