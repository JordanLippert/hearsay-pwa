// packages/core/src/TranscriptionEngine.ts
import { pipeline, read_audio } from "@huggingface/transformers";
import { ModelLoadError } from "./types";

export interface ModelLoadProgress {
  status: string;
  progress?: number;
}

export interface TranscriptionEngineOptions {
  model?: string;
  /** Whisper is multilingual but does not auto-detect the spoken language —
   * without this, it silently decodes as English regardless of input. */
  language?: string;
}

type Transcriber = (audio: unknown, options?: { language?: string; task?: string }) => Promise<{ text: string }>;

// Whisper models expect 16kHz mono input.
const WHISPER_SAMPLING_RATE = 16_000;

export class TranscriptionEngine {
  private model: string;
  private language?: string;
  private transcriber: Transcriber | null = null;

  constructor(options: TranscriptionEngineOptions = {}) {
    this.model = options.model ?? "onnx-community/whisper-tiny";
    this.language = options.language;
  }

  async load(onProgress: (p: ModelLoadProgress) => void): Promise<void> {
    if (this.transcriber) return;

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
    // The pipeline's WhisperFeatureExtractor requires raw PCM samples
    // (Float32Array), not the recorder's encoded Blob.
    const url = URL.createObjectURL(audio);
    let samples: Float32Array;
    try {
      samples = await read_audio(url, WHISPER_SAMPLING_RATE);
    } finally {
      URL.revokeObjectURL(url);
    }
    const output = await this.transcriber(samples, { language: this.language, task: "transcribe" });
    return output.text.trim();
  }
}
