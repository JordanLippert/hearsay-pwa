// packages/core/src/TranscriptionEngine.ts
import { pipeline } from "@huggingface/transformers";
import { ModelLoadError } from "./types";

export interface ModelLoadProgress {
  status: string;
  progress?: number;
}

export interface TranscriptionEngineOptions {
  model?: string;
  languages?: string[];
}

type Transcriber = (audio: unknown) => Promise<{ text: string }>;

export class TranscriptionEngine {
  private model: string;
  private transcriber: Transcriber | null = null;

  constructor(options: TranscriptionEngineOptions = {}) {
    this.model = options.model ?? "onnx-community/whisper-base";
  }

  async load(onProgress: (p: ModelLoadProgress) => void): Promise<void> {
    try {
      this.transcriber = (await pipeline("automatic-speech-recognition", this.model, {
        device: "webgpu",
        progress_callback: onProgress,
      })) as unknown as Transcriber;
      return;
    } catch {
      // WebGPU unavailable or unsupported — fall back silently to WASM.
    }

    try {
      this.transcriber = (await pipeline("automatic-speech-recognition", this.model, {
        device: "wasm",
        progress_callback: onProgress,
      })) as unknown as Transcriber;
    } catch (cause) {
      throw new ModelLoadError("Failed to load transcription model on webgpu or wasm", { cause });
    }
  }

  async transcribe(audio: Blob): Promise<string> {
    if (!this.transcriber) {
      throw new ModelLoadError("TranscriptionEngine.load() must succeed before transcribe()");
    }
    const output = await this.transcriber(audio);
    return output.text.trim();
  }
}
