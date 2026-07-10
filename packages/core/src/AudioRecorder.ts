import { MicPermissionError } from "./types";

export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private stream: MediaStream | null = null;

  async start(): Promise<void> {
    if (this.mediaRecorder && this.mediaRecorder.state === "recording") {
      throw new Error("AudioRecorder.start() called while already recording");
    }

    try {
      this.stream = (await navigator.mediaDevices.getUserMedia({
        audio: true,
      })) as MediaStream;
    } catch (cause) {
      throw new MicPermissionError("Microphone permission denied or unavailable", { cause });
    }

    try {
      this.chunks = [];
      this.mediaRecorder = new MediaRecorder(this.stream);
      this.mediaRecorder.ondataavailable = (e: { data: Blob }) => {
        this.chunks.push(e.data);
      };
      this.mediaRecorder.start();
    } catch (err) {
      this.releaseStream();
      throw err;
    }
  }

  stop(): Promise<Blob> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder) {
        this.releaseStream();
        resolve(new Blob());
        return;
      }
      if (this.mediaRecorder.state === "inactive") {
        resolve(new Blob(this.chunks, { type: "audio/webm" }));
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
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      this.mediaRecorder.stop();
    }
    this.releaseStream();
  }

  private releaseStream(): void {
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
  }
}
