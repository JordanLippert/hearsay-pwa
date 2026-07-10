// packages/core/src/AudioRecorder.ts
import { MicPermissionError } from "./types";

export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private stream: MediaStream | null = null;

  async start(): Promise<void> {
    try {
      this.stream = (await (navigator as any).mediaDevices.getUserMedia({
        audio: true,
      })) as MediaStream;
    } catch (cause) {
      throw new MicPermissionError("Microphone permission denied or unavailable");
    }

    this.chunks = [];
    this.mediaRecorder = new (globalThis as any).MediaRecorder(this.stream);
    this.mediaRecorder!.ondataavailable = (e: { data: Blob }) => {
      this.chunks.push(e.data);
    };
    this.mediaRecorder!.start();
  }

  stop(): Promise<Blob> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder) {
        resolve(new Blob());
        return;
      }
      this.mediaRecorder.onstop = () => {
        resolve(new Blob(this.chunks, { type: "audio/webm" }));
        this.releaseStream();
      };
      this.mediaRecorder.stop();
    });
  }

  cancel(): void {
    this.mediaRecorder?.stop();
    this.releaseStream();
  }

  private releaseStream(): void {
    this.stream?.getTracks?.().forEach((track) => track.stop());
    this.stream = null;
  }
}
