import { MicPermissionError } from "./types";

export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private levelFrameId: number | null = null;

  async start(onLevel?: (level: number) => void): Promise<void> {
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

    if (onLevel) {
      this.startLevelMonitoring(onLevel);
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
        this.releaseStream();
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

  private startLevelMonitoring(onLevel: (level: number) => void): void {
    try {
      this.audioContext = new AudioContext();
      const source = this.audioContext.createMediaStreamSource(this.stream!);
      const analyser = this.audioContext.createAnalyser();
      // A coarse level meter only needs a small window, not full spectral detail --
      // 256 keeps the per-frame loop cheap. Sized from fftSize (not frequencyBinCount,
      // which is for getByteFrequencyData) since getByteTimeDomainData below expects
      // a buffer of fftSize samples.
      analyser.fftSize = 256;
      source.connect(analyser);
      const dataArray = new Uint8Array(analyser.fftSize);

      const tick = () => {
        analyser.getByteTimeDomainData(dataArray);
        let sumSquares = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const normalized = (dataArray[i] - 128) / 128;
          sumSquares += normalized * normalized;
        }
        const rms = Math.sqrt(sumSquares / dataArray.length);
        onLevel(Math.min(1, rms));
        this.levelFrameId = requestAnimationFrame(tick);
      };
      this.levelFrameId = requestAnimationFrame(tick);
    } catch (cause) {
      // Tear down immediately rather than leaving a partially-set-up context open
      // for the rest of the recording (releaseStream() would eventually close it
      // too, but there's no reason to wait).
      this.audioContext?.close().catch(() => {});
      this.audioContext = null;
      console.warn("AudioRecorder: level monitoring unavailable, continuing without it.", cause);
    }
  }

  private stopLevelMonitoring(): void {
    if (this.levelFrameId !== null) {
      cancelAnimationFrame(this.levelFrameId);
      this.levelFrameId = null;
    }
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
  }

  private releaseStream(): void {
    this.stopLevelMonitoring();
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
  }
}
